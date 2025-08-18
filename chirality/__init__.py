"""
Chirality Semantic Framework - Clean implementation of CF14 protocol.

A minimal, deterministic implementation focused on core semantic operations.
"""

__version__ = "14.3.1"
__author__ = "Chirality Framework Team"

from .core.types import Cell, Matrix, Tensor, Station, Operation
from .core.ids import generate_cell_id, generate_matrix_id, generate_thread_id
from .core.validate import validate_matrix, validate_cell
from .core.ops import (
    Resolver, OpenAIResolver, EchoResolver,
    op_multiply, op_add, op_interpret, op_elementwise, op_cross
)
from .core.stations import S1Runner, S2Runner, S3Runner
from .core.serialize import load_matrix, save_matrix

__all__ = [
    # Types
    "Cell",
    "Matrix", 
    "Tensor",
    "Station",
    "Operation",
    # ID Generation
    "generate_cell_id",
    "generate_matrix_id",
    "generate_thread_id",
    # Validation
    "validate_matrix",
    "validate_cell",
    # Serialization
    "load_matrix",
    "save_matrix",
    # Operations
    "Resolver",
    "OpenAIResolver",
    "EchoResolver",
    "op_multiply",
    "op_add", 
    "op_interpret",
    "op_elementwise",
    "op_cross",
    # Stations
    "S1Runner",
    "S2Runner",
    "S3Runner",
]