# API Documentation - Chirality Framework

## Overview

CF14 provides multiple interfaces for semantic operations. This document covers all programmatic access methods with working examples and troubleshooting guidance.

**Implementation Status:**
- ✅ **CLI Interface** - Fully implemented and tested
- ✅ **Python SDK** - Core functionality available  
- 📋 **GraphQL API** - Planned for multi-service architecture

**Quick Start**: Most users should begin with the [CLI Interface](#cli-interface) for immediate access to all CF14 capabilities.

## CLI Interface

### Installation
```bash
pip install -e .
```

### Basic Usage
```bash
# Complete semantic valley execution
python -m chirality.cli run --thread "example" --A matrix_A.json --B matrix_B.json

# Individual operations
python -m chirality.cli multiply --A matrix_A.json --B matrix_B.json --output matrix_C.json
python -m chirality.cli interpret --matrix matrix_C.json --output matrix_J.json
python -m chirality.cli elementwise --J matrix_J.json --C matrix_C.json --output matrix_F.json
```

### CLI Commands

#### `run` - Complete Pipeline
Execute full semantic valley progression.

```bash
python -m chirality.cli run [OPTIONS]

Options:
  --thread TEXT          Thread ID for operation tracking
  --A PATH              Matrix A (problem axioms) 
  --B PATH              Matrix B (decision basis)
  --resolver TEXT       Resolver type [openai|echo]
  --hitl                Enable human-in-the-loop validation
  --write-neo4j         Persist results to Neo4j
  --output-dir PATH     Directory for result matrices
```

#### `multiply` - Semantic Multiplication
Perform A * B semantic operation.

```bash
python -m chirality.cli multiply [OPTIONS]

Options:
  --A PATH              First matrix file
  --B PATH              Second matrix file  
  --output PATH         Output matrix file
  --resolver TEXT       Resolver type [openai|echo]
  --thread TEXT         Operation thread ID
```

#### `validate` - Matrix Validation
Validate matrix format and content.

```bash
python -m chirality.cli validate [OPTIONS]

Options:
  --matrix PATH         Matrix file to validate
  --schema PATH         Custom validation schema
  --strict              Enable strict validation mode
```

### Matrix File Format
```json
{
  "id": "cf14:example:A:v1",
  "name": "A", 
  "station": "problem",
  "shape": [3, 4],
  "cells": [
    {
      "id": "cf14:example:A:v1:0:0:hash",
      "row": 0,
      "col": 0, 
      "value": "Values"
    }
  ],
  "hash": "content_hash",
  "metadata": {"source": "manual"}
}
```

## Python SDK

### Installation
```python
from chirality import (
    Matrix, Cell, 
    OpenAIResolver, EchoResolver,
    S1Runner, S2Runner, S3Runner,
    op_multiply, op_interpret, op_elementwise
)
```

### Core Types

#### Matrix
```python
@dataclass
class Matrix:
    id: str
    name: str
    station: str
    shape: tuple[int, int]
    cells: List[Cell]
    hash: str
    metadata: Dict[str, Any]
```

#### Cell
```python
@dataclass 
class Cell:
    id: str
    row: int
    col: int
    value: str
    modality: Optional[Modality] = None
    provenance: Optional[Dict[str, Any]] = None
```

### Semantic Operations

#### Matrix Multiplication
```python
def op_multiply(
    thread: str,
    A: Matrix, 
    B: Matrix,
    resolver: Resolver
) -> Tuple[Matrix, Operation]:
    """
    Semantic multiplication: A * B = C
    
    Args:
        thread: Operation thread identifier
        A: First matrix (problem axioms)
        B: Second matrix (decision basis)  
        resolver: Semantic interpolation engine
        
    Returns:
        Tuple of result matrix and operation record
    """
```

#### Interpretation
```python
def op_interpret(
    thread: str,
    matrix: Matrix,
    resolver: Resolver
) -> Tuple[Matrix, Operation]:
    """
    Stakeholder interpretation: M → J
    
    Args:
        thread: Operation thread identifier
        matrix: Matrix to interpret
        resolver: Semantic interpolation engine
        
    Returns:
        Tuple of interpreted matrix and operation record
    """
```

#### Element-wise Combination
```python
def op_elementwise(
    thread: str,
    J: Matrix,
    C: Matrix, 
    resolver: Resolver
) -> Tuple[Matrix, Operation]:
    """
    Element-wise semantic combination: J ⊙ C = F
    
    Args:
        thread: Operation thread identifier
        J: Interpreted matrix
        C: Requirements matrix
        resolver: Semantic interpolation engine
        
    Returns:
        Tuple of combined matrix and operation record
    """
```

### Processing Stations

#### S1Runner - Problem Formulation
```python
class S1Runner:
    def __init__(self, resolver: Resolver):
        self.resolver = resolver
        
    def run(self, 
            inputs: Dict[str, Matrix], 
            context: Dict[str, Any]) -> Dict[str, Matrix]:
        """
        Validate and normalize input matrices
        
        Args:
            inputs: Dictionary of input matrices {"A": matrix_a, "B": matrix_b}
            context: Processing context with thread_id
            
        Returns:
            Validated matrices ready for processing
        """
```

#### S2Runner - Requirements Analysis  
```python
class S2Runner:
    def __init__(self, resolver: Resolver):
        self.resolver = resolver
        
    def run(self,
            inputs: Dict[str, Matrix],
            context: Dict[str, Any]) -> Dict[str, Matrix]:
        """
        Generate requirements through semantic multiplication
        
        Args:
            inputs: Matrices from S1 {"A": matrix_a, "B": matrix_b}
            context: Processing context
            
        Returns:
            Input matrices plus generated C matrix
        """
```

#### S3Runner - Objective Synthesis
```python
class S3Runner:
    def __init__(self, resolver: Resolver):
        self.resolver = resolver
        
    def run(self,
            inputs: Dict[str, Matrix], 
            context: Dict[str, Any]) -> Dict[str, Matrix]:
        """
        Synthesize objectives through interpretation and combination
        
        Args:
            inputs: Matrices from S2 with C matrix
            context: Processing context
            
        Returns:
            All matrices plus generated J, F, D matrices
        """
```

### Resolvers

#### OpenAI Resolver
```python
class OpenAIResolver:
    def __init__(self, 
                 api_key: str,
                 model: str = "gpt-4",
                 temperature: float = 0.3):
        """
        LLM-powered semantic interpolation
        
        Args:
            api_key: OpenAI API key
            model: Model name to use
            temperature: Sampling temperature
        """
        
    def resolve(self,
                op: Literal["*", "+", "×", "interpret", "⊙"],
                inputs: List[Matrix],
                system_prompt: str,
                user_prompt: str, 
                context: Dict[str, Any]) -> List[List[str]]:
        """
        Perform semantic interpolation using LLM
        
        Returns:
            Matrix content as list of rows
        """
```

#### Echo Resolver
```python
class EchoResolver:
    def resolve(self,
                op: Literal["*", "+", "×", "interpret", "⊙"],
                inputs: List[Matrix],
                system_prompt: str,
                user_prompt: str,
                context: Dict[str, Any]) -> List[List[str]]:
        """
        Deterministic testing resolver
        
        Returns predictable outputs for testing and validation
        """
```

### Usage Examples

#### Basic Semantic Multiplication
```python
from chirality import Matrix, Cell, OpenAIResolver, op_multiply

# Create matrices
matrix_a = Matrix(
    id="example:A:v1",
    name="A", 
    station="problem",
    shape=(2, 2),
    cells=[
        Cell("cell1", 0, 0, "Values"),
        Cell("cell2", 0, 1, "Actions"), 
        Cell("cell3", 1, 0, "Principles"),
        Cell("cell4", 1, 1, "Methods")
    ],
    hash="hash_a",
    metadata={}
)

matrix_b = Matrix(
    id="example:B:v1", 
    name="B",
    station="problem",
    shape=(2, 2),
    cells=[
        Cell("cell5", 0, 0, "Necessary"),
        Cell("cell6", 0, 1, "Sufficient"),
        Cell("cell7", 1, 0, "Contingent"), 
        Cell("cell8", 1, 1, "Insufficient")
    ],
    hash="hash_b",
    metadata={}
)

# Perform semantic multiplication
resolver = OpenAIResolver(api_key="your_key")
result_matrix, operation = op_multiply("thread1", matrix_a, matrix_b, resolver)

print(f"Result matrix: {result_matrix.name}")
print(f"Operation ID: {operation.id}")
```

#### Complete Pipeline Execution
```python
from chirality import S1Runner, S2Runner, S3Runner, OpenAIResolver

# Initialize components
resolver = OpenAIResolver(api_key="your_key")
s1 = S1Runner(resolver)
s2 = S2Runner(resolver) 
s3 = S3Runner(resolver)

# Execute pipeline
context = {"thread_id": "example_thread"}
inputs = {"A": matrix_a, "B": matrix_b}

# Stage 1: Problem formulation
stage1_result = s1.run(inputs, context)

# Stage 2: Requirements analysis
stage2_result = s2.run(stage1_result, context)

# Stage 3: Objective synthesis  
final_result = s3.run(stage2_result, context)

# Access results
requirements_matrix = final_result["C"]
objectives_matrix = final_result["D"]
interpretation_matrix = final_result["J"]
```

## GraphQL API | 📋 **PLANNED**

**Status**: Design phase - CLI provides full functionality for current use cases

### Proposed Endpoint
```
POST http://localhost:8080/graphql
```

### Proposed Schema

#### Types
```graphql
type Matrix {
  id: String!
  name: String!
  station: String!
  shape: [Int!]!
  cells: [Cell!]!
  hash: String!
  metadata: JSON
}

type Cell {
  id: String!
  row: Int!
  col: Int!
  value: String!
  modality: String
}

type Operation {
  id: String!
  kind: String!
  inputs: [String!]!
  output: String!
  timestamp: String!
}
```

#### Queries
```graphql
type Query {
  matrix(id: String!): Matrix
  matrices(station: String, thread: String): [Matrix!]!
  operation(id: String!): Operation
  reasoning_trace(thread: String!): [Operation!]!
}
```

#### Mutations
```graphql
type Mutation {
  multiply(
    matrixA: String!,
    matrixB: String!, 
    resolver: String!,
    thread: String!
  ): Matrix!
  
  interpret(
    matrix: String!,
    context: String!,
    resolver: String!,
    thread: String!
  ): Matrix!
  
  elementwise(
    matrixJ: String!,
    matrixC: String!,
    resolver: String!,
    thread: String!
  ): Matrix!
}
```

### Proposed Example Queries

#### Semantic Multiplication (Future)
```graphql
mutation MultiplyMatrices {
  multiply(
    matrixA: "example:A:v1",
    matrixB: "example:B:v1", 
    resolver: "openai",
    thread: "demo_thread"
  ) {
    id
    name
    cells {
      row
      col
      value
    }
  }
}
```

**Current Alternative**: Use CLI `multiply` command for same functionality

#### Retrieve Reasoning Trace (Future)
```graphql
query GetReasoningTrace {
  reasoning_trace(thread: "demo_thread") {
    id
    kind
    inputs
    output
    timestamp
  }
}
```

**Current Alternative**: Results saved to output directory with `--output-dir` flag

## Troubleshooting

### CLI Issues

#### Installation Problems
**Symptom**: `ModuleNotFoundError` when running CLI commands
**Solution**: 
```bash
# Ensure proper installation
pip install -e .
# Or install dependencies directly
pip install -r requirements.txt
```

#### Permission Errors
**Symptom**: Cannot write output files
**Solution**: 
```bash
# Create output directory with proper permissions
mkdir -p output
chmod 755 output
```

#### Environment Variable Issues
**Symptom**: OpenAI resolver fails with authentication error
**Solution**:
```bash
# Check environment setup
cat .env
# Ensure OPENAI_API_KEY is set correctly
export OPENAI_API_KEY="sk-your-key-here"
```

### Python SDK Issues

#### Import Errors
**Symptom**: Cannot import chirality modules
**Solution**:
```python
# Ensure package is in Python path
import sys
sys.path.append('/path/to/chirality-semantic-framework')
from chirality import Matrix, Cell
```

#### Resolver Configuration
**Symptom**: OpenAIResolver initialization fails
**Solution**:
```python
import os
from chirality import OpenAIResolver

# Verify API key setup
api_key = os.getenv('OPENAI_API_KEY')
if not api_key:
    raise ValueError("OPENAI_API_KEY environment variable required")
    
resolver = OpenAIResolver(api_key=api_key)
```

### Common Integration Patterns

#### Basic Error Handling
```python
from chirality import ValidationError, ResolverError

try:
    result = op_multiply("thread1", matrix_a, matrix_b, resolver)
except ValidationError as e:
    print(f"Matrix validation failed: {e}")
except ResolverError as e:
    print(f"Semantic resolution failed: {e}")
```

#### Retry Logic for LLM Operations
```python
import time
from chirality import ResolverError

def safe_semantic_operation(operation_func, *args, max_retries=3):
    for attempt in range(max_retries):
        try:
            return operation_func(*args)
        except ResolverError as e:
            if attempt == max_retries - 1:
                raise e
            time.sleep(2 ** attempt)  # Exponential backoff
```

## Error Handling

### Common Error Types
- **ValidationError**: Invalid matrix format or content
- **DimensionError**: Incompatible matrix dimensions for operation
- **ResolverError**: Semantic interpolation failure
- **NetworkError**: API or database connectivity issues

### Error Response Format
```json
{
  "error": {
    "type": "ValidationError",
    "message": "Matrix A has invalid dimensions for multiplication",
    "details": {
      "matrix_id": "example:A:v1",
      "expected_shape": [3, 4],
      "actual_shape": [3, 3]
    }
  }
}
```

### Error Resolution Guide

| Error Type | Common Cause | Solution |
|------------|--------------|----------|
| ValidationError | Invalid matrix JSON | Check against [Matrix Format](#matrix-file-format) |
| DimensionError | Incompatible shapes | Verify matrices match CF14 specification |
| ResolverError | API key/network issues | Check environment variables and connectivity |
| NetworkError | Neo4j connection | Verify database service and credentials |

## Rate Limits and Quotas

### API Limits
- 100 requests/minute for semantic operations
- 1000 requests/minute for read operations
- 10 concurrent operations per API key

### Matrix Size Limits
- Maximum 10x10 matrices for semantic operations
- Maximum 1MB per matrix file
- Maximum 100 cells per matrix

## Authentication

### API Key Format
```bash
export OPENAI_API_KEY="sk-proj-your-key-here"
export CF14_API_KEY="cf14-your-key-here"  # Future implementation
```

### Headers
```
Authorization: Bearer your-api-key
Content-Type: application/json
```

## Version Compatibility

### CF14 Version Support Matrix

| Feature | CF14.3.0.0 | CF14.2.x | Planned |
|---------|------------|----------|---------|
| CLI Interface | ✅ Full | ✅ Basic | - |
| Python SDK Core | ✅ Full | ✅ Basic | - |
| OpenAI Resolver | ✅ Full | ✅ Basic | - |
| Echo Resolver | ✅ Full | ⚠️ Limited | - |
| Neo4j Persistence | ✅ Full | ❌ None | - |
| GraphQL API | ❌ None | ❌ None | 📋 CF14.4.0.0 |
| Multi-Modal | ❌ None | ❌ None | 📋 CF14.5.0.0 |

### API Breaking Changes

#### CF14.3.0.0
- Added `thread` parameter to all operations for lineage tracking
- Changed matrix ID format to include content hashing
- Neo4j persistence requires updated schema

#### CF14.2.x → CF14.3.0.0 Migration
```python
# Old way
result = op_multiply(matrix_a, matrix_b, resolver)

# New way (CF14.3.0.0+)
result = op_multiply("thread_id", matrix_a, matrix_b, resolver)
```

### Dependencies

#### Required for All Features
```txt
python>=3.8
openai>=1.0.0
neo4j>=5.0.0
```

#### Optional Dependencies
```txt
pytest>=6.0.0  # For testing
jupyter>=1.0.0  # For notebook examples
```

---

*API Documentation for CF14.3.0.0 - Updated with Phase 2 improvements January 2025*