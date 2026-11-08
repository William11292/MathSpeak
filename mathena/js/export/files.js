// Speak Math. Classic script: shares top-level names with the other js/ files. Load order is set in index.html.
// Export: SVG/PNG building, file download, copy

/* ---------- Export and copy ---------- */
function plainSvg(latex, print) {
  if (!mjReady() || !latex || !latex.trim()) return null;
  const holder = document.createElement('div');
  holder.style.cssText = 'position:absolute;left:-9999px;top:0;font-size:' + getComputedStyle(stage.querySelector('mjx-container') || stage).fontSize;
  document.body.appendChild(holder);
  const node = MathJax.tex2svg(latex, { display: true });
  holder.appendChild(node);
  const svg = node.querySelector('svg'); const box = svg.getBoundingClientRect();
  const clone = svg.cloneNode(true);
  holder.remove();
  const color = print ? '#151515' : getComputedStyle(stage).color;
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.innerHTML = clone.innerHTML.replace(/currentColor/g, color);
  clone.setAttribute('width', box.width); clone.setAttribute('height', box.height);
  return { clone, box };
}
async function saveFile(filename, blob, quiet) {
  if (!downloads) {
    if (window.claude) { setStatus('Saving files isn\'t available in this view. Copy the LaTeX instead.', 'err'); return false; }
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000); if (!quiet) setStatus('Saved ' + filename + '.', 'ok'); return true;
  }
  try { await downloads.save({ filename, data: blob }); if (!quiet) setStatus('Saved ' + filename + '.', 'ok'); return true; }
  catch (e) { if (e && e.code !== 'declined' && e.code !== 'cancelled') setStatus('Couldn\'t save: ' + (e.message || e.code), 'err'); return false; }
}
const svgBlob = (r) => new Blob([new XMLSerializer().serializeToString(r.clone)], { type: 'image/svg+xml' });
function pngBlob(r, print) {
  return new Promise((res) => {
    const scale = 4, pad = 24, { box } = r, url = URL.createObjectURL(svgBlob(r)), img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas'); c.width = (box.width + pad * 2) * scale; c.height = (box.height + pad * 2) * scale;
      const ctx = c.getContext('2d'); ctx.fillStyle = print ? '#ffffff' : (getComputedStyle(stage).backgroundColor || '#fff'); ctx.fillRect(0, 0, c.width, c.height);
      ctx.drawImage(img, pad * scale, pad * scale, box.width * scale, box.height * scale); URL.revokeObjectURL(url);
      c.toBlob((b) => res(b), 'image/png');
    };
    img.onerror = () => res(null); img.src = url;
  });
}
