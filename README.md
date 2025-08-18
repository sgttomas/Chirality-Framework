# Chirality Semantic Framework


### Key Features ✅ IMPLEMENTED

- **Computational semantics** for procedurally generated ontologies
- **GraphQL integration** with Neo4j database
- **JSON schema** for context engineering in prompt generation

### Quick Start
```bash
# Clone and install
git clone [repository-url]
npm install

or

pip install chirality-semantic-framework

# Set up environment
cp .env.example .env.local
# Add your OpenAI API key and optional Neo4j settings

# Start development server
npm run dev
# Visit http://localhost:3001

# Optional: Start Neo4j for graph features
docker compose -f docker-compose.neo4j.yml up -d

# Export CF14 matrices to Neo4j (from semantic framework)
cd ../chirality-semantic-framework
python -m chirality.cli run --thread "demo:test" \
  --A chirality/tests/fixtures/A.json \
  --B chirality/tests/fixtures/B.json \
  --resolver echo --write-cf14-neo4j
```

See **[chirality-ai-app](../chirality-ai-app)** for complete implementation details.

---

## Legacy CF14 Framework: Matrix-Based Semantic Operations

The original Chirality Framework provides systematic semantic transformation through matrix operations and LLM-guided reasoning.

## What CF14 Does

The Chirality Framework provides a systematic approach to complex reasoning by:

- **Structured Problem Decomposition**: Breaks complex problems into semantic matrices (A=axioms, B=basis)
- **Systematic Semantic Operations**: Combines concepts through defined operations (multiply, interpret, elementwise)
- **Complete Reasoning Traces**: Generates full audit trails from problem statement to solution
- **Human-AI Collaboration**: Leverages human structure design with AI semantic interpolation
- **Self-Referential Validation**: Can apply the methodology to analyze itself

### Core Demonstration

CF14 transforms semantic concepts systematically:
```
"Values" * "Necessary" → "Essential Values"
"Principles" * "Sufficient" → "Adequate Principles" 
"Methods" * "Contingent" → "Adaptive Methods"
```

These aren't simple text combinations - they're semantic interpolations that produce meaningful, contextually appropriate results through the 11-station semantic valley progression.

### Quick Links
- **[Get Started](#quick-start)** - Install and run your first semantic valley execution
- **[API Documentation](API.md)** - Complete interface reference (CLI, Python SDK, GraphQL)
- **[Architecture](ARCHITECTURE.md)** - System design and technical implementation
- **[What's Real vs Speculative](SPECULATIVE_CLAIMS.md)** - Honest assessment of capabilities

### Evidence Base
CF14 capabilities are demonstrated through:
- **Complete execution traces** showing 11-station problem→solution progression
- **Self-referential validation** where the framework analyzes its own methodology
- **Systematic semantic operations** with consistent, meaningful outputs
- **Full audit trails** enabling reasoning process analysis

### How It Works

**Three-Stage Pipeline:**
1. **S1 - Problem Formulation**: Validate input matrices A (axioms) and B (basis)
2. **S2 - Requirements Analysis**: Generate requirements matrix C through semantic multiplication (A * B)
3. **S3 - Objective Synthesis**: Create interpretation (J), functions (F), and objectives (D)

**Key Components:**
- **Semantic Matrices**: Structured problem representations with dimensional constraints
- **Resolver Strategies**: Pluggable semantic interpolation (OpenAI LLM, Echo testing)
- **Operation Pipeline**: Systematic transformation from problem to solution
- **Audit Trails**: Complete provenance tracking for every semantic operation

## Installation

```bash
# Clone and navigate
cd ~/ai-env/chirality-semantic-framework

# Install dependencies
pip install -r requirements.txt

# Or install as package
pip install -e .
```

## Quick Start

**30-Second Test Run** (no setup required):
```bash
# Clone and test immediately
git clone [repository-url]
cd chirality-semantic-framework
pip install -r requirements.txt

# Run complete semantic valley with test data
python -m chirality.cli run \
  --thread "demo:test" \
  --A chirality/tests/fixtures/A.json \
  --B chirality/tests/fixtures/B.json \
  --resolver echo
```

**With OpenAI Integration**:
```bash
# Set OpenAI API key
export OPENAI_API_KEY="sk-your-key-here"

# Run with LLM semantic interpolation
python -m chirality.cli run \
  --thread "demo:openai" \
  --A chirality/tests/fixtures/A.json \
  --B chirality/tests/fixtures/B.json \
  --resolver openai \
  --output results/
```

**What You'll See**:
- Matrix A (problem axioms) + Matrix B (decision basis) → Matrix C (requirements)
- Complete reasoning trace through 11 semantic valley stations
- Generated matrices J (interpretation), F (functions), D (objectives)
- Full audit trail of semantic operations

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

Matrices are JSON files with the following structure:

```json
{
  "id": "matrix_A_demo",
  "type": "A",
  "dimensions": [2, 2],
  "cells": [
    {
      "id": "cell_a00",
      "row": 0,
      "col": 0,
      "content": {
        "text": "Semantic content",
        "description": "Optional metadata"
      },
      "modality": "axiom",
      "provenance": {}
    }
  ],
  "metadata": {}
}
```

## Neo4j Integration

### CF14 Semantic Matrix Export (`--write-cf14-neo4j`)

The framework includes a specialized CF14 exporter that creates semantic matrix nodes optimized for integration with the document generation system:

```bash
# Export CF14 matrices to Neo4j with semantic labels
python -m chirality.cli run \
  --thread "demo:test" \
  --A chirality/tests/fixtures/A.json \
  --B chirality/tests/fixtures/B.json \
  --resolver echo --write-cf14-neo4j
```

**CF14 Graph Schema:**
- `(:CFMatrix)` nodes with kind (A,B,C,D,F,J), name, creation timestamp
- `(:CFNode)` nodes with semantic content, position coordinates, SHA1-based stable IDs
- `[:CONTAINS]` relationships linking matrices to their semantic nodes
- Idempotent operations using content-based hashing for consistent node IDs

**GraphQL Integration:**
The CF14 export integrates seamlessly with the chirality-ai-app GraphQL API for enhanced document generation with semantic context.

### Legacy Neo4j Export (`--write-neo4j`)

The original Neo4j integration creates standard graph representations:

- `(:Matrix)` nodes with type, dimensions
- `(:Cell)` nodes with content, modality
- `(:Thread)` nodes for context
- `[:HAS_CELL]` relationships
- `[:DERIVES]` lineage relationships

**Query Examples:**

```cypher
// Find CF14 matrices by type
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

For those interested in the mathematical underpinnings, CF14 implements structured semantic computation with category-theoretic foundations:

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
