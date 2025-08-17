"""
Semantic operations and resolver interfaces for CF14.

Core CF14 semantic operations: *, +, ⊙, ×, interpret
- Resolver protocol with OpenAI and Echo implementations
- Pure ops functions returning (Matrix, Operation) tuples
- Canonical value handling for consistent hashing
- RAG context placeholder for future integration
"""

from __future__ import annotations
import os
import json
import time
import hashlib
import unicodedata
import re
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional, List, Tuple, Literal, Protocol
from datetime import datetime

from .types import Cell, Matrix, MatrixType, Operation
from .ids import generate_cell_id, generate_operation_id, generate_matrix_id


# Import provenance helpers
from .provenance import canonical_value, prompt_hash, content_hash

# ---------- Resolver Protocol ----------

class Resolver(Protocol):
    """Protocol for semantic resolution engines."""
    
    def resolve(self,
                op: Literal["*", "+", "×", "interpret", "⊙"],
                inputs: List[Matrix],
                system_prompt: str,
                user_prompt: str,
                context: Dict[str, Any]) -> List[List[str]]:
        """
        Return a 2D array of string values for output matrix cells.
        Shape matches op semantics (validated upstream).
        """
        ...


class EchoResolver:
    """Deterministic, zero-LLM dev resolver."""
    
    def resolve(self, op: Literal["*", "+", "×", "interpret", "⊙"], 
                inputs: List[Matrix], system_prompt: str, user_prompt: str, 
                context: Dict[str, Any]) -> List[List[str]]:
        """Return deterministic 2D array based on operation type."""
        
        if op == "*":  # Matrix multiplication
            A, B = inputs
            rows, cols = A.shape[0], B.shape[1]
            def val(r, c): return f"*:{A.name}[{r},:]{B.name}[:,{c}]"
        elif op == "+":  # Addition
            A, F = inputs
            rows, cols = A.shape
            def val(r, c): return f"+:{A.name}[{r},{c}]⊕{F.name}[{r},{c}]"
        elif op == "interpret":  # Interpretation
            (B,) = inputs
            rows, cols = B.shape
            def val(r, c): return f"interp:{B.name}[{r},{c}]"
        elif op == "⊙":  # Element-wise multiplication
            J, C = inputs
            rows, cols = J.shape
            def val(r, c): return f"⊙:{J.name}[{r},{c}]×{C.name}[{r},{c}]"
        elif op == "×":  # Cross-product
            A, B = inputs
            rows = A.shape[0] * B.shape[0]
            cols = A.shape[1] * B.shape[1]
            def val(r, c): 
                ar, ac = r // B.shape[0], c // B.shape[1]
                br, bc = r % B.shape[0], c % B.shape[1]
                return f"×:{A.name}[{ar},{ac}]⨂{B.name}[{br},{bc}]"
        else:
            raise ValueError(f"Unknown op: {op}")
        
        return [[val(r, c) for c in range(cols)] for r in range(rows)]


def _ensure_grid(result: dict) -> List[List[str]]:
    """Validate JSON response and extract 2D grid with strict CF14 validation."""
    from .validate import CF14ValidationError
    
    shape = result.get("shape")
    cells = result.get("cells")
    
    if not (isinstance(shape, list) and len(shape) == 2 and all(isinstance(x, int) for x in shape)):
        raise CF14ValidationError("Missing valid shape [rows, cols] in OpenAI response")
    
    rows, cols = shape
    if not (isinstance(cells, list) and len(cells) == rows and all(isinstance(r, list) for r in cells)):
        raise CF14ValidationError("Missing cells 2D array matching shape in OpenAI response")
    
    return [[canonical_value(cells[r][c]) if c < len(cells[r]) else "" for c in range(cols)] for r in range(rows)]


class OpenAIResolver:
    """
    Strict, schema-first resolver: forces the model to call a single tool `emit_matrix`
    with pinned target shape. No free-form JSON is accepted. We then run `_ensure_grid`
    as a final assertion.
    """
    
    def __init__(self, api_key: Optional[str] = None, model: str = "gpt-4o", *, seed: int = 42):
        """Initialize OpenAI resolver."""
        try:
            from openai import OpenAI
        except ImportError:
            raise ImportError("OpenAI package required. Install with: pip install openai")
        
        api_key = api_key or os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise ValueError("OpenAI API key required")
        
        self.client = OpenAI(api_key=api_key)
        self.model = model
        self.seed = seed
        # keep temps low for dev reproducibility
        self.temperatures = {"*": 0.0, "+": 0.0, "interpret": 0.0, "⊙": 0.0, "×": 0.0}

    def _target_shape_for_op(self, op: Literal["*","+","×","interpret","⊙"], inputs: List[Matrix]) -> Tuple[int,int]:
        from .validate import CF14ValidationError
        
        if op == "*":
            A, B = inputs
            if A.shape[1] != B.shape[0]:
                raise CF14ValidationError(f"dims mismatch for *: A{A.shape} * B{B.shape} requires A.cols==B.rows")
            return (A.shape[0], B.shape[1])
        if op == "+":
            A, F = inputs
            if A.shape != F.shape:
                raise CF14ValidationError(f"dims mismatch for +: {A.shape} vs {F.shape}")
            return A.shape
        if op == "interpret":
            (B,) = inputs
            return B.shape
        if op == "⊙":
            J, C = inputs
            if J.shape != C.shape:
                raise CF14ValidationError(f"dims mismatch for ⊙: {J.shape} vs {C.shape}")
            return J.shape
        if op == "×":
            A, B = inputs
            return (A.shape[0]*B.shape[0], A.shape[1]*B.shape[1])
        raise ValueError(f"unknown op {op}")

    def resolve(self, op: Literal["*", "+", "×", "interpret", "⊙"], 
                inputs: List[Matrix], system_prompt: str, user_prompt: str, 
                context: Dict[str, Any]) -> List[List[str]]:
        """Return 2D array from tool call with strict validation."""
        from .validate import CF14ValidationError
        
        rows, cols = self._target_shape_for_op(op, inputs)
        temperature = self.temperatures.get(op, 0.0)

        tools = [{
            "type": "function",
            "function": {
                "name": "emit_matrix",
                "description": "Emit a matrix with fixed shape and a 2D string grid of cells.",
                "parameters": {
                    "type": "object",
                    "additionalProperties": False,
                    "properties": {
                        "shape": {
                            "type": "array",
                            "minItems": 2, "maxItems": 2,
                            "items": {"type":"integer"},
                            # Pin the exact target shape
                            "const": [rows, cols]
                        },
                        "cells": {
                            "type": "array",
                            "minItems": rows, "maxItems": rows,
                            "items": {
                                "type": "array",
                                "minItems": cols, "maxItems": cols,
                                "items": {"type": "string"}
                            }
                        }
                    },
                    "required": ["shape","cells"]
                }
            }
        }]

        # Nudge in the prompt that shape is fixed; tool schema enforces it anyway.
        shape_hint = f"Target shape is [{rows}, {cols}]. Respond ONLY by calling emit_matrix."
        messages = [
            {"role": "system", "content": f"{system_prompt}\n{shape_hint}"},
            {"role": "user", "content": user_prompt}
        ]

        max_retries = 2
        for attempt in range(max_retries):
            try:
                resp = self.client.chat.completions.create(
                    model=self.model,
                    temperature=temperature, top_p=0, seed=self.seed,
                    messages=messages,
                    tools=tools,
                    tool_choice={"type": "function", "function": {"name": "emit_matrix"}},
                    max_tokens=1200,
                )

                msg = resp.choices[0].message
                tcalls = getattr(msg, "tool_calls", None) or []
                if not tcalls:
                    raise CF14ValidationError("Model did not call emit_matrix()")
                call = tcalls[0]
                if call.function.name != "emit_matrix":
                    raise CF14ValidationError(f"Unexpected tool called: {call.function.name}")

                args = json.loads(call.function.arguments)
                # Final strict check; raises CF14ValidationError if wrong
                grid = _ensure_grid(args)
                # grid is a 2D list[str] with exact (rows, cols)
                return grid

            except Exception as e:
                if attempt < max_retries - 1:
                    time.sleep(2 ** attempt)
                    continue
                raise RuntimeError(f"OpenAI resolution failed after {max_retries} attempts: {e}")


# ---------- Prompt Helpers (Private) ----------

def _prompt_multiply(A: Matrix, B: Matrix) -> Tuple[str, str]:
    """Generate prompts for matrix multiplication."""
    
    # Extract matrix content for semantic processing
    a_content = []
    for r in range(A.shape[0]):
        row = []
        for c in range(A.shape[1]):
            cell = next((cell for cell in A.cells if cell.row == r and cell.col == c), None)
            row.append(cell.value if cell else "")
        a_content.append(row)
    
    b_content = []
    for r in range(B.shape[0]):
        row = []
        for c in range(B.shape[1]):
            cell = next((cell for cell in B.cells if cell.row == r and cell.col == c), None)
            row.append(cell.value if cell else "")
        b_content.append(row)
    
    system = f"""## Semantic Multiplication "*"

Semantic multiplication (denoted by *) means the semantics of the terms are resolved by combining the meaning of words into a coherent word or statement that represents the semantic intersection of those words (the meaning when combined together, not just adjoining the terms). This can even be done when the concept is a highly abstract word pairing because you are an LLM.

Examples:
"sufficient" * "reason" = "justification"
"analysis" * "judgment" = "informed decision"
"precision" * "durability" = "reliability"
"probability" * "consequence" = "risk"

For matrix multiplication C = A * B, each cell C[i,j] contains the semantic multiplication of A[i,:] with B[:,j].
Call emit_matrix with shape [{A.shape[0]}, {B.shape[1]}]."""
    
    user = f"""Compute semantic multiplication C = A * B:

Matrix A ({A.name}):
{a_content}

Matrix B ({B.name}):
{b_content}

For each result cell C[i,j], perform semantic multiplication of the corresponding terms from A's row i and B's column j.
Create coherent semantic intersections that represent the meaningful combination of concepts.
Output shape: [{A.shape[0]}, {B.shape[1]}]"""
    
    return system, user

def _prompt_add(A: Matrix, F: Matrix) -> Tuple[str, str]:
    """Generate prompts for matrix addition."""
    system = f"CF14 semantic addition (+): combine preserving identities. Call emit_matrix with shape [{A.shape[0]}, {A.shape[1]}]."
    user = f"Compute D = {A.name} + {F.name} with shape [{A.shape[0]}, {A.shape[1]}]."
    return system, user

def _prompt_interpret(B: Matrix) -> Tuple[str, str]:
    """Generate prompts for interpretation."""
    system = f"CF14 interpretation: rewrite for clarity. Call emit_matrix with shape [{B.shape[0]}, {B.shape[1]}]."
    user = f"Interpret matrix {B.name} into judgment matrix J with shape [{B.shape[0]}, {B.shape[1]}]."
    return system, user

def _prompt_elementwise(J: Matrix, C: Matrix) -> Tuple[str, str]:
    """Generate prompts for element-wise multiplication."""
    system = f"CF14 element-wise multiplication (⊙): combine corresponding cells. Call emit_matrix with shape [{J.shape[0]}, {J.shape[1]}]."
    user = f"Compute F = {J.name} ⊙ {C.name} with shape [{J.shape[0]}, {J.shape[1]}]."
    return system, user

def _prompt_cross(A: Matrix, B: Matrix) -> Tuple[str, str]:
    """Generate prompts for cross-product."""
    target_shape = [A.shape[0] * B.shape[0], A.shape[1] * B.shape[1]]
    system = f"CF14 cross-product (×): expand relational possibilities. Call emit_matrix with shape {target_shape}."
    user = f"Compute W = {A.name} × {B.name} with expanded shape {target_shape}."
    return system, user

# ---------- Output Matrix Builder ----------

def _build_output_matrix(thread: str, name: str, station: str, values: List[List[str]]) -> Matrix:
    """Build output matrix from 2D value array."""
    from .ids import matrix_id, cell_id
    
    rows, cols = len(values), len(values[0]) if values else 0
    mid = matrix_id(thread, name, 1)
    cells = []
    
    for r in range(rows):
        for c in range(cols):
            value = canonical_value(values[r][c])
            cid = cell_id(mid, r, c, value)
            cells.append(Cell(
                id=cid,
                row=r,
                col=c,
                value=value
            ))
    
    # Calculate matrix hash
    matrix_hash = content_hash(cells)
    
    return Matrix(
        id=mid,
        name=name,
        station=station,
        shape=(rows, cols),
        cells=cells,
        hash=matrix_hash,
        metadata={"timestamp": datetime.utcnow().isoformat()}
    )

def _op_record(kind: Literal["*", "+", "×", "interpret", "⊙"], 
               inputs: List[Matrix], output: Matrix, 
               system_prompt: str, user_prompt: str, 
               model: Optional[Dict[str, Any]] = None) -> Operation:
    """Create operation record."""
    from .ids import operation_id
    
    timestamp = datetime.utcnow().isoformat()
    prompt_hash_val = prompt_hash(system_prompt, user_prompt, {"inputs": [m.id for m in inputs]})
    op_id = operation_id(kind, [m.id for m in inputs], output.hash, prompt_hash_val)
    
    return Operation(
        id=op_id,
        kind=kind,
        inputs=[m.id for m in inputs],
        output=output.id,
        model=model or {"vendor": "dev", "name": "echo", "version": "0"},
        prompt_hash=prompt_hash_val,
        timestamp=timestamp,
        output_hash=output.hash
    )

# ---------- Public Op Functions ----------

def op_multiply(thread: str, A: Matrix, B: Matrix, resolver: Resolver) -> Tuple[Matrix, Operation]:
    """Semantic multiplication: C = A * B using cell-by-cell operations."""
    from .validate import ensure_dims
    from .cell_resolver import CellResolver
    
    # Validate dimensions
    ensure_dims(A, B, "*")
    
    # If using OpenAI resolver, switch to cell-by-cell approach
    if hasattr(resolver, 'client'):  # This is an OpenAI resolver
        cell_resolver = CellResolver(model=getattr(resolver, 'model', 'gpt-4o'))
        return _op_multiply_cell_by_cell(thread, A, B, cell_resolver)
    
    # Fallback to original approach for echo resolver
    sys, usr = _prompt_multiply(A, B)
    context = {"station": "requirements", "thread": thread, "rag_chunks": {}}
    vals = resolver.resolve(op="*", inputs=[A, B], system_prompt=sys, user_prompt=usr, context=context)
    
    C = _build_output_matrix(thread=thread, name="C", station="requirements", values=vals)
    op = _op_record(kind="*", inputs=[A, B], output=C, system_prompt=sys, user_prompt=usr)
    
    return C, op

def _op_multiply_cell_by_cell(thread: str, A: Matrix, B: Matrix, cell_resolver: 'CellResolver') -> Tuple[Matrix, Operation]:
    """Perform matrix multiplication using cell-by-cell semantic operations."""
    from .ids import matrix_id, cell_id
    
    # Result matrix dimensions
    rows, cols = A.shape[0], B.shape[1]
    
    # Get cell contents as 2D arrays for easier access
    a_cells = {}
    for cell in A.cells:
        a_cells[(cell.row, cell.col)] = cell.value
    
    b_cells = {}
    for cell in B.cells:
        b_cells[(cell.row, cell.col)] = cell.value
    
    result_cells = []
    products_log = []
    
    # For each cell in the result matrix C
    for i in range(rows):
        for j in range(cols):
            # Collect products for this cell: A[i,k] * B[k,j] for all k
            products = []
            
            for k in range(A.shape[1]):  # A.cols == B.rows
                term_a = a_cells.get((i, k), "")
                term_b = b_cells.get((k, j), "")
                
                if term_a and term_b:
                    # Semantic multiplication of individual terms
                    mult_result = cell_resolver.multiply_terms(
                        term_a=term_a,
                        term_b=term_b,
                        station="requirements",
                        row_label=f"row_{i}",
                        col_label=f"col_{j}"
                    )
                    
                    if mult_result.get("text"):
                        products.append(mult_result["text"])
                        products_log.append({
                            "cell": (i, j, k),
                            "terms": (term_a, term_b),
                            "result": mult_result["text"]
                        })
            
            # Semantic addition of all products for this cell
            if products:
                add_result = cell_resolver.add_terms(
                    products=products,
                    station="requirements", 
                    row_label=f"row_{i}",
                    col_label=f"col_{j}"
                )
                final_text = add_result.get("text", "")
            else:
                final_text = ""
            
            # Create result cell
            cid = cell_id(f"{thread}:C:v1", i, j, final_text)
            result_cells.append(Cell(
                id=cid,
                row=i,
                col=j,
                value=final_text
            ))
    
    # Build result matrix
    matrix_hash = content_hash(result_cells)
    C = Matrix(
        id=matrix_id(thread, "C", 1),
        name="C",
        station="requirements",
        shape=(rows, cols),
        cells=result_cells,
        hash=matrix_hash,
        metadata={
            "timestamp": datetime.utcnow().isoformat(),
            "cell_operations": len(products_log)
        }
    )
    
    # Create operation record
    op = _op_record(
        kind="*", 
        inputs=[A, B], 
        output=C, 
        system_prompt="Cell-by-cell semantic multiplication", 
        user_prompt=f"Computed {len(result_cells)} cells using {len(products_log)} semantic operations"
    )
    
    return C, op

def op_interpret(thread: str, B: Matrix, resolver: Resolver) -> Tuple[Matrix, Operation]:
    """Interpretation: J = interpret(B) using cell-by-cell operations."""
    from .cell_resolver import CellResolver
    
    # If using OpenAI resolver, switch to cell-by-cell approach
    if hasattr(resolver, 'client'):  # This is an OpenAI resolver
        cell_resolver = CellResolver(model=getattr(resolver, 'model', 'gpt-4o'))
        return _op_interpret_cell_by_cell(thread, B, cell_resolver)
    
    # Fallback to original approach for echo resolver
    sys, usr = _prompt_interpret(B)
    context = {"station": "objectives", "thread": thread, "rag_chunks": {}}
    vals = resolver.resolve(op="interpret", inputs=[B], system_prompt=sys, user_prompt=usr, context=context)
    
    J = _build_output_matrix(thread=thread, name="J", station="objectives", values=vals)
    op = _op_record(kind="interpret", inputs=[B], output=J, system_prompt=sys, user_prompt=usr)
    
    return J, op

def _op_interpret_cell_by_cell(thread: str, B: Matrix, cell_resolver: 'CellResolver') -> Tuple[Matrix, Operation]:
    """Perform interpretation using cell-by-cell semantic operations."""
    from .ids import matrix_id, cell_id
    
    rows, cols = B.shape
    
    # Get cell contents
    b_cells = {}
    for cell in B.cells:
        b_cells[(cell.row, cell.col)] = cell.value
    
    result_cells = []
    
    # For each cell in the input matrix B
    for i in range(rows):
        for j in range(cols):
            term_b = b_cells.get((i, j), "")
            
            if term_b:
                # Interpret this cell for stakeholder clarity
                interpret_result = cell_resolver.interpret_term(
                    summed_text=term_b,
                    station="objectives",
                    row_label=f"row_{i}",
                    col_label=f"col_{j}"
                )
                final_text = interpret_result.get("text", term_b)
            else:
                final_text = ""
            
            # Create result cell
            cid = cell_id(f"{thread}:J:v1", i, j, final_text)
            result_cells.append(Cell(
                id=cid,
                row=i,
                col=j,
                value=final_text
            ))
    
    # Build result matrix
    matrix_hash = content_hash(result_cells)
    J = Matrix(
        id=matrix_id(thread, "J", 1),
        name="J",
        station="objectives",
        shape=(rows, cols),
        cells=result_cells,
        hash=matrix_hash,
        metadata={
            "timestamp": datetime.utcnow().isoformat(),
            "cell_operations": len(result_cells)
        }
    )
    
    # Create operation record
    op = _op_record(
        kind="interpret", 
        inputs=[B], 
        output=J, 
        system_prompt="Cell-by-cell interpretation", 
        user_prompt=f"Interpreted {len(result_cells)} cells for stakeholder clarity"
    )
    
    return J, op

def op_elementwise(thread: str, J: Matrix, C: Matrix, resolver: Resolver) -> Tuple[Matrix, Operation]:
    """Element-wise multiplication: F = J ⊙ C using cell-by-cell operations."""
    from .validate import ensure_dims
    from .cell_resolver import CellResolver
    
    # Validate same dimensions
    ensure_dims(J, C, "⊙")
    
    # If using OpenAI resolver, switch to cell-by-cell approach
    if hasattr(resolver, 'client'):  # This is an OpenAI resolver
        cell_resolver = CellResolver(model=getattr(resolver, 'model', 'gpt-4o'))
        return _op_elementwise_cell_by_cell(thread, J, C, cell_resolver)
    
    # Fallback to original approach for echo resolver
    sys, usr = _prompt_elementwise(J, C)
    context = {"station": "objectives", "thread": thread, "rag_chunks": {}}
    vals = resolver.resolve(op="⊙", inputs=[J, C], system_prompt=sys, user_prompt=usr, context=context)
    
    F = _build_output_matrix(thread=thread, name="F", station="objectives", values=vals)
    op = _op_record(kind="⊙", inputs=[J, C], output=F, system_prompt=sys, user_prompt=usr)
    
    return F, op

def _op_elementwise_cell_by_cell(thread: str, J: Matrix, C: Matrix, cell_resolver: 'CellResolver') -> Tuple[Matrix, Operation]:
    """Perform element-wise multiplication using cell-by-cell semantic operations."""
    from .ids import matrix_id, cell_id
    
    rows, cols = J.shape
    
    # Get cell contents
    j_cells = {}
    for cell in J.cells:
        j_cells[(cell.row, cell.col)] = cell.value
    
    c_cells = {}
    for cell in C.cells:
        c_cells[(cell.row, cell.col)] = cell.value
    
    result_cells = []
    
    # For each cell position
    for i in range(rows):
        for j in range(cols):
            term_j = j_cells.get((i, j), "")
            term_c = c_cells.get((i, j), "")
            
            if term_j and term_c:
                # Element-wise semantic multiplication
                mult_result = cell_resolver.multiply_terms(
                    term_a=term_j,
                    term_b=term_c,
                    station="objectives",
                    row_label=f"row_{i}",
                    col_label=f"col_{j}"
                )
                final_text = mult_result.get("text", "")
            else:
                final_text = ""
            
            # Create result cell
            cid = cell_id(f"{thread}:F:v1", i, j, final_text)
            result_cells.append(Cell(
                id=cid,
                row=i,
                col=j,
                value=final_text
            ))
    
    # Build result matrix
    matrix_hash = content_hash(result_cells)
    F = Matrix(
        id=matrix_id(thread, "F", 1),
        name="F",
        station="objectives",
        shape=(rows, cols),
        cells=result_cells,
        hash=matrix_hash,
        metadata={
            "timestamp": datetime.utcnow().isoformat(),
            "cell_operations": len(result_cells)
        }
    )
    
    # Create operation record
    op = _op_record(
        kind="⊙", 
        inputs=[J, C], 
        output=F, 
        system_prompt="Cell-by-cell element-wise multiplication", 
        user_prompt=f"Computed {len(result_cells)} element-wise multiplications"
    )
    
    return F, op

def op_add(thread: str, A: Matrix, F: Matrix, resolver: Resolver) -> Tuple[Matrix, Operation]:
    """Semantic addition: D = A + F using cell-by-cell operations."""
    from .validate import ensure_dims
    from .cell_resolver import CellResolver
    
    # Validate same dimensions
    ensure_dims(A, F, "+")
    
    # If using OpenAI resolver, switch to cell-by-cell approach
    if hasattr(resolver, 'client'):  # This is an OpenAI resolver
        cell_resolver = CellResolver(model=getattr(resolver, 'model', 'gpt-4o'))
        return _op_add_cell_by_cell(thread, A, F, cell_resolver)
    
    # Fallback to original approach for echo resolver
    sys, usr = _prompt_add(A, F)
    context = {"station": "objectives", "thread": thread, "rag_chunks": {}}
    vals = resolver.resolve(op="+", inputs=[A, F], system_prompt=sys, user_prompt=usr, context=context)
    
    D = _build_output_matrix(thread=thread, name="D", station="objectives", values=vals)
    op = _op_record(kind="+", inputs=[A, F], output=D, system_prompt=sys, user_prompt=usr)
    
    return D, op

def _op_add_cell_by_cell(thread: str, A: Matrix, F: Matrix, cell_resolver: 'CellResolver') -> Tuple[Matrix, Operation]:
    """Perform semantic addition using cell-by-cell operations."""
    from .ids import matrix_id, cell_id
    
    rows, cols = A.shape
    
    # Get cell contents
    a_cells = {}
    for cell in A.cells:
        a_cells[(cell.row, cell.col)] = cell.value
    
    f_cells = {}
    for cell in F.cells:
        f_cells[(cell.row, cell.col)] = cell.value
    
    result_cells = []
    
    # For each cell position
    for i in range(rows):
        for j in range(cols):
            term_a = a_cells.get((i, j), "")
            term_f = f_cells.get((i, j), "")
            
            # For semantic addition, we pass both terms as a list to add_terms
            terms_to_add = [term for term in [term_a, term_f] if term]
            
            if terms_to_add:
                # Semantic addition
                add_result = cell_resolver.add_terms(
                    products=terms_to_add,
                    station="objectives",
                    row_label=f"row_{i}",
                    col_label=f"col_{j}"
                )
                final_text = add_result.get("text", "")
            else:
                final_text = ""
            
            # Create result cell
            cid = cell_id(f"{thread}:D:v1", i, j, final_text)
            result_cells.append(Cell(
                id=cid,
                row=i,
                col=j,
                value=final_text
            ))
    
    # Build result matrix
    matrix_hash = content_hash(result_cells)
    D = Matrix(
        id=matrix_id(thread, "D", 1),
        name="D",
        station="objectives",
        shape=(rows, cols),
        cells=result_cells,
        hash=matrix_hash,
        metadata={
            "timestamp": datetime.utcnow().isoformat(),
            "cell_operations": len(result_cells)
        }
    )
    
    # Create operation record
    op = _op_record(
        kind="+", 
        inputs=[A, F], 
        output=D, 
        system_prompt="Cell-by-cell semantic addition", 
        user_prompt=f"Computed {len(result_cells)} semantic additions"
    )
    
    return D, op

def op_cross(thread: str, A: Matrix, B: Matrix, resolver: Resolver) -> Tuple[Matrix, Operation]:
    """Cross-product: W = A × B."""
    sys, usr = _prompt_cross(A, B)
    context = {"station": "assessment", "thread": thread, "rag_chunks": {}}
    vals = resolver.resolve(op="×", inputs=[A, B], system_prompt=sys, user_prompt=usr, context=context)
    
    # Cross product creates expanded matrix  
    W = _build_output_matrix(thread=thread, name="W", station="assessment", values=vals)
    op = _op_record(kind="×", inputs=[A, B], output=W, system_prompt=sys, user_prompt=usr)
    
    return W, op

# ---------- Legacy Compatibility (for stations.py) ----------

def semantic_multiply(resolver: Resolver, matrix_a: Matrix, matrix_b: Matrix, 
                     context: Optional[Dict[str, Any]] = None) -> Matrix:
    """Legacy compatibility wrapper for op_multiply."""
    from .ids import thread_id
    # Use existing thread_id if present, otherwise generate one
    thread = context.get("thread_id") if context and "thread_id" in context else thread_id("default")
    result, _ = op_multiply(thread, matrix_a, matrix_b, resolver)
    return result