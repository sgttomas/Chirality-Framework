"""
Validation rules for CF14 semantic structures.

Enforces dimensional constraints, modality alignment, and operation sequencing.
"""

from typing import List, Dict, Any, Optional
from .types import Cell, Matrix, MatrixType, Modality


class CF14ValidationError(ValueError):
    """Raised when CF14 validation rules are violated."""
    pass


def ensure_dims(A: Matrix, B: Matrix, op: str) -> None:
    """
    Ensure matrix dimensions are compatible for operation.
    
    Args:
        A: First matrix
        B: Second matrix 
        op: Operation type
    
    Raises:
        CF14ValidationError: If dimensions incompatible
    """
    if op == "*":
        if A.shape[1] != B.shape[0]:
            raise CF14ValidationError(
                f"Matrix multiplication requires A.cols == B.rows, got {A.shape} × {B.shape}"
            )
    elif op in ["+", "⊙"]:
        if A.shape != B.shape:
            raise CF14ValidationError(
                f"Operation {op} requires same dimensions, got {A.shape} vs {B.shape}"
            )


def ensure_same_rows_cols(A: Matrix, B: Matrix, op: str) -> None:
    """
    Ensure matrices have same dimensions.
    
    Args:
        A: First matrix
        B: Second matrix
        op: Operation type
    
    Raises:
        CF14ValidationError: If dimensions don't match
    """
    if A.shape != B.shape:
        raise CF14ValidationError(
            f"Operation {op} requires identical dimensions, got {A.shape} vs {B.shape}"
        )


def validate_cell(cell: Cell) -> List[str]:
    """
    Validate a cell structure.
    
    Args:
        cell: Cell to validate
    
    Returns:
        List of validation errors (empty if valid)
    """
    errors = []
    
    # Check required fields
    if not cell.id:
        errors.append("Cell missing ID")
    
    if cell.row < 0:
        errors.append(f"Invalid row position: {cell.row}")
    
    if cell.col < 0:
        errors.append(f"Invalid column position: {cell.col}")
    
    if not cell.content:
        errors.append("Cell missing content")
    elif not isinstance(cell.content, dict):
        errors.append("Cell content must be dictionary")
    elif "text" not in cell.content:
        errors.append("Cell content missing 'text' field")
    
    # Validate modality
    if cell.modality not in Modality:
        errors.append(f"Invalid modality: {cell.modality}")
    
    return errors


def validate_matrix(matrix: Matrix) -> List[str]:
    """
    Validate a matrix structure.
    
    Args:
        matrix: Matrix to validate
    
    Returns:
        List of validation errors (empty if valid)
    """
    errors = []
    
    # Check required fields
    if not matrix.id:
        errors.append("Matrix missing ID")
    
    if matrix.type not in MatrixType:
        errors.append(f"Invalid matrix type: {matrix.type}")
    
    # Validate dimensions
    rows, cols = matrix.dimensions
    if rows <= 0 or cols <= 0:
        errors.append(f"Invalid dimensions: {matrix.dimensions}")
    
    # Validate cells
    if not matrix.cells:
        errors.append("Matrix has no cells")
    
    cell_positions = set()
    for cell in matrix.cells:
        # Validate individual cell
        cell_errors = validate_cell(cell)
        errors.extend([f"Cell {cell.id}: {e}" for e in cell_errors])
        
        # Check bounds
        if cell.row >= rows or cell.col >= cols:
            errors.append(f"Cell {cell.id} out of bounds: ({cell.row}, {cell.col})")
        
        # Check duplicates
        pos = (cell.row, cell.col)
        if pos in cell_positions:
            errors.append(f"Duplicate cell at position {pos}")
        cell_positions.add(pos)
    
    return errors


def validate_operation_sequence(operations: List[str]) -> List[str]:
    """
    Validate CF14 operation sequence rules.
    
    Rules:
    - Multiply before add
    - Interpret after base operations
    
    Args:
        operations: List of operation types
    
    Returns:
        List of validation errors
    """
    errors = []
    
    # Check for multiply before add rule
    last_multiply_idx = -1
    first_add_idx = len(operations)
    
    for i, op in enumerate(operations):
        if op == "multiply":
            last_multiply_idx = i
        elif op == "add" and first_add_idx == len(operations):
            first_add_idx = i
    
    if first_add_idx < last_multiply_idx:
        errors.append("Addition operation before multiplication (violates CF14 sequence)")
    
    return errors


def validate_modality_alignment(matrix_a: Matrix, matrix_b: Matrix) -> List[str]:
    """
    Validate modality alignment between matrices.
    
    Args:
        matrix_a: First matrix
        matrix_b: Second matrix
    
    Returns:
        List of validation errors
    """
    errors = []
    
    # Get modality distributions
    modalities_a = {cell.modality for cell in matrix_a.cells}
    modalities_b = {cell.modality for cell in matrix_b.cells}
    
    # Check compatibility based on CF14 rules
    if Modality.AXIOM in modalities_a and Modality.INSTANCE in modalities_b:
        errors.append("Cannot multiply axioms with instances directly")
    
    if Modality.VALUE in modalities_a and Modality.THEORY in modalities_b:
        errors.append("Cannot multiply values with theories directly")
    
    return errors


def validate_matrix_dimensions(matrix_a: Matrix, matrix_b: Matrix, operation: str) -> List[str]:
    """
    Validate matrix dimensions for operations.
    
    Args:
        matrix_a: First matrix
        matrix_b: Second matrix
        operation: Operation type (multiply, add)
    
    Returns:
        List of validation errors
    """
    errors = []
    
    if operation == "multiply":
        # For multiplication: A.cols must equal B.rows
        if matrix_a.dimensions[1] != matrix_b.dimensions[0]:
            errors.append(
                f"Incompatible dimensions for multiplication: "
                f"{matrix_a.dimensions} × {matrix_b.dimensions}"
            )
    
    elif operation == "add":
        # For addition: dimensions must match exactly
        if matrix_a.dimensions != matrix_b.dimensions:
            errors.append(
                f"Incompatible dimensions for addition: "
                f"{matrix_a.dimensions} vs {matrix_b.dimensions}"
            )
    
    return errors


def validate_provenance(cell: Cell) -> List[str]:
    """
    Validate provenance tracking for a cell.
    
    Args:
        cell: Cell to validate
    
    Returns:
        List of validation errors
    """
    errors = []
    
    if not cell.provenance:
        errors.append("Cell missing provenance")
        return errors
    
    # Check required provenance fields
    if "operation" not in cell.provenance:
        errors.append("Provenance missing operation type")
    
    if "sources" not in cell.provenance:
        errors.append("Provenance missing sources")
    elif not isinstance(cell.provenance["sources"], list):
        errors.append("Provenance sources must be a list")
    
    if "timestamp" not in cell.provenance:
        errors.append("Provenance missing timestamp")
    
    return errors