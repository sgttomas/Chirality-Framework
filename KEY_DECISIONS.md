# Key Decisions - CF14 Development

*Decisions organized by the CF14 dialectical framework*

## Recent Implementation: Graph Mirror Integration
**Date**: August 17, 2025

### Decision: Metadata-Only Graph Mirror with File-based Source of Truth

**Problem Formulation**: How to enhance document discoverability while maintaining operational simplicity and reliability?

**Options Analyzed**:
- Full graph migration (replace files with Neo4j as primary storage)
- Dual source of truth (parallel storage in files and graph)
- Metadata-only mirror (files primary, graph for discovery)

**Decision**: Metadata-Only Mirror with Component Selection

**Rationale**:
- **Reliability**: Files remain authoritative, eliminating synchronization complexity
- **Performance**: Non-blocking async mirroring preserves document generation speed
- **Simplicity**: Graph layer is additive, not replacement
- **Value**: Enhanced discovery without operational overhead

**Implementation Details**:
- Rule-based component selection (+3 cross-refs, +2 keywords, -2 size penalty)
- Idempotent mirror operations with stale component cleanup
- GraphQL read-only API with Bearer token authentication
- Feature flagged system (FEATURE_GRAPH_ENABLED)

**Validation Results**: ✅ Zero impact on core workflows, enhanced relationship querying, operational reliability maintained

### Recent Contract Decisions

| Decision | Status | Owner | Review |
|----------|--------|-------|--------|
| Core API auth posture (protected vs dev-only) | **Decided: Protected in prod; dev-only via DEV_MODE** | Backend Lead | 2025-11-17 |
| GraphQL query safety (depth 6, complexity 1000) | **Decided** | Backend Lead | 2026-02-17 |
| CORS policy (exact origins in prod, not wildcard) | **Decided** | Security Team | 2026-02-17 |
| Score type standardization (integer 0-10) | **Decided** | Data/Frontend | 2026-08-17 |
| Error response format (code + message + details) | **Decided** | API Team | 2026-02-17 |

---

## Legacy CF14 Framework Decisions

*Original matrix-based semantic operation decisions*

---

## Decision Entry: Matrix-Based Semantic Operations
**Date**: January 17, 2025

### Necessity vs Contingency
**Necessary**: Structured approach to semantic processing to avoid ad-hoc LLM prompting
**Contingent**: Specific matrix format - could have used other structured representations (trees, graphs, lists)

### Sufficiency
**Sufficient**: Matrix operations provide adequate structure for systematic semantic transformation
**Assessment**: 3x4 and 4x4 matrices handle current use cases effectively
**Insufficient aspects**: May need larger matrices for complex domains

### Completeness
**Complete elements**: Basic operations (*, +, ⊙, ×, interpret) cover core semantic transformations
**Incomplete elements**: Limited operation set may need expansion for specialized domains
**Missing**: Advanced operations for temporal reasoning, uncertainty handling

### Inconsistencies and Consistencies
**Consistent**: Matrix operations follow mathematical conventions while maintaining semantic meaning
**Inconsistent**: Some operations (like cross product) stretch mathematical metaphor
**Tension**: Mathematical precision vs semantic flexibility

---

## Decision Entry: LLM as Semantic Interpolation Engine
**Date**: January 17, 2025

### Necessity vs Contingency
**Necessary**: LLMs excel at semantic combination and concept interpolation
**Contingent**: Specific choice of OpenAI models - could use other LLM providers

### Sufficiency
**Sufficient**: LLM semantic interpolation produces consistent, meaningful results for concept combination
**Assessment**: "Values * Necessary" → "Essential Values" type operations work reliably
**Insufficient aspects**: No validation of semantic accuracy beyond human judgment

### Completeness
**Complete elements**: LLM handles abstract concept combination effectively
**Incomplete elements**: No systematic evaluation of semantic operation quality
**Missing**: Benchmarks against human semantic reasoning

### Inconsistencies and Consistencies
**Consistent**: LLM behavior aligns with framework's semantic operation definitions
**Inconsistent**: LLM output variability vs framework's deterministic aspirations
**Tension**: AI creativity vs systematic reproducibility

---

## Decision Entry: Neo4j for Graph Persistence
**Date**: January 17, 2025

### Necessity vs Contingency
**Necessary**: Graph database for semantic relationship tracking and lineage
**Contingent**: Neo4j specifically - could have chosen other graph databases

### Sufficiency
**Sufficient**: Neo4j handles matrix storage, relationships, and lineage tracking adequately
**Assessment**: Cypher queries effectively retrieve semantic transformation history
**Insufficient aspects**: Performance at scale unproven

### Completeness
**Complete elements**: Full lineage tracking, relationship modeling, data persistence
**Incomplete elements**: Advanced graph analytics, semantic similarity queries
**Missing**: Integration with vector databases for semantic search

### Inconsistencies and Consistencies
**Consistent**: Graph model aligns with semantic relationship nature
**Inconsistent**: Matrix storage in graph database creates impedance mismatch
**Tension**: Relational matrices vs graph-native operations

---

## Decision Entry: Multi-Repository Architecture
**Date**: January 17, 2025

### Necessity vs Contingency
**Necessary**: Separation of concerns between framework, interfaces, and orchestration
**Contingent**: Specific repository organization - could have used monorepo or different splits

### Sufficiency
**Sufficient**: Three-repo structure handles current development and deployment needs
**Assessment**: Framework, chat interface, and orchestration work independently
**Insufficient aspects**: Coordination complexity, version synchronization challenges

### Completeness
**Complete elements**: Full separation of backend, frontend, and orchestration concerns
**Incomplete elements**: Shared libraries, common utilities, unified testing
**Missing**: Standardized APIs between repositories

### Inconsistencies and Consistencies
**Consistent**: Repository boundaries align with functional responsibilities
**Inconsistent**: Some functionality duplicated across repositories
**Tension**: Independence vs integration

---

## Decision Entry: Human-in-the-Loop Validation
**Date**: January 17, 2025

### Necessity vs Contingency
**Necessary**: Human oversight for semantic operation quality and direction
**Contingent**: Specific validation points - could validate at different stages

### Sufficiency
**Sufficient**: Human validation at key decision points maintains quality
**Assessment**: User can guide semantic valley progression effectively
**Insufficient aspects**: No systematic validation criteria or metrics

### Completeness
**Complete elements**: Validation hooks at each processing station
**Incomplete elements**: Automated quality scoring, validation guidelines
**Missing**: Training for effective human validation

### Inconsistencies and Consistencies
**Consistent**: Human validation aligns with framework's systematic approach
**Inconsistent**: Subjective human judgment vs objective operation goals
**Tension**: Human intuition vs systematic methodology

---

*Future key decisions will be added below using the same dialectical framework*