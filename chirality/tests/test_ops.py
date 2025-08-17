"""Tests for CF14 operations."""

import pytest
from chirality.core.types import Matrix, Cell
from chirality.core.ops import op_multiply, op_elementwise, op_interpret, EchoResolver
from chirality.core.validate import CF14ValidationError


def create_test_matrix(name: str, shape: tuple, fill_value: str = "test"):
    """Create a test matrix with given dimensions."""
    cells = []
    for r in range(shape[0]):
        for c in range(shape[1]):
            cells.append(Cell(
                id=f"{name}:{r}:{c}",
                row=r,
                col=c,
                value=f"{fill_value}_{r}_{c}"
            ))
    
    return Matrix(
        id=name,
        name=name,
        station="test",
        shape=shape,
        cells=cells,
        hash="test_hash",
        metadata={}
    )


def test_op_multiply_valid_dimensions():
    """Test matrix multiplication with valid dimensions."""
    A = create_test_matrix("A", (2, 3))
    B = create_test_matrix("B", (3, 2))
    resolver = EchoResolver()
    
    C, op = op_multiply("test_thread", A, B, resolver)
    
    assert C.shape == (2, 2)
    assert op.kind == "*"
    assert len(op.inputs) == 2


def test_op_multiply_invalid_dimensions():
    """Test matrix multiplication with invalid dimensions."""
    A = create_test_matrix("A", (2, 3))
    B = create_test_matrix("B", (2, 2))  # Invalid: A.cols != B.rows
    resolver = EchoResolver()
    
    with pytest.raises(CF14ValidationError):
        op_multiply("test_thread", A, B, resolver)


def test_op_elementwise_same_dimensions():
    """Test element-wise operation with same dimensions."""
    J = create_test_matrix("J", (2, 2))
    C = create_test_matrix("C", (2, 2))
    resolver = EchoResolver()
    
    F, op = op_elementwise("test_thread", J, C, resolver)
    
    assert F.shape == (2, 2)
    assert op.kind == "⊙"


def test_op_elementwise_different_dimensions():
    """Test element-wise operation with different dimensions."""
    J = create_test_matrix("J", (2, 2))
    C = create_test_matrix("C", (3, 3))
    resolver = EchoResolver()
    
    with pytest.raises(CF14ValidationError):
        op_elementwise("test_thread", J, C, resolver)


def test_op_interpret():
    """Test interpretation operation."""
    B = create_test_matrix("B", (2, 2))
    resolver = EchoResolver()
    
    J, op = op_interpret("test_thread", B, resolver)
    
    assert J.shape == B.shape
    assert op.kind == "interpret"


def test_echo_resolver_output_format():
    """Test that EchoResolver returns correct format."""
    A = create_test_matrix("A", (2, 2))
    B = create_test_matrix("B", (2, 2))
    resolver = EchoResolver()
    
    result = resolver.resolve("*", [A, B], "system", "user", {})
    
    assert isinstance(result, list)
    assert len(result) == 2  # rows
    assert len(result[0]) == 2  # cols
    assert all(isinstance(cell, str) for row in result for cell in row)