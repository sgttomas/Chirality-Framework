import os
from hashlib import sha1
from typing import Any, Dict, Iterable, Tuple
from neo4j import GraphDatabase
from datetime import datetime

def _sha(s: str) -> str:
    return sha1(s.encode("utf-8")).hexdigest()

class CF14Neo4jExporter:
    """
    Minimal, idempotent write-layer for CF14 outputs.
    Does NOT alter matrix computation—only persists results.
    """
    def __init__(self) -> None:
        uri = os.getenv("NEO4J_URI", "bolt://localhost:7687")
        user = os.getenv("NEO4J_USERNAME", "neo4j")
        pwd  = os.getenv("NEO4J_PASSWORD", "testpass")
        self.driver = GraphDatabase.driver(uri, auth=(user, pwd))

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
                matrix_id = _sha(f"{thread_id}|{kind}")
                session.run(
                    """
                    MERGE (m:CFMatrix {id: $id})
                    ON CREATE SET m.createdAt = $createdAt
                    SET m.kind = $kind, m.name = $name
                    """,
                    id=matrix_id,
                    createdAt=now,
                    kind=kind,
                    name=f"{thread_id} {kind}",
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
                              ON CREATE SET a.term = $term_a, a.station = $kind
                            MERGE (b:CFNode {id: $bid})
                              ON CREATE SET b.term = $term_b, b.station = $kind
                            MERGE (m)-[:CONTAINS]->(a)
                            MERGE (m)-[:CONTAINS]->(b)
                            MERGE (a)-[r:RELATES_TO]->(b)
                              ON CREATE SET r.weight = $w
                              ON MATCH  SET r.weight = $w
                            """,
                            mid=matrix_id,
                            aid=node_a_id, term_a=f"Row{i}",
                            bid=node_b_id, term_b=f"Col{j}",
                            kind=kind,
                            w=weight,
                        )