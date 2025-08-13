#!/usr/bin/env python3
"""
Manual cleanup of duplicate Matrix C components using direct Neo4j
"""
from neo4j import GraphDatabase

# Neo4j connection
driver = GraphDatabase.driver(
    "neo4j+s://ae7bea0f.databases.neo4j.io",
    auth=("neo4j", "X1-s9BWlOt8tMBU1S9v9Ed1CBHZZWHxKCuly35fVnac")
)

def manual_cleanup():
    with driver.session() as session:
        print("=== Manual cleanup of duplicate Matrix C ===")
        
        # First, count how many we have
        result = session.run("""
            MATCH (c:Component {id: 'matrix_C_semantic'})
            RETURN count(c) as count
        """)
        
        count = result.single()['count']
        print(f"Found {count} Matrix C components with ID 'matrix_C_semantic'")
        
        if count <= 1:
            print("No duplicates to remove.")
            return
        
        # Keep one, delete the rest
        duplicates_to_delete = count - 1
        print(f"Will delete {duplicates_to_delete} duplicate(s), keeping 1")
        
        # Delete duplicates by limiting the deletion
        result = session.run(f"""
            MATCH (c:Component {{id: 'matrix_C_semantic'}})
            WITH c
            LIMIT {duplicates_to_delete}
            
            // Delete all related nodes and relationships first
            OPTIONAL MATCH (c)-[:HAS_CELL]->(cell:Cell)
            OPTIONAL MATCH (cell)-[:CONTAINS_TERM|RESOLVES_TO]->(term:Term)
            OPTIONAL MATCH (c)-[:HAS_AXIS]->(axis:Axis)
            
            DETACH DELETE c, cell, term, axis
            
            RETURN count(c) as deleted
        """)
        
        record = result.single()
        deleted = record['deleted'] if record else 0
        print(f"Successfully deleted {deleted} duplicate Matrix C components")
        
        # Verify cleanup
        result = session.run("""
            MATCH (c:Component {id: 'matrix_C_semantic'})
            RETURN count(c) as remaining_count
        """)
        
        remaining = result.single()['remaining_count']
        print(f"Remaining Matrix C components: {remaining}")

if __name__ == "__main__":
    manual_cleanup()
    driver.close()