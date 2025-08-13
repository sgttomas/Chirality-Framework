#!/usr/bin/env python3
"""
Neo4j Database Administration Utility
Separate from Chirality Framework - for database management tasks
"""
import argparse
import requests
import json
from typing import Optional

def list_components(api_url: str = "http://localhost:3000/api/neo4j/delete") -> None:
    """List all components in the database"""
    try:
        response = requests.post(
            api_url,
            json={"delete_type": "list_components"},
            headers={'Content-Type': 'application/json'},
            timeout=30
        )
        
        if response.status_code == 200:
            result = response.json()
            if result.get('success'):
                components = result.get('components', [])
                print(f"Found {len(components)} components in Neo4j:")
                print("-" * 80)
                for comp in components:
                    shape_str = f"{comp['shape'][0]}x{comp['shape'][1]}" if comp['shape'] and len(comp['shape']) >= 2 else "unknown"
                    print(f"ID: {comp['id']}")
                    print(f"  Name: {comp['name']}")
                    print(f"  Kind: {comp['kind']}")
                    print(f"  Station: {comp['station']} ({comp['station_name']})")
                    print(f"  Shape: {shape_str}")
                    print()
            else:
                print(f"✗ Failed to list components: {result.get('error')}")
        else:
            print(f"✗ Request failed: {response.status_code} - {response.text}")
            
    except Exception as e:
        print(f"✗ Error listing components: {e}")

def delete_component(component_id: str, api_url: str = "http://localhost:3000/api/neo4j/delete") -> None:
    """Delete a specific component and all its related nodes"""
    try:
        response = requests.post(
            api_url,
            json={"delete_type": "component_and_related", "component_id": component_id},
            headers={'Content-Type': 'application/json'},
            timeout=30
        )
        
        if response.status_code == 200:
            result = response.json()
            if result.get('success'):
                deleted_count = result.get('deleted_components', 0)
                print(f"✓ Successfully deleted component '{component_id}' and related nodes")
                print(f"  Deleted components: {deleted_count}")
            else:
                print(f"✗ Failed to delete component: {result.get('error')}")
        else:
            print(f"✗ Request failed: {response.status_code} - {response.text}")
            
    except Exception as e:
        print(f"✗ Error deleting component: {e}")

def delete_station(station: str, api_url: str = "http://localhost:3000/api/neo4j/delete") -> None:
    """Delete all components at a specific station"""
    try:
        response = requests.post(
            api_url,
            json={"delete_type": "delete_all_at_station", "station": station},
            headers={'Content-Type': 'application/json'},
            timeout=30
        )
        
        if response.status_code == 200:
            result = response.json()
            if result.get('success'):
                deleted_count = result.get('deleted_components', 0)
                print(f"✓ Successfully deleted {deleted_count} components at station '{station}'")
            else:
                print(f"✗ Failed to delete components: {result.get('error')}")
        else:
            print(f"✗ Request failed: {response.status_code} - {response.text}")
            
    except Exception as e:
        print(f"✗ Error deleting station components: {e}")

def main():
    parser = argparse.ArgumentParser(
        prog="neo4j-admin",
        description="Neo4j Database Administration - separate from Chirality Framework"
    )
    subparsers = parser.add_subparsers(dest="command", required=True)
    
    # List components
    list_cmd = subparsers.add_parser("list", help="List all components in the database")
    
    # Delete component
    delete_cmd = subparsers.add_parser("delete", help="Delete a specific component")
    delete_cmd.add_argument("--id", required=True, help="Component ID to delete")
    
    # Delete all at station
    station_cmd = subparsers.add_parser("delete-station", help="Delete all components at a station")
    station_cmd.add_argument("--station", required=True, help="Station name")
    
    args = parser.parse_args()
    
    if args.command == "list":
        list_components()
    elif args.command == "delete":
        print(f"Deleting component: {args.id}")
        confirm = input("Are you sure? (y/N): ")
        if confirm.lower() == 'y':
            delete_component(args.id)
        else:
            print("Cancelled.")
    elif args.command == "delete-station":
        print(f"Deleting all components at station: {args.station}")
        confirm = input("Are you sure? (y/N): ")
        if confirm.lower() == 'y':
            delete_station(args.station)
        else:
            print("Cancelled.")

if __name__ == "__main__":
    main()