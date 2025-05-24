/**
 * Mirror Search - Modern JavaScript Application
 * Privacy-first web search powered by Bless Network
 */

class MirrorSearch {
    constructor() {
        this.isSearching = false;
        this.currentQuery = '';
        this.searchResults = [];
        this.statusIndicators = {
            privacy: '🔒 Protected',
            speed: '⚡ Ready',
            engine: '🔍 Multi-Engine',
            mode: '🛡️ Secure'
        };
        
        this.init();
    }

    /**
     * Initialize the application
     */
    init() {
        this.bindEvents();
        this.updateStatusBar();
        this.showEmptyState();
        console.log('🔍 Mirror Search initialized');
        console.log('🔒 Privacy-first search engine ready');
    }

    /**
     * Bind event listeners
     */
    bindEvents() {
        // Search input events
        const searchInput = document.getElementById('searchInput');
        const searchButton = document.getElementById('searchButton');
        const retryButton = document.getElementById('retryButton');

        if (searchInput) {
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !this.isSearching) {
                    this.performSearch();
                }
            });

            searchInput.addEventListener('input', (e) => {
                this.updateSearchInfo(e.target.value);
            });
        }

        if (searchButton) {
            searchButton.addEventListener('click', () => {
                if (!this.isSearching) {
                    this.performSearch();
                }
            });
        }

        if (retryButton) {
            retryButton.addEventListener('click', () => {
                if (this.currentQuery) {
                    this.performSearch(this.currentQuery);
                }
            });
        }

        // Modal events
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.closeModal(e.target.id);
            }
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeAllModals();
            }
            if (e.key === '/' && !this.isInputFocused()) {
                e.preventDefault();
                searchInput?.focus();
            }
        });
    }

    /**
     * Check if an input element is currently focused
     */
    isInputFocused() {
        const activeElement = document.activeElement;
        return activeElement && (
            activeElement.tagName === 'INPUT' || 
            activeElement.tagName === 'TEXTAREA' ||
            activeElement.contentEditable === 'true'
        );
    }

    /**
     * Update status bar indicators
     */
    updateStatusBar() {
        const statusElements = {
            privacyStatus: this.statusIndicators.privacy,
            speedStatus: this.statusIndicators.speed,
            engineStatus: this.statusIndicators.engine,
            modeStatus: this.statusIndicators.mode
        };

        Object.entries(statusElements).forEach(([id, text]) => {
            const element = document.getElementById(id);
            if (element) {
                const textElement = element.querySelector('.status-text');
                if (textElement) {
                    textElement.textContent = text.split(' ').slice(1).join(' ');
                }
            }
        });
    }

    /**
     * Update search info text
     */
    updateSearchInfo(query) {
        const searchInfo = document.getElementById('searchInfo');
        if (searchInfo) {
            if (query.trim()) {
                searchInfo.textContent = `Press Enter to search for "${query.trim()}"`;
            } else {
                searchInfo.textContent = '';
            }
        }
    }

    /**
     * Perform search operation
     */
    async performSearch(query = null) {
        if (this.isSearching) return;

        const searchInput = document.getElementById('searchInput');
        const searchQuery = query || searchInput?.value?.trim();

        if (!searchQuery) {
            this.showError('Please enter a search term');
            return;
        }

        this.currentQuery = searchQuery;
        this.isSearching = true;

        try {
            this.showLoading();
            this.hideEmptyState();
            this.hideErrorState();

            console.log(`🔍 Searching for: "${searchQuery}"`);

            // Update status indicators
            this.statusIndicators.speed = '🔄 Searching';
            this.statusIndicators.engine = '🔍 Processing';
            this.updateStatusBar();

            const startTime = Date.now();

            // Make search request
            const response = await fetch('/search', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    query: searchQuery
                })
            });

            if (!response.ok) {
                throw new Error(`Search failed: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            const processingTime = Date.now() - startTime;

            console.log(`✅ Search completed: ${data.results?.length || 0} results in ${processingTime}ms`);

            // Update status indicators with results
            if (data.indicators) {
                this.statusIndicators = { ...data.indicators };
            } else {
                this.statusIndicators.speed = processingTime < 1000 ? '⚡ Fast' : '🐌 Slow';
                this.statusIndicators.engine = `🔍 ${data.engine || 'Unknown'}`;
            }

            this.updateStatusBar();
            this.displayResults(data, searchQuery);

        } catch (error) {
            console.error('❌ Search error:', error);
            this.showError(`Search failed: ${error.message}`);
            
            // Reset status indicators
            this.statusIndicators.speed = '❌ Error';
            this.statusIndicators.engine = '🔍 Failed';
            this.updateStatusBar();

        } finally {
            this.isSearching = false;
            this.hideLoading();
        }
    }

    /**
     * Show loading state
     */
    showLoading() {
        const searchButton = document.getElementById('searchButton');
        const searchInfo = document.getElementById('searchInfo');

        if (searchButton) {
            searchButton.classList.add('loading');
            searchButton.disabled = true;
        }

        if (searchInfo) {
            searchInfo.textContent = 'Searching...';
        }
    }

    /**
     * Hide loading state
     */
    hideLoading() {
        const searchButton = document.getElementById('searchButton');
        const searchInfo = document.getElementById('searchInfo');

        if (searchButton) {
            searchButton.classList.remove('loading');
            searchButton.disabled = false;
        }

        if (searchInfo) {
            searchInfo.textContent = '';
        }
    }

    /**
     * Display search results
     */
    displayResults(data, query) {
        const resultsContainer = document.getElementById('resultsContainer');
        const searchInfo = document.getElementById('searchInfo');

        if (!resultsContainer) return;

        // Update search info
        if (searchInfo) {
            const resultCount = data.results?.length || 0;
            const engine = data.engine || 'Unknown';
            const time = data.processingTime || 0;
            searchInfo.textContent = `Found ${resultCount} results for "${query}" via ${engine} in ${time}ms`;
        }

        // Clear previous results
        resultsContainer.innerHTML = '';

        if (!data.results || data.results.length === 0) {
            this.showNoResults(query);
            return;
        }

        // Display results with staggered animation
        data.results.forEach((result, index) => {
            setTimeout(() => {
                const resultElement = this.createResultElement(result, index);
                resultsContainer.appendChild(resultElement);
            }, index * 100); // Stagger by 100ms
        });

        this.searchResults = data.results;
    }

    /**
     * Create a result element
     */
    createResultElement(result, index) {
        const resultDiv = document.createElement('div');
        resultDiv.className = 'result-item';
        resultDiv.style.animationDelay = `${index * 0.1}s`;

        const title = this.escapeHtml(result.title || 'Untitled');
        const snippet = this.escapeHtml(result.snippet || 'No description available');
        const url = this.escapeHtml(result.url || '#');
        const source = this.escapeHtml(result.source || 'Unknown');

        resultDiv.innerHTML = `
            <div class="result-title">
                <a href="${url}" target="_blank" rel="noopener noreferrer">
                    ${title}
                </a>
            </div>
            <div class="result-url">${url}</div>
            <div class="result-snippet">${snippet}</div>
            <div class="result-source">
                <span class="source-icon">${this.getSourceIcon(source)}</span>
                <span>${source}</span>
            </div>
        `;

        return resultDiv;
    }

    /**
     * Get icon for search source
     */
    getSourceIcon(source) {
        const icons = {
            'DuckDuckGo': '🦆',
            'DuckDuckGo Instant': '⚡',
            'DuckDuckGo Definition': '📖',
            'DuckDuckGo Answer': '💡',
            'DuckDuckGo Related': '🔗',
            'Google': '🔍',
            'Bing': '🔎',
            'Yahoo': '🌐'
        };
        return icons[source] || '🔍';
    }

    /**
     * Show no results message
     */
    showNoResults(query) {
        const resultsContainer = document.getElementById('resultsContainer');
        if (!resultsContainer) return;

        resultsContainer.innerHTML = `
            <div class="result-item" style="text-align: center; padding: 3rem;">
                <div style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.6;">🔍</div>
                <h3 style="margin-bottom: 1rem; color: var(--text-primary);">No results found</h3>
                <p style="color: var(--text-secondary); margin-bottom: 2rem;">
                    No instant answers found for "${this.escapeHtml(query)}". 
                    Try different keywords or check your spelling.
                </p>
                <button onclick="app.showEmptyState(); app.focusSearchInput();" 
                        style="padding: 0.75rem 1.5rem; background: var(--primary-color); color: white; border: none; border-radius: 0.5rem; cursor: pointer;">
                    Try Another Search
                </button>
            </div>
        `;
    }

    /**
     * Show empty state
     */
    showEmptyState() {
        const emptyState = document.getElementById('emptyState');
        const resultsContainer = document.getElementById('resultsContainer');

        if (emptyState) {
            emptyState.style.display = 'block';
        }
        if (resultsContainer) {
            resultsContainer.innerHTML = '';
        }
    }

    /**
     * Hide empty state
     */
    hideEmptyState() {
        const emptyState = document.getElementById('emptyState');
        if (emptyState) {
            emptyState.style.display = 'none';
        }
    }

    /**
     * Show error state
     */
    showError(message) {
        const errorState = document.getElementById('errorState');
        const errorMessage = document.getElementById('errorMessage');

        if (errorState) {
            errorState.style.display = 'block';
        }
        if (errorMessage) {
            errorMessage.textContent = message;
        }

        this.hideEmptyState();
    }

    /**
     * Hide error state
     */
    hideErrorState() {
        const errorState = document.getElementById('errorState');
        if (errorState) {
            errorState.style.display = 'none';
        }
    }

    /**
     * Focus search input
     */
    focusSearchInput() {
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.focus();
            searchInput.select();
        }
    }

    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Show modal
     */
    showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('show');
            document.body.style.overflow = 'hidden';
        }
    }

    /**
     * Close modal
     */
    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('show');
            document.body.style.overflow = '';
        }
    }

    /**
     * Close all modals
     */
    closeAllModals() {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            modal.classList.remove('show');
        });
        document.body.style.overflow = '';
    }
}

/**
 * Global functions for HTML onclick handlers
 */
function showAbout() {
    app.showModal('aboutModal');
}

function showPrivacy() {
    app.showModal('privacyModal');
}

function closeModal(modalId) {
    app.closeModal(modalId);
}

/**
 * Initialize application when DOM is ready
 */
document.addEventListener('DOMContentLoaded', () => {
    window.app = new MirrorSearch();
    
    // Console welcome messages
    console.log('🔍 Mirror Search v2.0 - Privacy-First Web Search');
    console.log('🔒 No tracking • No logs • No data collection');
    console.log('⚡ Multi-engine search with intelligent fallback');
    console.log('🛡️ Advanced bot protection and human-like behavior');
    console.log('🌐 Powered by Bless Network');
    console.log('');
    console.log('💡 Tip: Press "/" to focus search input');
    console.log('💡 Tip: Press "Escape" to close modals');
});

/**
 * Handle page visibility changes
 */
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
        // Page became visible, update status
        if (window.app && !window.app.isSearching) {
            window.app.statusIndicators.speed = '⚡ Ready';
            window.app.updateStatusBar();
        }
    }
});

/**
 * Handle online/offline status
 */
window.addEventListener('online', () => {
    if (window.app) {
        window.app.statusIndicators.mode = '🛡️ Secure';
        window.app.updateStatusBar();
    }
});

window.addEventListener('offline', () => {
    if (window.app) {
        window.app.statusIndicators.mode = '📴 Offline';
        window.app.updateStatusBar();
    }
});

/**
 * Export for module systems (if needed)
 */
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MirrorSearch;
} 