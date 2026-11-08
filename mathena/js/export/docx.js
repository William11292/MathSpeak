// Speak Math. Classic script: shares top-level names with the other js/ files. Load order is set in index.html.
// Organize & Export: Word (.docx) writer

/* Word export: a minimal .docx (stored ZIP) with each equation as a PNG whose alt text is its MathSpeak */
const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc32 = (u) => { let c = 0xFFFFFFFF; for (let i = 0; i < u.length; i++) c = CRC[(c ^ u[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
function zipStore(files) {
  const enc = new TextEncoder(), parts = [], central = []; let off = 0;
  const u16 = (v) => [v & 255, (v >>> 8) & 255], u32 = (v) => [v & 255, (v >>> 8) & 255, (v >>> 16) & 255, (v >>> 24) & 255];
  for (const f of files) {
    const name = enc.encode(f.name), data = typeof f.data === 'string' ? enc.encode(f.data) : f.data, crc = crc32(data);
    const head = [...u32(0x04034b50), ...u16(20), ...u16(0), ...u16(0), ...u16(0), ...u16(0x21), ...u32(crc), ...u32(data.length), ...u32(data.length), ...u16(name.length), ...u16(0)];
    parts.push(new Uint8Array(head), name, data);
    central.push(new Uint8Array([...u32(0x02014b50), ...u16(20), ...u16(20), ...u16(0), ...u16(0), ...u16(0), ...u16(0x21), ...u32(crc), ...u32(data.length), ...u32(data.length), ...u16(name.length), ...u16(0), ...u16(0), ...u16(0), ...u16(0), ...u32(0), ...u32(off)]), name);
    off += head.length + name.length + data.length;
  }
  const cdSize = central.reduce((a, b) => a + b.length, 0);
  const end = new Uint8Array([...u32(0x06054b50), ...u16(0), ...u16(0), ...u16(files.length), ...u16(files.length), ...u32(cdSize), ...u32(off), ...u16(0)]);
  return new Blob([...parts, ...central, end], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
}
const xesc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
async function buildDocx(title) {
  if (!mjReady()) { setStatus('The math renderer isn\'t loaded, so the Word file can\'t include equations.', 'err'); return null; }
  setStatus('Building the Word file…');
  const num = $('numbering').checked, tex = $('showLatex').checked, media = [], P = [];
  const run = (t, rpr) => '<w:r>' + (rpr ? '<w:rPr>' + rpr + '</w:rPr>' : '') + '<w:t xml:space="preserve">' + xesc(t) + '</w:t></w:r>';
  if (title) P.push('<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:after="240"/></w:pPr>' + run(title, '<w:b/><w:sz w:val="40"/>') + '</w:p>');
  let n = 0;
  for (const b of blocks) {
    if (b.t === 'heading') P.push('<w:p><w:pPr><w:spacing w:before="240" w:after="120"/></w:pPr>' + run(b.text, '<w:b/><w:sz w:val="30"/>') + '</w:p>');
    else if (b.t === 'text') P.push('<w:p>' + run(b.text, '<w:sz w:val="24"/>') + '</w:p>');
    else {
      n++; const r = plainSvg(b.latex, true); if (!r) continue;
      const png = await pngBlob(r, true); if (!png) continue;
      const id = media.length + 1; media.push(new Uint8Array(await png.arrayBuffer()));
      let w = r.box.width * 0.75, h = r.box.height * 0.75; const maxW = 430; if (w > maxW) { h *= maxW / w; w = maxW; }   // points-ish at 96 dpi
      const cx = Math.round(w * 12700), cy = Math.round(h * 12700), alt = xesc(b.ms || b.latex);
      const pic = '<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="' + cx + '" cy="' + cy + '"/><wp:docPr id="' + id + '" name="Equation ' + n + '" descr="' + alt + '"/>' +
        '<a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="' + id + '" name="equation' + n + '.png" descr="' + alt + '"/><pic:cNvPicPr/></pic:nvPicPr>' +
        '<pic:blipFill><a:blip r:embed="rIdImg' + id + '"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="' + cx + '" cy="' + cy + '"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>';
      const raise = Math.max(0, Math.round(h - 12));   // half-points: lift the number to the image's middle
      P.push('<w:p><w:pPr><w:spacing w:before="80" w:after="' + (tex ? 0 : 80) + '"/></w:pPr>' + (num ? run(n + '.\t', '<w:b/><w:sz w:val="24"/><w:position w:val="' + raise + '"/>') : '') + pic + '</w:p>');
      if (tex) P.push('<w:p><w:pPr><w:spacing w:before="0" w:after="120"/>' + (num ? '<w:ind w:left="720"/>' : '') + '</w:pPr>' + run(b.latex, '<w:rFonts w:ascii="Consolas" w:hAnsi="Consolas"/><w:color w:val="555555"/><w:sz w:val="18"/>') + '</w:p>');
    }
  }
  const NS = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"';
  const X = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
  const files = [
    { name: '[Content_Types].xml', data: X + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>' },
    { name: '_rels/.rels', data: X + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>' },
    { name: 'word/document.xml', data: X + '<w:document ' + NS + '><w:body>' + P.join('') + '<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/></w:sectPr></w:body></w:document>' },
    { name: 'word/_rels/document.xml.rels', data: X + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' + media.map((_, i) => '<Relationship Id="rIdImg' + (i + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/image' + (i + 1) + '.png"/>').join('') + '</Relationships>' },
    ...media.map((d, i) => ({ name: 'word/media/image' + (i + 1) + '.png', data: d })),
  ];
  return zipStore(files);
}
async function copyText(text, label, fallbackEl) {
  try { await navigator.clipboard.writeText(text); setStatus(label + ' copied.', 'ok'); }
  catch (e) {
    if (fallbackEl && fallbackEl.select) { fallbackEl.hidden = false; fallbackEl.focus(); fallbackEl.select(); }
    setStatus('Press Ctrl+C or ⌘C to copy.');
  }
}
