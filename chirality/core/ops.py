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
            rows, cols = A.dimensions[0], B.dimensions[1]
            def val(r, c): return f"*:{A.type.value}[{r},:]{B.type.value}[:,{c}]"
        elif op == "+":  # Addition
            A, F = inputs
            rows, cols = A.dimensions
            def val(r, c): return f"+:{A.type.value}[{r},{c}]⊕{F.type.value}[{r},{c}]"
        elif op == "interpret":  # Interpretation
            (B,) = inputs
            rows, cols = B.dimensions
            def val(r, c): return f"interp:{B.type.value}[{r},{c}]"
        elif op == "⊙":  # Element-wise multiplication
            J, C = inputs
            rows, cols = J.dimensions
            def val(r, c): return f"⊙:{J.type.value}[{r},{c}]×{C.type.value}[{r},{c}]"
        elif op == "×":  # Cross-product
            A, B = inputs
            rows = A.dimensions[0] * B.dimensions[0]
            cols = A.dimensions[1] * B.dimensions[1]
            def val(r, c): 
                ar, ac = r // B.dimensions[0], c // B.dimensions[1]
                br, bc = r % B.dimensions[0], c % B.dimensions[1]
                return f"×:{A.type.value}[{ar},{ac}]⨂{B.type.value}[{br},{bc}]"
        else:
            raise ValueError(f"Unknown op: {op}")
        
        return [[val(r, c) for c in range(cols)] for r in range(rows)]


class OpenAIResolver:
    """OpenAI-based semantic resolver."""
    
    def __init__(self, api_key: Optional[str] = None, model: str = "gpt-4o"):
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
        self.temperatures = {
            "*": 0.7, "+": 0.5, "interpret": 0.5, "⊙": 0.7, "×": 0.7
        }
    
    def resolve(self, op: Literal["*", "+", "×", "interpret", "⊙"], 
                inputs: List[Matrix], system_prompt: str, user_prompt: str, 
                context: Dict[str, Any]) -> List[List[str]]:
        """Return 2D array from structured JSON response."""
        
        temperature = self.temperatures.get(op, 0.6)
        max_retries = 3
        
        for attempt in range(max_retries):
            try:
                response = self.client.chat.completions.create(
                    model=self.model,
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt}
                    ],
                    response_format={"type": "json_object"},
                    temperature=temperature,
                    max_tokens=500
                )
                
                result = json.loads(response.choices[0].message.content)
                
                # Extract 2D array from structured response
                if "cells" in result and "shape" in result:
                    rows, cols = result["shape"]
                    return [[canonical_value(result["cells"][r][c]) for c in range(cols)] for r in range(rows)]
                elif "text" in result:
                    # Fallback: use text as single cell
                    return [[canonical_value(result["text"])]]
                else:
                    raise ValueError("Invalid response format")
                
            except Exception as e:
                if attempt < max_retries - 1:
                    time.sleep(2 ** attempt)
                    continue
                raise RuntimeError(f"OpenAI resolution failed: {e}")


# ---------- Prompt Helpers (Private) ----------

def _prompt_multiply(A: Matrix, B: Matrix) -> Tuple[str, str]:
    """Generate prompts for matrix multiplication."""
    system = "CF14 semantic multiplication (*) means intersection of semantics with identity preservation. Output a JSON object with 'shape' [rows, cols] and 'cells' as 2D array of strings."
    user = json.dumps({
        "task": "C = A * B", 
        "A": {"type": A.type.value, "shape": list(A.dimensions)}, 
        "B": {"type": B.type.value, "shape": list(B.dimensions)}
    }, sort_keys=True)
    return system, user

def _prompt_add(A: Matrix, F: Matrix) -> Tuple[str, str]:
    """Generate prompts for matrix addition."""
    system = "CF14 semantic addition (+) means precise combination preserving source identities cell-wise. Return JSON with 'shape' and 'cells' 2D array, same shape as inputs."
    user = json.dumps({
        "task": "D = A + F", 
        "A": {"type": A.type.value, "shape": list(A.dimensions)}, 
        "F": {"type": F.type.value, "shape": list(F.dimensions)}
    }, sort_keys=True)
    return system, user

def _prompt_interpret(B: Matrix) -> Tuple[str, str]:
    """Generate prompts for interpretation."""
    system = "Interpret/Truncate matrix into objectives. Preserve dimensions and indices; rewrite values for human understanding."
    user = json.dumps({
        "task": "J = interpret(B)", 
        "B": {"type": B.type.value, "shape": list(B.dimensions)}
    }, sort_keys=True)
    return system, user

def _prompt_elementwise(J: Matrix, C: Matrix) -> Tuple[str, str]:
    """Generate prompts for element-wise multiplication."""
    system = "CF14 element-wise multiplication (⊙) combines corresponding cells. Return JSON with same shape as inputs."
    user = json.dumps({
        "task": "F = J ⊙ C", 
        "J": {"type": J.type.value, "shape": list(J.dimensions)}, 
        "C": {"type": C.type.value, "shape": list(C.dimensions)}
    }, sort_keys=True)
    return system, user

def _prompt_cross(A: Matrix, B: Matrix) -> Tuple[str, str]:
    """Generate prompts for cross-product."""
    target_shape = [A.dimensions[0] * B.dimensions[0], A.dimensions[1] * B.dimensions[1]]
    system = "CF14 cross-product (×) expands relational possibilities. Return JSON with target shape."
    user = json.dumps({
        "task": "W = A × B", 
        "A": {"type": A.type.value, "shape": list(A.dimensions)}, 
        "B": {"type": B.type.value, "shape": list(B.dimensions)},
        "target_shape": target_shape
    }, sort_keys=True)
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
    """Semantic multiplication: C = A * B."""
    from .validate import ensure_dims
    
    # Validate dimensions
    ensure_dims(A, B, "*")
    
    sys, usr = _prompt_multiply(A, B)
    context = {"station": "requirements", "thread": thread, "rag_chunks": {}}
    vals = resolver.resolve(op="*", inputs=[A, B], system_prompt=sys, user_prompt=usr, context=context)
    
    C = _build_output_matrix(thread=thread, name="C", station="requirements", values=vals)
    op = _op_record(kind="*", inputs=[A, B], output=C, system_prompt=sys, user_prompt=usr)
    
    return C, op

def op_interpret(thread: str, B: Matrix, resolver: Resolver) -> Tuple[Matrix, Operation]:
    """Interpretation: J = interpret(B)."""
    sys, usr = _prompt_interpret(B)
    context = {"station": "objectives", "thread": thread, "rag_chunks": {}}
    vals = resolver.resolve(op="interpret", inputs=[B], system_prompt=sys, user_prompt=usr, context=context)
    
    J = _build_output_matrix(thread=thread, name="J", station="objectives", values=vals)
    op = _op_record(kind="interpret", inputs=[B], output=J, system_prompt=sys, user_prompt=usr)
    
    return J, op

def op_elementwise(thread: str, J: Matrix, C: Matrix, resolver: Resolver) -> Tuple[Matrix, Operation]:
    """Element-wise multiplication: F = J ⊙ C."""
    from .validate import ensure_dims
    
    # Validate same dimensions
    ensure_dims(J, C, "⊙")
    
    sys, usr = _prompt_elementwise(J, C)
    context = {"station": "objectives", "thread": thread, "rag_chunks": {}}
    vals = resolver.resolve(op="⊙", inputs=[J, C], system_prompt=sys, user_prompt=usr, context=context)
    
    F = _build_output_matrix(thread=thread, name="F", station="objectives", values=vals)
    op = _op_record(kind="⊙", inputs=[J, C], output=F, system_prompt=sys, user_prompt=usr)
    
    return F, op

def op_add(thread: str, A: Matrix, F: Matrix, resolver: Resolver) -> Tuple[Matrix, Operation]:
    """Semantic addition: D = A + F."""
    from .validate import ensure_dims
    
    # Validate same dimensions
    ensure_dims(A, F, "+")
    
    sys, usr = _prompt_add(A, F)
    context = {"station": "objectives", "thread": thread, "rag_chunks": {}}
    vals = resolver.resolve(op="+", inputs=[A, F], system_prompt=sys, user_prompt=usr, context=context)
    
    D = _build_output_matrix(thread=thread, name="D", station="objectives", values=vals)
    op = _op_record(kind="+", inputs=[A, F], output=D, system_prompt=sys, user_prompt=usr)
    
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
    thread = thread_id(context.get("thread_id", "default")) if context else thread_id("default")
    result, _ = op_multiply(thread, matrix_a, matrix_b, resolver)
    return result