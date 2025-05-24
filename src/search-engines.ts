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

      // Perform search with DuckDuckGo API
      const results = await this.searchDuckDuckGo(finalQuery);
      
      const totalTime = Date.now() - startTime;

      return {
        results,
        totalResults: results.length,
        totalTime,
        engine: 'DuckDuckGo',
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
        } : undefined
      };

    } catch (error) {
      // Return mock results as fallback
      return await this.getMockResults(query, Date.now() - startTime, useAnonymization);
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

  private async getMockResults(query: string, processingTime: number, anonymized: boolean): Promise<SearchResponse> {
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
      }
    };
  }

  async getEngineStatus(): Promise<{
    duckduckgo: boolean;
    wasmLLM: boolean;
    totalEngines: number;
    activeEngines: number;
  }> {
    const wasmStatus = await wasmLLM.getStatus();
    
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

    const activeEngines = (duckduckgoStatus ? 1 : 0) + (wasmStatus.initialized ? 1 : 0);

    return {
      duckduckgo: duckduckgoStatus,
      wasmLLM: wasmStatus.initialized,
      totalEngines: 2,
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