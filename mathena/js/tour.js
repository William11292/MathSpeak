// Mathena. Classic script: shares top-level names with the other js/ files. Load order is set in index.html.
// First-time tour: darkens the app and spotlights one part at a time, with a card beside it (Back / Next / Skip).
// Shows once (remembered in this browser); the "? Tour" button in the top bar plays it again.
// It only points at things: it doesn't change the mic, voice commands or any equation. Styles: css/tour.css.

const TOUR = (() => {
  const SEEN = 'mathena-tour-seen';
  const h = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const q = (sel) => document.querySelector(sel);
  const cg = (id) => { const e = document.getElementById(id); return e && e.closest('.cg'); };   // a group in the command bar

  // Each step: the page to show, what to spotlight (none = centered card), a title and text.
  const STEPS = [
    { page: 'workspace', welcome: true, title: 'Write advanced math with your voice.',
      text: 'This short tour shows how to dictate an equation, move around it, edit it, learn MathSpeak and export your work. It takes about 2 minutes.' },
    { page: 'workspace', el: () => q('#micw'), title: 'The mic is always ready',
      text: 'When the app opens, the mic turns on and listens for commands. Say each command on its own, with a short pause before it. Press the mic button or Alt+M to mute or unmute.' },
    { page: 'workspace', el: () => q('#spoken') && q('#spoken').closest('.pnl'), title: 'Dictate an equation',
      text: 'Say “Create new”, read the equation the way you would say it aloud, then say “Done”. You can also type it here.' },
    { page: 'workspace', el: () => q('.ws-right'), title: 'See it three ways',
      text: 'Your equation appears as an image, as LaTeX, and as MathSpeak: the clean spoken version a screen reader would read.' },
    { page: 'workspace', el: () => cg('cg-edit'), title: 'Move through the layers',
      text: 'Equations are built in layers, like an exponent inside a fraction. “In a layer” and “Out a layer” go deeper or back up, “Previous” and “Next” move sideways, and “Delete” removes the selected part.' },
    { page: 'workspace', el: () => cg('cg-ref'), title: 'Edit by voice',
      text: 'Say “Edit”, then say what should replace the selected part, then “Done”. Turn on “Refine with AI” to describe a change instead, like “change sine to cosine”, and pick one of 3 choices by number.' },
    { page: 'workspace', el: () => cg('cg-save'), title: 'Save it',
      text: 'Say “Save” to add the equation to your Export list.' },
    { page: 'help', el: () => q('[data-tour="lz-search"]'), title: 'Learn to speak math',
      text: 'The MathSpeak Tutorial teaches the spoken rules for math. Choose a subject and a topic, or search for one.' },
    { page: 'help', el: () => q('[data-tour="lz-example"]'), title: 'See and hear examples',
      text: 'Each topic shows an example equation, the words to say for it, and how it sounds read aloud.' },
    { page: 'help', el: () => q('[data-tour="lz-practice"]'), title: 'Practice',
      text: 'Press “Say it” and say the phrase. It checks whether your words turn into the example, and you can fix your attempt with the same voice commands as the workspace.' },
    { page: 'export', el: () => q('#page-export .pnl') || q('#page-export'), title: 'Export your work',
      text: 'Choose saved equations, then “Organize” to add a title, headings and text, and download a Word or PDF file with equations a screen reader can read.' },
    { page: 'workspace', welcome: true, title: 'You’re ready.',
      text: 'Say “Create new” to write your first equation. To see this tour again, press “Tour” in the top right corner.' },
  ];

  let i = 0, root = null, hole = null, card = null, before = null, startPage = null, raf = 0;

  function start() {
    if (root) return;
    try { startPage = page(); } catch (e) { startPage = 'workspace'; }
    before = document.activeElement;
    root = document.createElement('div'); root.className = 'tour'; root.dataset.tour = 'overlay';
    root.innerHTML = '<div class="tour-block"></div><div class="tour-hole" aria-hidden="true"></div>' +
      '<div class="tour-card" role="dialog" aria-modal="true" aria-labelledby="tour-title" aria-describedby="tour-text" tabindex="-1"></div>';
    document.body.appendChild(root);
    hole = root.querySelector('.tour-hole'); card = root.querySelector('.tour-card');
    card.addEventListener('click', onClick);
    root.addEventListener('keydown', onKey);
    window.addEventListener('resize', place); window.addEventListener('scroll', place, true);
    show(0);
  }

  function end(goBack) {
    if (!root) return;
    try { localStorage.setItem(SEEN, '1'); } catch (e) {}
    window.removeEventListener('resize', place); window.removeEventListener('scroll', place, true);
    cancelAnimationFrame(raf); root.remove(); root = hole = card = null;
    if (goBack && startPage) { try { go(startPage); } catch (e) {} }
    if (before && before.isConnected) { try { before.focus({ preventScroll: true }); } catch (e) {} }
  }

  function show(k) {
    i = Math.max(0, Math.min(STEPS.length - 1, k));
    const s = STEPS[i], last = i === STEPS.length - 1;
    try { if (page() !== s.page) go(s.page); } catch (e) {}
    const n = STEPS.length;
    card.className = 'tour-card' + (s.welcome ? ' tour-welcome' : '');
    card.innerHTML =
      '<button type="button" class="tour-x" data-t="skip" aria-label="Close the tour">' +
        '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button>' +
      (s.welcome ? '<img class="tour-logo" src="img/logo.png" alt="" width="46" height="56">' : '') +
      (i === 0 ? '<p class="tour-eyebrow">Welcome to Mathena</p>' : '') +
      '<h2 class="tour-title" id="tour-title">' + h(s.title) + '</h2>' +
      '<p class="tour-text" id="tour-text">' + h(s.text) + '</p>' +
      (i === 0 ? '<ul class="tour-chips" aria-label="What you’ll learn"><li>Dictate hands-free</li><li>Hear math read</li><li>Practice commands</li></ul>' : '') +
      '<div class="tour-foot">' +
        '<span class="tour-count">' + (i + 1) + ' of ' + n + '</span>' +
        (i === 0 ? '<button type="button" class="tour-btn tour-ghost" data-t="skip">Skip</button>'
                 : last ? '' : '<button type="button" class="tour-btn tour-ghost" data-t="back">Back</button>') +
        '<button type="button" class="tour-btn tour-primary" data-t="' + (last ? 'done' : 'next') + '">' +
          (i === 0 ? 'Start tour' : last ? 'Finish' : 'Next') + ' <span aria-hidden="true">›</span></button>' +
      '</div>';
    const t = target();
    if (t) t.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    place();
    requestAnimationFrame(() => { const b = card && card.querySelector('[data-t="next"],[data-t="done"]'); if (b) b.focus({ preventScroll: true }); });
  }

  // The element for this step, if it's on screen (a hidden sidebar or page means a centered card instead).
  function target() {
    const s = STEPS[i]; if (!s || !s.el) return null;
    let t = null; try { t = s.el(); } catch (e) {}
    if (!t) return null;
    const r = t.getBoundingClientRect();
    return r.width > 0 && r.height > 0 ? t : null;
  }

  // Put the spotlight on the target and the card next to it (below, above, right or left: wherever it fits).
  function place() {
    if (!root) return;
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      if (!root) return;
      const t = target(), vw = window.innerWidth, vh = window.innerHeight, pad = 8, gap = 14, m = 16;
      if (!t) { hole.hidden = true; root.classList.add('tour-dim'); card.classList.add('tour-center'); card.style.left = card.style.top = ''; return; }
      root.classList.remove('tour-dim'); card.classList.remove('tour-center'); hole.hidden = false;
      const r = t.getBoundingClientRect();
      const x = Math.max(4, r.left - pad), y = Math.max(4, r.top - pad);
      const w = Math.min(vw - 4, r.right + pad) - x, hh = Math.min(vh - 4, r.bottom + pad) - y;
      Object.assign(hole.style, { left: x + 'px', top: y + 'px', width: w + 'px', height: hh + 'px' });
      const cw = card.offsetWidth, ch = card.offsetHeight;
      const fits = { below: vh - (y + hh) - gap >= ch + m, above: y - gap >= ch + m, right: vw - (x + w) - gap >= cw + m, left: x - gap >= cw + m };
      let cx, cy;
      if (fits.below || fits.above) {
        cy = fits.below ? y + hh + gap : y - gap - ch;
        cx = x + w / 2 - cw / 2;
      } else if (fits.right || fits.left) {
        cx = fits.right ? x + w + gap : x - gap - cw;
        cy = y + hh / 2 - ch / 2;
      } else {   // the target fills the screen: card at the bottom, over it
        cx = vw / 2 - cw / 2; cy = vh - ch - m;
      }
      card.style.left = Math.round(Math.max(m, Math.min(vw - cw - m, cx))) + 'px';
      card.style.top = Math.round(Math.max(m, Math.min(vh - ch - m, cy))) + 'px';
    });
  }

  function onClick(e) {
    const b = e.target.closest('[data-t]'); if (!b) return;
    const a = b.dataset.t;
    if (a === 'next') show(i + 1);
    else if (a === 'back') show(i - 1);
    else if (a === 'skip') end(true);
    else if (a === 'done') end(false);
  }

  function onKey(e) {
    // Other keys pass through, so the app's own shortcuts (like Alt+M to mute) still work during the tour.
    if (e.key === 'Escape') { e.preventDefault(); end(true); return; }
    if (e.key === 'Tab') {   // keep focus inside the card
      const f = [...card.querySelectorAll('button')]; if (!f.length) return;
      const a = f[0], z = f[f.length - 1];
      if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); }
      else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
    }
  }

  // First visit: start once the app has drawn. Adding "?tour" to the address also starts it (for testing).
  function auto() {
    let seen = false; try { seen = localStorage.getItem(SEEN) === '1'; } catch (e) {}
    if (!seen || /[?&]tour\b/.test(location.search)) setTimeout(start, 500);
  }

  return { start, end, auto };
})();

TOUR.auto();
