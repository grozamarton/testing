document.getElementById('search-form').addEventListener('submit', function(e) {
    e.preventDefault();

    const query = document.getElementById('search-input').value;
    if (!query) {
        return;
    }

    const resultsContainer = document.getElementById('results-container');
    resultsContainer.innerHTML = '<h2>Searching...</h2>';

    // Make sure you have your n8n Production URL here
    const n8nWebhookUrl = 'https://martong.app.n8n.cloud/webhook-test/744802d0-09f3-4726-b8c2-d48e9f23c2d9';

    fetch(n8nWebhookUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: query })
    })
    .then(response => response.json())
    .then(data => {
        resultsContainer.innerHTML = '';

        if (data && data.length > 0) {
            resultsContainer.innerHTML = '<h2>Search Results:</h2>';
            data.forEach(item => {
                // The useful information is inside the 'document' object
                const result = item.document;
                const resultItem = document.createElement('div');
                resultItem.classList.add('result-item');

                // **CHANGE 1**: Get title/link from 'derivedStructData'
                const title = result.derivedStructData.title || 'No Title';
                const link = result.derivedStructData.link || '#';
                
                // **CHANGE 2**: Removed snippet as it is not in the data
                resultItem.innerHTML = `
                    <p class="result-title"><a href="${link}" class="result-link" target="_blank">${title}</a></p>
                `;
                resultsContainer.appendChild(resultItem);
            });
        } else {
            resultsContainer.innerHTML = '<h2>No results found.</h2>';
        }
    })
    .catch(error => {
        resultsContainer.innerHTML = '<h2>An error occurred. Please try again.</h2>';
        console.error('Error:', error);
    });
});