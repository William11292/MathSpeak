// Mathena. Classic script: shares top-level names with the other js/ files. Load order is set in index.html.
// Export page (select equations): command bar and voice commands (exact phrases matched in code, no AI)

/* Equations are named by their number on screen: “Select 3”, “Unselect 3”, “Select 2 to 5”.
   Selecting one on another page jumps to that page so it's visible. */
function setPicks(from, to, on) {
  const n = logList.length; from = Math.max(1, from); to = Math.min(n, to);
  if (!n || from > to) { setStatus(n ? 'There\'s no equation ' + from + '. There are ' + n + '.' : 'Nothing saved yet.', 'err'); return; }
  for (let k = from; k <= to; k++) on ? picked.add(logList[k - 1].id) : picked.delete(logList[k - 1].id);
  logPage = Math.floor((to - 1) / PER_PAGE); renderLog(logList);
  const what = from === to ? 'Equation ' + from : 'Equations ' + from + ' to ' + to;
  setStatus(what + (on ? ' selected' : ' unselected') + '. ' + pickedList().length + ' of ' + n + ' selected.', 'ok');
}
function pickAllNone(on) {
  if (!logList.length) { setStatus('Nothing saved yet.', 'err'); return; }
  logList.forEach((e) => on ? picked.add(e.id) : picked.delete(e.id)); renderLog(logList);
  setStatus(on ? 'All ' + logList.length + ' equations selected.' : 'Selection cleared.', 'ok');
}
function readPage() {
  if (!logList.length) { setStatus('Nothing saved yet. Save equations in the Math Workspace first.'); return; }
  const first = logPage * PER_PAGE, items = logList.slice(first, first + PER_PAGE);
  setStatus('Page ' + (logPage + 1) + ' of ' + pageCount() + '. ' + items.map((e, j) => 'Equation ' + (first + j + 1) + (picked.has(e.id) ? ', selected: ' : ': ') + msOf(e)).join('. ') + '. ' + pickedList().length + ' of ' + logList.length + ' selected.');
}
function goOrganize() {
  if (!pickedList().length) { setStatus('Select at least one equation first. Say “Select all” or “Select 1”.', 'err'); return; }
  $('toOrganize').click(); setStatus('Organize & Export: ' + blocks.length + ' block' + (blocks.length === 1 ? '' : 's') + '. Say “Read back” to hear them, or “Go back”.');
}
const EXP_CMDS = { all: () => pickAllNone(true), none: () => pickAllNone(false), prev: () => changeLogPage(-1), next: () => changeLogPage(1), read: readPage, organize: goOrganize };
document.querySelectorAll('#expBar [data-ecmd]').forEach((b) => b.onclick = () => EXP_CMDS[b.dataset.ecmd]());
function renderExpBar() {
  const bar = $('expBar'); if (!bar) return;
  const n = logList.length, k = pickedList().length, q = (c) => bar.querySelector('[data-ecmd="' + c + '"]');
  q('all').disabled = !n || k === n; q('none').disabled = !k;
  q('prev').disabled = logPage === 0; q('next').disabled = logPage >= pageCount() - 1;
  q('read').disabled = !n; q('organize').disabled = !k;
}

/* Called first for every final transcript on the Export page. Returns true if it handled it. */
function exportHandle(t) {
  const n = norm(t); let m;
  if (/^(select all|select everything|check all)$/.test(n)) return pickAllNone(true), true;
  if (/^(select none|unselect all|deselect all|clear selection|clear the selection|uncheck all)$/.test(n)) return pickAllNone(false), true;
  if ((m = n.match(/^(select|check|unselect|deselect|uncheck) (?:equations? )?(?:number )?(\w+) (?:to|through|thru|until) (?:equation )?(?:number )?(\w+)$/))) {
    const a = numOf(m[2]), b = numOf(m[3]); if (a > 0 && b > 0) { setPicks(Math.min(a, b), Math.max(a, b), !/^(un|de)/.test(m[1])); return true; }
  }
  if ((m = n.match(/^(select|check|unselect|deselect|uncheck) (?:equation )?(?:number )?(\w+)$/))) {
    const k = m[2] === 'last' || m[2] === 'last one' ? logList.length : numOf(m[2]);
    if (k > 0) { setPicks(k, k, !/^(un|de)/.test(m[1])); return true; }
  }
  if (/^(next page|next)$/.test(n)) return changeLogPage(1), true;
  if (/^(previous page|previous|back a page)$/.test(n)) return changeLogPage(-1), true;
  if (/^(read page|read the page|read it|read|read back|read list|read the list)$/.test(n)) return readPage(), true;
  if (/^(organize|organise|organize and export|organise and export|next step|continue)$/.test(n)) return goOrganize(), true;
  return false;
}
const EXP_HINT = 'On this page say “Select all”, “Select 3”, “Unselect 3”, “Next page”, “Read page” or “Organize”.';
