"""Tests for deterministic ID generation."""

import pytest
from chirality.core.ids import thread_id, matrix_id, cell_id, operation_id


def test_thread_id_deterministic():
    """Test that thread_id is deterministic."""
    assert thread_id("demo") == thread_id("demo")
    assert thread_id("test") == thread_id("test")
    assert thread_id("demo") != thread_id("test")


def test_matrix_id_deterministic():
    """Test that matrix_id is deterministic."""
    thread = "cf14:demo"
    assert matrix_id(thread, "A", 1) == matrix_id(thread, "A", 1)
    assert matrix_id(thread, "A", 1) != matrix_id(thread, "B", 1)
    assert matrix_id(thread, "A", 1) != matrix_id(thread, "A", 2)


def test_cell_id_deterministic():
    """Test that cell_id is deterministic."""
    matrix_id_val = "cf14:demo:A:v1"
    assert cell_id(matrix_id_val, 0, 0, "test") == cell_id(matrix_id_val, 0, 0, "test")
    assert cell_id(matrix_id_val, 0, 0, "test") != cell_id(matrix_id_val, 0, 1, "test")
    assert cell_id(matrix_id_val, 0, 0, "test") != cell_id(matrix_id_val, 0, 0, "different")


def test_operation_id_deterministic():
    """Test that operation_id is deterministic."""
    inputs = ["A", "B"]
    output_hash = "abc123"
    prompt_hash = "def456"
    
    op_id1 = operation_id("*", inputs, output_hash, prompt_hash)
    op_id2 = operation_id("*", inputs, output_hash, prompt_hash)
    assert op_id1 == op_id2
    
    # Different operation
    op_id3 = operation_id("+", inputs, output_hash, prompt_hash)
    assert op_id1 != op_id3


def test_id_prefixes():
    """Test that IDs have correct prefixes."""
    assert thread_id("demo").startswith("cf14:")
    assert matrix_id("cf14:demo", "A", 1).startswith("cf14:demo:A:")
    assert cell_id("cf14:demo:A:v1", 0, 0, "test").startswith("cf14:demo:A:v1:")
    assert operation_id("*", ["A", "B"], "hash1", "hash2").startswith("op:")