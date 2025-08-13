# Chirality Framework 14 v2.1.1 - Operational Help Guide

*Complete user and developer guidance for operating the CF14 Neo4j implementation*

---

## Table of Contents

1. [Quick Start Guide](#quick-start-guide)
2. [System Requirements](#system-requirements)
3. [Installation & Setup](#installation--setup)
4. [Basic Operations](#basic-operations)
5. [Framework Usage Patterns](#framework-usage-patterns)
6. [Command Reference](#command-reference)
7. [API Operations](#api-operations)
8. [Database Management](#database-management)
9. [Troubleshooting](#troubleshooting)
10. [Performance & Monitoring](#performance--monitoring)
11. [Advanced Configuration](#advanced-configuration)
12. [Best Practices](#best-practices)

---

## Quick Start Guide

### 30-Second Setup

1. **Clone and install**:
   ```bash
   git clone <repository-url>
   cd chirality-semantic-framework
   npm install
   ```

2. **Configure environment** (create `.env.local`):
   ```env
   NEO4J_URI=neo4j+s://your-instance.databases.neo4j.io
   NEO4J_USER=neo4j
   NEO4J_PASSWORD=your-password
   OPENAI_API_KEY=sk-proj-your-key
   ```

3. **Start and instantiate**:
   ```bash
   npm run dev
   # Visit http://localhost:3000/instantiate
   # Enter problem statement → Click "Start Instantiation"
   ```

4. **Chat with your knowledge**:
   ```bash
   # Visit http://localhost:3000/chat
   # Ask: "What requirements do we have?"
   ```

### First-Time User Workflow

**Step 1**: Database Setup → **Step 2**: Problem Instantiation → **Step 3**: Knowledge Querying → **Step 4**: Matrix Analysis

---

## System Requirements

### Minimum Requirements
- **Node.js**: 18.0+ (for Next.js frontend)
- **Python**: 3.8+ (for CF14 semantic operations)
- **RAM**: 4GB minimum, 8GB recommended
- **Storage**: 2GB free space for dependencies and database cache
- **Network**: Broadband connection for Neo4j Aura and OpenAI API

### Recommended Setup
- **Node.js**: 20.x LTS
- **Python**: 3.11+
- **RAM**: 16GB for large-scale matrix operations
- **CPU**: Multi-core for concurrent API operations
- **Neo4j**: Aura Professional tier for production workloads

### Database Requirements
- **Neo4j**: 5.x (Aura cloud or local)
- **Storage**: 100MB minimum for framework data
- **Connections**: 10+ concurrent for multi-user scenarios
- **Memory**: 1GB heap for large matrix operations

---

## Installation & Setup

### Complete Environment Setup

#### 1. Repository Setup
```bash
# Clone repository
git clone <repository-url>
cd chirality-semantic-framework

# Install Node.js dependencies
npm install

# Install Python dependencies (if using CLI directly)
pip install openai requests neo4j python-dotenv
```

#### 2. Environment Configuration

Create `.env.local` with **exact variable names**:

```env
# Neo4j Configuration (Critical: Use NEO4J_USER not NEO4J_USERNAME)
NEO4J_URI=neo4j+s://abc12345.databases.neo4j.io
NEO4J_USER=neo4j
NEO4J_PASSWORD=your-complex-password-123
NEO4J_DATABASE=neo4j

# OpenAI Configuration
OPENAI_API_KEY=sk-proj-abc123def456...

# Application Configuration
NEXT_PUBLIC_API_BASE=http://localhost:3000
```

#### 3. Database Initialization

First run automatically initializes the database with 10 semantic valley stations.

**Manual initialization** (if needed):
```bash
curl -X POST http://localhost:3000/api/neo4j/clean-setup \
  -H 'Content-Type: application/json' \
  -d '{"scope":"all"}'
```

#### 4. Development Server
```bash
npm run dev
# Server starts on http://localhost:3000
# ✓ Framework UI available
# ✓ API routes active 
# ✓ Neo4j connection established
```

### Verification Steps

1. **Test Neo4j connection**:
   ```bash
   curl -s http://localhost:3000/api/chat/matrices
   # Should return: {"total_count": 0, "matrices": []}
   ```

2. **Test OpenAI integration**:
   ```bash
   # Via instantiate page - enter any problem statement
   # Should generate Matrix C successfully
   ```

3. **Test Python CLI** (optional):
   ```bash
   python chirality_cli.py semantic-matrix-c --out test.json
   # Should generate semantic matrix with canonical ID 'C'
   ```

---

## Basic Operations

### Framework Instantiation (Primary Workflow)

#### Web Interface Method (Recommended)

1. **Navigate to instantiation**:
   ```
   http://localhost:3000/instantiate
   ```

2. **Define problem statement**:
   - Enter clear, specific problem description
   - Example: "How do we ensure reliable knowledge generation in AI systems?"
   
3. **Select domain context** (optional):
   - Click domain badges: Software Engineering, Research Methods, etc.
   - Or manually enter additional context

4. **Execute instantiation**:
   - Click "Start Instantiation"
   - Watch automated pipeline: Clean → Setup A&B → Generate C → Compute F → Generate D
   - Full process typically takes 30-60 seconds

5. **Verify completion**:
   - All matrices show green checkmarks
   - "CF14 v2.1.1 Domain Successfully Instantiated!" message appears
   - Navigation options to chat and matrix explorer

#### Command Line Method (Advanced CF14 v2.1.1)

```bash
# CF14 v2.1.1 Enhanced Commands
# Generate matrices with domain packs
python chirality_cli.py semantic-matrix-c --out matrix_c.json
python chirality_cli.py semantic-matrix-c \
  --domain-pack ontology/domains/software_engineering/cf14.domain.software_eng.v1.0.json \
  --out software_matrix_c.json

# Enhanced operations
python chirality_cli.py extract-array-p --matrix-z-id matrix_Z_123
python chirality_cli.py extract-array-h --array-p-id array_P_456
python chirality_cli.py full-pipeline --domain-pack path/to/domain.json
python chirality_cli.py validate-domain --domain-pack path/to/domain.json

# Complete pipeline
python chirality_cli.py full-pipeline --out full_results.json

# Legacy Commands (Still Supported)
python chirality_cli.py semantic-matrix-c --out matrix_c.json
python chirality_cli.py semantic-matrix-f --out matrix_f.json  
python chirality_cli.py semantic-matrix-d --out matrix_d.json
python chirality_cli.py full-instantiation --problem "your problem statement" --domain general
```

### Knowledge Querying (Secondary Workflow)

#### Conversational Interface

1. **Navigate to chat**:
   ```
   http://localhost:3000/chat
   ```

2. **Query instantiated knowledge**:
   - **Requirements**: "What requirements do we have for knowledge generation?"
   - **Objectives**: "Show me objectives related to decision-making"
   - **Solutions**: "What solution objectives exist for evaluation?"
   - **Comparisons**: "Compare requirements vs objectives for completeness"
   - **Specific cells**: "What's in Matrix C position (1,2)?"

#### API Querying

```bash
# Get all matrices
curl -s http://localhost:3000/api/chat/matrices

# Query specific component
curl -s "http://localhost:3000/api/neo4j/query?query_type=get_component_by_id&id=C"

# Search by station
curl -s "http://localhost:3000/api/neo4j/query?station=3"

# Natural language query
curl -s -X POST http://localhost:3000/api/chat/query \
  -H 'Content-Type: application/json' \
  -d '{"message":"What requirements do we have?"}'
```

### Matrix Exploration

1. **Matrix browser**:
   ```
   http://localhost:3000/matrices
   ```
   - Visual matrix representations
   - Cell-level semantic content
   - Operation traceability (multiplication/addition trails)
   - Station-based organization

2. **Neo4j Browser** (advanced):
   ```
   # Connect to your Neo4j instance
   # Example queries:
   MATCH (c:Component) RETURN c.name, c.id, c.station
   MATCH (c:Component)-[:HAS_CELL]->(cell:Cell) RETURN c.name, cell.resolved
   ```

---

## Framework Usage Patterns

### Pattern 1: Research & Analysis (CF14 v2.1.1 Enhanced)

**Use Case**: Academic research, policy analysis, strategic planning

**CF14 v2.1.1 Workflow**:
1. **Select appropriate domain pack** for research domain
2. **Validate domain pack** using enhanced CLI
3. **Instantiate with domain-specific axioms** 
4. **Query for Requirements (Matrix C)** - domain-contextualized analysis needs
5. **Query for Objectives (Matrix F)** - research-specific goals
6. **Query for Solutions (Matrix D)** - domain-informed approaches
7. **Extract Array P/H** - validity parameters and consistency dialectic
8. **Export with complete provenance** tracking

**Example Commands**:
```bash
# Research with academic research domain pack
python chirality_cli.py validate-domain --domain-pack ontology/domains/academic_research/cf14.domain.academic.v1.0.json
python chirality_cli.py full-pipeline \
  --domain-pack ontology/domains/academic_research/cf14.domain.academic.v1.0.json \
  --problem "How do we evaluate AI governance effectiveness?" \
  --out research_analysis.json
```

**Enhanced Problem Statements**:
- "How do we evaluate the effectiveness of AI governance frameworks in regulatory environments?"
- "What factors determine successful technology adoption in healthcare organizations?"
- "How can we measure the impact of educational interventions in STEM learning contexts?"

### Pattern 2: System Design & Architecture (Domain-Enhanced)

**Use Case**: Software development, technical architecture, system planning

**CF14 v2.1.1 Workflow**:
1. **Load software engineering domain pack** with technical axioms
2. **Validate domain compatibility** with system requirements
3. **Instantiate with architectural challenge** using domain context
4. **Extract Requirements matrix** for functional/non-functional requirements
5. **Analyze Objectives matrix** for design goals and success criteria  
6. **Generate Solutions matrix** for implementation strategies
7. **Progress through enhanced semantic valley** stations
8. **Validate with Array P/H** for architectural consistency

**Domain Pack Usage**:
```bash
# Software architecture with engineering domain
python chirality_cli.py validate-domain \
  --domain-pack ontology/domains/software_engineering/cf14.domain.software_eng.v1.0.json
python chirality_cli.py full-pipeline \
  --domain-pack ontology/domains/software_engineering/cf14.domain.software_eng.v1.0.json \
  --problem "How do we design a scalable microservices architecture?" \
  --out architecture_analysis.json
```

**Enhanced Problem Statements**:
- "How do we design a scalable microservices architecture for high-throughput financial data processing?"
- "What security considerations are needed for distributed healthcare data systems with HIPAA compliance?"
- "How can we ensure high availability in cloud-native systems with 99.99% uptime requirements?"

### Pattern 3: Problem-Solving & Decision Making

**Use Case**: Business strategy, operational challenges, complex decisions

**Workflow**:
1. Instantiate with specific business problem
2. Query cross-matrix relationships for comprehensive analysis
3. Use chat interface for interactive exploration
4. Compare different semantic dimensions (Normative, Operative, Evaluative)
5. Extract actionable insights for decision-making

**Example Problem Statements**:
- "How do we optimize our product development process?"
- "What strategies can improve customer retention?"
- "How should we approach market expansion decisions?"

### Pattern 4: Knowledge Management

**Use Case**: Organizational learning, knowledge capture, expertise modeling

**Workflow**:
1. Instantiate with knowledge domain challenges
2. Build comprehensive matrix knowledge base
3. Use conversational interface for knowledge discovery
4. Extract patterns across multiple instantiations
5. Maintain living knowledge repository

**Example Problem Statements**:
- "How do we capture and transfer expert knowledge effectively?"
- "What approaches best support organizational learning?"
- "How can we structure domain expertise for reuse?"

---

## Command Reference

### Python CLI Commands

#### CF14 v2.1.1 Enhanced Matrix Generation
```bash
# Enhanced semantic matrix operations with domain packs
python chirality_cli.py semantic-matrix-c --out matrix_c.json
python chirality_cli.py semantic-matrix-c \
  --domain-pack ontology/domains/software_engineering/cf14.domain.software_eng.v1.0.json \
  --problem "How do we ensure data quality in distributed systems?" \
  --out domain_matrix_c.json

# Domain pack validation
python chirality_cli.py validate-domain \
  --domain-pack ontology/domains/software_engineering/cf14.domain.software_eng.v1.0.json

# Enhanced array operations (CF14 v2.1.1)
python chirality_cli.py extract-array-p --matrix-z-id matrix_Z_validation_123
python chirality_cli.py extract-array-h --array-p-id array_P_validity_456

# Complete pipeline with domain customization
python chirality_cli.py full-pipeline \
  --domain-pack ontology/domains/business_strategy/cf14.domain.business.v1.0.json \
  --problem "How do we optimize customer retention strategies?" \
  --out business_pipeline_results.json
```

#### Legacy Matrix Generation (Still Supported)
```bash
# Generate semantic Matrix C (Requirements)
python chirality_cli.py semantic-matrix-c --out matrix_c.json
# Options: --problem "statement" --domain context

# Generate semantic Matrix F (Objectives)  
python chirality_cli.py semantic-matrix-f --out matrix_f.json
# Requires Matrix C to exist in Neo4j

# Generate semantic Matrix D (Solutions)
python chirality_cli.py semantic-matrix-d --out matrix_d.json
# Requires Matrix A and F to exist in Neo4j

# Full framework instantiation (legacy)
python chirality_cli.py full-instantiation \
  --problem "How do we ensure data quality?" \
  --domain software_engineering \
  --output results/
```

#### Database Administration
```bash
# List all components
python neo4j_admin.py list

# Delete specific component
python neo4j_admin.py delete --id C

# Delete all components at station
python neo4j_admin.py delete-station --station "Requirements"

# Database statistics
python neo4j_admin.py stats

# Export component data
python neo4j_admin.py export --id C --format json
```

### NPM Scripts

```bash
# Development server (essential - Python CLI depends on this)
npm run dev

# Production build
npm run build
npm start

# Code quality
npm run lint
npm run typecheck  # If available

# Package management
npm audit fix
npm update
```

### API Curl Commands

#### Core Operations
```bash
# Clean database setup
curl -X POST http://localhost:3000/api/neo4j/clean-setup \
  -H 'Content-Type: application/json' \
  -d '{"scope":"cf14","recreateStations":true}'

# Matrix F computation
curl -X POST http://localhost:3000/api/neo4j/compute/f \
  -H 'Content-Type: application/json' \
  -d '{"idC":"C","idB":"B"}'

# UFO component ingestion
curl -X POST http://localhost:3000/api/neo4j/ingest-ufo \
  -H 'Content-Type: application/json' \
  -d @matrix_data.json
```

#### Query Operations
```bash
# Component lookup
curl -s "http://localhost:3000/api/neo4j/query?query_type=get_component_by_id&id=C"

# Station-based query
curl -s "http://localhost:3000/api/neo4j/query?station=3"

# Matrix enumeration
curl -s http://localhost:3000/api/chat/matrices

# Natural language query
curl -X POST http://localhost:3000/api/chat/query \
  -H 'Content-Type: application/json' \
  -d '{"message":"Show me all requirements related to data quality"}'
```

---

## API Operations

### Core Neo4j Endpoints

#### `/api/neo4j/clean-setup` - Database Management
**Method**: `POST`  
**Purpose**: Clean database state with scope control  
**Request Body**:
```json
{
  "scope": "cf14|all",
  "recreateStations": true|false
}
```
**Response**: `{"deletedCount": number, "stationsCreated": boolean}`

#### `/api/neo4j/ingest-ufo` - Component Ingestion
**Method**: `POST`  
**Purpose**: Store matrices with UFO ontology annotations  
**Request Body**: Full CF14 component data structure  
**Key Features**:
- Canonical ID enforcement (`A`, `B`, `C`, `F`, `D`)
- UFO ontology integration
- Automatic cell and axis creation
- Station assignment

#### `/api/neo4j/compute/f` - Server-Side Matrix F
**Method**: `POST`  
**Purpose**: Element-wise semantic multiplication (J ⊙ C = F)  
**Request Body**: `{"idC": "C", "idB": "B"}`  
**Algorithm**: CF14 v2.1.1 semantic multiplication with truncated decision matrix

#### `/api/neo4j/query` - Flexible Querying
**Method**: `GET`  
**Purpose**: Component and cell retrieval  
**Query Parameters**:
- `query_type=get_component_by_id&id=C`
- `station=3` (Requirements station)
- `component_name=Matrix C`

#### `/api/neo4j/instantiate-v2` - Framework Pipeline
**Method**: `POST`  
**Purpose**: Full CF14 semantic matrix generation  
**Operations**: `semantic-matrix-c`, `semantic-matrix-d`  
**Features**: Domain pack support, CF14 v2.1.1 algorithm

### Chat Integration Endpoints

#### `/api/chat/matrices` - Available Matrices
**Method**: `GET`  
**Purpose**: List all instantiated matrices  
**Response**: `{"total_count": number, "matrices": Array}`

#### `/api/chat/query` - Natural Language Interface
**Method**: `POST`  
**Purpose**: Conversational knowledge querying  
**Request Body**: `{"message": string, "conversation_history": Array}`  
**Features**:
- Intent analysis (information, explanation, comparison)
- Keyword extraction from CF14 terminology
- Context-aware responses with specific cell content
- Matrix cross-referencing

### Error Handling Patterns

**Standard Error Response**:
```json
{
  "error": "descriptive message",
  "details": "technical specifics",
  "component": "neo4j|openai|validation",
  "timestamp": "ISO string"
}
```

**Common HTTP Status Codes**:
- `200`: Success with data
- `201`: Resource created
- `400`: Invalid request parameters
- `401`: Authentication failure (API keys)
- `404`: Component/matrix not found
- `500`: Server/database error

---

## Database Management

### Neo4j Schema Overview

#### Node Types and Properties
```cypher
// Core Framework Nodes
(:Station {id: Integer, name: String})              // 10 semantic valley stations
(:Component {id: String, name: String, station: String|Integer, shape: [Integer], ontology: Map})
(:Cell {component_id: String, row: Integer, col: Integer, resolved: String, operation: String})
(:Term {value: String, type: String, resolved: String, raw: String})
(:Axis {component_id: String, position: Integer, name: String, labels: [String]})

// UFO Ontology Extensions
(:Document {version: String, topic: String, created_at: String})
(:SemanticValley {name: String, ufo_type: "Situation"})
(:KnowledgeField {name: String, ufo_type: "Kind"})
```

#### Critical Relationships
```cypher
// Structural Relationships
(:Station)-[:NEXT]->(:Station)                     // Valley progression
(:Component)-[:AT_STATION]->(:Station)             // Component placement
(:Component)-[:HAS_CELL]->(:Cell)                  // Matrix structure
(:Component)-[:HAS_AXIS]->(:Axis)                  // Dimensional metadata

// Semantic Relationships
(:Cell)-[:RESOLVES_TO]->(:Term)                    // Final semantic content
(:Cell)-[:CONTAINS_TERM]->(:Term)                  // Raw semantic elements
(:Document)-[:HAS_COMPONENT]->(:Component)         // Grouping
```

### Database Operations

#### Routine Maintenance

**Clean Start (Recommended before instantiation)**:
```bash
curl -X POST http://localhost:3000/api/neo4j/clean-setup \
  -d '{"scope":"cf14","recreateStations":true}'
```

**Full Reset (Nuclear option)**:
```bash
curl -X POST http://localhost:3000/api/neo4j/clean-setup \
  -d '{"scope":"all"}'
```

**Component-Specific Cleanup**:
```bash
python neo4j_admin.py delete --id C    # Remove Matrix C only
python neo4j_admin.py delete-station --station "Requirements"  # Remove station contents
```

#### Health Monitoring

**Database Statistics**:
```cypher
// Neo4j Browser queries
MATCH (n) RETURN labels(n) as NodeType, count(n) as Count
MATCH ()-[r]->() RETURN type(r) as RelType, count(r) as Count
MATCH (c:Component) RETURN c.station, count(c) as Components ORDER BY c.station
```

**API Health Checks**:
```bash
# Connection test
curl -s http://localhost:3000/api/chat/matrices | jq '.total_count'

# Component verification
curl -s "http://localhost:3000/api/neo4j/query?query_type=get_component_by_id&id=C" | jq '.name'
```

#### Data Export/Import

**Export Matrix Data**:
```bash
# Via Neo4j admin
python neo4j_admin.py export --id C --format json > matrix_c_backup.json

# Via API (component data)
curl -s "http://localhost:3000/api/neo4j/query?query_type=get_component_by_id&id=C" > component_c.json
```

**Import Matrix Data**:
```bash
# Via UFO ingestion endpoint
curl -X POST http://localhost:3000/api/neo4j/ingest-ufo \
  -H 'Content-Type: application/json' \
  -d @matrix_c_backup.json
```

### Database Performance

#### Index Management

Essential indexes for CF14 operations:
```cypher
// Component lookups
CREATE INDEX component_id IF NOT EXISTS FOR (c:Component) ON (c.id)
CREATE INDEX component_station IF NOT EXISTS FOR (c:Component) ON (c.station)

// Cell operations
CREATE INDEX cell_component IF NOT EXISTS FOR (c:Cell) ON (c.component_id)
CREATE INDEX cell_position IF NOT EXISTS FOR (c:Cell) ON (c.row, c.col)

// Term searches
CREATE FULLTEXT INDEX term_content IF NOT EXISTS FOR (t:Term) ON [t.resolved, t.raw]
```

#### Query Optimization

**Fast Component Lookup**:
```cypher
// Optimized - uses index
MATCH (c:Component {id: 'C'}) RETURN c

// Slow - full scan
MATCH (c:Component) WHERE c.id = 'C' RETURN c
```

**Efficient Cell Retrieval**:
```cypher
// Optimized with component filter
MATCH (c:Component {id: 'C'})-[:HAS_CELL]->(cell:Cell)
RETURN cell.row, cell.col, cell.resolved
ORDER BY cell.row, cell.col
```

---

## Troubleshooting

### Common Issues & Solutions

#### 🚨 Critical Issues

**1. "OPENAI_API_KEY not found" Error**
```
Symptoms: Matrix generation fails, empty responses
Cause: Missing or invalid OpenAI API key
Solution:
  1. Verify .env.local has OPENAI_API_KEY=sk-proj-...
  2. Check API key is valid at platform.openai.com
  3. Ensure key has sufficient credits
  4. Restart dev server: npm run dev
```

**2. Neo4j Connection Failures**
```
Symptoms: "Failed to connect to database", timeout errors
Cause: Incorrect Neo4j credentials or connectivity
Solution:
  1. Verify NEO4J_URI format: neo4j+s://abc123.databases.neo4j.io
  2. Check NEO4J_USER (not NEO4J_USERNAME!)
  3. Confirm password is correct
  4. Test connection in Neo4j Browser
  5. Check firewall/network connectivity
```

**3. "Component not found" During Instantiation**
```
Symptoms: Matrix F or D generation fails
Cause: Non-canonical component IDs or cleanup needed
Solution:
  1. Click "Clean CF Graph" button before instantiation
  2. Verify canonical IDs: A, B, C, F, D (not matrix_C_semantic_...)
  3. Check database contains Matrix C before generating F
  4. Use API to verify: curl -s ".../api/neo4j/query?query_type=get_component_by_id&id=C"
```

#### ⚠️ Common Issues

**4. Chat Interface Returns "No Data"**
```
Symptoms: "I don't have access to any instantiated framework data yet"
Cause: No matrices in database or incomplete instantiation
Solution:
  1. Complete instantiation process first
  2. Verify matrices exist: curl -s .../api/chat/matrices
  3. Check component IDs are canonical (A, B, C, F, D)
  4. Try specific queries: "What's in Matrix C?"
```

**5. Python CLI Connection Errors**
```
Symptoms: CLI commands fail with network errors
Cause: Next.js server not running or wrong URL
Solution:
  1. Ensure npm run dev is running on localhost:3000
  2. Check NEXT_PUBLIC_API_BASE in .env.local
  3. Verify API routes accessible: curl http://localhost:3000/api/chat/matrices
```

**6. Slow Matrix Generation**
```
Symptoms: Instantiation takes >2 minutes, timeouts
Cause: OpenAI API rate limits or complex problem statements
Solution:
  1. Simplify problem statement (avoid very long descriptions)
  2. Check OpenAI API usage/rate limits
  3. Monitor network connectivity
  4. Use domain contexts to improve semantic processing
```

### Diagnostic Commands

#### System Health Check
```bash
#!/bin/bash
echo "=== CF14 System Health Check ==="

# 1. Check dev server
echo "Testing Next.js server..."
curl -s http://localhost:3000/api/chat/matrices > /dev/null && echo "✓ Next.js OK" || echo "✗ Next.js DOWN"

# 2. Check Neo4j connectivity  
echo "Testing Neo4j connection..."
curl -s "http://localhost:3000/api/neo4j/query?query_type=get_component_by_id&id=A" > /dev/null && echo "✓ Neo4j OK" || echo "✗ Neo4j FAILED"

# 3. Check OpenAI integration
echo "Testing matrix generation..."
echo "(Manual test: visit /instantiate and try generating a matrix)"

# 4. Check database state
echo "Database matrix count:"
curl -s http://localhost:3000/api/chat/matrices | jq -r '.total_count // "No data"'

# 5. Check component IDs
echo "Available components:"
curl -s http://localhost:3000/api/chat/matrices | jq -r '.matrices[]?.name // "None"'
echo "=== End Health Check ==="
```

#### Error Log Analysis

**Next.js Console Errors**:
```bash
# Monitor server logs
npm run dev
# Look for:
# - OpenAI API errors (401, 429, 500)
# - Neo4j connection errors (authentication failed, timeout)
# - Missing environment variables
```

**Neo4j Query Debugging**:
```cypher
// Check component consistency
MATCH (c:Component) 
RETURN c.id, c.name, c.station, 
       size((c)-[:HAS_CELL]->()) as cell_count
ORDER BY c.station, c.id

// Find orphaned cells
MATCH (cell:Cell)
WHERE NOT exists((cell)<-[:HAS_CELL]-())
RETURN count(cell) as orphaned_cells

// Check station setup
MATCH (s:Station) 
RETURN s.id, s.name, 
       size((s)<-[:AT_STATION]-()) as component_count
ORDER BY s.id
```

#### Performance Diagnostics

**Database Query Performance**:
```cypher
// Analyze slow queries
CALL db.stats.retrieve('QUERY') YIELD section, data
UNWIND data as row
WHERE row.query CONTAINS 'Component'
RETURN row.query, row.totalTimeMillis
ORDER BY row.totalTimeMillis DESC
LIMIT 5
```

**API Response Times**:
```bash
# Test endpoint performance
time curl -s http://localhost:3000/api/chat/matrices > /dev/null
time curl -s "http://localhost:3000/api/neo4j/query?query_type=get_component_by_id&id=C" > /dev/null

# Matrix generation timing
time curl -X POST http://localhost:3000/api/neo4j/compute/f \
  -H 'Content-Type: application/json' \
  -d '{"idC":"C","idB":"B"}' > /dev/null
```

### Recovery Procedures

#### Complete System Reset
```bash
# 1. Stop all processes
# Ctrl+C in terminal running npm run dev

# 2. Clear database
curl -X POST http://localhost:3000/api/neo4j/clean-setup \
  -H 'Content-Type: application/json' \
  -d '{"scope":"all"}'

# 3. Restart dev server
npm run dev

# 4. Fresh instantiation
# Visit http://localhost:3000/instantiate
# Complete full workflow
```

#### Partial Recovery (Matrix Specific)
```bash
# Remove problematic matrix
python neo4j_admin.py delete --id F

# Regenerate specific matrix
curl -X POST http://localhost:3000/api/neo4j/compute/f \
  -H 'Content-Type: application/json' \
  -d '{"idC":"C","idB":"B"}'
```

---

## Performance & Monitoring

### Performance Benchmarks

#### Expected Response Times
- **Matrix C Generation**: 15-45 seconds
- **Matrix F Computation**: 5-15 seconds  
- **Matrix D Generation**: 10-30 seconds
- **Chat Queries**: 1-5 seconds
- **Database Queries**: <1 second
- **Clean Setup**: 2-5 seconds

#### Scaling Considerations

**Small Scale (1-10 users)**:
- Default configuration sufficient
- Single Next.js instance
- Neo4j Aura Free tier
- OpenAI standard rate limits

**Medium Scale (10-100 users)**:
- Consider Neo4j Aura Professional
- Implement request caching
- OpenAI rate limit monitoring
- Load balancing for API endpoints

**Large Scale (100+ users)**:
- Horizontal scaling with multiple Next.js instances
- Neo4j cluster/enterprise deployment
- OpenAI batch processing
- Redis caching layer
- Database connection pooling

### Monitoring Setup

#### Basic Monitoring
```bash
# System resource monitoring
top -p $(pgrep node)    # Node.js process monitoring
df -h                   # Disk usage
free -h                # Memory usage

# Application monitoring
curl -s http://localhost:3000/api/chat/matrices | jq '.total_count'  # Matrix count
tail -f ~/.pm2/logs/cf14-out.log     # If using PM2
```

#### Advanced Monitoring

**Neo4j Metrics**:
```cypher
// Database size and performance
CALL dbms.listQueries() YIELD queryId, query, elapsedTimeMillis
WHERE elapsedTimeMillis > 1000
RETURN queryId, query, elapsedTimeMillis
ORDER BY elapsedTimeMillis DESC

// Memory usage
CALL dbms.memory()
```

**API Metrics Collection**:
```javascript
// Add to API routes for monitoring
const startTime = Date.now()
// ... API logic ...
const duration = Date.now() - startTime
console.log(`API ${endpoint} took ${duration}ms`)
```

### Performance Optimization

#### Database Optimization

**Query Optimization**:
- Use component ID indexes for fast lookups
- Limit cell queries with SKIP/LIMIT for large matrices
- Use PROFILE to analyze slow queries
- Batch operations where possible

**Memory Management**:
- Regular database cleanup of orphaned nodes
- Implement component TTL for temporary matrices
- Use streaming for large result sets

#### API Optimization

**Response Caching**:
```javascript
// Simple in-memory cache for matrix data
const matrixCache = new Map()
const CACHE_TTL = 300000 // 5 minutes

function getCachedMatrix(id) {
  const cached = matrixCache.get(id)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data
  }
  return null
}
```

**Request Batching**:
- Combine multiple matrix queries into single requests
- Use GraphQL-style query consolidation
- Implement request debouncing for chat interface

---

## Advanced Configuration

### Environment Variables Reference

#### Core Configuration
```env
# Neo4j Settings
NEO4J_URI=neo4j+s://instance.databases.neo4j.io  # Aura connection string
NEO4J_USER=neo4j                                 # Username (exactly "neo4j")
NEO4J_PASSWORD=your-strong-password               # Aura password
NEO4J_DATABASE=neo4j                             # Database name
NEO4J_MAX_CONNECTION_POOL_SIZE=50                 # Connection pool size
NEO4J_CONNECTION_TIMEOUT=30000                    # Connection timeout (ms)

# OpenAI Configuration
OPENAI_API_KEY=sk-proj-abc123...                 # API key with chat/completions access
OPENAI_ORG=org-xyz                              # Organization (optional)
OPENAI_PROJECT=proj-abc                          # Project ID (optional)
OPENAI_MAX_RETRIES=3                            # Retry attempts
OPENAI_TIMEOUT=60000                             # Request timeout (ms)

# Application Settings
NEXT_PUBLIC_API_BASE=http://localhost:3000        # Base URL for API calls
NODE_ENV=development|production                   # Environment mode
PORT=3000                                        # Server port
HOST=localhost                                   # Server host

# Logging & Debugging
LOG_LEVEL=info|debug|warn|error                  # Logging verbosity
DEBUG_NEO4J=true|false                          # Neo4j query logging
DEBUG_OPENAI=true|false                         # OpenAI request logging
```

#### Production Configuration
```env
# Production overrides
NEO4J_URI=neo4j+s://production.databases.neo4j.io
NEO4J_CONNECTION_POOL_SIZE=100
NEO4J_CONNECTION_TIMEOUT=60000

OPENAI_MAX_RETRIES=5
OPENAI_TIMEOUT=120000

NEXT_PUBLIC_API_BASE=https://your-domain.com
NODE_ENV=production

LOG_LEVEL=warn
DEBUG_NEO4J=false
DEBUG_OPENAI=false
```

### Custom Domain Packs

#### Creating Domain-Specific Ontologies

**1. Domain Pack Structure**:
```json
{
  "domain": "custom_domain",
  "version": "1.0",
  "cf14_version": "2.1.1",
  "ontology_extensions": {
    "custom_stations": [{
      "id": 11,
      "name": "Domain-Specific Station",
      "description": "Custom reasoning stage"
    }],
    "domain_terms": {
      "necessity": ["domain-specific", "required", "terms"],
      "sufficiency": ["adequate", "domain", "concepts"]
    },
    "semantic_operations": {
      "custom_multiplication": "domain-specific formula"
    }
  }
}
```

**2. Integration Steps**:
```bash
# 1. Create domain pack file
mkdir -p ontology/domains/custom_domain/
echo '{...domain pack JSON...}' > ontology/domains/custom_domain/cf14.domain.custom_domain.v1.0.json

# 2. Update instantiate page domain list
# Edit app/instantiate/page.tsx, add 'custom_domain' to domains array

# 3. Test domain instantiation
# Visit /instantiate, select custom domain, complete instantiation
```

### OpenAI Model Configuration

#### Model Selection
```javascript
// In API routes, customize model settings
const openaiConfig = {
  model: 'gpt-4.1-nano',        // Default for CF14
  // Alternative models:
  // model: 'gpt-4-turbo',      // For complex reasoning
  // model: 'gpt-3.5-turbo',    // For faster/cheaper operations
  
  temperature: 0.7,             // Creativity vs consistency
  max_tokens: 800,              // Response length
  top_p: 1,                     // Nucleus sampling
  frequency_penalty: 0,         // Repetition reduction
  presence_penalty: 0           // Topic diversity
}
```

#### Semantic Operation Tuning
```javascript
// Custom prompts for different operations
const CF14_PROMPTS = {
  semantic_multiplication: `
    Perform semantic multiplication using CF14 v2.1.1:
    - Combine meanings to create coherent new concepts
    - Example: 'sufficient' * 'reason' = 'justification'
    - Focus on semantic intersection, not linguistic concatenation
  `,
  semantic_addition: `
    Perform semantic addition using CF14 v2.1.1:
    - Concatenate concepts with framework formula
    - Pattern: A(i,j) + 'applied to frame the problem;' + F(i,j) + 'to resolve the problem.'
  `
}
```

### Neo4j Advanced Configuration

#### Custom Indexes
```cypher
// Performance indexes for large deployments
CREATE INDEX matrix_lookup FOR (c:Component) ON (c.id, c.station)
CREATE INDEX cell_content FOR (c:Cell) ON (c.component_id, c.resolved)
CREATE FULLTEXT INDEX semantic_search FOR (c:Cell, t:Term) ON [c.resolved, t.resolved, t.raw]

// Compound indexes for complex queries
CREATE INDEX component_metadata FOR (c:Component) ON (c.station, c.ontology.operation, c.shape)
```

#### Custom Constraints
```cypher
// Ensure data integrity
CREATE CONSTRAINT unique_component_id FOR (c:Component) REQUIRE c.id IS UNIQUE
CREATE CONSTRAINT unique_station_id FOR (s:Station) REQUIRE s.id IS UNIQUE
CREATE CONSTRAINT cell_position FOR (c:Cell) REQUIRE (c.component_id, c.row, c.col) IS UNIQUE
```

#### Memory Configuration
```
# For large matrix operations, tune Neo4j memory settings
# In neo4j.conf or Aura console:
dbms.memory.heap.initial_size=2G
dbms.memory.heap.max_size=4G
dbms.memory.pagecache.size=2G
dbms.query.cache_size=1000
```

---

## Best Practices

### Development Workflow

#### Version Control
```bash
# Essential files to commit
git add app/ lib/ components/          # Next.js application
git add chirality_cli.py neo4j_admin.py    # Python CLI tools
git add package.json package-lock.json     # Dependencies
git add ontology/                      # Domain packs

# Files to ignore (.gitignore)
.env.local                            # Environment secrets
.next/                               # Build artifacts
node_modules/                        # Dependencies
*.log                               # Log files
matrix_*.json                       # Generated matrices
```

#### Code Organization
```
# Recommended project structure
app/
├── api/neo4j/          # Database operations
├── api/chat/           # Conversational interface
├── instantiate/        # Framework instantiation UI
├── chat/              # Chat interface
└── matrices/          # Matrix explorer

lib/
└── neo4j.ts           # Shared database connection

ontology/
├── domains/           # Domain-specific packs
└── core/              # Core CF14 ontology

scripts/
├── setup/             # Installation scripts
├── maintenance/       # Database maintenance
└── testing/           # Automated tests
```

#### Testing Strategy

**Unit Testing**:
```bash
# API endpoint testing
npm test                              # Run test suite
npm run test:watch                   # Watch mode

# Manual API testing
curl -s http://localhost:3000/api/chat/matrices | jq '.total_count'
curl -X POST http://localhost:3000/api/neo4j/clean-setup -d '{"scope":"cf14"}'
```

**Integration Testing**:
```bash
# Full instantiation workflow test
#!/bin/bash
echo "Testing complete CF14 workflow..."

# 1. Clean start
curl -s -X POST http://localhost:3000/api/neo4j/clean-setup -d '{"scope":"all"}' > /dev/null

# 2. Test instantiation API
curl -s -X POST http://localhost:3000/api/neo4j/instantiate-v2 \
  -H 'Content-Type: application/json' \
  -d '{"operation":"semantic-matrix-c","problem_statement":"test problem"}' > /dev/null

# 3. Verify matrix exists
MATRICES=$(curl -s http://localhost:3000/api/chat/matrices | jq -r '.total_count')
if [ "$MATRICES" -gt 0 ]; then
  echo "✓ Workflow test passed"
else
  echo "✗ Workflow test failed"
fi
```

### Production Deployment

#### Environment Setup
```bash
# Production build
npm run build
npm start

# Process management with PM2
npm install -g pm2
pm2 start npm --name "cf14" -- start
pm2 save
pm2 startup
```

#### Security Considerations

**Environment Security**:
- Use strong Neo4j passwords (20+ characters)
- Rotate OpenAI API keys regularly
- Enable Neo4j authentication and encryption
- Use HTTPS for all API communications
- Implement rate limiting on API endpoints

**Database Security**:
```cypher
// Create read-only user for monitoring
CREATE USER monitor SET PASSWORD 'secure-password'
GRANT role reader TO monitor

// Restrict database access
CREATE ROLE cf14_user
GRANT ACCESS ON DATABASE neo4j TO cf14_user
GRANT MATCH {*} ON GRAPH * TO cf14_user
```

**API Security**:
```javascript
// Rate limiting middleware
const rateLimit = require('express-rate-limit')
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP'
})
```

#### Monitoring & Alerting

**Health Checks**:
```bash
# Automated health monitoring
#!/bin/bash
# /etc/cron.d/cf14-health
*/5 * * * * /path/to/health-check.sh

# health-check.sh
#!/bin/bash
API_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/chat/matrices)
if [ "$API_STATUS" != "200" ]; then
  echo "CF14 API DOWN - Status: $API_STATUS" | mail -s "CF14 Alert" admin@yourcompany.com
fi
```

**Performance Monitoring**:
```javascript
// Application performance monitoring
const prometheus = require('prom-client')

// Custom metrics
const matrixGenerationDuration = new prometheus.Histogram({
  name: 'cf14_matrix_generation_duration_seconds',
  help: 'Duration of matrix generation operations',
  labelNames: ['matrix_type', 'success']
})

const neo4jQueryDuration = new prometheus.Histogram({
  name: 'cf14_neo4j_query_duration_seconds',
  help: 'Duration of Neo4j queries',
  labelNames: ['query_type']
})
```

#### Backup & Recovery

**Database Backups**:
```bash
# Neo4j Aura automatic backups (configured in console)
# Manual export for critical data
curl -s "http://localhost:3000/api/neo4j/query?query_type=export_all" > cf14_backup_$(date +%Y%m%d).json
```

**Application Backups**:
```bash
# Complete application backup
tar -czf cf14_backup_$(date +%Y%m%d).tar.gz \
  app/ lib/ components/ ontology/ \
  package.json package-lock.json \
  chirality_cli.py neo4j_admin.py
```

**Disaster Recovery Plan**:
1. **Database Recovery**: Restore from Neo4j Aura backup
2. **Application Recovery**: Deploy from git repository + backup files
3. **Environment Recovery**: Restore .env.local from secure backup
4. **Verification**: Run health checks and sample instantiation
5. **Communication**: Notify users of service restoration

### Optimization Guidelines

#### Query Performance
- Always use component IDs for lookups
- Batch cell retrievals where possible
- Use LIMIT clauses for large result sets
- Profile slow queries with Neo4j browser

#### Memory Management
- Regular database cleanup with clean-setup API
- Implement matrix TTL for temporary data
- Monitor Neo4j memory usage
- Use streaming for large matrix operations

#### Scalability Patterns
- Implement horizontal API scaling
- Use connection pooling for database access
- Cache frequently accessed matrices
- Consider read replicas for query-heavy workloads

---

**End of Operational Help Guide**

*For architectural details and development patterns, see `Chirality_cli_README.md`*
*For additional support, consult the project repository issues or documentation*
