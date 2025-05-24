// Search Utilities and Advanced Features
class SearchUtils {
    constructor() {
        this.searchHistory = [];
        this.suggestions = [];
        this.cache = new Map();
        this.maxCacheSize = 50;
        this.maxHistorySize = 100;
        
        this.loadHistory();
    }

    // Search suggestions based on input
    generateSuggestions(input) {
        if (!input || input.length < 2) {
            return [];
        }

        const commonQueries = [
            'how to learn programming',
            'best privacy tools',
            'what is blockchain',
            'learn javascript',
            'privacy search engine',
            'how to protect online privacy',
            'best coding practices',
            'web development tutorial',
            'secure browsing tips',
            'open source alternatives'
        ];

        return commonQueries
            .filter(query => query.toLowerCase().includes(input.toLowerCase()))
            .slice(0, 5);
    }

    // Add search to history
    addToHistory(query, engine = 'google') {
        if (!query || query.trim().length === 0) return;

        const historyItem = {
            query: query.trim(),
            engine: engine,
            timestamp: Date.now(),
            id: this.generateId()
        };

        // Remove duplicates
        this.searchHistory = this.searchHistory.filter(
            item => item.query.toLowerCase() !== query.toLowerCase()
        );

        // Add to beginning
        this.searchHistory.unshift(historyItem);

        // Limit history size
        if (this.searchHistory.length > this.maxHistorySize) {
            this.searchHistory = this.searchHistory.slice(0, this.maxHistorySize);
        }

        this.saveHistory();
    }

    // Get search history
    getHistory() {
        return this.searchHistory.slice(0, 20); // Return last 20 searches
    }

    // Clear search history
    clearHistory() {
        this.searchHistory = [];
        this.saveHistory();
    }

    // Cache search results
    cacheResults(query, results, engine = 'google') {
        const cacheKey = this.generateCacheKey(query, engine);
        const cacheItem = {
            results,
            timestamp: Date.now(),
            engine,
            ttl: 10 * 60 * 1000 // 10 minutes
        };

        this.cache.set(cacheKey, cacheItem);

        // Clean old cache entries
        if (this.cache.size > this.maxCacheSize) {
            this.cleanCache();
        }
    }

    // Get cached results
    getCachedResults(query, engine = 'google') {
        const cacheKey = this.generateCacheKey(query, engine);
        const cacheItem = this.cache.get(cacheKey);

        if (!cacheItem) return null;

        // Check if cache is still valid
        const now = Date.now();
        if (now - cacheItem.timestamp > cacheItem.ttl) {
            this.cache.delete(cacheKey);
            return null;
        }

        console.log('📋 Using cached results for:', query);
        return cacheItem.results;
    }

    // Clean expired cache entries
    cleanCache() {
        const now = Date.now();
        const toDelete = [];

        for (const [key, item] of this.cache.entries()) {
            if (now - item.timestamp > item.ttl) {
                toDelete.push(key);
            }
        }

        toDelete.forEach(key => this.cache.delete(key));

        // If still too large, remove oldest entries
        if (this.cache.size > this.maxCacheSize) {
            const entries = Array.from(this.cache.entries());
            entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
            
            const toRemove = entries.slice(0, this.cache.size - this.maxCacheSize);
            toRemove.forEach(([key]) => this.cache.delete(key));
        }
    }

    // Generate cache key
    generateCacheKey(query, engine) {
        return `${engine}:${query.toLowerCase().trim()}`;
    }

    // Generate unique ID
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    // Load search history from localStorage
    loadHistory() {
        try {
            const saved = localStorage.getItem('mirror-search-history');
            if (saved) {
                this.searchHistory = JSON.parse(saved);
                
                // Clean old entries (older than 30 days)
                const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
                this.searchHistory = this.searchHistory.filter(
                    item => item.timestamp > thirtyDaysAgo
                );
            }
        } catch (error) {
            console.warn('Failed to load search history:', error);
            this.searchHistory = [];
        }
    }

    // Save search history to localStorage
    saveHistory() {
        try {
            localStorage.setItem('mirror-search-history', JSON.stringify(this.searchHistory));
        } catch (error) {
            console.warn('Failed to save search history:', error);
        }
    }

    // Format search results for display
    formatResults(results) {
        if (!Array.isArray(results)) return [];

        return results.map(result => ({
            ...result,
            title: this.sanitizeText(result.title),
            snippet: this.sanitizeText(result.snippet),
            displayUrl: this.formatDisplayUrl(result.url),
            favicon: this.getFaviconUrl(result.url)
        }));
    }

    // Sanitize text content
    sanitizeText(text) {
        if (!text) return '';
        
        // Remove HTML tags and decode entities
        const div = document.createElement('div');
        div.innerHTML = text;
        return div.textContent || div.innerText || '';
    }

    // Format display URL
    formatDisplayUrl(url) {
        try {
            const urlObj = new URL(url);
            let display = urlObj.hostname;
            
            if (urlObj.pathname !== '/') {
                display += urlObj.pathname;
            }
            
            // Limit length
            if (display.length > 50) {
                display = display.substring(0, 47) + '...';
            }
            
            return display;
        } catch (error) {
            return url;
        }
    }

    // Get favicon URL
    getFaviconUrl(url) {
        try {
            const urlObj = new URL(url);
            return `https://www.google.com/s2/favicons?domain=${urlObj.hostname}`;
        } catch (error) {
            return '/images/default-favicon.png';
        }
    }

    // Validate search query
    validateQuery(query) {
        if (!query || typeof query !== 'string') {
            return { valid: false, error: 'Query must be a non-empty string' };
        }

        const trimmed = query.trim();
        
        if (trimmed.length === 0) {
            return { valid: false, error: 'Query cannot be empty' };
        }

        if (trimmed.length > 500) {
            return { valid: false, error: 'Query too long (max 500 characters)' };
        }

        // Check for potentially harmful content
        const harmfulPatterns = [
            /<script/i,
            /javascript:/i,
            /data:text\/html/i
        ];

        for (const pattern of harmfulPatterns) {
            if (pattern.test(trimmed)) {
                return { valid: false, error: 'Query contains potentially harmful content' };
            }
        }

        return { valid: true, query: trimmed };
    }

    // Get search statistics
    getStats() {
        const engines = {};
        const dailySearches = {};
        
        this.searchHistory.forEach(item => {
            // Count by engine
            engines[item.engine] = (engines[item.engine] || 0) + 1;
            
            // Count by day
            const date = new Date(item.timestamp).toDateString();
            dailySearches[date] = (dailySearches[date] || 0) + 1;
        });

        return {
            totalSearches: this.searchHistory.length,
            cacheSize: this.cache.size,
            cacheHitRate: this.calculateCacheHitRate(),
            engineUsage: engines,
            dailySearches,
            lastSearch: this.searchHistory[0]?.timestamp || null
        };
    }

    // Calculate cache hit rate
    calculateCacheHitRate() {
        // This would be implemented with actual hit/miss tracking
        return Math.random() * 0.3 + 0.4; // Mock 40-70% hit rate
    }
}

// Global search utilities instance
window.searchUtils = new SearchUtils();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SearchUtils;
} 