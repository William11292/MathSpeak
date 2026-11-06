// Speak Math. Classic script: shares top-level names with the other js/ files. Load order is set in index.html.
// Built-in rules: spoken words to LaTeX (used when Claude is not available)

const NUM = { zero:0, one:1, two:2, three:3, four:4, five:5, six:6, seven:7, eight:8, nine:9, ten:10, eleven:11, twelve:12, thirteen:13, fourteen:14, fifteen:15, sixteen:16, seventeen:17, eighteen:18, nineteen:19, twenty:20, thirty:30, forty:40, fifty:50, hundred:100 };
const ORD = { first:1, second:2, third:3, fourth:4, fifth:5, sixth:6, seventh:7, eighth:8, ninth:9, tenth:10, nth:'n' };
const GREEK = ['alpha','beta','gamma','delta','epsilon','zeta','eta','theta','iota','kappa','lambda','mu','nu','xi','pi','rho','sigma','tau','phi','chi','psi','omega'];
const FUNCS = { sine:'\\sin', sin:'\\sin', cosine:'\\cos', cos:'\\cos', tangent:'\\tan', tan:'\\tan', log:'\\log', ln:'\\ln', 'natural log':'\\ln', exp:'\\exp' };

function ruleParse(text) {
  let s = ' ' + text.toLowerCase().replace(/[,?!;]/g, ' ').replace(/\s+/g, ' ') + ' ';
  const R = (re, to) => { s = s.replace(re, to).replace(/\s+/g, " "); };
  // multi-word phrases first
  R(/\bnatural log of\b/g, ' \\ln '); R(/\bnatural log\b/g, ' \\ln ');
  R(/\bplus or minus\b/g, ' \\pm '); R(/\bminus or plus\b/g, ' \\mp ');
  R(/\bless than or equal to\b/g, ' \\le '); R(/\bgreater than or equal to\b/g, ' \\ge ');
  R(/\bnot equal to\b|\bdoes not equal\b/g, ' \\neq '); R(/\bless than\b/g, ' < '); R(/\bgreater than\b/g, ' > ');
  R(/\b(?:is )?equals?\b|\bis equal to\b/g, ' = ');
  R(/\b(?:open|left) (?:paren|parenthesis|bracket)\b/g, ' ( '); R(/\b(?:close|right) (?:paren|parenthesis|bracket)\b/g, ' ) ');
  R(/\b(?:close|end) quantity\b/g, ' ) '); R(/\bquantity\b/g, ' ( ');
  R(/\binfinity\b/g, ' \\infty ');
  R(/\bwith respect to (\w)\b/g, ' WRT$1 ');
  // numbers
  R(/\b(twenty|thirty|forty|fifty) (one|two|three|four|five|six|seven|eight|nine)\b/g, (_, a, b) => ' ' + (NUM[a] + NUM[b]) + ' ');
  R(new RegExp('\\b(' + Object.keys(NUM).join('|') + ')\\b', 'g'), (_, w) => ' ' + NUM[w] + ' ');
  R(/\bpoint (\d)/g, '.$1'); R(/(\d) \.(\d)/g, '$1.$2');
  R(/\bnegative\b/g, ' - ');
  // greek & functions
  R(new RegExp('\\b(' + GREEK.join('|') + ')\\b', 'g'), (_, g) => ' \\' + g + ' ');
  R(/\b(sine|cosine|tangent|sin|cos|tan|log|exp)(?: of)?\b/g, (_, f) => ' ' + FUNCS[f] + ' ');
  // structures
  R(/\bdeterminant of the (\d) by (\d) matrix ((?:\S+ ?)+)/g, (_, r, c, rest) => ' ' + matrix(+r, +c, rest, 'vmatrix') + ' ');
  R(/\b(?:the )?(\d) by (\d) matrix ((?:\S+ ?)+)/g, (_, r, c, rest) => ' ' + matrix(+r, +c, rest, 'bmatrix') + ' ');
  R(/\b(?:the )?integral from (.+?) to (.+?) of\b/g, ' \\int_{$1}^{$2} ');
  R(/\b(?:the )?integral of\b/g, ' \\int ');
  R(/\b(?:the )?sum from (.+?) to (.+?) of\b/g, ' \\sum_{$1}^{$2} ');
  R(/\b(?:the )?product from (.+?) to (.+?) of\b/g, ' \\prod_{$1}^{$2} ');
  R(/\b(?:the )?limit as (\S+) (?:approaches|goes to|tends to) (.+?) of\b/g, ' \\lim_{$1 \\to $2} ');
  R(/\b(?:the )?derivative of (.+?) WRT(\w)\b/g, ' \\frac{d}{d$2}\\left( $1 \\right) ');
  R(/\b(?:the )?derivative of\b/g, ' \\frac{d}{dx} ');
  R(/\b(?:the )?(?:square )?root of (.+?) end root\b/g, ' \\sqrt{$1} ');
  R(/\b(?:the )?cube root of (.+?) end root\b/g, ' \\sqrt[3]{$1} ');
  R(/\b(?:the )?absolute value of (.+?) end absolute value\b/g, ' \\left| $1 \\right| ');
  R(/\b(?:the )?absolute value of\b/g, ' ABS ');
  R(/\b(?:the )?cube root of\b/g, ' CBRT '); R(/\b(?:the )?square root of\b/g, ' SQRT ');
  R(/\bfraction (.+?) over (.+?) end fraction\b/g, ' \\frac{$1}{$2} ');
  R(/\ball over\b/g, ' ALLOVER ');
  R(/\bsquared\b/g, ' ^{2} '); R(/\bcubed\b/g, ' ^{3} ');
  R(/\bto the power of (- )?(\S+)/g, (_, n, x) => ' ^{' + (n ? '-' : '') + x + '} ');
  R(new RegExp('\\bto the (' + Object.keys(ORD).join('|') + ')(?: power)?\\b', 'g'), (_, o) => ' ^{' + ORD[o] + '} ');
  R(/\bto the (- )?(\S+)/g, (_, n, x) => ' ^{' + (n ? '-' : '') + x + '} ');
  R(/\b(?:sub|subscript) (\S+)/g, ' _{$1} ');
  R(/\b([fgh])( prime)? of (\w)\b/g, (_, f, p, x) => ' ' + f + (p ? "'" : '') + '(' + x + ') ');
  R(/\b(\w) prime\b/g, " $1' ");
  R(/\bd (\w)\b(?=\s*$)/g, ' \\,d$1 ');
  R(/\bd (\w)\b/g, ' \\,d$1 ');
  R(/\bplus\b/g, ' + '); R(/\bminus\b/g, ' - ');
  R(/\btimes\b|\bmultiplied by\b/g, ' \\cdot '); R(/\bdivided by\b/g, ' \\div ');
  R(/\bfactorial\b/g, ' ! ');
  R(/\b(?:the|of|and|is|all)\b/g, ' ');

  // token pass: group parens, attach postfix pieces, apply SQRT / ABS / over
  let toks = s.trim().split(/\s+/).filter(Boolean);
  // group parentheses into single tokens
  const grouped = []; const stack = [];
  for (const t of toks) {
    if (t === '(') { stack.push(grouped.length); grouped.push('('); }
    else if (t === ')' && stack.length) {
      const i = stack.pop(); const inner = grouped.splice(i + 1); grouped[i] = '\u0001' + finish(inner) + '\u0002';
    } else grouped.push(t);
  }
  return finish(grouped).replace(/\u0001/g, '\\left(').replace(/\u0002/g, '\\right)');

  function finish(tks) {
    // attach ^ _ ' ! to previous
    const a = [];
    for (const t of tks) {
      if (/^[\^_']/.test(t) && a.length) a[a.length - 1] += t;
      else if (/^\\,d/.test(t) && a.length) a[a.length - 1] += t;
      else a.push(t);
    }
    // ALLOVER: everything before (after last '=') over everything after
    const ai = a.indexOf('ALLOVER');
    if (ai > -1) {
      const eq = a.lastIndexOf('=', ai);
      const num = a.slice(eq + 1, ai), den = a.slice(ai + 1);
      return [...a.slice(0, eq + 1), '\\frac{' + finish(num) + '}{' + finish(den) + '}'].join(' ');
    }
    // prefix ops take the next term
    for (let i = a.length - 2; i >= 0; i--) {
      if (a[i] === 'SQRT') a.splice(i, 2, '\\sqrt{' + strip(a[i + 1]) + '}');
      else if (a[i] === 'CBRT') a.splice(i, 2, '\\sqrt[3]{' + strip(a[i + 1]) + '}');
      else if (a[i] === 'ABS') a.splice(i, 2, '\\left|' + strip(a[i + 1]) + '\\right|');
    }
    // binary "over": term over term (function + argument counts as one term on the left)
    for (let i = 1; i < a.length - 1; i++) {
      if (a[i] === 'over') {
        let L = i - 1;
        if (L > 0 && /^\\(sin|cos|tan|log|ln)$/.test(a[L - 1])) L--;
        const left = a.slice(L, i).join(' ');
        a.splice(L, i - L + 2, '\\frac{' + strip(left) + '}{' + strip(a[i + 1]) + '}');
        i = L;
      }
    }
    return a.join(' ')
      .replace(/\s*([\^_])\s*/g, '$1')
      .replace(/(\d) (\d)/g, '$1$2')
      .replace(/(\d) ([a-z\\])/g, '$1$2')
      .replace(/\s+/g, ' ').trim();
  }
  function strip(t) { return t.startsWith('\u0001') && t.endsWith('\u0002') ? t.slice(1, -1) : t; }
  function matrix(r, c, rest, env) {
    const items = rest.trim().split(/\s+/); const need = r * c;
    const cells = items.slice(0, need); const after = items.slice(need).join(' ');
    const rows = []; for (let i = 0; i < r; i++) rows.push(cells.slice(i * c, i * c + c).join(' & '));
    return '\\begin{' + env + '} ' + rows.join(' \\\\ ') + ' \\end{' + env + '} ' + after;
  }
}


const looksLikeLatex = (t) => /\\[a-zA-Z]|[\^_{}]/.test(t);
