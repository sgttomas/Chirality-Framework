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
        value: Canonical string value
        modality: Content modality type
        provenance: Tracking metadata
    """
    id: str
    row: int
    col: int
    value: str
    modality: Modality = Modality.UNKNOWN
    provenance: Dict[str, Any] = field(default_factory=dict)
    
    @property
    def content(self) -> Dict[str, Any]:
        """Legacy property for compatibility."""
        return {"text": self.value}
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert cell to dictionary for serialization."""
        return {
            "id": self.id,
            "row": self.row,
            "col": self.col,
            "value": self.value,
            "modality": self.modality.value,
            "provenance": self.provenance,
            # Legacy compatibility
            "content": {"text": self.value}
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "Cell":
        """Create cell from dictionary."""
        # Handle both new and legacy formats
        if "value" in data:
            value = data["value"]
        elif "content" in data:
            content = data["content"]
            if isinstance(content, dict):
                value = content.get("text", str(content))
            else:
                value = str(content)
        else:
            value = ""
        
        return cls(
            id=data["id"],
            row=data["row"],
            col=data["col"],
            value=value,
            modality=Modality(data.get("modality", "unknown")),
            provenance=data.get("provenance", {})
        )


@dataclass
class Matrix:
    """
    2D semantic matrix containing cells.
    
    Attributes:
        id: Deterministic matrix ID
        name: Matrix name (A, B, C, D, F, J)
        station: Station where matrix was created
        shape: (rows, cols) tuple
        cells: List of cells in matrix
        hash: Content hash for integrity
        metadata: Additional matrix metadata
    """
    id: str
    name: str
    station: str
    shape: tuple[int, int]
    cells: List[Cell]
    hash: str
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    @property
    def type(self) -> MatrixType:
        """Get matrix type from name for compatibility."""
        return MatrixType(self.name)
    
    @property
    def dimensions(self) -> tuple[int, int]:
        """Legacy property for compatibility."""
        return self.shape
    
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
            "name": self.name,
            "station": self.station,
            "shape": list(self.shape),
            "cells": [cell.to_dict() for cell in self.cells],
            "hash": self.hash,
            "metadata": self.metadata,
            # Legacy compatibility
            "type": self.name,
            "dimensions": list(self.shape)
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "Matrix":
        """Create matrix from dictionary."""
        # Handle both new and legacy formats
        shape = tuple(data.get("shape") or data.get("dimensions", [0, 0]))
        name = data.get("name") or data.get("type", "X")
        station = data.get("station", "unknown")
        hash_val = data.get("hash", "unknown")
        
        return cls(
            id=data["id"],
            name=name,
            station=station,
            shape=shape,
            cells=[Cell.from_dict(c) for c in data["cells"]],
            hash=hash_val,
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
        id: Deterministic operation ID
        kind: Operation kind (*, +, ×, interpret, ⊙)
        inputs: Input matrix IDs
        output: Output matrix ID
        model: Model information used
        prompt_hash: Hash of prompts used
        timestamp: When operation occurred
        output_hash: Hash of output for integrity
    """
    id: str
    kind: Literal["*", "+", "×", "interpret", "⊙"]
    inputs: List[str]
    output: str
    model: Dict[str, Any]
    prompt_hash: str
    timestamp: str
    output_hash: str
    
    @property
    def type(self) -> str:
        """Legacy property for compatibility."""
        return self.kind
    
    @property
    def outputs(self) -> List[str]:
        """Legacy property for compatibility."""
        return [self.output]
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert operation to dictionary."""
        return {
            "id": self.id,
            "kind": self.kind,
            "inputs": self.inputs,
            "output": self.output,
            "model": self.model,
            "prompt_hash": self.prompt_hash,
            "timestamp": self.timestamp,
            "output_hash": self.output_hash,
            # Legacy compatibility
            "type": self.kind,
            "outputs": [self.output]
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