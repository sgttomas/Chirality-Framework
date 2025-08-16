"""
Neo4j adapter for CF14 persistence.

Provides write-through capabilities to Neo4j graph database.
"""

import os
from typing import Dict, Any, List, Optional
from datetime import datetime

try:
    from neo4j import GraphDatabase
except ImportError:
    GraphDatabase = None


class Neo4jAdapter:
    """Neo4j adapter for matrix/cell persistence."""
    
    def __init__(self, uri: str, user: str, password: str):
        """
        Initialize Neo4j connection.
        
        Args:
            uri: Neo4j URI (e.g., bolt://localhost:7687)
            user: Username
            password: Password
        """
        if GraphDatabase is None:
            raise ImportError("neo4j package required. Install with: pip install neo4j")
        
        self.driver = GraphDatabase.driver(uri, auth=(user, password))
        self._ensure_schema()
    
    def _ensure_schema(self):
        """Ensure Neo4j schema constraints and indexes."""
        with self.driver.session() as session:
            # Create constraints
            constraints = [
                "CREATE CONSTRAINT IF NOT EXISTS FOR (m:Matrix) REQUIRE m.id IS UNIQUE",
                "CREATE CONSTRAINT IF NOT EXISTS FOR (c:Cell) REQUIRE c.id IS UNIQUE",
                "CREATE CONSTRAINT IF NOT EXISTS FOR (t:Thread) REQUIRE t.id IS UNIQUE",
            ]
            
            for constraint in constraints:
                try:
                    session.run(constraint)
                except Exception:
                    pass  # Constraint already exists
            
            # Create indexes
            indexes = [
                "CREATE INDEX IF NOT EXISTS FOR (m:Matrix) ON (m.type)",
                "CREATE INDEX IF NOT EXISTS FOR (c:Cell) ON (c.row, c.col)",
                "CREATE INDEX IF NOT EXISTS FOR (c:Cell) ON (c.modality)",
            ]
            
            for index in indexes:
                try:
                    session.run(index)
                except Exception:
                    pass  # Index already exists
    
    def save_matrix(self, matrix: "Matrix", thread_id: Optional[str] = None) -> None:
        """
        Save matrix and its cells to Neo4j.
        
        Args:
            matrix: Matrix to save
            thread_id: Optional thread ID for context
        """
        from ..core.types import Matrix
        
        with self.driver.session() as session:
            # Create or merge thread
            if thread_id:
                session.run(
                    "MERGE (t:Thread {id: $thread_id}) "
                    "SET t.updated_at = $timestamp",
                    thread_id=thread_id,
                    timestamp=datetime.utcnow().isoformat()
                )
            
            # Create matrix node
            session.run("""
                MERGE (m:Matrix {id: $id})
                SET m.type = $type,
                    m.rows = $rows,
                    m.cols = $cols,
                    m.metadata = $metadata,
                    m.updated_at = $timestamp
                """,
                id=matrix.id,
                type=matrix.type.value,
                rows=matrix.dimensions[0],
                cols=matrix.dimensions[1],
                metadata=str(matrix.metadata),
                timestamp=datetime.utcnow().isoformat()
            )
            
            # Link to thread if provided
            if thread_id:
                session.run("""
                    MATCH (t:Thread {id: $thread_id})
                    MATCH (m:Matrix {id: $matrix_id})
                    MERGE (t)-[:HAS_MATRIX]->(m)
                    """,
                    thread_id=thread_id,
                    matrix_id=matrix.id
                )
            
            # Save cells
            for cell in matrix.cells:
                self._save_cell(session, cell, matrix.id)
    
    def _save_cell(self, session, cell: "Cell", matrix_id: str) -> None:
        """Save individual cell."""
        from ..core.types import Cell
        
        # Create cell node
        session.run("""
            MERGE (c:Cell {id: $id})
            SET c.row = $row,
                c.col = $col,
                c.text = $text,
                c.modality = $modality,
                c.content = $content,
                c.provenance = $provenance,
                c.updated_at = $timestamp
            """,
            id=cell.id,
            row=cell.row,
            col=cell.col,
            text=cell.content.get("text", ""),
            modality=cell.modality.value,
            content=str(cell.content),
            provenance=str(cell.provenance),
            timestamp=datetime.utcnow().isoformat()
        )
        
        # Link to matrix
        session.run("""
            MATCH (m:Matrix {id: $matrix_id})
            MATCH (c:Cell {id: $cell_id})
            MERGE (m)-[:HAS_CELL {row: $row, col: $col}]->(c)
            """,
            matrix_id=matrix_id,
            cell_id=cell.id,
            row=cell.row,
            col=cell.col
        )
    
    def load_matrix(self, matrix_id: str) -> Optional["Matrix"]:
        """
        Load matrix from Neo4j.
        
        Args:
            matrix_id: Matrix ID to load
        
        Returns:
            Matrix instance or None if not found
        """
        from ..core.types import Matrix, MatrixType, Cell, Modality
        import ast
        
        with self.driver.session() as session:
            # Get matrix
            result = session.run("""
                MATCH (m:Matrix {id: $id})
                RETURN m
                """,
                id=matrix_id
            )
            
            record = result.single()
            if not record:
                return None
            
            m = record["m"]
            
            # Get cells
            cell_results = session.run("""
                MATCH (m:Matrix {id: $matrix_id})-[:HAS_CELL]->(c:Cell)
                RETURN c
                ORDER BY c.row, c.col
                """,
                matrix_id=matrix_id
            )
            
            cells = []
            for record in cell_results:
                c = record["c"]
                cells.append(Cell(
                    id=c["id"],
                    row=c["row"],
                    col=c["col"],
                    content=ast.literal_eval(c["content"]) if isinstance(c["content"], str) else c["content"],
                    modality=Modality(c.get("modality", "unknown")),
                    provenance=ast.literal_eval(c["provenance"]) if isinstance(c["provenance"], str) else c.get("provenance", {})
                ))
            
            return Matrix(
                id=m["id"],
                type=MatrixType(m["type"]),
                cells=cells,
                dimensions=(m["rows"], m["cols"]),
                metadata=ast.literal_eval(m["metadata"]) if isinstance(m["metadata"], str) else m.get("metadata", {})
            )
    
    def create_lineage(self, source_ids: List[str], target_id: str, operation: str) -> None:
        """
        Create lineage relationships between matrices.
        
        Args:
            source_ids: Source matrix IDs
            target_id: Target matrix ID
            operation: Operation that created the relationship
        """
        with self.driver.session() as session:
            for source_id in source_ids:
                session.run("""
                    MATCH (s:Matrix {id: $source_id})
                    MATCH (t:Matrix {id: $target_id})
                    MERGE (s)-[:DERIVES {operation: $operation, timestamp: $timestamp}]->(t)
                    """,
                    source_id=source_id,
                    target_id=target_id,
                    operation=operation,
                    timestamp=datetime.utcnow().isoformat()
                )
    
    def query_matrices(self, matrix_type: Optional[str] = None, thread_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Query matrices by type or thread.
        
        Args:
            matrix_type: Optional matrix type filter
            thread_id: Optional thread ID filter
        
        Returns:
            List of matrix summaries
        """
        with self.driver.session() as session:
            query = "MATCH (m:Matrix)"
            conditions = []
            params = {}
            
            if matrix_type:
                conditions.append("m.type = $type")
                params["type"] = matrix_type
            
            if thread_id:
                query = "MATCH (t:Thread {id: $thread_id})-[:HAS_MATRIX]->(m:Matrix)"
                params["thread_id"] = thread_id
            
            if conditions and not thread_id:
                query += " WHERE " + " AND ".join(conditions)
            
            query += " RETURN m.id as id, m.type as type, m.rows as rows, m.cols as cols"
            
            results = []
            for record in session.run(query, **params):
                results.append({
                    "id": record["id"],
                    "type": record["type"],
                    "dimensions": (record["rows"], record["cols"])
                })
            
            return results
    
    def close(self):
        """Close Neo4j connection."""
        if self.driver:
            self.driver.close()