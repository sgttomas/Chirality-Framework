#!/usr/bin/env python3
"""
Debug Matrix C Neo4j Relationships
This script will diagnose why Matrix C shows cell_count: 0 and station_name: null
"""
import os
from neo4j import GraphDatabase
import json
from typing import Dict, List, Any

class MatrixCDebugger:
    def __init__(self):
        # Get Neo4j credentials from environment
        self.uri = os.getenv('NEO4J_URI')
        self.username = os.getenv('NEO4J_USERNAME')
        self.password = os.getenv('NEO4J_PASSWORD')
        
        if not all([self.uri, self.username, self.password]):
            raise ValueError("Missing Neo4j environment variables")
        
        self.driver = GraphDatabase.driver(
            self.uri,
            auth=(self.username, self.password)
        )
    
    def close(self):
        """Close the Neo4j driver"""
        self.driver.close()
    
    def run_query(self, query: str, parameters: Dict = None) -> List[Dict]:
        """Run a Cypher query and return results"""
        with self.driver.session() as session:
            result = session.run(query, parameters or {})
            return [record.data() for record in result]
    
    def print_results(self, title: str, results: List[Dict]):
        """Pretty print query results"""
        print(f"\n{'='*60}")
        print(f"{title}")
        print(f"{'='*60}")
        
        if not results:
            print("No results found.")
            return
        
        for i, record in enumerate(results):
            print(f"\nResult {i+1}:")
            for key, value in record.items():
                print(f"  {key}: {value}")
    
    def check_matrix_c_existence(self):
        """Check if Matrix C exists and get its basic properties"""
        query = """
        MATCH (c:Component)
        WHERE c.id CONTAINS 'matrix_C' OR c.name CONTAINS 'matrix_C' OR c.name CONTAINS 'Matrix C'
        RETURN c.id as id, c.name as name, c.station as station, c.shape as shape, c.kind as kind
        """
        results = self.run_query(query)
        self.print_results("1. Matrix C Component Search", results)
        return results
    
    def check_all_components(self):
        """List all components to see what's available"""
        query = """
        MATCH (c:Component)
        RETURN c.id as id, c.name as name, c.station as station, c.shape as shape, c.kind as kind
        ORDER BY c.station, c.name
        """
        results = self.run_query(query)
        self.print_results("2. All Components in Database", results)
        return results
    
    def check_matrix_c_relationships(self):
        """Check all relationships for Matrix C components"""
        query = """
        MATCH (c:Component)
        WHERE c.id CONTAINS 'matrix_C' OR c.name CONTAINS 'matrix_C' OR c.name CONTAINS 'Matrix C'
        OPTIONAL MATCH (c)-[r]->(related)
        RETURN c.id as component_id, c.name as component_name, 
               type(r) as relationship_type, 
               labels(related) as related_labels,
               related.id as related_id, related.name as related_name
        """
        results = self.run_query(query)
        self.print_results("3. Matrix C Relationships", results)
        return results
    
    def check_all_cells(self):
        """Check what Cell nodes exist in the database"""
        query = """
        MATCH (cell:Cell)
        RETURN cell.id as id, cell.name as name, cell.position as position, cell.content as content
        LIMIT 20
        """
        results = self.run_query(query)
        self.print_results("4. All Cell Nodes (First 20)", results)
        return results
    
    def check_all_stations(self):
        """Check what Station nodes exist"""
        query = """
        MATCH (s:Station)
        RETURN s.id as id, s.name as name
        """
        results = self.run_query(query)
        self.print_results("5. All Station Nodes", results)
        return results
    
    def check_has_cell_relationships(self):
        """Check all HAS_CELL relationships"""
        query = """
        MATCH (c:Component)-[:HAS_CELL]->(cell:Cell)
        RETURN c.id as component_id, c.name as component_name, 
               cell.id as cell_id, cell.position as cell_position, 
               cell.content as cell_content
        LIMIT 20
        """
        results = self.run_query(query)
        self.print_results("6. All HAS_CELL Relationships (First 20)", results)
        return results
    
    def check_at_station_relationships(self):
        """Check all AT_STATION relationships"""
        query = """
        MATCH (c:Component)-[:AT_STATION]->(s:Station)
        RETURN c.id as component_id, c.name as component_name, 
               s.id as station_id, s.name as station_name
        """
        results = self.run_query(query)
        self.print_results("7. All AT_STATION Relationships", results)
        return results
    
    def test_matrices_api_query(self):
        """Test the exact query used by the matrices API"""
        query = """
        MATCH (c:Component)
        OPTIONAL MATCH (c)-[:AT_STATION]->(s:Station)
        OPTIONAL MATCH (c)-[:HAS_CELL]->(cell:Cell)
        WITH c, s, count(cell) as cell_count
        RETURN c.id as id, c.name as name, c.station as station, 
               s.name as station_name, c.shape as shape, cell_count
        ORDER BY c.station, c.name
        """
        results = self.run_query(query)
        self.print_results("8. Matrices API Query Results", results)
        return results
    
    def search_semantic_matrix_c(self):
        """Search for matrix_C_semantic specifically"""
        query = """
        MATCH (c:Component)
        WHERE c.id = 'matrix_C_semantic'
        OPTIONAL MATCH (c)-[:AT_STATION]->(s:Station)
        OPTIONAL MATCH (c)-[:HAS_CELL]->(cell:Cell)
        OPTIONAL MATCH (c)-[r]->(related)
        RETURN c as component, s as station, 
               collect(cell) as cells, 
               collect({type: type(r), node: related}) as all_relationships
        """
        results = self.run_query(query)
        self.print_results("9. matrix_C_semantic Detailed Analysis", results)
        return results
    
    def find_orphaned_cells(self):
        """Find cells that might belong to Matrix C but aren't connected"""
        query = """
        MATCH (cell:Cell)
        WHERE cell.id CONTAINS 'matrix_C' OR cell.id CONTAINS 'C_'
        OPTIONAL MATCH (cell)<-[:HAS_CELL]-(c:Component)
        RETURN cell.id as cell_id, cell.position as position, 
               cell.content as content, c.id as connected_component
        """
        results = self.run_query(query)
        self.print_results("10. Potential Matrix C Cells (Orphaned or Connected)", results)
        return results

def main():
    """Main debugging function"""
    print("Matrix C Neo4j Relationship Debugger")
    print("="*60)
    
    debugger = MatrixCDebugger()
    
    try:
        # Run all diagnostic queries
        matrix_c_components = debugger.check_matrix_c_existence()
        all_components = debugger.check_all_components()
        matrix_c_relationships = debugger.check_matrix_c_relationships()
        all_cells = debugger.check_all_cells()
        all_stations = debugger.check_all_stations()
        has_cell_rels = debugger.check_has_cell_relationships()
        at_station_rels = debugger.check_at_station_relationships()
        api_query_results = debugger.test_matrices_api_query()
        semantic_matrix_c = debugger.search_semantic_matrix_c()
        orphaned_cells = debugger.find_orphaned_cells()
        
        # Summary and recommendations
        print(f"\n{'='*60}")
        print("DIAGNOSIS AND RECOMMENDATIONS")
        print(f"{'='*60}")
        
        # Check if Matrix C exists
        if not matrix_c_components:
            print("❌ ISSUE: No Matrix C components found in database")
            print("   RECOMMENDATION: Matrix C needs to be ingested into Neo4j")
        else:
            print(f"✅ Found {len(matrix_c_components)} Matrix C component(s)")
            
            # Check for cells
            matrix_c_has_cells = any(result.get('cell_count', 0) > 0 for result in api_query_results 
                                   if 'matrix_C' in str(result.get('id', '')))
            
            if not matrix_c_has_cells:
                print("❌ ISSUE: Matrix C has no connected cells (cell_count: 0)")
                print("   POSSIBLE CAUSES:")
                print("   1. Cells were not created during ingestion")
                print("   2. HAS_CELL relationships are missing")
                print("   3. Cells exist but have wrong relationship type")
                
            # Check for station
            matrix_c_has_station = any(result.get('station_name') is not None for result in api_query_results 
                                     if 'matrix_C' in str(result.get('id', '')))
            
            if not matrix_c_has_station:
                print("❌ ISSUE: Matrix C has no station connection (station_name: null)")
                print("   POSSIBLE CAUSES:")
                print("   1. Station node doesn't exist")
                print("   2. AT_STATION relationship is missing")
                print("   3. Wrong station reference in component")
        
        # Check for orphaned cells
        orphaned_matrix_c_cells = [cell for cell in orphaned_cells 
                                 if cell.get('connected_component') is None]
        
        if orphaned_matrix_c_cells:
            print(f"⚠️  Found {len(orphaned_matrix_c_cells)} potential Matrix C cells that are orphaned")
            print("   RECOMMENDATION: These cells may need to be connected to Matrix C")
        
        print(f"\n{'='*60}")
        print("SUGGESTED CYPHER QUERIES TO FIX ISSUES:")
        print(f"{'='*60}")
        
        print("\n1. Create missing HAS_CELL relationships:")
        print("""
MATCH (c:Component {id: 'matrix_C_semantic'})
MATCH (cell:Cell)
WHERE cell.id CONTAINS 'matrix_C' OR cell.id CONTAINS 'C_'
MERGE (c)-[:HAS_CELL]->(cell)
RETURN count(*) as relationships_created
""")
        
        print("\n2. Create or connect to Station:")
        print("""
// First create station if it doesn't exist
MERGE (s:Station {name: 'C'})
SET s.id = 'station_C'

// Then connect Matrix C to station
MATCH (c:Component {id: 'matrix_C_semantic'})
MATCH (s:Station {name: 'C'})
MERGE (c)-[:AT_STATION]->(s)
RETURN c.id, s.name
""")
        
        print("\n3. Verify station property on component:")
        print("""
MATCH (c:Component {id: 'matrix_C_semantic'})
SET c.station = 'C'
RETURN c.id, c.station
""")
        
    except Exception as e:
        print(f"Error during debugging: {e}")
        
    finally:
        debugger.close()

if __name__ == "__main__":
    main()