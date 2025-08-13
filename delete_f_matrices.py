#!/usr/bin/env python3
"""Quick script to delete all Matrix F components"""

import requests

def delete_f_matrices():
    """Delete all Matrix F components with ID 'matrix_F_from_neo4j'"""
    
    # First, let's see what we have
    print("Current components in database:")
    list_response = requests.post(
        "http://localhost:3000/api/neo4j/delete",
        json={"delete_type": "list_components"},
        headers={'Content-Type': 'application/json'},
        timeout=30
    )
    
    if list_response.status_code == 200:
        result = list_response.json()
        components = result.get('components', [])
        f_matrices = [c for c in components if 'matrix_F' in c['id']]
        print(f"Found {len(f_matrices)} Matrix F components:")
        for f in f_matrices:
            shape_str = f"{f['shape'][0]}x{f['shape'][1]}" if f['shape'] and len(f['shape']) >= 2 else "unknown"
            print(f"  - {f['id']} ({shape_str}) at {f['station']}")
        
        # Try to delete by calling the station delete
        if f_matrices:
            print(f"\nAttempting to delete all at Objectives station...")
            delete_response = requests.post(
                "http://localhost:3000/api/neo4j/delete",
                json={"delete_type": "delete_all_at_station", "station": "Objectives"},
                headers={'Content-Type': 'application/json'},
                timeout=30
            )
            
            if delete_response.status_code == 200:
                result = delete_response.json()
                if result.get('success'):
                    print(f"✓ Successfully deleted {result.get('deleted_components', 0)} components")
                else:
                    print(f"✗ Delete failed: {result.get('error')}")
            else:
                print(f"✗ Delete request failed: {delete_response.status_code}")
                print(f"Response: {delete_response.text}")
    else:
        print(f"✗ Failed to list components: {list_response.status_code}")

if __name__ == "__main__":
    delete_f_matrices()