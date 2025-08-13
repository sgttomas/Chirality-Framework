#!/usr/bin/env python3
"""
Quick test to see what cell data is actually in Neo4j
"""
import requests

def test_neo4j_cells():
    """Test what cell content we actually have"""
    
    # Test with Neo4j delete API to list components (it works)
    print("=== Testing Neo4j Component Data ===")
    try:
        response = requests.post(
            "http://localhost:3000/api/neo4j/delete",
            json={"delete_type": "list_components"},
            headers={'Content-Type': 'application/json'},
            timeout=30
        )
        
        if response.status_code == 200:
            result = response.json()
            if result.get('success'):
                components = result.get('components', [])
                print(f"Found {len(components)} components:")
                
                for comp in components:
                    print(f"\nComponent: {comp['id']}")
                    print(f"  Name: {comp['name']}")
                    print(f"  Station: {comp['station']}")
                    print(f"  Shape: {comp['shape']}")
                    
                    # Look for Matrix A specifically
                    if 'matrix_A' in comp['id'] or 'Problem Statement' in comp['name']:
                        print(f"  *** This is Matrix A - Problem Statement ***")
                        
            else:
                print(f"List failed: {result.get('error')}")
        else:
            print(f"Request failed: {response.status_code} - {response.text}")
            
    except Exception as e:
        print(f"Error: {e}")

    print("\n" + "="*60)
    print("DIAGNOSIS:")
    print("The issue is likely that Matrix A (Problem Statement) contains")
    print("the axiomatic content but our chat queries aren't properly")
    print("accessing the individual cell contents within the matrices.")
    print("We need to fix the Neo4j cell content queries in the chat API.")

if __name__ == "__main__":
    test_neo4j_cells()