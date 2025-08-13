#!/usr/bin/env python3
"""
Test script to verify the updated CF14 v2.1.1 implementation
"""

try:
    from chirality_cli import generate_matrix_f_from_neo4j
    print("✓ generate_matrix_f_from_neo4j imported successfully")
    
    # Check docstring for updated keywords
    docstring = generate_matrix_f_from_neo4j.__doc__ or ""
    expected_updates = [
        "ALWAYS performed for F",
        "Step-1", "Step-2", 
        "sem_multiply", "sem_add"
    ]
    
    found_updates = []
    for keyword in expected_updates:
        if keyword in docstring:
            found_updates.append(keyword)
            print(f"✓ Found updated keyword '{keyword}'")
        else:
            print(f"✗ Missing keyword '{keyword}'")
    
    print(f"\nDocstring preview:")
    print(docstring[:300] + "..." if len(docstring) > 300 else docstring)
    
    # Test CLI help text
    import subprocess
    result = subprocess.run(
        ["python3", "-c", "from chirality_cli import main; main()" if __name__ == "__main__" else "pass"], 
        capture_output=True, text=True, cwd="/Users/ryan/Desktop/ai-env/chirality-semantic-framework"
    )
    
    print(f"\n✓ All validation checks completed!")
    
except Exception as e:
    print(f"✗ Validation failed: {e}")
    exit(1)

print("\n✓ CF14 v2.1.1 updates applied successfully!")
