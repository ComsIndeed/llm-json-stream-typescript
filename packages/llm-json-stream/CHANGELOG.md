# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.0] - 2026-06-24

### Added
- **Sliding-Window Thinking Tag Skipper**: Added character-by-character skipper with a sliding-window flush that guarantees zero character loss on partial tag mismatches.
- **Reference Identity Caching**: Implemented path-based caching for all `AsyncJson` instances and nested Proxy paths to ensure reference stability across reads.
- **Root Convenience Getters**: Added `.future` and `.stream` getters directly on the `JsonStream` parser wrapper.

### Changed
- **Event-Driven Property Streams**: Completely eliminated `setInterval` 1ms polling by switching to sequence-number-based event listeners.
- **O(1) Memory Footprint**: Shifted object and array property streams to BehaviorSubject-style buffering (storing only the latest snapshot), preventing $O(N^2)$ memory growth.

### Fixed
- **Strict TypeScript Typing**: Resolved all strict TS compilation errors under `noUncheckedIndexedAccess` and `verbatimModuleSyntax`.

## [1.1.0] - 2026-01-28

### Added
- Stable release with comprehensive test coverage (359 tests passing)
- Full API documentation in README
- Cross-platform support (Node.js, Deno, Bun, browsers, edge runtimes)

### Changed
- Moved from pre-release (0.x) to stable versioning (1.x)
- Improved documentation with complete API reference

### Fixed
- All known bugs from beta testing resolved
- Comprehensive test suite ensures robustness

## [0.1.0] - 2025-12-18

### Added
- Added demos into the documentations

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

## Version Guidelines

### Versioning Strategy
- **1.x.x**: Stable releases following semantic versioning
- **Major (x.0.0)**: Breaking changes to the public API
- **Minor (1.x.0)**: New features, backwards compatible
- **Patch (1.x.x)**: Bug fixes, backwards compatible

