// Speak Math. Classic script: shares top-level names with the other js/ files. Load order is set in index.html.
// Math Workspace: layer path, edit scope and chat

/* ---------- Navigate & edit workspace ---------- */
let chat = [], chatFor = null;
const swColor = (pos, len) => (pos === 0 && len > 1 ? 'var(--line)' : 'var(--s' + colorIdx(pos) + ')');
const layerName = (n, pos) => (pos === 0 ? 'Whole equation' : L.label(n));
function scopeInfo() {
  if (!L) return { name: 'Whole equation', color: 'var(--line)', tex: current.latex, pos: 0 };
  const chain = sel == null ? [L.root] : chainOf(sel);
  const n = chain[chain.length - 1], pos = chain.length - 1;
  return { name: layerName(n, pos), color: swColor(pos, chain.length), tex: L.tex(n).replace(/\s+/g, ' '), said: Layers.plainText(L.speak(n)), pos, id: n.id };
}

function renderWsNav(chain) {
  const ol = $('wsPath') || document.createElement('ol'), box = $('wsSel') || document.createElement('div'); ol.textContent = ''; box.textContent = '';
  if (!L) { box.textContent = 'Couldn\'t read this LaTeX into layers. Fix the equation input and submit again.'; return; }
  const c = chain && chain.length ? chain : [L.root];
  c.forEach((n, pos) => {
    const li = document.createElement('li'), b = document.createElement('button'); b.type = 'button';
    const sw = document.createElement('span'); sw.className = 'sw'; sw.style.background = swColor(pos, c.length);
    b.append(sw, document.createTextNode(layerName(n, pos)));
    if (pos === c.length - 1) b.setAttribute('aria-current', 'true');
    b.onclick = () => select(n.id);
    li.appendChild(b); ol.appendChild(li);
  });
  const n = c[c.length - 1], pos = c.length - 1;
  const ttl = document.createElement('div'); ttl.className = 'ttl';
  const sw = document.createElement('span'); sw.className = 'sw'; sw.style.background = swColor(pos, c.length);
  ttl.append(sw, document.createTextNode((pos === 0 ? '' : 'Layer ' + pos + ' · ') + layerName(n, pos)));
  const code = document.createElement('code'); code.textContent = L.tex(n).replace(/\s+/g, ' ');
  const say = document.createElement('span'); say.textContent = '“' + Layers.plainText(L.speak(n)) + '”';
  box.append(ttl, code, say);
  const kidsN = L.nav(n);
  if (kidsN.length) {
    const inside = document.createElement('div'); inside.className = 'inside';
    const lab = document.createElement('span'); lab.className = 'label'; lab.textContent = 'Inside';
    inside.appendChild(lab);
    kidsN.forEach((k) => {
      const b = document.createElement('button'); b.type = 'button';
      const s2 = document.createElement('span'); s2.className = 'sw'; s2.style.background = 'var(--s' + colorIdx(pos + 1) + ')';
      b.append(s2, document.createTextNode(L.label(k)));
      b.title = L.tex(k); b.onclick = () => select(k.id);
      inside.appendChild(b);
    });
    box.appendChild(inside);
  }
  document.querySelectorAll('.cmdbar [data-mv]').forEach((b) => { b.disabled = !target(b.dataset.mv) || (sel != null && target(b.dataset.mv).id === sel); });
  const sc = scopeInfo();
  $('wsScopeSw').style.background = sc.color;
  $('wsScopeText').textContent = sc.name + (sc.pos ? '  ×' : '');
  $('wsScope').setAttribute('aria-label', sc.pos ? 'Editing ' + sc.name + '. Press to edit the whole equation instead.' : 'Editing the whole equation');
}

const sysMsg = () => ({ role: 'sys', latex: current.latex, said: L ? Layers.plainText(L.spokenHtml) : '' });
function seedChat() { chat = [sysMsg(), { role: 'tip' }]; chatFor = current.latex; }
function chatNewEquation() {
  if (chatFor === current.latex) return;
  chat.push(sysMsg()); chatFor = current.latex; renderChat();
}
function chip(scope) {
  const c = el('span', 'scope-chip'); const s = el('span', 'sw'); s.style.background = scope.color; c.append(s, document.createTextNode(scope.name)); return c;
}
function renderChat() {
  if (!msgsEl) return;
  msgsEl.textContent = '';
  for (const m of chat) {
    const wrap = el('div', 'msg ' + (m.role === 'user' ? 'user' : m.role === 'sys' ? 'sys' : 'bot'));
    const who = el('div', 'who'); const bub = el('div', 'bub');
    if (m.role === 'sys') {
      who.textContent = 'Starting equation';
      const eq = el('div', 'eqv'); renderTex(eq, m.latex, false);
      bub.append(eq, el('code', null, m.latex));
      if (m.said) bub.append(el('span', 'said', '“' + m.said + '”'));
    } else if (m.role === 'tip') {
      who.textContent = 'Claude';
      bub.append(el('span', null, 'Pick a layer on the right, then say or type what to change. Try one of these:'));
      const chips = el('div', 'chips');
      ['make the exponent 3', 'replace x with t', 'wrap this in parentheses', 'delete this layer'].forEach((t) => {
        const b = el('button', null, t); b.type = 'button'; b.onclick = () => { wsInput.value = t; wsInput.focus(); }; chips.appendChild(b);
      });
      bub.appendChild(chips);
    } else if (m.role === 'user') {
      who.append(el('span', null, 'You' + (m.voice ? ' · voice' : '')), chip(m.scope));
      bub.append(el('span', null, m.text));
    } else {
      who.textContent = 'Claude';
      bub.append(el('span', null, 'Here is the layer I would change. Editing isn\'t connected yet, so the equation stays as it is.'));
      const plan = el('div', 'plan');
      const head = el('div', 'who'); head.append(el('span', null, 'Target'), chip(m.scope));
      const eq = el('div', 'eqv'); renderTex(eq, m.scope.tex, false);
      plan.append(head, eq, el('code', null, m.scope.tex), el('span', 'pending', 'Before → after preview · coming next'));
      bub.appendChild(plan);
    }
    wrap.append(who, bub); msgsEl.appendChild(wrap);
  }
  msgsEl.scrollTop = msgsEl.scrollHeight;
}

$('wsForm').addEventListener('submit', (e) => { e.preventDefault(); applyEdit(); });
wsInput.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); applyEdit(); } });
$('wsScope').onclick = () => { if (L) select(L.root.id); };
document.querySelectorAll('.cmdbar [data-mv]').forEach((b) => b.onclick = () => move(b.dataset.mv));
