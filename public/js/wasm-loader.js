// WASM LLM Loader for Query Paraphrasing
class WasmLLMLoader {
    constructor() {
        this.isLoaded = false;
        this.isLoading = false;
        this.module = null;
        this.ctx = null;
        
        // Model configuration
        this.config = {
            modelPath: '/wasm/paraphraser.wasm',
            modelSize: 18 * 1024 * 1024, // 18MB
            heapSize: 16 * 1024 * 1024,  // 16MB heap
            maxTokens: 32,
            temperature: 0.7
        };
        
        this.loadPromises = [];
    }

    async load() {
        if (this.isLoaded) {
            return this.module;
        }

        if (this.isLoading) {
            // Return existing promise if already loading
            return new Promise((resolve, reject) => {
                this.loadPromises.push({ resolve, reject });
            });
        }

        this.isLoading = true;
        
        try {
            console.log('📦 Loading WASM LLM module...');
            
            // Check if WebAssembly is supported
            if (typeof WebAssembly === 'undefined') {
                throw new Error('WebAssembly not supported in this browser');
            }

            // Check if SIMD is supported for better performance
            const simdSupported = await this.checkSIMDSupport();
            if (simdSupported) {
                console.log('⚡ SIMD support detected, using optimized build');
            }

            // Load the WASM module
            await this.loadWasmModule();
            
            // Initialize the LLM context
            await this.initializeContext();
            
            this.isLoaded = true;
            this.isLoading = false;
            
            console.log('✅ WASM LLM module loaded successfully');
            
            // Resolve all waiting promises
            this.loadPromises.forEach(({ resolve }) => resolve(this.module));
            this.loadPromises = [];
            
            return this.module;
            
        } catch (error) {
            this.isLoading = false;
            console.error('❌ Failed to load WASM LLM module:', error);
            
            // Reject all waiting promises
            this.loadPromises.forEach(({ reject }) => reject(error));
            this.loadPromises = [];
            
            throw error;
        }
    }

    async checkSIMDSupport() {
        try {
            // Test SIMD support with a simple WASM module
            const wasmCode = new Uint8Array([
                0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00,
                0x01, 0x04, 0x01, 0x60, 0x00, 0x00, 0x03, 0x02,
                0x01, 0x00, 0x0a, 0x09, 0x01, 0x07, 0x00, 0xfd,
                0x0f, 0x45, 0x0b
            ]);
            
            await WebAssembly.instantiate(wasmCode);
            return true;
        } catch (e) {
            return false;
        }
    }

    async loadWasmModule() {
        try {
            // For development, we'll create a mock WASM module
            // In production, this would load the actual tiny-paraphrase model
            
            console.log('🔄 Creating mock WASM module for development...');
            
            // Mock WASM module that simulates LLM behavior
            this.module = {
                // Mock functions that would be exported from real WASM
                malloc: (size) => new ArrayBuffer(size),
                free: (ptr) => { /* cleanup */ },
                init_model: () => true,
                paraphrase: (text) => this.mockParaphrase(text),
                set_temperature: (temp) => { this.config.temperature = temp; },
                get_memory_usage: () => ({ used: 12000000, total: 18000000 })
            };
            
            // Simulate loading time
            await new Promise(resolve => setTimeout(resolve, 500));
            
        } catch (error) {
            throw new Error(`Failed to load WASM module: ${error.message}`);
        }
    }

    async initializeContext() {
        try {
            console.log('🧠 Initializing LLM context...');
            
            // Initialize the model context
            this.ctx = {
                initialized: true,
                modelLoaded: true,
                vocabularySize: 32000,
                contextLength: 512,
                temperature: this.config.temperature
            };
            
            // Simulate initialization time
            await new Promise(resolve => setTimeout(resolve, 200));
            
        } catch (error) {
            throw new Error(`Failed to initialize LLM context: ${error.message}`);
        }
    }

    async paraphrase(query, options = {}) {
        if (!this.isLoaded) {
            await this.load();
        }

        try {
            const startTime = performance.now();
            
            console.log(`📝 Paraphrasing: "${query}"`);
            
            // Validate input
            if (!query || typeof query !== 'string') {
                throw new Error('Invalid query input');
            }

            if (query.length > 200) {
                console.warn('Query is very long, truncating...');
                query = query.substring(0, 200);
            }

            // Configure paraphrasing options
            const config = {
                temperature: options.temperature || this.config.temperature,
                maxTokens: options.maxTokens || this.config.maxTokens,
                preserveKeywords: options.preserveKeywords !== false
            };

            // Perform paraphrasing
            const result = await this.performParaphrasing(query, config);
            
            const endTime = performance.now();
            const duration = Math.round(endTime - startTime);
            
            console.log(`✅ Paraphrasing completed in ${duration}ms`);
            console.log(`Original: "${query}"`);
            console.log(`Paraphrased: "${result}"`);
            
            return result;
            
        } catch (error) {
            console.error('❌ Paraphrasing failed:', error);
            
            // Fallback to original query if paraphrasing fails
            console.log('🔄 Using original query as fallback');
            return query;
        }
    }

    async performParaphrasing(query, config) {
        // This is a mock implementation
        // In production, this would call the actual WASM LLM functions
        
        return this.mockParaphrase(query);
    }

    mockParaphrase(query) {
        // Mock paraphrasing for development
        // This simulates what a real LLM would do
        
        const synonyms = {
            'how to': 'ways to',
            'what is': 'define',
            'best': 'top',
            'guide': 'tutorial',
            'learn': 'study',
            'free': 'no cost',
            'online': 'internet',
            'download': 'get',
            'install': 'setup',
            'review': 'evaluation'
        };

        let paraphrased = query.toLowerCase();
        
        // Apply some basic transformations
        Object.entries(synonyms).forEach(([original, replacement]) => {
            const regex = new RegExp(original, 'gi');
            paraphrased = paraphrased.replace(regex, replacement);
        });

        // Add some variations
        const variations = [
            // Add contextual words
            (text) => Math.random() > 0.5 ? `information about ${text}` : text,
            // Reorder some words
            (text) => text.split(' ').length > 2 && Math.random() > 0.7 ? 
                text.split(' ').reverse().join(' ') : text,
            // Add question words
            (text) => Math.random() > 0.6 ? `find ${text}` : text
        ];

        // Apply random variation
        const variation = variations[Math.floor(Math.random() * variations.length)];
        paraphrased = variation(paraphrased);

        return paraphrased.trim();
    }

    getStats() {
        return {
            isLoaded: this.isLoaded,
            isLoading: this.isLoading,
            memoryUsage: this.module?.get_memory_usage?.() || null,
            config: this.config
        };
    }

    async unload() {
        if (this.module && this.module.free) {
            // Cleanup WASM memory
            this.module.free();
        }
        
        this.isLoaded = false;
        this.module = null;
        this.ctx = null;
        
        console.log('🗑️ WASM LLM module unloaded');
    }
}

// Global instance
window.wasmLLM = new WasmLLMLoader();

// Preload the module for better performance
document.addEventListener('DOMContentLoaded', () => {
    // Start loading in background
    window.wasmLLM.load().catch(error => {
        console.warn('Background WASM loading failed:', error);
    });
}); 