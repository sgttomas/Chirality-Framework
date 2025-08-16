# Chirality Framework Implementation Versions

## CF14 v2.1.1 (Current Development Branch)
**Branch**: `main` (split-apps architecture)  
**Status**: Active Backend Development  
**Date**: 2025-08-15
**Backend Pipeline**: Extensive overhaul completed

### Key Features
- **Split-Apps Architecture**: Chat interface separated to [Chirality-chat](https://github.com/sgttomas/Chirality-chat), unified backend services via Docker Compose
- **GraphQL Service**: Standalone service with Neo4j integration (localhost:8080)
- **Enhanced CLI Integration**: Real CLI process spawning in Admin UI
- **Domain Pack System**: Runtime composition with CF14.core.v2.1.1.json ontology packs
- **UFO Ontology Alignment**: Complete modal constraints with Systematic/Process/Epistemic/Alethic
- **Semantic Operation Boundary**: Strict constructive vs generative operation separation
- **Health Check Infrastructure**: Comprehensive monitoring and diagnostics

### Backend Components Status
- [x] **GraphQL Service**: Standalone service with Neo4j integration
- [x] **Python CLI Tools**: Full CF14 v2.1.1 implementation with domain packs
- [x] **Admin UI**: Phase 1 backend operations interface (localhost:3001)
- [x] **Neo4j Integration**: Optimized graph schema with UFO annotations
- [x] **CLI Integration**: Real process spawning with output streaming
- [x] **Health Monitoring**: System-wide health checks and validation
- [x] **Documentation Suite**: Complete backend development documentation

### Current Implementation Status
- [x] Backend pipeline extensively overhauled
- [x] GraphQL service as primary data layer
- [x] CLI integration pattern with Admin UI
- [x] Semantic operation boundary implementation
- [x] Neo4j as persistent working memory
- [x] Structured JSON output design (CLI)
- [x] Health check standardization
- [x] Complete documentation suite

---

## Development Roadmap

### Phase 1: Canonical Framework (Current - 2025 Q1)
**Priority**: Backend infrastructure completion
- [x] GraphQL service health endpoints
- [x] CLI integration in Admin UI  
- [x] Structured JSON output for CLI tools
- [ ] Enhanced error handling and recovery
- [ ] Performance monitoring implementation
- [ ] Production deployment preparation

### Phase 2: Production Readiness (2025 Q2)
**Priority**: Scalability and reliability
- [ ] Advanced monitoring and alerting
- [ ] Scalability improvements  
- [ ] Security hardening
- [ ] Enterprise features
- [ ] Multi-tenancy support

### Phase 3: Advanced Features (2025 Q3-Q4)
**Priority**: Enhanced semantic capabilities
- [ ] Multi-domain pack support
- [ ] Advanced semantic operations
- [ ] Real-time collaboration
- [ ] Integration ecosystem

---

## CF14 v1.x (Legacy Implementation)
**Status**: Deprecated (monolithic architecture)  

### Key Features
- Basic semantic matrix operations (A×B=C, J⊙C=F, A+F=D)
- Neo4j integration via Next.js API
- Python CLI tools for matrix generation
- Frontend visualization of matrices
- OpenAI integration for semantic operations

### Core Files
- `chirality_cli.py` - Main Python CLI interface
- `app/instantiate/page.tsx` - Domain instantiation UI
- `app/matrices/page.tsx` - Matrix visualization
- `semmul.py` - Semantic operations engine
- `chirality_components.py` - Data structures

---

## Migration Path

To upgrade from v1.x to v2.1.1:

1. **Ontology Migration**: Update to cf14.core.v2.1.1 schema
2. **API Updates**: Enhance routes for domain pack support
3. **CLI Enhancement**: Add Array P/H support and enhanced provenance
4. **Frontend Updates**: Support for new component types and visualization
5. **Neo4j Schema**: Apply v2.1.1 graph schema updates

See `CF14_Implementation_Guide_Reconciled_v2.1.1.txt` for detailed migration instructions.

### CF14-Integrity-1
- Enforced fail-fast extraction and removed arbitrary string conversion fallbacks.
- Canonicalized A/B emission with full `cells` + labels.
- Clarified D's dependence on in-memory F cells.
- Documented invariants and a clean-regenerate playbook.