// Search Engine HTML Parsers
import * as cheerio from 'cheerio';

export interface SearchResult {
  title: string;
  url: string;
  displayUrl: string;
  snippet: string;
  favicon?: string;
  rank?: number;
}

export interface ParsedResults {
  results: SearchResult[];
  totalResults: number;
  searchTime: number;
  nextPageUrl?: string;
}

// Google Search Results Parser
export function parseGoogleResults(html: string): ParsedResults {
  const $ = cheerio.load(html);
  const results: SearchResult[] = [];
  
  // Google search result selectors
  const resultElements = $('div[data-ved] h3').parent().parent();
  
  resultElements.each((index, element) => {
    try {
      const $element = $(element);
      
      // Extract title
      const titleElement = $element.find('h3').first();
      const title = titleElement.text().trim();
      
      if (!title) return;
      
      // Extract URL
      const linkElement = $element.find('a[href]').first();
      let url = linkElement.attr('href') || '';
      
      // Clean Google redirect URLs
      if (url.startsWith('/url?q=')) {
        const urlParam = new URLSearchParams(url.substring(6));
        url = urlParam.get('q') || url;
      }
      
      if (!url || url.startsWith('/search') || url.startsWith('#')) return;
      
      // Extract snippet
      const snippetElement = $element.find('div[data-ved] span').last();
      const snippet = snippetElement.text().trim();
      
      // Extract display URL
      const displayUrlElement = $element.find('cite').first();
      const displayUrl = displayUrlElement.text().trim() || extractDomain(url);
      
      results.push({
        title,
        url,
        displayUrl,
        snippet,
        rank: index + 1
      });
      
    } catch (error) {
      console.warn('Error parsing Google result:', error);
    }
  });
  
  // Extract total results count
  const statsElement = $('#result-stats');
  const statsText = statsElement.text();
  const totalResults = extractResultCount(statsText);
  
  return {
    results,
    totalResults,
    searchTime: 0 // Will be calculated by caller
  };
}

// Bing Search Results Parser
export function parseBingResults(html: string): ParsedResults {
  const $ = cheerio.load(html);
  const results: SearchResult[] = [];
  
  // Bing search result selectors
  const resultElements = $('.b_algo');
  
  resultElements.each((index, element) => {
    try {
      const $element = $(element);
      
      // Extract title
      const titleElement = $element.find('h2 a').first();
      const title = titleElement.text().trim();
      
      if (!title) return;
      
      // Extract URL
      const url = titleElement.attr('href') || '';
      
      if (!url || url.startsWith('/search') || url.startsWith('#')) return;
      
      // Extract snippet
      const snippetElement = $element.find('.b_caption p, .b_caption .b_descript').first();
      const snippet = snippetElement.text().trim();
      
      // Extract display URL
      const displayUrlElement = $element.find('.b_attribution cite, .b_caption cite').first();
      const displayUrl = displayUrlElement.text().trim() || extractDomain(url);
      
      results.push({
        title,
        url,
        displayUrl,
        snippet,
        rank: index + 1
      });
      
    } catch (error) {
      console.warn('Error parsing Bing result:', error);
    }
  });
  
  // Extract total results count
  const statsElement = $('.sb_count');
  const statsText = statsElement.text();
  const totalResults = extractResultCount(statsText);
  
  return {
    results,
    totalResults,
    searchTime: 0
  };
}

// DuckDuckGo Search Results Parser
export function parseDuckDuckGoResults(html: string): ParsedResults {
  const $ = cheerio.load(html);
  const results: SearchResult[] = [];
  
  // DuckDuckGo search result selectors
  const resultElements = $('[data-result="result"]');
  
  resultElements.each((index, element) => {
    try {
      const $element = $(element);
      
      // Extract title
      const titleElement = $element.find('h2 a, .result__title a').first();
      const title = titleElement.text().trim();
      
      if (!title) return;
      
      // Extract URL
      let url = titleElement.attr('href') || '';
      
      // Handle DuckDuckGo redirect URLs
      if (url.startsWith('/l/?uddg=') || url.startsWith('/l/?kh=')) {
        const urlParam = new URLSearchParams(url.substring(3));
        url = decodeURIComponent(urlParam.get('uddg') || urlParam.get('kh') || url);
      }
      
      if (!url || url.startsWith('/search') || url.startsWith('#')) return;
      
      // Extract snippet
      const snippetElement = $element.find('.result__snippet, [data-result="snippet"]').first();
      const snippet = snippetElement.text().trim();
      
      // Extract display URL
      const displayUrlElement = $element.find('.result__url, [data-result="url"]').first();
      const displayUrl = displayUrlElement.text().trim() || extractDomain(url);
      
      results.push({
        title,
        url,
        displayUrl,
        snippet,
        rank: index + 1
      });
      
    } catch (error) {
      console.warn('Error parsing DuckDuckGo result:', error);
    }
  });
  
  return {
    results,
    totalResults: results.length, // DDG doesn't show total count
    searchTime: 0
  };
}

// Utility Functions
function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    return url;
  }
}

function extractResultCount(statsText: string): number {
  if (!statsText) return 0;
  
  // Match patterns like "About 1,234,567 results"
  const matches = statsText.match(/[\d,]+/);
  if (matches) {
    return parseInt(matches[0].replace(/,/g, ''), 10) || 0;
  }
  
  return 0;
}

// User Agent Rotation for Anti-Detection
export const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
];

export function getRandomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

// Generate privacy-preserving headers
export function getPrivacyHeaders(): Record<string, string> {
  return {
    'User-Agent': getRandomUserAgent(),
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Cache-Control': 'no-cache',
    'DNT': '1', // Do Not Track
    'Pragma': 'no-cache'
  };
} 