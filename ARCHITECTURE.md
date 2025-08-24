# Architecture - Chirality Framework

## System Overview

The Chirality Semantic Framework implements two-pass document generation with optional graph mirroring for enhanced discovery. The architecture maintains files as the source of truth while providing Neo4j-based relationship tracking and GraphQL query capabilities.

## High-Level Architecture

```
┌─────────────────────────────────────────────┐
│          Chirality AI App (Next.js)          │
│                                             │
│  ┌─────────────────┐    ┌─────────────────┐  │
│  │   Chat Interface│    │ Document Gen UI │  │
│  │   (RAG-Enhanced)│    │ (/chirality-core)│  │
│  └─────────────────┘    └─────────────────┘  │
│                                             │
│  ┌─────────────────────────────────────────┐  │
│  │        API Routes (Next.js)             │  │
│  │  /api/core/*  /api/chat/*  /api/v1/*   │  │
│  └─────────────────────────────────────────┘  │
└─────────────────────┬───────────────────────┘
                      │
    ┌─────────────────┴─────────────────┐
    │      Two-Pass Generation          │
    │   (DS → SP → X → M) + Refinement  │
    └─────────────────┬─────────────────┘
                      │
    ┌─────────────────┴─────────────────┐
    │      File Storage (SoT)           │
    │      store/state.json             │
    └─────────────────┬─────────────────┘
                      │ (async mirror)
    ┌─────────────────┴─────────────────┐
    │    Component Selection            │
    │   (Rule-based Algorithm)          │
    └─────────────────┬─────────────────┘
                      │
    ┌─────────────────┴─────────────────┐
    │      Neo4j Graph Mirror           │
    │   (Metadata + Relationships)      │
    │                                   │
    │  ┌─────────────────────────────┐   │
    │  │     GraphQL API (v1)        │   │
    │  │   (Read-only Queries)       │   │
    │  └─────────────────────────────┘   │
    └───────────────────────────────────┘
```

## Two-Pass Generation Architecture

The Chirality Framework implements a novel two-pass document generation methodology that ensures cross-referential coherence and comprehensive problem coverage.

### Architecture Overview

```
Pass 1: Sequential Generation    Pass 2: Cross-Referential Refinement
┌─────────────────────────┐      ┌─────────────────────────────────┐
│ DS → SP → X → M         │ ──►  │ DS' ← ─ ─ ─ ┐                  │
│                         │      │ SP' ← ─ ─ ─ ┼ ─ ─ ► X'         │
│ Linear problem solving  │      │ X'  ← ─ ─ ─ ┼ ─ ─ ► M'         │
│ Individual documents    │      │ M'  ← ─ ─ ─ ┘                  │
└─────────────────────────┘      │                                 │
                                 │ Cross-referential refinement    │
                                 │ Integrated solution synthesis   │
                                 └─────────────────────────────────┘
                                                  │
                                 ┌─────────────────────────────────┐
                                 │ Final Resolution: X''            │
                                 │                                 │
                                 │ Complete integrated solution    │
                                 │ with validated cross-references │
                                 └─────────────────────────────────┘
```

### Stage Details

**Pass 1 - Sequential Generation:**
- **DS (Definition/Structure)**: Problem analysis and structural framework
- **SP (Strategy/Process)**: Solution approach and implementation strategy  
- **X (eXecution)**: Detailed implementation specifications
- **M (Measurement/Monitoring)**: Success metrics and evaluation criteria

**Pass 2 - Cross-Referential Refinement:**
- **Cross-Reference Analysis**: Identify dependencies and conflicts between documents
- **Integration Synthesis**: Resolve conflicts and enhance complementary elements
- **Coherence Validation**: Ensure consistent messaging and approach across all documents
- **Final Resolution**: Produce integrated X'' document with validated implementation

### Implementation Flow

```python
# Simplified flow representation
async def two_pass_generation(problem_context):
    # Pass 1: Sequential generation
    pass1 = await generate_sequential_documents(problem_context)
    
    # Pass 2: Cross-referential refinement  
    cross_refs = await analyze_cross_references(pass1)
    pass2 = await refine_with_cross_references(pass1, cross_refs)
    
    # Final resolution
    final_solution = await resolve_integration(pass2)
    
    return final_solution
```

## Core Principle: Files as Source of Truth

The Chirality Framework maintains a strict separation between persistent data storage and discovery enhancement systems.

### Architectural Principle

**Files serve as the single source of truth for all document content.** This principle ensures:

- **Data Integrity**: All document modifications happen through file operations
- **Portability**: Complete system state can be backed up as simple file copies
- **Zero Dependencies**: Core functionality requires no external databases or services
- **Atomic Operations**: File writes use atomic operations ensuring consistency
- **Simple Recovery**: Failed operations leave files in consistent state

### Graph Mirror Design

The Neo4j graph serves as a **metadata-only mirror** that enhances discoverability without duplicating content:

```
Files (Source of Truth)          Neo4j (Metadata Mirror)
┌─────────────────────┐         ┌──────────────────────┐
│ store/state.json    │ ──────► │ :Document nodes      │
│                     │  async  │   - title, updatedAt │
│ Complete document   │  mirror │   - relationships    │
│ bodies with full    │         │                      │
│ content and history │         │ :Component nodes     │
│                     │         │   - selected sections│
│ Primary Operations: │         │   - cross-references │
│ - Generate          │         │                      │
│ - Edit              │         │ Query Operations:    │
│ - Validate          │         │ - Search components  │
│ - Export            │         │ - Find relationships │
└─────────────────────┘         │ - Analyze patterns   │
                                └──────────────────────┘
```

### Operational Guarantees

1. **Non-Blocking**: Graph operations never block file operations
2. **Eventually Consistent**: Graph mirror achieves consistency asynchronously
3. **Graceful Degradation**: System functions fully even if graph mirror fails
4. **Selective Mirroring**: Only high-value components mirrored to reduce complexity

## Core Components

### Document Generation Engine | ✅ **IMPLEMENTED**
**Location**: `chirality-ai-app/src/chirality-core/`

Two-pass semantic document generation with cross-referential refinement.

### Graph Mirror Integration | ✅ **IMPLEMENTED**  
**Location**: `chirality-ai-app/lib/graph/`

Selective component mirroring to Neo4j with relationship tracking.

### CF14 Semantic Engine (Legacy)
**Location**: `chirality/core/`

The original framework implementing structured semantic operations.

#### Key Modules | ✅ **IMPLEMENTED**
- **[`types.py`](chirality/core/types.py)**: Matrix, Cell, and operation type definitions
- **[`ops.py`](chirality/core/ops.py)**: Semantic operations (multiplication, addition, interpretation)  
- **[`stations.py`](chirality/core/stations.py)**: Processing pipeline (S1→S2→S3 runners)
- **[`validate.py`](chirality/core/validate.py)**: Matrix validation and integrity checking
- **[`ids.py`](chirality/core/ids.py)**: Content-based deterministic ID generation

#### Semantic Operations
```python
# Core semantic transformation
def op_multiply(A: Matrix, B: Matrix, resolver: Resolver) -> Matrix:
    """Semantic multiplication: A * B → C"""
    
def op_interpret(M: Matrix, resolver: Resolver) -> Matrix:
    """Stakeholder interpretation: M → J"""
    
def op_elementwise(J: Matrix, C: Matrix, resolver: Resolver) -> Matrix:
    """Element-wise combination: J ⊙ C → F"""
```

#### Processing Stations | ✅ **IMPLEMENTED**
- **S1Runner**: Problem formulation and input validation ([`stations.py:20-45`](chirality/core/stations.py:20-45))
- **S2Runner**: Requirements analysis through semantic multiplication ([`stations.py:47-72`](chirality/core/stations.py:47-72))
- **S3Runner**: Objective synthesis via interpretation and combination ([`stations.py:74-110`](chirality/core/stations.py:74-110))

### Resolver Architecture | ✅ **IMPLEMENTED**
**Location**: [`chirality/core/cell_resolver.py`](chirality/core/cell_resolver.py)

Pluggable strategy pattern for semantic interpolation.

#### Resolver Types
- **OpenAIResolver**: LLM-powered semantic interpolation | ✅ **IMPLEMENTED**
- **EchoResolver**: Deterministic testing implementation | ✅ **IMPLEMENTED**  
- **Future**: Human, Local LLM, Ensemble resolvers | 📋 **PLANNED**

#### Resolver Protocol
```python
class Resolver(Protocol):
    def resolve(self, 
                op: Literal["*", "+", "×", "interpret", "⊙"],
                inputs: List[Matrix],
                system_prompt: str,
                user_prompt: str,
                context: Dict[str, Any]) -> List[List[str]]
```

### Data Persistence | ✅ **IMPLEMENTED**
**Location**: [`chirality/adapters/neo4j_adapter.py`](chirality/adapters/neo4j_adapter.py)

Graph-based storage for semantic matrices and reasoning traces.

#### Storage Model
- **Matrix Nodes**: Complete semantic matrices with metadata
- **Cell Nodes**: Individual semantic elements with position
- **Operation Nodes**: Transformation records with timestamps
- **Lineage Relationships**: Complete audit trail of operations

#### Query Capabilities
- Reasoning trace reconstruction
- Impact analysis across operations
- Pattern discovery in semantic transformations
- Performance monitoring and optimization

### API Layer
**Location**: GraphQL service (separate repository) | 📋 **PLANNED** - Implementation in progress

RESTful and GraphQL interfaces for semantic operations.

#### GraphQL Schema (Proposed)
```graphql
type Matrix {
  id: String!
  name: String!
  station: String!
  shape: [Int!]!
  cells: [Cell!]!
  metadata: JSON
}

type SemanticOperation {
  multiply(matrixA: ID!, matrixB: ID!, resolver: String!): Matrix!
  interpret(matrix: ID!, context: String!, resolver: String!): Matrix!
  elementwise(matrixJ: ID!, matrixC: ID!, resolver: String!): Matrix!
}
```

**Current Status**: CLI interface fully implemented at [`chirality/cli.py`](chirality/cli.py:1-200). GraphQL service planned for multi-service architecture.

### CLI Interface | ✅ **IMPLEMENTED**
**Location**: [`chirality/cli.py`](chirality/cli.py)

Command-line interface for semantic operations and pipeline execution.

#### Usage Patterns
```bash
# Run complete semantic valley
python -m chirality.cli run --thread "demo" --A matrix_A.json --B matrix_B.json

# Individual operations
python -m chirality.cli multiply --A matrix_A.json --B matrix_B.json --output matrix_C.json

# Validation and testing
python -m chirality.cli validate --matrix matrix_C.json
```

## Data Flow

### Semantic Valley Execution
1. **Input**: Problem matrices A and B loaded
2. **S1**: Validation and normalization
3. **S2**: Requirements generation via A * B = C
4. **S3**: Objective synthesis through interpretation and combination
5. **Output**: Complete reasoning trace with all intermediate matrices

### Operation Pipeline
```
User Input → Matrix Validation → Semantic Operation → LLM Resolution → Result Validation → Persistence → Response
```

### Reasoning Trace Generation
Every operation generates complete audit trail:
- Input matrices with content hashes
- Operation parameters and context
- LLM resolution process and results
- Output validation and quality metrics
- Timestamps and performance data

## Performance & Scalability

This section consolidates all measured performance metrics and system limits.

### Measured Performance Benchmarks

**Document Generation:**
- Two-pass generation: 15-45 seconds (typical problem)
- Pass 1 (sequential): 8-20 seconds 
- Pass 2 (cross-referential): 7-25 seconds
- File write operations: <100ms (atomic)

**Graph Mirror Operations:**
- Component selection: 200-800ms per document
- Neo4j mirror sync: 1-3 seconds per document
- GraphQL query response: <500ms (typical)
- Health endpoint: <50ms

**Matrix Operations (CF14 Legacy):**
- Semantic multiplication (4x4): 2-5 seconds (OpenAI)
- Matrix validation: <10ms
- ID generation (SHA1): <1ms
- Neo4j persistence: 100-300ms per matrix

### System Limits and Thresholds

**Component Selection Algorithm:**
- Cross-reference scoring: +3 points per reference
- Keyword matching: +2 points per keyword
- Size penalty: -2 points (>300 words)
- Selection threshold: 3 points minimum
- Components per document: 12 maximum

**Matrix Processing (CF14):**
- Maximum tested size: 10x10 matrices
- Memory per matrix: ~1MB with full provenance
- Concurrent operations: 5 parallel maximum
- Operation timeout: 30 seconds

**API Rate Limits:**
- GraphQL queries: 100 per minute per token
- Health checks: 1000 per minute
- Validation requests: 10 per minute

### Horizontal Scaling
- **Stateless Services**: All components designed for horizontal scaling
- **Load Balancing**: GraphQL API supports multiple instances
- **Database Partitioning**: Neo4j clustering for large datasets

### Performance Optimization
- **Caching**: Content-based caching of matrix operations
- **Lazy Loading**: On-demand matrix and cell loading
- **Batch Processing**: Multiple operations in single requests

### Resource Management
- **Memory**: Streaming matrix processing for large datasets
- **CPU**: Parallel semantic operation execution
- **Network**: Efficient serialization and compression

## Security Architecture

### Authentication & Authorization
- API key management for external services
- Role-based access control for matrix operations
- Audit logging for security compliance

### Data Protection
- Content hashing for integrity verification
- Encryption at rest for sensitive matrices
- Secure communication between services

### Input Validation
- Schema validation for all matrix inputs
- Sanitization of user-provided content
- Rate limiting and abuse prevention

## Deployment Architecture

### Development Environment
- Local services on standard ports
- Docker Compose for backend services
- Hot reloading for rapid development

### Production Environment
- Containerized services with orchestration
- Load balancers and health checking
- Monitoring and alerting systems

### Multi-Repository Structure
- **chirality-semantic-framework**: Core engine and CLI
- **chirality-ai-app**: Chat interface and document generation
- **chirality-ai**: Desktop orchestration and deployment

## Extension Points

### Custom Resolvers
Implement `Resolver` protocol for specialized semantic interpolation:
- Domain-specific language models
- Human-in-the-loop resolution
- Ensemble methods combining multiple approaches

### Custom Operations
Add new semantic operations following established patterns:
- Temporal reasoning operations
- Uncertainty quantification
- Multi-modal semantic processing

### External Integrations
- Vector databases for semantic search
- ML frameworks for model training
- Business intelligence tools for analytics

## Quality Assurance

### Testing Strategy
- **Unit Tests**: Individual operation validation
- **Integration Tests**: Complete semantic valley execution
- **Performance Tests**: Load and stress testing
- **Quality Tests**: Semantic consistency validation

### Monitoring & Observability
- Operation timing and success rates
- Matrix quality metrics and trends
- Resource utilization and optimization
- Error rates and failure analysis

### Continuous Integration
- Automated testing on all commits
- Performance regression detection
- Security vulnerability scanning
- Documentation consistency checks

## Troubleshooting Architecture Issues

### Common Implementation Problems

#### Matrix Dimension Mismatches
**Symptom**: ValidationError during semantic operations
**Cause**: Incompatible matrix dimensions for multiplication
**Solution**: Verify matrix shapes match CF14 specification in [`cf14_spec.json`](chirality/cf14_spec.json)

#### Resolver Connection Failures  
**Symptom**: ResolverError or timeout during operations
**Cause**: OpenAI API key issues or network connectivity
**Solution**: Check environment variables in [`.env.example`](.env.example), validate API key

#### Neo4j Persistence Issues
**Symptom**: Database connection errors during `--write-neo4j`
**Cause**: Neo4j service not running or incorrect credentials
**Solution**: Verify Neo4j service status, check connection string in environment

#### Station Pipeline Failures
**Symptom**: Incomplete semantic valley execution
**Cause**: Missing dependencies between processing stations
**Solution**: Review [`stations.py`](chirality/core/stations.py:1-150) for proper input validation

### Performance Considerations

#### Large Matrix Processing
- **Current Limit**: 10x10 matrices tested effectively
- **Memory Usage**: ~1MB per matrix with full provenance
- **Optimization**: Use streaming processing for larger datasets

#### LLM Resolution Latency
- **OpenAI API**: 2-5 seconds per semantic operation
- **Batching**: Multiple operations in single request reduces overhead
- **Caching**: Content-based hashing prevents duplicate operations

## Future Architecture Evolution

### Planned Enhancements | 📋 **ROADMAP**
- **Distributed Processing**: Cross-service semantic operations
- **Advanced Caching**: Semantic similarity-based caching
- **Auto-scaling**: Dynamic resource allocation based on load
- **Multi-Modal**: Integration of image, audio, and video processing

### Research Integration | 🔄 **IN_PROGRESS**
- **RL Training**: Infrastructure for reasoning trace analysis
- **Model Optimization**: Automated semantic operation tuning
- **Quality Metrics**: Advanced semantic consistency measurement

---

*Architecture documentation for CF14.3.0.0 - Updated with Phase 1 improvements January 2025*