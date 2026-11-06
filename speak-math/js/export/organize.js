// Speak Math. Classic script: shares top-level names with the other js/ files. Load order is set in index.html.
// Organize & Export: document built from blocks

/* ---------- Organize & Export: a document built from blocks ---------- */
let blocks = [], orgFrom = '', cat = 'doc', fmt = 'pdf';
const FMTS = { doc: [['pdf', 'PDF', '.pdf'], ['docx', 'Word', '.docx']], img: [['png', 'PNG', 'one image per equation'], ['svg', 'SVG', 'one image per equation']] };
const ICONS = {
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13 7l4 4"/>', up: '<path d="M12 19V5M6.5 10.5L12 5l5.5 5.5"/>',
  down: '<path d="M12 5v14M6.5 13.5L12 19l5.5-5.5"/>', x: '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>' };
const ib = (icon, label, fn, disabled) => { const b = el('button', 'ib'); b.type = 'button'; b.innerHTML = ICON(ICONS[icon]); b.setAttribute('aria-label', label); b.title = label; b.disabled = !!disabled; b.onclick = fn; return b; };
$('toOrganize').onclick = () => {
  const items = pickedList(); if (!items.length) return;
  const key = items.map((x) => x.e.id).join(',');
  if (key !== orgFrom) { blocks = items.map(({ e }) => ({ t: 'eq', latex: e.latex, ms: msOf(e) })); orgFrom = key; }
  go('organize', true);
};
$('orgBack').onclick = () => go('export', true);
let editing = -1;
function renderBlocks() {
  const ol = $('blocks'); ol.textContent = '';
  const nEq = blocks.filter((b) => b.t === 'eq').length;
  $('blkCount').textContent = 'Shown in document order · ' + blocks.length + ' block' + (blocks.length === 1 ? '' : 's') + ' · ' + nEq + ' equation' + (nEq === 1 ? '' : 's');
  const count = { heading: 0, text: 0, eq: 0 };
  blocks.forEach((b, i) => {
    count[b.t]++;
    const kind = b.t === 'heading' ? 'Heading ' + count.heading : b.t === 'text' ? 'Text block ' + count.text : 'Equation ' + count.eq;
    const li = el('li', 'blk t-' + b.t); li.setAttribute('aria-label', 'Block ' + (i + 1) + ', ' + kind);
    const num = el('span', 'eq-num', String(i + 1)); num.setAttribute('aria-hidden', 'true');
    const body = el('div', 'blk-body'); body.appendChild(el('span', 'label', kind));
    if (editing === i) {
      const ta = document.createElement('textarea'); ta.value = b.t === 'eq' ? b.latex : b.text; ta.setAttribute('aria-label', 'Edit ' + kind + (b.t === 'eq' ? ' (LaTeX)' : ''));
      if (b.t === 'eq') ta.style.fontFamily = 'var(--font-mono)';
      const row = el('div', 'row');
      const ok = el('button', 'small primary', 'Done'); ok.type = 'button';
      ok.onclick = () => { const v = ta.value.trim(); if (v) { if (b.t === 'eq') { b.latex = v; try { b.ms = Layers.plainText(Layers.build(v).spokenHtml); } catch (x) {} } else b.text = v; } editing = -1; renderBlocks(); };
      const no = el('button', 'small ghost', 'Cancel'); no.type = 'button'; no.onclick = () => { editing = -1; renderBlocks(); };
      ta.addEventListener('keydown', (ev) => { if (ev.key === 'Enter' && !ev.shiftKey && b.t !== 'eq') { ev.preventDefault(); ok.click(); } if (ev.key === 'Escape') no.click(); });
      row.append(ok, no); body.append(ta, row); setTimeout(() => ta.focus(), 0);
    } else if (b.t === 'eq') { const eq = el('div', 'eq'); renderTex(eq, b.latex, false); body.append(eq, el('span', 'hint', b.ms)); }
    else body.appendChild(el('span', b.t === 'heading' ? 'h' : 't', b.text));
    const acts = el('div', 'blk-acts');
    acts.append(
      ib('edit', 'Edit ' + kind, () => { editing = i; renderBlocks(); }),
      ib('up', 'Move ' + kind + ' up', () => { [blocks[i - 1], blocks[i]] = [blocks[i], blocks[i - 1]]; renderBlocks(); focusAct(i - 1, 1); }, i === 0),
      ib('down', 'Move ' + kind + ' down', () => { [blocks[i + 1], blocks[i]] = [blocks[i], blocks[i + 1]]; renderBlocks(); focusAct(i + 1, 2); }, i === blocks.length - 1),
      ib('x', 'Remove ' + kind, () => { blocks.splice(i, 1); if (!blocks.length) { orgFrom = ''; go('export', true); return; } renderBlocks(); setStatus('Removed ' + kind + '.'); }));
    li.append(num, body, acts); ol.appendChild(li);
  });
  renderPaper();
}
function focusAct(i, k) { const b = $('blocks').children[i]; if (b) { const btn = b.querySelectorAll('.blk-acts .ib')[k]; (btn && !btn.disabled ? btn : b.querySelector('.ib')).focus(); } }
let addKind = 'heading';
function openAdder(kind) { addKind = kind; $('adder').hidden = false; $('adderLabel').textContent = kind === 'heading' ? 'New heading' : 'New text block'; $('adderIn').value = ''; $('adderIn').focus(); }
$('addHead').onclick = () => openAdder('heading');
$('addText').onclick = () => openAdder('text');
$('adderCancel').onclick = () => { $('adder').hidden = true; };
$('adderOk').onclick = () => { const v = $('adderIn').value.trim(); if (!v) { $('adderIn').focus(); return; } blocks.push({ t: addKind, text: v }); $('adder').hidden = true; renderBlocks(); setStatus('Added ' + (addKind === 'heading' ? 'a heading' : 'a text block') + ' at the end. Use the arrows to move it.', 'ok'); };
$('adderIn').addEventListener('keydown', (ev) => { if (ev.key === 'Enter' && !ev.shiftKey) { ev.preventDefault(); $('adderOk').click(); } if (ev.key === 'Escape') $('adderCancel').click(); });

function setSeg(id, attr, val) { document.querySelectorAll('#' + id + ' [data-' + attr + ']').forEach((b) => b.setAttribute('aria-checked', String(b.dataset[attr] === val))); }
function renderFmts() {
  const seg = $('fmtSeg'); seg.textContent = '';
  FMTS[cat].forEach(([k, name, sub]) => { const b = el('button'); b.type = 'button'; b.setAttribute('role', 'radio'); b.dataset.fmt = k; b.append(el('b', null, name), el('span', null, sub)); b.onclick = () => { fmt = k; setSeg('fmtSeg', 'fmt', fmt); renderPaper(); }; seg.appendChild(b); });
  setSeg('fmtSeg', 'fmt', fmt);
}
document.querySelectorAll('#catSeg [data-cat]').forEach((b) => b.onclick = () => { cat = b.dataset.cat; fmt = FMTS[cat][0][0]; setSeg('catSeg', 'cat', cat); renderFmts(); renderPaper(); });
$('docTitle').addEventListener('input', () => renderPaper());
$('numbering').addEventListener('change', () => renderPaper());
renderFmts();
function buildPaper(target) {
  target.textContent = '';
  const num = $('numbering').checked, doc = cat === 'doc';
  const title = $('docTitle').value.trim();
  if (doc && title) { target.append(el('p', 'pt', title), el('div', 'pt-rule')); }
  let n = 0;
  blocks.forEach((b) => {
    if (b.t === 'eq') {
      n++; const row = el('div', 'pe' + (num ? '' : ' nonum')); const eq = el('div'); renderTex(eq, b.latex, false);
      if (num) row.appendChild(el('span', 'pn', n + '.')); row.append(eq);
      if (!doc) row.appendChild(el('span', 'pm', b.ms));
      target.appendChild(row);
    } else if (doc) target.appendChild(el(b.t === 'heading' ? 'p' : 'p', b.t === 'heading' ? 'ph' : 'px', b.text));
  });
  if (!blocks.length) target.appendChild(el('p', 'pempty', 'Nothing to export.'));
}
function renderPaper() {
  buildPaper($('paper'));
  const name = FMTS[cat].find((f) => f[0] === fmt)[1];
  $('prevLabel').textContent = 'Live preview · ' + name;
  $('doExport').textContent = cat === 'doc' ? 'Export ' + name : 'Save ' + name + 's';
}
$('doExport').onclick = async () => {
  if (!blocks.length) return;
  const title = $('docTitle').value.trim() || 'Speak Math';
  const base = title.replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-') || 'speak-math';
  if (fmt === 'pdf') { const area = $('printArea'); area.textContent = ''; const pp = el('div', 'paper'); buildPaper(pp); area.appendChild(pp); setStatus('In the print dialog, choose “Save as PDF”.'); window.print(); return; }
  if (fmt === 'docx') { const blob = await buildDocx(title); if (blob && await saveFile(base + '.docx', blob, true)) setStatus('Saved ' + base + '.docx.', 'ok'); return; }
  let ok = 0, n = 0;
  for (const b of blocks) {
    if (b.t !== 'eq') continue; n++;
    const r = plainSvg(b.latex, true); if (!r) continue;
    const blob = fmt === 'svg' ? svgBlob(r) : await pngBlob(r, true);
    if (blob && await saveFile(base + '-equation-' + n + '.' + fmt, blob, true)) ok++;
    await new Promise((t) => setTimeout(t, 250));   // browsers drop rapid back-to-back downloads
  }
  if (ok) setStatus('Saved ' + ok + ' ' + fmt.toUpperCase() + (ok === 1 ? '' : 's') + '.', 'ok');
};
