#!/usr/bin/env python3
"""
CF14 Integration Example with Semantic Component Tracking
Demonstrates how to integrate component tracking with CF14 operations
"""

from semantic_component_tracker import SemanticComponentTracker, ComponentState
from datetime import datetime
import json

class CF14WithTracking:
    """Enhanced CF14 execution with semantic component tracking"""
    
    def __init__(self, thread_id: str):
        self.thread_id = thread_id
        self.tracker = SemanticComponentTracker(thread_id)
        self.execution_log = []
    
    def execute_semantic_valley(self, matrix_a: list, matrix_b: list, resolver_type: str = "demo"):
        """Execute complete semantic valley with component tracking"""
        
        print(f"=== CF14 Semantic Valley Execution: {self.thread_id} ===")
        print(f"Resolver: {resolver_type}")
        print(f"Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        
        # Stage 1: Register initial matrices
        print("Stage 1: Problem Formulation")
        print("-" * 30)
        a_ids = self.tracker.register_matrix_components("A", matrix_a)
        b_ids = self.tracker.register_matrix_components("B", matrix_b)
        
        self._log_stage("S1_PROBLEM_FORMULATION", {
            "matrix_a": matrix_a,
            "matrix_b": matrix_b,
            "component_ids": {"A": a_ids, "B": b_ids}
        })
        
        print(f"Matrix A registered: {len(a_ids)} components")
        print(f"Matrix B registered: {len(b_ids)} components")
        
        # Stage 2: Semantic Multiplication (A * B = C)
        print("\nStage 2: Requirements Analysis (A * B = C)")
        print("-" * 40)
        
        # Simulate semantic multiplication
        matrix_c = self._simulate_semantic_multiplication(matrix_a, matrix_b, resolver_type)
        
        operation_details = {
            "operation": "semantic_multiplication",
            "resolver": resolver_type,
            "timestamp": datetime.now().isoformat(),
            "input_dimensions": {"A": f"{len(matrix_a)}x{len(matrix_a[0])}", "B": f"{len(matrix_b)}x{len(matrix_b[0])}"}
        }
        
        self.tracker.track_semantic_multiplication(a_ids, b_ids, matrix_c, operation_details)
        
        self._log_stage("S2_REQUIREMENTS_ANALYSIS", {
            "operation": "semantic_multiplication",
            "result_matrix": matrix_c,
            "operation_details": operation_details
        })
        
        print("Semantic multiplication completed:")
        self._print_matrix("C (Requirements)", matrix_c)
        
        # Stage 3: Interpretation (C → J)
        print("\nStage 3a: Stakeholder Interpretation (C → J)")
        print("-" * 42)
        
        matrix_j = self._simulate_interpretation(matrix_c, resolver_type)
        c_ids = [f"{self.thread_id}:C:{row}:{col}" for row in range(len(matrix_c)) for col in range(len(matrix_c[0]))]
        
        interpretation_details = {
            "operation": "stakeholder_interpretation", 
            "resolver": resolver_type,
            "timestamp": datetime.now().isoformat()
        }
        
        # Register J matrix and track interpretation
        j_ids = self.tracker.register_matrix_components("J", matrix_j)
        for idx, j_id in enumerate(j_ids):
            row, col = divmod(idx, len(matrix_j[0]))
            self.tracker.components[j_id].update_state(
                ComponentState.INTERPRETED,
                matrix_j[row][col],
                interpretation_details
            )
        
        self._log_stage("S3A_INTERPRETATION", {
            "operation": "interpretation",
            "result_matrix": matrix_j,
            "operation_details": interpretation_details
        })
        
        print("Stakeholder interpretation completed:")
        self._print_matrix("J (Interpretation)", matrix_j)
        
        # Stage 3b: Element-wise Combination (J ⊙ C = F)
        print("\nStage 3b: Element-wise Combination (J ⊙ C = F)")
        print("-" * 44)
        
        matrix_f = self._simulate_elementwise_combination(matrix_j, matrix_c, resolver_type)
        
        elementwise_details = {
            "operation": "elementwise_combination",
            "resolver": resolver_type,
            "timestamp": datetime.now().isoformat()
        }
        
        self.tracker.track_elementwise_combination(j_ids, c_ids, matrix_f, elementwise_details)
        
        self._log_stage("S3B_ELEMENTWISE", {
            "operation": "elementwise_combination",
            "result_matrix": matrix_f,
            "operation_details": elementwise_details
        })
        
        print("Element-wise combination completed:")
        self._print_matrix("F (Functions)", matrix_f)
        
        # Stage 3c: Final Synthesis (A + F = D)
        print("\nStage 3c: Final Synthesis (A + F = D)")
        print("-" * 35)
        
        matrix_d = self._simulate_final_synthesis(matrix_a, matrix_f, resolver_type)
        
        synthesis_details = {
            "operation": "final_synthesis",
            "resolver": resolver_type,
            "timestamp": datetime.now().isoformat()
        }
        
        # Register D matrix as resolved components
        d_ids = self.tracker.register_matrix_components("D", matrix_d)
        for idx, d_id in enumerate(d_ids):
            row, col = divmod(idx, len(matrix_d[0]))
            self.tracker.components[d_id].update_state(
                ComponentState.RESOLVED,
                matrix_d[row][col],
                synthesis_details
            )
        
        self._log_stage("S3C_SYNTHESIS", {
            "operation": "final_synthesis",
            "result_matrix": matrix_d,
            "operation_details": synthesis_details
        })
        
        print("Final synthesis completed:")
        self._print_matrix("D (Objectives)", matrix_d)
        
        # Summary
        print(f"\n=== Semantic Valley Execution Complete ===")
        print(f"Total components tracked: {len(self.tracker.components)}")
        print(f"Matrices generated: A, B, C, J, F, D")
        print(f"Execution thread: {self.thread_id}")
        print(f"Completed: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        
        return {
            "tracker": self.tracker,
            "matrices": {"A": matrix_a, "B": matrix_b, "C": matrix_c, "J": matrix_j, "F": matrix_f, "D": matrix_d},
            "execution_log": self.execution_log
        }
    
    def _simulate_semantic_multiplication(self, matrix_a: list, matrix_b: list, resolver_type: str) -> list:
        """Simulate semantic multiplication operation"""
        # Simple simulation - in real implementation this would use actual resolvers
        result = []
        for i, a_row in enumerate(matrix_a):
            result_row = []
            for j, a_val in enumerate(a_row):
                b_val = matrix_b[i][j] if i < len(matrix_b) and j < len(matrix_b[i]) else "Unknown"
                # Simulate semantic combination
                if resolver_type == "demo":
                    combined = f"{a_val} {b_val}".replace("Insufficient", "Limited").replace("Contingent", "Flexible")
                    result_row.append(combined)
                else:
                    result_row.append(f"[{a_val} * {b_val}]")
            result.append(result_row)
        return result
    
    def _simulate_interpretation(self, matrix_c: list, resolver_type: str) -> list:
        """Simulate stakeholder interpretation"""
        result = []
        for row in matrix_c:
            result_row = []
            for content in row:
                # Simulate interpretation - make more user-friendly
                interpreted = content.replace("Values", "Core Values").replace("Actions", "Key Actions")
                interpreted = interpreted.replace("Principles", "Guiding Principles").replace("Methods", "Practical Methods")
                result_row.append(f"User-Friendly: {interpreted}")
            result.append(result_row)
        return result
    
    def _simulate_elementwise_combination(self, matrix_j: list, matrix_c: list, resolver_type: str) -> list:
        """Simulate element-wise combination"""
        result = []
        for i, j_row in enumerate(matrix_j):
            result_row = []
            for j, j_val in enumerate(j_row):
                c_val = matrix_c[i][j] if i < len(matrix_c) and j < len(matrix_c[i]) else "Unknown"
                # Combine interpretation with requirements
                combined = f"Function: Implement {j_val} based on {c_val}"
                result_row.append(combined)
            result.append(result_row)
        return result
    
    def _simulate_final_synthesis(self, matrix_a: list, matrix_f: list, resolver_type: str) -> list:
        """Simulate final synthesis"""
        result = []
        for i, a_row in enumerate(matrix_a):
            result_row = []
            for j, a_val in enumerate(a_row):
                f_val = matrix_f[i][j] if i < len(matrix_f) and j < len(matrix_f[i]) else "Unknown"
                # Create final objective
                objective = f"Objective: Achieve {a_val} through {f_val.replace('Function: Implement ', '')}"
                result_row.append(objective)
            result.append(result_row)
        return result
    
    def _print_matrix(self, name: str, matrix: list):
        """Print matrix in formatted way"""
        print(f"  {name}:")
        for i, row in enumerate(matrix):
            for j, cell in enumerate(row):
                print(f"    [{i},{j}]: {cell}")
    
    def _log_stage(self, stage: str, data: dict):
        """Log execution stage"""
        self.execution_log.append({
            "stage": stage,
            "timestamp": datetime.now().isoformat(),
            "data": data
        })
    
    def export_complete_trace(self, filename: str):
        """Export complete execution trace with component tracking"""
        trace_data = {
            "thread_id": self.thread_id,
            "execution_log": self.execution_log,
            "component_data": {comp_id: comp.to_dict() for comp_id, comp in self.tracker.components.items()}
        }
        
        with open(filename, 'w') as f:
            json.dump(trace_data, f, indent=2)
        
        print(f"Complete execution trace exported to {filename}")

def main():
    """Demo the CF14 integration with component tracking"""
    
    # Example problem: Software Development Process
    matrix_a = [
        ["Quality", "Efficiency"], 
        ["Maintainability", "Scalability"]
    ]
    
    matrix_b = [
        ["Critical", "Important"], 
        ["Necessary", "Beneficial"]
    ]
    
    # Execute semantic valley
    cf14 = CF14WithTracking("software_dev_process")
    result = cf14.execute_semantic_valley(matrix_a, matrix_b, "demo")
    
    # Show some component evolution examples
    print("\n=== Component Evolution Examples ===")
    
    # Find a component and show its evolution
    for comp_id in list(result["tracker"].components.keys())[:2]:
        evolution = result["tracker"].visualize_component_evolution(comp_id)
        print(evolution)
    
    # Export everything
    cf14.export_complete_trace("cf14_execution_trace.json")
    result["tracker"].export_component_data("semantic_components.json")
    
    print("\n=== Next Steps ===")
    print("1. Run: python component_viewer.py semantic_components.json")
    print("2. Explore component evolution interactively")
    print("3. Load into your own CF14 analysis tools")

if __name__ == "__main__":
    main()