import WebServer from '@blockless/sdk-ts/dist/lib/web';
import { searchEngines } from './src/search-engines';
import { wasmLLM } from './src/wasm-llm';

const server = new WebServer();

// Serve static files from public directory
server.statics('public', '/');

// Health check endpoint
server.get('/health', async (req, res) => {
  try {
    const healthStatus = await searchEngines.healthCheck();
    res.send(JSON.stringify(healthStatus));
  } catch (error) {
    res.send(JSON.stringify({ 
      error: 'Health check failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }));
  }
});

// WASM LLM status endpoint
server.get('/llm-status', async (req, res) => {
  try {
    // Trigger initialization if not already done
    if (!wasmLLM.initialized) {
      await wasmLLM.initialize();
    }
    
    const llmStatus = await wasmLLM.getStatus();
    res.send(JSON.stringify({
      status: 'ok',
      llm: llmStatus,
      timestamp: Date.now(),
      details: {
        modelType: llmStatus.modelType,
        modelPath: llmStatus.modelPath,
        tinyLlamaLoaded: llmStatus.modelLoaded,
        rulesCount: llmStatus.rulesCount,
        version: llmStatus.version
      }
    }));
  } catch (error) {
    res.send(JSON.stringify({ 
      error: 'LLM status check failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }));
  }
});

// Proxy endpoint for Bright Data (to bypass WASM limitations)
server.post('/proxy/brightdata', async (req, res) => {
  try {
    // This endpoint acts as a proxy for Bright Data API
    // In production, this would be on a separate server
    const proxyResponse = {
      error: 'Bright Data proxy not configured',
      message: 'To use Bright Data, deploy a proxy server with proper authentication',
      alternative: 'Using DuckDuckGo as primary search engine'
    };
    res.send(JSON.stringify(proxyResponse));
  } catch (error) {
    res.send(JSON.stringify({ 
      error: 'Proxy failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }));
  }
});

// Search endpoint with WASM LLM integration
server.post('/search', async (req, res) => {
  try {
    // Parse request body
    let body;
    if (typeof req.body === 'string') {
      try {
        body = JSON.parse(req.body);
      } catch (parseError) {
        const errorResponse = {
          error: 'Invalid JSON format',
          message: 'Request body must be valid JSON'
        };
        res.send(JSON.stringify(errorResponse));
        return;
      }
    } else {
      body = req.body || {};
    }

    const { query, useAnonymization = true } = body;
    
    if (!query || typeof query !== 'string') {
      const errorResponse = { 
        error: 'Invalid query parameter',
        message: 'Query must be a non-empty string'
      };
      res.send(JSON.stringify(errorResponse));
      return;
    }

    // Perform search with WASM LLM integration
    try {
      const searchResult = await searchEngines.search(query, useAnonymization);
      
      // Extra validation to ensure we have a valid JSON object
      if (!searchResult || typeof searchResult !== 'object') {
        throw new Error('Invalid search result object');
      }
      
      // Ensure the result has required properties
      if (!Array.isArray(searchResult.results)) {
        searchResult.results = [];
      }
      
      // Clean JSON response - no emojis, no HTML
      const safeResponse = {
        ...searchResult,
        results: searchResult.results.map(result => ({
          title: String(result.title || ''),
          url: String(result.url || ''),
          snippet: String(result.snippet || ''),
          source: String(result.source || '')
        })),
        debug_info: {
          engine: searchResult.engine,
          errorInfo: searchResult.errorInfo || {},
          query: query,
          anonymized: searchResult.status?.anonymized || false
        }
      };
      
      res.send(JSON.stringify(safeResponse));
    } catch (searchError) {
      const errorResponse = { 
        error: 'Search engine error',
        message: searchError instanceof Error ? searchError.message : 'Search processing failed'
      };
      res.send(JSON.stringify(errorResponse));
    }
    
  } catch (error) {
    const errorResponse = { 
      error: 'Search failed',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    };
    res.send(JSON.stringify(errorResponse));
  }
});

// TinyLlama Status Page
server.get('/tinyllama-status', (req, res) => {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>TinyLlama Status - Mirror Search</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
        .container { max-width: 800px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .status-item { padding: 15px; margin: 10px 0; border-radius: 8px; border-left: 4px solid #3b82f6; background: #f8fafc; }
        .status-item.success { border-left-color: #10b981; background: #f0fdf4; }
        .status-item.warning { border-left-color: #f59e0b; background: #fffbeb; }
        .status-item.error { border-left-color: #ef4444; background: #fef2f2; }
        .code { background: #1f2937; color: #f9fafb; padding: 15px; border-radius: 6px; font-family: monospace; overflow-x: auto; }
        .refresh-btn { background: #3b82f6; color: white; padding: 10px 20px; border: none; border-radius: 6px; cursor: pointer; margin: 20px 0; }
        .refresh-btn:hover { background: #2563eb; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🧠 TinyLlama Status</h1>
        <button class="refresh-btn" onclick="location.reload()">🔄 Refresh Status</button>
        
        <div id="status-container">
            <div class="status-item">
                <strong>Loading TinyLlama status...</strong>
            </div>
        </div>
        
        <h2>📊 Real-time Test</h2>
        <input type="text" id="testQuery" placeholder="Test query (e.g., best restaurants in Boston)" style="width: 70%; padding: 10px; margin-right: 10px;">
        <button onclick="testAnonymization()" style="padding: 10px 20px; background: #10b981; color: white; border: none; border-radius: 4px; cursor: pointer;">Test</button>
        
        <div id="test-results" style="margin-top: 20px;"></div>
    </div>

    <script>
        async function loadStatus() {
            try {
                const response = await fetch('/llm-status');
                const data = await response.json();
                
                const container = document.getElementById('status-container');
                container.innerHTML = '';
                
                // Model Type
                const modelTypeClass = data.details.tinyLlamaLoaded ? 'success' : 'warning';
                container.innerHTML += '<div class="status-item ' + modelTypeClass + '"><strong>Model Type:</strong> ' + data.details.modelType + '</div>';
                
                // Model Loaded
                const loadedClass = data.details.tinyLlamaLoaded ? 'success' : 'error';
                container.innerHTML += '<div class="status-item ' + loadedClass + '"><strong>TinyLlama Loaded:</strong> ' + (data.details.tinyLlamaLoaded ? 'Yes ✅' : 'No ❌') + '</div>';
                
                // Model Path
                container.innerHTML += '<div class="status-item"><strong>Model Path:</strong> ' + data.details.modelPath + '</div>';
                
                // Rules Count
                container.innerHTML += '<div class="status-item"><strong>Anonymization Rules:</strong> ' + data.details.rulesCount + '</div>';
                
                // Version
                container.innerHTML += '<div class="status-item"><strong>Version:</strong> ' + data.details.version + '</div>';
                
                // Raw JSON
                container.innerHTML += '<h3>🔍 Raw Status Data</h3><div class="code">' + JSON.stringify(data, null, 2) + '</div>';
                
            } catch (error) {
                document.getElementById('status-container').innerHTML = '<div class="status-item error"><strong>Error:</strong> ' + error.message + '</div>';
            }
        }
        
        async function testAnonymization() {
            const query = document.getElementById('testQuery').value;
            if (!query) return;
            
            const resultsDiv = document.getElementById('test-results');
            resultsDiv.innerHTML = '<div class="status-item">Testing anonymization...</div>';
            
            try {
                const response = await fetch('/search', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ query: query, useAnonymization: true })
                });
                
                const data = await response.json();
                
                if (data.debug) {
                    const methodClass = data.debug.anonymizationMethod === 'tinyllama' ? 'success' : 'warning';
                    resultsDiv.innerHTML = 
                        '<div class="status-item ' + methodClass + '"><strong>Method:</strong> ' + data.debug.anonymizationMethod + '</div>' +
                        '<div class="status-item"><strong>Original:</strong> ' + data.debug.originalQuery + '</div>' +
                        '<div class="status-item"><strong>Anonymized:</strong> ' + data.debug.anonymizedQuery + '</div>' +
                        '<div class="status-item"><strong>Confidence:</strong> ' + (data.debug.confidence * 100).toFixed(1) + '%</div>';
                } else {
                    resultsDiv.innerHTML = '<div class="status-item error">No debug information available</div>';
                }
                
            } catch (error) {
                resultsDiv.innerHTML = '<div class="status-item error"><strong>Test Error:</strong> ' + error.message + '</div>';
            }
        }
        
        // Load status on page load
        loadStatus();
    </script>
</body>
</html>`;
  
  res.send(html);
});

// Serve static files
server.get('/', (req, res) => {
  // Read and serve index.html with inline CSS and JS
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Mirror Search - Privacy-First AI Search</title>
    <link rel="icon" type="image/png" href="assets/logo-icon.png">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <style>
        /* Modern CSS Variables */
        :root {
            --primary-color: #4f46e5;
            --primary-hover: #4338ca;
            --secondary-color: #6b7280;
            --success-color: #10b981;
            --warning-color: #f59e0b;
            --error-color: #ef4444;
            --background: #ffffff;
            --surface: rgba(255, 255, 255, 0.95);
            --surface-glass: rgba(255, 255, 255, 0.1);
            --text-primary: #1f2937;
            --text-secondary: #6b7280;
            --text-light: #ffffff;
            --border: #e5e7eb;
            --border-glass: rgba(255, 255, 255, 0.2);
            --shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            --shadow-lg: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
            --shadow-glass: 0 8px 32px 0 rgba(31, 38, 135, 0.37);
            --radius: 1rem;
            --radius-lg: 1.5rem;
            --transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background-image: url('assets/background.png');
            color: var(--text-primary);
            line-height: 1.6;
            min-height: 100vh;
            overflow-x: hidden; 
        }

        body::before {
            content: '';
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100vh;
            background-image: url('assets/background.png');
            background-size: cover;
            background-position: center bottom -52px;
            z-index: -1;
            opacity: 1;x
        }

        body::after {
            content: '';
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100vh;
            background-image: url('assets/background.png');
            background-size: cover;
            background-position: center bottom -52px;
            z-index: -2;
            opacity: 0;
            transition: opacity 0.8s ease-in-out;
        }

        body.search-active::after {
            opacity: 1;
            z-index: -1;
        }

        body.search-active::before {
            opacity: 0;
            z-index: -2;
        }

        .container {
            max-width: 1400px;
            margin: 0 auto;
            display: flex;
            padding: 2rem;
            min-height: 100vh;
            align-items: flex-start;
            justify-content: flex-start;
            padding-top: 4rem;
        }

        /* Search Interface */
        .search-side {
            display: flex;
            flex-direction: column;
            gap: 2rem;
            margin-left: 4rem;
            max-width: 500px;
            width: 100%;
        }

        /* Glass Morphism Card */
        .search-card {
            background: var(--surface-glass);
            backdrop-filter: blur(20px);
            border: 1px solid var(--border-glass);
            border-radius: var(--radius-lg);
            padding: 1.5rem;
            box-shadow: var(--shadow-glass);
            transition: var(--transition);
        }

        .search-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 12px 40px 0 rgba(31, 38, 135, 0.5);
        }

        /* Logo and Branding */
        .brand-section {
            text-align: center;
            margin-bottom: 0;
        }

        .logo-container { 
            align-items: center;
            gap: 0.75rem;
        }

        .logo-icon {
            width: 14.5rem;
            height: 14.5rem; 
        }

        .logo {
            font-size: 2rem;
            font-weight: 700;
            color: var(--text-light);
            margin: 0;
            text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .tagline {
            font-size: 1rem;
            color: rgba(255, 255, 255, 0.8);
            margin-bottom: 1rem;
            font-weight: 300;
        }

        .ai-badge {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.75rem 1.5rem;
            background: rgba(255, 255, 255, 0.2);
            backdrop-filter: blur(10px);
            color: white;
            border-radius: 2rem;
            font-size: 0.875rem;
            font-weight: 500;
            box-shadow: var(--shadow);
            transition: var(--transition);
            border: 1px solid var(--border-glass);
        }

        .ai-badge:hover {
            transform: translateY(-2px);
            box-shadow: var(--shadow-lg);
        }

        /* Search Box */
        .search-box-container {
            margin-bottom: 0;
        }

        .search-box {
            position: relative;
            display: flex;
            margin-bottom: 1rem;
        }

        #searchInput {
            flex: 1;
            width: 100%;
            padding: 1rem 5rem 1rem 1.5rem;
            border: 2px solid var(--border-glass);
            border-radius: var(--radius);
            font-size: 1rem;
            transition: var(--transition);
            background: rgba(255, 255, 255, 0.9);
            backdrop-filter: blur(10px);
            color: var(--text-primary);
        }

        #searchInput::placeholder {
            color: var(--text-secondary);
        }

        #searchInput:focus {
            outline: none;
            border-color: var(--primary-color);
            box-shadow: 0 0 0 4px rgba(79, 70, 229, 0.1);
            background: rgba(255, 255, 255, 0.95);
        }

        .search-button {
            position: absolute;
            right: 0.5rem;
            top: 50%;
            transform: translateY(-50%);
            padding: 0.5rem;
            background: transparent;
            color: var(--text-secondary);
            border: none;
            border-radius: 50%;
            font-size: 1.2rem;
            cursor: pointer;
            transition: var(--transition);
            display: flex;
            align-items: center;
            justify-content: center;
            width: 2.5rem;
            height: 2.5rem;
        }

        .search-button:hover:not(:disabled) {
            background: rgba(79, 70, 229, 0.1);
            color: var(--primary-color);
            transform: translateY(-50%) scale(1.1);
        }

        .search-button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }

        /* Privacy Options */
        .privacy-options {
            display: flex;
            align-items: center;
            gap: 1rem;
        }

        .privacy-toggle {
            display: flex;
            align-items: center;
            gap: 1rem;
            cursor: pointer;
            font-size: 0.95rem;
            color: rgba(255, 255, 255, 0.9);
            font-weight: 500;
        }

        .toggle-slider {
            position: relative;
            width: 52px;
            height: 28px;
            background: rgba(255, 255, 255, 0.3);
            border-radius: 14px;
            transition: var(--transition);
            border: 1px solid var(--border-glass);
        }

        .toggle-slider::before {
            content: '';
            position: absolute;
            top: 2px;
            left: 2px;
            width: 22px;
            height: 22px;
            background: white;
            border-radius: 50%;
            transition: var(--transition);
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }

        input[type="checkbox"]:checked + .toggle-slider {
            background: rgb(77 139 169);
            border-color: rgba(255, 255, 255, 0.6);
        }

        input[type="checkbox"]:checked + .toggle-slider::before {
            transform: translateX(24px);
        }

        input[type="checkbox"] {
            display: none;
        }

        /* Status Bar */
        .status-bar {
            display: flex;
            gap: 1rem;
            flex-wrap: wrap;
        }

        .status-item {
            display: flex;
            align-items: center;
            gap: 0.25rem;
            padding: 0.5rem 0.75rem;
            background: rgba(255, 255, 255, 0.2);
            backdrop-filter: blur(10px);
            border-radius: 0.75rem;
            font-size: 0.75rem;
            font-weight: 500;
            transition: var(--transition);
            border: 1px solid var(--border-glass);
            color: rgba(255, 255, 255, 0.9);
        }

        .status-item.active {
            background: var(--success-color);
            color: white;
            border-color: var(--success-color);
        }

        .status-link {
            text-decoration: none;
            cursor: pointer;
        }

        .status-link:hover {
            background: rgba(255, 255, 255, 0.3);
            transform: translateY(-2px);
        }

        /* Right Side - Visual Space */
        .visual-side {
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 60vh;
        }

        .visual-content {
            text-align: center;
            color: rgba(255, 255, 255, 0.8);
        }

        .visual-title {
            font-size: 3rem;
            font-weight: 300;
            margin-bottom: 1rem;
            text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .visual-subtitle {
            font-size: 1.25rem;
            font-weight: 400;
            opacity: 0.8;
        }

        /* Loading State */
        .loading-state {
            text-align: center;
            padding: 2rem;
            background: var(--surface-glass);
            backdrop-filter: blur(20px);
            border-radius: var(--radius-lg);
            border: 1px solid var(--border-glass);
            margin: 5rem 0rem 0rem 15rem;
        }

        .loading-spinner {
            width: 40px;
            height: 40px;
            border: 3px solid rgba(255, 255, 255, 0.3);
            border-top: 3px solid var(--primary-color);
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto 2rem;
        }

        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }

        .loading-step {
            padding: 0.75rem;
            margin: 0.5rem 0;
            border-radius: var(--radius);
            opacity: 0.5;
            transition: var(--transition);
            color: rgba(255, 255, 255, 0.8);
        }

        .loading-step.active {
            opacity: 1;
            background: rgba(255, 255, 255, 0.1);
            font-weight: 500;
        }

        /* Results */
        .results-container {
            margin-top: 7.3rem;
            padding-left: 1rem;
        }

        .results-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 1.5rem;
            background: var(--surface-glass);
            backdrop-filter: blur(20px);
            border-radius: var(--radius-lg);
            margin-bottom: 1.5rem;
            font-size: 0.95rem;
            color: rgba(255, 255, 255, 0.9);
            border: 1px solid var(--border-glass);
        }

        .results-info {
            display: flex;
            gap: 1.5rem;
            flex-wrap: wrap;
        }

        .privacy-badge {
            padding: 0.5rem 1rem;
            background: rgba(255, 255, 255, 0.2);
            backdrop-filter: blur(10px);
            color: white;
            border-radius: 1.5rem;
            font-size: 0.8rem;
            font-weight: 600;
            border: 1px solid var(--border-glass);
        }

        .debug-method {
            padding: 0.5rem 1rem;
            background: rgba(255, 255, 255, 0.2);
            backdrop-filter: blur(10px);
            color: white;
            border-radius: 1.5rem;
            font-size: 0.8rem;
            font-weight: 600;
            border: 1px solid var(--border-glass);
        }

        .debug-method.onnx-llm {
            background: rgba(255, 255, 255, 0.2);
            backdrop-filter: blur(10px);
        }

        .debug-method.rule-based {
            background: rgba(255, 255, 255, 0.2);
            backdrop-filter: blur(10px);
        }

        .debug-method.fallback {
            background: rgba(255, 255, 255, 0.2);
            backdrop-filter: blur(10px);
        }

        .result-item {
            background: var(--surface);
            backdrop-filter: blur(20px);
            border: 1px solid var(--border-glass);
            border-radius: var(--radius-lg);
            padding: 2rem;
            margin-bottom: 1.5rem;
            transition: var(--transition);
            animation: slideIn 0.4s ease-out;
        }

        .result-item:hover {
            transform: translateY(-4px);
            box-shadow: var(--shadow-lg);
        }

        @keyframes slideIn {
            from {
                opacity: 0;
                transform: translateY(30px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        .result-title {
            margin: 0 0 1rem 0;
            font-size: 1.25rem;
            font-weight: 600;
        }

        .result-title a {
            color: var(--primary-color);
            text-decoration: none;
            transition: var(--transition);
        }

        .result-title a:hover {
            color: var(--primary-hover);
        }

        .result-snippet {
            color: var(--text-secondary);
            margin-bottom: 1rem;
            line-height: 1.7;
            font-size: 0.95rem;
        }

        .result-url {
            font-size: 0.875rem;
            color: var(--success-color);
            word-break: break-all;
            font-weight: 500;
        }

        /* Empty State */
        .empty-state {
            text-align: center;
            padding: 3rem;
            color: rgba(255, 255, 255, 0.8);
        }

        .empty-icon {
            font-size: 4rem;
            margin-bottom: 1.5rem;
            opacity: 0.6;
        }

        .empty-state h3 {
            font-size: 1.5rem;
            font-weight: 600;
            margin-bottom: 2rem;
            color: rgba(255, 255, 255, 0.9);
        }

        .features-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 1.5rem;
            margin-top: 2rem;
        }

        .feature {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 0.75rem;
            padding: 1.5rem;
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            border-radius: var(--radius);
            border: 1px solid var(--border-glass);
            transition: var(--transition);
        }

        .feature:hover {
            transform: translateY(-4px);
            background: rgba(255, 255, 255, 0.15);
        }

        .feature-icon {
            font-size: 2rem;
        }

        .feature-text {
            font-weight: 500;
            text-align: center;
        }

        /* Error State */
        .error-state {
            text-align: center;
            padding: 3rem;
            background: var(--surface-glass);
            backdrop-filter: blur(20px);
            border-radius: var(--radius-lg);
            border: 1px solid var(--border-glass);
            margin-top: 5rem 0rem 0rem 15rem;
            color: rgba(255, 255, 255, 0.9);
        }

        .error-icon {
            font-size: 3rem;
            margin-bottom: 1rem;
            color: var(--error-color);
        }

        .retry-button {
            padding: 1rem 2rem;
            background: var(--primary-color);
            color: white;
            border: none;
            border-radius: var(--radius);
            font-weight: 600;
            cursor: pointer;
            transition: var(--transition);
            margin-top: 1.5rem;
        }

        .retry-button:hover {
            background: var(--primary-hover);
            transform: translateY(-2px);
        }

        /* Responsive Design */
        @media (max-width: 1024px) {
            .container {
                padding: 1.5rem;
                padding-top: 3rem;
                display: block;
            }
            
            .search-side {
                max-width: 100%;
                margin-left:0;
            }
            .results-container {
                margin-top: 3.3rem;
            }
            .results-header {
                display: flex;
                /* justify-content: space-between; */
                align-items: flex-start;
                padding: 1.5rem;
                background: var(--surface-glass);
                backdrop-filter: blur(20px);
                border-radius: var(--radius-lg);
                margin-bottom: 1.5rem;
                font-size: 0.95rem;
                color: rgba(255, 255, 255, 0.9);
                border: 1px solid var(--border-glass);
                flex-direction: column;
            } 
                .debug-method {
                    margin-bottom: 1rem;
                }
                    body::before{
                    background-position: center left;
                    }
        }

        @media (max-width: 768px) {
            .container {
                padding: 1rem;
                padding-top: 2rem;
                display: block;
            }
            body::before{
                    background-position: center left;
                    }
            .search-card {
                padding: 1rem;
            }
            
            .search-box {
                margin-bottom: 1rem;
            }
            
            #searchInput {
                padding: 1rem 4rem 1rem 1rem;
                font-size: 0.9rem;
            }
            
            .search-button {
                padding: 0.4rem 0.8rem;
                font-size: 0.8rem;
            }
            
            .logo-container {
                gap: 0.5rem;
            }
            
            .logo {
                font-size: 1.5rem;
            }
        }

        /* Utility Classes */
        .hidden {
            display: none !important;
        }

        .fade-in {
            animation: fadeIn 0.5s ease-out;
        }

        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- Left Side - Search Interface -->
        <div class="search-side">
            <!-- Main Search Card -->
            <div>
                <!-- Brand Section -->
                <div class="brand-section">
                    <div class="logo-container">
                       <a href="https://coffee-cockroach-rachelle-6byahvr4.bls.dev"> <img src="assets/logo-icon.png" alt="Mirror Search" class="logo-icon">
                         </a>
                    </div>
                </div>

                <!-- Search Box -->
                <div class="search-box-container">
                    <div class="search-box">
                        <input 
                            type="text" 
                            id="searchInput" 
                            placeholder="Search anything privately..."
                            autocomplete="off"
                        >
                        <button id="searchButton" class="search-button">
                            🔍
                        </button>
                    </div>

                    <!-- Privacy Options -->
                    <div class="privacy-options">
                        <label class="privacy-toggle">
                            <input type="checkbox" id="anonymizationToggle">
                            <span class="toggle-slider"></span>
                        </label>
                        <span class="toggle-label">AI Query Anonymization</span>
                    </div>
                </div>
            </div>
        </div>

        <!-- Loading State -->
        <div id="loadingState" class="loading-state hidden">
            <div class="loading-spinner"></div>
            <div class="loading-text">
                <div class="loading-step active" id="step-anonymizing">Anonymizing query with AI...</div>
                <div class="loading-step" id="step-searching">Searching securely...</div>
                <div class="loading-step" id="step-processing">Processing results...</div>
            </div>
        </div>

        <!-- Results Container -->
        <div id="resultsContainer" class="results-container hidden">
            <div class="results-header">
                <div class="results-info">
                    <span id="resultsCount">0 results</span>
                    <span id="searchTime">0ms</span>
                    <span id="searchEngine">Unknown</span>
                    <span id="debugMethod" class="debug-method hidden"></span>
                </div>
            </div>
            <div id="resultsList" class="results-list"></div>
        </div>

        <!-- Error State -->
        <div id="errorState" class="error-state hidden">
            <div class="error-icon">⚠️</div>
            <h3>Search Error</h3>
            <p id="errorMessage">Something went wrong. Please try again.</p>
            <button id="retryButton" class="retry-button">Try Again</button>
        </div>
    </div>

    <script>
        class MirrorSearch {
            constructor() {
                this.searchInput = document.getElementById('searchInput');
                this.searchButton = document.getElementById('searchButton');
                this.anonymizationToggle = document.getElementById('anonymizationToggle');
                this.loadingState = document.getElementById('loadingState');
                this.resultsContainer = document.getElementById('resultsContainer');
                this.resultsList = document.getElementById('resultsList');
                this.errorState = document.getElementById('errorState');
                this.retryButton = document.getElementById('retryButton');
                
                this.currentQuery = '';
                this.isSearching = false;
                
                this.init();
            }

            init() {
                this.bindEvents();
                this.updateStatusBar();
            }

            bindEvents() {
                this.searchButton.addEventListener('click', () => {
                    this.performSearch();
                });

                this.searchInput.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        this.performSearch();
                    }
                });

                this.retryButton.addEventListener('click', () => {
                    this.performSearch();
                });

                document.addEventListener('keydown', (e) => {
                    if (e.key === '/' && document.activeElement !== this.searchInput) {
                        e.preventDefault();
                        this.searchInput.focus();
                    }
                    if (e.key === 'Escape') {
                        this.hideAllStates();
                        document.body.classList.remove('search-active');
                    }
                });
            }

            async performSearch() {
                const query = this.searchInput.value.trim();
                
                if (!query) {
                    this.showError('Please enter a search query');
                    return;
                }

                if (this.isSearching) {
                    return;
                }

                this.currentQuery = query;
                this.isSearching = true;
                
                // Activate second background when search starts
                document.body.classList.add('search-active');
                
                this.showLoadingState();
                this.updateSearchButton(true);

                try {
                    const cleanQuery = query.replace(/[\\u{1F600}-\\u{1F64F}]|[\\u{1F300}-\\u{1F5FF}]|[\\u{1F680}-\\u{1F6FF}]|[\\u{1F1E0}-\\u{1F1FF}]|[\\u{2600}-\\u{26FF}]|[\\u{2700}-\\u{27BF}]/gu, '').trim();
                    
                    const requestBody = {
                        query: cleanQuery,
                        useAnonymization: this.anonymizationToggle.checked
                    };

                    const response = await fetch('/search', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(requestBody)
                    });

                    if (!response.ok) {
                        throw new Error('HTTP ' + response.status + ': ' + response.statusText);
                    }

                    const data = await response.json();
                    
                    if (data.error) {
                        throw new Error(data.message || data.error);
                    }

                    this.displayResults(data);
                    
                } catch (error) {
                    this.showError(error.message || 'Search failed. Please try again.');
                } finally {
                    this.isSearching = false;
                    this.updateSearchButton(false);
                }
            }

            showLoadingState() {
                this.hideAllStates();
                this.loadingState.classList.remove('hidden');
                
                const steps = ['step-anonymizing', 'step-searching', 'step-processing'];
                let currentStep = 0;
                
                const animateSteps = () => {
                    steps.forEach(step => {
                        const element = document.getElementById(step);
                        if (element) element.classList.remove('active');
                    });
                    
                    if (currentStep < steps.length) {
                        const element = document.getElementById(steps[currentStep]);
                        if (element) element.classList.add('active');
                        currentStep++;
                        
                        if (this.isSearching && currentStep < steps.length) {
                            // WASM uyumlu - setTimeout yerine Promise.resolve()
                            Promise.resolve().then(() => {
                                Promise.resolve().then(() => {
                                    Promise.resolve().then(animateSteps);
                                });
                            });
                        }
                    }
                };
                
                animateSteps();
            }

            displayResults(data) {
                this.hideAllStates();
                
                if (!data.results || data.results.length === 0) {
                    this.showError('No results found. Try a different search term.');
                    return;
                }

                document.getElementById('resultsCount').textContent = data.totalResults + ' results';
                document.getElementById('searchTime').textContent = data.totalTime + 'ms';
                document.getElementById('searchEngine').textContent = data.engine;
                
                const debugMethodElement = document.getElementById('debugMethod');
                
                debugMethodElement.textContent = '';
                debugMethodElement.className = 'debug-method'; // Temel sınıfı ayarla
                debugMethodElement.classList.add('hidden');

                if (data.debug && data.debug.anonymizationMethod === 'onnx-llm') {
                    debugMethodElement.textContent = 'Method: ' + data.debug.anonymizationMethod;
                    debugMethodElement.classList.add('onnx-llm'); // Yönteme özel sınıfı ekle
                    debugMethodElement.classList.remove('hidden'); // Görünür yap
                }
                
                this.resultsList.innerHTML = '';
                
                data.results.forEach((result, index) => {
                    const resultElement = this.createResultElement(result, index);
                    this.resultsList.appendChild(resultElement);
                });

                this.resultsContainer.classList.remove('hidden');
                this.updateStatusBar(data.status);
            }

            createResultElement(result, index) {
                const div = document.createElement('div');
                div.className = 'result-item';
                div.style.animationDelay = (index * 100) + 'ms';
                
                const sourceColor = this.getSourceColor(result.source);
                
                div.innerHTML = '<div class="result-header">' +
                    '<h3 class="result-title">' +
                        '<a href="' + result.url + '" target="_blank" rel="noopener noreferrer">' +
                            this.escapeHtml(result.title) +
                        '</a>' +
                    '</h3>' +
                '</div>' +
                '<p class="result-snippet">' + this.escapeHtml(result.snippet) + '</p>' +
                '<div class="result-url">' + this.escapeHtml(result.url) + '</div>';
                
                return div;
            }

            getSourceColor(source) {
                const colors = {
                    'DuckDuckGo': '#de5833',
                    'DuckDuckGo Instant': '#de5833',
                    'DuckDuckGo Definition': '#de5833',
                    'DuckDuckGo Answer': '#de5833',
                    'DuckDuckGo Related': '#de5833',
                    'Google': '#4285f4',
                    'Bing': '#0078d4',
                    'Yahoo': '#7b0099'
                };
                return colors[source] || '#6b7280';
            }

            showError(message) {
                this.hideAllStates();
                document.getElementById('errorMessage').textContent = message;
                this.errorState.classList.remove('hidden');
            }

            hideAllStates() {
                this.loadingState.classList.add('hidden');
                this.resultsContainer.classList.add('hidden');
                this.errorState.classList.add('hidden');
            }

            updateSearchButton(isLoading) {
                if (isLoading) {
                    this.searchButton.disabled = true;
                    this.searchButton.innerHTML = '⏳';
                } else {
                    this.searchButton.disabled = false;
                    this.searchButton.innerHTML = '🔍';
                }
            }

            updateStatusBar(status = null) {
                // Status bar artık active sınıfı kullanmıyor
                // Tüm status itemlar her zaman aynı görünümde kalıyor
            }

            escapeHtml(text) {
                const div = document.createElement('div');
                div.textContent = text;
                return div.innerHTML;
            }
        }

        document.addEventListener('DOMContentLoaded', () => {
            new MirrorSearch();
        });
    </script>
</body>
</html>`;
  
  res.send(html);
});

// Serve CSS
server.get('/style.css', (req, res) => {
  // Enhanced CSS with WASM LLM features will be served here
  res.send('/* CSS will be loaded from static files */');
});

// Serve JavaScript
server.get('/js/app.js', (req, res) => {
  // Enhanced JavaScript with WASM LLM integration will be served here
  res.send('/* JavaScript will be loaded from static files */');
});

// Start server
server.start();