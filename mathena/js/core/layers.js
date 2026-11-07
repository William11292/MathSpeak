// Speak Math. Classic script: shares top-level names with the other js/ files. Load order is set in index.html.
// Layer engine: LaTeX to tree to tagged LaTeX / spoken MathSpeak

/* ---------- Layer engine: LaTeX → tree → tagged LaTeX / LaTeX spans / spoken spans ---------- */
const Layers = (() => {
  const RAW = new Set(['\\text', '\\textrm', '\\mbox', '\\operatorname', '\\textbf', '\\mathrm']);
  const FN = { sin:'sine', cos:'cosine', tan:'tangent', sec:'secant', csc:'cosecant', cot:'cotangent', sinh:'hyperbolic sine', cosh:'hyperbolic cosine', tanh:'hyperbolic tangent', arcsin:'arcsine', arccos:'arccosine', arctan:'arctangent', log:'log', ln:'natural log', exp:'exp', max:'max', min:'min', det:'the determinant', arg:'arg', sup:'supremum', inf:'infimum', gcd:'gcd', dim:'dimension', ker:'kernel', deg:'degree', Pr:'probability' };
  const BIG = { int:'integral', iint:'double integral', iiint:'triple integral', oint:'contour integral', sum:'sum', prod:'product', lim:'limit', bigcup:'union', bigcap:'intersection' };
  const OPS = { '+':'plus', '-':'minus', '=':'equals', '<':'is less than', '>':'is greater than', ',':',', ';':';', '!':'factorial', "'":'prime', '/':'over', '|':'bar', ':':'colon', '.':'point',
    '\\cdot':'times', '\\times':'times', '\\div':'divided by', '\\pm':'plus or minus', '\\mp':'minus or plus', '\\le':'is less than or equal to', '\\leq':'is less than or equal to',
    '\\ge':'is greater than or equal to', '\\geq':'is greater than or equal to', '\\ne':'is not equal to', '\\neq':'is not equal to', '\\approx':'is approximately', '\\equiv':'is equivalent to',
    '\\to':'goes to', '\\rightarrow':'goes to', '\\leftarrow':'gets', '\\gets':'gets', '\\mapsto':'maps to', '\\Rightarrow':'implies', '\\iff':'if and only if', '\\in':'in', '\\notin':'not in',
    '\\sim':'is distributed as', '\\mid':'given', '\\ldots':'dot dot dot', '\\cdots':'dot dot dot', '\\dots':'dot dot dot', '\\propto':'is proportional to', '\\subset':'is a subset of',
    '\\subseteq':'is a subset of', '\\cup':'union', '\\cap':'intersect', '\\forall':'for all', '\\exists':'there exists', '\\circ':'composed with', '\\otimes':'tensor', '\\ast':'star', '\\star':'star',
    '\\prime':'prime', '\\top':'transpose', '\\perp':'is perpendicular to', '\\parallel':'is parallel to', '\\vert':'bar', '\\lvert':'bar', '\\rvert':'bar',
    '\\,':'', '\\;':'', '\\:':'', '\\!':'', '\\ ':'', '\\quad':'', '\\qquad':'', '\\\\':'', '&':'' };
  const SYM = { infty:'infinity', partial:'partial', nabla:'nabla', ell:'ell', emptyset:'the empty set', varnothing:'the empty set', varepsilon:'epsilon', epsilon:'epsilon', varphi:'phi', vartheta:'theta', hbar:'h bar', Re:'real part', Im:'imaginary part', aleph:'aleph' };
  const ACC = { mathbf:'bold', boldsymbol:'bold', bm:'bold', hat:'hat', widehat:'hat', bar:'bar', overline:'bar', vec:'vector', tilde:'tilde', widetilde:'tilde', dot:'dot', ddot:'double dot', mathcal:'script', mathbb:'', mathit:'', mathsf:'', underline:'underline' };
  const IGNORE = new Set(['displaystyle', 'textstyle', 'limits', 'nolimits', 'big', 'Big', 'bigg', 'Bigg', 'bigl', 'bigr', 'Bigl', 'Bigr', 'biggl', 'biggr', 'left.', 'middle']);
  const SEP = new Set([',', ';', '\\quad', '\\qquad']);
  const REL = new Set(['=', '<', '>', '\\le', '\\leq', '\\ge', '\\geq', '\\ne', '\\neq', '\\approx', '\\equiv', '\\Rightarrow', '\\iff', '\\mapsto', '\\gets', '\\leftarrow', '\\rightarrow', '\\sim', '\\propto', '\\in', '\\notin', '\\subset', '\\subseteq', '\\to', '\\perp', '\\parallel']);
  const ADD = new Set(['+', '-', '\\pm', '\\mp']);
  const FUNCVARS = new Set(['f', 'g', 'h', 'F', 'G', 'H', 'P', 'L', 'J', 'K', 'E', 'N', 'p', 'q', 'r', '\\sigma', '\\phi', '\\varphi', '\\psi', '\\ell']);
  const ORD = { 1:'first', 2:'second', 3:'third', 4:'fourth', 5:'fifth', 6:'sixth', 7:'seventh', 8:'eighth', 9:'ninth', 10:'tenth' };
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  function tokenize(s) {
    const t = []; let i = 0;
    while (i < s.length) {
      const c = s[i];
      if (/\s/.test(c)) { i++; continue; }
      if (c === '%') { while (i < s.length && s[i] !== '\n') i++; continue; }
      if (c === '\\') {
        const m = s.slice(i).match(/^\\([a-zA-Z]+|.)/);
        if (!m) { i++; continue; }
        const tok = '\\' + m[1]; i += m[0].length; t.push(tok);
        if (RAW.has(tok)) {
          while (/\s/.test(s[i] || '')) i++;
          if (s[i] === '{') { let d = 1, j = i + 1; while (j < s.length && d) { if (s[j] === '{') d++; else if (s[j] === '}') d--; j++; } t.push('\u0000' + s.slice(i + 1, j - 1)); i = j; }
        }
        continue;
      }
      if (/[0-9]/.test(c)) { const m = s.slice(i).match(/^\d+(\.\d+)?/); t.push(m[0]); i += m[0].length; continue; }
      t.push(c); i++;
    }
    return t;
  }

  function parse(src) {
    const T = tokenize(src); let p = 0, nid = 0;
    const mk = (o) => { o.id = nid++; return o; };
    const atom = (k, tex, sp, extra) => mk(Object.assign({ t: 'atom', k, tex, sp }, extra || {}));
    const isOp = (it, set) => it && it.t === 'atom' && it.k === 'op' && set.has(it.tex);

    function readName() {
      if (T[p] !== '{') return '';
      p++; let s = ''; while (p < T.length && T[p] !== '}') s += T[p++]; p++; return s;
    }
    function parseArg() {
      if (T[p] === '{') { p++; const r = parseRow((t) => t === '}'); if (T[p] === '}') p++; return r; }
      if (p >= T.length) return atom('empty', '', '');
      const a = parseAtom(); return a || atom('empty', '', '');
    }
    function postfix(a) {
      while (T[p] === '^' || T[p] === '_') {
        const k = T[p++] === '^' ? 'sup' : 'sub';
        const arg = parseArg();
        if (a.t !== 'script' || a[k]) a = mk({ t: 'script', base: a });
        a[k] = arg;
      }
      return a;
    }
    function parseRow(stop) {
      const items = [];
      while (p < T.length && !stop(T[p]) && T[p] !== '}') {
        let a = parseAtom();
        if (!a) continue;
        items.push(postfix(a));
      }
      return group(items);
    }
    function parseAtom() {
      const tok = T[p++];
      if (tok === '{') { const r = parseRow((t) => t === '}'); if (T[p] === '}') p++; if (r.t === 'row') r.braced = true; return r; }
      if (tok === '^' || tok === '_') { p--; return atom('empty', '', ''); }
      if (tok[0] === '\u0000') return atom('text', tok.slice(1), tok.slice(1));
      if (/^\d/.test(tok)) return atom('num', tok, tok);
      if (/^[a-zA-Z]$/.test(tok)) return atom('var', tok, tok);
      if (tok === '(' || tok === '[') {
        const close = tok === '(' ? ')' : ']';
        const body = parseRow((t) => t === close);
        let c = null; if (T[p] === close) { p++; c = close; }
        return mk({ t: 'fence', open: tok, close: c, body });
      }
      if (tok[0] === '\\' && tok.length > 1) {
        const name = tok.slice(1);
        const PAIR = { lVert:'\\rVert', Vert:'\\Vert', lvert:'\\rvert', langle:'\\rangle', lfloor:'\\rfloor', lceil:'\\rceil' };
        if (PAIR[name] && !(name === 'Vert' && T[p - 2] === '\\right')) { const cl = PAIR[name]; const body = parseRow((t) => t === cl); let c = null; if (T[p] === cl) { p++; c = cl; } return mk({ t: 'fence', open: tok, close: c, body }); }
        if (name === '{') { const body = parseRow((t) => t === '\\}'); let c = null; if (T[p] === '\\}') { p++; c = '\\}'; } return mk({ t: 'fence', open: '\\{', close: c, body }); }
        if (name === 'frac' || name === 'dfrac' || name === 'tfrac') { const num = parseArg(), den = parseArg(); return mk({ t: 'frac', cmd: tok, num, den }); }
        if (name === 'sqrt') { let idx = null; if (T[p] === '[') { p++; idx = parseRow((t) => t === ']'); if (T[p] === ']') p++; } return mk({ t: 'sqrt', idx, body: parseArg() }); }
        if (name === 'left') {
          let open = T[p++]; if (open === '\\') open = '\\' + T[p++];
          const body = parseRow((t) => t === '\\right'); p++;
          let close = T[p++] || '.';
          return mk({ t: 'fence', open, close, body, lr: true });
        }
        if (name === 'right') { p++; return null; }
        if (name === 'begin') {
          const env = readName(); const rows = []; let cells = [];
          let colspec = '';
          if (env === 'array' && T[p] === '{') colspec = readName();
          while (p < T.length) {
            const cell = parseRow((t) => t === '&' || t === '\\\\' || t === '\\end');
            cells.push(cell);
            const s = T[p++];
            if (s === '&') continue;
            rows.push(mk({ t: 'mrow', cells })); cells = [];
            if (s === '\\end' || s === undefined) { readName(); break; }
          }
          const last = rows[rows.length - 1];
          if (last && last.cells.length === 1 && last.cells[0].t === 'atom' && last.cells[0].k === 'empty' && rows.length > 1) rows.pop();
          return mk({ t: 'matrix', env, rows, colspec });
        }
        if (Object.prototype.hasOwnProperty.call(ACC, name)) return mk({ t: 'acc', cmd: tok, name, body: parseArg() });
        if (RAW.has(tok)) {
          const raw = (T[p] || '')[0] === '\u0000' ? T[p++].slice(1) : '';
          if (name === 'operatorname') return atom('fn', tok + '{' + raw + '}', raw, { name: raw });
          return atom('text', tok + '{' + raw + '}', raw);
        }
        if (BIG[name]) return atom('big', tok, BIG[name], { name });
        if (FN[name]) return atom('fn', tok, FN[name], { name });
        if (Object.prototype.hasOwnProperty.call(OPS, tok)) return atom('op', tok, OPS[tok]);
        if (IGNORE.has(name)) return null;
        const cap = /^[A-Z][a-z]+$/.test(name) && name !== 'Re' && name !== 'Im';
        return atom('sym', tok, SYM[name] || (name === 'Delta' ? 'delta' : cap ? 'capital ' + name.toLowerCase() : name.replace(/^var/, '')));
      }
      return atom('op', tok, Object.prototype.hasOwnProperty.call(OPS, tok) ? OPS[tok] : tok);
    }

    function joinDiffs(items) {
      const out = [];
      for (let i = 0; i < items.length; i++) {
        const a = items[i], b = items[i + 1];
        const isD = a && a.t === 'atom' && a.k === 'var' && a.tex === 'd' || (a && a.t === 'atom' && a.k === 'sym' && a.tex === '\\partial');
        if (isD && b && (b.t === 'atom' && (b.k === 'var' || b.k === 'sym') || b.t === 'script' && b.base.t === 'atom' && b.base.k === 'var')) {
          out.push(mk({ t: 'row', kids: [a, b], label: 'Differential' })); i++;
        } else out.push(a);
      }
      return out;
    }
    function group(items) { return level(joinDiffs(items.filter(Boolean)), 0); }
    const LEVELS = [[SEP, 'List'], [REL, null], [ADD, 'Sum']];
    function level(items, L) {
      if (items.length === 0) return atom('empty', '', '');
      if (items.length === 1) return items[0];
      if (L >= LEVELS.length) return term(items);
      const [set, lab] = LEVELS[L];
      if (!items.some((it) => isOp(it, set))) return level(items, L + 1);
      const kids = []; let seg = [];
      const flush = () => { if (seg.length) kids.push(level(seg, L + 1)); seg = []; };
      for (const it of items) { if (isOp(it, set)) { flush(); kids.push(it); } else seg.push(it); }
      flush();
      if (kids.length === 1) return kids[0];
      return mk({ t: 'row', kids, label: lab || (items.some((it) => it.tex === '=') ? 'Equation' : 'Relation') });
    }
    const bigOf = (n) => n.t === 'atom' && n.k === 'big' ? n.name : n.t === 'script' && n.base.t === 'atom' && n.base.k === 'big' ? n.base.name : null;
    const BODY = { int:'Integrand', iint:'Integrand', iiint:'Integrand', oint:'Integrand', sum:'Summand', prod:'Factor', lim:'Inside the limit' };
    const WHOLE = { int:'Integral', iint:'Integral', iiint:'Integral', oint:'Integral', sum:'Summation', prod:'Product of terms', lim:'Limit' };
    function term(items) {
      const bi = items.findIndex((it) => bigOf(it));
      if (bi > -1 && bi < items.length - 1) {
        const name = bigOf(items[bi]);
        const rest = items.slice(bi + 1);
        let body = rest.length === 1 ? rest[0] : term(rest);
        if (rest.length > 1 && body.t === 'row' && body.label === 'Product') body.label = BODY[name] || 'Body';
        const node = mk({ t: 'row', kids: [items[bi], body], label: WHOLE[name] || 'Operator' });
        if (bi === 0) return node;
        return mk({ t: 'row', kids: [...items.slice(0, bi), node], label: 'Product' });
      }
      return mk({ t: 'row', kids: items, label: 'Product' });
    }

    const root = parseRow(() => false);
    return root;
  }

  function kids(n) {
    if (!n) return [];
    switch (n.t) {
      case 'row': return n.kids;
      case 'script': return [n.base, n.sub, n.sup].filter(Boolean);
      case 'frac': return [n.num, n.den];
      case 'sqrt': return [n.idx, n.body].filter(Boolean);
      case 'fence': return [n.body];
      case 'matrix': return n.rows;
      case 'mrow': return n.cells;
      case 'acc': return [n.body];
      default: return [];
    }
  }
  const isLeafOp = (n) => n.t === 'atom' && (n.k === 'op' || n.k === 'empty');

  /* LaTeX emitter. mode: 'plain' | 'tag' (\class wrappers for MathJax) | 'html' (nested spans) */
  function tex(n, m = 'plain') {
    const E = m === 'html' ? esc : (s) => s;
    const wrap = (s) => m === 'tag' ? '\\class{mx-' + n.id + '}{' + s + '}' : m === 'html' ? '<span class="nd" data-n="' + n.id + '">' + s + '</span>' : s;
    switch (n.t) {
      case 'atom':
        if (n.k === 'empty') return m === 'html' ? '' : '{}';
        if (n.k === 'op' || n.k === 'big') return E(n.tex);
        if (n.k === 'text') return wrap(E(n.tex.startsWith('\\') ? n.tex : '\\text{' + n.tex + '}'));
        return wrap(E(n.tex));
      case 'row': { const s = n.kids.map((k) => tex(k, m)).join(' '); return m === 'plain' ? (n.braced ? '{' + s + '}' : s) : wrap(s); }
      case 'script': {
        let b = tex(n.base, m);
        if (n.base.t === 'row' && m !== 'tag') b = '{' + b + '}';
        let s = b;
        if (n.sub) s += '_{' + tex(n.sub, m) + '}';
        if (n.sup) s += '^{' + tex(n.sup, m) + '}';
        return wrap(s);
      }
      case 'frac': return wrap(n.cmd + '{' + tex(n.num, m) + '}{' + tex(n.den, m) + '}');
      case 'sqrt': return wrap('\\sqrt' + (n.idx ? '[' + tex(n.idx, m) + ']' : '') + '{' + tex(n.body, m) + '}');
      case 'fence': return wrap(n.lr ? '\\left' + E(n.open) + ' ' + tex(n.body, m) + ' \\right' + E(n.close) : E(n.open) + ' ' + tex(n.body, m) + (n.close ? ' ' + E(n.close) : ''));
      case 'matrix': {
        const rows = n.rows.map((r) => {
          const s = r.cells.map((c) => tex(c, m)).join(E(' & '));
          return m === 'html' ? '<span class="nd" data-n="' + r.id + '">' + s + '</span>' : s;
        }).join(' \\\\ ');
        return wrap('\\begin{' + n.env + '}' + (n.colspec ? '{' + n.colspec + '}' : '') + ' ' + rows + ' \\end{' + n.env + '}');
      }
      case 'acc': return wrap(n.cmd + '{' + tex(n.body, m) + '}');
    }
    return '';
  }

  function simple(n) {
    if (!n) return true;
    if (n.t === 'atom') return n.k !== 'big';
    if (n.t === 'acc') return simple(n.body);
    if (n.t === 'script') return n.base.t === 'atom' && n.base.k !== 'big' && (!n.sup || n.sup.t === 'atom') && (!n.sub || n.sub.t === 'atom');
    if (n.t === 'row' && n.label === 'Differential') return true;
    if (n.t === 'row' && n.label === 'Sum' && n.kids.length === 2 && n.kids[0].tex === '-' && simple(n.kids[1])) return true;
    if (n.t === 'row' && n.label === 'Product' && n.kids.length === 2 && n.kids.every((k) => k.t === 'atom' && (k.k === 'num' || k.k === 'var' || k.k === 'sym' || k.k === 'fn'))) return true;
    return false;
  }
  const callee = (k) => k && (k.t === 'atom' && (k.k === 'fn' || FUNCVARS.has(k.tex)) || k.t === 'script' && k.base.t === 'atom' && (k.base.k === 'fn' || FUNCVARS.has(k.base.tex)) || k.t === 'acc' && callee(k.body));
  const DL = { '(':['the quantity', 'close quantity'], '[':['the bracket', 'close bracket'], '\\{':['the set', 'close set'], '|':['the absolute value of', 'end absolute value'], '\\vert':['the absolute value of', 'end absolute value'], '\\lvert':['the absolute value of', 'end absolute value'],
    '\\|':['the norm of', 'end norm'], '\\Vert':['the norm of', 'end norm'], '\\lVert':['the norm of', 'end norm'], '\\langle':['the vector', 'end vector'], '\\lfloor':['the floor of', 'end floor'], '\\lceil':['the ceiling of', 'end ceiling'], '.':['', ''] };

  const CUE = /(close quantity|end root|end exponent|end sub|end norm|end absolute value|close bracket|close set|end vector|end floor|end ceiling)$/;
  const plain = (h) => h.replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
  /* Spoken emitter: nested spans, one per node */
  function speak(n) {
    const W = (node, s) => '<span class="nd" data-n="' + node.id + '">' + s + '</span>';
    const join = (arr) => arr.filter((x) => x && x.replace(/<[^>]+>/g, '').trim()).join(' ');
    switch (n.t) {
      case 'atom':
        if (n.k === 'op' || n.k === 'empty') return esc(n.sp);
        if (n.k === 'big') return W(n, 'the ' + esc(n.sp) + ' of');
        return W(n, esc(n.sp));
      case 'row': {
        const K = n.kids, out = [];
        const isBold = (k) => k && k.t === 'acc' && ACC[k.name] === 'bold';
        const numLike = (k) => k && (k.t === 'atom' && k.k === 'num' || k.t === 'fence' && k.open === '(' && simple(k.body));
        const bigRow = (k) => k && k.t === 'row' && /^(Integral|Summation|Limit|Product of terms)$/.test(k.label);
        K.forEach((k, i) => {
          let prev = K[i - 1]; if (prev && prev.tex === "'") prev = K[i - 2];
          const next = K[i + 1];
          let piece;
          if (k.t === 'atom' && k.k === 'op') {
            if (k.tex === '-' && (i === 0 || K[i - 1].t === 'atom' && K[i - 1].k === 'op')) piece = 'negative';
            else if (k.tex === '\\cdot' && isBold(K[i - 1]) && isBold(next)) piece = 'dot';
            else if (SEP.has(k.tex) && k.tex !== ',' && k.tex !== ';') piece = ',';
            else piece = esc(k.sp);
          } else if (k.t === 'fence' && k.open === '(' && callee(prev)) piece = W(k, simple(k.body) ? 'of ' + speak(k.body) : 'of the quantity ' + speak(k.body) + ', close quantity');
          else if (k.t === 'matrix' && prev && prev.t === 'atom' && prev.k === 'fn') piece = 'of ' + speak(k);
          else piece = speak(k);
          const kIsOp = k.t === 'atom' && k.k === 'op';
          if (kIsOp && piece === '') return;
          const isOpOf = (x) => x && x.t === 'frac' && /^(d|\\partial)$/.test(tex(x.num).trim());
          if (!kIsOp && /^(Product|Integrand|Summand|Factor|Inside the limit)$/.test(n.label) && prev && i > 0 && isOpOf(prev) && !(K[i - 1].t === 'atom' && K[i - 1].k === 'op')) out.push('of');
          else if (!kIsOp && /^(Product|Integrand|Summand|Factor|Inside the limit)$/.test(n.label) && prev && i > 0 && !(K[i - 1].t === 'atom' && K[i - 1].k === 'op')) {
            const callFence = k.t === 'fence' && k.open === '(' && callee(prev);
            const after = k.t === 'matrix' && prev.t === 'atom' && prev.k === 'fn';
            if (!callFence && !after && !(k.t === 'row' && k.label === 'Differential') && (k.t === 'fence' || k.t === 'matrix' || k.t === 'script' && (k.base.t === 'fence' || k.base.t === 'matrix') || bigRow(k) || prev.t === 'frac' || prev.t === 'matrix' || prev.t === 'fence' || prev.t === 'script' && prev.base.t === 'matrix' || numLike(prev) && numLike(k))) out.push('times');
          }
          const pt = plain(piece);
          const isDx = (x) => x && x.t === 'row' && x.label === 'Differential';
          if (next && !(next.t === 'atom' && next.k === 'op' && SEP.has(next.tex))) {
            const nextIsOp = next.t === 'atom' && next.k === 'op' && ADD.has(next.tex);
            if (CUE.test(pt) || / all over /.test(pt) && !/^the /.test(pt.split(' all over ')[0].slice(-1)) ||
                nextIsOp && (k.t === 'script' && (/ to the /.test(pt) || k.base.t !== 'atom') && !CUE.test(pt) || k.t === 'sqrt' || bigRow(k)) ||
                isDx(next) && (k.t === 'frac' || k.t === 'fence' || k.t === 'sqrt' || k.t === 'script' && (/ to the /.test(pt) || k.base.t !== 'atom'))) piece += ',';
          }
          out.push(piece);
        });
        return W(n, join(out).replace(/ ,/g, ',').replace(/,,/g, ','));
      }
      case 'script': return W(n, scriptSp(n));
      case 'frac': {
        const N = speak(n.num), D = speak(n.den), tn = tex(n.num), td = tex(n.den);
        if (/^(d|\\partial)\b|^d$|^\\partial/.test(tn) && /^(d|\\partial)/.test(td)) return W(n, N + ' ' + D);
        if (tn === '1' && /^[234]$/.test(td)) return W(n, 'one ' + { 2:'half', 3:'third', 4:'quarter' }[td]);
        if (/^(d|\\partial)/.test(tn) && /^(d|\\partial)/.test(td)) return W(n, N + ' ' + D);
        const selfDelim = n.den.t === 'sqrt' || n.den.t === 'fence' || n.den.t === 'matrix' || n.den.t === 'row' && n.den.label === 'Product' && n.den.kids.every((k) => k.t === 'fence' || k.t === 'atom' && k.k === 'op');
        const den = simple(n.den) || selfDelim ? D : 'the quantity ' + D + ', close quantity';
        if (simple(n.num)) return W(n, N + ' over ' + den);
        return W(n, N + ', all over ' + den);
      }
      case 'sqrt': {
        const it = n.idx ? tex(n.idx) : '';
        const pre = !it ? 'the square root of' : it === '3' ? 'the cube root of' : 'the ' + (ORD[it] || it + 'th') + ' root of';
        return W(n, pre + ' ' + speak(n.body) + (simple(n.body) ? '' : ', end root'));
      }
      case 'fence': {
        const d = DL[n.open] || ['open ' + n.open.replace(/^\\/, ''), 'close'];
        if ((n.open === '(' || n.open === '[') && n.body.t === 'matrix') return W(n, speak(n.body));
        if (n.open === '(' && simple(n.body) && !(n.body.t === 'row' && n.body.label === 'Product')) return W(n, speak(n.body));
        if ((n.open === '\\|' || n.open === '\\lVert' || n.open === '\\Vert' || n.open === '|') && simple(n.body)) return W(n, d[0] + ' ' + speak(n.body));
        return W(n, join([d[0], speak(n.body) + (d[1] ? ',' : ''), d[1]]));
      }
      case 'matrix': {
        const r = n.rows.length, c = Math.max(...n.rows.map((x) => x.cells.length));
        const rows = n.rows.map((rw) => W(rw, rw.cells.map(speak).join(', ')));
        if (n.env === 'cases') return W(n, (n.rows.every((rw) => rw.cells.some((c) => /=/.test(tex(c)))) ? 'the system of ' + (r === 2 ? 'two' : r === 3 ? 'three' : r) + ' equations: ' : 'cases: ') + rows.join('; '));
        const bar = n.colspec && n.colspec.indexOf('|') > -1 ? n.colspec.replace(/[^a-z|]/g, '').indexOf('|') : -1;
        if (bar > -1) {
          const rws = n.rows.map((rw, ri) => W(rw, 'row ' + (ri + 1) + ': ' + rw.cells.map((c, ci) => (ci === bar ? 'bar, ' : '') + speak(c)).join(', ')));
          return W(n, 'the augmented matrix with a vertical bar before the last column: ' + rws.join('; '));
        }
        if (/^(aligned|align|gathered|split|array)\*?$/.test(n.env) && !/matrix/.test(n.env)) {
          if (n.env !== 'array') return W(n, rows.join('; '));
        }
        if (c === 1 && !/^v/i.test(n.env)) return W(n, 'the column vector ' + rows.join(', '));
        const m = 'the ' + r + ' by ' + c + ' matrix with rows ' + (r === 2 ? rows.join(' and ') : rows.join('; '));
        return W(n, /^v/i.test(n.env) ? 'the determinant of ' + m : m);
      }
      case 'acc': {
        const B = speak(n.body);
        const f = { bold:(b) => 'bold ' + b, hat:(b) => b + ' hat', bar:(b) => b + ' bar', vector:(b) => 'vector ' + b, tilde:(b) => b + ' tilde', dot:(b) => b + ' dot', 'double dot':(b) => b + ' double dot', script:(b) => 'script ' + b, underline:(b) => b + ' underlined' }[ACC[n.name]];
        return W(n, f ? f(B) : B);
      }
    }
    return '';
  }
  function scriptSp(n) {
    const b = n.base;
    if (b.t === 'atom' && b.k === 'big') {
      if (b.name === 'lim') {
        const sb = n.sub;
        if (sb && sb.t === 'row' && sb.kids.length === 3 && sb.kids[1].tex === '\\to') return 'the limit as ' + speak(sb.kids[0]) + ' approaches ' + speak(sb.kids[2]) + ' of';
        return 'the limit as ' + (sb ? speak(sb) : '') + ' of';
      }
      if (n.sub && n.sup) return 'the ' + b.sp + ' from ' + speak(n.sub) + ' to ' + speak(n.sup) + ' of';
      if (n.sub) return 'the ' + b.sp + ' over ' + speak(n.sub) + ' of';
      return 'the ' + b.sp + ' of';
    }
    if (b.t === 'atom' && b.k === 'fn' && n.sub && !n.sup && /^(max|min|sup|inf)$/.test(b.name)) return 'the ' + b.sp + ' over ' + speak(n.sub) + ' of';
    let s = speak(b);
    if (b.t === 'frac' || b.t === 'row' && !simple(b)) s = 'the quantity ' + s + ', close quantity';
    if (b.t === 'fence' && b.open === '(' && b.body.t === 'row' && b.body.label === 'Product' && n.sup && /^(T|\\top)$/.test(tex(n.sup).replace(/\s+/g, ''))) return 'the transpose of ' + speak(b.body);
    if (n.sub) s += ' sub ' + speak(n.sub) + (simple(n.sub) ? '' : ', end sub');
    if (n.sup && (CUE.test(plain(s)) || b.t === 'matrix')) s += ',';
    if (n.sup) {
      const t = tex(n.sup).replace(/\s+/g, '');
      const named = { '2':'squared', '3':'cubed', 'T':'transpose', '\\top':'transpose', '-1':'inverse', '*':'star', '\\ast':'star', '\\star':'star', '\\prime':'prime', "'":'prime', '\\dagger':'dagger' };
      const W = (node, x) => '<span class="nd" data-n="' + node.id + '">' + x + '</span>';
      if (named[t]) s += ' ' + W(n.sup, named[t]);
      else if (n.sup.t === 'atom' && n.sup.k === 'num') s += ' to the ' + W(n.sup, ORD[t] || t + 'th');
      else if (n.sup.t === 'atom' || n.sup.t === 'acc') s += ' to the ' + speak(n.sup);
      else s += ' to the ' + speak(n.sup) + ', end exponent';
    }
    return s;
  }

  function label(n) {
    switch (n.t) {
      case 'row': return n.label || 'Group';
      case 'script': {
        const b = n.base;
        if (b.t === 'atom' && b.k === 'big') return { int:'Integral sign with bounds', sum:'Sum sign with bounds', prod:'Product sign with bounds', lim:'Limit with its approach' }[b.name] || 'Operator with bounds';
        return n.sup && n.sub ? 'Subscript and exponent' : n.sup ? 'Exponent applied to its base' : 'Subscript';
      }
      case 'frac': return 'Fraction';
      case 'sqrt': return 'Root';
      case 'fence': return { '|':'Absolute value', '\\|':'Norm', '\\lVert':'Norm', '\\Vert':'Norm', '\\langle':'Vector', '[':'Brackets', '\\{':'Braces' }[n.open] || (n.open === '.' ? 'Group' : 'Parentheses');
      case 'matrix': return /^v/i.test(n.env) ? 'Determinant' : n.env === 'cases' ? 'Cases' : 'Matrix';
      case 'mrow': return 'Matrix row';
      case 'acc': return { bold:'Bold (vector)', hat:'Hat (estimate)', bar:'Bar', vector:'Vector arrow', tilde:'Tilde', dot:'Dot (derivative)', script:'Script letter' }[ACC[n.name]] || 'Styled symbol';
      case 'atom': return { var:'Variable', num:'Number', fn:'Function name', sym:'Symbol', text:'Text', big:'Operator' }[n.k] || 'Symbol';
    }
    return 'Part';
  }

  function build(latex) {
    const root = parse(latex);
    const byId = new Map(), parent = new Map();
    (function walk(n, p) { byId.set(n.id, n); if (p) parent.set(n.id, p); kids(n).forEach((k) => walk(k, n)); })(root, null);
    return {
      root, byId,
      parent: (n) => parent.get(n.id) || null,
      nav: (n) => kids(n).filter((k) => !isLeafOp(k)),
      tagged: tex(root, 'tag'), plain: tex(root, 'plain'), html: tex(root, 'html'),
      spokenHtml: speak(root),
      tex, speak, label,
    };
  }
  const plainText = (html) => html.replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/\s+/g, ' ').replace(/ ,/g, ',').trim();
  return { build, plainText };
})();
