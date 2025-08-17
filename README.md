# Chirality Semantic Framework

Clean, minimal implementation of the CF14 semantic protocol for traversing the "semantic valley" from problem to solution, built on rigorous category-theoretic foundations.

## Overview

The Chirality Framework implements a deterministic semantic pipeline that transforms problems through requirements into objectives and solutions using matrix operations and LLM-guided semantic interpolation. The framework provides the first practical implementation of **semantic computation as category theory**, enabling formal verification, compositional reasoning, and systematic extensibility.

### Mathematical Foundations

CF14 implements a **symmetric monoidal category** with:
- **Objects**: Semantic matrices (A, B, C, D, F, J) with typed content and dimensional constraints
- **Morphisms**: Semantic operations (*, +, ⊙, ×, interpret) preserving categorical structure
- **Functors**: Station transformations (S1→S2→S3) mapping problem spaces to solution spaces
- **Natural Transformations**: Resolver strategies (OpenAI, Echo) preserving semantic equivalence

For complete mathematical details, see:
- [Mathematical Foundations](MATHEMATICAL_FOUNDATIONS.md) - Formal categorical statement
- [Categorical Implementation](CATEGORICAL_IMPLEMENTATION.md) - Code-to-theory mapping  
- [Theoretical Significance](THEORETICAL_SIGNIFICANCE.md) - Research implications and practical impact

### Core Concepts

- **Semantic Valley**: The conceptual space traversed from problem to solution
- **Stations (S1-S3)**: Processing stages in the pipeline
  - S1: Problem formulation (A, B axioms)
  - S2: Requirements analysis (C = A × B)
  - S3: Objective synthesis (J, F, D outputs)
- **Matrix Operations**: Semantic multiplication and addition operations
- **Deterministic IDs**: Content-based hashing for reproducibility

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

### 1. Set up environment

```bash
# Create .env file
cat > .env << EOF
OPENAI_API_KEY=sk-your-key-here
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=password
EOF
```

### 2. Run with test fixtures

```bash
# Using echo resolver (no OpenAI needed)
python -m chirality.cli run \
  --thread "demo:test" \
  --A chirality/tests/fixtures/A.json \
  --B chirality/tests/fixtures/B.json \
  --resolver echo

# Using OpenAI resolver
python -m chirality.cli run \
  --thread "demo:test" \
  --A chirality/tests/fixtures/A.json \
  --B chirality/tests/fixtures/B.json \
  --resolver openai

# With Human-In-The-Loop
python -m chirality.cli run \
  --thread "demo:test" \
  --A chirality/tests/fixtures/A.json \
  --B chirality/tests/fixtures/B.json \
  --resolver openai \
  --hitl

# Write to Neo4j
python -m chirality.cli run \
  --thread "demo:test" \
  --A chirality/tests/fixtures/A.json \
  --B chirality/tests/fixtures/B.json \
  --write-neo4j
```

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

When using `--write-neo4j`, the framework creates:

- `(:Matrix)` nodes with type, dimensions
- `(:Cell)` nodes with content, modality
- `(:Thread)` nodes for context
- `[:HAS_CELL]` relationships
- `[:DERIVES]` lineage relationships

Query examples:

```cypher
// Find all matrices in a thread
MATCH (t:Thread {id: "demo:test"})-[:HAS_MATRIX]->(m:Matrix)
RETURN m.type, m.rows, m.cols

// Trace lineage
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

## License

MIT License - See LICENSE file for details.

## Key Concepts

### CF14 Documentation
- CF14 Protocol Specification
- Chirality Framework Documentation  
- Semantic Valley Methodology

### Engineering Patterns
- Structured data processing with matrix operations
- Pipeline architecture for complex reasoning tasks
- Strategy pattern for pluggable AI integration

### AI Integration Practices
- Structured prompting and schema validation
- Multi-model orchestration patterns
- Audit and compliance for AI systems
