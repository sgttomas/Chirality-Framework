#!/usr/bin/env python3
"""
Quick test of the rebased CF14 implementation.
"""

import sys
import os
sys.path.insert(0, '.')

from chirality import (
    EchoResolver, 
    op_multiply, op_interpret, op_elementwise, op_add,
    S1Runner, S2Runner, S3Runner
)
from chirality.core.serialize import load_matrix

def test_basic_operations():
    """Test basic CF14 operations with fixtures."""
    print("Testing CF14 Implementation...")
    
    # Load test matrices
    try:
        matrix_a = load_matrix("chirality/tests/fixtures/A.json")
        matrix_b = load_matrix("chirality/tests/fixtures/B.json")
        print(f"✓ Loaded A: {matrix_a.dimensions}, B: {matrix_b.dimensions}")
    except Exception as e:
        print(f"✗ Failed to load fixtures: {e}")
        return False
    
    # Test resolver
    resolver = EchoResolver()
    thread = "test:rebase-validation"
    
    try:
        # Test multiplication
        C, op_c = op_multiply(thread, matrix_a, matrix_b, resolver)
        print(f"✓ op_multiply: {C.dimensions} -> {C.cells[0].content['text']}")
        
        # Test interpretation 
        J, op_j = op_interpret(thread, C, resolver)
        print(f"✓ op_interpret: {J.dimensions} -> {J.cells[0].content['text']}")
        
        # Test element-wise
        F, op_f = op_elementwise(thread, J, C, resolver)
        print(f"✓ op_elementwise: {F.dimensions} -> {F.cells[0].content['text']}")
        
        # Test addition
        D, op_d = op_add(thread, matrix_a, F, resolver)
        print(f"✓ op_add: {D.dimensions} -> {D.cells[0].content['text']}")
        
        return True
        
    except Exception as e:
        print(f"✗ Operation failed: {e}")
        return False

def test_stations():
    """Test station pipeline."""
    print("\nTesting Station Pipeline...")
    
    try:
        # Load matrices
        matrix_a = load_matrix("chirality/tests/fixtures/A.json")
        matrix_b = load_matrix("chirality/tests/fixtures/B.json")
        
        resolver = EchoResolver()
        context = {"thread_id": "test:stations"}
        
        # S1: Problem formulation
        s1 = S1Runner(resolver, enable_hitl=False)
        s1_results = s1.run({"A": matrix_a, "B": matrix_b}, context)
        print(f"✓ S1: A={s1_results['A'].dimensions}, B={s1_results['B'].dimensions}")
        
        # S2: Requirements analysis
        s2 = S2Runner(resolver, enable_hitl=False)
        s2_results = s2.run(s1_results, context)
        print(f"✓ S2: C={s2_results['C'].dimensions}")
        
        # S3: Objective synthesis
        s3 = S3Runner(resolver, enable_hitl=False)
        s3_results = s3.run(s2_results, context)
        print(f"✓ S3: J={s3_results['J'].dimensions}, F={s3_results['F'].dimensions}, D={s3_results['D'].dimensions}")
        
        return True
        
    except Exception as e:
        print(f"✗ Station pipeline failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = True
    success &= test_basic_operations()
    success &= test_stations()
    
    if success:
        print("\n🎉 All tests passed! CF14 implementation is working.")
        print("\nNext steps:")
        print("  python -m chirality.cli run --thread 'demo:test' --A chirality/tests/fixtures/A.json --B chirality/tests/fixtures/B.json --resolver echo")
    else:
        print("\n❌ Tests failed. Check implementation.")
        sys.exit(1)