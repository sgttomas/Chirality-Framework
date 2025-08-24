# Changelog

All notable changes to the Chirality Framework will be documented in this file.  References "CF14" 

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

**Status Last Updated**: August 24, 2025 at 11:19h
**Note**: Always ask user for current date/time when updating status - AI doesn't have real-time access

## Decision Entry: Matrix-Based Semantic Operations
**Date**: August 24, 2025

**Complete elements**: Basic operations (*, +, ⊙, ×, interpret) cover core semantic transformations

---

## Decision Entry: Neo4j for Graph Persistence
**Date**: August 17, 2025

### Necessity vs Contingency
**Necessary**: Graph database for semantic relationship tracking and lineage
**Contingent**: Neo4j specifically - could have chosen other graph databases

### Sufficiency
Neo4j handles matrix storage, relationships, and lineage tracking adequately

### Completeness
Full lineage tracking, relationship modeling, data persistence

### Inconsistencies and Consistencies
Graph model aligns with semantic relationship nature


---

## Decision Entry: Multi-Repository Architecture
**Date**: August 17, 2025

### Necessity vs Contingency
Separation of concerns between framework, interfaces, and orchestration

### Sufficiency
**Sufficient**: Three-repo structure handles current development and deployment needs
**Assessment**: Framework, chat interface, and orchestration work independently

### Completeness
**Complete elements**: Full separation of backend, frontend, and orchestration concerns
**Incomplete elements**: Shared libraries, common utilities, unified testing
**Missing**: Standardized APIs between repositories

### Inconsistencies and Consistencies
Repository boundaries align with functional responsibilities



## [Unreleased]

### Removed - Duplications between the chirality-ai-app and the chirality-semantic-framework (August 24, 2025)
- **chirality-ai-app segregation**: Complete segregation of frontend and backend functionality, with the graph database as the only point of contact.
- **undoing much of the previous work**: Because of confusions around the working directory there was duplication of functionality from the frontend (chirality-ai-app) into the backend (chirality-semantic-framework)
- **return to  [CF14.2.1.1] - Previous Release functionality**: The original implementation was the simple form of the backend that is to be developed further, however the previous version was not adequately retained in Github due to poor git management practices by the developer, so this functionality will have to be restored by recreating it.

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
- Performance benchmarks: <500ms GraphQL queries, 1-3s mirror operations
- Security validation: authenticated access, query protection, feature isolation

### Deprecated
- Mathematical Foundations documentation - theoretical framing determined to be more descriptive than foundational
- Categorical Implementation documentation - superseded by practical architecture documentation  
- Theoretical Significance documentation - superseded by honest capability assessment

## [CF14.3.0.0] - 2025-08-17

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

