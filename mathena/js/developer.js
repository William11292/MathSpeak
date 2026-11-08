// Mathena. Classic script: shares top-level names with the other js/ files. Load order is set in index.html.
// Developer tab: AI token usage and cost for this session, grouped by the equation each call helped create

/* Every Claude call goes through aiCall(), which logs it against the equation being created.
   An equation starts each time the input is converted (Create new → Done, or Convert) and collects
   any “Refine with AI” calls made on it afterwards. Rules-only equations count too, at 0 tokens,
   so “average cost per equation” reflects every equation, not only the ones that used AI.
   Token counts are exact on the API-key path (the response's usage block). Inside Claude the
   in-artifact AI doesn't report usage, so counts there are estimated at about 4 characters per token. */
const DEV_KEY = 'mathena-dev-usage';
const DEV_PRICES = {   // USD per million tokens, Claude API standard rates (checked Nov 2026; Haiku rates are for prompts up to 100K tokens)
  'claude-haiku-5-5': { name: 'Claude Haiku 5.5', in: 0.10, out: 0.50 },
  'claude-sonnet-5-5': { name: 'Claude Sonnet 5.5', in: 2.00, out: 10.00 }
};
const TIER_MODEL = { quick: 'claude-haiku-5-5', default: 'claude-sonnet-5-5' };
let dev = { eqs: [], prices: JSON.parse(JSON.stringify(DEV_PRICES)), started: Date.now() }, devCur = null;
try { const v = JSON.parse(sessionStorage.getItem(DEV_KEY) || 'null'); if (v && Array.isArray(v.eqs)) { dev = Object.assign(dev, v); dev.prices = Object.assign(JSON.parse(JSON.stringify(DEV_PRICES)), v.prices || {}); } } catch (e) {}
const devSave = () => { try { sessionStorage.setItem(DEV_KEY, JSON.stringify(dev)); } catch (e) {} };
const estTok = (s) => Math.max(1, Math.ceil(String(s || '').length / 4));

function devBeginEquation(input) {
  devCur = { id: Date.now() + Math.random(), n: dev.eqs.length + 1, ts: Date.now(), input: input || '', latex: '', method: '', calls: [] };
  dev.eqs.push(devCur); devSave();
}
function devSetResult(latex, method) { if (!devCur) return; devCur.latex = latex || devCur.latex; if (method) devCur.method = method; devSave(); }
function devDetach() { devCur = null; }   // e.g. an equation reopened from Export: a later refine starts a new record

async function aiCall(action, prompt, opts) {
  if (!devCur) devBeginEquation(action === 'refine' ? '(edited: ' + (current.latex || '') + ')' : '');
  if (action === 'refine' && !devCur.method) devCur.method = 'opened';
  const eq = devCur, t0 = performance.now(), tier = (opts && opts.modelTier) || 'default';
  const call = { ts: Date.now(), action, tier, model: TIER_MODEL[tier] || tier, inTok: 0, outTok: 0, exact: false, ms: 0, ok: false };
  try {
    const r = await sample.json(prompt, opts);
    const last = sample.last;
    if (last && last.usage) { call.inTok = last.usage.input_tokens || 0; call.outTok = last.usage.output_tokens || 0; call.exact = true; if (last.model) call.model = last.model; }
    else { call.inTok = estTok(prompt); call.outTok = estTok(JSON.stringify(r)); }
    call.ok = true; return r;
  } catch (e) {
    call.err = (e && (e.message || e.code)) || 'error';
    const last = sample && sample.last;
    if (last && last.usage) { call.inTok = last.usage.input_tokens || 0; call.outTok = last.usage.output_tokens || 0; call.exact = true; }
    throw e;
  } finally {
    call.ms = Math.round(performance.now() - t0); eq.calls.push(call); devSave();
    if (page && page() === 'developer') renderDev();
  }
}

/* ---------- Numbers ---------- */
function priceFor(model) { const k = Object.keys(dev.prices).find((m) => String(model).startsWith(m)); return k ? dev.prices[k] : null; }
const callCost = (c) => { const p = priceFor(c.model); return p ? (c.inTok * p.in + c.outTok * p.out) / 1e6 : 0; };
const eqSum = (e) => e.calls.reduce((a, c) => ({ inTok: a.inTok + c.inTok, outTok: a.outTok + c.outTok, cost: a.cost + callCost(c), est: a.est || !c.exact }), { inTok: 0, outTok: 0, cost: 0, est: false });
const fmtN = (n) => n.toLocaleString('en-US');
const fmt$ = (v) => v === 0 ? '$0' : v < 0.01 ? '$' + v.toFixed(5) : '$' + v.toFixed(4);
const pathOf = (e) => {
  const conv = e.calls.filter((c) => c.action === 'convert').length, ref = e.calls.filter((c) => c.action === 'refine').length;
  const base = e.method === 'claude' ? 'Claude convert' : e.method === 'latex' ? 'Typed LaTeX' : e.method === 'opened' ? 'Saved equation' : conv ? 'Claude failed → rules' : 'Built-in rules';
  return base + (ref ? ' + ' + ref + ' refine' + (ref > 1 ? 's' : '') : '');
};

/* ---------- Render ---------- */
function renderDev() {
  const eqs = dev.eqs, sums = eqs.map(eqSum);
  const calls = eqs.reduce((a, e) => a + e.calls.length, 0);
  const inTok = sums.reduce((a, s) => a + s.inTok, 0), outTok = sums.reduce((a, s) => a + s.outTok, 0), cost = sums.reduce((a, s) => a + s.cost, 0);
  const est = sums.some((s) => s.est), aiEqs = eqs.filter((e) => e.calls.length).length, tilde = est ? '~' : '';
  const tiles = [
    ['Equations created', fmtN(eqs.length), aiEqs + ' used AI'],
    ['AI calls', fmtN(calls), eqs.reduce((a, e) => a + e.calls.filter((c) => !c.ok).length, 0) + ' failed'],
    ['Tokens', tilde + fmtN(inTok + outTok), fmtN(inTok) + ' in · ' + fmtN(outTok) + ' out'],
    ['Cost this session', tilde + fmt$(cost), 'at the rates below'],
    ['Avg cost per equation', eqs.length ? tilde + fmt$(cost / eqs.length) : '—', eqs.length ? tilde + '$' + (cost / eqs.length * 1000).toFixed(2) + ' per 1,000 equations' : 'no equations yet']
  ];
  $('devTiles').innerHTML = tiles.map(([k, v, s]) => '<div class="dev-tile"><span class="label">' + k + '</span><b>' + v + '</b><span class="hint">' + esc(s) + '</span></div>').join('');
  $('devNote').hidden = !est;

  const body = $('devRows');
  if (!eqs.length) { body.innerHTML = '<tr><td colspan="7" class="empty">No equations yet. Convert one in the Math Workspace and its AI usage shows up here.</td></tr>'; }
  else body.innerHTML = eqs.slice().reverse().map((e) => {
    const s = eqSum(e), t = s.est ? '~' : '';
    const detail = e.calls.length ? '<tr class="dev-calls" hidden data-for="' + e.id + '"><td></td><td colspan="6"><table class="dev-sub"><thead><tr><th>Time</th><th>Action</th><th>Model</th><th class="num">Input</th><th class="num">Output</th><th class="num">Latency</th><th class="num">Cost</th></tr></thead><tbody>' +
      e.calls.map((c) => '<tr' + (c.ok ? '' : ' class="fail"') + '><td>' + new Date(c.ts).toLocaleTimeString() + '</td><td>' + c.action + (c.ok ? '' : ' (failed: ' + esc(c.err || '') + ')') + '</td><td>' + esc(c.model) + '</td><td class="num">' + (c.exact ? '' : '~') + fmtN(c.inTok) + '</td><td class="num">' + (c.exact ? '' : '~') + fmtN(c.outTok) + '</td><td class="num">' + fmtN(c.ms) + ' ms</td><td class="num">' + (c.exact ? '' : '~') + fmt$(callCost(c)) + '</td></tr>').join('') +
      '</tbody></table></td></tr>' : '';
    return '<tr class="dev-eq"><td class="num">' + e.n + '</td><td><code class="dev-tex">' + esc(e.latex || e.input || '—') + '</code></td><td>' + esc(pathOf(e)) + '</td>' +
      '<td class="num">' + (e.calls.length ? '<button type="button" class="small ghost dev-x" aria-expanded="false" data-id="' + e.id + '">' + e.calls.length + ' ▸</button>' : '0') + '</td>' +
      '<td class="num">' + t + fmtN(s.inTok) + '</td><td class="num">' + t + fmtN(s.outTok) + '</td><td class="num"><b>' + t + fmt$(s.cost) + '</b></td></tr>' + detail;
  }).join('');
  body.querySelectorAll('.dev-x').forEach((b) => b.onclick = () => {
    const row = body.querySelector('.dev-calls[data-for="' + b.dataset.id + '"]'), open = row.hidden;
    row.hidden = !open; b.setAttribute('aria-expanded', String(open)); b.textContent = b.textContent.replace(open ? '▸' : '▾', open ? '▾' : '▸');
  });

  $('devPrices').innerHTML = Object.entries(dev.prices).map(([m, p]) =>
    '<div class="dev-price"><b>' + esc(p.name || m) + '</b><code>' + esc(m) + '</code>' +
    '<label>Input $/MTok <input type="number" min="0" step="0.01" data-m="' + m + '" data-k="in" value="' + p.in + '"></label>' +
    '<label>Output $/MTok <input type="number" min="0" step="0.01" data-m="' + m + '" data-k="out" value="' + p.out + '"></label></div>').join('');
  $('devPrices').querySelectorAll('input').forEach((i) => i.onchange = () => { const v = parseFloat(i.value); if (v >= 0) { dev.prices[i.dataset.m][i.dataset.k] = v; devSave(); renderDev(); } });
  $('devSince').textContent = 'Since ' + new Date(dev.started).toLocaleTimeString() + ' · kept until this tab closes';
}

$('devCsv').onclick = () => {
  const rows = [['equation', 'latex', 'path', 'call_time', 'action', 'model', 'input_tokens', 'output_tokens', 'exact', 'latency_ms', 'ok', 'cost_usd']];
  dev.eqs.forEach((e) => {
    if (!e.calls.length) rows.push([e.n, e.latex || e.input, pathOf(e), '', '', '', 0, 0, '', '', '', 0]);
    e.calls.forEach((c) => rows.push([e.n, e.latex || e.input, pathOf(e), new Date(c.ts).toISOString(), c.action, c.model, c.inTok, c.outTok, c.exact, c.ms, c.ok, callCost(c).toFixed(6)]));
  });
  const csv = rows.map((r) => r.map((v) => /[",\n]/.test(String(v)) ? '"' + String(v).replace(/"/g, '""') + '"' : v).join(',')).join('\n');
  saveFile('mathena-ai-usage.csv', new Blob([csv], { type: 'text/csv' }));
};
$('devReset').onclick = () => { dev = { eqs: [], prices: dev.prices, started: Date.now() }; devCur = null; devSave(); renderDev(); setStatus('Usage log cleared.', 'ok'); };
