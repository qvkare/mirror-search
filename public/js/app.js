// Mirror Search - Main Application
class MirrorSearch {
    constructor() {
        this.isSearching = false;
        this.currentTheme = 'light';
        this.currentPage = 1;
        this.lastQuery = '';
        this.settings = {
            searchEngine: 'google',
            language: 'en',
            theme: 'light',
            fullPrivacy: false
        };
        
        this.init();
    }

    init() {
        this.loadSettings();
        this.bindEvents();
        this.initTheme();
        console.log('🔍 Mirror Search initialized with real search engines');
    }

    loadSettings() {
        try {
            const saved = localStorage.getItem('mirror-search-settings');
            if (saved) {
                this.settings = { ...this.settings, ...JSON.parse(saved) };
            }
        } catch (error) {
            console.warn('Failed to load settings:', error);
        }
    }

    saveSettings() {
        try {
            localStorage.setItem('mirror-search-settings', JSON.stringify(this.settings));
        } catch (error) {
            console.warn('Failed to save settings:', error);
        }
    }

    bindEvents() {
        // Search form
        const searchForm = document.getElementById('searchForm');
        const searchInput = document.getElementById('searchInput');

        searchForm?.addEventListener('submit', (e) => {
            e.preventDefault();
            const query = searchInput.value.trim();
            if (query) {
                this.currentPage = 1;
                this.lastQuery = query;
                this.performSearch(query);
            }
        });

        // Settings modal
        const settingsBtn = document.getElementById('settingsBtn');
        const settingsModal = document.getElementById('settingsModal');
        const closeSettings = document.getElementById('closeSettings');

        settingsBtn?.addEventListener('click', () => {
            this.showSettings();
        });

        closeSettings?.addEventListener('click', () => {
            this.hideSettings();
        });

        settingsModal?.addEventListener('click', (e) => {
            if (e.target === settingsModal) {
                this.hideSettings();
            }
        });

        // Settings controls
        const searchEngine = document.getElementById('searchEngine');
        const language = document.getElementById('language');
        const theme = document.getElementById('theme');
        const fullPrivacy = document.getElementById('fullPrivacy');

        searchEngine?.addEventListener('change', (e) => {
            this.settings.searchEngine = e.target.value;
            this.saveSettings();
            console.log(`🔧 Search engine changed to: ${e.target.value}`);
        });

        language?.addEventListener('change', (e) => {
            this.settings.language = e.target.value;
            this.saveSettings();
        });

        theme?.addEventListener('change', (e) => {
            this.settings.theme = e.target.value;
            this.setTheme(e.target.value);
            this.saveSettings();
        });

        fullPrivacy?.addEventListener('change', (e) => {
            this.settings.fullPrivacy = e.target.checked;
            this.saveSettings();
            console.log(`🔒 Full privacy mode: ${e.target.checked ? 'enabled' : 'disabled'}`);
        });

        // Error handling
        const retryBtn = document.getElementById('retryBtn');
        const fallbackBtn = document.getElementById('fallbackBtn');

        retryBtn?.addEventListener('click', () => {
            if (this.lastQuery) {
                this.performSearch(this.lastQuery);
            }
        });

        fallbackBtn?.addEventListener('click', () => {
            if (this.lastQuery) {
                // Try with a different engine
                const currentEngine = this.settings.searchEngine;
                const fallbackEngine = currentEngine === 'google' ? 'bing' : 'google';
                this.performSearch(this.lastQuery, fallbackEngine);
            }
        });

        // Load more results
        const loadMoreBtn = document.getElementById('loadMore');
        if (loadMoreBtn) {
            loadMoreBtn.addEventListener('click', () => {
                this.loadMoreResults();
            });
        }

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Ctrl+L or Cmd+L to focus search
            if ((e.ctrlKey || e.metaKey) && e.key === 'l') {
                e.preventDefault();
                searchInput?.focus();
            }

            // Escape to close modal
            if (e.key === 'Escape') {
                this.hideSettings();
            }
        });
    }

    initTheme() {
        this.setTheme(this.settings.theme);
        
        // Update settings form
        const themeSelect = document.getElementById('theme');
        if (themeSelect) {
            themeSelect.value = this.settings.theme;
        }
    }

    setTheme(theme) {
        this.currentTheme = theme;
        document.documentElement.setAttribute('data-theme', theme);
    }

    showSettings() {
        const modal = document.getElementById('settingsModal');
        if (modal) {
            modal.style.display = 'flex';
            
            // Update form values
            document.getElementById('searchEngine').value = this.settings.searchEngine;
            document.getElementById('language').value = this.settings.language;
            document.getElementById('theme').value = this.settings.theme;
            document.getElementById('fullPrivacy').checked = this.settings.fullPrivacy;
        }
    }

    hideSettings() {
        const modal = document.getElementById('settingsModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    async performSearch(query, engine = null, page = 1) {
        if (this.isSearching) return;

        this.isSearching = true;
        const searchEngine = engine || this.settings.searchEngine;
        this.currentPage = page;
        
        // Show loading
        this.showLoading();
        if (page === 1) {
            this.hideResults();
        }
        this.hideError();

        try {
            console.log(`🔍 Searching for: "${query}" via ${searchEngine} (page ${page})`);
            console.log('📋 Request payload:', { q: query, engine: searchEngine, page: page });
            
            // Skip paraphrasing for now to speed up searches
            // const paraphrasedQuery = await this.paraphraseQuery(query);
            // console.log(`🔄 Query paraphrased: "${query}" → "${paraphrasedQuery}"`);
            
            // Make search request using POST endpoint
            console.log('📡 Making fetch request to /search...');
            const response = await fetch('/search', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    q: query, // Use original query directly
                    engine: searchEngine,
                    page: page
                })
            });
            
            console.log('📥 Response received:', response);
            console.log('📊 Response status:', response.status, response.statusText);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            console.log('🔄 Parsing JSON response...');
            const data = await response.json();
            console.log('🔍 Search response received:', data);
            
            if (data.error) {
                throw new Error(data.error);
            }

            console.log('✅ Displaying results...');
            this.displayResults(data, query, page === 1);
            console.log('✅ Results displayed successfully');
            
            // Update search history
            if (window.searchUtils && page === 1) {
                window.searchUtils.addToHistory(query, searchEngine);
            }
            
        } catch (error) {
            console.error('❌ Search error:', error);
            console.error('❌ Error stack:', error.stack);
            this.showError(error.message || 'Search failed. Please try again.', searchEngine);
        } finally {
            console.log('🏁 Search completed, hiding loading...');
            this.hideLoading();
            this.isSearching = false;
            console.log('🏁 isSearching flag reset to false');
        }
    }

    async loadMoreResults() {
        if (!this.lastQuery || this.isSearching) return;
        
        const nextPage = this.currentPage + 1;
        console.log(`📄 Loading page ${nextPage} for "${this.lastQuery}"`);
        
        await this.performSearch(this.lastQuery, this.settings.searchEngine, nextPage);
    }

    async paraphraseQuery(query) {
        try {
            // Use WASM LLM for actual paraphrasing
            if (window.wasmLLM && window.wasmLLM.isLoaded) {
                const paraphrased = await window.wasmLLM.paraphrase(query, {
                    temperature: 0.7,
                    preserveKeywords: true
                });
                return paraphrased;
            } else {
                console.warn('WASM LLM not available, using original query');
                return query;
            }
        } catch (error) {
            console.error('Paraphrasing error:', error);
            // Fallback to original query
            return query;
        }
    }

    displayResults(data, originalQuery, clearPrevious = true) {
        const resultsContainer = document.getElementById('resultsContainer');
        const resultsList = document.getElementById('resultsList');
        const resultsInfo = document.getElementById('resultsInfo');
        const loadMoreBtn = document.getElementById('loadMore');

        if (!resultsContainer || !resultsList || !resultsInfo) return;

        // Update results info
        const totalResults = data.totalResults || 0;
        const currentResults = data.results?.length || 0;
        const pageInfo = data.page > 1 ? ` (Page ${data.page})` : '';
        
        resultsInfo.textContent = `Found ${totalResults.toLocaleString()} results for "${originalQuery}"${pageInfo} • ${data.searchTime}ms • ${data.engine}`;

        // Clear previous results if this is page 1
        if (clearPrevious) {
            resultsList.innerHTML = '';
        }

        if (data.results && data.results.length > 0) {
            // Display search results
            data.results.forEach((result, index) => {
                const resultElement = this.createResultElement(result, (data.page - 1) * 10 + index + 1);
                resultsList.appendChild(resultElement);
            });

            // Show/hide load more button
            if (loadMoreBtn) {
                loadMoreBtn.style.display = data.nextPageUrl ? 'block' : 'none';
            }
        } else if (clearPrevious) {
            // No results
            resultsList.innerHTML = `
                <div class="result-item">
                    <div class="result-snippet">No results found for "${originalQuery}". Try different keywords or search engine.</div>
                </div>
            `;
        }

        this.showResults();
    }

    createResultElement(result, displayRank) {
        const div = document.createElement('div');
        div.className = 'result-item';
        
        const proxyUrl = this.settings.fullPrivacy 
            ? `/out?u=${encodeURIComponent(result.url)}&stream=1`
            : result.url;

        // Add favicon if available
        const faviconHtml = result.favicon ? 
            `<img src="${result.favicon}" alt="" class="result-favicon" width="16" height="16">` : 
            `<span class="result-rank">${displayRank}</span>`;

        div.innerHTML = `
            <div class="result-header">
                ${faviconHtml}
                <a href="${proxyUrl}" class="result-title" target="_blank" rel="noopener">
                    ${this.escapeHtml(result.title)}
                </a>
            </div>
            <div class="result-url">${this.escapeHtml(result.displayUrl || result.url)}</div>
            <div class="result-snippet">${this.escapeHtml(result.snippet)}</div>
        `;

        return div;
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showLoading() {
        const loading = document.getElementById('loading');
        if (loading) {
            loading.style.display = 'flex';
        }
    }

    hideLoading() {
        const loading = document.getElementById('loading');
        if (loading) {
            loading.style.display = 'none';
        }
    }

    showResults() {
        const container = document.getElementById('resultsContainer');
        if (container) {
            container.style.display = 'block';
        }
    }

    hideResults() {
        const container = document.getElementById('resultsContainer');
        if (container) {
            container.style.display = 'none';
        }
    }

    showError(message, failedEngine = '') {
        const errorContainer = document.getElementById('errorContainer');
        const errorMessage = document.getElementById('errorMessage');
        const fallbackBtn = document.getElementById('fallbackBtn');
        
        if (errorContainer && errorMessage) {
            let fullMessage = message;
            if (failedEngine) {
                const suggestions = {
                    'google': 'Try Bing or DuckDuckGo',
                    'bing': 'Try Google or DuckDuckGo', 
                    'duckduckgo': 'Try Google or Bing'
                };
                const suggestion = suggestions[failedEngine] || 'Try a different search engine';
                fullMessage += ` (${failedEngine} failed - ${suggestion})`;
            }
            
            errorMessage.textContent = fullMessage;
            errorContainer.style.display = 'block';
            
            // Update fallback button text
            if (fallbackBtn && failedEngine) {
                const fallbackEngine = failedEngine === 'google' ? 'Bing' : 'Google';
                fallbackBtn.textContent = `Try ${fallbackEngine}`;
            }
        }
    }

    hideError() {
        const errorContainer = document.getElementById('errorContainer');
        if (errorContainer) {
            errorContainer.style.display = 'none';
        }
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.mirrorSearch = new MirrorSearch();
}); 