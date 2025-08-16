"""
Station runners for CF14 semantic pipeline.

S1: Problem formulation (A, B axioms)
S2: Requirements analysis (C = A × B)
S3: Objective synthesis (J, F, D outputs)
"""

from typing import Dict, Any, Optional, List, Tuple
from datetime import datetime

from .types import Matrix, MatrixType, Cell, Station, StationType
from .ids import generate_matrix_id, generate_cell_id
from .ops import Resolver, semantic_multiply
from .validate import validate_matrix, validate_matrix_dimensions
from .provenance import create_cell_provenance, ProvenanceTracker


class StationRunner:
    """Base class for station runners."""
    
    def __init__(self, resolver: Resolver, enable_hitl: bool = False):
        """
        Initialize station runner.
        
        Args:
            resolver: Resolver for semantic operations
            enable_hitl: Enable Human-In-The-Loop confirmation
        """
        self.resolver = resolver
        self.enable_hitl = enable_hitl
        self.provenance = ProvenanceTracker()
    
    def run(self, inputs: Dict[str, Matrix], context: Optional[Dict[str, Any]] = None) -> Dict[str, Matrix]:
        """
        Run station processing.
        
        Args:
            inputs: Input matrices
            context: Processing context
        
        Returns:
            Output matrices
        """
        raise NotImplementedError("Subclasses must implement run()")
    
    def _confirm_hitl(self, message: str) -> bool:
        """Get human confirmation if HITL enabled."""
        if not self.enable_hitl:
            return True
        
        response = input(f"\n{message} Continue? [y/N]: ")
        return response.lower() in ["y", "yes"]


class S1Runner(StationRunner):
    """
    Station 1: Problem formulation.
    
    Loads axioms (A) and basis (B) matrices.
    """
    
    def run(self, inputs: Dict[str, Matrix], context: Optional[Dict[str, Any]] = None) -> Dict[str, Matrix]:
        """
        Process S1: Load and validate A, B matrices.
        
        Args:
            inputs: Should contain 'A' and 'B' matrices
            context: Processing context
        
        Returns:
            Validated A and B matrices
        """
        context = context or {}
        
        # Validate inputs
        if "A" not in inputs or "B" not in inputs:
            raise ValueError("S1 requires A and B matrices as input")
        
        matrix_a = inputs["A"]
        matrix_b = inputs["B"]
        
        # Validate matrices
        errors_a = validate_matrix(matrix_a)
        if errors_a:
            raise ValueError(f"Matrix A validation failed: {errors_a}")
        
        errors_b = validate_matrix(matrix_b)
        if errors_b:
            raise ValueError(f"Matrix B validation failed: {errors_b}")
        
        # HITL confirmation
        if self.enable_hitl:
            print(f"\nS1: Problem Formulation")
            print(f"  Matrix A: {matrix_a.dimensions} ({len(matrix_a.cells)} cells)")
            print(f"  Matrix B: {matrix_b.dimensions} ({len(matrix_b.cells)} cells)")
            
            if not self._confirm_hitl("Proceed with problem formulation?"):
                raise RuntimeError("S1 cancelled by user")
        
        # Track provenance
        self.provenance.track_operation(
            "s1_load",
            [],
            [matrix_a.id, matrix_b.id],
            {"station": "S1", "timestamp": datetime.utcnow().isoformat()}
        )
        
        return {"A": matrix_a, "B": matrix_b}


class S2Runner(StationRunner):
    """
    Station 2: Requirements analysis.
    
    Computes C = A × B (semantic multiplication).
    """
    
    def run(self, inputs: Dict[str, Matrix], context: Optional[Dict[str, Any]] = None) -> Dict[str, Matrix]:
        """
        Process S2: Compute C = A × B.
        
        Args:
            inputs: Should contain 'A' and 'B' matrices
            context: Processing context
        
        Returns:
            Dictionary with A, B, and computed C matrices
        """
        context = context or {}
        
        # Validate inputs
        if "A" not in inputs or "B" not in inputs:
            raise ValueError("S2 requires A and B matrices as input")
        
        matrix_a = inputs["A"]
        matrix_b = inputs["B"]
        
        # Validate dimensions for multiplication
        dim_errors = validate_matrix_dimensions(matrix_a, matrix_b, "multiply")
        if dim_errors:
            raise ValueError(f"Cannot multiply matrices: {dim_errors}")
        
        # HITL confirmation
        if self.enable_hitl:
            print(f"\nS2: Requirements Analysis")
            print(f"  Computing: C = A × B")
            print(f"  Dimensions: {matrix_a.dimensions} × {matrix_b.dimensions}")
            
            if not self._confirm_hitl("Proceed with semantic multiplication?"):
                raise RuntimeError("S2 cancelled by user")
        
        # Perform semantic multiplication
        matrix_c = semantic_multiply(self.resolver, matrix_a, matrix_b, context)
        
        # Track provenance
        self.provenance.track_operation(
            "s2_multiply",
            [matrix_a.id, matrix_b.id],
            [matrix_c.id],
            {"station": "S2", "operation": "C = A × B"}
        )
        
        # HITL review
        if self.enable_hitl:
            print(f"  Result: Matrix C {matrix_c.dimensions} ({len(matrix_c.cells)} cells)")
            sample_cell = matrix_c.cells[0] if matrix_c.cells else None
            if sample_cell:
                print(f"  Sample: {sample_cell.content.get('text', '')[:100]}...")
        
        return {"A": matrix_a, "B": matrix_b, "C": matrix_c}


class S3Runner(StationRunner):
    """
    Station 3: Objective synthesis.
    
    Transforms C into judgment (J), function (F), and domain (D) matrices.
    """
    
    def run(self, inputs: Dict[str, Matrix], context: Optional[Dict[str, Any]] = None) -> Dict[str, Matrix]:
        """
        Process S3: Generate J, F, D from C.
        
        Args:
            inputs: Should contain 'C' matrix (and optionally A, B)
            context: Processing context
        
        Returns:
            Dictionary with C, J, F, D matrices
        """
        context = context or {}
        
        # Validate inputs
        if "C" not in inputs:
            raise ValueError("S3 requires C matrix as input")
        
        matrix_c = inputs["C"]
        thread_id = context.get("thread_id", "default")
        
        # HITL confirmation
        if self.enable_hitl:
            print(f"\nS3: Objective Synthesis")
            print(f"  Input: Matrix C {matrix_c.dimensions}")
            print(f"  Generating: J (Judgment), F (Function), D (Domain)")
            
            if not self._confirm_hitl("Proceed with objective synthesis?"):
                raise RuntimeError("S3 cancelled by user")
        
        # Generate J (Judgment) - Interpret C cells for human understanding
        matrix_j = self._generate_judgment_matrix(matrix_c, thread_id, context)
        
        # Generate F (Function) - Extract functional requirements
        matrix_f = self._generate_function_matrix(matrix_c, thread_id, context)
        
        # Generate D (Domain) - Map to domain concepts
        matrix_d = self._generate_domain_matrix(matrix_c, thread_id, context)
        
        # Track provenance
        self.provenance.track_operation(
            "s3_synthesize",
            [matrix_c.id],
            [matrix_j.id, matrix_f.id, matrix_d.id],
            {"station": "S3", "outputs": ["J", "F", "D"]}
        )
        
        # HITL review
        if self.enable_hitl:
            print(f"  Generated:")
            print(f"    J: {matrix_j.dimensions} ({len(matrix_j.cells)} cells)")
            print(f"    F: {matrix_f.dimensions} ({len(matrix_f.cells)} cells)")
            print(f"    D: {matrix_d.dimensions} ({len(matrix_d.cells)} cells)")
        
        result = {"C": matrix_c, "J": matrix_j, "F": matrix_f, "D": matrix_d}
        
        # Include A, B if provided
        if "A" in inputs:
            result["A"] = inputs["A"]
        if "B" in inputs:
            result["B"] = inputs["B"]
        
        return result
    
    def _generate_judgment_matrix(self, matrix_c: Matrix, thread_id: str, context: Dict[str, Any]) -> Matrix:
        """Generate judgment matrix from C."""
        matrix_id = generate_matrix_id("J", thread_id, 0)
        cells = []
        
        for c_cell in matrix_c.cells:
            # Interpret cell for human understanding
            result = self.resolver.resolve(
                "interpret",
                {
                    "text": c_cell.content.get("text", ""),
                    "row_label": f"Row_{c_cell.row}",
                    "col_label": f"Col_{c_cell.col}"
                },
                context
            )
            
            cell_content = {
                "text": result["text"],
                "interpretation": "judgment",
                "provenance": create_cell_provenance("interpret", [c_cell.id])
            }
            
            cell_id = generate_cell_id(matrix_id, c_cell.row, c_cell.col, cell_content)
            cells.append(Cell(
                id=cell_id,
                row=c_cell.row,
                col=c_cell.col,
                content=cell_content
            ))
        
        return Matrix(
            id=matrix_id,
            type=MatrixType.J,
            cells=cells,
            dimensions=matrix_c.dimensions,
            metadata={"source": matrix_c.id, "operation": "interpret"}
        )
    
    def _generate_function_matrix(self, matrix_c: Matrix, thread_id: str, context: Dict[str, Any]) -> Matrix:
        """Generate function matrix from C."""
        matrix_id = generate_matrix_id("F", thread_id, 0)
        cells = []
        
        # For F, we extract functional aspects (simplified for now)
        for c_cell in matrix_c.cells:
            cell_content = {
                "text": f"Function: {c_cell.content.get('text', '')[:50]}",
                "type": "function",
                "provenance": create_cell_provenance("extract_function", [c_cell.id])
            }
            
            cell_id = generate_cell_id(matrix_id, c_cell.row, c_cell.col, cell_content)
            cells.append(Cell(
                id=cell_id,
                row=c_cell.row,
                col=c_cell.col,
                content=cell_content
            ))
        
        return Matrix(
            id=matrix_id,
            type=MatrixType.F,
            cells=cells,
            dimensions=matrix_c.dimensions,
            metadata={"source": matrix_c.id, "operation": "extract_function"}
        )
    
    def _generate_domain_matrix(self, matrix_c: Matrix, thread_id: str, context: Dict[str, Any]) -> Matrix:
        """Generate domain matrix from C."""
        matrix_id = generate_matrix_id("D", thread_id, 0)
        cells = []
        
        # For D, we map to domain concepts (simplified for now)
        for c_cell in matrix_c.cells:
            cell_content = {
                "text": f"Domain: {c_cell.content.get('text', '')[:50]}",
                "type": "domain",
                "provenance": create_cell_provenance("map_domain", [c_cell.id])
            }
            
            cell_id = generate_cell_id(matrix_id, c_cell.row, c_cell.col, cell_content)
            cells.append(Cell(
                id=cell_id,
                row=c_cell.row,
                col=c_cell.col,
                content=cell_content
            ))
        
        return Matrix(
            id=matrix_id,
            type=MatrixType.D,
            cells=cells,
            dimensions=matrix_c.dimensions,
            metadata={"source": matrix_c.id, "operation": "map_domain"}
        )