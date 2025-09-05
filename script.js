document.getElementById('search-form').addEventListener('submit', function(e) {
    e.preventDefault(); // Prevents the form from submitting and reloading the page

    const query = document.getElementById('search-input').value;
    if (!query) {
        return; // Don't do anything if the input is empty
    }

    const resultsContainer = document.getElementById('results-container');
    resultsContainer.innerHTML = '<h2>Searching...</h2>'; // Show a loading message

    // Make sure you replace this placeholder with your actual n8n Production URL
    const n8nWebhookUrl = 'https://martong.app.n8n.cloud/webhook-test/744802d0-09f3-4726-b8c2-d48e9f23c2d9';

    // Make the POST request to your n8n workflow
    fetch(n8nWebhookUrl, {
        method: 'POST', // Use the POST method
        headers: {
            'Content-Type': 'application/json', // Tell the server we are sending JSON
        },
        body: JSON.stringify({ query: query }) // Send the query in the body as JSON
    })
    .then(response => response.json())
    .then(data => {
        resultsContainer.innerHTML = ''; // Clear the "Searching..." message

        // The API returns an array of result items. Check if the array is not empty.
        if (data && data.length > 0) {
            resultsContainer.innerHTML = '<h2>Search Results:</h2>';
            // Loop through the data array directly
            data.forEach(item => {
                // The useful information is inside the 'document' object
                const result = item.document;
                const resultItem = document.createElement('div');
                resultItem.classList.add('result-item');

                // Get the title and link from the 'structData' property
                const title = result.structData.title || 'No Title';
                const link = result.structData.link || '#';
                // Get the description from the 'snippets' array
                const snippet = (result.snippets && result.snippets.length > 0) ? result.snippets[0].snippet : 'No snippet available.';

                resultItem.innerHTML = `
                    <p class="result-title"><a href="${link}" class="result-link" target="_blank">${title}</a></p>
                    <p>${snippet}</p>
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