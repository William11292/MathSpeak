// Speak Math. Classic script: shares top-level names with the other js/ files. Load order is set in index.html.
// Export tab: saved equations list

/* ---------- Log ---------- */
const LS_KEY = 'speak-math-log';
function loadLocal() { try { localLog = JSON.parse(localStorage.getItem(LS_KEY) || '[]'); } catch (e) { localLog = []; } }
function saveLocal() { try { localStorage.setItem(LS_KEY, JSON.stringify(localLog.slice(0, 200))); } catch (e) {} }
async function addLog(entry) {
  if (logCol) { try { await logCol.add(entry); return; } catch (e) { setStatus('Couldn\'t save to your log: ' + (e.message || e.code), 'err'); } }
  entry.id = 'l' + entry.ts; localLog.unshift(entry); saveLocal(); logPage = Math.ceil(localLog.length / PER_PAGE) - 1; renderLog(localLog);   // show the page with the new save
}
async function removeLog(id) {
  if (logCol) { try { await logCol.doc(id).delete(); } catch (e) { setStatus('Couldn\'t delete that entry.', 'err'); } return; }
  localLog = localLog.filter((e) => e.id !== id); saveLocal(); renderLog(localLog);
}
let logList = [], logPage = 0;
const PER_PAGE = 10;   // two columns of five: the list never scrolls
const pageCount = () => Math.max(1, Math.ceil(logList.length / PER_PAGE));
const picked = new Set(), seen = new Set();
const msOf = (e) => e.clean || (() => { try { return Layers.plainText(Layers.build(e.latex).spokenHtml); } catch (x) { return ''; } })();
function renderLog(list) {
  logList = list.slice().sort((a, b) => a.ts - b.ts);          // Equation 1 = first saved
  list.forEach((e) => { if (!seen.has(e.id)) { seen.add(e.id); picked.add(e.id); } });   // new saves start checked
  [...picked].forEach((id) => { if (!list.some((e) => e.id === id)) picked.delete(id); });
  entriesEl.textContent = '';
  logPage = Math.min(logPage, pageCount() - 1);
  $('logCount').textContent = list.length; $('logCount').setAttribute('aria-label', list.length + ' saved equation' + (list.length === 1 ? '' : 's'));
  if (!list.length) { entriesEl.innerHTML = '<p class="empty">Nothing saved yet. Say or press “Save” in the Math Workspace to add the current equation here.</p>'; renderPager(); updatePicks(); return; }
  const first = logPage * PER_PAGE;
  logList.slice(first, first + PER_PAGE).forEach((e, j) => {
    const i = first + j, n = i + 1, ms = msOf(e);
    const row = el('div', 'entry'); row.dataset.id = e.id;
    const pick = el('label', 'eq-pick'); const cb = document.createElement('input'); cb.type = 'checkbox'; cb.checked = picked.has(e.id);
    cb.setAttribute('aria-label', 'Select equation ' + n + ': ' + ms);
    cb.onchange = () => { if (cb.checked) picked.add(e.id); else picked.delete(e.id); updatePicks(); };
    pick.append(cb, el('span', null, 'Select'));
    const main = el('div', 'eq-main'); const num = el('span', 'eq-num', String(n)); num.setAttribute('aria-hidden', 'true');
    const body = el('div', 'eq-body');
    const eq = el('div', 'eq'); renderTex(eq, e.latex, false);
    const msEl = el('span', 'ms', ms); msEl.title = ms;
    body.append(el('span', 'label', 'Equation ' + n), eq, msEl);
    main.append(num, body);
    const acts = el('div', 'acts');
    const open = el('button', 'small', 'Open'); open.type = 'button'; open.setAttribute('aria-label', 'Open equation ' + n + ' in the workspace');
    open.onclick = () => { spoken.value = e.input || ''; setLatex(e.latex); savedLatex = e.latex; chatNewEquation(); devDetach(); go('workspace', true); setStatus('Opened equation ' + n + '.'); };
    const del = el('button', 'small', 'Delete'); del.type = 'button'; del.setAttribute('aria-label', 'Delete equation ' + n);
    del.onclick = () => removeLog(e.id);
    acts.append(open, del);
    row.append(pick, main, acts); entriesEl.appendChild(row);
  });
  renderPager(); updatePicks();
}
function renderPager() {
  const pc = pageCount(), first = logPage * PER_PAGE;
  $('logPager').hidden = logList.length <= PER_PAGE;
  $('pgInfo').textContent = 'Page ' + (logPage + 1) + ' of ' + pc + ' · equations ' + (first + 1) + '–' + Math.min(first + PER_PAGE, logList.length) + ' of ' + logList.length;
  $('pgPrev').disabled = logPage === 0; $('pgNext').disabled = logPage >= pc - 1;
}
function changeLogPage(d) {
  const next = Math.min(pageCount() - 1, Math.max(0, logPage + d));
  if (next === logPage) { setStatus(d > 0 ? 'This is the last page.' : 'This is the first page.'); return false; }
  logPage = next; renderLog(logList);
  const first = logPage * PER_PAGE;
  setStatus('Page ' + (logPage + 1) + ' of ' + pageCount() + ': equations ' + (first + 1) + ' to ' + Math.min(first + PER_PAGE, logList.length) + '.');
  return true;
}
$('pgPrev').onclick = () => changeLogPage(-1);
$('pgNext').onclick = () => changeLogPage(1);
document.addEventListener('keydown', (e) => {
  if (e.target.closest && e.target.closest('input, textarea, select')) return;
  if (!$('page-export').hidden && (e.key === 'PageDown' || e.key === 'PageUp')) { e.preventDefault(); changeLogPage(e.key === 'PageDown' ? 1 : -1); }
});
const pickedList = () => logList.map((e, i) => ({ e, n: i + 1 })).filter((x) => picked.has(x.e.id));
function updatePicks() {
  const k = pickedList().length, all = $('pickAll');
  $('pickCount').textContent = k + ' of ' + logList.length + ' selected';
  all.checked = !!logList.length && k === logList.length; all.indeterminate = k > 0 && k < logList.length; all.disabled = !logList.length;
  $('toOrganize').disabled = !k;
  if (typeof renderExpBar === 'function') renderExpBar();
  entriesEl.querySelectorAll('.entry').forEach((r) => r.classList.toggle('is-sel', picked.has(r.dataset.id)));
}
$('pickAll').onchange = (ev) => { logList.forEach((e) => ev.target.checked ? picked.add(e.id) : picked.delete(e.id)); renderLog(logList); };
