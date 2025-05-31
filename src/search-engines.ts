/**
 * Search Engines Module for Mirror Search
 * Multi-engine search with WASM LLM integration
 */

import { wasmLLM, AnonymizationResult } from './wasm-llm';

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  source: string;
}

export interface SearchResponse {
  results: SearchResult[];
  totalResults: number;
  totalTime: number;
  engine: string;
  status: {
    anonymized: boolean;
    protected: boolean;
    fast: boolean;
    secure: boolean;
  };
  anonymization?: AnonymizationResult;
  debug?: {
    anonymizationMethod: string;
    originalQuery: string;
    anonymizedQuery: string;
    confidence: number;
  };
  errorInfo?: {
    brightDataError?: string;
    duckduckgoError?: string;
  };
}

export interface SearchEngineConfig {
  timeout: number;
  maxResults: number;
  userAgent: string;
  enableAnonymization: boolean;
}

export class SearchEngines {
  private config: SearchEngineConfig;
  private readonly SEARCH_API_URL = 'https://api.duckduckgo.com/';
  private readonly BRIGHT_DATA_PROXY_URL = 'https://mirror-search-proxy.onrender.com/api/brightdata'; // Render.com proxy endpoint
  private readonly BRIGHT_DATA_API_URL = 'https://api.brightdata.com/request';

  constructor(config: Partial<SearchEngineConfig> = {}) {
    this.config = {
      timeout: 10000,
      maxResults: 10,
      userAgent: 'Mirror Search Bot 2.1 (Privacy-First)',
      enableAnonymization: true,
      ...config
    };
  }

  async search(query: string, useAnonymization: boolean = true): Promise<SearchResponse> {
    const startTime = Date.now();
    
    try {
      let finalQuery = query;
      let anonymizationResult: AnonymizationResult | undefined;

      // Apply WASM LLM anonymization if enabled
      if (useAnonymization && this.config.enableAnonymization) {
        try {
          anonymizationResult = await wasmLLM.anonymizeQuery(query);
          finalQuery = anonymizationResult.anonymizedQuery;
          
          // Debug: Check if anonymized query is empty or too short
          if (!finalQuery || finalQuery.trim().length < 2) {
            finalQuery = query; // Fallback to original
            anonymizationResult = undefined;
          }
        } catch (error) {
          // Silent fallback to original query
          finalQuery = query;
        }
      }

      // Try to use Bright Data proxy as primary search engine
      let results: SearchResult[];
      let engine: string;
      let errorInfo: {brightDataError?: string; duckduckgoError?: string} = {};
      
      try {
        results = await this.searchBrightDataProxy(finalQuery);
        engine = 'Google via Bright Data Proxy';
      } catch (brightDataError) {
        errorInfo.brightDataError = brightDataError instanceof Error ? brightDataError.message : String(brightDataError);
        
        // If Bright Data proxy fails, fallback to DuckDuckGo
        try {
          results = await this.searchDuckDuckGo(finalQuery);
          engine = 'DuckDuckGo Privacy Search';
        } catch (duckduckgoError) {
          errorInfo.duckduckgoError = duckduckgoError instanceof Error ? duckduckgoError.message : String(duckduckgoError);
          
          // If both fail, use mock results
          return await this.getMockResults(query, Date.now() - startTime, useAnonymization, errorInfo);
        }
      }
      
      const totalTime = Date.now() - startTime;

      return {
        results,
        totalResults: results.length,
        totalTime,
        engine,
        status: {
          anonymized: !!anonymizationResult,
          protected: true,
          fast: totalTime < 2000,
          secure: true
        },
        anonymization: anonymizationResult,
        debug: anonymizationResult ? {
          anonymizationMethod: anonymizationResult.method,
          originalQuery: anonymizationResult.originalQuery,
          anonymizedQuery: anonymizationResult.anonymizedQuery,
          confidence: anonymizationResult.confidence
        } : undefined,
        errorInfo: Object.keys(errorInfo).length > 0 ? errorInfo : undefined
      };

    } catch (error) {
      // Enhanced error reporting for WASM environment debugging
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorName = error instanceof Error ? error.name : 'Unknown';
      throw new Error(`Search failed: ${errorName} - ${errorMessage}`);
    }
  }

  private async searchBrightDataProxy(query: string): Promise<SearchResult[]> {
    try {
      const cleanQuery = query.trim();
      
      // Create an AbortController with longer timeout for Bright Data
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
        throw new Error('Bright Data proxy request timed out after 15 seconds');
      }, 15000); // 15 second timeout
      
      try {
        // Use the Render.com hosted proxy server
        const response = await fetch(this.BRIGHT_DATA_PROXY_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': this.config.userAgent,
            'Accept': 'application/json',
            'X-Request-Debug': 'true'
          },
          body: JSON.stringify({
            query: cleanQuery,
            num: this.config.maxResults,
            hl: 'en',
            gl: 'us',
            debug: true
          }),
          signal: controller.signal
        });
        
        // Clear the timeout
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Proxy HTTP error: ${response.status} - ${errorText.substring(0, 200)}`);
        }
        
        // First try to parse as text to check for any unwanted output
        const responseText = await response.text();
        
        // Try to parse the response as JSON
        let data;
        try {
          data = JSON.parse(responseText);
        } catch (jsonError) {
          // Try to extract valid JSON part if mixed with other content
          try {
            const jsonStartIndex = responseText.indexOf('{');
            const jsonEndIndex = responseText.lastIndexOf('}') + 1;
            if (jsonStartIndex >= 0 && jsonEndIndex > jsonStartIndex) {
              const jsonPart = responseText.substring(jsonStartIndex, jsonEndIndex);
              data = JSON.parse(jsonPart);
            } else {
              throw new Error(`No valid JSON found in response`);
            }
          } catch (extractError) {
            throw new Error(`JSON parse error: ${jsonError.message}. Response starts with: ${responseText.substring(0, 100)}`);
          }
        }
        
        if (!data.success || !data.results || !Array.isArray(data.results)) {
          throw new Error(`Invalid response format from proxy: ${JSON.stringify(data).substring(0, 200)}`);
        }
        
        if (data.results.length === 0) {
          throw new Error('No search results returned from proxy');
        }
        
        return data.results.map((result: any) => ({
          title: result.title || `Result for ${cleanQuery}`,
          url: result.url || `https://www.google.com/search?q=${encodeURIComponent(cleanQuery)}`,
          snippet: result.snippet || 'No description available',
          source: result.source || 'Bright Data SERP'
        }));
        
      } catch (fetchError) {
        // Make sure to clear the timeout in case of error
        clearTimeout(timeoutId);
        throw fetchError;
      }
      
    } catch (error) {
      // Add more context to the error
      const errorMessage = error instanceof Error ? 
        `Bright Data proxy error: ${error.message}` : 
        `Unknown Bright Data proxy error: ${String(error)}`;
      
      // Test direct proxy health check to provide more context
      try {
        // Use AbortController with timeout for health check
        const healthController = new AbortController();
        const healthTimeoutId = setTimeout(() => healthController.abort(), 5000);
        
        const healthResponse = await fetch(`${this.BRIGHT_DATA_PROXY_URL}/health`, { 
          method: 'GET',
          signal: healthController.signal
        });
        
        clearTimeout(healthTimeoutId);
        
        if (!healthResponse.ok) {
          throw new Error(`Proxy health check failed with status ${healthResponse.status}`);
        }
      } catch (healthError) {
        throw new Error(`${errorMessage} | Health check: ${healthError instanceof Error ? healthError.message : String(healthError)}`);
      }
      
      throw new Error(errorMessage);
    }
  }

  private async searchBrightData(query: string): Promise<SearchResult[]> {
    try {
      const cleanQuery = query.trim();
      
      // Removed hard-coded API token - this method is not used in production
      // Token should be set via environment variables on the server
      const apiToken = '***REMOVED***'; // Token removed for security
      const zone = 'serp_api1';
      
      // Test simple fetch first
      const response = await fetch(this.BRIGHT_DATA_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          zone: zone,
          url: `https://www.google.com/search?q=${encodeURIComponent(cleanQuery)}&num=10&hl=en&gl=us`,
          format: 'raw'
        })
      });
      
      // Detailed response analysis
      const responseStatus = response.status;
      const responseStatusText = response.statusText;
      const responseHeaders = {};
      
      // Try to get headers (WASM might not support all)
      try {
        response.headers.forEach((value, key) => {
          responseHeaders[key] = value;
        });
      } catch (headerError) {
        // Headers might not be accessible in WASM
      }
      
      if (!response.ok) {
        const errorText = await response.text();
        return [{
          title: `${cleanQuery} - HTTP ${responseStatus} Error`,
          url: `https://www.google.com/search?q=${encodeURIComponent(cleanQuery)}`,
          snippet: `HTTP ${responseStatus} ${responseStatusText}. Response: ${errorText.substring(0, 200)}. Headers: ${JSON.stringify(responseHeaders)}`,
          source: 'Bright Data HTTP Error'
        }];
      }
      
      const responseText = await response.text();
      
      // Check for authentication errors in body
      if (responseText.includes('User authentication is required') || 
          responseText.includes('authentication') ||
          responseText.includes('unauthorized')) {
        return [{
          title: `${cleanQuery} - Auth Error (Status: ${responseStatus})`,
          url: `https://www.google.com/search?q=${encodeURIComponent(cleanQuery)}`,
          snippet: `Auth failed with status ${responseStatus}. Body sample: ${responseText.substring(0, 300)}`,
          source: 'Bright Data Auth Debug'
        }];
      }
      
      // Always try to parse Google HTML - bypass the check for debugging
      const results = this.parseGoogleHTML(responseText, cleanQuery);
      if (results.length > 0) {
        return results;
      }
      
      // If no results found, create basic results with HTML info
      return [{
        title: `${cleanQuery} - No Parse Results (HTML: ${responseText.length}chars)`,
        url: `https://www.google.com/search?q=${encodeURIComponent(cleanQuery)}`,
        snippet: `HTML received but parsing failed. Length: ${responseText.length} chars`,
        source: 'Bright Data SERP Debug'
      }];
      
    } catch (error) {
      throw error;
    }
  }

  private parseGoogleHTML(html: string, query: string): SearchResult[] {
    const results: SearchResult[] = [];

    try {
      // Step 1: Find all h3 elements with LC20lb class and their titles
      const titlePattern = /<h3[^>]*class="[^"]*LC20lb[^"]*"[^>]*>([^<]*)<\/h3>/g;
      const titles: string[] = [];
      let titleMatch;
      
      while ((titleMatch = titlePattern.exec(html)) !== null) {
        titles.push(titleMatch[1].replace(/&amp;/g, '&').trim());
      }
      
      // Step 2: Find all links with href that are likely search results
      const linkPattern = /<a[^>]*href="([^"]*)"[^>]*>/g;
      const links: string[] = [];
      let linkMatch;
      
      while ((linkMatch = linkPattern.exec(html)) !== null) {
        const url = linkMatch[1];
        
        // Only include external links, skip Google internal ones
        if (url.startsWith('http') && 
            !url.includes('google.com/url') && 
            !url.includes('google.com/search') &&
            !url.includes('webcache.googleusercontent.com') &&
            !url.includes('accounts.google') &&
            !url.includes('policies.google')) {
          links.push(url);
        }
      }
      
      // Step 3: Match titles with links (take first N pairs)
      const maxResults = Math.min(titles.length, links.length, this.config.maxResults);
      
      for (let i = 0; i < maxResults; i++) {
        if (titles[i] && links[i]) {
          results.push({
            title: titles[i],
            url: links[i],
            snippet: `Search result for "${query}" from Google (Found T:${titles.length}/L:${links.length})`,
            source: 'Bright Data SERP'
          });
        }
      }
      
      // If no results, create debug result
      if (results.length === 0) {
        results.push({
          title: `${query} - No Results (Debug: T:${titles.length}/L:${links.length})`,
          url: `https://www.google.com/search?q=${encodeURIComponent(query)}`,
          snippet: `Debug: Found ${titles.length} titles, ${links.length} links. HTML sample: ${html.substring(0, 300)}...`,
          source: 'Bright Data SERP Debug'
        });
      }
      
      return results;

    } catch (error) {
      return [];
    }
  }

  private parseBrightDataResults(data: any): SearchResult[] {
    const results: SearchResult[] = [];

    try {
      // Parse organic search results
      if (data.organic && Array.isArray(data.organic)) {
        data.organic.slice(0, this.config.maxResults).forEach((result: any) => {
          if (result.title && result.link) {
            results.push({
              title: result.title,
              url: result.link,
              snippet: result.snippet || result.description || 'No description available',
              source: 'Bright Data SERP'
            });
          }
        });
      }

      // Parse featured snippets if available
      if (data.featured_snippet) {
        const snippet = data.featured_snippet;
        if (snippet.title && snippet.link) {
          results.unshift({
            title: snippet.title,
            url: snippet.link,
            snippet: snippet.snippet || snippet.description || 'Featured snippet',
            source: 'Bright Data Featured'
          });
        }
      }

      // Parse knowledge panel if available
      if (data.knowledge_panel && data.knowledge_panel.title) {
        const kp = data.knowledge_panel;
        results.unshift({
          title: kp.title,
          url: kp.website || kp.source_link || '#',
          snippet: kp.description || kp.subtitle || 'Knowledge panel information',
          source: 'Bright Data Knowledge'
        });
      }

      return results.slice(0, this.config.maxResults);

    } catch (error) {
      return [];
    }
  }

  private async searchDuckDuckGo(query: string): Promise<SearchResult[]> {
    try {
      // Ensure query is valid
      if (!query || query.trim().length < 2) {
        throw new Error('Query too short');
      }

      const cleanQuery = query.trim();
      const url = `${this.SEARCH_API_URL}?q=${encodeURIComponent(cleanQuery)}&format=json&no_html=1&skip_disambig=1`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': this.config.userAgent,
          'Accept': 'application/json',
          'Accept-Language': 'en-US,en;q=0.9',
        }
      });

      if (!response.ok) {
        throw new Error(`DuckDuckGo API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      const results = this.parseDuckDuckGoResults(data);
      
      // If no results from DuckDuckGo, throw error to trigger fallback
      if (results.length === 0) {
        throw new Error('No results from DuckDuckGo API');
      }
      
      return results;

    } catch (error) {
      throw error;
    }
  }

  private parseDuckDuckGoResults(data: any): SearchResult[] {
    const results: SearchResult[] = [];

    try {
      // Parse Abstract (main result)
      if (data.Abstract && data.AbstractText && data.AbstractURL) {
        results.push({
          title: data.Heading || 'Definition',
          url: data.AbstractURL,
          snippet: data.AbstractText,
          source: 'DuckDuckGo Instant'
        });
      }

      // Parse Definition
      if (data.Definition && data.DefinitionURL) {
        results.push({
          title: data.Definition,
          url: data.DefinitionURL,
          snippet: data.Definition,
          source: 'DuckDuckGo Definition'
        });
      }

      // Parse Answer
      if (data.Answer && data.AnswerType) {
        results.push({
          title: `${data.AnswerType} Answer`,
          url: data.AbstractURL || '#',
          snippet: data.Answer,
          source: 'DuckDuckGo Answer'
        });
      }

      // Parse Related Topics
      if (data.RelatedTopics && Array.isArray(data.RelatedTopics)) {
        data.RelatedTopics.slice(0, 5).forEach((topic: any) => {
          if (topic.Text && topic.FirstURL) {
            results.push({
              title: topic.Text.split(' - ')[0] || 'Related Topic',
              url: topic.FirstURL,
              snippet: topic.Text,
              source: 'DuckDuckGo Related'
            });
          }
        });
      }

      // Parse Results (if available)
      if (data.Results && Array.isArray(data.Results)) {
        data.Results.slice(0, 3).forEach((result: any) => {
          if (result.Text && result.FirstURL) {
            results.push({
              title: result.Text.split(' - ')[0] || 'Search Result',
              url: result.FirstURL,
              snippet: result.Text,
              source: 'DuckDuckGo'
            });
          }
        });
      }

      return results.slice(0, this.config.maxResults);

    } catch (error) {
      return [];
    }
  }

  private async getMockResults(query: string, processingTime: number, anonymized: boolean, errorInfo?: {
    brightDataError?: string;
    duckduckgoError?: string;
  }): Promise<SearchResponse> {
    // Apply real anonymization even for mock results
    let anonymizationResult: AnonymizationResult | undefined;
    let finalQuery = query;
    
    if (anonymized && this.config.enableAnonymization) {
      try {
        anonymizationResult = await wasmLLM.anonymizeQuery(query);
        finalQuery = anonymizationResult.anonymizedQuery;
      } catch (error) {
        // Silent fallback to original query
        finalQuery = query;
      }
    }
    
    // Fallback mock results when API fails
    const mockResults: SearchResult[] = [
      {
        title: `${finalQuery} - Search Results`,
        url: `https://en.wikipedia.org/wiki/${encodeURIComponent(finalQuery)}`,
        snippet: `Information about ${finalQuery}. This is a mock result while the search engine is being optimized for better performance.`,
        source: 'Mirror Search'
      },
      {
        title: `${finalQuery} Guide and Information`,
        url: `https://example.com/search?q=${encodeURIComponent(finalQuery)}`,
        snippet: `Comprehensive guide and detailed information about ${finalQuery}. Privacy-first search results.`,
        source: 'Mirror Search'
      },
      {
        title: `Best ${finalQuery} Resources`,
        url: `https://example.com/resources/${encodeURIComponent(finalQuery)}`,
        snippet: `Top resources and links related to ${finalQuery}. Curated content for your search query.`,
        source: 'Mirror Search'
      }
    ];

    return {
      results: mockResults,
      totalResults: mockResults.length,
      totalTime: processingTime,
      engine: 'Mirror Search (Fallback)',
      status: {
        anonymized: !!anonymizationResult,
        protected: true,
        fast: processingTime < 1000,
        secure: true
      },
      anonymization: anonymizationResult,
      debug: anonymizationResult ? {
        anonymizationMethod: anonymizationResult.method,
        originalQuery: anonymizationResult.originalQuery,
        anonymizedQuery: anonymizationResult.anonymizedQuery,
        confidence: anonymizationResult.confidence
      } : {
        anonymizationMethod: 'no-anonymization',
        originalQuery: query,
        anonymizedQuery: query,
        confidence: 0.0
      },
      errorInfo
    };
  }

  async getEngineStatus(): Promise<{
    brightData: boolean;
    duckduckgo: boolean;
    wasmLLM: boolean;
    totalEngines: number;
    activeEngines: number;
  }> {
    const wasmStatus = await wasmLLM.getStatus();
    
    // Test Bright Data proxy availability
    let brightDataStatus = false;
    try {
      // Test the proxy endpoint
      const testResponse = await fetch(`${this.BRIGHT_DATA_PROXY_URL}/health`, {
        method: 'GET'
      });
      brightDataStatus = testResponse.ok;
    } catch (error) {
      // Silent error handling
    }
    
    // Test DuckDuckGo availability
    let duckduckgoStatus = false;
    try {
      const testResponse = await fetch(`${this.SEARCH_API_URL}?q=test&format=json`, {
        method: 'GET'
      });
      duckduckgoStatus = testResponse.ok;
    } catch (error) {
      // Silent error handling
    }

    const activeEngines = (brightDataStatus ? 1 : 0) + (duckduckgoStatus ? 1 : 0) + (wasmStatus.initialized ? 1 : 0);

    return {
      brightData: brightDataStatus,
      duckduckgo: duckduckgoStatus,
      wasmLLM: wasmStatus.initialized,
      totalEngines: 3,
      activeEngines
    };
  }

  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    engines: object;
    timestamp: number;
  }> {
    const engineStatus = await this.getEngineStatus();
    const wasmStatus = await wasmLLM.getStatus();
    
    let status: 'healthy' | 'degraded' | 'unhealthy';
    
    if (engineStatus.activeEngines === engineStatus.totalEngines) {
      status = 'healthy';
    } else if (engineStatus.activeEngines > 0) {
      status = 'degraded';
    } else {
      status = 'unhealthy';
    }

    return {
      status,
      engines: {
        brightData: {
          available: engineStatus.brightData,
          endpoint: this.BRIGHT_DATA_PROXY_URL,
          configured: true
        },
        duckduckgo: {
          available: engineStatus.duckduckgo,
          endpoint: this.SEARCH_API_URL
        },
        wasmLLM: {
          available: wasmStatus.initialized,
          version: wasmStatus.version,
          rulesCount: wasmStatus.rulesCount
        }
      },
      timestamp: Date.now()
    };
  }
}

// Export singleton instance
export const searchEngines = new SearchEngines(); 