import WebServer from '@blockless/sdk-ts/dist/lib/web';

const server = new WebServer();

// Configuration flag - set to true when deployed to enable real search
const USE_REAL_SEARCH = true; // Change from false to true

// Search API configuration (no authentication required!)
const SEARCH_API_URL = "https://api.duckduckgo.com/";

// Health check endpoint
server.get('/health', async (req, res) => {
  res.send(JSON.stringify({
    status: 'ok',
    service: 'mirror-search',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  }));
});

// POST Search endpoint for search queries
server.post('/search', async (req, res) => {
  try {
    const body = req.body || {} as any;
    const query = body.q || body.query || '';
    
    if (!query) {
      res.send(JSON.stringify({
        error: 'Query parameter is required',
        received: body
      }));
      return;
    }

    // Use Search API when deployed, mock data during preview
    const results = USE_REAL_SEARCH 
      ? await performInstantSearch(query)
      : getMockSearchResults(query, 'search');
      
    res.send(JSON.stringify(results));
    
  } catch (error: any) {
    res.send(JSON.stringify({
      error: 'Search failed: ' + error.message,
      timestamp: new Date().toISOString()
    }));
  }
});

// Mock search results function
function getMockSearchResults(query: string, engine: string) {
  const mockResults = [
    {
      title: `${query} - Documentation and Guide`,
      url: `https://example.com/search-result-1?q=${encodeURIComponent(query)}`,
      displayUrl: 'example.com › result-1',
      snippet: `This is a mock search result for "${query}". Real search API will be activated after deployment.`,
      rank: 1
    },
    {
      title: `${query} - Tutorials and Examples`,
      url: `https://docs.example.com/${query.toLowerCase().replace(/\s+/g, '-')}`,
      displayUrl: 'docs.example.com › documentation',
      snippet: `Documentation and tutorials related to ${query}. Powered by search API in production.`,
      rank: 2
    },
    {
      title: `${query} - GitHub Repositories`,
      url: `https://github.com/search?q=${encodeURIComponent(query)}`,
      displayUrl: 'github.com › search',
      snippet: `GitHub repositories and code examples for ${query}. Privacy-preserving search via Mirror Search.`,
      rank: 3
    },
    {
      title: `${query} - Community Discussions`,
      url: `https://stackoverflow.com/questions/tagged/${query.toLowerCase()}`,
      displayUrl: 'stackoverflow.com › questions',
      snippet: `Community discussions and solutions about ${query}. Powered by decentralized Bless Network.`,
      rank: 4
    },
    {
      title: `${query} - Wikipedia Entry`,
      url: `https://en.wikipedia.org/wiki/${query.replace(/\s+/g, '_')}`,
      displayUrl: 'en.wikipedia.org › wiki',
      snippet: `Encyclopedia entry for ${query}. Knowledge base access through privacy-first search.`,
      rank: 5
    }
  ];
  
  // Return properly structured response object
  return {
    query: query,
    engine: 'duckduckgo',
    results: mockResults,
    totalResults: mockResults.length,
    processingTime: Math.floor(Math.random() * 200) + 50, // Random 50-250ms
    timestamp: new Date().toISOString(),
    privacy: {
      queryAnonymized: true,
      ipRotated: true,
      cookiesStripped: true
    },
    source: 'mock_data',
    note: 'Mock results - Search API will be activated when deployed'
  };
}

// Test function to verify if Bless Network headers work with a simple API
async function testBlessHeaders(): Promise<boolean> {
  try {
    // Use the same API that works in Bless examples
    const response = await fetch('https://reqres.in/api/users/2', {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Custom-Test-Header': 'bless-test-value'
      }
    });
    
    const data = await response.json();
    return response.ok && data.data;
  } catch (error) {
    return false;
  }
}

// Search API function
async function performInstantSearch(query: string): Promise<any> {
  const startTime = Date.now();
  
  try {
    // Search API request - NO AUTHENTICATION REQUIRED!
    const searchUrl = `${SEARCH_API_URL}?q=${encodeURIComponent(query)}&format=json&no_html=1`;
    
    // Simple GET request without any custom headers
    const response = await fetch(searchUrl, {
      method: 'GET'
    });

    if (!response.ok) {
      throw new Error(`Search API HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Parse instant answer response
    const results = parseInstantResults(data, query);
    
    const processingTime = Date.now() - startTime;
    
    return {
      query,
      engine: 'search',
      results: results.slice(0, 10),
      totalResults: results.length,
      processingTime,
      timestamp: new Date().toISOString(),
      debug: {
        searchApiWorking: true,
        hasResults: results.length > 0,
        dataReceived: !!data
      },
      source: 'instant_answer_api'
    };
  } catch (error: any) {
    // Return mock data if Search API fails
    const fallbackResults = getMockSearchResults(query, 'search');
    return {
      ...fallbackResults,
      error: `Search API error: ${error.message} - Using fallback results`,
      timestamp: new Date().toISOString(),
      debug: {
        searchApiWorking: false,
        errorMessage: error.message
      }
    };
  }
}

// Parse instant answer response
function parseInstantResults(data: any, query: string): any[] {
  const results: any[] = [];
  
  try {
    // Add main instant answer if available
    if (data.AbstractText && data.AbstractText.trim()) {
      results.push({
        title: data.Heading || `${query} - Instant Answer`,
        url: data.AbstractURL || `https://duckduckgo.com/?q=${encodeURIComponent(query)}`,
        displayUrl: (data.AbstractURL || 'duckduckgo.com').replace(/https?:\/\//, '').split('/')[0],
        snippet: data.AbstractText,
        rank: 1
      });
    }
    
    // Add definition if available
    if (data.Definition && data.Definition.trim()) {
      results.push({
        title: `${query} - Definition`,
        url: data.DefinitionURL || `https://duckduckgo.com/?q=${encodeURIComponent(query)}`,
        displayUrl: (data.DefinitionURL || 'duckduckgo.com').replace(/https?:\/\//, '').split('/')[0],
        snippet: data.Definition,
        rank: results.length + 1
      });
    }
    
    // Add answer if available
    if (data.Answer && data.Answer.trim()) {
      results.push({
        title: `${query} - Quick Answer`,
        url: `https://duckduckgo.com/?q=${encodeURIComponent(query)}`,
        displayUrl: 'duckduckgo.com',
        snippet: data.Answer,
        rank: results.length + 1
      });
    }
    
    // Add related topics
    if (data.RelatedTopics && Array.isArray(data.RelatedTopics)) {
      data.RelatedTopics.slice(0, 5).forEach((topic: any, index: number) => {
        if (topic.Text && topic.FirstURL) {
          // Extract title from HTML result
          const titleMatch = topic.Result?.match(/>([^<]+)</);
          const title = titleMatch ? titleMatch[1] : topic.Text.split(' - ')[0];
          
          results.push({
            title: title || `${query} - Related Topic`,
            url: topic.FirstURL,
            displayUrl: topic.FirstURL.replace(/https?:\/\//, '').split('/')[0],
            snippet: topic.Text,
            rank: results.length + 1
          });
        }
      });
    }
    
    // Add official results if available
    if (data.Results && Array.isArray(data.Results)) {
      data.Results.slice(0, 3).forEach((result: any, index: number) => {
        if (result.Result && result.FirstURL) {
          // Extract title from HTML result
          const titleMatch = result.Result?.match(/>([^<]+)</);
          const title = titleMatch ? titleMatch[1] : result.Text || `${query} - Official Result`;
          
          results.push({
            title: title,
            url: result.FirstURL,
            displayUrl: result.FirstURL.replace(/https?:\/\//, '').split('/')[0],
            snippet: result.Text || `Official result for "${query}" from DuckDuckGo`,
            rank: results.length + 1
          });
        }
      });
    }
    
  } catch (parseError) {
    // Return error info if parsing fails
    return [
      {
        title: `Search Parse Error for "${query}"`,
        url: 'https://duckduckgo.com/?q=' + encodeURIComponent(query),
        displayUrl: 'search engine',
        snippet: `Parse Error: ${parseError} - Please check API response format`,
        rank: 1
      }
    ];
  }
  
  return results.length > 0 ? results : [
    {
      title: `No instant answers found for "${query}"`,
      url: 'https://duckduckgo.com/?q=' + encodeURIComponent(query),
      displayUrl: 'search engine',
      snippet: 'Try a different search term or check search engines for more results',
      rank: 1
    }
  ];
}

// Main HTML page with search functionality
server.get('/', async (req, res) => {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Mirror Search - Privacy-Preserving Search</title>
    
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            color: #333;
        }

        .container {
            max-width: 800px;
            margin: 0 auto;
            padding: 2rem;
        }

        .header {
            text-align: center;
            margin-bottom: 3rem;
            color: white;
        }

        .logo {
            font-size: 3rem;
            margin-bottom: 1rem;
        }

        .search-container {
            background: white;
            border-radius: 15px;
            padding: 2rem;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            margin-bottom: 2rem;
        }

        .search-form {
            display: flex;
            gap: 1rem;
            margin-bottom: 1rem;
        }

        .search-input {
            flex: 1;
            padding: 1rem;
            border: 2px solid #e1e5e9;
            border-radius: 10px;
            font-size: 1rem;
            outline: none;
            transition: border-color 0.3s;
        }

        .search-input:focus {
            border-color: #667eea;
        }

        .search-button {
            padding: 1rem 2rem;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            border-radius: 10px;
            font-size: 1rem;
            cursor: pointer;
            transition: transform 0.2s;
        }

        .search-button:hover {
            transform: translateY(-2px);
        }

        .engine-select {
            padding: 1rem;
            border: 2px solid #e1e5e9;
            border-radius: 10px;
            background: white;
            font-size: 1rem;
        }

        .loading {
            text-align: center;
            padding: 2rem;
            font-size: 1.2rem;
            color: #667eea;
            display: none;
        }

        .results {
            display: none;
        }

        .result-item {
            background: white;
            border-radius: 10px;
            padding: 1.5rem;
            margin-bottom: 1rem;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            transition: transform 0.2s;
        }

        .result-item:hover {
            transform: translateY(-2px);
        }

        .result-title {
            font-size: 1.2rem;
            font-weight: 600;
            margin-bottom: 0.5rem;
        }

        .result-title a {
            color: #1a73e8;
            text-decoration: none;
        }

        .result-title a:hover {
            text-decoration: underline;
        }

        .result-snippet {
            color: #5f6368;
            line-height: 1.6;
            margin-bottom: 0.5rem;
        }

        .result-url {
            color: #1a73e8;
            font-size: 0.9rem;
        }

        .error {
            background: #fee;
            color: #c33;
            padding: 1rem;
            border-radius: 8px;
            margin: 1rem 0;
            display: none;
        }

        .status {
            background: #e8f5e8;
            color: #2d5a2d;
            padding: 1rem;
            border-radius: 8px;
            margin: 1rem 0;
            text-align: center;
        }

        .footer {
            text-align: center;
            color: rgba(255,255,255,0.8);
            margin-top: 3rem;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">🔍</div>
            <h1>Mirror Search</h1>
            <p>Privacy-Preserving Search Engine</p>
        </div>

        <div class="status">
            ✅ Privacy-First Search Engine (${USE_REAL_SEARCH ? 'Live Search' : 'Demo Mode'})!<br>
            🛡️ Powered by Bless Network for privacy-preserving web search
        </div>

        <div class="search-container">
            <form class="search-form" id="searchForm">
                <input 
                    type="text" 
                    class="search-input" 
                    id="searchInput" 
                    placeholder="Enter your search query..."
                    required
                >
                <button type="submit" class="search-button">🔍 Search</button>
            </form>
            
            <!-- TODO: Add more search engines in future -->
            <!-- 
            <div class="engine-options">
                <label><input type="radio" name="engine" value="google"> Google</label>
                <label><input type="radio" name="engine" value="bing"> Bing</label>
                <label><input type="radio" name="engine" value="duckduckgo"> DuckDuckGo</label>
            </div>
            -->
        </div>

        <div id="loading" class="loading">
            🔍 Searching...
        </div>

        <div id="error" class="error"></div>

        <div id="results" class="results"></div>

        <div class="footer">
            <p>🚀 Powered by Mirror Search + Bless Network for privacy</p>
        </div>
    </div>

    <script>
        document.getElementById('searchForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const query = document.getElementById('searchInput').value.trim();
            
            if (!query) {
                alert('Please enter a search term');
                return;
            }

            // Show loading
            document.getElementById('loading').style.display = 'block';
            document.getElementById('results').style.display = 'none';
            document.getElementById('error').style.display = 'none';

            try {
                // Use POST request with JSON payload for real search
                const response = await fetch('/search', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        q: query
                    })
                });

                if (!response.ok) {
                    throw new Error('Search failed: ' + response.status);
                }

                const data = await response.json();
                
                // Hide loading
                document.getElementById('loading').style.display = 'none';
                
                if (data.error) {
                    document.getElementById('error').textContent = data.error;
                    document.getElementById('error').style.display = 'block';
                    return;
                }

                // Display results
                const resultsDiv = document.getElementById('results');
                
                const resultsHtml = data.results.map(result => 
                    '<div class="result-item">' +
                        '<div class="result-title">' +
                            '<a href="' + result.url + '" target="_blank">' +
                                result.title +
                            '</a>' +
                        '</div>' +
                        '<div class="result-snippet">' + result.snippet + '</div>' +
                        '<div class="result-url">' + result.displayUrl + '</div>' +
                    '</div>'
                ).join('');

                let sourceInfo = '';
                if (data.source === 'real_search_engine') {
                    sourceInfo = '🌐 Live search results';
                } else if (data.source === 'fallback_mock') {
                    sourceInfo = '⚠️ Mock results (search engine unavailable)';
                } else {
                    sourceInfo = '🔍 Search results';
                }

                resultsDiv.innerHTML = 
                    '<div style="background: #f0f8ff; padding: 1rem; border-radius: 8px; margin-bottom: 1rem; text-align: center;">' +
                        '🔍 Showing results for: <strong>' + data.query + '</strong>' +
                        '<br><small>⚡ ' + sourceInfo + ' - Processing time: ' + data.processingTime + 'ms</small>' +
                        (data.note ? '<br><small>📝 ' + data.note + '</small>' : '') +
                    '</div>' + resultsHtml;
                
                resultsDiv.style.display = 'block';

            } catch (error) {
                document.getElementById('loading').style.display = 'none';
                document.getElementById('error').textContent = 'Search failed: ' + error.message;
                document.getElementById('error').style.display = 'block';
            }
        });
    </script>
</body>
</html>`;

  res.send(html);
});

server.start();