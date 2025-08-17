#!/usr/bin/env python3
"""
Semantic Component Tracker for CF14
Visualize and track semantic components through their complete transformation journey
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Any, Tuple
from enum import Enum
import json
import uuid
from datetime import datetime

class ComponentState(Enum):
    """States of semantic component transformation"""
    INITIAL = "initial"           # Original semantic content
    INTERPRETED = "interpreted"   # After semantic interpretation
    COMBINED = "combined"         # After element-wise combination
    RESOLVED = "resolved"         # Final instantiated form

@dataclass
class SemanticComponent:
    """Individual semantic component with complete transformation history"""
    id: str
    initial_content: str
    matrix_position: Tuple[int, int]  # (row, col)
    matrix_name: str
    
    # Transformation states
    states: Dict[ComponentState, str] = field(default_factory=dict)
    
    # Provenance tracking
    operations: List[Dict[str, Any]] = field(default_factory=list)
    timestamps: Dict[ComponentState, datetime] = field(default_factory=dict)
    
    # Context information
    semantic_context: Dict[str, Any] = field(default_factory=dict)
    dependencies: List[str] = field(default_factory=list)  # IDs of related components
    
    def __post_init__(self):
        """Initialize with original content as initial state"""
        self.states[ComponentState.INITIAL] = self.initial_content
        self.timestamps[ComponentState.INITIAL] = datetime.now()
    
    def update_state(self, state: ComponentState, content: str, operation_info: Dict[str, Any]):
        """Record transformation to new state"""
        self.states[state] = content
        self.timestamps[state] = datetime.now()
        self.operations.append({
            "state": state.value,
            "operation": operation_info,
            "timestamp": self.timestamps[state].isoformat()
        })
    
    def get_transformation_path(self) -> List[Tuple[ComponentState, str]]:
        """Get complete transformation journey"""
        return [(state, content) for state, content in self.states.items()]
    
    def to_dict(self) -> Dict[str, Any]:
        """Serialize component for storage/display"""
        return {
            "id": self.id,
            "initial_content": self.initial_content,
            "matrix_position": self.matrix_position,
            "matrix_name": self.matrix_name,
            "states": {state.value: content for state, content in self.states.items()},
            "operations": self.operations,
            "timestamps": {state.value: ts.isoformat() for state, ts in self.timestamps.items()},
            "semantic_context": self.semantic_context,
            "dependencies": self.dependencies
        }

class SemanticComponentTracker:
    """Track and visualize semantic components through CF14 transformation pipeline"""
    
    def __init__(self, thread_id: str):
        self.thread_id = thread_id
        self.components: Dict[str, SemanticComponent] = {}
        self.matrix_operations: List[Dict[str, Any]] = []
        self.creation_time = datetime.now()
    
    def register_matrix_components(self, matrix_name: str, matrix_content: List[List[str]]) -> List[str]:
        """Register all components from a matrix"""
        component_ids = []
        
        for row_idx, row in enumerate(matrix_content):
            for col_idx, content in enumerate(row):
                component_id = f"{self.thread_id}:{matrix_name}:{row_idx}:{col_idx}"
                
                component = SemanticComponent(
                    id=component_id,
                    initial_content=content,
                    matrix_position=(row_idx, col_idx),
                    matrix_name=matrix_name
                )
                
                self.components[component_id] = component
                component_ids.append(component_id)
        
        return component_ids
    
    def track_semantic_multiplication(self, 
                                    matrix_a_ids: List[str], 
                                    matrix_b_ids: List[str], 
                                    result_matrix: List[List[str]],
                                    operation_details: Dict[str, Any]):
        """Track semantic multiplication operation across components"""
        
        # Register result matrix components
        result_ids = self.register_matrix_components("C", result_matrix)
        
        # Track dependencies and transformations
        for result_idx, result_id in enumerate(result_ids):
            row, col = divmod(result_idx, len(result_matrix[0]))
            
            # Find source components that contributed to this result
            a_component_id = matrix_a_ids[result_idx] if result_idx < len(matrix_a_ids) else None
            b_component_id = matrix_b_ids[result_idx] if result_idx < len(matrix_b_ids) else None
            
            result_component = self.components[result_id]
            
            # Record dependencies
            if a_component_id:
                result_component.dependencies.append(a_component_id)
            if b_component_id:
                result_component.dependencies.append(b_component_id)
            
            # Record semantic context
            result_component.semantic_context.update({
                "operation": "semantic_multiplication",
                "source_a": self.components[a_component_id].initial_content if a_component_id else None,
                "source_b": self.components[b_component_id].initial_content if b_component_id else None,
                "operation_details": operation_details
            })
            
            # Update state to interpreted
            result_component.update_state(
                ComponentState.INTERPRETED,
                result_matrix[row][col],
                {
                    "operation": "semantic_multiplication",
                    "sources": [a_component_id, b_component_id],
                    "details": operation_details
                }
            )
    
    def track_interpretation(self, component_ids: List[str], interpreted_content: List[List[str]], operation_details: Dict[str, Any]):
        """Track interpretation operation"""
        for idx, component_id in enumerate(component_ids):
            if component_id in self.components:
                row, col = divmod(idx, len(interpreted_content[0]))
                
                self.components[component_id].update_state(
                    ComponentState.INTERPRETED,
                    interpreted_content[row][col],
                    {
                        "operation": "interpretation",
                        "details": operation_details
                    }
                )
    
    def track_elementwise_combination(self, 
                                    j_component_ids: List[str], 
                                    c_component_ids: List[str],
                                    result_content: List[List[str]],
                                    operation_details: Dict[str, Any]):
        """Track element-wise combination operation"""
        for idx, (j_id, c_id) in enumerate(zip(j_component_ids, c_component_ids)):
            row, col = divmod(idx, len(result_content[0]))
            
            # Create new component for combination result or update existing
            if j_id in self.components:
                component = self.components[j_id]
                component.dependencies.append(c_id)
                
                component.update_state(
                    ComponentState.COMBINED,
                    result_content[row][col],
                    {
                        "operation": "elementwise_combination",
                        "combined_with": c_id,
                        "details": operation_details
                    }
                )
    
    def track_final_resolution(self, component_id: str, resolved_content: str, implementation_details: Dict[str, Any]):
        """Track final resolution/implementation"""
        if component_id in self.components:
            self.components[component_id].update_state(
                ComponentState.RESOLVED,
                resolved_content,
                {
                    "operation": "final_resolution",
                    "implementation": implementation_details
                }
            )
    
    def get_component(self, component_id: str) -> Optional[SemanticComponent]:
        """Get specific component by ID"""
        return self.components.get(component_id)
    
    def get_components_by_matrix(self, matrix_name: str) -> List[SemanticComponent]:
        """Get all components from specific matrix"""
        return [comp for comp in self.components.values() if comp.matrix_name == matrix_name]
    
    def get_component_lineage(self, component_id: str) -> Dict[str, List[SemanticComponent]]:
        """Get complete lineage of component (ancestors and descendants)"""
        if component_id not in self.components:
            return {"ancestors": [], "descendants": []}
        
        component = self.components[component_id]
        
        # Find ancestors (dependencies)
        ancestors = []
        for dep_id in component.dependencies:
            if dep_id in self.components:
                ancestors.append(self.components[dep_id])
        
        # Find descendants (components that depend on this one)
        descendants = []
        for comp in self.components.values():
            if component_id in comp.dependencies:
                descendants.append(comp)
        
        return {"ancestors": ancestors, "descendants": descendants}
    
    def visualize_component_evolution(self, component_id: str) -> str:
        """Create text visualization of component evolution"""
        if component_id not in self.components:
            return f"Component {component_id} not found"
        
        component = self.components[component_id]
        
        viz = f"\n=== Component Evolution: {component_id} ===\n"
        viz += f"Matrix: {component.matrix_name} | Position: {component.matrix_position}\n\n"
        
        for state in ComponentState:
            if state in component.states:
                timestamp = component.timestamps[state].strftime("%H:%M:%S")
                viz += f"{state.value.upper():>12}: {component.states[state]}\n"
                viz += f"{'':>12}  @ {timestamp}\n\n"
        
        if component.dependencies:
            viz += "Dependencies:\n"
            for dep_id in component.dependencies:
                if dep_id in self.components:
                    dep_comp = self.components[dep_id]
                    viz += f"  - {dep_comp.initial_content} ({dep_comp.matrix_name})\n"
        
        return viz
    
    def export_component_data(self, filename: str):
        """Export all component data to JSON"""
        export_data = {
            "thread_id": self.thread_id,
            "creation_time": self.creation_time.isoformat(),
            "components": {comp_id: comp.to_dict() for comp_id, comp in self.components.items()},
            "matrix_operations": self.matrix_operations
        }
        
        with open(filename, 'w') as f:
            json.dump(export_data, f, indent=2)
    
    def load_component_data(self, filename: str):
        """Load component data from JSON"""
        with open(filename, 'r') as f:
            data = json.load(f)
        
        self.thread_id = data["thread_id"]
        self.creation_time = datetime.fromisoformat(data["creation_time"])
        self.matrix_operations = data["matrix_operations"]
        
        # Reconstruct components
        for comp_id, comp_data in data["components"].items():
            component = SemanticComponent(
                id=comp_data["id"],
                initial_content=comp_data["initial_content"],
                matrix_position=tuple(comp_data["matrix_position"]),
                matrix_name=comp_data["matrix_name"]
            )
            
            # Restore states
            for state_name, content in comp_data["states"].items():
                if state_name != ComponentState.INITIAL.value:
                    component.states[ComponentState(state_name)] = content
            
            # Restore timestamps
            for state_name, timestamp_str in comp_data["timestamps"].items():
                component.timestamps[ComponentState(state_name)] = datetime.fromisoformat(timestamp_str)
            
            # Restore other data
            component.operations = comp_data["operations"]
            component.semantic_context = comp_data["semantic_context"]
            component.dependencies = comp_data["dependencies"]
            
            self.components[comp_id] = component

def demo_usage():
    """Demonstrate semantic component tracking"""
    print("=== CF14 Semantic Component Tracker Demo ===\n")
    
    # Initialize tracker
    tracker = SemanticComponentTracker("demo_thread")
    
    # Register initial matrices
    matrix_a = [["Values", "Actions"], ["Principles", "Methods"]]
    matrix_b = [["Necessary", "Sufficient"], ["Contingent", "Insufficient"]]
    
    a_ids = tracker.register_matrix_components("A", matrix_a)
    b_ids = tracker.register_matrix_components("B", matrix_b)
    
    print("Registered initial components:")
    for comp_id in a_ids + b_ids:
        comp = tracker.get_component(comp_id)
        print(f"  {comp.matrix_name}[{comp.matrix_position}]: {comp.initial_content}")
    
    # Simulate semantic multiplication
    result_matrix = [["Essential Values", "Required Actions"], ["Foundational Principles", "Core Methods"]]
    
    tracker.track_semantic_multiplication(
        a_ids, b_ids, result_matrix,
        {"operation": "semantic_multiplication", "resolver": "demo", "timestamp": datetime.now().isoformat()}
    )
    
    print("\n=== Component Evolution Examples ===")
    
    # Show evolution of first component
    first_result_id = f"demo_thread:C:0:0"
    print(tracker.visualize_component_evolution(first_result_id))
    
    # Show lineage
    lineage = tracker.get_component_lineage(first_result_id)
    print("=== Component Lineage ===")
    print(f"Ancestors: {[comp.initial_content for comp in lineage['ancestors']]}")
    print(f"Descendants: {[comp.initial_content for comp in lineage['descendants']]}")

if __name__ == "__main__":
    demo_usage()