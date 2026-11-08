// Speak Math. Classic script: shares top-level names with the other js/ files. Load order is set in index.html.
// Standalone mode: call the Claude API with the user's own key

/* ---------- Standalone: call the Claude API with the user's own key ---------- */
function setupApiKey() {
  const KEY = 'speak-math-anthropic-key';
  const MODELS = { quick: 'claude-haiku-5-5', default: 'claude-sonnet-5-5' };
  const panel = $('apikey'), input = $('apikey-in'), sum = $('apikey-sum');
  const getKey = () => { try { return localStorage.getItem(KEY) || ''; } catch (e) { return ''; } };
  const engine = $('engine');
  function apply() {
    const has = !!getKey();
    sample = has ? directSample : null;
    engine.options[0].disabled = !has;
    engine.options[0].textContent = has ? 'Convert with Claude' : 'Claude (add your API key below)';
    if (!has) engine.value = 'rules'; else engine.value = 'claude';
    sum.textContent = has ? 'Claude API key saved in this browser' : 'Use your own Claude API key';
    input.value = ''; input.placeholder = has ? 'Key saved. Paste a new one to replace it.' : 'sk-ant-…';
  }
  const directSample = {
    async json(prompt, opts) {
      const key = getKey();
      if (!key) { const e = new Error('No API key'); e.code = 'not_granted'; throw e; }
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': key,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true'
        },
        body: JSON.stringify({
          model: MODELS[(opts && opts.modelTier) || 'default'] || MODELS.default,
          max_tokens: 1024,
          messages: [{ role: 'user', content: prompt }]
        })
      });
      if (!res.ok) {
        let msg = 'HTTP ' + res.status;
        try { const b = await res.json(); if (b && b.error && b.error.message) msg = b.error.message; } catch (e) {}
        const e = new Error(msg); e.code = res.status === 401 ? 'not_granted' : 'api_error';
        if (res.status === 401) { try { localStorage.removeItem(KEY); } catch (x) {} setTimeout(apply, 0); }
        throw e;
      }
      const data = await res.json();
      const text = (data.content || []).filter((c) => c.type === 'text').map((c) => c.text).join('');
      const m = text.match(/\{[\s\S]*\}/);
      return JSON.parse(m ? m[0] : text);
    }
  };
  $('apikey-save').onclick = () => {
    const v = input.value.trim();
    if (!v) { setStatus('Paste your API key first.', 'err'); input.focus(); return; }
    try { localStorage.setItem(KEY, v); } catch (e) { setStatus('This browser blocked saving the key.', 'err'); return; }
    apply(); setStatus('API key saved. Conversions now use Claude.', 'ok');
  };
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); $('apikey-save').click(); } });
  $('apikey-clear').onclick = () => { try { localStorage.removeItem(KEY); } catch (e) {} apply(); setStatus('API key removed.', 'ok'); };
  panel.hidden = false;
  apply();
}
