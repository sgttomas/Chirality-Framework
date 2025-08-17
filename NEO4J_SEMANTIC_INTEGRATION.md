# Neo4j Semantic Component Integration

## Enhanced Schema Design

### Current Neo4j Adapter Capabilities
The existing `neo4j_adapter.py` provides basic matrix/cell persistence with:
- Matrix and Cell node creation with constraints
- Thread-based operation grouping
- Lineage tracking between matrices
- Basic querying by type and thread

### Enhanced Schema for Semantic Component Tracking

#### Node Types

```cypher
// Enhanced Component node (extends current Matrix)
CREATE CONSTRAINT component_id FOR (c:Component) REQUIRE c.id IS UNIQUE;
CREATE INDEX component_station FOR (c:Component) ON (c.station);
CREATE INDEX component_thread FOR (c:Component) ON (c.thread_id);

// Component state snapshots
CREATE CONSTRAINT state_id FOR (s:ComponentState) REQUIRE s.id IS UNIQUE;
CREATE INDEX state_component FOR (s:ComponentState) ON (s.component_id);
CREATE INDEX state_type FOR (s:ComponentState) ON (s.state_type);

// Semantic operations audit trail
CREATE CONSTRAINT operation_id FOR (o:SemanticOperation) REQUIRE o.id IS UNIQUE;
CREATE INDEX operation_type FOR (o:SemanticOperation) ON (o.operation_type);
CREATE INDEX operation_timestamp FOR (o:SemanticOperation) ON (o.timestamp);

// Thread-level semantic context
CREATE CONSTRAINT thread_id FOR (t:SemanticThread) REQUIRE t.id IS UNIQUE;
CREATE INDEX thread_domain FOR (t:SemanticThread) ON (t.domain);
```

#### Node Properties

```python
# Component node properties
{
    "id": "software_dev_process:A:0:0",
    "matrix_name": "A", 
    "matrix_position": [0, 0],
    "thread_id": "software_dev_process",
    "initial_content": "Quality",
    "current_state": "resolved",
    "created_at": "2025-08-17T01:20:59.864330",
    "updated_at": "2025-08-17T01:20:59.864420",
    # CF14-specific properties
    "station": "problem_statement",
    "semantic_domain": "software_development",
    "ontology_binding": "cf14:software_dev:A:0:0:a1b2c3"
}

# ComponentState node properties  
{
    "id": "state_uuid_here",
    "component_id": "software_dev_process:A:0:0",
    "state_type": "interpreted|combined|resolved",
    "content": "Quality Critical",
    "timestamp": "2025-08-17T01:20:59.864359",
    "operation_metadata": {
        "operation": "semantic_multiplication",
        "resolver": "openai_gpt4",
        "sources": ["software_dev_process:A:0:0", "software_dev_process:B:0:0"]
    }
}

# SemanticOperation node properties
{
    "id": "operation_uuid_here", 
    "operation_type": "semantic_multiplication|elementwise_combination|final_synthesis",
    "resolver": "demo|openai_gpt4|anthropic_claude",
    "timestamp": "2025-08-17T01:20:59.864349",
    "input_components": ["software_dev_process:A:0:0", "software_dev_process:B:0:0"],
    "output_component": "software_dev_process:C:0:0",
    "performance_metrics": {
        "duration_ms": 1250,
        "api_calls": 1,
        "tokens_used": 350
    }
}
```

#### Relationship Types

```cypher
// Component state evolution
(:Component)-[:HAS_STATE {sequence: 1, is_current: true}]->(:ComponentState)

// Semantic operation lineage  
(:SemanticOperation)-[:PRODUCES {role: "output"}]->(:Component)
(:SemanticOperation)-[:CONSUMES {role: "input", index: 0}]->(:Component)

// Component dependencies (computed from operations)
(:Component)-[:DEPENDS_ON {operation_type: "semantic_multiplication"}]->(:Component)

// Thread membership
(:SemanticThread)-[:CONTAINS {position: [0,0]}]->(:Component)

// Semantic derivation (high-level relationships)
(:Component)-[:DERIVES_FROM {operation: "A*B=C"}]->(:Component)
```

## Enhanced Neo4j Adapter Implementation

### Extended Adapter Class

```python
class EnhancedNeo4jAdapter(Neo4jAdapter):
    """Enhanced Neo4j adapter with semantic component tracking."""
    
    def save_semantic_component(self, component: SemanticComponent) -> None:
        """Save complete semantic component with state history."""
        with self.driver.session() as session:
            # Create or update component node
            session.run("""
                MERGE (c:Component {id: $id})
                SET c.matrix_name = $matrix_name,
                    c.matrix_position = $matrix_position,
                    c.thread_id = $thread_id,
                    c.initial_content = $initial_content,
                    c.current_state = $current_state,
                    c.updated_at = datetime(),
                    c.semantic_domain = $semantic_domain,
                    c.ontology_binding = $ontology_binding
                ON CREATE SET c.created_at = datetime()
                """, 
                id=component.id,
                matrix_name=component.matrix_name,
                matrix_position=component.matrix_position,
                thread_id=component.thread_id,
                initial_content=component.initial_content,
                current_state=component.get_current_state().value,
                semantic_domain=component.semantic_context.get("domain"),
                ontology_binding=component.get_ontology_address()
            )
            
            # Save state history
            for state, content in component.states.items():
                self._save_component_state(session, component.id, state, content, 
                                         component.timestamps.get(state))
            
            # Save operations
            for operation in component.operations:
                self._save_semantic_operation(session, component.id, operation)
    
    def _save_component_state(self, session, component_id: str, 
                            state: ComponentState, content: str, 
                            timestamp: datetime) -> None:
        """Save individual component state."""
        session.run("""
            MATCH (c:Component {id: $component_id})
            MERGE (c)-[:HAS_STATE {sequence: $sequence}]->(s:ComponentState {
                component_id: $component_id,
                state_type: $state_type
            })
            SET s.content = $content,
                s.timestamp = $timestamp,
                s.id = randomUUID()
            """,
            component_id=component_id,
            state_type=state.value,
            content=content,
            timestamp=timestamp.isoformat(),
            sequence=len([s for s in ComponentState if s.value <= state.value])
        )
    
    def _save_semantic_operation(self, session, component_id: str, 
                               operation: Dict[str, Any]) -> None:
        """Save semantic operation with lineage."""
        session.run("""
            MERGE (op:SemanticOperation {id: randomUUID()})
            SET op.operation_type = $operation_type,
                op.resolver = $resolver,
                op.timestamp = $timestamp,
                op.performance_metrics = $performance_metrics
            
            WITH op
            MATCH (output:Component {id: $component_id})
            MERGE (op)-[:PRODUCES {role: "output"}]->(output)
            """,
            operation_type=operation["operation"]["operation"],
            resolver=operation["operation"].get("resolver", "unknown"),
            timestamp=operation["timestamp"],
            component_id=component_id,
            performance_metrics=json.dumps(operation["operation"].get("performance", {}))
        )
    
    def load_semantic_component(self, component_id: str) -> Optional[SemanticComponent]:
        """Load complete semantic component with state history."""
        with self.driver.session() as session:
            # Get component basic info
            result = session.run("""
                MATCH (c:Component {id: $id})
                RETURN c
                """, id=component_id)
            
            record = result.single()
            if not record:
                return None
            
            component_data = record["c"]
            
            # Get state history
            states_result = session.run("""
                MATCH (c:Component {id: $id})-[:HAS_STATE]->(s:ComponentState)
                RETURN s
                ORDER BY s.timestamp ASC
                """, id=component_id)
            
            states = {}
            timestamps = {}
            for record in states_result:
                state_data = record["s"]
                state_type = ComponentState(state_data["state_type"])
                states[state_type] = state_data["content"]
                timestamps[state_type] = datetime.fromisoformat(state_data["timestamp"])
            
            # Get operations
            operations_result = session.run("""
                MATCH (op:SemanticOperation)-[:PRODUCES]->(c:Component {id: $id})
                RETURN op
                ORDER BY op.timestamp ASC
                """, id=component_id)
            
            operations = []
            for record in operations_result:
                op_data = record["op"]
                operations.append({
                    "state": "interpreted",  # Would need more logic to determine
                    "operation": {
                        "operation": op_data["operation_type"],
                        "resolver": op_data["resolver"],
                        "timestamp": op_data["timestamp"]
                    },
                    "timestamp": op_data["timestamp"]
                })
            
            return SemanticComponent(
                id=component_data["id"],
                initial_content=component_data["initial_content"],
                matrix_position=component_data["matrix_position"],
                matrix_name=component_data["matrix_name"],
                states=states,
                operations=operations,
                timestamps=timestamps
            )
    
    def query_components_by_state(self, state: ComponentState, 
                                thread_id: Optional[str] = None) -> List[Dict]:
        """Query components by current state."""
        with self.driver.session() as session:
            query = """
                MATCH (c:Component)
                WHERE c.current_state = $state
            """
            params = {"state": state.value}
            
            if thread_id:
                query += " AND c.thread_id = $thread_id"
                params["thread_id"] = thread_id
            
            query += """
                RETURN c.id as id, c.matrix_name as matrix_name, 
                       c.matrix_position as position, c.initial_content as content
                ORDER BY c.updated_at DESC
            """
            
            results = []
            for record in session.run(query, **params):
                results.append({
                    "id": record["id"],
                    "matrix_name": record["matrix_name"],
                    "position": record["position"],
                    "content": record["content"]
                })
            
            return results
    
    def get_operation_trace(self, component_id: str) -> List[Dict]:
        """Get complete operation trace for a component."""
        with self.driver.session() as session:
            result = session.run("""
                MATCH path = (source:Component)-[:DEPENDS_ON*0..]->(c:Component {id: $id})
                WITH nodes(path) as components
                UNWIND components as comp
                MATCH (op:SemanticOperation)-[:PRODUCES]->(comp)
                OPTIONAL MATCH (op)-[:CONSUMES]->(input:Component)
                RETURN op, comp, collect(input) as inputs
                ORDER BY op.timestamp ASC
                """, id=component_id)
            
            trace = []
            for record in result:
                op_data = record["op"]
                comp_data = record["comp"]
                inputs = record["inputs"]
                
                trace.append({
                    "operation": op_data["operation_type"],
                    "timestamp": op_data["timestamp"],
                    "component": comp_data["id"],
                    "inputs": [inp["id"] for inp in inputs],
                    "resolver": op_data["resolver"]
                })
            
            return trace
```

## Integration with Current Semantic Component Tracker

### Persistence Layer Enhancement

```python
class SemanticComponentManager:
    """Enhanced manager with Neo4j persistence."""
    
    def __init__(self, neo4j_adapter: EnhancedNeo4jAdapter):
        self.neo4j = neo4j_adapter
        self.tracker = SemanticComponentTracker()
    
    def create_component(self, component: SemanticComponent) -> None:
        """Create component with dual persistence."""
        # Add to in-memory tracker
        self.tracker.add_component(component)
        
        # Persist to Neo4j
        self.neo4j.save_semantic_component(component)
    
    def update_component_state(self, component_id: str, 
                             new_state: ComponentState, 
                             content: str,
                             operation: Dict[str, Any]) -> None:
        """Update component state with persistence."""
        # Update in-memory
        self.tracker.update_component_state(component_id, new_state, content, operation)
        
        # Persist changes
        component = self.tracker.get_component(component_id)
        if component:
            self.neo4j.save_semantic_component(component)
    
    def get_component_evolution(self, component_id: str) -> Dict[str, Any]:
        """Get complete component evolution from Neo4j."""
        return {
            "component": self.neo4j.load_semantic_component(component_id),
            "operation_trace": self.neo4j.get_operation_trace(component_id),
            "state_transitions": self._get_state_transitions(component_id)
        }
    
    def query_semantic_workspace(self, filters: Dict[str, Any]) -> Dict[str, Any]:
        """Query semantic workspace with advanced filters."""
        return {
            "by_state": {
                state.value: self.neo4j.query_components_by_state(state, 
                    filters.get("thread_id"))
                for state in ComponentState
            },
            "operation_statistics": self._get_operation_statistics(filters),
            "semantic_graph": self._build_semantic_graph(filters)
        }
```

## Performance Optimizations

### Indexing Strategy
```cypher
// Composite indexes for common query patterns
CREATE INDEX component_thread_state FOR (c:Component) ON (c.thread_id, c.current_state);
CREATE INDEX operation_type_timestamp FOR (o:SemanticOperation) ON (o.operation_type, o.timestamp);
CREATE INDEX state_component_sequence FOR (s:ComponentState) ON (s.component_id, s.sequence);
```

### Connection Pooling
```python
# Enhanced connection configuration
NEO4J_CONFIG = {
    "max_connection_pool_size": 50,
    "connection_acquisition_timeout": 60000,  # 60 seconds
    "max_transaction_retry_time": 30000,      # 30 seconds  
    "resolver_timeout": 300000                # 5 minutes for semantic operations
}
```

### Batch Operations
```python
def batch_save_components(self, components: List[SemanticComponent]) -> None:
    """Batch save multiple components efficiently."""
    with self.driver.session() as session:
        with session.begin_transaction() as tx:
            for component in components:
                # Use parameterized queries for batch efficiency
                self._save_component_batch(tx, component)
            tx.commit()
```

## Testing and Validation

### Integration Test Suite
```python
class TestNeo4jSemanticIntegration:
    def test_component_state_evolution(self):
        """Test complete component lifecycle."""
        # Create component
        # Update through all states  
        # Verify persistence
        # Check operation trace
        
    def test_semantic_operation_lineage(self):
        """Test operation dependency tracking."""
        # Create A, B components
        # Perform A*B=C operation
        # Verify lineage relationships
        
    def test_query_performance(self):
        """Test query performance with large datasets."""
        # Create 1000+ components
        # Measure query response times
        # Verify index usage
```

This enhanced Neo4j integration provides complete semantic component lifecycle management with persistence, querying capabilities, and performance optimization for the cell-based semantic memory architecture.