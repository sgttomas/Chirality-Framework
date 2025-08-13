# Chirality Framework Implementation Versions

## CF14 v2.1.1 (Current Development Branch)
**Branch**: `cf14-v2.1.1-implementation`  
**Status**: In Development  
**Date**: 2025-08-13

### Key Features
- **Reconciled Normative Specification**: Combined comprehensive v2.0 structure with practical graph schema
- **Enhanced Components**: Added Array P (Validity Parameters) and Array H (Consistency Dialectic)
- **Neo4j Integration**: Optimized graph schema with UFO annotations
- **Domain Pack System**: Runtime composition and validation of domain-specific extensions
- **Full Pipeline Support**: 10-station progression with semantic operations
- **Enhanced Provenance**: Complete model metadata tracking

### Components Added
- `CF14_Normative_Spec_Reconciled_v2.1.1.txt` - Unified normative specification
- `CF14_Implementation_Guide_Reconciled_v2.1.1.txt` - Complete implementation guide

### Implementation Status
- [x] Reconciled specifications completed
- [ ] Python CLI updated to v2.1.1
- [ ] Next.js API routes updated
- [ ] Ontology files created
- [ ] Frontend components updated
- [ ] Testing suite updated

---

## CF14 v1.x (Legacy - Main Branch)
**Branch**: `main`  
**Status**: Stable Legacy  

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