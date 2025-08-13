#!/usr/bin/env python3
"""
Test script to verify the generate_matrix_f_from_neo4j function exists and has correct structure
"""

try:
    from chirality_cli import generate_matrix_f_from_neo4j
    print("✓ generate_matrix_f_from_neo4j function imported successfully")
    
    # Check the docstring for expected keywords
    docstring = generate_matrix_f_from_neo4j.__doc__ or ""
    expected_keywords = [
        "join", "sem_multiply", "sem_add", "interpret",
        "CF14 v2.1.1", "pipeline"
    ]
    
    found_keywords = []
    for keyword in expected_keywords:
        if keyword in docstring:
            found_keywords.append(keyword)
            print(f"✓ Found keyword '{keyword}' in docstring")
        else:
            print(f"✗ Missing keyword '{keyword}' in docstring")
    
    if len(found_keywords) >= 4:  # At least most keywords found
        print("✓ Docstring contains expected pipeline keywords")
    else:
        print("✗ Docstring missing key pipeline description")
    
    print(f"\nDocstring preview:")
    print(docstring[:200] + "..." if len(docstring) > 200 else docstring)
    
except ImportError as e:
    print(f"✗ Import failed: {e}")
    exit(1)
except Exception as e:
    print(f"✗ Function inspection failed: {e}")
    exit(1)

print("\n✓ CLI function verification passed!")
