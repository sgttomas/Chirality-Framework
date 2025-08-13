#!/usr/bin/env python3
"""
Matrix C Verification Report
Generate a comprehensive report showing the before/after state and what was fixed
"""
import os
from neo4j import GraphDatabase
import json
import requests

class MatrixCVerificationReport:
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
    
    def run_query(self, query: str, parameters: dict = None) -> list:
        """Run a Cypher query and return results"""
        with self.driver.session() as session:
            result = session.run(query, parameters or {})
            return [record.data() for record in result]
    
    def test_matrices_api(self):
        """Test the matrices API endpoint"""
        try:
            response = requests.get("http://localhost:3000/api/chat/matrices", timeout=10)
            if response.status_code == 200:
                return response.json()
            else:
                return {"error": f"HTTP {response.status_code}: {response.text}"}
        except Exception as e:
            return {"error": str(e)}
    
    def get_matrix_c_neo4j_details(self):
        """Get detailed Matrix C information from Neo4j"""
        query = """
        MATCH (c:Component {id: 'matrix_C_semantic'})
        OPTIONAL MATCH (c)-[:AT_STATION]->(s:Station)
        OPTIONAL MATCH (c)-[:HAS_CELL]->(cell:Cell)
        WITH c, s, collect(cell.position) as cell_positions, count(cell) as cell_count
        RETURN {
            id: c.id,
            name: c.name,
            station_property: c.station,
            station_name: s.name,
            shape: c.shape,
            cell_count: cell_count,
            sample_cell_positions: cell_positions[0..5]
        } as matrix_c_details
        """
        results = self.run_query(query)
        return results[0]['matrix_c_details'] if results else None

def main():
    """Generate verification report"""
    print("Matrix C Verification Report")
    print("=" * 80)
    print("This report shows the current state of Matrix C after applying fixes.")
    print()
    
    reporter = MatrixCVerificationReport()
    
    try:
        # Get Matrix C details from Neo4j
        print("1. MATRIX C DETAILS FROM NEO4J DATABASE")
        print("-" * 50)
        neo4j_details = reporter.get_matrix_c_neo4j_details()
        
        if neo4j_details:
            print(f"Component ID: {neo4j_details['id']}")
            print(f"Name: {neo4j_details['name']}")
            print(f"Station (property): {neo4j_details['station_property']}")
            print(f"Station (via relationship): {neo4j_details['station_name']}")
            print(f"Shape: {neo4j_details['shape']}")
            print(f"Cell count: {neo4j_details['cell_count']}")
            print(f"Sample cell positions: {neo4j_details['sample_cell_positions']}")
        else:
            print("❌ Matrix C not found in Neo4j!")
        
        print()
        
        # Test the Matrices API
        print("2. MATRIX C DETAILS FROM MATRICES API")
        print("-" * 50)
        api_response = reporter.test_matrices_api()
        
        if 'error' in api_response:
            print(f"❌ API Error: {api_response['error']}")
        else:
            # Find Matrix C in the API response
            matrix_c_api = None
            for matrix in api_response.get('matrices', []):
                if matrix.get('id') == 'matrix_C_semantic':
                    matrix_c_api = matrix
                    break
            
            if matrix_c_api:
                print(f"Component ID: {matrix_c_api['id']}")
                print(f"Name: {matrix_c_api['name']}")
                print(f"Station: {matrix_c_api['station']}")
                print(f"Station Name: {matrix_c_api['station_name']}")
                print(f"Shape: {matrix_c_api['shape']}")
                print(f"Cell count: {matrix_c_api['cell_count']}")
                print(f"Relevant cells: {matrix_c_api['relevant_cells']}")
            else:
                print("❌ Matrix C not found in API response!")
        
        print()
        
        # Summary of what was fixed
        print("3. SUMMARY OF ISSUES RESOLVED")
        print("-" * 50)
        
        # Check cell count
        neo4j_cell_count = neo4j_details['cell_count'] if neo4j_details else 0
        api_cell_count = matrix_c_api['cell_count'] if matrix_c_api else 0
        
        if neo4j_cell_count > 0 and api_cell_count > 0:
            print(f"✅ FIXED: Cell count issue resolved")
            print(f"   Before: cell_count = 0")
            print(f"   After: cell_count = {api_cell_count}")
        else:
            print(f"❌ Cell count still showing 0")
        
        # Check station connection
        neo4j_station = neo4j_details['station_name'] if neo4j_details else None
        api_station = matrix_c_api['station_name'] if matrix_c_api else None
        
        if neo4j_station and api_station:
            print(f"✅ FIXED: Station connection issue resolved")
            print(f"   Before: station_name = null")
            print(f"   After: station_name = '{api_station}'")
        else:
            print(f"❌ Station connection still showing null")
        
        print()
        
        # Diagnostic queries that were run
        print("4. FIXES THAT WERE APPLIED")
        print("-" * 50)
        print("The following Cypher queries were executed to fix Matrix C:")
        print()
        print("A. Created 12 cells for the 3x4 matrix:")
        print("""   MATCH (c:Component {id: 'matrix_C_semantic'})
   WITH c
   UNWIND range(1, 3) AS row
   UNWIND range(1, 4) AS col
   CREATE (cell:Cell {
       position: [row, col],
       value: "C(" + toString(row) + "," + toString(col) + ")"
   })
   CREATE (c)-[:HAS_CELL]->(cell)""")
        
        print()
        print("B. Connected Matrix C to Requirements station:")
        print("""   MATCH (c:Component {id: 'matrix_C_semantic'})
   MATCH (s:Station {name: 'Requirements'})
   MERGE (c)-[:AT_STATION]->(s)""")
        
        print()
        
        # Final status
        print("5. CURRENT STATUS")
        print("-" * 50)
        
        if (neo4j_cell_count > 0 and api_cell_count > 0 and 
            neo4j_station and api_station):
            print("🎉 SUCCESS: All Matrix C issues have been resolved!")
            print()
            print("Matrix C (`matrix_C_semantic`) now shows:")
            print(f"   • cell_count: {api_cell_count} (was 0)")
            print(f"   • station_name: '{api_station}' (was null)")
            print()
            print("The matrices API query is now working correctly for Matrix C.")
        else:
            print("⚠️  Some issues may still remain. Check the details above.")
            
    except Exception as e:
        print(f"Error generating report: {e}")
        
    finally:
        reporter.close()

if __name__ == "__main__":
    main()