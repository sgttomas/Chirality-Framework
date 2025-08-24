# Architecture - Chirality Framework
**Status Last Updated**: August 24, 2025 at 11:19h
**Note**: Always ask user for current date/time when updating status - AI doesn't have real-time access

References to "CF14" are for the Chirality Framework version 14.

## System Overview

The Chirality Semantic Framework generates the semantic contents of components in the Chirality Framework.  It performs element-wise operations according to the definitions of semantic operations and then stores them in a graph database (Neo4j implementation).  The framework is then integrated with a front end (a separate project called "chirality-app") but none of that is present in this project.  It's a truly distinct backend / frontend configuration where neither directly interact with each other but instead both interact with the database.

## High-Level Architecture

```
Basic operations (*, +, ⊙, ×, interpret) cover core semantic transformations

```

## Two-Pass Generation Architecture

The Chirality Framework implements a novel two-pass document generation methodology that ensures cross-referential coherence and comprehensive problem coverage.

## SEMANTIC_OPERATIONS_QUICK_REF
- **op_multiply(A, B)**: Semantic intersection A * B → C (requirements from axioms)
- **op_interpret(C)**: Stakeholder translation C → J (clarify requirements)  
- **op_elementwise(J, C)**: Element combination J ⊙ C → F (merge interpretation)
- **op_add(A, F)**: Semantic concatenation A + F → D (final objectives)
- **Stations**: S1(validate) → S2(multiply) → S3(interpret+elementwise+add)

## RESOLVER_STRATEGIES
- **OpenAIResolver**: LLM semantic interpolation (production)
- **EchoResolver**: Deterministic testing (development)
- **Interface**: resolve(operation, inputs, prompts, context) → matrix_content

## MATRIX_TYPES
- **A**: Problem axioms (normative/operative/evaluative × guiding/applying/judging/reflecting)
- **B**: Decision basis (data/info/knowledge/wisdom × determinacy/sufficiency/completeness/consistency)
- **C**: Requirements (A * B semantic intersection)
- **J**: Interpretation (stakeholder-friendly C)
- **F**: Functions (J ⊙ C element-wise combination)
- **D**: Objectives (A + F final synthesis)

## KEY_PATTERNS
- Content-based hashing for deterministic IDs
- Matrix dimensional validation before operations
- Complete operation provenance tracking in Neo4j
- Human-in-the-loop validation at each station
- Pluggable resolver strategy pattern
- Structured prompt engineering for LLM semantic interpolation


### Key Modules | ✅ **IMPLEMENTED**
- **[`types.py`](chirality/core/types.py)**: Matrix, Cell, and operation type definitions
- **[`ops.py`](chirality/core/ops.py)**: Semantic operations (multiplication, addition, interpretation)  
- **[`stations.py`](chirality/core/stations.py)**: Processing pipeline (S1→S2→S3 runners)
- **[`validate.py`](chirality/core/validate.py)**: Matrix validation and integrity checking
- **[`ids.py`](chirality/core/ids.py)**: Content-based deterministic ID generation

### Semantic Operations
```python
# Core semantic transformation
def op_multiply(A: Matrix, B: Matrix, resolver: Resolver) -> Matrix:
    """Semantic matrix multiplication: A * B → C"""
    
def op_interpret(M: Matrix, resolver: Resolver) -> Matrix:
    """Interpretive lens meaning resolution: M → J"""
    
def op_elementwise(J: Matrix, C: Matrix, resolver: Resolver) -> Matrix:
    """Element-wise semantic multiplication: J ⊙ C → F"""
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

## Performance & Scalability

This section consolidates all measured performance metrics and system limits.

### Measured Performance Benchmarks

**Graph Mirror Operations:**
- Component selection: 200-800ms per document
- Neo4j mirror sync: 1-3 seconds per document
- GraphQL query response: <500ms (typical)
- Health endpoint: <50ms

**Semantic Operations:**
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

**Semantic Component Processing:**
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


---

*Architecture documentation for CF14.3.0.0 - Updated with Phase 1 improvements August 17, 2025*