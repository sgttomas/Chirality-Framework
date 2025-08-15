# CLAUDE_CLI.md

Specific guidance for Claude Code when working on Python CLI development for the Chirality Framework.

## CLI Development Context

The Chirality CLI (`chirality_cli.py`) is the core backend automation tool for Phase 1 canonical framework generation. It executes semantic operations cell-by-cell and persists results to Neo4j via GraphQL integration.

### CLI Architecture Overview

```
┌─────────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  CLI Commands       │────│  Semantic Ops   │────│  GraphQL API    │
│  (Click Framework)  │    │  (semmul_cf14)  │    │  (Neo4j)        │
└─────────────────────┘    └─────────────────┘    └─────────────────┘
         │                           │                       │
    ┌────┴────┐                ┌────┴────┐              ┌────┴────┐
    │Command  │                │Semantic │              │Cell     │
    │Parser   │                │Multi-   │              │Context  │
    │Args     │                │plier    │              │Stages   │
    └─────────┘                └─────────┘              └─────────┘
```

## Current CLI Implementation Status

### ✅ Implemented Commands
```bash
# Core CF14 operations
push-axioms        # Load matrices A, B, J from normative spec
generate-c         # Generate Requirements matrix C
generate-f         # Generate Objectives matrix F  
generate-d         # Generate Solution Objectives matrix D
verify-stages      # Verify semantic stage completion

# Administration
list               # List components (via neo4j_admin.py)
delete             # Delete components (via neo4j_admin.py)
health-check       # Basic connectivity validation
```

### 🔄 Active Development Requirements

#### 1. JSON Output Format (High Priority)
**Current Issue**: CLI only outputs human-readable text
**Required Enhancement**:

```python
@click.command()
@click.option('--json-output', is_flag=True, help='Output structured JSON')
def generate_c(json_output, **kwargs):
    """Generate Requirements matrix C with optional JSON output."""
    try:
        # Existing generation logic
        result = perform_matrix_generation()
        
        if json_output:
            response = {
                "status": "success",
                "operation": "generate-c",
                "matrix_id": "C", 
                "cells_generated": len(result.cells),
                "duration_seconds": result.duration,
                "timestamp": datetime.utcnow().isoformat(),
                "cells": [
                    {
                        "position": [i, j],
                        "content": cell.resolved,
                        "stage": cell.stage_name
                    } for i, row in enumerate(result.cells) 
                    for j, cell in enumerate(row)
                ]
            }
            click.echo(json.dumps(response, indent=2))
        else:
            # Existing human-readable output
            click.echo(f"Generated matrix C with {len(result.cells)} cells")
            
    except Exception as e:
        error_response = {
            "status": "error",
            "operation": "generate-c",
            "message": str(e),
            "suggestions": get_error_suggestions(e),
            "timestamp": datetime.utcnow().isoformat()
        }
        
        if json_output:
            click.echo(json.dumps(error_response))
        else:
            click.echo(f"Error: {e}")
            sys.exit(1)
```

#### 2. Enhanced Error Messages (High Priority)
**Current Issue**: Generic error messages without actionable guidance
**Required Enhancement**:

```python
def get_error_suggestions(error: Exception) -> List[str]:
    """Generate actionable suggestions based on error type."""
    suggestions = []
    
    if "Neo4j" in str(error):
        suggestions.extend([
            "Check if Neo4j is running: systemctl status neo4j",
            "Verify credentials in .env file",
            "Test connection: curl http://localhost:7474/browser/"
        ])
    
    if "OpenAI" in str(error):
        suggestions.extend([
            "Verify OPENAI_API_KEY is set in environment",
            "Check API rate limits and usage",
            "Ensure sufficient API credits"
        ])
    
    if "GraphQL" in str(error):
        suggestions.extend([
            "Start GraphQL service: cd graphql-service && npm run dev",
            "Check service health: curl http://localhost:8080/health",
            "Verify GraphQL schema compatibility"
        ])
    
    return suggestions

# Example enhanced error handling
try:
    result = connect_to_neo4j()
except Exception as e:
    error_msg = f"Failed to connect to Neo4j at {NEO4J_URI}"
    suggestions = get_error_suggestions(e)
    
    click.echo(error_msg)
    if suggestions:
        click.echo("Suggestions:")
        for suggestion in suggestions:
            click.echo(f"  - {suggestion}")
    
    sys.exit(1)
```

#### 3. Progress Reporting (High Priority)
**Current Issue**: No feedback during long-running operations
**Required Enhancement**:

```python
import click
from tqdm import tqdm

def generate_matrix_with_progress(matrix_id: str, total_cells: int):
    """Generate matrix with progress bar."""
    with tqdm(total=total_cells, desc=f"Generating Matrix {matrix_id}") as pbar:
        for i in range(3):  # 3 rows
            for j in range(4):  # 4 columns
                # Perform cell generation
                cell_result = generate_cell(i, j)
                
                # Update progress
                pbar.set_postfix({
                    'Cell': f"({i},{j})",
                    'Content': cell_result.resolved[:30] + "..."
                })
                pbar.update(1)
                
                # Optional: Stream to admin UI via WebSocket
                if stream_output:
                    emit_progress_update(i, j, cell_result)

# For JSON output mode
def report_progress_json(operation: str, current: int, total: int, cell_info: dict):
    """Report progress in JSON format."""
    progress = {
        "type": "progress",
        "operation": operation,
        "current": current,
        "total": total,
        "percentage": round((current / total) * 100, 1),
        "cell": cell_info,
        "timestamp": datetime.utcnow().isoformat()
    }
    click.echo(json.dumps(progress))
```

#### 4. Operation Resumption (Medium Priority)
**Current Issue**: No way to resume interrupted operations
**Required Enhancement**:

```python
import pickle
import os

class OperationCheckpoint:
    def __init__(self, operation: str, matrix_id: str):
        self.operation = operation
        self.matrix_id = matrix_id
        self.checkpoint_file = f".checkpoint_{operation}_{matrix_id}.pkl"
        self.completed_cells = set()
    
    def save(self):
        """Save checkpoint to disk."""
        with open(self.checkpoint_file, 'wb') as f:
            pickle.dump(self, f)
    
    def load(self) -> 'OperationCheckpoint':
        """Load checkpoint from disk."""
        if os.path.exists(self.checkpoint_file):
            with open(self.checkpoint_file, 'rb') as f:
                return pickle.load(f)
        return self
    
    def mark_completed(self, i: int, j: int):
        """Mark cell as completed."""
        self.completed_cells.add((i, j))
        self.save()
    
    def is_completed(self, i: int, j: int) -> bool:
        """Check if cell is already completed."""
        return (i, j) in self.completed_cells
    
    def cleanup(self):
        """Remove checkpoint file."""
        if os.path.exists(self.checkpoint_file):
            os.remove(self.checkpoint_file)

@click.command()
@click.option('--resume', is_flag=True, help='Resume from checkpoint')
def generate_c(resume, **kwargs):
    """Generate matrix C with resumption support."""
    checkpoint = OperationCheckpoint("generate-c", "C")
    
    if resume:
        checkpoint = checkpoint.load()
        click.echo(f"Resuming from checkpoint: {len(checkpoint.completed_cells)} cells completed")
    
    try:
        for i in range(3):
            for j in range(4):
                if checkpoint.is_completed(i, j):
                    click.echo(f"Skipping completed cell ({i},{j})")
                    continue
                
                # Generate cell
                result = generate_cell(i, j)
                checkpoint.mark_completed(i, j)
                
                click.echo(f"Completed cell ({i},{j}): {result.resolved[:50]}...")
        
        # Operation completed successfully
        checkpoint.cleanup()
        click.echo("Matrix C generation completed successfully")
        
    except Exception as e:
        click.echo(f"Operation interrupted: {e}")
        click.echo(f"Resume with: python chirality_cli.py generate-c --resume")
        sys.exit(1)
```

## CLI Development Patterns

### 1. Command Structure Template
```python
import click
import json
import sys
from datetime import datetime
from typing import Optional, Dict, Any

@click.command()
@click.option('--json-output', is_flag=True, help='Output structured JSON')
@click.option('--verbose', is_flag=True, help='Verbose logging')
@click.option('--timeout', type=int, default=300, help='Operation timeout in seconds')
def command_template(json_output: bool, verbose: bool, timeout: int, **kwargs):
    """Template for CLI command implementation."""
    
    # Initialize operation context
    operation_start = datetime.utcnow()
    operation_name = "command-template"
    
    try:
        # Validate environment
        validate_environment()
        
        # Perform operation with timeout
        with operation_timeout(timeout):
            result = perform_operation(**kwargs)
        
        # Success response
        duration = (datetime.utcnow() - operation_start).total_seconds()
        
        if json_output:
            response = {
                "status": "success",
                "operation": operation_name,
                "result": result,
                "duration_seconds": duration,
                "timestamp": operation_start.isoformat()
            }
            click.echo(json.dumps(response, indent=2))
        else:
            click.echo(f"Operation {operation_name} completed successfully")
            click.echo(f"Duration: {duration:.1f} seconds")
            
    except TimeoutError:
        handle_timeout_error(operation_name, timeout, json_output)
    except Exception as e:
        handle_general_error(operation_name, e, json_output)

def validate_environment():
    """Validate required environment variables and services."""
    required_vars = ['OPENAI_API_KEY', 'NEO4J_URI', 'NEO4J_USER', 'NEO4J_PASSWORD']
    missing_vars = [var for var in required_vars if not os.getenv(var)]
    
    if missing_vars:
        raise EnvironmentError(f"Missing required environment variables: {missing_vars}")
    
    # Test service connectivity
    test_neo4j_connection()
    test_graphql_service()
```

### 2. Error Handling Patterns
```python
def handle_general_error(operation: str, error: Exception, json_output: bool):
    """Standardized error handling."""
    error_info = {
        "status": "error",
        "operation": operation,
        "message": str(error),
        "error_type": type(error).__name__,
        "suggestions": get_error_suggestions(error),
        "timestamp": datetime.utcnow().isoformat()
    }
    
    if json_output:
        click.echo(json.dumps(error_info))
    else:
        click.echo(f"Error in {operation}: {error}")
        if error_info["suggestions"]:
            click.echo("Suggestions:")
            for suggestion in error_info["suggestions"]:
                click.echo(f"  - {suggestion}")
    
    sys.exit(1)

def handle_timeout_error(operation: str, timeout: int, json_output: bool):
    """Handle operation timeout."""
    error_info = {
        "status": "error",
        "operation": operation,
        "message": f"Operation timed out after {timeout} seconds",
        "error_type": "TimeoutError",
        "suggestions": [
            f"Increase timeout with --timeout {timeout * 2}",
            "Check network connectivity to Neo4j and OpenAI",
            "Consider running operation in smaller batches"
        ],
        "timestamp": datetime.utcnow().isoformat()
    }
    
    if json_output:
        click.echo(json.dumps(error_info))
    else:
        click.echo(f"Operation {operation} timed out after {timeout} seconds")
        for suggestion in error_info["suggestions"]:
            click.echo(f"  - {suggestion}")
    
    sys.exit(1)
```

### 3. Integration with Admin UI
```python
def emit_realtime_update(event_type: str, data: Dict[str, Any]):
    """Emit real-time updates for admin UI integration."""
    if os.getenv('REALTIME_UPDATES_ENABLED') == 'true':
        update = {
            "type": event_type,
            "data": data,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        # Write to stdout for admin UI to capture
        print(f"REALTIME_UPDATE:{json.dumps(update)}", flush=True)

# Usage in CLI commands
def generate_cell(i: int, j: int) -> CellResult:
    """Generate individual cell with real-time updates."""
    
    # Emit start event
    emit_realtime_update("cell_generation_start", {
        "position": [i, j],
        "operation": "generate-c"
    })
    
    try:
        # Perform semantic operation
        result = semantic_multiply(context_a, context_b)
        
        # Emit success event
        emit_realtime_update("cell_generation_complete", {
            "position": [i, j],
            "content": result.resolved[:100] + "...",
            "stage": result.stage_name
        })
        
        return result
        
    except Exception as e:
        # Emit error event
        emit_realtime_update("cell_generation_error", {
            "position": [i, j],
            "error": str(e)
        })
        raise
```

## CLI Testing Requirements

### Unit Tests
```python
import pytest
from unittest.mock import patch, MagicMock
from click.testing import CliRunner

def test_generate_c_json_output():
    """Test generate-c command with JSON output."""
    runner = CliRunner()
    
    with patch('chirality_cli.perform_matrix_generation') as mock_gen:
        mock_gen.return_value = MagicMock(
            cells=[[MagicMock(resolved="test content")] * 4] * 3,
            duration=120
        )
        
        result = runner.invoke(generate_c, ['--json-output'])
        
        assert result.exit_code == 0
        response = json.loads(result.output)
        assert response['status'] == 'success'
        assert response['operation'] == 'generate-c'
        assert response['matrix_id'] == 'C'

def test_error_handling_with_suggestions():
    """Test error handling provides actionable suggestions."""
    runner = CliRunner()
    
    with patch('chirality_cli.connect_to_neo4j') as mock_connect:
        mock_connect.side_effect = ConnectionError("Connection refused")
        
        result = runner.invoke(generate_c, [])
        
        assert result.exit_code == 1
        assert "Check if Neo4j is running" in result.output
        assert "Verify credentials" in result.output
```

### Integration Tests
```python
def test_cli_admin_ui_integration():
    """Test CLI integration with admin UI."""
    runner = CliRunner()
    
    # Test JSON output format compatibility
    result = runner.invoke(generate_c, ['--json-output'])
    response = json.loads(result.output)
    
    # Verify admin UI can parse response
    assert 'status' in response
    assert 'timestamp' in response
    assert 'cells' in response

def test_realtime_updates():
    """Test real-time update emission."""
    runner = CliRunner()
    
    with patch.dict(os.environ, {'REALTIME_UPDATES_ENABLED': 'true'}):
        result = runner.invoke(generate_c, [])
        
        # Check for real-time update messages
        assert "REALTIME_UPDATE:" in result.output
```

## Performance Optimization

### 1. Connection Pooling
```python
from neo4j import GraphDatabase
import threading

class Neo4jConnectionPool:
    _instance = None
    _lock = threading.Lock()
    
    def __new__(cls):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
                    cls._instance.driver = GraphDatabase.driver(
                        os.getenv('NEO4J_URI'),
                        auth=(os.getenv('NEO4J_USER'), os.getenv('NEO4J_PASSWORD')),
                        max_connection_lifetime=30 * 60,  # 30 minutes
                        max_connection_pool_size=50
                    )
        return cls._instance
    
    def get_session(self):
        return self.driver.session()
```

### 2. Batch Operations
```python
def batch_cell_updates(cells: List[CellUpdate]) -> None:
    """Update multiple cells in a single transaction."""
    pool = Neo4jConnectionPool()
    
    with pool.get_session() as session:
        with session.begin_transaction() as tx:
            for cell in cells:
                tx.run(
                    "MERGE (c:Cell {station: $station, i: $i, j: $j}) "
                    "SET c.resolved = $resolved, c.stage = $stage",
                    station=cell.station, i=cell.i, j=cell.j,
                    resolved=cell.resolved, stage=cell.stage
                )
```

## CLI Security Considerations

### Input Validation
```python
def validate_matrix_id(matrix_id: str) -> str:
    """Validate matrix ID to prevent injection."""
    allowed_matrices = {'A', 'B', 'C', 'F', 'D', 'J'}
    if matrix_id not in allowed_matrices:
        raise ValueError(f"Invalid matrix ID: {matrix_id}")
    return matrix_id

def validate_file_path(file_path: str) -> str:
    """Validate file paths to prevent directory traversal."""
    # Resolve to absolute path and check if within allowed directories
    abs_path = os.path.abspath(file_path)
    allowed_dirs = [os.getcwd(), '/tmp/chirality']
    
    if not any(abs_path.startswith(allowed_dir) for allowed_dir in allowed_dirs):
        raise ValueError(f"File path not allowed: {file_path}")
    
    return abs_path
```

### API Key Protection
```python
def ensure_api_key():
    """Ensure OpenAI API key is available and valid."""
    api_key = os.getenv('OPENAI_API_KEY')
    
    if not api_key:
        raise EnvironmentError(
            "OPENAI_API_KEY environment variable is required. "
            "Set it in .env file or environment."
        )
    
    if not api_key.startswith('sk-'):
        raise ValueError("Invalid OpenAI API key format")
    
    # Never log the actual key
    click.echo(f"Using OpenAI API key: {api_key[:7]}...{api_key[-4:]}")
```

---

**Key Development Guidelines**:
1. Always implement both JSON and human-readable output modes
2. Provide actionable error messages with specific suggestions
3. Include progress reporting for operations longer than 30 seconds
4. Test CLI integration with admin UI thoroughly
5. Follow security best practices for input validation and API key handling