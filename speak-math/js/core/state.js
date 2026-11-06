// Speak Math. Classic script: shares top-level names with the other js/ files. Load order is set in index.html.
// Shared state and small helpers used by every tab

const $ = (id) => document.getElementById(id);
const spoken = $('spoken'), latexEl = $('latex'), latexView = $('latexView'), cleanView = $('cleanView');
const stage = $('stage'), statusEl = $('status'), entriesEl = $('entries');
let current = { latex: '', source: 'typed' };
let L = null, sel = null;
const live = () => !!L;
const wsInput = $('wsInput'), msgsEl = $('msgs');
let sample = null, downloads = null, logCol = null, localLog = [];
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const setStatus = (msg, kind) => { statusEl.textContent = msg || ''; statusEl.className = 'status' + (kind ? ' ' + kind : ''); };
const mjReady = () => !!(window.MathJax && MathJax.tex2svg);


function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
