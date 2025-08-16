"""
Core types for Chirality Framework CF14 protocol.

Defines the fundamental data structures: Cell, Matrix, Tensor, Station, Operation.
"""

from typing import Any, Dict, List, Optional, Literal
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum


class Modality(str, Enum):
    """CF14 modalities for semantic content."""
    AXIOM = "axiom"
    THEORY = "theory"
    CONCEPT = "concept"
    PROCESS = "process"
    INSTANCE = "instance"
    VALUE = "value"
    UNKNOWN = "unknown"


class MatrixType(str, Enum):
    """Matrix types in CF14 protocol."""
    A = "A"  # Axioms
    B = "B"  # Basis
    C = "C"  # Composition (A * B)
    D = "D"  # Domain
    F = "F"  # Function
    J = "J"  # Judgment


class StationType(str, Enum):
    """Station types for processing stages."""
    S1 = "S1"  # Problem formulation
    S2 = "S2"  # Requirements analysis
    S3 = "S3"  # Objective synthesis


@dataclass
class Cell:
    """
    Fundamental semantic unit in CF14.
    
    Attributes:
        id: Deterministic cell ID
        row: Row position in matrix
        col: Column position in matrix
        content: Semantic content dictionary
        modality: Content modality type
        provenance: Tracking metadata
    """
    id: str
    row: int
    col: int
    content: Dict[str, Any]
    modality: Modality = Modality.UNKNOWN
    provenance: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert cell to dictionary for serialization."""
        return {
            "id": self.id,
            "row": self.row,
            "col": self.col,
            "content": self.content,
            "modality": self.modality.value,
            "provenance": self.provenance
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "Cell":
        """Create cell from dictionary."""
        return cls(
            id=data["id"],
            row=data["row"],
            col=data["col"],
            content=data["content"],
            modality=Modality(data.get("modality", "unknown")),
            provenance=data.get("provenance", {})
        )


@dataclass
class Matrix:
    """
    2D semantic matrix containing cells.
    
    Attributes:
        id: Deterministic matrix ID
        type: Matrix type (A, B, C, D, F, J)
        cells: List of cells in matrix
        dimensions: (rows, cols) tuple
        metadata: Additional matrix metadata
    """
    id: str
    type: MatrixType
    cells: List[Cell]
    dimensions: tuple[int, int]
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def get_cell(self, row: int, col: int) -> Optional[Cell]:
        """Get cell at specific position."""
        for cell in self.cells:
            if cell.row == row and cell.col == col:
                return cell
        return None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert matrix to dictionary for serialization."""
        return {
            "id": self.id,
            "type": self.type.value,
            "cells": [cell.to_dict() for cell in self.cells],
            "dimensions": list(self.dimensions),
            "metadata": self.metadata
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "Matrix":
        """Create matrix from dictionary."""
        return cls(
            id=data["id"],
            type=MatrixType(data["type"]),
            cells=[Cell.from_dict(c) for c in data["cells"]],
            dimensions=tuple(data["dimensions"]),
            metadata=data.get("metadata", {})
        )


@dataclass
class Tensor:
    """
    3D semantic tensor (stack of matrices).
    
    Attributes:
        id: Deterministic tensor ID
        matrices: List of matrices in tensor
        depth: Number of matrices
    """
    id: str
    matrices: List[Matrix]
    depth: int
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert tensor to dictionary."""
        return {
            "id": self.id,
            "matrices": [m.to_dict() for m in self.matrices],
            "depth": self.depth
        }


@dataclass
class Operation:
    """
    Semantic operation record.
    
    Attributes:
        id: Operation ID
        type: Operation type (multiply, add, interpret, etc.)
        inputs: Input matrix/cell IDs
        outputs: Output matrix/cell IDs
        timestamp: When operation occurred
        metadata: Additional operation data
    """
    id: str
    type: str
    inputs: List[str]
    outputs: List[str]
    timestamp: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert operation to dictionary."""
        return {
            "id": self.id,
            "type": self.type,
            "inputs": self.inputs,
            "outputs": self.outputs,
            "timestamp": self.timestamp,
            "metadata": self.metadata
        }


@dataclass
class Station:
    """
    Processing station in CF14 pipeline.
    
    Attributes:
        type: Station type (S1, S2, S3)
        inputs: Required input matrix types
        outputs: Produced output matrix types
        operations: List of operations to perform
    """
    type: StationType
    inputs: List[MatrixType]
    outputs: List[MatrixType]
    operations: List[str]
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert station to dictionary."""
        return {
            "type": self.type.value,
            "inputs": [i.value for i in self.inputs],
            "outputs": [o.value for o in self.outputs],
            "operations": self.operations
        }