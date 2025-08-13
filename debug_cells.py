#!/usr/bin/env python3
"""Debug Neo4j cell content directly"""

from neo4j import GraphDatabase
import os

# Neo4j connection (using same creds as the app)
driver = GraphDatabase.driver(
    "neo4j+s://ae7bea0f.databases.neo4j.io",
    auth=("neo4j", "X1-s9BWlOt8tMBU1S9v9Ed1CBHZZWHxKCuly35fVnac")
)

def debug_cell_content():
    with driver.session() as session:
        print("=== DEBUG: Checking actual cell content in Neo4j ===")
        
        # Query 1: Check what nodes exist
        result = session.run("""
            MATCH (n) 
            RETURN DISTINCT labels(n) as labels, count(n) as count
            ORDER BY labels
        """)
        
        print("Node types in database:")
        for record in result:
            print(f"  {record['labels']}: {record['count']} nodes")
        
        print("\n" + "="*50)
        
        # Query 2: Check Matrix A cell content specifically
        result = session.run("""
            MATCH (c:Component {id: 'matrix_A_axiomatic'})
            OPTIONAL MATCH (c)-[:HAS_CELL]->(cell:Cell)
            RETURN c.name, c.id, count(cell) as cell_count
        """)
        
        for record in result:
            print(f"Matrix A: {record['c.name']} ({record['c.id']})")
            print(f"  Has {record['cell_count']} cells")
        
        print("\n" + "="*50)
        
        # Query 3: Get actual cell content from any matrix
        result = session.run("""
            MATCH (c:Component)-[:HAS_CELL]->(cell:Cell)
            RETURN c.id, c.name, cell.position, cell.resolved
            ORDER BY c.id, cell.position
            LIMIT 10
        """)
        
        print("Sample cell content:")
        for record in result:
            print(f"  {record['c.id']} | {record['cell.position']} | {record['cell.resolved']}")

if __name__ == "__main__":
    debug_cell_content()
    driver.close()