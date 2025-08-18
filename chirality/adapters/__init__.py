"""
External system adapters.
"""

try:
    from .neo4j_adapter import Neo4jAdapter
    __all__ = ["Neo4jAdapter"]
except ImportError:
    # Neo4j not available
    __all__ = []