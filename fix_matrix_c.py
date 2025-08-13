#!/usr/bin/env python3
"""
Fix Matrix C Neo4j Relationships
This script will fix the specific issues identified with Matrix C:
1. Missing cells (cell_count: 0)
2. Missing station connection (station_name: null)
"""
import os
from neo4j import GraphDatabase
import json
from typing import Dict, List, Any

class MatrixCFixer:
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
        print(f"\n{title}")
        print("=" * 60)
        
        if not results:
            print("No results found.")
            return
        
        for i, record in enumerate(results):
            print(f"\nResult {i+1}:")
            for key, value in record.items():
                print(f"  {key}: {value}")
    
    def create_matrix_c_cells(self):
        """Create the missing cells for Matrix C (3x4 matrix = 12 cells)"""
        print("\n1. Creating cells for Matrix C...")
        
        # First, let's see what cell structure other matrices use
        check_cell_structure_query = """
        MATCH (c:Component)-[:HAS_CELL]->(cell:Cell)
        WHERE c.id = 'matrix_A_axiomatic'
        RETURN cell
        LIMIT 3
        """
        
        sample_cells = self.run_query(check_cell_structure_query)
        self.print_results("Sample cell structure from Matrix A:", sample_cells)
        
        # Create cells for Matrix C based on its 3x4 shape
        create_cells_query = """
        MATCH (c:Component {id: 'matrix_C_semantic'})
        WITH c
        UNWIND range(1, 3) AS row
        UNWIND range(1, 4) AS col
        CREATE (cell:Cell {
            position: [row, col],
            value: "C(" + toString(row) + "," + toString(col) + ")"
        })
        CREATE (c)-[:HAS_CELL]->(cell)
        RETURN count(cell) as cells_created
        """
        
        results = self.run_query(create_cells_query)
        self.print_results("Cells created for Matrix C:", results)
        return results
    
    def fix_station_connection(self):
        """Fix the station connection for Matrix C"""
        print("\n2. Fixing station connection for Matrix C...")
        
        # Check if Requirements station exists
        check_station_query = """
        MATCH (s:Station {name: 'Requirements'})
        RETURN s.name as station_name, s.id as station_id
        """
        
        station_results = self.run_query(check_station_query)
        self.print_results("Requirements station check:", station_results)
        
        # Create the AT_STATION relationship
        create_station_connection_query = """
        MATCH (c:Component {id: 'matrix_C_semantic'})
        MATCH (s:Station {name: 'Requirements'})
        MERGE (c)-[:AT_STATION]->(s)
        RETURN c.id as component_id, s.name as station_name
        """
        
        results = self.run_query(create_station_connection_query)
        self.print_results("Station connection created:", results)
        return results
    
    def verify_fixes(self):
        """Verify that the fixes worked by running the original matrices API query"""
        print("\n3. Verifying fixes...")
        
        verify_query = """
        MATCH (c:Component {id: 'matrix_C_semantic'})
        OPTIONAL MATCH (c)-[:AT_STATION]->(s:Station)
        OPTIONAL MATCH (c)-[:HAS_CELL]->(cell:Cell)
        WITH c, s, count(cell) as cell_count
        RETURN c.id as id, c.name as name, c.station as station, 
               s.name as station_name, c.shape as shape, cell_count
        """
        
        results = self.run_query(verify_query)
        self.print_results("Matrix C after fixes:", results)
        return results
    
    def show_matrix_c_cells(self):
        """Show the actual cells that were created"""
        print("\n4. Showing Matrix C cells...")
        
        cells_query = """
        MATCH (c:Component {id: 'matrix_C_semantic'})-[:HAS_CELL]->(cell:Cell)
        RETURN cell.position as position, cell.value as value
        ORDER BY cell.position[0], cell.position[1]
        """
        
        results = self.run_query(cells_query)
        self.print_results("Matrix C cells:", results)
        return results

def main():
    """Main function to fix Matrix C issues"""
    print("Matrix C Neo4j Relationship Fixer")
    print("=" * 60)
    print("This script will:")
    print("1. Create 12 cells for Matrix C (3x4)")
    print("2. Connect Matrix C to the Requirements station")
    print("3. Verify the fixes work")
    
    confirm = input("\nDo you want to proceed? (y/N): ")
    if confirm.lower() != 'y':
        print("Cancelled.")
        return
    
    fixer = MatrixCFixer()
    
    try:
        # Step 1: Create cells
        cell_results = fixer.create_matrix_c_cells()
        
        # Step 2: Fix station connection
        station_results = fixer.fix_station_connection()
        
        # Step 3: Verify fixes
        verification_results = fixer.verify_fixes()
        
        # Step 4: Show the cells
        cell_display_results = fixer.show_matrix_c_cells()
        
        # Summary
        print(f"\n{'='*60}")
        print("SUMMARY OF FIXES APPLIED")
        print(f"{'='*60}")
        
        if cell_results and cell_results[0].get('cells_created', 0) > 0:
            print(f"✅ Created {cell_results[0]['cells_created']} cells for Matrix C")
        else:
            print("❌ Failed to create cells for Matrix C")
        
        if station_results and len(station_results) > 0:
            print(f"✅ Connected Matrix C to station: {station_results[0].get('station_name')}")
        else:
            print("❌ Failed to connect Matrix C to station")
        
        if verification_results and len(verification_results) > 0:
            result = verification_results[0]
            cell_count = result.get('cell_count', 0)
            station_name = result.get('station_name')
            
            print(f"\n📊 VERIFICATION RESULTS:")
            print(f"   Matrix C cell_count: {cell_count} (was 0, should be 12)")
            print(f"   Matrix C station_name: {station_name} (was null, should be 'Requirements')")
            
            if cell_count > 0 and station_name is not None:
                print(f"\n🎉 SUCCESS! Matrix C issues have been resolved.")
                print("   The matrices API should now return correct values for Matrix C.")
            else:
                print(f"\n⚠️  Some issues may remain. Please check the results above.")
        
    except Exception as e:
        print(f"Error during fixing: {e}")
        
    finally:
        fixer.close()

if __name__ == "__main__":
    main()