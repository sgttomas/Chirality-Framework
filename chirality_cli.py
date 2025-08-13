#!/usr/bin/env python3
import argparse, csv, json, requests, logging, os
from typing import List, Optional, Dict, Any
from functools import reduce
from urllib.parse import urljoin
from enum import Enum
from chirality_components import ChiralityDocument, make_matrix, make_array, Cell
from semmul import ensure_api_key

# Default API configuration
DEFAULT_API_BASE = os.getenv("CHIRALITY_API_BASE", "http://localhost:3000")

# Canonical matrix sizes
MATRIX_ROWS = 3       # Rows for A and C
MATRIX_COLS = 4       # Cols for A and C
B_ROWS = 4            # Rows for B (must equal A's columns)
B_COLS = 4            # Cols for B (becomes C's columns)

# Canonical matrices from the Chirality Framework
MATRIX_A = [
    ['Direction', 'Implementation', 'Evaluation', 'Assessment'],
    ['Leadership', 'Execution', 'Decision-making', 'Quality Control'],
    ['Standards', 'Performance', 'Feedback', 'Refinement']
]

MATRIX_B = [
    ['Essential Facts', 'Adequate Inputs', 'Comprehensive Records', 'Reliable Records'],
    ['Critical Context', 'Sufficient Detail', 'Holistic View', 'Congruent Patterns'],
    ['Fundamental Understanding', 'Adequate Insight', 'Full Comprehension', 'Coherent Framework'],
    ['Vital Judgment', 'Sound Reasoning', 'Thorough Prudence', 'Harmonious Principles']
]

# Canonical row/column labels
C_ROWS = ['Normative', 'Operative', 'Evaluative']
C_COLS = ['Necessity (vs Contingency)', 'Sufficiency', 'Completeness', 'Consistency']
A_ROWS = ['Normative', 'Operative', 'Evaluative']
A_COLS = ['Guiding', 'Applying', 'Judging', 'Reviewing']


# Sanity checks to ensure framework compatibility at import time
assert len(MATRIX_A) == MATRIX_ROWS and all(len(r) == MATRIX_COLS for r in MATRIX_A), (
    f"MATRIX_A must be {MATRIX_ROWS}x{MATRIX_COLS}"
)
assert len(MATRIX_B) == B_ROWS and all(len(r) == B_COLS for r in MATRIX_B), (
    f"MATRIX_B must be {B_ROWS}x{B_COLS}"
)
assert MATRIX_COLS == B_ROWS, "A columns must equal B rows"

# Operation enum for semantic operations
class Operation(str, Enum):
    MULTIPLY = "*"
    ADD = "+"

def setup_logging(verbose: bool = False, quiet: bool = False) -> None:
    """Configure logging based on verbosity flags"""
    if quiet:
        level = logging.WARNING
    elif verbose:
        level = logging.DEBUG
    else:
        level = logging.INFO
    
    logging.basicConfig(
        level=level,
        format='%(levelname)s: %(message)s',
        datefmt='%H:%M:%S'
    )

def read_csv_simple(path: str) -> List[List[str]]:
    with open(path, newline='', encoding='utf-8-sig') as f:
        return [row for row in csv.reader(f)]

def write_json(doc: ChiralityDocument, out_path: str):
    out = doc.to_json(pretty=True)
    with open(out_path, 'w', encoding='utf-8') as f:
        f.write(out)
    return out_path

def validate_rectangular_matrix(matrix: List[List[str]], name: str) -> None:
    """Validate that matrix is rectangular (all rows same length)"""
    if not matrix:
        raise ValueError(f"Matrix {name} must be non-empty.")
    expected_cols = len(matrix[0])
    for i, row in enumerate(matrix):
        if len(row) != expected_cols:
            raise ValueError(f"Matrix {name} row {i} has {len(row)} columns, expected {expected_cols}.")

def _safe_resolved(cell_rows: List[List[Any]], i: int, j: int, fallback_label: str) -> str:
    """Safely extract resolved value from matrix cell with fallback"""
    try:
        cell = cell_rows[i][j]
        if isinstance(cell, dict):
            return cell.get('resolved', fallback_label)
        return getattr(cell, 'resolved', fallback_label)
    except (IndexError, AttributeError, TypeError):
        return fallback_label

def create_semantic_matrix_c(matrix_a_elements: List[List[str]], matrix_b_elements: List[List[str]]) -> List[List[Cell]]:
    """
    Implements proper A * B = C from Chirality Framework using semantic multiplication
    Matrix A: 3x4, Matrix B: 4x4, Result C: 3x4
    Uses correct matrix multiplication: C(i,j) = sum over k of A(i,k) * B(k,j)
    """
    ensure_api_key()
    from semmul import semantic_multiply
    
    # Validate matrix dimensions
    validate_rectangular_matrix(matrix_a_elements, "A")
    validate_rectangular_matrix(matrix_b_elements, "B")
    
    rows_a = len(matrix_a_elements)
    shared = len(matrix_a_elements[0])  # A's column count
    if len(matrix_b_elements) != shared:
        raise ValueError(f"Matrix A has {shared} columns but Matrix B has {len(matrix_b_elements)} rows. Cannot multiply.")
    cols_b = len(matrix_b_elements[0])
    
    logging.info(f"Performing semantic multiplication A({rows_a}×{shared}) * B({shared}×{cols_b}) = C({rows_a}×{cols_b})")
    
    cells_2d = []
    for i in range(rows_a):
        cell_row = []
        for j in range(cols_b):
            # Compute proper matrix multiplication: sum over k of A(i,k) * B(k,j)
            partials = []
            raw_terms = []
            for k in range(shared):
                a_term = matrix_a_elements[i][k]
                b_term = matrix_b_elements[k][j]
                partial = semantic_multiply(a_term, b_term)
                partials.append(partial)
                raw_terms.extend([a_term, b_term])
                logging.debug(f"  A({i+1},{k+1})*B({k+1},{j+1}): {a_term} * {b_term} = {partial}")
            
            # Combine partials left-associatively using semantic multiplication
            resolved_term = reduce(lambda acc, t: semantic_multiply(acc, t), partials)
            logging.debug(f"  C({i+1},{j+1}) = {resolved_term}")
            
            cell = Cell(
                resolved=resolved_term,
                raw_terms=raw_terms,
                intermediate=partials,
                operation=Operation.MULTIPLY.value,
                notes=f"C({i+1},{j+1}) from semantic multiplication over k"
            )
            cell_row.append(cell)
        cells_2d.append(cell_row)
    
    return cells_2d

def create_semantic_matrix_f(matrix_j_elements: List[List[str]], matrix_c_cells: List[List[Cell]]) -> List[List[Cell]]:
    """
    Implements J(i,j) * C(i,j) = F(i,j) - element-wise semantic multiplication
    Matrix J: 3x4 (truncated Matrix B), Matrix C: 3x4 (Requirements), Result F: 3x4
    """
    ensure_api_key()
    from semmul import semantic_multiply
    
    rows = len(matrix_j_elements)  # Should be 3
    cols = len(matrix_j_elements[0]) if matrix_j_elements else 0  # Should be 4
    
    logging.info(f"Performing element-wise semantic multiplication J*C=F for {rows}×{cols} matrix...")
    
    cells_2d = []
    for i in range(rows):
        cell_row = []
        for j in range(cols):
            if i < len(matrix_j_elements) and j < len(matrix_j_elements[i]) and i < len(matrix_c_cells) and j < len(matrix_c_cells[i]):
                j_term = matrix_j_elements[i][j]  # Element from Matrix J
                c_term = matrix_c_cells[i][j].resolved  # Resolved element from Matrix C
                
                logging.debug(f"  Computing F({i+1},{j+1}): {j_term} * {c_term}")
                resolved_term = semantic_multiply(j_term, c_term)
                logging.debug(f"    Result: {resolved_term}")
                
                cell = Cell(
                    resolved=resolved_term,
                    raw_terms=[j_term, c_term],
                    intermediate=[],  # No alternates per user request
                    operation=Operation.MULTIPLY.value,
                    notes=f"Matrix F element from J*C element-wise semantic multiplication"
                )
                cell_row.append(cell)
        cells_2d.append(cell_row)
    
    return cells_2d

def validate_neo4j_matrix_data(matrix_data: Dict[str, Any]) -> None:
    """Validate Neo4j matrix data structure"""
    if not isinstance(matrix_data, dict):
        raise ValueError("Matrix data must be a dictionary")
    
    required_fields = ['id', 'name', 'data']
    for field in required_fields:
        if field not in matrix_data:
            raise ValueError(f"Matrix data missing required field: {field}")
    
    data = matrix_data.get('data')
    if not isinstance(data, list):
        raise ValueError("Matrix 'data' field must be a list")
    
    if data and not all(isinstance(row, list) for row in data):
        raise ValueError("Matrix data must be a list of lists (rectangular)")

def query_neo4j_matrix(component_id: Optional[str] = None, station: Optional[str] = None, 
                      api_base: str = DEFAULT_API_BASE, timeout: int = 30) -> Optional[Dict[str, Any]]:
    """Query Neo4j for matrix data by ID or station"""
    api_url = f"{api_base}/api/neo4j/query"
    
    try:
        if component_id:
            payload = {"query_type": "get_matrix_by_id", "component_id": component_id}
        elif station:
            payload = {"query_type": "get_latest_matrix_by_station", "station": station}
        else:
            raise ValueError("Must provide either component_id or station")
        
        logging.debug(f"Querying Neo4j at {api_url} with payload: {payload}")
        
        response = requests.post(
            api_url,
            json=payload,
            headers={'Content-Type': 'application/json'},
            timeout=timeout
        )
        
        if response.status_code == 200:
            result = response.json()
            if result.get('success'):
                component = result.get('component')
                if component:
                    validate_neo4j_matrix_data(component)
                    logging.info(f"✓ Successfully retrieved matrix: {component['name']}")
                    return component
                else:
                    logging.error("No component data in successful response")
                    return None
            else:
                error_msg = result.get('error', 'Unknown error')
                logging.error(f"Neo4j query failed: {error_msg}")
                return None
        else:
            logging.error(f"HTTP error {response.status_code}: {response.text}")
            return None
            
    except requests.exceptions.RequestException as e:
        logging.error(f"Network error querying Neo4j: {e}")
        return None
    except Exception as e:
        logging.error(f"Error querying Neo4j: {e}")
        return None

def send_to_neo4j(doc: ChiralityDocument, api_base: str = DEFAULT_API_BASE, timeout: int = 30) -> bool:
    """Send ChiralityDocument to Neo4j via Next.js API"""
    api_url = urljoin(api_base.rstrip('/') + '/', "api/neo4j/ingest-ufo")
    
    try:
        # Convert to dict for JSON serialization
        doc_dict = json.loads(doc.to_json(pretty=False))
        
        logging.debug(f"Sending document to Neo4j at {api_url}")
        
        response = requests.post(
            api_url,
            json=doc_dict,
            headers={'Content-Type': 'application/json'},
            timeout=timeout
        )
        
        if response.status_code == 200:
            result = response.json()
            document_id = result.get('documentId')
            logging.info(f"✓ Successfully sent to Neo4j. Document ID: {document_id}")
            return True
        else:
            logging.error(f"✗ Neo4j ingest failed: {response.status_code} - {response.text}")
            return False
            
    except requests.exceptions.RequestException as e:
        logging.error(f"✗ Network error sending to Neo4j: {e}")
        return False
    except Exception as e:
        logging.error(f"✗ Error sending to Neo4j: {e}")
        return False

def matrix_from_grid(args):
    grid = read_csv_simple(args.grid)
    if not grid:
        raise SystemExit("Empty CSV.")
    # Expect top-left empty, row1 col headers, col1 row labels
    header = grid[0]
    if len(header) < 2:
        raise SystemExit("Matrix grid CSV must have at least 2 columns (first empty, then column labels).")
    cols = header[1:]
    rows = []
    cells_2d = []
    for r in grid[1:]:
        if len(r) < 2:
            raise SystemExit("Each data row must have a row label in col1 and at least one value.")
        rows.append(r[0])
        # pad/truncate to match cols
        row_vals = (r[1:] + [""] * len(cols))[:len(cols)]
        # Convert string values to Cell objects
        cell_row = [Cell(resolved=val, raw_terms=[val], intermediate=[val]) for val in row_vals]
        cells_2d.append(cell_row)
    
    doc = ChiralityDocument(version="1.0", meta={"source": "chirality_cli", "mode": "matrix-grid"})
    ontology = {
        "rows_name": args.rows_name,
        "cols_name": args.cols_name,
        "notes": args.notes
    }
    comp = make_matrix(
        id=f"matrix_{args.title}",
        name=args.title,
        station=args.station,
        row_labels=rows,
        col_labels=cols,
        cells_2d=cells_2d,
        ontology=ontology
    )
    doc.components.append(comp)
    json_path = write_json(doc, args.out)
    
    # Also send to Neo4j
    send_to_neo4j(doc, api_base=getattr(args, 'api_base', DEFAULT_API_BASE))
    
    return json_path

def matrix_from_lists(args) -> str:
    """Build a matrix from rows.csv, cols.csv, and data.csv, standardizing to Cell-based representation."""
    rows_csv = _trim_cells(read_csv_simple(args.rows))
    cols_csv = _trim_cells(read_csv_simple(args.cols))
    data = _trim_cells(read_csv_simple(args.data))

    if not cols_csv or not cols_csv[0]:
        raise SystemExit("Empty or invalid cols.csv (need one header row).")
    rows = [r[0] for r in rows_csv if r]
    cols = cols_csv[0]

    # Basic shape checks
    if len(data) != len(rows):
        raise SystemExit(f"Data rows ({len(data)}) != number of rows ({len(rows)}).")
    for i, row in enumerate(data):
        if len(row) != len(cols):
            raise SystemExit(f"Row {i} length ({len(row)}) != number of cols ({len(cols)}).")

    # Convert data (2D list of strings) to Cell objects
    cells_2d = [
        [Cell(resolved=(val or "").strip(), raw_terms=[(val or "").strip()], intermediate=[(val or "").strip()]) for val in row]
        for row in data
    ]

    doc = ChiralityDocument(version="1.0", meta={"source": "chirality_cli", "mode": "matrix-lists"})
    ontology = {"rows_name": args.rows_name, "cols_name": args.cols_name, "notes": args.notes}
    comp = make_matrix(
        id=f"matrix_{args.title}",
        name=args.title,
        station=args.station,
        row_labels=rows,
        col_labels=cols,
        cells_2d=cells_2d,
        ontology=ontology,
    )
    doc.components.append(comp)

    return _write_and_send(doc, args.out, getattr(args, 'api_base', DEFAULT_API_BASE))

def array_from_list(args):
    items = [r[0] for r in read_csv_simple(args.list)]
    doc = ChiralityDocument(version="1.0", meta={"source": "chirality_cli", "mode": "array-list"})
    ontology = {"axis0_name": args.axis_name, "notes": args.notes}
    comp = make_array(title=args.title, items=items, axis_name=args.axis_name, station=args.station, ontology=ontology)
    doc.components.append(comp)
    json_path = write_json(doc, args.out)
    
    # Also send to Neo4j
    send_to_neo4j(doc, api_base=getattr(args, 'api_base', DEFAULT_API_BASE))
    
    return json_path

def generate_matrix_c_semantic(args):
    """Generate Matrix C using semantic multiplication A * B = C from Chirality Framework"""
    
    logging.info("Generating Matrix C from semantic multiplication A * B = C...")
    logging.info("Matrix A (Problem Statement):")
    for i, row in enumerate(MATRIX_A):
        logging.info(f"  {C_ROWS[i]}: {row}")
    logging.info("Matrix B (Decisions):")
    b_rows = ['Data', 'Information', 'Knowledge', 'Wisdom']
    for i, row in enumerate(MATRIX_B):
        logging.info(f"  {b_rows[i]}: {row}")

    # Generate semantic Matrix C
    cells_2d = create_semantic_matrix_c(MATRIX_A, MATRIX_B)

    # Create Chirality document
    doc = ChiralityDocument(version="1.0", meta={"source": "chirality_cli", "mode": "semantic-matrix-c"})
    ontology = {
        "operation": "A * B = C",
        "matrix_a": "Problem Statement (3x4)",
        "matrix_b": "Decisions (4x4)", 
        "result": "Requirements (3x4)",
        "framework": "Chirality Framework semantic multiplication"
    }

    comp = make_matrix(
        id="matrix_C_semantic",
        name="Matrix C (Requirements)",
        station="Requirements",
        row_labels=C_ROWS,
        col_labels=C_COLS,
        cells_2d=cells_2d,
        ontology=ontology
    )

    doc.components.append(comp)
    json_path = write_json(doc, args.out)

    # Also send to Neo4j
    send_to_neo4j(doc, api_base=getattr(args, 'api_base', DEFAULT_API_BASE))

    return json_path

def generate_matrix_f_from_neo4j(args):
    """Generate Matrix F using J(i,j) * C(i,j) = F(i,j) by reading Matrix C from Neo4j"""
    
    # Step 1: Query Matrix C from Neo4j
    logging.info("Step 1: Querying Matrix C from Neo4j (Requirements station)...")
    matrix_c_data = query_neo4j_matrix(station="Requirements", api_base=args.api_base)
    
    if not matrix_c_data:
        raise SystemExit("Matrix C not found in Neo4j. Generate it first using 'semantic-matrix-c'.")
    
    logging.info(f"✓ Found Matrix C: {matrix_c_data['name']} (ID: {matrix_c_data['id']})")
    logging.info(f"  Shape: {matrix_c_data.get('shape', 'unknown')}")
    logging.info(f"  Station: {matrix_c_data.get('station', 'unknown')}")
    
    # Extract Matrix C structure and ensure correct dimensions
    c_data = matrix_c_data['data']
    
    # Use correct Matrix C structure (3x4) regardless of what Neo4j returns
    logging.debug(f"  Rows: {C_ROWS}")
    logging.debug(f"  Cols: {C_COLS}")
    logging.info(f"  Ensuring {MATRIX_ROWS}x{MATRIX_COLS} matrix structure...")
    
    # Step 2: Define Matrix J (truncated Matrix B)
    logging.info("Step 2: Defining Matrix J (truncated Decisions - Data, Information, Knowledge)...")
    matrix_j = MATRIX_B[:3]
    j_rows = ['Data', 'Information', 'Knowledge']

    logging.info("Matrix J:")
    for i, row_label in enumerate(j_rows):
        logging.debug(f"  {row_label}: {matrix_j[i]}")
    
    # Step 3: Generate Matrix F via element-wise multiplication J(i,j) * C(i,j) = F(i,j)
    logging.info(f"Step 3: Generating Matrix F via J(i,j) * C(i,j) = F(i,j)...")
    
    ensure_api_key()
    from semmul import semantic_multiply
    
    cells_2d = []
    for i in range(MATRIX_ROWS):
        cell_row = []
        for j in range(MATRIX_COLS):
            j_term = matrix_j[i][j]
            # Use safe resolved helper for Matrix C data
            c_term = _safe_resolved(c_data, i, j, f"C({i+1},{j+1})")
            
            logging.debug(f"  Computing F({i+1},{j+1}): {j_term} * {c_term}")
            resolved_term = semantic_multiply(j_term, c_term)
            logging.debug(f"    Result: {resolved_term}")
            
            cell = Cell(
                resolved=resolved_term,
                raw_terms=[j_term, c_term],
                intermediate=[],
                operation=Operation.MULTIPLY.value,
                notes=f"Matrix F from J*C element-wise semantic multiplication"
            )
            cell_row.append(cell)
        cells_2d.append(cell_row)
    
    # Step 4: Create Chirality document for Matrix F
    doc = ChiralityDocument(version="1.0", meta={"source": "chirality_cli", "mode": "semantic-matrix-f-from-neo4j"})
    ontology = {
        "operation": "J(i,j) * C(i,j) = F(i,j)",
        "matrix_j": "Truncated Decisions (3x4)",
        "matrix_c_source": f"Neo4j Matrix C (ID: {matrix_c_data['id']})", 
        "result": "Matrix F (3x4)",
        "framework": "Chirality Framework element-wise semantic multiplication",
        "source_matrix_c_id": matrix_c_data['id']
    }
    
    comp = make_matrix(
        id="matrix_F_from_neo4j",
        name="Matrix F (from Neo4j Matrix C)",
        station="Objectives",
        row_labels=j_rows,
        col_labels=C_COLS,
        cells_2d=cells_2d,
        ontology=ontology
    )
    
    doc.components.append(comp)
    json_path = write_json(doc, args.out)
    
    # Step 5: Send Matrix F to Neo4j
    logging.info(f"Step 5: Storing Matrix F in Neo4j...")
    send_to_neo4j(doc, api_base=getattr(args, 'api_base', DEFAULT_API_BASE))
    
    return json_path

def generate_matrix_d_from_neo4j(args):
    """Generate Matrix D using A(i,j) + F(i,j) = D(i,j) with semantic addition from Neo4j"""
    
    # Step 1: Query Matrix F from Neo4j (Objectives station)
    logging.info("Step 1: Querying Matrix F from Neo4j (Objectives station)...")
    matrix_f_data = query_neo4j_matrix(station="Objectives", api_base=args.api_base)
    
    if not matrix_f_data:
        raise SystemExit("Matrix F not found in Neo4j. Generate it first using 'semantic-matrix-f'.")
    
    logging.info(f"✓ Found Matrix F: {matrix_f_data['name']} (ID: {matrix_f_data['id']})")
    logging.info(f"  Shape: {matrix_f_data.get('shape', 'unknown')}")
    logging.info(f"  Station: {matrix_f_data.get('station', 'unknown')}")
    
    # Extract Matrix F structure  
    f_data = matrix_f_data['data']
    
    # Step 2: Define Matrix A (axiomatic from framework)
    logging.info("Step 2: Defining Matrix A (Problem Statement)...")
    logging.info("Matrix A:")
    for i, row_label in enumerate(A_ROWS):
        logging.debug(f"  {row_label}: {MATRIX_A[i]}")
    
    # Step 3: Generate Matrix D via semantic addition A(i,j) + F(i,j) = D(i,j)
    # According to framework: D(i,j) = A(i,j) + " applied to frame the problem; " + F(i,j) + " to resolve the problem."
    logging.info(f"Step 3: Generating Matrix D via A(i,j) + F(i,j) = D(i,j) with semantic addition...")
    
    cells_2d = []
    for i in range(MATRIX_ROWS):
        cell_row = []
        for j in range(MATRIX_COLS):
            a_term = MATRIX_A[i][j]
            # Use safe resolved helper for Matrix F data  
            f_term = _safe_resolved(f_data, i, j, f"F({i+1},{j+1})")
            
            # Semantic addition according to framework formula
            resolved_sentence = f"{a_term} applied to frame the problem; {f_term} to resolve the problem."
            
            logging.debug(f"  Computing D({i+1},{j+1}): {a_term} + {f_term}")
            logging.debug(f"    Result: {resolved_sentence}")
            
            cell = Cell(
                resolved=resolved_sentence,
                raw_terms=[a_term, f_term],
                intermediate=[],
                operation=Operation.ADD.value,
                notes=f"Matrix D from A+F semantic addition - ({A_ROWS[i]}, {A_COLS[j]})"
            )
            cell_row.append(cell)
        cells_2d.append(cell_row)
    
    # Step 4: Create Chirality document for Matrix D
    doc = ChiralityDocument(version="1.0", meta={"source": "chirality_cli", "mode": "semantic-matrix-d-from-neo4j"})
    ontology = {
        "operation": "A(i,j) + F(i,j) = D(i,j)",
        "matrix_a": "Problem Statement (3x4)",
        "matrix_f_source": f"Neo4j Matrix F (ID: {matrix_f_data['id']})", 
        "result": "Solution Objectives (3x4)",
        "framework": "Chirality Framework semantic addition",
        "source_matrix_f_id": matrix_f_data['id'],
        "formula": "A(i,j) + ' applied to frame the problem; ' + F(i,j) + ' to resolve the problem.'"
    }
    
    comp = make_matrix(
        id="matrix_D_from_neo4j",
        name="Matrix D (Solution Objectives)",
        station="Objectives",
        row_labels=A_ROWS,
        col_labels=A_COLS,
        cells_2d=cells_2d,
        ontology=ontology
    )
    
    doc.components.append(comp)
    json_path = write_json(doc, args.out)
    
    # Step 5: Send Matrix D to Neo4j
    logging.info(f"Step 5: Storing Matrix D in Neo4j...")
    send_to_neo4j(doc, api_base=getattr(args, 'api_base', DEFAULT_API_BASE))
    
    return json_path

def main():
    p = argparse.ArgumentParser(prog="chirality-cli", description="Tiny CLI: feed CSV lists/grids → Chirality JSON.")
    
    # Global flags
    p.add_argument("--verbose", action="store_true", help="Enable verbose logging")
    p.add_argument("--quiet", action="store_true", help="Suppress info messages, show only warnings/errors")
    p.add_argument("--api-base", default=DEFAULT_API_BASE, help="Base URL for the Next.js API")
    
    sub = p.add_subparsers(dest="cmd", required=True)

    # matrix from a single grid CSV (top-left blank; header row = columns; first col = rows)
    mg = sub.add_parser("matrix-grid", help="Build a matrix from a single grid CSV with row/col headers.")
    mg.add_argument("--grid", required=True, help="CSV file: cell[0,0] blank; row 0 = column labels; col 0 = row labels.")
    mg.add_argument("--title", required=True)
    mg.add_argument("--station", default=None)
    mg.add_argument("--rows_name", default=None)
    mg.add_argument("--cols_name", default=None)
    mg.add_argument("--notes", default=None)
    mg.add_argument("--out", required=True, help="Output JSON path.")
    mg.set_defaults(func=matrix_from_grid)

    # matrix from three CSVs
    ml = sub.add_parser("matrix-lists", help="Build a matrix from rows.csv, cols.csv, and data.csv")
    ml.add_argument("--rows", required=True, help="CSV with one label per row (single column).")
    ml.add_argument("--cols", required=True, help="CSV with one header row of labels (single row).")
    ml.add_argument("--data", required=True, help="CSV with rectangular data (len(rows) × len(cols)).")
    ml.add_argument("--title", required=True)
    ml.add_argument("--station", default=None)
    ml.add_argument("--rows_name", default=None)
    ml.add_argument("--cols_name", default=None)
    ml.add_argument("--notes", default=None)
    ml.add_argument("--out", required=True)
    ml.set_defaults(func=matrix_from_lists)

    # array from a single list
    al = sub.add_parser("array", help="Build an array (1D) from a single-column CSV.")
    al.add_argument("--list", required=True, help="CSV with one item per row.")
    al.add_argument("--axis_name", default="items")
    al.add_argument("--title", required=True)
    al.add_argument("--station", default=None)
    al.add_argument("--notes", default=None)
    al.add_argument("--out", required=True)
    al.set_defaults(func=array_from_list)

    # semantic matrix generation from Chirality Framework
    sc = sub.add_parser("semantic-matrix-c", help="Generate Matrix C using semantic multiplication A * B = C from Chirality Framework")
    sc.add_argument("--out", required=True, help="Output JSON path for Matrix C.")
    sc.set_defaults(func=generate_matrix_c_semantic)

    # semantic matrix F generation from Neo4j Matrix C
    sf = sub.add_parser("semantic-matrix-f", help="Generate Matrix F using J(i,j) * C(i,j) = F(i,j) by reading Matrix C from Neo4j")
    sf.add_argument("--out", required=True, help="Output JSON path for Matrix F.")
    sf.set_defaults(func=generate_matrix_f_from_neo4j)

    # semantic matrix D generation from Neo4j Matrix F
    sd = sub.add_parser("semantic-matrix-d", help="Generate Matrix D using A(i,j) + F(i,j) = D(i,j) with semantic addition from Neo4j")
    sd.add_argument("--out", required=True, help="Output JSON path for Matrix D.")
    sd.set_defaults(func=generate_matrix_d_from_neo4j)

    args = p.parse_args()
    
    # Set up logging based on flags
    setup_logging(verbose=getattr(args, "verbose", False), quiet=getattr(args, "quiet", False))
    
    out_path = args.func(args)
    print(out_path)

if __name__ == "__main__":
    main()
