# ADR-004: Chirality Boundary for Semantic Operations

## Status

Accepted

## Context

The Chirality Framework is built on the principle of "chirality of knowledge" - maintaining strict separation between constructive (deterministic) and generative (LLM-based) operations. This separation is crucial for:

1. **Semantic Integrity**: Ensuring that framework operations remain auditable and reproducible
2. **Fail-fast Semantics**: Explicit errors rather than silent fallbacks or arbitrary string conversions
3. **Operational Transparency**: Clear distinction between what is computed vs. what is generated
4. **Framework Validity**: Maintaining the CF14 normative specification requirements

The team needed to establish clear boundaries for when to use:
- **Constructive Operations**: Deterministic mathematical operations on semantic structures
- **Generative Operations**: LLM-powered semantic reasoning and content generation

Initial approaches considered:
- **All-LLM Approach**: Use LLM for all operations including simple concatenation
- **All-Deterministic Approach**: Avoid LLM usage entirely, use only string operations
- **Hybrid with Clear Boundaries**: Strict separation with defined interface points
- **Context-Dependent**: Use LLM based on operation complexity

## Decision

We implement **strict chirality boundaries** with the following separation:

### Constructive Operations (No LLM)
These operations are **deterministic** and **auditable**:

```python
# Matrix mechanics
def matrix_multiply(A: Matrix, B: Matrix) -> Matrix:
    """Pure mathematical matrix operations"""
    
def matrix_add(A: Matrix, F: Matrix) -> Matrix:
    """Semantic addition via string concatenation"""
    
def matrix_truncate(B: Matrix, rows: int) -> Matrix:
    """Extract submatrix (J from B)"""

# Data operations  
def extract_from_neo4j(query: str) -> Data:
    """Direct database queries"""
    
def propagate_labels(matrix: Matrix) -> Matrix:
    """Label and ontology management"""

# String operations
def semantic_addition(term_a: str, term_f: str) -> str:
    """Deterministic concatenation: A(i,j) + F(i,j)"""
    return f"{term_a} + {term_f}"
```

### Generative Operations (LLM via semmul.py)
These operations use **OpenAI API** for semantic reasoning:

```python
# Semantic multiplication ONLY
def semantic_multiply(term_a: str, term_b: str, context: Context) -> SemanticResult:
    """
    Core semantic multiplication operation.
    Uses LLM to generate semantic product of two terms.
    """
    
# Interpretation preparation (not execution)
def prepare_interpretation_inputs(cell: Cell) -> InterpretationInput:
    """
    Prepare inputs for future interpretation.
    Stored in Cell.intermediate for downstream processing.
    """
```

### Interface Contract
```python
class Cell:
    resolved: str           # Final narrative (post-interpretation when applicable)
    intermediate: List[str] # Ordered trace of transformations
    raw_terms: List[str]    # Original terms from semantic operations only
    
    def _safe_resolved(self) -> str:
        """
        Fail-fast accessor: resolved → intermediate → raw_terms
        Never arbitrary string conversion
        """
        if self.resolved:
            return self.resolved
        elif self.intermediate:
            return self.intermediate[-1]
        elif self.raw_terms:
            return self.raw_terms[-1]
        else:
            return f"Cell({self.i},{self.j})"  # Explicit fallback label
```

### Operation Boundaries

#### Matrix C Generation (A × B)
- **Constructive**: Matrix shape validation, cell positioning, label propagation
- **Generative**: `semantic_multiply(A[i,j], B[j,k])` for each cell
- **Result**: Populated C matrix with semantic products

#### Matrix F Generation (J ⊙ C)  
- **Constructive**: Element extraction, iteration control
- **Generative**: `semantic_multiply(J[i,j], C[i,j])` for element-wise product
- **Result**: Objectives matrix with compound semantic operations

#### Matrix D Generation (A + F)
- **Constructive**: `semantic_addition(A[i,j], F[i,j])` string concatenation
- **Generative**: None (purely constructive operation)
- **Result**: Deterministic concatenation of problem statements and objectives

## Consequences

### Positive Consequences

1. **Auditability**: Every operation can be traced as either deterministic or LLM-generated
2. **Reproducibility**: Constructive operations produce identical results across runs
3. **Error Clarity**: Explicit failure modes rather than silent degradation
4. **Performance**: Deterministic operations are fast and don't consume API credits
5. **Framework Integrity**: Maintains CF14 normative specification compliance
6. **Debugging**: Clear separation simplifies troubleshooting and validation
7. **Cost Control**: Limited LLM usage to only necessary semantic operations

### Negative Consequences

1. **Implementation Complexity**: Requires careful boundary management in code
2. **Developer Training**: Team must understand which operations are appropriate where
3. **Rigid Structure**: Less flexibility for contextual optimization
4. **Potential Brittleness**: Strict boundaries may require more error handling
5. **Testing Complexity**: Need separate testing strategies for constructive vs generative

### Mitigation Strategies

1. **Clear Documentation**: Comprehensive guidelines in CLAUDE*.md files
2. **Code Organization**: Separate modules for constructive vs generative operations
3. **Validation Framework**: Automated tests to verify boundary compliance
4. **Error Messages**: Clear feedback when boundaries are violated
5. **Development Tools**: Linting and type checking to enforce boundaries

## Implementation Notes

### Code Organization
```
├── semmul.py              # Generative operations (LLM-based)
├── semmul_cf14.py         # CF14-specific semantic operations
├── matrix_ops.py          # Constructive operations (deterministic)
├── neo4j_ops.py          # Database operations (constructive)
└── chirality_boundary.py  # Boundary validation and enforcement
```

### Boundary Enforcement
```python
# Type system enforcement
from typing import Union, NoReturn

class ConstructiveOperation:
    """Marker for deterministic operations"""
    pass

class GenerativeOperation:
    """Marker for LLM-based operations"""
    pass

def ensure_constructive(operation: ConstructiveOperation) -> None:
    """Validate operation doesn't use LLM"""
    
def ensure_generative(operation: GenerativeOperation) -> None:
    """Validate operation uses appropriate LLM interface"""
```

### Error Handling Pattern
```python
def _safe_resolved(self) -> str:
    """
    Fail-fast semantic access with explicit fallbacks.
    Never silently convert arbitrary data to strings.
    """
    if self.resolved:
        return self.resolved
    elif self.intermediate and len(self.intermediate) > 0:
        return self.intermediate[-1]
    elif self.raw_terms and len(self.raw_terms) > 0:
        return self.raw_terms[-1]
    else:
        # Explicit fallback - never hide missing data
        return f"{self.__class__.__name__}({self.i},{self.j})"
```

### CLI Flag Integration
```bash
# Constructive-only operations
python chirality_cli.py push-axioms    # No LLM needed
python chirality_cli.py matrix-add     # Deterministic concatenation

# Generative operations  
python chirality_cli.py semantic-matrix-c              # Uses LLM for multiplication
python chirality_cli.py semantic-matrix-c --no-llm     # Error: operation requires LLM

# Interpretation control
python chirality_cli.py semantic-matrix-c --run-interpretations  # Prepare for future LLM
python chirality_cli.py semantic-matrix-c --ontology-pack pack.json  # Enhanced context
```

### Validation and Testing
```python
def test_constructive_boundary():
    """Ensure constructive operations don't use LLM"""
    with patch('openai.OpenAI') as mock_openai:
        result = matrix_add(matrix_a, matrix_f)
        mock_openai.assert_not_called()

def test_generative_boundary():
    """Ensure generative operations use LLM appropriately"""
    with patch('openai.OpenAI') as mock_openai:
        result = semantic_multiply("term_a", "term_b", context)
        mock_openai.assert_called()

def test_fail_fast_semantics():
    """Ensure no silent fallbacks or arbitrary conversions"""
    empty_cell = Cell(i=0, j=0)
    result = empty_cell._safe_resolved()
    assert result == "Cell(0,0)"  # Explicit fallback, not empty string
```

### Future Evolution
- **Interpretation Phase**: Future implementation of LLM-based interpretation of `intermediate` data
- **Domain Packs**: Enhanced ontological context for generative operations
- **Hybrid Operations**: Carefully designed operations that combine both boundaries
- **Validation Tools**: Automated boundary compliance checking

## References

- [CF14 Normative Specification](../../NORMATIVE_Chriality_Framework_14.2.1.1.txt) - Framework requirements
- [Semantic Integrity Contract](../../README.md#semantic-integrity-contract-cf14) - Implementation principles
- [semmul.py](../../semmul.py) - Generative operations implementation
- [matrix_ops.py](../../matrix_ops.py) - Constructive operations (to be extracted)
- Discussion: Chirality Boundary Implementation Strategy