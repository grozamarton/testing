(() => {
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
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, m => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[m]));

  // Normalize a Discovery Engine result into {title, link, snippet}
  function normalizeResult(raw, idx) {
    const doc = raw?.document || {};
    const ds = doc.derivedStructData || {};
    const sd = doc.structData || {};
    const title = raw?.title || ds.title || sd.title || doc.title || `Result ${idx + 1}`;
    const link = raw?.uri || ds.link || ds.url || sd.link || sd.url || '';
    let snippet = raw?.snippet;
    if (!snippet && Array.isArray(raw?.snippetInfo)) {
      const ok = raw.snippetInfo.find(s => s?.snippetStatus === 'SUCCESS' && s.snippet);
      snippet = ok?.snippet || '';
    }
    snippet = snippet || ds.snippet || sd.snippet || '';
    return { title, link, snippet };
  }

  // Build a clean “Sources” list from Answer references
  function normalizeReferences(refs) {
    // Answer responses put URIs under documentMetadata.uri (often nested under chunkInfo)
    // We'll look in a few common places and de-dupe by URI.
    const items = [];
    const seen = new Set();

    (refs || []).forEach((r) => {
      const dm = r?.documentMetadata || r?.chunkInfo?.documentMetadata || r?.document_metadata || {};
      const uri = dm.uri || r?.uri || dm.link || '';
      const title = dm.title || r?.title || uri || 'Source';
      if (uri && !seen.has(uri)) {
        seen.add(uri);
        items.push({ uri, title });
      }
    });

    return items;
  }

  function renderResults(results) {
    resultsContainer.innerHTML = '';
    const list = document.createElement('div');
    const heading = document.createElement('h2');
    heading.textContent = 'Results';
    list.appendChild(heading);

    if (!Array.isArray(results) || results.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'muted';
      empty.textContent = 'No results.';
      list.appendChild(empty);
      resultsContainer.appendChild(list);
      return;
    }

    results.forEach((r, i) => {
      const { title, link, snippet } = normalizeResult(r, i);
      const item = document.createElement('div');
      item.className = 'result-item';

      const titleEl = document.createElement('p');
      titleEl.className = 'result-title';
      if (link) {
        const a = document.createElement('a');
        a.href = link;
        a.textContent = title;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.className = 'result-link';
        titleEl.appendChild(a);
      } else {
        titleEl.textContent = title;
      }

      const snipEl = document.createElement('p');
      snipEl.className = 'muted';
      snipEl.textContent = snippet ? snippet.replace(/<[^>]*>/g, '') : '';

      item.appendChild(titleEl);
      if (snippet) item.appendChild(snipEl);
      list.appendChild(item);
    });

    resultsContainer.appendChild(list);
  }

  function renderAnswer(answerText, citations, references) {
    answerTextEl.textContent = '';
    sourcesListEl.innerHTML = '';
    sourcesHeadingEl.style.display = 'none';

    const text = String(answerText || '').trim();
    if (!text) {
      answerTextEl.innerHTML = '<p class="muted">No answer text.</p>';
      return;
    }

    // Keep it simple & safe: show the answer text, then the numbered “Sources” below.
    // (The Answer API’s citation ranges are byte offsets; for robust inline markers we’d
    // need UTF-8 byte-aware slicing. The list below maps 1..N to reference URIs.)
    answerTextEl.textContent = text;

    const refs = normalizeReferences(references);
    if (refs.length) {
      sourcesHeadingEl.style.display = '';
      refs.forEach((ref, i) => {
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.href = ref.uri;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.textContent = ref.title || ref.uri;
        li.appendChild(a);
        sourcesListEl.appendChild(li);
      });
    }
  }

  async function fetchWithTimeout(url, opts = {}, ms = FETCH_TIMEOUT_MS) {
    const ctrl = new AbortController();
    const id = setTimeout(() => ctrl.abort(), ms);
    try {
      const res = await fetch(url, { ...opts, signal: ctrl.signal });
      return res;
    } finally {
      clearTimeout(id);
    }
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const q = (input.value || '').trim();
    if (!q) return;

    // UI loading state
    btn.disabled = true;
    form.classList.add('loading');
    resultsContainer.innerHTML = '<h2>Searching…</h2>';
    answerTextEl.innerHTML = '';
    sourcesHeadingEl.style.display = 'none';
    sourcesListEl.innerHTML = '';

    try {
      const res = await fetchWithTimeout(N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q })
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      // Defensive parsing: accept either the new shape (with citations) or old one.
      const results = data?.searchResults || data?.results || [];
      const answerText = data?.generatedAnswer || data?.summary?.summaryText || '';
      const citations = data?.citations || data?.summary?.summaryWithMetadata?.citationMetadata?.citations || [];
      const references = data?.references || data?.summary?.summaryWithMetadata?.references || [];

      renderResults(results);
      renderAnswer(answerText, citations, references);
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