// Mathena. Classic script: shares top-level names with the other js/ files. Load order is set in index.html.
// Organize & Export: voice commands (exact phrases matched in code, no AI)

/* Commands either act on the current block (“Move up”, “Remove”) or name a block directly
   (“Move equation 3 down”, “Remove heading 1”). Blocks are named by kind and count, the same way
   they're labeled on screen: Equation 3 = the third equation, Heading 1 = the first heading.
   “Add heading” / “Set title” switch the mic to dictation into that field until “Done” or “Cancel”. */
const NUMW = { one: 1, won: 1, first: 1, two: 2, to: 2, too: 2, second: 2, three: 3, third: 3, four: 4, for: 4, fourth: 4, five: 5, fifth: 5, six: 6, sixth: 6, seven: 7, seventh: 7, eight: 8, ate: 8, eighth: 8, nine: 9, ninth: 9, ten: 10, tenth: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20, last: -1 };
const numOf = (w) => /^\d+$/.test(w) ? +w : (NUMW[w] || 0);
const KIND = '(equation|heading|text block|text|note|block)';
/* "equation 3" → block index, or -1 */
function blockIndex(kind, w) {
  const k = numOf(w); if (!k) return -1;
  if (kind === 'block') return k === -1 ? blocks.length - 1 : k - 1;
  const t = kind === 'equation' ? 'eq' : kind === 'heading' ? 'heading' : 'text';
  const idx = blocks.map((b, i) => (b.t === t ? i : -1)).filter((i) => i >= 0);
  return k === -1 ? (idx.length ? idx[idx.length - 1] : -1) : (idx[k - 1] ?? -1);
}
const LATEX_W = '(?:latex|la tech|lay tech|latech|laytech|la tex|lay tex|lateks)';
const FMT_W = { pdf: 'pdf', 'p d f': 'pdf', word: 'docx', docx: 'docx', 'word document': 'docx', document: 'pdf', png: 'png', 'p n g': 'png', 'png images': 'png', images: 'png', 'equation images': 'png', svg: 'svg', 's v g': 'svg', 'svg images': 'svg' };
function notFound(kind, w) { setStatus('There\'s no ' + kind + ' ' + w + '. Say “Read back” to hear the blocks.', 'err'); }

function orgCommand(n) {
  let m;
  if (/^(previous|previous block)$/.test(n)) return ORG_CMDS.prev(), true;
  if (/^(next|next block)$/.test(n)) return ORG_CMDS.next(), true;
  if ((m = n.match(new RegExp('^(?:select |go to |jump to )?' + KIND + ' (\\w+)$')))) {
    const i = blockIndex(m[1], m[2]); if (i < 0) notFound(m[1], m[2]); else selectBlock(i, true); return true;
  }
  if ((m = n.match(new RegExp('^move (?:' + KIND + ' (\\w+) )?(up|down|to (?:the )?top|to (?:the )?bottom|to the end|to the start)$')))) {
    let i = orgSel; if (m[1]) { i = blockIndex(m[1], m[2]); if (i < 0) return notFound(m[1], m[2]), true; }
    const d = m[3], to = d === 'up' ? i - 1 : d === 'down' ? i + 1 : /top|start/.test(d) ? 0 : blocks.length - 1;
    if (!moveBlock(i, to)) setStatus(kindOf(i) + ' is already ' + (to < i || /top|start/.test(d) ? 'first.' : 'last.'));
    return true;
  }
  if ((m = n.match(new RegExp('^(?:remove|delete)(?: that| it| this)?(?: ' + KIND + ' (\\w+))?$')))) {
    let i = orgSel; if (m[1]) { i = blockIndex(m[1], m[2]); if (i < 0) return notFound(m[1], m[2]), true; }
    removeBlock(i); return true;
  }
  if ((m = n.match(/^(?:add|new|insert) (?:a )?(heading|text|text block|note|paragraph)(?: (.+))?$/))) {
    const kind = m[1] === 'heading' ? 'heading' : 'text';
    if (m[2]) addBlock(kind, m[2].charAt(0).toUpperCase() + m[2].slice(1)); else openAdder(kind, true);
    return true;
  }
  if (/^(?:set|change) (?:the )?title$|^title$/.test(n)) { base = ''; $('docTitle').value = ''; setMode('title'); setStatus('Say the document title, then “Done”.'); return true; }
  if ((m = n.match(/^(?:set |change )?(?:the )?title (?:to )?(.+)$/))) { $('docTitle').value = m[1].replace(/\b\w/g, (c) => c.toUpperCase()); renderPaper(); setStatus('Title: ' + $('docTitle').value + '.', 'ok'); return true; }
  if ((m = n.match(new RegExp('^(?:' + LATEX_W + ' (on|off)|(show|hide) ' + LATEX_W + '|turn (on|off) ' + LATEX_W + '|toggle ' + LATEX_W + ')$')))) {
    const v = m[1] || m[3] || (m[2] ? (m[2] === 'show' ? 'on' : 'off') : ($('showLatex').checked ? 'off' : 'on'));
    setOpt('showLatex', v === 'on', 'LaTeX under equations'); return true;
  }
  if ((m = n.match(/^(?:(?:equation )?numbering (on|off)|turn (on|off) (?:equation )?numbering|toggle (?:equation )?numbering|(number) (?:the )?equations|(no|remove) numbering)$/))) {
    const v = m[1] || m[2] || (m[4] ? 'on' : m[5] ? 'off' : ($('numbering').checked ? 'off' : 'on'));
    setOpt('numbering', v === 'on', 'Equation numbering'); return true;
  }
  if ((m = n.match(/^(?:export as |save as |format |make it (?:a |an )?)?(.+?)$/)) && FMT_W[m[1]]) {
    let f = FMT_W[m[1]];
    if (m[1] === 'document' && cat === 'doc') f = fmt;                                  // “Document” keeps PDF/Word as chosen
    if ((m[1] === 'images' || m[1] === 'equation images') && cat === 'img') f = fmt;    // “Images” keeps PNG/SVG as chosen
    setFormat(f); return true;
  }
  if (/^(finalize|finalise|finish|finish up|export document|export the document|export it|export now|download|download it)$/.test(n)) { ORG_CMDS.final(); return true; }
  if (/^(read back|read it back|read document|read the document|read outline|read)$/.test(n)) { readBack(); return true; }
  if (/^(back|go back|select equations|back to select equations|go back to select equations|back to (?:the )?list|export list|back to export|go back to the list)$/.test(n)) { $('orgBack').click(); return true; }
  return false;
}

/* Called first for every final transcript on the Organize page. Returns true if it handled it. */
function orgHandle(t) {
  if (vMode === 'adder' || vMode === 'title') {
    const n = norm(t);
    if (n === 'cancel' || n.endsWith(' cancel')) {
      if (vMode === 'adder') $('adderCancel').click(); else { toStandby(); setStatus('Title dictation stopped.'); }
      return true;
    }
    const { text, cmd } = parseChunk(t);
    if (text.trim()) {
      addWords(text);
      const box = targetBox(); box.value = box.value.charAt(0).toUpperCase() + box.value.slice(1);
      if (vMode === 'title') renderPaper();
    }
    if (cmd === 'done' || cmd === 'standby') {
      if (vMode === 'adder') $('adderOk').click();
      else { toStandby(); renderPaper(); setStatus('Title: ' + ($('docTitle').value.trim() || '(none)') + '.', 'ok'); }
    } else if (cmd === 'clear') { base = ''; targetBox().value = ''; if (vMode === 'title') renderPaper(); }
    return true;
  }
  return orgCommand(norm(t));
}
const ORG_HINT = 'On this page say “Go back”, “Next”, “Move equation 2 up”, “Remove heading 1”, “Add heading”, “Numbering off”, “LaTeX on”, “Word”, “Read back” or “Finalize”.';
