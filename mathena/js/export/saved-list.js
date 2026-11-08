// Speak Math. Classic script: shares top-level names with the other js/ files. Load order is set in index.html.
// Export tab: saved equations list

/* ---------- Log ---------- */
const LS_KEY = 'speak-math-log';
function loadLocal() { try { localLog = JSON.parse(localStorage.getItem(LS_KEY) || '[]'); } catch (e) { localLog = []; } }
function saveLocal() { try { localStorage.setItem(LS_KEY, JSON.stringify(localLog.slice(0, 200))); } catch (e) {} }
async function addLog(entry) {
  if (logCol) { try { await logCol.add(entry); return; } catch (e) { setStatus('Couldn\'t save to your log: ' + (e.message || e.code), 'err'); } }
  entry.id = 'l' + entry.ts; localLog.unshift(entry); saveLocal(); renderLog(localLog);
}
async function removeLog(id) {
  if (logCol) { try { await logCol.doc(id).delete(); } catch (e) { setStatus('Couldn\'t delete that entry.', 'err'); } return; }
  localLog = localLog.filter((e) => e.id !== id); saveLocal(); renderLog(localLog);
}
let logList = [];
const picked = new Set(), seen = new Set();
const msOf = (e) => e.clean || (() => { try { return Layers.plainText(Layers.build(e.latex).spokenHtml); } catch (x) { return ''; } })();
function renderLog(list) {
  logList = list.slice().sort((a, b) => a.ts - b.ts);          // Equation 1 = first saved
  list.forEach((e) => { if (!seen.has(e.id)) { seen.add(e.id); picked.add(e.id); } });   // new saves start checked
  [...picked].forEach((id) => { if (!list.some((e) => e.id === id)) picked.delete(id); });
  entriesEl.textContent = '';
  $('logCount').textContent = list.length; $('logCount').setAttribute('aria-label', list.length + ' saved equation' + (list.length === 1 ? '' : 's'));
  if (!list.length) { entriesEl.innerHTML = '<p class="empty">Nothing saved yet. Say or press “Save” in the Math Workspace to add the current equation here.</p>'; updatePicks(); return; }
  logList.forEach((e, i) => {
    const n = i + 1, ms = msOf(e);
    const row = el('div', 'entry'); row.dataset.id = e.id;
    const pick = el('label', 'eq-pick'); const cb = document.createElement('input'); cb.type = 'checkbox'; cb.checked = picked.has(e.id);
    cb.setAttribute('aria-label', 'Select equation ' + n + ': ' + ms);
    cb.onchange = () => { if (cb.checked) picked.add(e.id); else picked.delete(e.id); updatePicks(); };
    pick.append(cb, el('span', null, 'Select'));
    const main = el('div', 'eq-main'); const num = el('span', 'eq-num', String(n)); num.setAttribute('aria-hidden', 'true');
    const body = el('div', 'eq-body');
    const eq = el('div', 'eq'); renderTex(eq, e.latex, false);
    body.append(el('span', 'label', 'Equation ' + n), eq, el('span', 'ms', ms));
    main.append(num, body);
    const acts = el('div', 'acts');
    const open = el('button', 'small', 'Open'); open.type = 'button'; open.setAttribute('aria-label', 'Open equation ' + n + ' in the workspace');
    open.onclick = () => { spoken.value = e.input || ''; setLatex(e.latex); savedLatex = e.latex; chatNewEquation(); go('workspace', true); setStatus('Opened equation ' + n + '.'); };
    const del = el('button', 'small', 'Delete'); del.type = 'button'; del.setAttribute('aria-label', 'Delete equation ' + n);
    del.onclick = () => removeLog(e.id);
    acts.append(open, del);
    row.append(pick, main, acts); entriesEl.appendChild(row);
  });
  updatePicks();
}
const pickedList = () => logList.map((e, i) => ({ e, n: i + 1 })).filter((x) => picked.has(x.e.id));
function updatePicks() {
  const k = pickedList().length, all = $('pickAll');
  $('pickCount').textContent = k + ' of ' + logList.length + ' selected';
  all.checked = !!logList.length && k === logList.length; all.indeterminate = k > 0 && k < logList.length; all.disabled = !logList.length;
  $('toOrganize').disabled = !k;
  entriesEl.querySelectorAll('.entry').forEach((r) => r.classList.toggle('is-sel', picked.has(r.dataset.id)));
}
$('pickAll').onchange = (ev) => { logList.forEach((e) => ev.target.checked ? picked.add(e.id) : picked.delete(e.id)); renderLog(logList); };
