"""
Semantic operations and resolver interfaces for CF14.

Provides the core semantic operations (multiply, add, interpret) via
a Resolver interface with OpenAI and Echo implementations.
"""

import os
import json
import time
import hashlib
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional, List, Tuple
from datetime import datetime

from .types import Cell, Matrix, MatrixType
from .ids import generate_cell_id, generate_operation_id


class Resolver(ABC):
    """Abstract interface for semantic resolution operations."""
    
    @abstractmethod
    def resolve(self, 
                operation: str,
                inputs: Dict[str, Any],
                context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Resolve a semantic operation.
        
        Args:
            operation: Type of operation (multiply, add, interpret)
            inputs: Operation inputs (terms, cells, etc.)
            context: Optional context (valley, station, etc.)
        
        Returns:
            Resolution result with text, terms_used, warnings
        """
        pass


class OpenAIResolver(Resolver):
    """OpenAI-based semantic resolver using GPT-4."""
    
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
            "multiply": 0.7,
            "add": 0.5,
            "interpret": 0.5
        }
    
    def resolve(self,
                operation: str,
                inputs: Dict[str, Any],
                context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Resolve semantic operation using OpenAI."""
        
        # Import prompts
        from chirality_prompts import (
            SYSTEM_PROMPT,
            prompt_multiply,
            prompt_add,
            prompt_interpret,
            generate_valley_summary
        )
        
        context = context or {}
        valley_summary = generate_valley_summary(
            context.get("valley"),
            context.get("station")
        )
        
        # Build user prompt based on operation
        if operation == "multiply":
            user_prompt = prompt_multiply(
                valley_summary,
                context.get("station", {}).get("name", "Station"),
                inputs.get("row_label", "Row"),
                inputs.get("col_label", "Column"),
                inputs.get("term_a", ""),
                inputs.get("term_b", "")
            )
        elif operation == "add":
            user_prompt = prompt_add(
                valley_summary,
                context.get("station", {}).get("name", "Station"),
                inputs.get("row_label", "Row"),
                inputs.get("col_label", "Column"),
                inputs.get("existing", ""),
                inputs.get("incoming", "")
            )
        elif operation == "interpret":
            user_prompt = prompt_interpret(
                valley_summary,
                context.get("station", {}).get("name", "Station"),
                inputs.get("row_label", "Row"),
                inputs.get("col_label", "Column"),
                inputs.get("text", "")
            )
        else:
            raise ValueError(f"Unknown operation: {operation}")
        
        # Call OpenAI with structured output
        temperature = self.temperatures.get(operation, 0.6)
        max_retries = 3
        
        for attempt in range(max_retries):
            try:
                response = self.client.chat.completions.create(
                    model=self.model,
                    messages=[
                        {"role": "system", "content": SYSTEM_PROMPT},
                        {"role": "user", "content": user_prompt}
                    ],
                    temperature=temperature,
                    max_tokens=200,
                    response_format={"type": "json_object"}
                )
                
                result = json.loads(response.choices[0].message.content)
                
                # Validate required fields
                if "text" not in result:
                    result["text"] = ""
                if "terms_used" not in result:
                    result["terms_used"] = []
                if "warnings" not in result:
                    result["warnings"] = []
                
                # Add metadata
                result["model"] = self.model
                result["temperature"] = temperature
                result["operation"] = operation
                result["timestamp"] = datetime.utcnow().isoformat()
                
                return result
                
            except Exception as e:
                if attempt < max_retries - 1:
                    time.sleep(2 ** attempt)  # Exponential backoff
                    continue
                raise RuntimeError(f"OpenAI resolution failed: {e}")


class EchoResolver(Resolver):
    """Simple echo resolver for testing without OpenAI."""
    
    def resolve(self,
                operation: str,
                inputs: Dict[str, Any],
                context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Echo resolver that returns deterministic test responses."""
        
        if operation == "multiply":
            text = f"[{inputs.get('term_a', 'A')} × {inputs.get('term_b', 'B')}]"
            terms_used = [inputs.get("term_a", ""), inputs.get("term_b", "")]
        elif operation == "add":
            text = f"[{inputs.get('existing', 'E')} + {inputs.get('incoming', 'I')}]"
            terms_used = [inputs.get("existing", ""), inputs.get("incoming", "")]
        elif operation == "interpret":
            text = f"[Interpreted: {inputs.get('text', 'T')[:50]}]"
            terms_used = [inputs.get("text", "")]
        else:
            text = f"[Unknown operation: {operation}]"
            terms_used = []
        
        return {
            "text": text,
            "terms_used": [t for t in terms_used if t],
            "warnings": [],
            "operation": operation,
            "timestamp": datetime.utcnow().isoformat(),
            "resolver": "echo"
        }


def semantic_multiply(resolver: Resolver,
                     matrix_a: Matrix,
                     matrix_b: Matrix,
                     context: Optional[Dict[str, Any]] = None) -> Matrix:
    """
    Perform semantic multiplication: C = A × B.
    
    Args:
        resolver: Resolver instance for operations
        matrix_a: First input matrix
        matrix_b: Second input matrix
        context: Optional context (valley, station)
    
    Returns:
        Result matrix C
    """
    from .ids import generate_matrix_id
    
    # Validate dimensions match
    if matrix_a.dimensions[1] != matrix_b.dimensions[0]:
        raise ValueError(f"Matrix dimensions incompatible: {matrix_a.dimensions} × {matrix_b.dimensions}")
    
    rows_a, cols_a = matrix_a.dimensions
    rows_b, cols_b = matrix_b.dimensions
    
    # Create result matrix
    thread_id = context.get("thread_id", "default") if context else "default"
    result_id = generate_matrix_id("C", thread_id, 0)
    result_cells = []
    
    # Perform multiplication
    for i in range(rows_a):
        for j in range(cols_b):
            # Get row from A and column from B
            row_cells = [c for c in matrix_a.cells if c.row == i]
            col_cells = [c for c in matrix_b.cells if c.col == j]
            
            # Multiply and accumulate
            accumulated = ""
            terms_used = []
            
            for a_cell in row_cells:
                for b_cell in col_cells:
                    if a_cell.col == b_cell.row:  # Matching dimension
                        # Resolve multiplication
                        result = resolver.resolve(
                            "multiply",
                            {
                                "term_a": a_cell.content.get("text", ""),
                                "term_b": b_cell.content.get("text", ""),
                                "row_label": f"Row_{i}",
                                "col_label": f"Col_{j}"
                            },
                            context
                        )
                        
                        # Accumulate results
                        if accumulated and result["text"]:
                            # Add to existing
                            add_result = resolver.resolve(
                                "add",
                                {
                                    "existing": accumulated,
                                    "incoming": result["text"],
                                    "row_label": f"Row_{i}",
                                    "col_label": f"Col_{j}"
                                },
                                context
                            )
                            accumulated = add_result["text"]
                            terms_used.extend(add_result.get("terms_used", []))
                        else:
                            accumulated = result["text"]
                            terms_used.extend(result.get("terms_used", []))
            
            # Create result cell
            cell_content = {
                "text": accumulated,
                "terms_used": list(set(terms_used)),
                "provenance": {
                    "operation": "multiply",
                    "sources": [matrix_a.id, matrix_b.id]
                }
            }
            
            cell_id = generate_cell_id(result_id, i, j, cell_content)
            result_cells.append(Cell(
                id=cell_id,
                row=i,
                col=j,
                content=cell_content
            ))
    
    return Matrix(
        id=result_id,
        type=MatrixType.C,
        cells=result_cells,
        dimensions=(rows_a, cols_b),
        metadata={
            "operation": "multiply",
            "inputs": [matrix_a.id, matrix_b.id],
            "timestamp": datetime.utcnow().isoformat()
        }
    )