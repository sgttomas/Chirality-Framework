"""
Serialization utilities for CF14 structures.

Handles JSON I/O for matrices, cells, and operations.
"""

import json
from typing import Dict, Any, List, Optional, Union
from pathlib import Path

from .types import Cell, Matrix, MatrixType, Modality


def matrix_to_json(matrix: Matrix, indent: Optional[int] = 2) -> str:
    """
    Serialize matrix to JSON string.
    
    Args:
        matrix: Matrix to serialize
        indent: JSON indentation level
    
    Returns:
        JSON string
    """
    return json.dumps(matrix.to_dict(), indent=indent, ensure_ascii=False)


def matrix_from_json(json_str: str) -> Matrix:
    """
    Deserialize matrix from JSON string.
    
    Args:
        json_str: JSON string
    
    Returns:
        Matrix instance
    """
    data = json.loads(json_str)
    return Matrix.from_dict(data)


def save_matrix(matrix: Matrix, filepath: Union[str, Path]) -> None:
    """
    Save matrix to JSON file.
    
    Args:
        matrix: Matrix to save
        filepath: Output file path
    """
    filepath = Path(filepath)
    filepath.parent.mkdir(parents=True, exist_ok=True)
    
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(matrix_to_json(matrix))


def load_matrix(filepath: Union[str, Path]) -> Matrix:
    """
    Load matrix from JSON file.
    
    Args:
        filepath: Input file path
    
    Returns:
        Matrix instance
    """
    filepath = Path(filepath)
    
    with open(filepath, "r", encoding="utf-8") as f:
        return matrix_from_json(f.read())


def cells_to_table(cells: List[Cell], max_rows: Optional[int] = None, max_cols: Optional[int] = None) -> List[List[str]]:
    """
    Convert cells to 2D table for display.
    
    Args:
        cells: List of cells
        max_rows: Maximum rows to include
        max_cols: Maximum columns to include
    
    Returns:
        2D list of cell texts
    """
    if not cells:
        return []
    
    # Find dimensions
    max_r = max(c.row for c in cells) + 1
    max_c = max(c.col for c in cells) + 1
    
    if max_rows:
        max_r = min(max_r, max_rows)
    if max_cols:
        max_c = min(max_c, max_cols)
    
    # Create table
    table = [["" for _ in range(max_c)] for _ in range(max_r)]
    
    for cell in cells:
        if cell.row < max_r and cell.col < max_c:
            text = cell.content.get("text", "")
            # Truncate long text
            if len(text) > 50:
                text = text[:47] + "..."
            table[cell.row][cell.col] = text
    
    return table


def format_matrix_summary(matrix: Matrix) -> str:
    """
    Format matrix summary for display.
    
    Args:
        matrix: Matrix to summarize
    
    Returns:
        Formatted summary string
    """
    lines = [
        f"Matrix {matrix.type.value} ({matrix.id})",
        f"Dimensions: {matrix.dimensions[0]}×{matrix.dimensions[1]}",
        f"Cells: {len(matrix.cells)}"
    ]
    
    if matrix.metadata:
        lines.append(f"Metadata: {list(matrix.metadata.keys())}")
    
    # Sample cells
    if matrix.cells:
        lines.append("\nSample cells:")
        table = cells_to_table(matrix.cells[:9], max_rows=3, max_cols=3)
        for row in table:
            lines.append("  " + " | ".join(f"{c[:20]:20}" for c in row))
    
    return "\n".join(lines)


def export_pipeline_results(results: Dict[str, Matrix], output_dir: Union[str, Path]) -> Dict[str, str]:
    """
    Export pipeline results to directory.
    
    Args:
        results: Dictionary of matrices
        output_dir: Output directory
    
    Returns:
        Dictionary of output file paths
    """
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    
    paths = {}
    
    for name, matrix in results.items():
        filepath = output_dir / f"matrix_{name}.json"
        save_matrix(matrix, filepath)
        paths[name] = str(filepath)
    
    # Write summary
    summary_path = output_dir / "summary.txt"
    with open(summary_path, "w", encoding="utf-8") as f:
        f.write("CF14 Pipeline Results\n")
        f.write("=" * 50 + "\n\n")
        
        for name, matrix in results.items():
            f.write(f"\n{name}:\n")
            f.write("-" * 20 + "\n")
            f.write(format_matrix_summary(matrix))
            f.write("\n\n")
    
    paths["summary"] = str(summary_path)
    
    return paths


def normalize_text(text: str) -> str:
    """
    Normalize text for consistent processing.
    
    Args:
        text: Text to normalize
    
    Returns:
        Normalized text
    """
    import unicodedata
    import re
    
    if not text:
        return ""
    
    # Normalize unicode
    text = unicodedata.normalize("NFKC", str(text))
    
    # Collapse whitespace
    text = re.sub(r"\s+", " ", text).strip()
    
    return text


def create_empty_matrix(matrix_type: MatrixType, dimensions: tuple[int, int], thread_id: str = "default") -> Matrix:
    """
    Create an empty matrix with specified dimensions.
    
    Args:
        matrix_type: Type of matrix
        dimensions: (rows, cols) tuple
        thread_id: Thread ID for matrix ID generation
    
    Returns:
        Empty matrix
    """
    from .ids import generate_matrix_id, generate_cell_id
    
    matrix_id = generate_matrix_id(matrix_type.value, thread_id, 0)
    cells = []
    
    for row in range(dimensions[0]):
        for col in range(dimensions[1]):
            cell_content = {"text": "", "empty": True}
            cell_id = generate_cell_id(matrix_id, row, col, cell_content)
            
            cells.append(Cell(
                id=cell_id,
                row=row,
                col=col,
                content=cell_content,
                modality=Modality.UNKNOWN
            ))
    
    return Matrix(
        id=matrix_id,
        type=matrix_type,
        cells=cells,
        dimensions=dimensions,
        metadata={"created": "empty"}
    )