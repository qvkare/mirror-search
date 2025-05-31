# Changelog

All notable changes to Mirror Search will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.1.0-ONNX] - 

### Added
- **ONNX.js Integration**: Real AI processing with onnxruntime-web v1.17.0
- **Advanced Pattern Recognition**: Intelligent anonymization with 85% confidence
- **Multi-Method Anonymization System**: ONNX-LLM → Rule-based → Basic fallback
- **Real-time Debug System**: Visual method indicators and status monitoring
- **Enhanced UI**: Modern design with loading animations and status badges
- **Comprehensive Test Results**: Live anonymization examples with confidence scores

### Changed
- **Improved Performance**: Sub-300ms response times with optimized processing
- **Better Error Handling**: Graceful fallback mechanisms at multiple levels
- **Enhanced Logging**: Clean JSON responses without console interference
- **Updated Documentation**: Comprehensive README with real test examples

### Fixed
- **JSON Response Corruption**: Removed emoji-containing console.log statements
- **WASM Compatibility**: Replaced `requestAnimationFrame` with Promise chains
- **AbortSignal Issues**: Removed unsupported `AbortSignal.timeout()` usage
- **Build Process**: Fixed infinite loop in `build:debug` command

### Security
- **Enhanced Privacy**: 85% anonymization confidence with ONNX processing
- **Improved Patterns**: Advanced location, preference, and context detection
- **Secure Processing**: All AI operations in isolated WASM environment

## [2.0.0-TinyLlama] - 

### Added
- **TinyLlama 1.1B Integration**: Real LLM model with Transformers.js
- **Hybrid Anonymization**: TinyLlama → Rule-based → Basic fallback system
- **Advanced Debug Page**: `/tinyllama-status` with real-time model information
- **Enhanced Monitoring**: Comprehensive model status and performance tracking

### Changed
- **Model Architecture**: Switched from mock to real LLM processing
- **Confidence Scoring**: Implemented dynamic confidence based on method used
- **Processing Pipeline**: Multi-stage anonymization with intelligent fallback

### Fixed
- **Model Loading**: Lazy initialization to avoid startup delays
- **Memory Management**: Optimized for Bless Network WASM constraints
- **Error Recovery**: Robust fallback when LLM processing fails

### Deprecated
- **Mock LLM**: Replaced with real TinyLlama model processing

## [1.5.0-RuleBased] - 

### Added
- **Rule-Based Anonymization**: 70+ Turkish/English pattern matching rules
- **Semantic Preservation**: Intelligent context and meaning retention
- **Performance Optimization**: Sub-200ms query processing
- **Debug Information**: Detailed anonymization metadata in responses

### Changed
- **Pattern Engine**: Enhanced regex patterns for better accuracy
- **Response Format**: Added anonymization confidence and method tracking
- **UI Improvements**: Visual feedback for anonymization status

### Fixed
- **Pattern Conflicts**: Resolved overlapping anonymization rules
- **Empty Queries**: Better handling of edge cases and validation
- **Performance Issues**: Optimized pattern matching algorithms

## [1.0.0-MVP] - 

### Added
- **Core Search Engine**: DuckDuckGo API integration
- **Basic Privacy**: Simple query cleaning and anonymization
- **Bless Network Integration**: WebAssembly deployment on edge nodes
- **Modern UI**: Responsive design with dark theme
- **API Endpoints**: RESTful search and health check endpoints

### Initial Features
- **Search Functionality**: Basic web search with privacy protection
- **Static File Serving**: Inline CSS/JS for WASM compatibility
- **Error Handling**: Basic error recovery and user feedback
- **Documentation**: Initial README and setup instructions

### Security
- **HTTPS Transport**: Encrypted communication
- **No Tracking**: Zero data collection policy
- **WASM Sandbox**: Isolated execution environment

## [0.5.0-Beta] - 2023-12-20

### Added
- **Prototype Development**: Initial concept and architecture
- **Bless Network Setup**: Basic WASM deployment configuration
- **Search API**: Preliminary DuckDuckGo integration
- **UI Framework**: Basic HTML/CSS interface

### Changed
- **Architecture Design**: Finalized privacy-first approach
- **Technology Stack**: Selected WASM + Bless Network platform

### Fixed
- **Build System**: Resolved Bless Network CLI compatibility issues
- **API Integration**: Fixed response parsing and error handling

## [0.1.0-Alpha] - 

### Added
- **Project Initialization**: Repository setup and basic structure
- **Concept Development**: Privacy-first search engine design
- **Technology Research**: WASM, LLM, and edge computing evaluation

### Planning
- **Feature Roadmap**: Defined core functionality and milestones
- **Architecture Planning**: Designed system components and data flow
- **Privacy Framework**: Established anonymization requirements

## [2.1.1-WASMDebug] 

### Fixed
- **WASM LLM Type Errors**: Resolved TypeScript type incompatibilities in `wasm-llm.ts` for `AnonymizationResult`.
- **`AbortController` Removal**: Removed `AbortController` usage from `search-engines.ts` due to unavailability in the Bless Network WASM environment, resolving a critical runtime error with the Bright Data proxy.
- **Content-Type Issue with Proxy**: Modified `brightdata-proxy` to use a `GET` endpoint (`/api/brightdataget`) as a workaround for Bless Network's `fetch` limitations with `POST` request bodies and headers.
- **`URLSearchParams` Unavailability**: Manually constructed query strings in `search-engines.ts` as `URLSearchParams` is not available in the Bless WASM environment.
- **UI JSON Parsing Error**: Removed a `console.log` statement in `search-engines.ts` that was corrupting the JSON response to the UI.
- **Default Anonymization State**: Set the "AI Query Anonymization" toggle to be off by default in the main HTML generated by `mirror-search/index.ts`.

### Removed
- **Unused Public Assets**: Deleted `mirror-search/public/index.html`, `mirror-search/public/style.css`, and `mirror-search/public/js/app.js` as their content was either inlined or unused. Kept `search.js` and `wasm-loader.js` due to references in `bls.assets.json`.

### Changed
- **Proxy Logic**: Updated `brightdata-proxy/index.js` to accept search queries via a `GET` request parameter.
- **Search Logic**: Modified `mirror-search/src/search-engines.ts` to use the new `GET` endpoint on the proxy and handle query string construction manually.

---

## Version Naming Convention

- **Major.Minor.Patch-Feature**: Semantic versioning with feature identifier
- **Feature Identifiers**: 
  - `ONNX`: ONNX.js integration
  - `TinyLlama`: TinyLlama model integration
  - `RuleBased`: Rule-based anonymization
  - `MVP`: Minimum viable product
  - `Beta`: Beta testing phase
  - `Alpha`: Alpha development phase

## Release Schedule

- **Major Releases**: Every 3-6 months with significant new features
- **Minor Releases**: Monthly with improvements and bug fixes
- **Patch Releases**: As needed for critical fixes and security updates

## Support

For questions about specific versions or upgrade paths, please:
- Check the [README.md](README.md) for current features
- Review [GitHub Issues](https://github.com/qvkare/mirror-search/issues) for known problems
- Consult [Bless Network Documentation](https://docs.bless.network) for deployment help 