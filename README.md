# Mirror Search - Privacy-Preserving Search Engine

A privacy-first web search engine powered by [Bless Network](https://bless.network). Mirror Search provides web search results while protecting user privacy through decentralized infrastructure.

## Features

- **Privacy-First:** Anonymous search queries, IP rotation, and cookie stripping
- **Web Search:** Fast and reliable web search results
- **Decentralized:** Runs on Bless Network's edge compute infrastructure
- **Modern UI:** Beautiful, responsive interface with gradient design
- **No Tracking:** Zero user data collection or storage
- **No Authentication Required:** Free to use without API keys

## Technology Stack

- **Backend:** Bless Network WebServer (TypeScript)
- **Frontend:** Vanilla HTML/CSS/JavaScript
- **Infrastructure:** Decentralized edge compute via Bless Network
- **Deployment:** IPFS + Bless Network gateway

## Quick Start

### Prerequisites

- Node.js 18.18+ (recommended via NVM)
- Bless Network CLI

### Installation

```bash
# Clone the repository
git clone https://github.com/qvkare/mirror-search.git
cd mirror-search

# Install dependencies
npm install

# Preview locally
npx blessnet preview serve
```

### Deployment

```bash
# Deploy to Bless Network
npx blessnet deploy
```

Your search engine will be available at a public URL provided after deployment.

## Configuration

### Environment Settings

Edit `index.ts` to configure search behavior:

```typescript
// Toggle between real search and mock data
const USE_REAL_SEARCH = true;
```

## Development

### Project Structure

```
mirror-search/
├── index.ts              # Main application entry point
├── bls.toml              # Bless Network configuration
├── package.json          # Dependencies and scripts
├── README.md             # Documentation
└── .gitignore           # Git ignore rules
```

### Local Development

```bash
# Start preview server
npx blessnet preview serve

# Build for production
npx blessnet build

# Deploy to production
npx blessnet deploy
```

## Privacy Features

- **No User Tracking:** Zero data collection or storage
- **Anonymous Queries:** Search terms not logged or stored
- **IP Protection:** Queries routed through Bless Network nodes
- **Cookie-Free:** No tracking cookies or session storage
- **Decentralized:** No central server dependency

## Deployment

### Bless Network Integration

- **Edge Compute:** Distributed across global nodes
- **IPFS Storage:** Immutable deployment via IPFS
- **Auto-scaling:** Dynamic resource allocation
- **High Availability:** Multi-node redundancy

### Production URL

After deployment, access your search engine at:
`https://[unique-id].bls.dev`

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test with `npx blessnet preview serve`
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For issues or questions:
- Open an issue on GitHub
- Join the [Bless Network Discord](https://discord.gg/eTa8MRGb)
- Check [Bless Network Documentation](https://docs.bless.network)

## Acknowledgments

- [Bless Network](https://bless.network) for decentralized infrastructure
- Open source community for inspiration and support