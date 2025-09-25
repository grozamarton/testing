(() => {
  // --- Elements
  const form = document.getElementById('search-form');
  const input = document.getElementById('search-input');
  const resultsContainer = document.getElementById('results-container');
  const answerTextEl = document.getElementById('answer-text');
  const sourcesHeadingEl = document.getElementById('sources-heading');
  const sourcesListEl = document.getElementById('sources-list');
  const btn = document.getElementById('search-btn');

  // --- Config
  const N8N_WEBHOOK_URL = 'https://martong.app.n8n.cloud/webhook/744802d0-09f3-4726-b8c2-d48e9f23c2d9';
  const FETCH_TIMEOUT_MS = 20000;

  // --- Helpers
  const esc = (s) => String(s ?? '').replace(/[&<>\"']/g, m => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'
  }[m]));

  const uniqBy = (arr, keyFn) => {
    const seen = new Set();
    const out = [];
    for (const x of arr || []) {
      const k = keyFn(x);
      if (!k || seen.has(k)) continue;
      seen.add(k); out.push(x);
    }
    return out;
  };

  const withTimeout = (ms, promise) => {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), ms);
    return Promise.race([
      promise(ctrl.signal).finally(() => clearTimeout(t)),
      new Promise((_, rej) => setTimeout(() => rej(new Error('Timeout')), ms + 10))
    ]);
  };

  // --- Rendering
function resultCard(r) {
  const title = r.title || r.uri || 'Source';
  const uri = r.uri || r.link || '#';
  const snippet = r.snippet || r.content || '';
  const metaBits = [r.type, r.author, r.date].filter(Boolean).join(' • ');
  return `
    <article class="result">
      <h3 class="result-title"><a href="${esc(uri)}" target="_blank" rel="noopener">${esc(title)}</a></h3>
      ${metaBits ? `<p class="meta">${esc(metaBits)}</p>` : ''}
      ${snippet ? `<p class="snippet">${esc(snippet)}</p>` : ''}
    </article>
  `;
}

  function normalizeReferences(references) {
    // Fallback when server doesn't send answerSources
    const srcs = (references || []).map(r => {
      const ci = r?.chunkInfo || {};
      const md = ci.documentMetadata || {};
      const sd = md.structData || {};
      const uri = sd.ext_uri || md.uri || sd.uri || '';
      const title = md.title || sd.title || uri || 'Source';
      return { title, uri };
    }).filter(x => x.uri);
    return uniqBy(srcs, x => x.uri);
  }

  function renderResults(results = []) {
    resultsContainer.innerHTML = '';
    if (!results.length) return;
    resultsContainer.innerHTML = results.map(resultCard).join('');
  }

  function renderAnswer(answerText, citations, references, answerHtml, answerSources) {
    // Reset area
    answerTextEl.textContent = '';
    sourcesListEl.innerHTML = '';
    sourcesHeadingEl.style.display = 'none';

    // Prefer server-decorated HTML (with <sup class="cite"><a>[n]</a></sup>).
    if (answerHtml && typeof answerHtml === 'string') {
      answerTextEl.innerHTML = answerHtml;
    } else {
      const text = String(answerText || '').trim();
      if (text) {
        // Preserve line breaks from backend
        answerTextEl.textContent = text;
      } else {
        answerTextEl.innerHTML = '<p class="muted">No answer text.</p>';
      }
    }

    // Prefer backend-provided numbered sources, else dedupe references
const sources = (Array.isArray(answerSources) && answerSources.length)
  ? answerSources.map(s => ({
      title: s.title || s.uri || 'Source',
      uri: s.uri,
      // backend may send meta:{type,author,date}
      meta: s.meta || null
    }))
  : normalizeReferences(references);

if (sources.length) {
  sourcesHeadingEl.style.display = '';
  for (const ref of sources) {
    const li = document.createElement('li');

    const a = document.createElement('a');
    a.href = ref.uri;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.textContent = ref.title || ref.uri;
    li.appendChild(a);

    const metaBits = ref.meta
      ? [ref.meta.type, ref.meta.author, ref.meta.date].filter(Boolean).join(' • ')
      : '';
    if (metaBits) {
      const small = document.createElement('div');
      small.className = 'meta';
      small.textContent = metaBits;
      li.appendChild(small);
    }

    sourcesListEl.appendChild(li);
  }
}
}
  // --- Submit handler
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const q = input.value.trim();
    if (!q) return;

    // UI: loading
    btn.disabled = true;
    form.classList.add('loading');
    resultsContainer.innerHTML = '';
    answerTextEl.innerHTML = '<p class="muted">Thinking…</p>';
    sourcesListEl.innerHTML = '';
    sourcesHeadingEl.style.display = 'none';

    try {
      const data = await withTimeout(FETCH_TIMEOUT_MS, (signal) =>
        fetch(N8N_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: q }),
          mode: 'cors',
          signal
        }).then(res => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json();
        })
      );

      // Unpack with robust fallbacks
      const results = data?.searchResults || data?.results || [];
      const answerText = data?.generatedAnswer || data?.answer || data?.summary?.text || '';
      const citations = data?.citations || data?.summary?.summaryWithMetadata?.citationMetadata?.citations || [];
      const references = data?.references || data?.summary?.summaryWithMetadata?.references || [];
      const answerHtml = data?.generatedAnswerHtml || '';
      const answerSources = data?.answerSources || [];

      renderResults(results);
      renderAnswer(answerText, citations, references, answerHtml, answerSources);
    } catch (err) {
      console.error(err);
      resultsContainer.innerHTML = '';
      answerTextEl.innerHTML = '<p class="error">Something went wrong. Please try again.</p>';
    } finally {
      btn.disabled = false;
      form.classList.remove('loading');
    }
  });
})();