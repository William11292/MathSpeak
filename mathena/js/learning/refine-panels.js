// Speak Math. Classic script: shares top-level names with the other js/ files. Load order is set in index.html.
// Learning Zone: the "Change an element" and "Refine with AI" panels under the example.
// Part 1 shows the voice flow from the Learning Zone wireframe; the panels become interactive in Part 2.
// render(host, { draft, layers }) is called by learning-zone.js every time the example changes.

const LZ_REFINE = (() => {
  const h = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const claudeReady = () => { try { return !!sample; } catch (e) { return false; } };   // `sample` is set in state.js / main.js
  const cmd = (t) => '<span class="lz-cmd">“' + t + '”</span>';

  function partsHTML(layers) {
    if (!layers) return '';
    const kids = layers.nav(layers.root), parts = kids.length ? kids : [layers.root];
    return '<p class="lz-parts"><span class="lz-hint">Main parts of this equation:</span> ' + parts.map((n) =>
      '<span class="lz-part" title="' + h(layers.tex(n).replace(/\s+/g, ' ').trim()) + '">' + h(layers.label(n)) + '</span>').join(' ') + '</p>';
  }

  function changeHTML(ctx) {
    return '<section class="lz-box" aria-labelledby="lz-chg-h" data-tour="lz-change">' +
      '<div class="lz-box-hrow"><h4 id="lz-chg-h" class="lz-box-h">Change an element</h4><span class="lz-tag">Coming soon</span></div>' +
      // Wording matches the Math Workspace commands (js/workspace/voice.js and commands.js).
      '<p class="lz-hint">An equation is made of parts inside parts. For example, a fraction holds a top and a bottom. Move to the part you want, then change it.</p>' +
      '<ol class="lz-flowlist">' +
        '<li><b>Move to the part.</b> The whole equation is highlighted first. ' +
          cmd('In a layer') + ' goes inside the highlighted part. ' + cmd('Next') + ' and ' + cmd('Previous') + ' move right and left. ' +
          cmd('Out a layer') + ' goes back to the bigger part around it. Arrow keys work too.</li>' +
        '<li><b>Choose it.</b> ' + cmd('Select that') + ' picks the highlighted part and reads it back to you.</li>' +
        '<li><b>Change it.</b> ' + cmd('Delete') + ' removes it. Or say ' + cmd('Say a change') + ', describe the new version, like “make it 3”, then say ' + cmd('Done') + '. Describing a change uses Claude.</li>' +
        '<li><b>Prefer typing?</b> ' + cmd('Refine manually') + ' opens the LaTeX so you can edit it by hand. Say ' + cmd('Done') + ' when finished.</li>' +
      '</ol>' + partsHTML(ctx.layers) + '</section>';
  }

  function aiHTML() {
    return '<section class="lz-box" aria-labelledby="lz-ai-h" data-tour="lz-ai">' +
      '<div class="lz-box-hrow"><h4 id="lz-ai-h" class="lz-box-h">Refine with AI</h4><span class="lz-tag">Coming soon</span></div>' +
      '<ol class="lz-flowlist">' +
        '<li>' + cmd('Refine with AI') + ' shows labeled options for changing your equation.</li>' +
        '<li>Say a label to choose it; ' + cmd('Done') + ' confirms the change.</li>' +
        '<li>' + cmd('Refine manually') + ' lets you change one part yourself.</li>' +
      '</ol>' +
      '<p class="lz-hint">Or describe it: “make the exponent 3”, “replace x with t”.</p>' +
      '<p class="lz-hint">' + (claudeReady() ? 'Claude is connected.' : 'Needs Claude: add your API key under AI conversion in the sidebar (not needed inside Claude).') + '</p>' +
      '</section>';
  }

  function render(host, ctx) {
    if (!host) return;
    host.innerHTML = changeHTML(ctx) + aiHTML();
  }
  return { render };
})();
