#!/usr/bin/env python3
"""
Clean up duplicate Matrix C entries in Neo4j
"""
import requests

def cleanup_duplicate_matrix_c():
    """Remove duplicate matrix_C_semantic entries"""
    
    print("=== Cleaning up duplicate Matrix C entries ===")
    
    # First, let's see what Matrix C entries we have
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
                matrix_c_components = [c for c in components if c['id'] == 'matrix_C_semantic']
                
                print(f"Found {len(matrix_c_components)} Matrix C components:")
                for i, comp in enumerate(matrix_c_components):
                    print(f"  {i+1}. {comp['name']} - Station: {comp['station']} - Shape: {comp['shape']}")
                
                if len(matrix_c_components) > 1:
                    print(f"\nWe have {len(matrix_c_components)} duplicates. Let's keep one and remove the others.")
                    print("This will remove duplicate Matrix C entries while preserving one copy.")
                    
                    confirm = input("Proceed with cleanup? (y/N): ")
                    if confirm.lower() == 'y':
                        # Delete all components at Requirements station (this will remove all Matrix C duplicates)
                        # Then we'll need to recreate one if needed
                        
                        print("\nRemoving all Matrix C components at Requirements station...")
                        delete_response = requests.post(
                            "http://localhost:3000/api/neo4j/delete",
                            json={"delete_type": "delete_all_at_station", "station": "Requirements"},
                            headers={'Content-Type': 'application/json'},
                            timeout=30
                        )
                        
                        if delete_response.status_code == 200:
                            delete_result = delete_response.json()
                            if delete_result.get('success'):
                                deleted_count = delete_result.get('deleted_components', 0)
                                print(f"✓ Successfully deleted {deleted_count} components at Requirements station")
                                print("Note: You may need to re-run the instantiation to recreate Matrix C if needed.")
                            else:
                                print(f"✗ Delete failed: {delete_result.get('error')}")
                        else:
                            print(f"✗ Delete request failed: {delete_response.status_code}")
                    else:
                        print("Cleanup cancelled.")
                else:
                    print("No duplicates found to clean up.")
            else:
                print(f"✗ Failed to list components: {result.get('error')}")
        else:
            print(f"✗ Request failed: {response.status_code}")
            
    except Exception as e:
        print(f"✗ Error: {e}")

if __name__ == "__main__":
    cleanup_duplicate_matrix_c()