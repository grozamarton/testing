document.getElementById('search-form').addEventListener('submit', function(e) {
    e.preventDefault(); // Prevents the form from submitting and reloading the page

    const query = document.getElementById('search-input').value;
    if (!query) {
        return; // Don't do anything if the input is empty
    }

    const resultsContainer = document.getElementById('results-container');
    resultsContainer.innerHTML = '<h2>Searching...</h2>'; // Show a loading message

    // This is the URL of your n8n webhook. YOU NEED TO REPLACE THIS.
    const n8nWebhookUrl = 'YOUR_N8N_WEBHOOK_URL_HERE';

    // Make the request to your n8n workflow
    fetch(`${n8nWebhookUrl}?q=${encodeURIComponent(query)}`)
        .then(response => response.json())
        .then(data => {
            // Check if the response is valid and has results
            if (data && data.results && data.results.length > 0) {
                resultsContainer.innerHTML = '<h2>Search Results:</h2>';
                data.results.forEach(result => {
                    const resultItem = document.createElement('div');
                    resultItem.classList.add('result-item');
                    resultItem.innerHTML = `
                        <p class="result-title"><a href="${result.link}" class="result-link" target="_blank">${result.title}</a></p>
                        <p>${result.snippet}</p>
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