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

    // Perform search with WASM LLM integration (no console logs)
    const searchResult = await searchEngines.search(query, useAnonymization);
    
    // Clean JSON response - no console logs, no emojis
    const cleanResponse = JSON.stringify(searchResult);
    res.send(cleanResponse);
    
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
        <input type="text" id="testQuery" placeholder="Test query (e.g., istanbul'da en iyi kebap)" style="width: 70%; padding: 10px; margin-right: 10px;">
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
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <style>
        /* Modern CSS Variables */
        :root {
            --primary-color: #3b82f6;
            --primary-hover: #2563eb;
            --secondary-color: #6b7280;
            --success-color: #10b981;
            --warning-color: #f59e0b;
            --error-color: #ef4444;
            --background: #ffffff;
            --surface: #f8fafc;
            --text-primary: #1f2937;
            --text-secondary: #6b7280;
            --border: #e5e7eb;
            --shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
            --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
            --radius: 0.5rem;
            --transition: all 0.2s ease-in-out;
        }

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: var(--background);
            color: var(--text-primary);
            line-height: 1.6;
            min-height: 100vh;
        }

        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 1rem;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
        }

        /* Status Bar */
        .status-bar {
            display: flex;
            gap: 1rem;
            padding: 1rem;
            background: var(--surface);
            border-radius: var(--radius);
            margin-bottom: 2rem;
            box-shadow: var(--shadow);
            flex-wrap: wrap;
        }

        .status-item {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.5rem 1rem;
            background: white;
            border-radius: var(--radius);
            font-size: 0.875rem;
            font-weight: 500;
            transition: var(--transition);
            border: 1px solid var(--border);
        }

        .status-item.active {
            background: var(--success-color);
            color: white;
            border-color: var(--success-color);
        }

        /* Main Search Container */
        .search-container {
            flex: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            max-width: 800px;
            margin: 0 auto;
            width: 100%;
        }

        .logo-container {
            text-align: center;
            margin-bottom: 3rem;
        }

        .logo {
            font-size: 3rem;
            font-weight: 700;
            color: var(--text-primary);
            margin-bottom: 0.5rem;
        }

        .tagline {
            font-size: 1.125rem;
            color: var(--text-secondary);
            margin-bottom: 1rem;
        }

        .ai-badge {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.5rem 1rem;
            background: linear-gradient(135deg, var(--primary-color), var(--primary-hover));
            color: white;
            border-radius: 2rem;
            font-size: 0.875rem;
            font-weight: 500;
        }

        /* Search Box */
        .search-box-container {
            width: 100%;
            margin-bottom: 2rem;
        }

        .search-box {
            display: flex;
            gap: 0.5rem;
            margin-bottom: 1rem;
        }

        #searchInput {
            flex: 1;
            padding: 1rem 1.5rem;
            border: 2px solid var(--border);
            border-radius: var(--radius);
            font-size: 1rem;
            transition: var(--transition);
            background: white;
        }

        #searchInput:focus {
            outline: none;
            border-color: var(--primary-color);
            box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .search-button {
            padding: 1rem 2rem;
            background: var(--primary-color);
            color: white;
            border: none;
            border-radius: var(--radius);
            font-size: 1rem;
            font-weight: 500;
            cursor: pointer;
            transition: var(--transition);
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }

        .search-button:hover:not(:disabled) {
            background: var(--primary-hover);
            transform: translateY(-1px);
        }

        .search-button:disabled {
            opacity: 0.6;
            cursor: not-allowed;
        }

        /* Privacy Options */
        .privacy-options {
            display: flex;
            justify-content: center;
        }

        .privacy-toggle {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            cursor: pointer;
            font-size: 0.875rem;
            color: var(--text-secondary);
        }

        .toggle-slider {
            position: relative;
            width: 44px;
            height: 24px;
            background: var(--border);
            border-radius: 12px;
            transition: var(--transition);
        }

        .toggle-slider::before {
            content: '';
            position: absolute;
            top: 2px;
            left: 2px;
            width: 20px;
            height: 20px;
            background: white;
            border-radius: 50%;
            transition: var(--transition);
        }

        input[type="checkbox"]:checked + .toggle-slider {
            background: var(--primary-color);
        }

        input[type="checkbox"]:checked + .toggle-slider::before {
            transform: translateX(20px);
        }

        input[type="checkbox"] {
            display: none;
        }

        /* Loading State */
        .loading-state {
            text-align: center;
            padding: 3rem;
        }

        .loading-spinner {
            width: 40px;
            height: 40px;
            border: 3px solid var(--border);
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
            padding: 0.5rem;
            margin: 0.25rem 0;
            border-radius: var(--radius);
            opacity: 0.5;
            transition: var(--transition);
        }

        .loading-step.active {
            opacity: 1;
            background: var(--surface);
            font-weight: 500;
        }

        /* Results */
        .results-container {
            width: 100%;
            margin-top: 2rem;
        }

        .results-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 1rem;
            background: var(--surface);
            border-radius: var(--radius);
            margin-bottom: 1rem;
            font-size: 0.875rem;
            color: var(--text-secondary);
        }

        .results-info {
            display: flex;
            gap: 1rem;
        }

        .privacy-badge {
            padding: 0.25rem 0.75rem;
            background: var(--success-color);
            color: white;
            border-radius: 1rem;
            font-size: 0.75rem;
            font-weight: 500;
        }

        .debug-method {
            padding: 0.25rem 0.75rem;
            background: var(--primary-color);
            color: white;
            border-radius: 1rem;
            font-size: 0.75rem;
            font-weight: 500;
        }

        .debug-method.tinyllama {
            background: #10b981;
        }

        .debug-method.rule-based {
            background: #f59e0b;
        }

        .debug-method.fallback {
            background: #ef4444;
        }

        .result-item {
            background: white;
            border: 1px solid var(--border);
            border-radius: var(--radius);
            padding: 1.5rem;
            margin-bottom: 1rem;
            transition: var(--transition);
            animation: slideIn 0.3s ease-out;
        }

        .result-item:hover {
            box-shadow: var(--shadow-lg);
            transform: translateY(-2px);
        }

        @keyframes slideIn {
            from {
                opacity: 0;
                transform: translateY(20px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        .result-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 0.75rem;
        }

        .result-title {
            margin: 0;
            font-size: 1.125rem;
            font-weight: 600;
        }

        .result-title a {
            color: var(--primary-color);
            text-decoration: none;
            transition: var(--transition);
        }

        .result-title a:hover {
            color: var(--primary-hover);
            text-decoration: underline;
        }

        .result-source {
            padding: 0.25rem 0.75rem;
            border-radius: 1rem;
            font-size: 0.75rem;
            font-weight: 500;
            color: white;
        }

        .result-snippet {
            color: var(--text-secondary);
            margin-bottom: 0.75rem;
            line-height: 1.6;
        }

        .result-url {
            font-size: 0.875rem;
            color: var(--success-color);
            word-break: break-all;
        }

        /* Empty State */
        .empty-state {
            text-align: center;
            padding: 4rem 2rem;
        }

        .empty-icon {
            font-size: 4rem;
            margin-bottom: 1.5rem;
            opacity: 0.6;
        }

        .features-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 1.5rem;
            margin-top: 2rem;
        }

        .feature {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            padding: 1rem;
            background: var(--surface);
            border-radius: var(--radius);
            font-size: 0.875rem;
            font-weight: 500;
        }

        .feature-icon {
            font-size: 1.5rem;
        }

        /* Error State */
        .error-state {
            text-align: center;
            padding: 3rem;
        }

        .error-icon {
            font-size: 3rem;
            margin-bottom: 1rem;
        }

        .retry-button {
            padding: 0.75rem 1.5rem;
            background: var(--error-color);
            color: white;
            border: none;
            border-radius: var(--radius);
            font-size: 0.875rem;
            font-weight: 500;
            cursor: pointer;
            transition: var(--transition);
            margin-top: 1rem;
        }

        .retry-button:hover {
            background: #dc2626;
        }

        /* Footer */
        .footer {
            margin-top: auto;
            padding: 2rem 0;
            border-top: 1px solid var(--border);
        }

        .footer-content {
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 1rem;
        }

        .footer-section {
            display: flex;
            align-items: center;
            gap: 1rem;
        }

        .footer-text {
            color: var(--text-secondary);
            font-size: 0.875rem;
        }

        .footer-badge {
            padding: 0.25rem 0.75rem;
            background: var(--primary-color);
            color: white;
            border-radius: 1rem;
            font-size: 0.75rem;
            font-weight: 500;
        }

        .footer-links {
            display: flex;
            gap: 1.5rem;
        }

        .footer-link {
            color: var(--text-secondary);
            text-decoration: none;
            font-size: 0.875rem;
            transition: var(--transition);
        }

        .footer-link:hover {
            color: var(--primary-color);
        }

        /* Utility Classes */
        .hidden {
            display: none !important;
        }

        /* Responsive Design */
        @media (max-width: 768px) {
            .container {
                padding: 0.5rem;
            }

            .logo {
                font-size: 2rem;
            }

            .search-box {
                flex-direction: column;
            }

            .search-button {
                justify-content: center;
            }

            .status-bar {
                justify-content: center;
            }

            .results-header {
                flex-direction: column;
                gap: 0.5rem;
                align-items: flex-start;
            }

            .footer-content {
                flex-direction: column;
                text-align: center;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- Status Bar -->
        <div class="status-bar">
            <div class="status-item active" id="protected-status">
                <span class="status-icon">🔒</span>
                <span class="status-text">Protected</span>
            </div>
            <div class="status-item active" id="ai-status">
                <span class="status-icon">🧠</span>
                <span class="status-text">AI Ready</span>
            </div>
            <div class="status-item active" id="speed-status">
                <span class="status-icon">⚡</span>
                <span class="status-text">Fast</span>
            </div>
            <div class="status-item active" id="engine-status">
                <span class="status-icon">🔍</span>
                <span class="status-text">Multi-Engine</span>
            </div>
            <div class="status-item active" id="secure-status">
                <span class="status-icon">🛡️</span>
                <span class="status-text">Secure</span>
            </div>
        </div>

        <!-- Main Search Interface -->
        <div class="search-container">
            <div class="logo-container">
                <h1 class="logo">Mirror Search</h1>
                <p class="tagline">Privacy-First AI Search Engine</p>
                <div class="ai-badge">
                    <span class="ai-icon">🧠</span>
                    <span>Powered by TinyLlama 1.1B</span>
                </div>
            </div>

            <div class="search-box-container">
                <div class="search-box">
                    <input type="text" id="searchInput" placeholder="Search privately with AI anonymization..." autocomplete="off">
                    <button id="searchButton" class="search-button">
                        <span class="button-text">Search</span>
                        <span class="button-icon">🔍</span>
                    </button>
                </div>
                
                <div class="privacy-options">
                    <label class="privacy-toggle">
                        <input type="checkbox" id="anonymizationToggle" checked>
                        <span class="toggle-slider"></span>
                        <span class="toggle-label">AI Query Anonymization</span>
                    </label>
                </div>
            </div>

            <!-- Loading State -->
            <div id="loadingState" class="loading-state hidden">
                <div class="loading-spinner"></div>
                <div class="loading-text">
                    <div class="loading-step active" id="step-anonymizing">🧠 Anonymizing query with AI...</div>
                    <div class="loading-step" id="step-searching">🔍 Searching securely...</div>
                    <div class="loading-step" id="step-processing">⚡ Processing results...</div>
                </div>
            </div>

            <!-- Results Container -->
            <div id="resultsContainer" class="results-container hidden">
                <div class="results-header">
                    <div class="results-info">
                        <span id="resultsCount">0 results</span>
                        <span id="searchTime">0ms</span>
                        <span id="searchEngine">Unknown</span>
                        <span id="debugMethod" class="debug-method">Method: Unknown</span>
                    </div>
                    <div class="privacy-info" id="privacyInfo">
                        <span class="privacy-badge">🔒 Query Anonymized</span>
                    </div>
                </div>
                <div id="resultsList" class="results-list"></div>
            </div>

            <!-- Empty State -->
            <div id="emptyState" class="empty-state">
                <div class="empty-icon">🔍</div>
                <h3>Privacy-First Search</h3>
                <div class="features-grid">
                    <div class="feature">
                        <span class="feature-icon">🧠</span>
                        <span class="feature-text">AI Query Anonymization</span>
                    </div>
                    <div class="feature">
                        <span class="feature-icon">🔒</span>
                        <span class="feature-text">Zero Tracking</span>
                    </div>
                    <div class="feature">
                        <span class="feature-icon">⚡</span>
                        <span class="feature-text">Lightning Fast</span>
                    </div>
                    <div class="feature">
                        <span class="feature-icon">🛡️</span>
                        <span class="feature-text">Secure by Design</span>
                    </div>
                </div>
            </div>

            <!-- Error State -->
            <div id="errorState" class="error-state hidden">
                <div class="error-icon">⚠️</div>
                <h3>Search Error</h3>
                <p id="errorMessage">Something went wrong. Please try again.</p>
                <button id="retryButton" class="retry-button">Try Again</button>
            </div>
        </div>

        <!-- Footer -->
        <footer class="footer">
            <div class="footer-content">
                <div class="footer-section">
                    <span class="footer-text">Mirror Search + Bless Network</span>
                    <span class="footer-badge">WASM LLM v2.1</span>
                </div>
                <div class="footer-links">
                    <a href="#" class="footer-link">Privacy Policy</a>
                    <a href="#" class="footer-link">About</a>
                    <a href="/llm-status" class="footer-link">AI Status</a>
                </div>
            </div>
        </footer>
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
                this.emptyState = document.getElementById('emptyState');
                this.errorState = document.getElementById('errorState');
                this.retryButton = document.getElementById('retryButton');
                
                this.currentQuery = '';
                this.isSearching = false;
                
                this.init();
            }

            init() {
                this.bindEvents();
                this.updateStatusBar();
                this.showEmptyState();
                
                console.log('🔍 Mirror Search initialized');
                console.log('🔒 Privacy-first search engine ready');
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
                        this.showEmptyState();
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
                
                console.log('🔍 Searching for: "' + query + '"');
                
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
                    console.error('❌ Search error:', error);
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
                
                // Debug method gösterimi
                const debugMethodElement = document.getElementById('debugMethod');
                if (data.debug && data.debug.anonymizationMethod) {
                    const method = data.debug.anonymizationMethod;
                    debugMethodElement.textContent = 'Method: ' + method;
                    debugMethodElement.className = 'debug-method ' + method;
                    
                    // Console'da detaylı debug bilgisi
                    console.log('🔍 Anonymization Debug:', {
                        method: method,
                        original: data.debug.originalQuery,
                        anonymized: data.debug.anonymizedQuery,
                        confidence: data.debug.confidence
                    });
                } else {
                    debugMethodElement.textContent = 'Method: Unknown';
                    debugMethodElement.className = 'debug-method';
                }
                
                const privacyInfo = document.getElementById('privacyInfo');
                if (data.status.anonymized) {
                    const method = data.debug?.anonymizationMethod || 'unknown';
                    privacyInfo.innerHTML = '<span class="privacy-badge">🔒 ' + method.toUpperCase() + ' Anonymized</span>';
                } else {
                    privacyInfo.innerHTML = '<span class="privacy-badge">🔍 Direct Search</span>';
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
                    '<span class="result-source" style="background-color: ' + sourceColor + '">' +
                        result.source +
                    '</span>' +
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

            showEmptyState() {
                this.hideAllStates();
                this.emptyState.classList.remove('hidden');
            }

            hideAllStates() {
                this.loadingState.classList.add('hidden');
                this.resultsContainer.classList.add('hidden');
                this.errorState.classList.add('hidden');
                this.emptyState.classList.add('hidden');
            }

            updateSearchButton(isLoading) {
                if (isLoading) {
                    this.searchButton.disabled = true;
                    this.searchButton.innerHTML = '<span class="button-text">Searching...</span><span class="button-icon">⏳</span>';
                } else {
                    this.searchButton.disabled = false;
                    this.searchButton.innerHTML = '<span class="button-text">Search</span><span class="button-icon">🔍</span>';
                }
            }

            updateStatusBar(status = null) {
                const statusItems = {
                    'protected-status': status?.protected !== false,
                    'ai-status': true,
                    'speed-status': status?.fast !== false,
                    'engine-status': true,
                    'secure-status': status?.secure !== false
                };

                Object.entries(statusItems).forEach(([id, isActive]) => {
                    const element = document.getElementById(id);
                    if (element) {
                        element.classList.toggle('active', isActive);
                    }
                });
            }

            escapeHtml(text) {
                const div = document.createElement('div');
                div.textContent = text;
                return div.innerHTML;
            }
        }

        document.addEventListener('DOMContentLoaded', () => {
            new MirrorSearch();
            
            console.log('%c🔍 Mirror Search v2.1 - Privacy-First AI Search Engine', 'color: #3b82f6; font-size: 16px; font-weight: bold;');
            console.log('%c🔒 No tracking • No logs • No data collection', 'color: #10b981; font-size: 12px;');
            console.log('%c⚡ Multi-engine search with WASM LLM anonymization', 'color: #f59e0b; font-size: 12px;');
            console.log('%c🛡️ Advanced privacy protection and secure by design', 'color: #ef4444; font-size: 12px;');
            console.log('%c🌐 Powered by Bless Network', 'color: #8b5cf6; font-size: 12px;');
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