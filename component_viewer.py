#!/usr/bin/env python3
"""
Interactive Component Viewer for CF14 Semantic Components
Simple CLI interface to explore semantic component transformations
"""

import os
import sys
from semantic_component_tracker import SemanticComponentTracker, ComponentState
from typing import List, Optional

class ComponentViewer:
    """Interactive CLI viewer for semantic components"""
    
    def __init__(self, tracker: SemanticComponentTracker):
        self.tracker = tracker
        self.current_component = None
        
    def display_menu(self):
        """Display main menu options"""
        print("\n" + "="*60)
        print("CF14 SEMANTIC COMPONENT VIEWER")
        print("="*60)
        print("1. List all components")
        print("2. View component by ID")
        print("3. Browse components by matrix")
        print("4. Show component evolution")
        print("5. Show component lineage")
        print("6. Search components by content")
        print("7. Export current view")
        print("8. Load tracker data")
        print("9. Save tracker data")
        print("0. Exit")
        print("-"*60)
    
    def list_all_components(self):
        """List all components with basic info"""
        print(f"\nAll Components in Thread: {self.tracker.thread_id}")
        print("-"*80)
        print(f"{'ID':<25} {'Matrix':<8} {'Position':<10} {'Initial Content':<30}")
        print("-"*80)
        
        for comp_id, component in self.tracker.components.items():
            position = f"({component.matrix_position[0]},{component.matrix_position[1]})"
            content = component.initial_content[:27] + "..." if len(component.initial_content) > 30 else component.initial_content
            print(f"{comp_id:<25} {component.matrix_name:<8} {position:<10} {content:<30}")
    
    def view_component_by_id(self):
        """View specific component by ID"""
        comp_id = input("\nEnter component ID: ").strip()
        component = self.tracker.get_component(comp_id)
        
        if not component:
            print(f"Component '{comp_id}' not found.")
            return
        
        self.current_component = comp_id
        self.display_component_details(component)
    
    def browse_by_matrix(self):
        """Browse components grouped by matrix"""
        matrices = set(comp.matrix_name for comp in self.tracker.components.values())
        
        print(f"\nAvailable matrices: {', '.join(sorted(matrices))}")
        matrix_name = input("Enter matrix name: ").strip()
        
        components = self.tracker.get_components_by_matrix(matrix_name)
        if not components:
            print(f"No components found for matrix '{matrix_name}'")
            return
        
        print(f"\nComponents in Matrix {matrix_name}:")
        print("-"*60)
        
        for i, component in enumerate(components, 1):
            position = f"({component.matrix_position[0]},{component.matrix_position[1]})"
            print(f"{i}. {position} - {component.initial_content}")
        
        try:
            choice = int(input(f"\nSelect component (1-{len(components)}): "))
            if 1 <= choice <= len(components):
                selected = components[choice-1]
                self.current_component = selected.id
                self.display_component_details(selected)
        except ValueError:
            print("Invalid selection.")
    
    def display_component_details(self, component):
        """Display detailed component information"""
        print(f"\n{'='*60}")
        print(f"COMPONENT DETAILS: {component.id}")
        print(f"{'='*60}")
        print(f"Matrix: {component.matrix_name}")
        print(f"Position: {component.matrix_position}")
        print(f"Dependencies: {len(component.dependencies)} components")
        
        print(f"\nSTATES EVOLUTION:")
        print("-"*40)
        
        state_order = [ComponentState.INITIAL, ComponentState.INTERPRETED, ComponentState.COMBINED, ComponentState.RESOLVED]
        
        for state in state_order:
            if state in component.states:
                timestamp = component.timestamps[state].strftime("%Y-%m-%d %H:%M:%S")
                print(f"{state.value.upper():>12}: {component.states[state]}")
                print(f"{'':>12}  @ {timestamp}")
                
                # Show operation details if available
                for op in component.operations:
                    if op.get('state') == state.value and state != ComponentState.INITIAL:
                        operation_type = op.get('operation', {}).get('operation', 'unknown')
                        print(f"{'':>12}  Operation: {operation_type}")
                print()
        
        if component.semantic_context:
            print("SEMANTIC CONTEXT:")
            print("-"*20)
            for key, value in component.semantic_context.items():
                if key != 'operation_details':  # Skip verbose details
                    print(f"  {key}: {value}")
    
    def show_component_evolution(self):
        """Show evolution visualization for current or selected component"""
        if not self.current_component:
            comp_id = input("\nEnter component ID: ").strip()
        else:
            comp_id = self.current_component
            
        evolution = self.tracker.visualize_component_evolution(comp_id)
        print(evolution)
    
    def show_component_lineage(self):
        """Show component lineage (ancestors and descendants)"""
        if not self.current_component:
            comp_id = input("\nEnter component ID: ").strip()
        else:
            comp_id = self.current_component
            
        lineage = self.tracker.get_component_lineage(comp_id)
        
        print(f"\nLINEAGE FOR: {comp_id}")
        print("="*50)
        
        print("\nANCESTORS (Dependencies):")
        if lineage["ancestors"]:
            for ancestor in lineage["ancestors"]:
                print(f"  - {ancestor.id}: {ancestor.initial_content}")
        else:
            print("  None")
        
        print("\nDESCENDANTS (Dependents):")
        if lineage["descendants"]:
            for descendant in lineage["descendants"]:
                print(f"  - {descendant.id}: {descendant.initial_content}")
        else:
            print("  None")
    
    def search_components(self):
        """Search components by content"""
        query = input("\nEnter search term: ").strip().lower()
        
        matches = []
        for component in self.tracker.components.values():
            # Search in all states
            for state, content in component.states.items():
                if query in content.lower():
                    matches.append((component, state, content))
                    break
        
        if not matches:
            print(f"No components found containing '{query}'")
            return
        
        print(f"\nSEARCH RESULTS for '{query}':")
        print("-"*60)
        
        for i, (component, state, content) in enumerate(matches, 1):
            print(f"{i}. {component.matrix_name}[{component.matrix_position}] - {state.value}")
            print(f"   {content}")
        
        try:
            choice = int(input(f"\nSelect component (1-{len(matches)}): "))
            if 1 <= choice <= len(matches):
                selected = matches[choice-1][0]
                self.current_component = selected.id
                self.display_component_details(selected)
        except ValueError:
            print("Invalid selection.")
    
    def export_current_view(self):
        """Export current component view to file"""
        if not self.current_component:
            print("No component currently selected.")
            return
        
        filename = input("Enter filename (default: component_export.txt): ").strip()
        if not filename:
            filename = "component_export.txt"
        
        component = self.tracker.get_component(self.current_component)
        evolution = self.tracker.visualize_component_evolution(self.current_component)
        lineage = self.tracker.get_component_lineage(self.current_component)
        
        with open(filename, 'w') as f:
            f.write("CF14 SEMANTIC COMPONENT EXPORT\n")
            f.write("="*50 + "\n\n")
            f.write(evolution)
            f.write(f"\n\nLINEAGE:\n")
            f.write(f"Ancestors: {[comp.initial_content for comp in lineage['ancestors']]}\n")
            f.write(f"Descendants: {[comp.initial_content for comp in lineage['descendants']]}\n")
        
        print(f"Component data exported to {filename}")
    
    def load_data(self):
        """Load tracker data from file"""
        filename = input("Enter filename to load: ").strip()
        if os.path.exists(filename):
            try:
                self.tracker.load_component_data(filename)
                print(f"Data loaded from {filename}")
                print(f"Thread: {self.tracker.thread_id}")
                print(f"Components: {len(self.tracker.components)}")
            except Exception as e:
                print(f"Error loading data: {e}")
        else:
            print(f"File {filename} not found.")
    
    def save_data(self):
        """Save tracker data to file"""
        filename = input("Enter filename to save (default: components.json): ").strip()
        if not filename:
            filename = "components.json"
        
        try:
            self.tracker.export_component_data(filename)
            print(f"Data saved to {filename}")
        except Exception as e:
            print(f"Error saving data: {e}")
    
    def run(self):
        """Main interactive loop"""
        while True:
            self.display_menu()
            if self.current_component:
                print(f"Current component: {self.current_component}")
            
            try:
                choice = input("\nSelect option: ").strip()
                
                if choice == "0":
                    print("Goodbye!")
                    break
                elif choice == "1":
                    self.list_all_components()
                elif choice == "2":
                    self.view_component_by_id()
                elif choice == "3":
                    self.browse_by_matrix()
                elif choice == "4":
                    self.show_component_evolution()
                elif choice == "5":
                    self.show_component_lineage()
                elif choice == "6":
                    self.search_components()
                elif choice == "7":
                    self.export_current_view()
                elif choice == "8":
                    self.load_data()
                elif choice == "9":
                    self.save_data()
                else:
                    print("Invalid option. Please try again.")
                
                input("\nPress Enter to continue...")
                
            except KeyboardInterrupt:
                print("\n\nGoodbye!")
                break
            except Exception as e:
                print(f"Error: {e}")
                input("Press Enter to continue...")

def main():
    """Main entry point"""
    if len(sys.argv) > 1:
        # Load existing data file
        filename = sys.argv[1]
        tracker = SemanticComponentTracker("loaded_thread")
        if os.path.exists(filename):
            tracker.load_component_data(filename)
            print(f"Loaded data from {filename}")
        else:
            print(f"File {filename} not found. Starting with empty tracker.")
    else:
        # Create demo data
        tracker = SemanticComponentTracker("demo_thread")
        
        # Add some demo components
        matrix_a = [["Values", "Actions"], ["Principles", "Methods"]]
        matrix_b = [["Necessary", "Sufficient"], ["Contingent", "Insufficient"]]
        result_matrix = [["Essential Values", "Required Actions"], ["Foundational Principles", "Core Methods"]]
        
        a_ids = tracker.register_matrix_components("A", matrix_a)
        b_ids = tracker.register_matrix_components("B", matrix_b)
        
        tracker.track_semantic_multiplication(
            a_ids, b_ids, result_matrix,
            {"operation": "semantic_multiplication", "resolver": "demo"}
        )
        
        print("Demo data loaded. Use menu to explore components.")
    
    viewer = ComponentViewer(tracker)
    viewer.run()

if __name__ == "__main__":
    main()