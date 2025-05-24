/**
 * Mirror Search - Modern JavaScript Application
 * Privacy-first web search powered by Bless Network
 */

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
        // Search button click
        this.searchButton.addEventListener('click', () => {
            this.performSearch();
        });

        // Enter key in search input
        this.searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.performSearch();
            }
        });

        // Retry button
        this.retryButton.addEventListener('click', () => {
            this.performSearch();
        });

        // Focus search input with "/" key
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

    /**
     * Perform search operation
     */
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
        
        console.log(`🔍 Searching for: "${query}"`);
        
        this.showLoadingState();
        this.updateSearchButton(true);

        try {
            // Clean query and prepare safe JSON
            const cleanQuery = query.replace(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '').trim();
            
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
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
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

    /**
     * Show loading state
     */
    showLoadingState() {
        this.hideAllStates();
        this.loadingState.classList.remove('hidden');
        
        // Animate loading steps - Bless Network uyumlu
        const steps = ['step-anonymizing', 'step-searching', 'step-processing'];
        let currentStep = 0;
        
        const animateSteps = () => {
            // Remove active from all steps
            steps.forEach(step => {
                const element = document.getElementById(step);
                if (element) element.classList.remove('active');
            });
            
            // Add active to current step
            if (currentStep < steps.length) {
                const element = document.getElementById(steps[currentStep]);
                if (element) element.classList.add('active');
                currentStep++;
                
                // Bless Network uyumlu - setTimeout yerine requestAnimationFrame
                if (this.isSearching && currentStep < steps.length) {
                    requestAnimationFrame(() => {
                        requestAnimationFrame(() => {
                            requestAnimationFrame(animateSteps);
                        });
                    });
                }
            }
        };
        
        animateSteps();
    }

    /**
     * Display search results
     */
    displayResults(data) {
        this.hideAllStates();
        
        if (!data.results || data.results.length === 0) {
            this.showError('No results found. Try a different search term.');
            return;
        }

        // Update results header
        document.getElementById('resultsCount').textContent = `${data.totalResults} results`;
        document.getElementById('searchTime').textContent = `${data.totalTime}ms`;
        document.getElementById('searchEngine').textContent = data.engine;
        
        // Update privacy info
        const privacyInfo = document.getElementById('privacyInfo');
        if (data.status.anonymized) {
            privacyInfo.innerHTML = '<span class="privacy-badge">🔒 Query Anonymized</span>';
        } else {
            privacyInfo.innerHTML = '<span class="privacy-badge">🔍 Direct Search</span>';
        }

        // Clear and populate results
        this.resultsList.innerHTML = '';
        
        data.results.forEach((result, index) => {
            const resultElement = this.createResultElement(result, index);
            this.resultsList.appendChild(resultElement);
        });

        this.resultsContainer.classList.remove('hidden');
        this.updateStatusBar(data.status);
    }

    /**
     * Create a result element
     */
    createResultElement(result, index) {
        const div = document.createElement('div');
        div.className = 'result-item';
        div.style.animationDelay = `${index * 100}ms`;
        
        const sourceColor = this.getSourceColor(result.source);
        
        div.innerHTML = `
            <div class="result-header">
                <h3 class="result-title">
                    <a href="${result.url}" target="_blank" rel="noopener noreferrer">
                        ${this.escapeHtml(result.title)}
                    </a>
                </h3>
                <span class="result-source" style="background-color: ${sourceColor}">
                    ${result.source}
                </span>
            </div>
            <p class="result-snippet">${this.escapeHtml(result.snippet)}</p>
            <div class="result-url">${this.escapeHtml(result.url)}</div>
        `;
        
        return div;
    }

    /**
     * Get color for search source
     */
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

    /**
     * Show error state
     */
    showError(message) {
        this.hideAllStates();
        document.getElementById('errorMessage').textContent = message;
        this.errorState.classList.remove('hidden');
    }

    /**
     * Show empty state
     */
    showEmptyState() {
        this.hideAllStates();
        this.emptyState.classList.remove('hidden');
    }

    /**
     * Hide all states
     */
    hideAllStates() {
        this.loadingState.classList.add('hidden');
        this.resultsContainer.classList.add('hidden');
        this.errorState.classList.add('hidden');
        this.emptyState.classList.add('hidden');
    }

    /**
     * Update search button
     */
    updateSearchButton(isLoading) {
        if (isLoading) {
            this.searchButton.disabled = true;
            this.searchButton.innerHTML = '<span class="button-text">Searching...</span><span class="button-icon">⏳</span>';
        } else {
            this.searchButton.disabled = false;
            this.searchButton.innerHTML = '<span class="button-text">Search</span><span class="button-icon">🔍</span>';
        }
    }

    /**
     * Update status bar indicators
     */
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

    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
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
    new MirrorSearch();
    
    // Console branding
    console.log('%c🔍 Mirror Search v2.1 - Privacy-First AI Search Engine', 'color: #3b82f6; font-size: 16px; font-weight: bold;');
    console.log('%c🔒 No tracking • No logs • No data collection', 'color: #10b981; font-size: 12px;');
    console.log('%c⚡ Multi-engine search with WASM LLM anonymization', 'color: #f59e0b; font-size: 12px;');
    console.log('%c🛡️ Advanced privacy protection and secure by design', 'color: #ef4444; font-size: 12px;');
    console.log('%c🌐 Powered by Bless Network', 'color: #8b5cf6; font-size: 12px;');
    console.log('');
    console.log('%c💡 Tip: Press "/" to focus search input', 'color: #6b7280; font-size: 11px;');
    console.log('%c💡 Tip: Press "Escape" to close modals', 'color: #6b7280; font-size: 11px;');
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