"""
Deterministic ID generation for Chirality Framework.

All IDs are content-based and deterministic to ensure reproducibility.
"""

import hashlib
import json
from typing import Any, Dict, Optional
from datetime import datetime


def generate_thread_id(user_id: str, session_id: str, timestamp: Optional[str] = None) -> str:
    """
    Generate deterministic thread ID.
    
    Args:
        user_id: User identifier
        session_id: Session identifier
        timestamp: Optional timestamp (defaults to current time)
    
    Returns:
        Deterministic thread ID
    """
    if timestamp is None:
        timestamp = datetime.utcnow().isoformat()
    
    content = f"{user_id}:{session_id}:{timestamp}"
    hash_digest = hashlib.sha256(content.encode()).hexdigest()[:12]
    return f"thread_{hash_digest}"


def generate_matrix_id(matrix_type: str, thread_id: str, sequence: int) -> str:
    """
    Generate deterministic matrix ID.
    
    Args:
        matrix_type: Type of matrix (A, B, C, D, F, J)
        thread_id: Thread identifier
        sequence: Sequence number in thread
    
    Returns:
        Deterministic matrix ID
    """
    content = f"{matrix_type}:{thread_id}:{sequence}"
    hash_digest = hashlib.sha256(content.encode()).hexdigest()[:12]
    return f"matrix_{matrix_type}_{hash_digest}"


def generate_cell_id(matrix_id: str, row: int, col: int, content: Dict[str, Any]) -> str:
    """
    Generate deterministic cell ID based on position and content.
    
    Args:
        matrix_id: Parent matrix ID
        row: Row position
        col: Column position
        content: Cell content dictionary
    
    Returns:
        Deterministic cell ID
    """
    # Sort content for deterministic hashing
    sorted_content = json.dumps(content, sort_keys=True)
    combined = f"{matrix_id}:{row}:{col}:{sorted_content}"
    hash_digest = hashlib.sha256(combined.encode()).hexdigest()[:12]
    return f"cell_{hash_digest}"


def generate_operation_id(operation_type: str, input_ids: list, timestamp: Optional[str] = None) -> str:
    """
    Generate deterministic operation ID.
    
    Args:
        operation_type: Type of operation
        input_ids: List of input matrix/cell IDs
        timestamp: Optional timestamp
    
    Returns:
        Deterministic operation ID
    """
    if timestamp is None:
        timestamp = datetime.utcnow().isoformat()
    
    inputs = ":".join(sorted(input_ids))
    content = f"{operation_type}:{inputs}:{timestamp}"
    hash_digest = hashlib.sha256(content.encode()).hexdigest()[:12]
    return f"op_{hash_digest}"


def generate_provenance_hash(provenance_data: Dict[str, Any]) -> str:
    """
    Generate hash for provenance tracking.
    
    Args:
        provenance_data: Dictionary of provenance information
    
    Returns:
        SHA256 hash of provenance data
    """
    sorted_data = json.dumps(provenance_data, sort_keys=True)
    return hashlib.sha256(sorted_data.encode()).hexdigest()