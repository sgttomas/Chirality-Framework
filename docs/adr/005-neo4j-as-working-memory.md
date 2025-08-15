# ADR-005: Neo4j as Persistent Working Memory

## Status

Accepted

## Context

The Chirality Framework requires a sophisticated data storage solution that can:

1. **Persistent Semantic Memory**: Store semantic matrix operations with full provenance and traceability
2. **Graph Relationships**: Model complex relationships between components, cells, stations, terms, and ontologies
3. **Working Memory**: Serve as active working memory during multi-step semantic operations
4. **Concurrent Access**: Support simultaneous access from CLI tools, GraphQL service, and admin UI
5. **Semantic Queries**: Enable complex queries about semantic relationships and transformations

Storage options considered:
- **File-based Storage**: JSON files for matrix storage (original approach)
- **Relational Database**: PostgreSQL with proper schema design
- **Document Database**: MongoDB for flexible schema evolution
- **Graph Database**: Neo4j for native graph operations
- **Hybrid Approach**: Multiple storage systems for different data types

Key requirements:
- Store complete semantic operation history (A×B=C, J⊙C=F, A+F=D)
- Maintain relationships between cells and their transformations
- Support real-time queries during matrix generation
- Enable complex semantic queries and analysis
- Provide UFO ontology integration

## Decision

We chose **Neo4j as the primary persistent working memory** with the following architecture:

### Graph Model
```
(Component:Matrix)─[:HAS_CELL]→(Cell)─[:CONTAINS]→(Term:UFO)
     │                          │
     ├─[:AT_STATION]→(Station)  ├─[:HAS_STAGE]→(Stage)
     └─[:IN_VALLEY]→(Valley)    └─[:DERIVED_FROM]→(Cell)

(Ontology)─[:DEFINES]→(Term)
(DomainPack)─[:CONTAINS]→(Ontology)
```

### Core Node Types
- **Component**: Semantic matrices (A, B, C, F, D, J)
- **Cell**: Individual matrix positions with semantic content
- **Station**: Semantic valley stations (Problem, Requirements, Objectives, etc.)
- **Valley**: Semantic valley layout and configuration
- **Term**: UFO ontology terms and semantic content
- **Stage**: Semantic operation stages (raw, product, interpretation)
- **Ontology**: UFO categories and domain-specific ontologies
- **DomainPack**: Collections of ontologies for specific domains

### Relationship Types
- **HAS_CELL**: Component contains cells
- **CONTAINS**: Cell contains semantic terms
- **AT_STATION**: Component positioned at semantic valley station
- **IN_VALLEY**: Component part of semantic valley
- **HAS_STAGE**: Cell has semantic operation stages
- **DERIVED_FROM**: Cell derived from other cells (provenance)
- **DEFINES**: Ontology defines terms
- **TYPED_AS**: Term has UFO ontology type

## Consequences

### Positive Consequences

1. **Native Graph Operations**: Natural representation of semantic relationships
2. **Full Provenance**: Complete history of semantic operations and transformations
3. **Real-time Working Memory**: Active storage during multi-step operations
4. **Complex Queries**: Sophisticated semantic analysis and relationship discovery
5. **Concurrent Access**: Multiple services can access and modify data simultaneously
6. **ACID Transactions**: Ensures data consistency during complex operations
7. **Performance**: Optimized graph traversal and relationship queries
8. **UFO Integration**: Natural modeling of ontological relationships
9. **Scalability**: Handles large semantic networks efficiently

### Negative Consequences

1. **Complexity**: Graph database requires specialized knowledge and tooling
2. **Query Language**: Cypher learning curve for developers
3. **Data Migration**: Complex migration from file-based storage
4. **Infrastructure**: Additional database service to manage and monitor
5. **Backup Complexity**: Graph database backup and recovery procedures
6. **Cost**: Neo4j Aura or enterprise licensing costs
7. **Debugging**: Graph queries can be complex to debug and optimize

### Mitigation Strategies

1. **GraphQL Abstraction**: @neo4j/graphql library abstracts Cypher complexity
2. **Training and Documentation**: Comprehensive Cypher and graph modeling training
3. **Migration Tools**: Automated tools for data migration from JSON files
4. **Monitoring**: Comprehensive database monitoring and alerting
5. **Backup Strategy**: Automated backup and point-in-time recovery
6. **Development Environment**: Local Neo4j setup for development and testing
7. **Query Optimization**: Performance monitoring and query optimization tools

## Implementation Notes

### Data Model Schema
```cypher
// Component (Matrix) nodes
CREATE CONSTRAINT component_id IF NOT EXISTS FOR (c:Component) REQUIRE c.id IS UNIQUE;

// Cell nodes with position and content
CREATE CONSTRAINT cell_id IF NOT EXISTS FOR (cell:Cell) REQUIRE cell.id IS UNIQUE;

// Station nodes for semantic valley
CREATE CONSTRAINT station_name IF NOT EXISTS FOR (s:Station) REQUIRE s.name IS UNIQUE;

// UFO ontology terms
CREATE CONSTRAINT term_id IF NOT EXISTS FOR (t:Term) REQUIRE t.id IS UNIQUE;

// Example component structure
CREATE (a:Component {
  id: 'A',
  name: 'Problem Statement',
  station: 'Problem',
  shape: [3, 4],
  matrix_type: 'axiomatic',
  created_at: datetime(),
  updated_at: datetime()
})

CREATE (cell:Cell {
  id: 'A_0_0',
  i: 0,
  j: 0,
  resolved: 'Problem.Systematic.Analysis',
  raw_terms: ['Problem', 'Systematic', 'Analysis'],
  intermediate: ['Problem * Systematic = Problem.Systematic', 'Problem.Systematic * Analysis = Problem.Systematic.Analysis'],
  created_at: datetime(),
  updated_at: datetime()
})

CREATE (a)-[:HAS_CELL]->(cell)
```

### Semantic Operation Tracking
```cypher
// Track semantic multiplication operation
MATCH (a_cell:Cell {id: 'A_0_0'}), (b_cell:Cell {id: 'B_0_0'})
CREATE (c_cell:Cell {
  id: 'C_0_0',
  i: 0,
  j: 0,
  operation: 'semantic_multiply',
  operation_timestamp: datetime()
})
CREATE (c_cell)-[:DERIVED_FROM {operation: 'multiply', timestamp: datetime()}]->(a_cell)
CREATE (c_cell)-[:DERIVED_FROM {operation: 'multiply', timestamp: datetime()}]->(b_cell)
```

### UFO Ontology Integration
```cypher
// UFO ontology terms
CREATE (systematic:Term:UFO {
  id: 'ufo_systematic',
  name: 'Systematic',
  ufo_category: 'Mode',
  definition: 'A mode that characterizes systematic approaches',
  domain: 'analysis'
})

CREATE (analysis:Term:UFO {
  id: 'ufo_analysis',
  name: 'Analysis',
  ufo_category: 'Process',
  definition: 'A perdurant that involves examining components',
  domain: 'cognitive'
})

// Link cell content to UFO terms
MATCH (cell:Cell {id: 'A_0_0'}), (systematic:Term {name: 'Systematic'})
CREATE (cell)-[:CONTAINS]->(systematic)
```

### Performance Optimization
```cypher
// Indexes for common query patterns
CREATE INDEX cell_position IF NOT EXISTS FOR (c:Cell) ON (c.i, c.j);
CREATE INDEX component_station IF NOT EXISTS FOR (c:Component) ON c.station;
CREATE INDEX term_ufo_category IF NOT EXISTS FOR (t:Term) ON t.ufo_category;
CREATE INDEX operation_timestamp IF NOT EXISTS FOR ()-[r:DERIVED_FROM]-() ON r.timestamp;
```

### Migration Strategy
```python
# Migration from JSON files to Neo4j
def migrate_matrix_to_neo4j(matrix_json: dict, driver: Driver):
    with driver.session() as session:
        # Create component node
        session.run("""
            MERGE (c:Component {id: $id})
            SET c.name = $name,
                c.station = $station,
                c.shape = $shape,
                c.migrated_at = datetime()
        """, matrix_json)
        
        # Create cell nodes and relationships
        for i, row in enumerate(matrix_json['cells']):
            for j, cell_data in enumerate(row):
                session.run("""
                    MATCH (c:Component {id: $component_id})
                    MERGE (cell:Cell {id: $cell_id})
                    SET cell.i = $i,
                        cell.j = $j,
                        cell.resolved = $resolved,
                        cell.raw_terms = $raw_terms,
                        cell.intermediate = $intermediate
                    MERGE (c)-[:HAS_CELL]->(cell)
                """, {
                    'component_id': matrix_json['id'],
                    'cell_id': f"{matrix_json['id']}_{i}_{j}",
                    'i': i, 'j': j,
                    'resolved': cell_data.get('resolved'),
                    'raw_terms': cell_data.get('raw_terms', []),
                    'intermediate': cell_data.get('intermediate', [])
                })
```

### Query Patterns
```cypher
-- Get all components at a station
MATCH (c:Component {station: 'Requirements'})
RETURN c;

-- Get cell with provenance
MATCH (cell:Cell {id: 'C_0_0'})-[:DERIVED_FROM*]->(source:Cell)
RETURN cell, source;

-- Find cells containing specific UFO terms
MATCH (cell:Cell)-[:CONTAINS]->(term:Term {ufo_category: 'Process'})
RETURN cell, term;

-- Semantic operation history
MATCH (result:Cell)-[r:DERIVED_FROM]->(source:Cell)
WHERE r.operation = 'semantic_multiply'
RETURN result, r, source
ORDER BY r.timestamp DESC;

-- Complex semantic relationships
MATCH path = (a:Component {id: 'A'})-[:HAS_CELL]->(a_cell:Cell)
            -[:DERIVED_FROM]->(c_cell:Cell)<-[:HAS_CELL]-(c:Component {id: 'C'})
            -[:HAS_CELL]->(f_cell:Cell)-[:DERIVED_FROM]->(j_cell:Cell)
RETURN path;
```

### GraphQL Integration
```typescript
// Automatic GraphQL resolvers via @neo4j/graphql
const typeDefs = `
  type Component {
    id: ID!
    name: String!
    station: String!
    shape: [Int!]!
    cells: [Cell!]! @relationship(type: "HAS_CELL", direction: OUT)
    createdAt: DateTime! @timestamp(operations: [CREATE])
    updatedAt: DateTime! @timestamp(operations: [UPDATE])
  }
  
  type Cell {
    id: ID!
    i: Int!
    j: Int!
    resolved: String
    rawTerms: [String!]!
    intermediate: [String!]!
    component: Component! @relationship(type: "HAS_CELL", direction: IN)
    derivedFrom: [Cell!]! @relationship(type: "DERIVED_FROM", direction: OUT)
    terms: [Term!]! @relationship(type: "CONTAINS", direction: OUT)
  }
`;
```

### Backup and Recovery
```bash
# Automated backup strategy
# Daily full backups
neo4j-admin backup --backup-dir=/backups/daily/$(date +%Y-%m-%d) --database=chirality

# Point-in-time recovery
neo4j-admin restore --from=/backups/daily/2025-01-15 --database=chirality_restore

# Export for analysis
neo4j-admin export --database=chirality --to=/exports/chirality_$(date +%Y%m%d).dump
```

### Monitoring and Alerting
```cypher
-- Performance monitoring queries
CALL db.stats.retrieve('GRAPH COUNTS') YIELD section, data;
CALL dbms.queryJmx('org.neo4j:instance=kernel#0,name=Transactions') YIELD attributes;

-- Data integrity checks
MATCH (c:Component) WHERE size(c.shape) <> 2 RETURN c; // Invalid shapes
MATCH (cell:Cell) WHERE cell.i IS NULL OR cell.j IS NULL RETURN cell; // Invalid positions
```

## References

- [Neo4j Documentation](https://neo4j.com/docs/) - Official Neo4j documentation
- [@neo4j/graphql](https://neo4j.com/docs/graphql-manual/current/) - GraphQL integration library
- [Cypher Query Language](https://neo4j.com/docs/cypher-manual/current/) - Graph query language
- [Graph Database Best Practices](https://neo4j.com/developer/guide-data-modeling/) - Data modeling guidelines
- [UFO Ontology](http://www.inf.ufes.br/~gguizzardi/UFO.pdf) - Unified Foundational Ontology specification