# Changelog

All notable changes to the Chirality Framework will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added - Graph Mirror Integration (August 17, 2025)
- **chirality-ai-app Implementation**: Complete two-pass document generation with graph mirroring
- **Metadata-Only Mirror**: Neo4j selective component mirroring with file-based source of truth
- **Component Selection Algorithm**: Rule-based scoring with cross-reference detection and keyword weighting
- **GraphQL API v1**: Read-only access to document relationships and component search
- **Idempotent Mirror Operations**: Safe sync with stale component cleanup and cycle protection
- **Authentication & Security**: Bearer token auth, CORS configuration, query depth protection
- **Operational Tools**: Health monitoring, validation endpoints, backfill scripts
- **Feature Flagging**: Complete system controlled via FEATURE_GRAPH_ENABLED

### Technical Implementation Details
- Rule-Based Component Selection: +3 cross-refs, +2 keywords, -2 size penalty, threshold 3, cap 12/doc
- Async Non-Blocking Mirror: queueMicrotask ensures file writes never blocked
- Stable Component IDs: SHA1 hash of docId#anchor for consistent identification
- Database Constraints: Unique constraints on Document.id and Component.id
- API Versioning: v1 endpoints with backward compatibility commitment

### Validation Results ✅
- Zero impact on core document generation workflows
- Enhanced discovery capabilities via relationship querying  
- Operational reliability maintained with graceful degradation
- Performance benchmarks: <500ms GraphQL queries, 1-3s mirror operations
- Security validation: authenticated access, query protection, feature isolation

### Deprecated
- Mathematical Foundations documentation - theoretical framing determined to be more descriptive than foundational
- Categorical Implementation documentation - superseded by practical architecture documentation  
- Theoretical Significance documentation - superseded by honest capability assessment

## [CF14.3.0.0] - 2025-01-17

### Added
- Complete 11-station semantic valley execution capability
- Multi-service architecture with Docker Compose orchestration
- Electron desktop application for unified deployment
- GraphQL service for semantic matrix operations
- Neo4j integration with full lineage tracking
- Document generation pipeline (4 Documents workflow)
- Self-referential framework validation
- Multiple resolver strategies (OpenAI, Echo)
- Comprehensive reasoning trace collection
- Development status tracking system

#### CF14 Neo4j Integration Release
- New flag: `--write-cf14-neo4j` for CF14 export
- Graph schema: `:CFMatrix` and `:CFNode` labels
- Stable IDs: SHA1-based idempotent writes
- GraphQL-ready for chirality-ai-app
- Backward compatible with legacy `--write-neo4j`

### Changed
- Major architecture shift from monolithic to multi-repository structure
- CLI interface redesigned for matrix operations
- Documentation rewritten with honest capability assessment
- Theoretical claims separated from demonstrated capabilities

### Deprecated
- Single-repository deployment approach
- Original plain English instruction format

### Removed
- Overstated mathematical claims from documentation
- Theoretical window dressing without implementation backing

### Fixed
- Semantic operation consistency across processing stations
- Matrix validation and error handling
- Service coordination and health checking

### Security
- Content-based hashing for data integrity
- Validation of matrix operations before execution

## [CF14.2.1.1] - Previous Release

### Added
- Initial semantic matrix operations
- Basic CLI tool implementation
- OpenAI resolver integration
- Neo4j persistence adapter
- Content-based ID generation

### Changed
- Moved from conceptual framework to working code
- Implemented basic validation system

## [Unreleased]

### Planned for CF14.3.1.0
- Domain generalization testing
- Performance benchmarking suite
- Reasoning trace quality metrics
- RL training data preparation tools

### Planned for CF14.4.0.0
- Production-ready error handling
- Performance optimization
- Enhanced user interfaces
- Complete API documentation

### Under Consideration
- Vector database integration for semantic search
- Multi-modal semantic operations
- Advanced validation metrics
- External API integrations