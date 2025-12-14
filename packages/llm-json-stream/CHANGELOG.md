# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.0.1-beta.1] - 2025-12-15

### Added
- Initial TypeScript port of the Dart `llm_json_stream` package
- Core `JsonStreamParser` class for character-by-character JSON parsing
- Property streams for all JSON types:
  - `StringPropertyStream` - Streams string content chunk-by-chunk
  - `NumberPropertyStream` - Emits complete number values
  - `BooleanPropertyStream` - Emits boolean values
  - `NullPropertyStream` - Emits null values
  - `ObjectPropertyStream` - Provides access to object properties
  - `ArrayPropertyStream` - Provides reactive array handling
- State machine-based delegates for each JSON type
- Full cross-platform support (Node.js, Deno, Bun, browsers, edge runtimes)
- Comprehensive test coverage including:
  - Property type tests (string, number, boolean, null, map, list)
  - Integration tests for nested structures
  - Edge case handling (escape sequences, unicode, scientific notation)
  - LLM robustness tests
- `closeOnRootComplete` option to stop parsing after root JSON completes
- Buffered and unbuffered stream modes
- Path-based property navigation with dot notation and array indices
- Complete documentation with API reference and examples
- LLM provider setup guides (OpenAI, Claude, Gemini)

### Fixed
- Package naming consistency (using `llm-json-stream` instead of `llm_json_stream`)
- README documentation consistency across monorepo and package

### Security
- Comprehensive handling of escaped characters and special sequences
- Safe Unicode handling including emoji and CJK characters

---

## Version Guidelines for Future Releases

### 0.1.0 (Upcoming)
Plan to move from pre-release to stable after:
- Initial user feedback validation
- Any breaking changes finalized
- Performance optimization complete

### Versioning Strategy
- **0.0.x**: Pre-release versions (beta, alpha) with potential breaking changes
- **0.1.0+**: Stable releases following semantic versioning
- Breaking changes will be clearly documented in major version updates
