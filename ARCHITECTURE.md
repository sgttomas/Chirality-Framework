# Architecture - Chirality Framework

## System Overview

CF14 implements structured semantic computation through a multi-service architecture that separates concerns between data persistence, semantic processing, and user interfaces.

## High-Level Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Desktop App   │    │   Chat Interface │    │  Web Interface  │
│   (Electron)    │    │   (Next.js)     │    │   (Future)      │
└─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
          │                      │                      │
          └──────────────────────┼──────────────────────┘
                                 │
                    ┌─────────────┴─────────────┐
                    │     GraphQL API Service   │
                    │     (Port 8080)          │
                    └─────────────┬─────────────┘
                                  │
                    ┌─────────────┴─────────────┐
                    │     CF14 Core Engine      │
                    │   (Semantic Operations)   │
                    └─────────────┬─────────────┘
                                  │
                    ┌─────────────┴─────────────┐
                    │      Neo4j Database       │
                    │   (Graph Persistence)     │
                    └───────────────────────────┘
```

## Core Components

### CF14 Semantic Engine
**Location**: `chirality/core/`

The heart of the framework implementing structured semantic operations.

#### Key Modules
- **`types.py`**: Matrix, Cell, and operation type definitions
- **`ops.py`**: Semantic operations (multiplication, addition, interpretation)
- **`stations.py`**: Processing pipeline (S1→S2→S3 runners)
- **`validate.py`**: Matrix validation and integrity checking
- **`ids.py`**: Content-based deterministic ID generation

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

#### Processing Stations
- **S1Runner**: Problem formulation and input validation
- **S2Runner**: Requirements analysis through semantic multiplication
- **S3Runner**: Objective synthesis via interpretation and combination

### Resolver Architecture
**Location**: `chirality/core/cell_resolver.py`

Pluggable strategy pattern for semantic interpolation.

#### Resolver Types
- **OpenAIResolver**: LLM-powered semantic interpolation
- **EchoResolver**: Deterministic testing implementation
- **Future**: Human, Local LLM, Ensemble resolvers

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

### Data Persistence
**Location**: `chirality/adapters/neo4j_adapter.py`

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
**Location**: GraphQL service (separate repository)

RESTful and GraphQL interfaces for semantic operations.

#### GraphQL Schema
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

### CLI Interface
**Location**: `chirality/cli.py`

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

## Scalability Considerations

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

## Future Architecture Evolution

### Planned Enhancements
- **Distributed Processing**: Cross-service semantic operations
- **Advanced Caching**: Semantic similarity-based caching
- **Auto-scaling**: Dynamic resource allocation based on load
- **Multi-Modal**: Integration of image, audio, and video processing

### Research Integration
- **RL Training**: Infrastructure for reasoning trace analysis
- **Model Optimization**: Automated semantic operation tuning
- **Quality Metrics**: Advanced semantic consistency measurement

---

*Architecture documentation for CF14.3.0.0 - Updated January 2025*