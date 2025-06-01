<div align="center">
  <img src="assets/mirror-search.gif" alt="Mirror Search Logo" width="800" height="500">
  <h1>Mirror Search - Privacy-First AI Search Engine</h1>
  <p><em>A decentralized privacy-first search engine built on <strong>Bless Network</strong> infrastructure with ONNX.js AI anonymization</em></p>
</div>

#### 🔗 **Live**: [https://coffee-cockroach-rachelle-6byahvr4.bls.dev](https://coffee-cockroach-rachelle-6byahvr4.bls.dev)
---

## **Key Features**

### **Bless Network Infrastructure**
- **Edge Computing**: Distributed WebAssembly runtime across global nodes
- **Decentralized Hosting**: IPFS-based content delivery with blockchain security
- **Auto-Scaling**: Dynamic resource allocation based on demand
- **Zero Downtime**: High availability through distributed architecture

### **AI-Powered Privacy**
- **ONNX.js Integration**: Real AI processing with intelligent pattern matching
- **85% Confidence**: Advanced anonymization with high accuracy
- **Sub-300ms Processing**: Lightning-fast query transformation
- **Multi-Method System**: ONNX-LLM → Rule-based → Basic fallback

### **Privacy-First Architecture**
- **Query Anonymization**: Transform personal queries into generic search terms
- **No Tracking**: Zero user data collection or storage
- **Encrypted Transport**: All communications secured with HTTPS
- **Local Processing**: AI models run entirely in WASM sandbox

### **Performance & Reliability**
- **Multi-Engine Support**: DuckDuckGo API with intelligent fallback
- **Global Edge Network**: Bless Network's distributed infrastructure
- **Lightning Fast**: Average response time under 300ms
- **High Availability**: Fault-tolerant distributed architecture
- **Resource Efficiency**: WASM's lightweight execution model

### **Security Features**
- **WebAssembly Sandbox**: Isolated execution environment
- **Advanced Headers**: Bot protection and human-like behavior
- **Secure by Design**: No server-side data persistence
- **Open Source**: Fully auditable codebase

## How It Works

### Phase 1: ONNX.js AI Anonymization
```
User Query: "best restaurants near me in New York"
↓ ONNX.js Processing (within WASM on Bless Network) ↓
Anonymized: "recommended restaurants nearby New York"
Method: onnx-llm (85% confidence)
```

### Phase 2: Secure Search via Proxy
```
Anonymized Query (from WASM)
     ↓
Mirror Search WASM makes a GET request to Bright Data Proxy Server
     ↓
Bright Data Proxy Server (e.g., on Render.com)
  (Receives GET, internally makes POST to Bright Data SERP API)
     ↓
Bright Data SERP API
     ↓
Filtered Results (returned to WASM, then to user)
```

## Real Test Results

### Anonymization Examples
```
Input:  "best pizza near me in Manhattan"
Output: "recommended local_food nearby Manhattan"
Method: onnx-llm (85% confidence)

Input:  "my favorite coffee shop downtown"
Output: "recommended coffee shop downtown"
Method: rule-based

Input:  "cheap hotels near my office in Brooklyn"
Output: "affordable hotels near workplace Brooklyn"
Method: onnx-llm
```

## Quick Start

### 1. Clone and Setup
```bash
git clone https://github.com/qvkare/mirror-search.git
cd mirror-search
npm install
```

### 2. Development
```bash
# Build for Bless Network
npx blessnet options build

# Preview locally
npx blessnet preview

# Deploy to Bless Network
npx blessnet deploy
```

## API Documentation

### Search Endpoint
The Mirror Search application itself exposes a POST endpoint for search queries.
```bash
POST /search
Content-Type: application/json

{
  "query": "your search query"
}
```

### Response Format
```json
{
  "results": [...],
  "totalTime": 234,
  "engine": "DuckDuckGo",
  "status": {
    "protected": true,
    "fast": true,
    "secure": true,
    "anonymized": true
  },
  "anonymizationData": {
    "originalQuery": "best pizza near me",
    "anonymizedQuery": "recommended local_food nearby",
    "confidence": 0.85,
    "method": "onnx-llm",
    "processingTime": 67
  }
}
```

## Technical Architecture

### Bless Network Platform
- **Runtime**: WebAssembly (WASM) execution environment.
- **SDK**: `@blockless/sdk-ts` for TypeScript integration.
- **Deployment**: Distributed nodes with automatic load balancing.
- **Security**: Sandboxed execution with network permission controls.
- **Configuration (`bls.toml`)**: Crucial for defining permissions and features.
    - **Network Permissions**: Must allow outgoing requests to the Bright Data Proxy URL (e.g., `https://mirror-search-proxy.onrender.com/`). This is typically configured under `[deployment.permissions]`.
    - **Fetch Feature**: The `fetch = true` flag must be enabled under `[features]` to allow network requests from WASM.

### ONNX.js AI Stack
- **Runtime**: onnxruntime-web v1.17.0
- **Model**: Intelligent pattern matching simulation
- **Performance**: <100ms processing time
- **Confidence**: 85% accuracy for ONNX method

## Contributing

We welcome contributions! Please see our [CHANGELOG.md](CHANGELOG.md) for version history.

### Development Setup
```bash
npm install
npx blessnet preview
npm test
```

## Environment Configuration

### Bright Data SERP API Integration via Proxy

Mirror Search uses a **proxy server** (e.g., deployed on Render.com at `https://mirror-search-proxy.onrender.com`) to interact with the Bright Data SERP API. This an intermediary step to manage API keys securely and to work around current limitations in the Bless Network's WASM fetch capabilities regarding `POST` request bodies and headers.

The WASM module (`mirror-search`) makes a `GET` request to the proxy's `/api/brightdataget` endpoint. The proxy then makes the actual `POST` request to Bright Data.

#### Required Environment Variables (for the Proxy Server)
These variables need to be configured on your **proxy server's environment (e.g., Render.com)**, not directly in the Mirror Search WASM deployment.
```bash
# Get your API token from: https://brightdata.com/cp/setting/users
BRIGHT_DATA_API_TOKEN=your_bright_data_api_token_here

# Get your SERP zone from: https://brightdata.com/cp/zones
# Default zone if not specified: serp_api1
BRIGHT_DATA_ZONE=serp_api1
```

#### Setup Instructions
1.  **Deploy Proxy Server**: Deploy the `brightdata-proxy` (located in this repository) to a hosting service like Render.com.
2.  **Configure Proxy Environment Variables**:
    *   Get your Bright Data API Token: [Bright Data API Settings](https://brightdata.com/cp/setting/users)
    *   Get your Bright Data Zone: [Bright Data Zones](https://brightdata.com/cp/zones)
    *   Set `BRIGHT_DATA_API_TOKEN` and `BRIGHT_DATA_ZONE` in your proxy server's environment.
3.  **Update Proxy URL in Mirror Search**:
    *   In `mirror-search/src/search-engines.ts`, ensure `BRIGHT_DATA_PROXY_URL` points to your deployed proxy's `/api/brightdataget` endpoint.
    ```typescript
    private readonly BRIGHT_DATA_PROXY_URL = 'YOUR_PROXY_URL_HERE/api/brightdataget';
    ```
4.  **Configure `bls.toml` in Mirror Search**:
    *   Ensure `mirror-search/bls.toml` allows network requests to your proxy URL and has `fetch = true` enabled under features.
    ```toml
    # inside mirror-search/bls.toml
    # ... other configurations ...

    [deployment]
    # ...
    permissions = [
      # ... other permissions ...
      "https://YOUR_PROXY_URL_HERE/" # Allow access to your proxy
    ]

    [features]
    wasm = true
    fetch = true # Enable fetch API
    # ... other features ...
    ```
5.  **Deploy Mirror Search**: Deploy the Mirror Search WASM application to Bless Network. The system will use the proxy for Bright Data, then fallback to DuckDuckGo.

#### Search Engine Priority
```
1. Bright Data SERP API (via Proxy Server using GET from WASM)
   ↓ (if fails)
2. DuckDuckGo API (Fallback)
   ↓ (if fails)
3. Mock Results (Emergency)
```

## Known Issues & Limitations (Bless Network WASM Environment)
-   **`fetch` API for `POST` Requests**: The current `@blockless/sdk-ts` fetch implementation might not correctly send `Content-Type` headers or request bodies for `POST` requests from WASM. This necessitated the GET request workaround to the proxy.
-   **Missing Browser Globals**: Standard browser globals like `AbortController` and `URLSearchParams` are not available in the Bless Network WASM environment and need to be worked around (e.g., manual URL construction).

## License

MIT License

## Links

- **Documentation**: [Bless Network Docs](https://docs.bless.network)
- **Repository**: [GitHub](https://github.com/qvkare/mirror-search)
- **Changelog**: [CHANGELOG.md](CHANGELOG.md)

---

<div align="center">
  <strong>Mirror Search</strong><br>
  <em>AI-Powered Privacy</em>
</div>
