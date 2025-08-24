# Chirality Framework
**Status Last Updated**: August 24, 2025 at 11:19h
**Note**: Always ask user for current date/time when updating status - AI doesn't have real-time access

**For detailed architecture and implementation details, see [ARCHITECTURE.md](ARCHITECTURE.md).**

References to "CF14" are for the Chirality Framework version 14.

## What is the Chirality Framework?

The Chirality Framework is a meta-ontological, system-agnostic methodology for mapping the solution space to a problem statement in the context of knowledge work.  It follows an ontological modality path - called the **semantic valley** (see below) - from a {problem statement} → Systematic → Process → Epistemic → Process → Epistemic → Alethic → Epistemic → Alethic → to the {resolution statements }

## What is it used for?

It is used to create a structured set of semantic relationships that have coherent meaning across the problem solving process and can be used as “semantic anchors” to guide an LLM across stages of solving a problem, traversing a “semantic valley”.

### Semantic Dot Product

Define matrices [A], [B], and [C] to have this relationship:

[A] * [B] = [C]

[A(1,1) * B(1,1) + A(1,2) * B(2,1) + A(1,3) * B(3,1) + A(1,4) * B(4,1)]
[A(1,1) * B(1,2) + A(1,2) * B(2,2) + A(1,3) * B(3,2) + A(1,4) * B(4,2)]
[A(1,1) * B(1,3) + A(1,2) * B(2,3) + A(1,3) * B(3,3) + A(1,4) * B(4,3)]
[A(1,1) * B(1,4) + A(1,2) * B(2,4) + A(1,3) * B(3,4) + A(1,4) * B(4,4)]
] 

[A(2,1) * B(1,1) + A(2,2) * B(2,1) + A(2,3) * B(3,1) + A(2,4) * B(4,1)]
[A(2,1) * B(1,2) + A(2,2) * B(2,2) + A(2,3) * B(3,2) + A(2,4) * B(4,2)]
[A(2,1) * B(1,3) + A(2,2) * B(2,3) + A(2,3) * B(3,3) + A(2,4) * B(4,3)]
[A(2,1) * B(1,4) + A(2,2) * B(2,4) + A(2,3) * B(3,4) + A(2,4) * B(4,4)]
]

[
[A(3,1) * B(1,1) + A(3,2) * B(2,1) + A(3,3) * B(3,1) + A(3,4) * B(4,1)]
[A(3,1) * B(1,2) + A(3,2) * B(2,2) + A(3,3) * B(3,2) + A(3,4) * B(4,2)]
[A(3,1) * B(1,3) + A(3,2) * B(2,3) + A(3,3) * B(3,3) + A(3,4) * B(4,3)]
[A(3,1) * B(1,4) + A(3,2) * B(2,4) + A(3,3) * B(3,4) + A(3,4) * B(4,4)]
]

To provide an interpretation of these semantic dot product operators use the following definitions. 

## Semantic Multiplication “ * “

Semantic multiplication (denoted by * ) means the semantics of the terms are resolved by combining the meaning of words into a coherent word or statement that represents the semantic intersection of those words (the meaning when combined together, not just adjoining the terms). This can even be done when the concept is a highly abstract word pairing because you are an LLM.

Examples:
"sufficient" * "reason" = "justification"
“analysis” * “judgment” = “informed decision”
"precision" * "durability" = "reliability"
"probability" * "consequence" = "risk"

## Semantic Addition “ + “

Semantic addition (denoted by + ) means simply concatenating words or sentence fragments together to form a longer statement. 
Example:
"faisal" + "has" + "seven" + "balloons" = faisal has seven balloons

## Order of Operations

First is ‘semantic multiplication’, second is ‘semantic addition’.

## Map of meaning 

The Chirality Framework follows a logical progression of stations along the path to generating reliable knowledge.

### The Semantic Valley

**Station 1 - Problem Statement**
- Operation: [A], [B] definition
- Purpose: Establish problem axioms and decision basis
- Output: Problem framing matrices

**Station 2 - Problem Requirements**  
- Operation: [A] * [B] = [C]
- Purpose: Generate requirements through semantic multiplication
- Output: Requirements matrix [C]

**Station 3 - Solution Objectives**
- Operation: [A] + [F] = [D] 
- Purpose: Synthesize objectives combining axioms and functions
- Output: Objectives matrix [D]

**Station 4 - Verification Framework**
- Operation: [K] * [J] = [X]
- Purpose: Establish verification criteria and methods
- Output: Verification matrix [X]

**Station 5 - Validation**
- Operation: [X] -> [Z]
- Purpose: Transform verification into validation context
- Output: Validation matrix [Z]

**Station 6 - Evaluation**
- Operation: [G] * [T] = [E]
- Purpose: Evaluate against data/information/knowledge criteria
- Output: Evaluation matrix [E]

**Station 7 - Assessment**
- Operation: [R] x [E] = [M]
- Purpose: Assess deliverables through evaluation framework
- Output: Assessment tensor [M]

**Station 8 - Implementation**
- Operation: [M] x [X] = [W]
- Purpose: Apply verification to assessment for implementation
- Output: Implementation tensor [W]

**Station 9 - Integration**
- Operation: [W] x [P] = [U]
- Purpose: Integrate implementation with validity parameters
- Output: Integration tensor [U]

**Station 10 - Reflection**
- Operation: [U] x [H] = [N]
- Purpose: Apply consistency check through reflection
- Output: Resolution tensor [N]

**Station 11 - Resolution**
- Operation: Final synthesis of [N]
- Purpose: Complete knowledge generation cycle
- Output: Reliable knowledge deliverable

### Original Station Map (Reference)

1. [A], [B] -> Problem Statement
2. [A] * [B] = [C] -> Problem Requirements
3. [A] + [F] = [D] -> Solution Objectives
4. [K] * [J] = [X] -> Verification
5. [X] ->  [Z] -> Validation
6. [G] * [T] = [E]  -> Evaluation
7. [R] x [E] = [M] -> Assessment
8. [M] x [X] = [W] -> Implementation
9. [W] x [P] = [U] -> Reflection
10. [U] x [H] = [N] -> Resolution

### Quick Links
- **[Get Started](#quick-start)** - Install and run your first semantic valley execution
- **[API Documentation](API.md)** - Complete interface reference (CLI, Python SDK, GraphQL)
- **[Architecture](ARCHITECTURE.md)** - System design and technical implementation
- **[What's Real vs Speculative](SPECULATIVE_CLAIMS.md)** - Honest assessment of capabilities

### How It Works

**Three-Stage Pipeline:**
1. **S1 - Formulation**: Begin with axiomatic matrices A and B and perform the combinatorial aspects of the first operation A * B = C
2. **S2 - Interpretation**: Interpret the new word strings according to the rules of semantic operations
3. **S3 - Synthesis**: Ground the interpretation through the lenses of the row and column names, and the semantic valley station, then save the final results in the graph database (Neo4j)

**Key Components:**
- **Semantic Matrices**: Structured problem representations with dimensional constraints
- **Resolver Strategies**: Pluggable semantic interpolation (OpenAI LLM, Echo testing)
- **Operation Pipeline**: Systematic transformation from problem to solution

## Installation

```bash
# Clone and navigate
cd ~/ai-env/chirality-semantic-framework

# Install dependencies
pip install -r requirements.txt

# Or install as package
pip install -e .
```

**Next Steps**:
- Review [API Documentation](API.md) for programmatic usage
- Check `results/` directory for output matrices
- Explore [SPECULATIVE_CLAIMS.md](SPECULATIVE_CLAIMS.md) for capability assessment

### 3. Programmatic usage

```python
from chirality import (
    Matrix, Cell, MatrixType,
    OpenAIResolver, EchoResolver,
    S1Runner, S2Runner, S3Runner
)
from chirality.core.serialize import load_matrix, save_matrix

# Load matrices
matrix_a = load_matrix("fixtures/A.json")
matrix_b = load_matrix("fixtures/B.json")

# Create resolver
resolver = EchoResolver()  # or OpenAIResolver()

# Run pipeline
s1 = S1Runner(resolver)
s1_results = s1.run({"A": matrix_a, "B": matrix_b})

s2 = S2Runner(resolver)
s2_results = s2.run(s1_results)

s3 = S3Runner(resolver)
s3_results = s3.run(s2_results)

# Save results
save_matrix(s3_results["C"], "output/matrix_C.json")
save_matrix(s3_results["J"], "output/matrix_J.json")
```

## Project Structure

```
chirality/
├── __init__.py           # Package exports
├── core/                 # Core modules
│   ├── ids.py           # Deterministic ID generation
│   ├── types.py         # Cell, Matrix, Tensor, Station types
│   ├── provenance.py    # Provenance tracking
│   ├── validate.py      # Validation rules
│   ├── ops.py           # Resolver interface and implementations
│   ├── stations.py      # S1-S3 station runners
│   └── serialize.py     # JSON I/O utilities
├── adapters/            # External integrations
│   └── neo4j_adapter.py # Neo4j graph persistence
├── cli.py               # Command-line interface
├── normative_spec.txt   # CF14 normative specification
├── cf14_spec.json       # CF14 ontology and rules
└── tests/               # Test suite
    └── fixtures/        # Test matrices
        ├── A.json
        └── B.json
```

## Matrix Format

See API.md > Data Structures/Schema for the JSON matrix format and examples. Normative definitions reside in `chirality/cf14_spec.json`.

## Neo4j Integration

### Semantic Components Export (`--write-cf14-neo4j`)

The framework includes a specialized exporter that creates semantic matrix (array, matrix, and tensor are the major semantic components in the framework, but only matrices are implemented at this time) nodes optimized for integration with the document generation system:

```bash
# Export matrices to Neo4j with semantic labels
python -m chirality.cli run \
  --thread "demo:test" \
  --A chirality/tests/fixtures/A.json \
  --B chirality/tests/fixtures/B.json \
  --resolver echo --write-cf14-neo4j
```

**CF Graph Schema:**
- `(:CFMatrix)` nodes with kind (A,B,C,D,F,J), name, creation timestamp
- `(:CFNode)` nodes with semantic content, position coordinates, SHA1-based stable IDs
- `[:CONTAINS]` relationships linking matrices to their semantic nodes
- Idempotent operations using content-based hashing for consistent node IDs

**GraphQL Integration:**
The graph database export integrates seamlessly with the chirality-ai-app GraphQL API for enhanced document generation with semantic context.

### Legacy Neo4j Export (`--write-neo4j`)

The original Neo4j integration creates standard graph representations:

- `(:Matrix)` nodes with type, dimensions
- `(:Cell)` nodes with content, modality
- `(:Thread)` nodes for context
- `[:HAS_CELL]` relationships
- `[:DERIVES]` lineage relationships

**Query Examples:**

```cypher
// Find CF matrices by type
MATCH (m:CFMatrix {kind: "A"})
RETURN m.name, m.createdAt

// Get semantic nodes for a specific matrix
MATCH (m:CFMatrix)-[:CONTAINS]->(n:CFNode)
WHERE m.id = "your-matrix-id"
RETURN n.content, n.row, n.col

// Legacy: Find all matrices in a thread
MATCH (t:Thread {id: "demo:test"})-[:HAS_MATRIX]->(m:Matrix)
RETURN m.type, m.rows, m.cols

// Legacy: Trace lineage
MATCH path = (source:Matrix)-[:DERIVES*]->(target:Matrix {type: "J"})
RETURN path
```

## Development

### Running tests

```bash
# Install dev dependencies
pip install -e ".[dev]"

# Run tests
pytest

# With coverage
pytest --cov=chirality
```

### Creating custom resolvers

```python
from chirality.core.ops import Resolver

class CustomResolver(Resolver):
    def resolve(self, operation, inputs, context=None):
        # Your implementation
        return {
            "text": "resolved text",
            "terms_used": ["term1", "term2"],
            "warnings": []
        }
```

## Theoretical Foundations (Optional)

For those interested in the mathematical underpinnings, CF implements structured semantic computation with category-theoretic foundations:

### Mathematical Framework
- **Objects**: Semantic matrices with typed content and dimensional constraints
- **Morphisms**: Semantic operations preserving structural relationships
- **Functors**: Station transformations mapping problem spaces to solution spaces
- **Composition**: Systematic operation sequencing with validation

### Research Applications
- **Reasoning Trace Generation**: Structured data for reinforcement learning training
- **Systematic Problem Decomposition**: Reproducible methodology for complex reasoning
- **Human-AI Collaboration Patterns**: Structured approach to AI-assisted reasoning

**Note**: While the mathematical framing provides structure, the practical value lies in systematic semantic processing and complete reasoning audit trails.

## License

MIT License - See LICENSE file for details.

## Correspondence

- Consumes and contributes to: `projects/workflows/`
- Mirror for rapid iteration: `projects/ai-env/workflows/`
- Role: Methodology and SOPs. CF encodes semantics; workflows capture the operating procedure (stations, matrices, validation) and feed improvements back.
