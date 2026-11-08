// Speak Math. Classic script: shares top-level names with the other js/ files. Load order is set in index.html.
// Learning Zone: the example library (subjects, topics, examples, and why each structure is read the way it is).
// Adapted from the MathVoice prototype's MathSpeak library. Everything here is read-only: the Learning Zone
// copies an example into its own draft before anything is edited, so these originals never change.

const LZ_DATA = (() => {
  const SUBJECTS = { math: 'Math', phys: 'Physics', chem: 'Chemistry' };

  const TOPICS = {
    math: ['Algebra', 'Trigonometry', 'Calculus', 'Linear algebra', 'Statistics'],
    phys: ['Mechanics', 'Electromagnetism', 'Modern physics'],
    chem: ['Reactions', 'Ions & isotopes', 'Equilibrium & acids', 'Gases'],
  };

  // Notation structures, shown as "Topics": [name, why it is read this way]. Written so they hold for any spoken style.
  const STRUCT = {
    basic: ['Letters & operators', 'Each letter is read on its own, so “m a” means m times a. Operators are read by name: plus, minus, equals.'],
    fraction: ['Fractions', 'A fraction has a top and a bottom. The reading marks where the top ends, where the bottom begins and where the whole fraction ends, so a listener can’t mix up a over b, plus c with a over the quantity b plus c.'],
    script: ['Scripts (exponents & subscripts)', 'A raised part (an exponent) or a lowered part (a subscript) is announced, and the reading marks where it ends and the line returns to normal. “Squared” and “cubed” are short forms for the exponents 2 and 3.'],
    root: ['Radicals (roots)', 'The reading marks where the root starts and where it ends, so the listener knows exactly what is under it.'],
    group: ['Grouping', 'Parentheses, brackets and absolute-value bars change what belongs together, so where each group starts and ends is spoken.'],
    largeop: ['Sums, integrals & limits', 'Integrals, sums and limits have bounds written below and above them. The bounds are read first, then the expression the operator applies to.'],
    accent: ['Accents & vectors', 'A mark above a letter, like a bar or an arrow, changes its meaning (a mean, a vector), so the mark is named.'],
    matrix: ['Matrices', 'A matrix is read by its size, then row by row, so the listener can rebuild the grid.'],
    arrow: ['Arrows & relations', 'Arrows and relations connect the two sides (reacts to, is in equilibrium with, is less than), so they are named out loud.'],
    function: ['Functions & operators', 'Named functions such as sine, cosine and log are read as words, followed by what they apply to.'],
  };

  // Why an example can't be dictated with the built-in rules yet (it may still work with Claude conversion).
  const NO_SAY = {
    capital: 'The built-in rules can’t make capital letters yet.',
    notation: 'The built-in rules don’t cover this notation yet.',
  };

  // [subject, area, topic (notation structure), title, LaTeX, dictation phrase or null, reason (when the phrase is null)]
  // In the Learning Zone, "Subjects" lists the areas (e.g. Calculus) and "Topics" lists the notation structures.
  // Every phrase is checked against the built-in rule parser (ruleParse) and must convert to this LaTeX.
  const ROWS = [
    ['math', 'Algebra', 'fraction', 'Quadratic formula', 'x = \\frac{-b \\pm \\sqrt{b^{2} - 4ac}}{2a}', 'x equals fraction negative b plus or minus square root of b squared minus 4 a c end root over 2 a end fraction'],
    ['math', 'Algebra', 'script', 'Pythagorean theorem', 'a^{2} + b^{2} = c^{2}', 'a squared plus b squared equals c squared'],
    ['math', 'Algebra', 'script', 'Product of powers', 'x^{m} \\cdot x^{n} = x^{m+n}', null, 'notation'],
    ['math', 'Algebra', 'group', 'Absolute-value inequality', '|x - 3| < 5', 'absolute value of x minus 3 end absolute value less than 5'],
    ['math', 'Trigonometry', 'function', 'Pythagorean identity', '\\sin^{2}\\theta + \\cos^{2}\\theta = 1', 'sine squared theta plus cosine squared theta equals 1'],
    ['math', 'Trigonometry', 'function', 'Law of cosines', 'c^{2} = a^{2} + b^{2} - 2ab\\cos C', null, 'capital'],
    ['math', 'Calculus', 'fraction', 'Derivative (Leibniz notation)', '\\frac{dy}{dx} = 2x', 'fraction d y over d x end fraction equals 2 x'],
    ['math', 'Calculus', 'largeop', 'Definite integral', '\\int_{0}^{1} 3x^{2}\\,dx = 1', 'integral from 0 to 1 of 3 x squared d x equals 1'],
    ['math', 'Calculus', 'largeop', 'Limit', '\\lim_{x \\to 0} \\frac{\\sin x}{x} = 1', 'limit as x approaches 0 of sine x over x equals 1'],
    ['math', 'Calculus', 'fraction', 'Partial derivative', '\\frac{\\partial f}{\\partial x}', null, 'notation'],
    ['math', 'Calculus', 'largeop', 'Sum of the first n integers', '\\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}', 'sum from i equals 1 to n of i equals n the quantity n plus 1 close quantity all over 2'],
    ['math', 'Linear algebra', 'matrix', '2 × 2 matrix', 'A = \\begin{pmatrix} 4 & 1 \\\\ 2 & 3 \\end{pmatrix}', null, 'capital'],
    ['math', 'Linear algebra', 'function', 'Characteristic equation', '\\det(A - \\lambda I) = 0', null, 'capital'],
    ['math', 'Linear algebra', 'accent', 'Vector in component form', '\\vec{v} = \\langle 3, -4 \\rangle', null, 'notation'],
    ['math', 'Linear algebra', 'accent', 'Dot product', '\\vec{u} \\cdot \\vec{v} = |\\vec{u}||\\vec{v}|\\cos\\theta', null, 'notation'],
    ['math', 'Statistics', 'accent', 'Sample mean', '\\bar{x} = \\frac{1}{n}\\sum_{i=1}^{n} x_{i}', null, 'notation'],
    ['math', 'Statistics', 'root', 'Standard deviation', '\\sigma = \\sqrt{\\frac{1}{N}\\sum_{i=1}^{N}(x_{i} - \\mu)^{2}}', null, 'capital'],
    ['math', 'Statistics', 'fraction', 'z-score', 'z = \\frac{x - \\mu}{\\sigma}', 'z equals fraction x minus mu over sigma end fraction'],
    ['phys', 'Mechanics', 'basic', 'Newton’s second law', 'F = ma', null, 'capital'],
    ['phys', 'Mechanics', 'fraction', 'Kinetic energy', 'KE = \\frac{1}{2}mv^{2}', null, 'capital'],
    ['phys', 'Mechanics', 'fraction', 'Average velocity', 'v = \\frac{\\Delta x}{\\Delta t}', null, 'capital'],
    ['phys', 'Mechanics', 'script', 'Projectile height', 'y = v_{0}t - \\frac{1}{2}gt^{2}', 'y equals v sub 0 t minus fraction 1 over 2 end fraction g t squared'],
    ['phys', 'Electromagnetism', 'script', 'Coulomb’s law', 'F = k\\frac{q_{1}q_{2}}{r^{2}}', null, 'capital'],
    ['phys', 'Electromagnetism', 'function', 'Gauss’s law', '\\nabla \\cdot \\vec{E} = \\frac{\\rho}{\\varepsilon_{0}}', null, 'notation'],
    ['phys', 'Electromagnetism', 'basic', 'Ohm’s law', 'V = IR', null, 'capital'],
    ['phys', 'Modern physics', 'script', 'Mass–energy equivalence', 'E = mc^{2}', null, 'capital'],
    ['phys', 'Modern physics', 'accent', 'Schrödinger equation', 'i\\hbar\\frac{\\partial \\Psi}{\\partial t} = \\hat{H}\\Psi', null, 'notation'],
    ['chem', 'Reactions', 'arrow', 'Combustion of hydrogen', '\\mathrm{2H_{2} + O_{2} \\rightarrow 2H_{2}O}', null, 'capital'],
    ['chem', 'Reactions', 'arrow', 'Photosynthesis', '\\mathrm{6CO_{2} + 6H_{2}O \\rightarrow C_{6}H_{12}O_{6} + 6O_{2}}', null, 'capital'],
    ['chem', 'Ions & isotopes', 'script', 'Sulfate ion', '\\mathrm{SO_{4}^{2-}}', null, 'capital'],
    ['chem', 'Ions & isotopes', 'script', 'Carbon-14 isotope', '{}^{14}_{6}\\mathrm{C}', null, 'capital'],
    ['chem', 'Ions & isotopes', 'arrow', 'Forming sodium chloride', '\\mathrm{Na^{+} + Cl^{-} \\rightarrow NaCl}', null, 'capital'],
    ['chem', 'Equilibrium & acids', 'arrow', 'Haber process', '\\mathrm{N_{2} + 3H_{2} \\rightleftharpoons 2NH_{3}}', null, 'capital'],
    ['chem', 'Equilibrium & acids', 'group', 'Equilibrium constant', 'K_{c} = \\frac{[\\mathrm{NH_{3}}]^{2}}{[\\mathrm{N_{2}}][\\mathrm{H_{2}}]^{3}}', null, 'capital'],
    ['chem', 'Equilibrium & acids', 'function', 'pH', '\\mathrm{pH} = -\\log[\\mathrm{H^{+}}]', null, 'capital'],
    ['chem', 'Gases', 'basic', 'Ideal gas law', 'PV = nRT', null, 'capital'],
    ['chem', 'Gases', 'fraction', 'Combined gas law', '\\frac{P_{1}V_{1}}{T_{1}} = \\frac{P_{2}V_{2}}{T_{2}}', null, 'capital'],
  ];

  const EXAMPLES = Object.freeze(ROWS.map((r, i) => Object.freeze({
    id: i + 1, subject: r[0], area: r[1], struct: r[2], title: r[3], latex: r[4], say: r[5] || null, noSay: r[6] ? NO_SAY[r[6]] : null,
  })));

  return Object.freeze({ SUBJECTS, TOPICS, STRUCT, EXAMPLES });
})();
