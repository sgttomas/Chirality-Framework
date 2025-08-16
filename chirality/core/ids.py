"""
Deterministic ID generation for Chirality Framework.

All IDs are content-based and deterministic to ensure reproducibility.
Removes timestamps for true determinism.
"""

import hashlib
import json
from typing import Any, Dict, List


def thread_id(seed: str) -> str:
    """
    Generate deterministic thread ID from seed.
    
    Args:
        seed: Deterministic seed string
    
    Returns:
        Deterministic thread ID
    """
    return "cf14:" + hashlib.sha256(seed.encode()).hexdigest()[:12]


def matrix_id(thread: str, name: str, version: int = 1) -> str:
    """
    Generate deterministic matrix ID.
    
    Args:
        thread: Thread identifier
        name: Matrix name (A, B, C, D, F, J)
        version: Version number (default: 1)
    
    Returns:
        Deterministic matrix ID
    """
    return f"{thread}:{name}:v{version}"


def cell_id(matrix: str, row: int, col: int, value: str) -> str:
    """
    Generate deterministic cell ID based on position and value.
    
    Args:
        matrix: Parent matrix ID
        row: Row position
        col: Column position
        value: Canonical cell value
    
    Returns:
        Deterministic cell ID
    """
    hash_value = hashlib.sha256(f"{row}|{col}|{value}".encode()).hexdigest()[:12]
    return f"{matrix}:{row}:{col}:{hash_value}"


def operation_id(kind: str, inputs: List[str], output_hash: str, prompt_hash: str) -> str:
    """
    Generate deterministic operation ID.
    
    Args:
        kind: Operation type (*, +, ×, interpret, ⊙)
        inputs: List of input matrix IDs
        output_hash: Hash of output matrix
        prompt_hash: Hash of prompts used
    
    Returns:
        Deterministic operation ID
    """
    basis = f"{kind}|{','.join(sorted(inputs))}|{output_hash}|{prompt_hash}"
    return "op:" + hashlib.sha256(basis.encode()).hexdigest()[:16]


def content_hash(data: Any) -> str:
    """
    Generate hash for any content (for matrix/cell hashing).
    
    Args:
        data: Content to hash
    
    Returns:
        SHA256 hash
    """
    if isinstance(data, list):
        # For cells list, sort by position for determinism
        sorted_data = sorted(data, key=lambda x: (getattr(x, 'row', 0), getattr(x, 'col', 0)))
        content = json.dumps([getattr(x, 'value', str(x)) for x in sorted_data], sort_keys=True)
    else:
        content = json.dumps(data, sort_keys=True) if isinstance(data, (dict, list)) else str(data)
    
    return hashlib.sha256(content.encode()).hexdigest()[:16]


# Legacy compatibility functions (deprecated)
def generate_thread_id(user_id: str, session_id: str, timestamp=None) -> str:
    """Legacy wrapper - use thread_id() instead."""
    return thread_id(f"{user_id}:{session_id}")


def generate_matrix_id(matrix_type: str, thread_id: str, sequence: int) -> str:
    """Legacy wrapper - use matrix_id() instead."""
    return matrix_id(thread_id, matrix_type, sequence)


def generate_cell_id(matrix_id: str, row: int, col: int, content: Dict[str, Any]) -> str:
    """Legacy wrapper - use cell_id() instead."""
    from .provenance import canonical_value
    value = canonical_value(content.get('text', content.get('value', '')))
    return cell_id(matrix_id, row, col, value)


def generate_operation_id(operation_type: str, input_ids: list, timestamp=None) -> str:
    """Legacy wrapper - use operation_id() instead."""
    return operation_id(operation_type, input_ids, "legacy", "legacy")