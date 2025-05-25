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
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: var(--text-primary);
            line-height: 1.6;
            min-height: 100vh;
            overflow-x: hidden;
        }

        body::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100vh;
            background-image: url('assets/background.png');
            background-size: cover;
            background-position: center;
            z-index: -1;
        }

        .container {
            max-width: 1400px;
            margin: 0 auto;
            padding: 2rem;
            min-height: 100vh;
            display: grid;
            grid-template-columns: 1fr 1fr;
            align-items: center;
            gap: 4rem;
        }

        /* Left Side - Search Interface */
        .search-side {
            display: flex;
            flex-direction: column;
            gap: 2rem;
            max-width: 600px;
        }

        /* Glass Morphism Card */
        .search-card {
            background: var(--surface-glass);
            backdrop-filter: blur(20px);
            border: 1px solid var(--border-glass);
            border-radius: var(--radius-lg);
            padding: 2rem;
            box-shadow: var(--shadow-glass);
            transition: var(--transition);
        }

        .search-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 12px 40px 0 rgba(31, 38, 135, 0.5);
        }

        /* Logo and Branding */
        .brand-section {
            text-align: left;
            margin-bottom: 1.5rem;
        }

        .logo {
            font-size: 2rem;
            font-weight: 700;
            color: var(--text-light);
            margin-bottom: 0.5rem;
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
            margin-bottom: 2rem;
        }

        .search-box {
            display: flex;
            gap: 1rem;
            margin-bottom: 1.5rem;
        }

        #searchInput {
            flex: 1;
            padding: 1rem 1.5rem;
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
            padding: 1rem 2rem;
            background: linear-gradient(135deg, var(--primary-color), var(--primary-hover));
            color: white;
            border: none;
            border-radius: var(--radius);
            font-size: 1rem;
            font-weight: 600;
            cursor: pointer;
            transition: var(--transition);
            display: flex;
            align-items: center;
            gap: 0.5rem;
            box-shadow: var(--shadow);
            white-space: nowrap;
        }

        .search-button:hover:not(:disabled) {
            transform: translateY(-2px);
            box-shadow: var(--shadow-lg);
        }

        .search-button:disabled {
            opacity: 0.6;
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
            background: rgba(255, 255, 255, 0.4);
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
            margin-top: 2rem;
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
            grid-column: 1 / -1;
            margin-top: 3rem;
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
            margin-top: 2rem;
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
                grid-template-columns: 1fr;
                gap: 2rem;
                padding: 1.5rem;
            }
            
            .visual-side {
                order: -1;
                min-height: 40vh;
            }
            
            .visual-title {
                font-size: 2rem;
            }
        }

        @media (max-width: 768px) {
            .search-card {
                padding: 2rem;
            }
            
            .search-box {
                flex-direction: column;
                gap: 1rem;
            }
            
            .search-button {
                justify-content: center;
            }
            
            .status-bar {
                flex-wrap: wrap;
                gap: 0.5rem;
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
            <!-- Status Bar -->
            <div class="status-bar">
                <div class="status-item" id="statusProtected">
                    <span>Protected</span>
                </div>
                <div class="status-item" id="statusFast">
                    <span>Fast</span>
                </div>
                <div class="status-item" id="statusSecure">
                    <span>Secure</span>
                </div>
                <div class="status-item" id="statusAnonymized">
                    <span>AI Ready</span>
                </div>
                <div class="status-item" id="statusBlessNetwork">
                    <span>Bless Network</span>
                </div>
                <div class="status-item" id="statusWasmLLM">
                    <span>WASM LLM v2.1</span>
                </div>
                <a href="/llm-status" class="status-item status-link" id="statusAILink">
                    <span>AI Status</span>
                </a>
            </div>

            <!-- Main Search Card -->
            <div class="search-card">
                <!-- Brand Section -->
                <div class="brand-section">
                    <h1 class="logo">Mirror Search</h1>
                    <p class="tagline">Privacy-first search with AI anonymization</p>
                    <div class="ai-badge">
                        <span>ONNX.js Powered</span>
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
                            <span>Search</span>
                        </button>
                    </div>

                    <!-- Privacy Options -->
                    <div class="privacy-options">
                        <label class="privacy-toggle">
                            <input type="checkbox" id="anonymizationToggle" checked>
                            <span class="toggle-slider"></span>
                            <span class="toggle-label">AI Query Anonymization</span>
                        </label>
                    </div>
                </div>
            </div>
        </div>

        <!-- Right Side - Visual Content -->
        <div class="visual-side">
            <div class="visual-content">
                <h2 class="visual-title">Search Privately</h2>
                <p class="visual-subtitle">Your queries, anonymized by AI</p>
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
                    <span id="debugMethod" class="debug-method">Method: Unknown</span>
                </div>
                <div class="privacy-info" id="privacyInfo">
                    <span class="privacy-badge">Query Anonymized</span>
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

            hideAllStates() {
                this.loadingState.classList.add('hidden');
                this.resultsContainer.classList.add('hidden');
                this.errorState.classList.add('hidden');
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
                // Status bar artık active sınıfı kullanmıyor
                // Tüm status itemlar her zaman aynı görünümde kalıyor
                console.log('Status bar updated:', status);
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