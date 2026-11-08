// Mathena. Classic script: shares top-level names with the other js/ files. Load order is set in index.html.
// Organize & Export: PDF writer, so “Finalize” downloads a .pdf directly instead of opening the print dialog

/* A minimal PDF 1.4 file built in the browser: US Letter pages, the standard Helvetica and Courier
   fonts for the title, headings, text and LaTeX lines, and each equation as a JPEG rendered from
   MathJax's SVG at 3x. Same layout as the live preview. */
const PDF_W = 612, PDF_H = 792, PDF_M = 72;   // points; 1 inch margins
function eqJpeg(latex) {
  const r = plainSvg(latex, true); if (!r) return Promise.resolve(null);
  return new Promise((res) => {
    const s = 3, { box } = r, url = URL.createObjectURL(svgBlob(r)), img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas'); c.width = Math.ceil(box.width * s); c.height = Math.ceil(box.height * s);
      const ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height); ctx.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      const k = 15 / (parseFloat(getComputedStyle(stage.querySelector('mjx-container') || stage).fontSize) || 16);   // size math like 15pt text, whatever the on-screen zoom
      c.toBlob(async (b) => res(b ? { data: new Uint8Array(await b.arrayBuffer()), pw: c.width, ph: c.height, w: box.width * k, h: box.height * k } : null), 'image/jpeg', 0.92);
    };
    img.onerror = () => { URL.revokeObjectURL(url); res(null); }; img.src = url;
  });
}
/* Text width in points, measured with Arial (metric-compatible with Helvetica) */
const pdfCtx = document.createElement('canvas').getContext('2d');
function tw(text, size, bold, mono) { if (mono) return text.length * size * 0.6; pdfCtx.font = (bold ? 'bold ' : '') + size + 'px Helvetica, Arial, sans-serif'; return pdfCtx.measureText(text).width; }
function wrapText(text, size, maxW, bold, mono) {
  const lines = []; let line = '';
  for (const word of String(text).split(/\s+/)) {
    const t = line ? line + ' ' + word : word;
    if (tw(t, size, bold, mono) <= maxW || !line) line = t; else { lines.push(line); line = word; }
    while (mono && tw(line, size, bold, mono) > maxW) { const k = Math.floor(maxW / (size * 0.6)); lines.push(line.slice(0, k)); line = line.slice(k); }   // break long LaTeX
  }
  if (line) lines.push(line);
  return lines;
}
/* PDF string in WinAnsi: escape \ ( ), map curly quotes and dashes, drop what the standard fonts can't show */
function pstr(t) {
  const map = { '‘': "'", '’': "'", '“': '"', '”': '"', '–': '-', '—': '-', '…': '...', '•': '*' };
  return '(' + String(t).replace(/[‘’“”–—…•]/g, (c) => map[c]).replace(/[^\x20-\x7e\xa0-\xff]/g, '?').replace(/[\\()]/g, '\\$&') + ')';
}
async function buildPdf(title) {
  if (!mjReady()) { setStatus('The math renderer isn\'t loaded, so the PDF can\'t include equations.', 'err'); return null; }
  setStatus('Building the PDF…');
  const num = $('numbering').checked, tex = $('showLatex').checked, W = PDF_W - PDF_M * 2;
  const pages = [], images = [];
  let ops = [], y = PDF_H - PDF_M;
  const newPage = () => { if (ops.length) pages.push(ops.join('\n')); ops = []; y = PDF_H - PDF_M; };
  const need = (h) => { if (y - h < PDF_M) newPage(); };
  const text = (x, yy, t, font, size, gray) => ops.push('BT ' + (gray != null ? gray + ' g ' : '0 g ') + '/' + font + ' ' + size + ' Tf ' + x.toFixed(2) + ' ' + yy.toFixed(2) + ' Td ' + pstr(t) + ' Tj ET');
  const rule = (x1, x2, yy, w, gray) => ops.push((gray || 0) + ' G ' + w + ' w ' + x1.toFixed(2) + ' ' + yy.toFixed(2) + ' m ' + x2.toFixed(2) + ' ' + yy.toFixed(2) + ' l S');

  if (title) {
    for (const l of wrapText(title, 20, W, true)) { need(26); y -= 20; text(PDF_W / 2 - tw(l, 20, true) / 2, y, l, 'F2', 20); y -= 6; }
    y -= 6; rule(PDF_W / 2 - 24, PDF_W / 2 + 24, y, 1.5); y -= 22;
  }
  let n = 0;
  for (const b of blocks) {
    if (b.t === 'heading') {
      const lines = wrapText(b.text, 15, W, true); need(lines.length * 19 + 16); y -= 8;
      for (const l of lines) { y -= 15; text(PDF_M, y, l, 'F2', 15); y -= 4; }
      y -= 2; rule(PDF_M, PDF_W - PDF_M, y, 0.5, 0.8); y -= 10;
    } else if (b.t === 'text') {
      const lines = wrapText(b.text, 12, W); need(Math.min(lines.length, 3) * 16);
      for (const l of lines) { need(16); y -= 12; text(PDF_M, y, l, 'F1', 12); y -= 4; }
      y -= 6;
    } else {
      n++; const im = await eqJpeg(b.latex); if (!im) continue;
      const x0 = PDF_M + (num ? 28 : 0), maxW = W - (num ? 28 : 0);
      let w = im.w, h = im.h; if (w > maxW) { h *= maxW / w; w = maxW; }
      const texLines = tex ? wrapText(b.latex, 9, maxW, false, true) : [];
      need(h + 10 + texLines.length * 11);
      y -= 5; const id = images.push(im);
      ops.push('q ' + w.toFixed(2) + ' 0 0 ' + h.toFixed(2) + ' ' + x0.toFixed(2) + ' ' + (y - h).toFixed(2) + ' cm /Im' + id + ' Do Q');
      if (num) text(PDF_M, y - h / 2 - 4, n + '.', 'F2', 12);
      y -= h + 3;
      for (const l of texLines) { y -= 9; text(x0, y, l, 'F3', 9, 0.33); y -= 2; }
      y -= 7;
    }
  }
  if (ops.length || !pages.length) newPage();

  /* Assemble objects: 1 catalog, 2 pages, 3-5 fonts, then images, then a page + content stream per page */
  const enc = new TextEncoder(), parts = [], offsets = []; let len = 0;
  const push = (u) => { const b = typeof u === 'string' ? enc.encode(u) : u; parts.push(b); len += b.length; };
  const obj = (id, body) => { offsets[id] = len; push(id + ' 0 obj\n'); (Array.isArray(body) ? body : [body]).forEach(push); push('\nendobj\n'); };
  push('%PDF-1.4\n'); push(new Uint8Array([0x25, 0xE2, 0xE3, 0xCF, 0xD3, 0x0A]));   // binary marker line
  const imgBase = 6, pageBase = imgBase + images.length, kids = pages.map((_, i) => (pageBase + i * 2) + ' 0 R').join(' ');
  obj(1, '<< /Type /Catalog /Pages 2 0 R >>');
  obj(2, '<< /Type /Pages /Kids [' + kids + '] /Count ' + pages.length + ' >>');
  obj(3, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
  obj(4, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
  obj(5, '<< /Type /Font /Subtype /Type1 /BaseFont /Courier /Encoding /WinAnsiEncoding >>');
  images.forEach((im, i) => obj(imgBase + i, ['<< /Type /XObject /Subtype /Image /Width ' + im.pw + ' /Height ' + im.ph + ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ' + im.data.length + ' >>\nstream\n', im.data, '\nendstream']));
  const xo = images.length ? ' /XObject << ' + images.map((_, i) => '/Im' + (i + 1) + ' ' + (imgBase + i) + ' 0 R').join(' ') + ' >>' : '';
  pages.forEach((content, i) => {
    const pid = pageBase + i * 2, cid = pid + 1, data = enc.encode(content);
    obj(pid, '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + PDF_W + ' ' + PDF_H + '] /Resources << /Font << /F1 3 0 R /F2 4 0 R /F3 5 0 R >>' + xo + ' >> /Contents ' + cid + ' 0 R >>');
    obj(cid, ['<< /Length ' + data.length + ' >>\nstream\n', data, '\nendstream']);
  });
  const count = pageBase + pages.length * 2, xref = len;
  push('xref\n0 ' + count + '\n0000000000 65535 f \n' + offsets.slice(1, count).map((o) => String(o).padStart(10, '0') + ' 00000 n \n').join(''));
  push('trailer\n<< /Size ' + count + ' /Root 1 0 R /Info << /Title ' + pstr(title || 'Mathena') + ' /Producer (Mathena) >> >>\nstartxref\n' + xref + '\n%%EOF\n');
  return new Blob(parts, { type: 'application/pdf' });
}
