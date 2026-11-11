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
$('orgBack').onclick = () => { go('export', true); setStatus('Select equations. ' + pickedList().length + ' of ' + logList.length + ' selected. Say “Organize” when ready.'); };
let editing = -1, orgSel = 0;   // orgSel: the current block, which voice commands like “Move up” act on
const kindOf = (i) => { let n = 0; const t = blocks[i].t; for (let j = 0; j <= i; j++) if (blocks[j].t === t) n++; return (t === 'heading' ? 'Heading ' : t === 'text' ? 'Text block ' : 'Equation ') + n; };
function moveBlock(i, to, quiet) {
  to = Math.max(0, Math.min(blocks.length - 1, to)); if (i === to || i < 0 || i >= blocks.length) return false;
  const [b] = blocks.splice(i, 1); blocks.splice(to, 0, b); orgSel = to; renderBlocks();
  if (!quiet) setStatus(kindOf(to) + ' is now block ' + (to + 1) + ' of ' + blocks.length + '.', 'ok');
  return true;
}
function removeBlock(i) {
  if (i < 0 || i >= blocks.length) return;
  const kind = kindOf(i); blocks.splice(i, 1);
  if (!blocks.length) { orgFrom = ''; go('export', true); setStatus('Removed ' + kind + '. Nothing left to export.'); return; }
  orgSel = Math.min(i, blocks.length - 1); renderBlocks(); setStatus('Removed ' + kind + '. Now on ' + kindOf(orgSel) + '.', 'ok');
}
function selectBlock(i, speak) {
  if (i < 0 || i >= blocks.length) return false;
  orgSel = i; renderBlocks();
  const li = $('blocks').children[i]; if (li) li.scrollIntoView({ block: 'nearest' });
  if (speak) { const b = blocks[i]; setStatus(kindOf(i) + ', block ' + (i + 1) + ' of ' + blocks.length + ': ' + (b.t === 'eq' ? b.ms : b.text)); }
  return true;
}
function renderBlocks() {
  orgSel = Math.max(0, Math.min(orgSel, blocks.length - 1));
  const ol = $('blocks'); ol.textContent = '';
  const nEq = blocks.filter((b) => b.t === 'eq').length;
  $('blkCount').textContent = 'Shown in document order · ' + blocks.length + ' block' + (blocks.length === 1 ? '' : 's') + ' · ' + nEq + ' equation' + (nEq === 1 ? '' : 's');
  const count = { heading: 0, text: 0, eq: 0 };
  blocks.forEach((b, i) => {
    count[b.t]++;
    const kind = b.t === 'heading' ? 'Heading ' + count.heading : b.t === 'text' ? 'Text block ' + count.text : 'Equation ' + count.eq;
    const li = el('li', 'blk t-' + b.t + (i === orgSel ? ' is-cur' : '')); li.setAttribute('aria-label', 'Block ' + (i + 1) + ', ' + kind);
    if (i === orgSel) li.setAttribute('aria-current', 'true');
    li.addEventListener('click', (ev) => { if (!ev.target.closest('button, textarea') && orgSel !== i) { orgSel = i; renderBlocks(); } });
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
      ib('up', 'Move ' + kind + ' up', () => { moveBlock(i, i - 1, true); focusAct(i - 1, 1); }, i === 0),
      ib('down', 'Move ' + kind + ' down', () => { moveBlock(i, i + 1, true); focusAct(i + 1, 2); }, i === blocks.length - 1),
      ib('x', 'Remove ' + kind, () => removeBlock(i)));
    li.append(num, body, acts); ol.appendChild(li);
  });
  renderPaper(); renderOrgBar();
}
function focusAct(i, k) { const b = $('blocks').children[i]; if (b) { const btn = b.querySelectorAll('.blk-acts .ib')[k]; (btn && !btn.disabled ? btn : b.querySelector('.ib')).focus(); } }
let addKind = 'heading';
function openAdder(kind, byVoice) {
  addKind = kind; $('adder').hidden = false; $('adderLabel').textContent = kind === 'heading' ? 'New heading' : 'New text block'; $('adderIn').value = '';
  if (byVoice && micOn) { base = ''; setMode('adder'); setStatus('Say the ' + (kind === 'heading' ? 'heading' : 'text') + ', then “Done”. Or “Cancel”.'); }
  else $('adderIn').focus();
}
function addBlock(kind, text) {
  blocks.push({ t: kind, text }); orgSel = blocks.length - 1; renderBlocks();
  setStatus('Added ' + kindOf(orgSel) + ' at the end: “' + text + '”. Say “Move up” to move it.', 'ok');
}
$('adderCancel').onclick = () => { $('adder').hidden = true; if (vMode === 'adder') toStandby(); };
$('adderOk').onclick = () => { const v = $('adderIn').value.trim(); if (!v) { if (vMode === 'adder') setStatus('Nothing heard yet. Say the words, then “Done”.', 'err'); else $('adderIn').focus(); return; } $('adder').hidden = true; if (vMode === 'adder') toStandby(); addBlock(addKind, v); };
$('adderIn').addEventListener('input', (e) => { if (e.isTrusted && vMode === 'adder') toStandby(); });   // typing takes over from dictation
$('adderIn').addEventListener('keydown', (ev) => { if (ev.key === 'Enter' && !ev.shiftKey) { ev.preventDefault(); $('adderOk').click(); } if (ev.key === 'Escape') $('adderCancel').click(); });

function setSeg(id, attr, val) { document.querySelectorAll('#' + id + ' [data-' + attr + ']').forEach((b) => b.setAttribute('aria-checked', String(b.dataset[attr] === val))); }
function renderFmts() {
  const seg = $('fmtSeg'); seg.textContent = '';
  FMTS[cat].forEach(([k, name, sub]) => { const b = el('button'); b.type = 'button'; b.setAttribute('role', 'radio'); b.dataset.fmt = k; b.append(el('b', null, name), el('span', null, sub)); b.onclick = () => { fmt = k; setSeg('fmtSeg', 'fmt', fmt); renderPaper(); }; seg.appendChild(b); });
  setSeg('fmtSeg', 'fmt', fmt);
}
document.querySelectorAll('#catSeg [data-cat]').forEach((b) => b.onclick = () => { cat = b.dataset.cat; fmt = FMTS[cat][0][0]; setSeg('catSeg', 'cat', cat); renderFmts(); renderPaper(); });
/* Voice and the command bar pick one format; the category follows from it */
const FMT_NAMES = { pdf: 'PDF', docx: 'Word', png: 'PNG images', svg: 'SVG images' };
function setFormat(f) {
  cat = f === 'pdf' || f === 'docx' ? 'doc' : 'img'; fmt = f;
  setSeg('catSeg', 'cat', cat); renderFmts(); renderPaper();
  setStatus('Format: ' + FMT_NAMES[f] + (cat === 'img' ? '. Images include equations only; headings and text are left out.' : '.'), 'ok');
}
function setOpt(id, on, label) { const c = $(id); if (c.disabled) { setStatus(label + ' only applies to documents. Say “PDF” or “Word” first.', 'err'); return; } c.checked = on; renderPaper(); setStatus(label + (on ? ' on.' : ' off.'), 'ok'); }
$('docTitle').addEventListener('input', (e) => { if (e.isTrusted && vMode === 'title') toStandby(); renderPaper(); });
$('numbering').addEventListener('change', () => renderPaper());
$('showLatex').addEventListener('change', () => renderPaper());
renderFmts();
function buildPaper(target) {
  target.textContent = '';
  const num = $('numbering').checked, doc = cat === 'doc', tex = doc && $('showLatex').checked;
  const title = $('docTitle').value.trim();
  if (doc && title) { target.append(el('p', 'pt', title), el('div', 'pt-rule')); }
  let n = 0;
  blocks.forEach((b) => {
    if (b.t === 'eq') {
      n++; const row = el('div', 'pe' + (num ? '' : ' nonum')); const eq = el('div'); renderTex(eq, b.latex, false);
      if (num) row.appendChild(el('span', 'pn', n + '.')); row.append(eq);
      if (tex) row.appendChild(el('code', 'pl', b.latex));
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
  $('showLatex').disabled = cat !== 'doc'; $('showLatex').closest('.switch').classList.toggle('off', cat !== 'doc');
  renderOrgBar();
}
/* Organize command bar: mirrors the state of the side panel */
function renderOrgBar() {
  const bar = $('orgBar'); if (!bar) return;
  const has = blocks.length > 0, q = (c) => bar.querySelector('[data-ocmd="' + c + '"]');
  $('orgCur').textContent = has ? kindOf(orgSel) : '—';
  q('prev').disabled = !has || orgSel === 0; q('next').disabled = !has || orgSel >= blocks.length - 1;
  q('up').disabled = !has || orgSel === 0; q('down').disabled = !has || orgSel >= blocks.length - 1; q('remove').disabled = !has;
  const tex = $('showLatex'), num = $('numbering');
  q('latex').textContent = '“LaTeX ' + (tex.checked ? 'off' : 'on') + '”'; q('latex').setAttribute('aria-pressed', String(tex.checked)); q('latex').disabled = tex.disabled;
  q('numbering').textContent = '“Numbering ' + (num.checked ? 'off' : 'on') + '”'; q('numbering').setAttribute('aria-pressed', String(num.checked));
  bar.querySelectorAll('[data-ofmt]').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.ofmt === fmt)));
  q('final').disabled = !has;
}
function readBack() {
  if (!blocks.length) { setStatus('The document is empty.'); return; }
  const title = $('docTitle').value.trim();
  const parts = blocks.map((b, i) => kindOf(i) + ': ' + (b.t === 'eq' ? b.ms : b.text));
  setStatus((title ? 'Title: ' + title + '. ' : '') + blocks.length + ' blocks. ' + parts.join('. ') + '. Format: ' + FMT_NAMES[fmt] + ', numbering ' + ($('numbering').checked ? 'on' : 'off') + ', LaTeX ' + ($('showLatex').checked && cat === 'doc' ? 'on' : 'off') + '.');
}
const ORG_CMDS = {
  prev: () => { if (!selectBlock(orgSel - 1, true)) setStatus('This is the first block.'); },
  next: () => { if (!selectBlock(orgSel + 1, true)) setStatus('This is the last block.'); },
  up: () => { if (!moveBlock(orgSel, orgSel - 1)) setStatus(kindOf(orgSel) + ' is already first.'); },
  down: () => { if (!moveBlock(orgSel, orgSel + 1)) setStatus(kindOf(orgSel) + ' is already last.'); },
  remove: () => removeBlock(orgSel),
  heading: (v) => openAdder('heading', v), text: (v) => openAdder('text', v),
  latex: () => setOpt('showLatex', !$('showLatex').checked, 'LaTeX under equations'),
  numbering: () => setOpt('numbering', !$('numbering').checked, 'Equation numbering'),
  read: readBack, final: () => $('doExport').click()
};
document.querySelectorAll('#orgBar [data-ocmd]').forEach((b) => b.onclick = () => ORG_CMDS[b.dataset.ocmd](false));
document.querySelectorAll('#orgBar [data-ofmt]').forEach((b) => b.onclick = () => setFormat(b.dataset.ofmt));
$('doExport').onclick = async () => {
  if (!blocks.length) return;
  const title = $('docTitle').value.trim() || 'Mathena';
  const base = title.replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-') || 'speak-math';
  if (fmt === 'pdf') { const blob = await buildPdf(title); if (blob && await saveFile(base + '.pdf', blob, true)) setStatus('Downloaded ' + base + '.pdf.', 'ok'); return; }   // straight to the downloads folder, no print dialog
  if (fmt === 'docx') { const blob = await buildDocx(title); if (blob && await saveFile(base + '.docx', blob, true)) setStatus('Downloaded ' + base + '.docx.', 'ok'); return; }
  let ok = 0, n = 0;
  for (const b of blocks) {
    if (b.t !== 'eq') continue; n++;
    const r = plainSvg(b.latex, true); if (!r) continue;
    const blob = fmt === 'svg' ? svgBlob(r) : await pngBlob(r, true);
    if (blob && await saveFile(base + '-equation-' + n + '.' + fmt, blob, true)) ok++;
    await new Promise((t) => setTimeout(t, 250));   // browsers drop rapid back-to-back downloads
  }
  if (ok) setStatus('Downloaded ' + ok + ' ' + fmt.toUpperCase() + (ok === 1 ? '' : 's') + '.', 'ok');
};
