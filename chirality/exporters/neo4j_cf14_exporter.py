import os
from hashlib import sha1
from typing import Any, Dict, Optional
try:
    from neo4j import GraphDatabase  # type: ignore
except Exception:  # pragma: no cover
    GraphDatabase = None  # type: ignore
from datetime import datetime

def _sha(s: str) -> str:
    return sha1(s.encode("utf-8")).hexdigest()

class CF14Neo4jExporter:
    """
    Minimal, idempotent write-layer for CF14 outputs.
    Does NOT alter matrix computation—only persists results.

    Graph schema:
      (:CFMatrix {id, kind, name, createdAt, updatedAt, rows, cols})
      (:CFNode {id, term, station, type, row?, col?})
      (m)-[:CONTAINS]->(n)
      (a)-[:RELATES_TO {weight}]->(b)
    """
    def __init__(self, uri: Optional[str] = None, user: Optional[str] = None, password: Optional[str] = None) -> None:
        # Prefer provided CLI args; fall back to env vars; keep sensible defaults
        uri = uri or os.getenv("NEO4J_URI", "bolt://localhost:7687")
        user = user or os.getenv("NEO4J_USER", os.getenv("NEO4J_USERNAME", "neo4j"))
        pwd  = password or os.getenv("NEO4J_PASSWORD", "password")
        if GraphDatabase is None:
            raise ImportError("neo4j package required. Install with: pip install neo4j or use extra [neo4j]")
        self.driver = GraphDatabase.driver(uri, auth=(user, pwd))
        self._ensure_schema()

    def _ensure_schema(self) -> None:
        """Create required constraints/indexes for idempotent upserts."""
        with self.driver.session() as session:
            statements = [
                "CREATE CONSTRAINT IF NOT EXISTS FOR (m:CFMatrix) REQUIRE m.id IS UNIQUE",
                "CREATE CONSTRAINT IF NOT EXISTS FOR (n:CFNode) REQUIRE n.id IS UNIQUE",
            ]
            for stmt in statements:
                try:
                    session.run(stmt)
                except Exception:
                    # Best-effort; ignore if not supported
                    pass

    def close(self) -> None:
        self.driver.close()

    def export(self, matrices: Dict[str, Any], thread_id: str) -> None:
        """
        `matrices` is expected as a dict: {'A': matrixA, 'B': matrixB, ...}
        Each matrix can be a 2D list/ndarray-like structure. Zeros are skipped.
        """
        now = datetime.utcnow().isoformat()
        with self.driver.session() as session:
            for kind, matrix in matrices.items():
                # Basic dimensions from provided 2D structure
                rows = len(matrix) if hasattr(matrix, "__len__") else 0
                cols = len(matrix[0]) if rows > 0 and hasattr(matrix[0], "__len__") else 0

                matrix_id = _sha(f"{thread_id}|{kind}")
                session.run(
                    """
                    MERGE (m:CFMatrix {id: $id})
                    ON CREATE SET m.createdAt = $createdAt
                    SET m.kind = $kind, m.name = $name,
                        m.updatedAt = $updatedAt,
                        m.rows = $rows, m.cols = $cols
                    """,
                    id=matrix_id,
                    createdAt=now,
                    updatedAt=now,
                    kind=kind,
                    name=f"{thread_id} {kind}",
                    rows=rows,
                    cols=cols,
                )
                # Derive row/col node ids deterministically and link non-zero weights
                for i, row in enumerate(matrix):
                    for j, val in enumerate(row):
                        try:
                            weight = float(val)
                        except Exception:
                            continue
                        if weight == 0.0:
                            continue
                        node_a_id = _sha(f"{thread_id}|{kind}|row|{i}")
                        node_b_id = _sha(f"{thread_id}|{kind}|col|{j}")
                        session.run(
                            """
                            MATCH (m:CFMatrix {id: $mid})
                            MERGE (a:CFNode {id: $aid})
                              ON CREATE SET a.term = $term_a, a.station = $kind, a.type = 'row', a.row = $i
                              SET a.station = $kind
                            MERGE (b:CFNode {id: $bid})
                              ON CREATE SET b.term = $term_b, b.station = $kind, b.type = 'col', b.col = $j
                              SET b.station = $kind
                            MERGE (m)-[:CONTAINS]->(a)
                            MERGE (m)-[:CONTAINS]->(b)
                            MERGE (a)-[r:RELATES_TO]->(b)
                              ON CREATE SET r.weight = $w
                              ON MATCH  SET r.weight = $w
                            """,
                            mid=matrix_id,
                            aid=node_a_id, term_a=f"Row{i}",
                            bid=node_b_id, term_b=f"Col{j}",
                            i=i, j=j,
                            kind=kind,
                            w=weight,
                        )