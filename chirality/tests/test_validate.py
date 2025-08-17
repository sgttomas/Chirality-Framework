"""Tests for CF14 validation."""

import pytest
from chirality.core.types import Matrix, Cell
from chirality.core.validate import ensure_dims, CF14ValidationError


def create_matrix(name: str, shape: tuple):
    """Create a minimal test matrix."""
    return Matrix(
        id=name,
        name=name,
        station="test",
        shape=shape,
        cells=[],
        hash="test",
        metadata={}
    )


def test_ensure_dims_multiply_valid():
    """Test valid dimensions for multiplication."""
    A = create_matrix("A", (3, 4))
    B = create_matrix("B", (4, 5))
    
    # Should not raise
    ensure_dims(A, B, "*")


def test_ensure_dims_multiply_invalid():
    """Test invalid dimensions for multiplication."""
    A = create_matrix("A", (3, 4))
    B = create_matrix("B", (3, 5))  # A.cols != B.rows
    
    with pytest.raises(CF14ValidationError):
        ensure_dims(A, B, "*")


def test_ensure_dims_elementwise_valid():
    """Test valid dimensions for element-wise operation."""
    A = create_matrix("A", (2, 3))
    B = create_matrix("B", (2, 3))
    
    # Should not raise
    ensure_dims(A, B, "⊙")


def test_ensure_dims_elementwise_invalid():
    """Test invalid dimensions for element-wise operation."""
    A = create_matrix("A", (2, 3))
    B = create_matrix("B", (3, 2))
    
    with pytest.raises(CF14ValidationError):
        ensure_dims(A, B, "⊙")


def test_ensure_dims_addition_valid():
    """Test valid dimensions for addition."""
    A = create_matrix("A", (2, 2))
    F = create_matrix("F", (2, 2))
    
    # Should not raise
    ensure_dims(A, F, "+")


def test_ensure_dims_addition_invalid():
    """Test invalid dimensions for addition."""
    A = create_matrix("A", (2, 2))
    F = create_matrix("F", (3, 3))
    
    with pytest.raises(CF14ValidationError):
        ensure_dims(A, F, "+")


def test_cf14_validation_error():
    """Test CF14ValidationError is raised properly."""
    with pytest.raises(CF14ValidationError) as exc_info:
        raise CF14ValidationError("Test error message")
    
    assert "Test error message" in str(exc_info.value)