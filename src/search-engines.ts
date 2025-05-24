export interface SearchResult {
  title: string;
  snippet: string;
  url: string;
  source: string;
}

export interface SearchEngine {
  name: string;
  url: string;
  headers: Record<string, string>;
  parser: (data: any) => SearchResult[];
  priority: number;
}

// Real browser headers to avoid bot detection
const browserHeaders = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9,tr;q=0.8',
  'Accept-Encoding': 'gzip, deflate, br',
  'DNT': '1',
  'Connection': 'keep-alive',
  'Upgrade-Insecure-Requests': '1',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Sec-Fetch-User': '?1',
  'Cache-Control': 'max-age=0'
};

// DuckDuckGo Instant Answer API parser
function parseDuckDuckGoResults(data: any): SearchResult[] {
  const results: SearchResult[] = [];
  
  try {
    // Abstract text
    if (data.Abstract && data.AbstractText) {
      results.push({
        title: data.Heading || 'Instant Answer',
        snippet: data.AbstractText,
        url: data.AbstractURL || '#',
        source: 'DuckDuckGo Instant'
      });
    }
    
    // Definition
    if (data.Definition) {
      results.push({
        title: data.DefinitionWord || 'Definition',
        snippet: data.Definition,
        url: data.DefinitionURL || '#',
        source: 'DuckDuckGo Definition'
      });
    }
    
    // Answer
    if (data.Answer) {
      results.push({
        title: 'Direct Answer',
        snippet: data.Answer,
        url: data.AnswerURL || '#',
        source: 'DuckDuckGo Answer'
      });
    }
    
    // Related topics
    if (data.RelatedTopics && Array.isArray(data.RelatedTopics)) {
      data.RelatedTopics.slice(0, 3).forEach((topic: any) => {
        if (topic && topic.Text && topic.FirstURL) {
          results.push({
            title: topic.Text.split(' - ')[0] || 'Related Topic',
            snippet: topic.Text,
            url: topic.FirstURL,
            source: 'DuckDuckGo Related'
          });
        }
      });
    }
  } catch (error) {
    // Silent error handling
  }
  
  return results;
}

// Google HTML parser (basic implementation)
function parseGoogleResults(html: string): SearchResult[] {
  const results: SearchResult[] = [];
  
  // This is a simplified parser - in real implementation we'd use proper HTML parsing
  // For now, return mock data to show the structure
  results.push({
    title: 'Google Search Result',
    snippet: 'This would be parsed from Google HTML response',
    url: 'https://example.com',
    source: 'Google'
  });
  
  return results;
}

// Bing HTML parser (basic implementation)
function parseBingResults(html: string): SearchResult[] {
  const results: SearchResult[] = [];
  
  // This is a simplified parser - in real implementation we'd use proper HTML parsing
  results.push({
    title: 'Bing Search Result',
    snippet: 'This would be parsed from Bing HTML response',
    url: 'https://example.com',
    source: 'Bing'
  });
  
  return results;
}

// Search engines configuration
export const searchEngines: Record<string, SearchEngine> = {
  duckduckgo: {
    name: 'DuckDuckGo',
    url: 'https://api.duckduckgo.com/',
    headers: browserHeaders,
    parser: parseDuckDuckGoResults,
    priority: 1
  },
  google: {
    name: 'Google',
    url: 'https://www.google.com/search',
    headers: browserHeaders,
    parser: parseGoogleResults,
    priority: 2
  },
  bing: {
    name: 'Bing',
    url: 'https://www.bing.com/search',
    headers: browserHeaders,
    parser: parseBingResults,
    priority: 3
  }
};

// Human-like delay calculation
export function calculateSearchDelay(query: string, engine: string): number {
  const baseDelay = 200;
  const queryComplexity = Math.min(query.length * 8, 400);
  const engineDelay = engine === 'duckduckgo' ? 0 : 300; // DDG API is faster
  const jitter = Math.random() * 600;
  
  return baseDelay + queryComplexity + engineDelay + jitter;
}

// Main search function with fallback
export async function searchWithFallback(query: string): Promise<{
  results: SearchResult[];
  engine: string;
  processingTime: number;
  status: 'success' | 'partial' | 'failed';
}> {
  const startTime = Date.now();
  const engines = Object.entries(searchEngines).sort((a, b) => a[1].priority - b[1].priority);
  
  for (const [engineKey, engine] of engines) {
    try {
      // Skip delay for faster testing
      // const delay = calculateSearchDelay(query, engineKey);
      // await new Promise(resolve => setTimeout(resolve, delay));
      
      let response;
      let data;
      
      if (engineKey === 'duckduckgo') {
        // DuckDuckGo API call - Bless Network method parametresi gerekli
        response = await fetch(`${engine.url}?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`, {
          method: 'GET'
        });
        
        if (response.ok) {
          const text = await response.text();
          try {
            data = JSON.parse(text);
          } catch (parseError) {
            continue;
          }
        } else {
          continue;
        }
      } else {
        // HTML scraping for Google/Bing (simplified for now)
        response = await fetch(`${engine.url}?q=${encodeURIComponent(query)}`, {
          method: 'GET'
        });
        data = await response.text();
      }
      
      if (response.ok) {
        const results = engine.parser(data);
        const processingTime = Date.now() - startTime;
        
        if (results.length > 0) {
          return {
            results,
            engine: engine.name,
            processingTime,
            status: 'success'
          };
        }
      }
      
    } catch (error) {
      continue;
    }
  }
  
  // If all engines fail, return empty results
  return {
    results: [],
    engine: 'None',
    processingTime: Date.now() - startTime,
    status: 'failed'
  };
} 