import WebServer from '@blockless/sdk-ts/dist/lib/web';
import { searchWithFallback, SearchResult } from './src/search-engines';

const server = new WebServer();

// Serve static files from public directory
server.statics('public', '/');

// Search endpoint
server.post('/search', async (req: any, res: any) => {
  try {
    // Handle both string and object body formats
    let body;
    if (typeof req.body === 'string') {
      body = JSON.parse(req.body || '{}');
    } else {
      body = req.body || {};
    }
    const query = body.query?.trim();
    
    if (!query) {
      res.send(JSON.stringify({
        success: false,
        error: 'Query is required',
        results: []
      }));
      return;
    }
    
    // Perform search with fallback
    const searchResult = await searchWithFallback(query);
    
    // Prepare response
    const response = {
      success: searchResult.status === 'success',
      query: query,
      engine: searchResult.engine,
      processingTime: searchResult.processingTime,
      status: searchResult.status,
      results: searchResult.results,
      timestamp: new Date().toISOString(),
      // Status indicators for UI
      indicators: {
        privacy: '🔒 Protected',
        speed: searchResult.processingTime < 1000 ? '⚡ Fast' : '🐌 Slow',
        engine: `🔍 ${searchResult.engine}`,
        mode: '🛡️ Secure'
      }
    };
    
    res.send(JSON.stringify(response));
    
  } catch (error) {
    res.send(JSON.stringify({
      success: false,
      error: 'Internal server error',
      results: [],
      indicators: {
        privacy: '🔒 Protected',
        speed: '❌ Error',
        engine: '🔍 None',
        mode: '🛡️ Secure'
      }
    }));
  }
});

// Health check endpoint
server.get('/health', (req: any, res: any) => {
  res.send(JSON.stringify({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'Mirror Search',
    version: '2.0.0'
  }));
});

// Start server
server.start();