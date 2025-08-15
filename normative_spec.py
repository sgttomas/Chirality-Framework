# normative_spec.py
import re
import unicodedata
from pathlib import Path
from typing import List, Union

class SpecError(Exception):
    pass

# Match any quoted token using straight or smart quotes:
ITEM_RE = re.compile(r"['\"\u2018\u2019\u201C\u201D](.*?)['\"\u2018\u2019\u201C\u201D]:?")

def _norm(s: str) -> str:
    return unicodedata.normalize("NFKC", s).strip()

def _extract_list(block: str) -> List[str]:
    # Try direct comma-split approach which handles mixed quote situations
    items = []
    for item in block.split(','):
        # Remove any quotes and normalize
        clean_item = re.sub(r'["\'\u2018\u2019\u201C\u201D]', '', item.strip())
        if clean_item:
            items.append(_norm(clean_item))
    
    # If we got good results, return them
    if items:
        return items
    
    # Fallback: try quoted extraction
    quoted_items = [_norm(x) for x in ITEM_RE.findall(block)]
    if quoted_items:
        return quoted_items
    
    return []

def _extract_matrix(name: str, text: str) -> dict:
    # Scope from "## Matrix <name>" up to the next "## Matrix" or EOF
    sec = re.search(rf"##\s*Matrix\s*{name}(.+?)(?=##\s*Matrix|\Z)", text, re.S | re.I)
    if not sec:
        raise SpecError(f"Matrix {name} section not found")
    block = sec.group(1)

    rows_m = re.search(r"(Row\s*names?|Rows)\s*:\s*\[(.+?)\]", block, re.S | re.I)
    cols_m = re.search(r"(Column\s*names?|Columns)\s*:\s*\[(.+?)\]", block, re.S | re.I)
    elems_m = re.search(r"Elements:\s*(.+)", block, re.S | re.I)
    
    # Debug output (disabled)
    # print(f"Debug {name}: rows_m={bool(rows_m)}, cols_m={bool(cols_m)}, elems_m={bool(elems_m)}")
    
    if not (rows_m and cols_m and elems_m):
        missing = []
        if not rows_m: missing.append("rows")
        if not cols_m: missing.append("columns") 
        if not elems_m: missing.append("elements")
        raise SpecError(f"Matrix {name} missing: {missing}")

    row_labels = _extract_list(rows_m.group(2))
    col_labels = _extract_list(cols_m.group(2))
    
    # Debug removed

    # Parse elements as lines that look like [ ... ]
    cells: List[List[str]] = []
    for ln in elems_m.group(1).splitlines():
        s = ln.strip()
        if not (s.startswith("[") and s.endswith("]")):
            continue
        items = _extract_list(s)
        if items:
            cells.append(items)

    # Validate width/height against labels
    widths = {len(r) for r in cells}
    if len(widths) != 1 or (widths and next(iter(widths)) != len(col_labels)):
        raise SpecError(
            f"Matrix {name}: element width {widths} != number of column labels {len(col_labels)}"
        )
    if len(cells) != len(row_labels):
        raise SpecError(
            f"Matrix {name}: rows parsed {len(cells)} != row labels {len(row_labels)}"
        )

    return {"rows": row_labels, "cols": col_labels, "cells": cells}

def expect_shape(matrix: dict, rows: int, cols: int, name: str) -> None:
    actual_rows = len(matrix["cells"])
    actual_cols = {len(r) for r in matrix["cells"]}
    if actual_rows != rows or actual_cols != {cols}:
        raise SpecError(f"{name} expected {rows}x{cols}, got {actual_rows}x{next(iter(actual_cols)) if actual_cols else 0}")

def parse_normative_spec(path: Union[str, Path]) -> dict:
    txt = Path(path).read_text(encoding="utf-8")

    A = _extract_matrix("A", txt)
    B = _extract_matrix("B", txt)

    # Canonical Phase-1 shapes (adjust if your spec changes)
    expect_shape(A, 3, 4, "A")
    expect_shape(B, 4, 4, "B")

    # J = truncated B (first 3 rows)
    J = {"rows": B["rows"][:3], "cols": B["cols"], "cells": B["cells"][:3]}
    return {"A": A, "B": B, "J": J}