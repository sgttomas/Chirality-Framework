# ADR-006: Structured JSON Output for CLI Tools

## Status

Proposed

## Context

The Chirality Framework CLI tools (`chirality_cli.py`, `neo4j_admin.py`) currently output human-readable text designed for terminal consumption. However, with the integration of Admin UI and potential future API integrations, there's a need for machine-readable output formats.

Current challenges:
1. **Admin UI Integration**: UI needs to parse CLI output to display results and progress
2. **API Integration**: Future REST APIs may need to call CLI tools programmatically
3. **Automation**: Scripted workflows require reliable output parsing
4. **Error Handling**: Structured error messages with actionable suggestions
5. **Progress Tracking**: Real-time progress updates during long operations

Current output patterns:
```bash
# Human-readable (current)
$ python chirality_cli.py generate-c
Generating Requirements matrix C...
Cell (0,0): Problem.Systematic.Analysis
Cell (0,1): Problem.Systematic.Design
...
Matrix C generation completed in 180s

# Human-readable errors (current)
$ python chirality_cli.py generate-c
Error: Failed to connect to Neo4j
Check your connection settings and try again.
```

Requirements for structured output:
- Backward compatibility with human-readable output
- Consistent JSON schema across all CLI commands
- Progress reporting for long-running operations
- Structured error responses with suggestions
- Machine-readable success/failure status

## Decision

We will implement **optional structured JSON output** for all CLI commands with the following approach:

### CLI Flag Implementation
Add `--json-output` flag to all CLI commands that changes output format:

```bash
# Human-readable (default, unchanged)
python chirality_cli.py generate-c

# Structured JSON output (new)
python chirality_cli.py generate-c --json-output
```

### JSON Response Schema
```typescript
interface CliResponse {
  status: 'success' | 'error' | 'progress';
  operation: string;
  timestamp: string;
  data?: any;
  error?: CliError;
  progress?: ProgressInfo;
}

interface CliError {
  message: string;
  code: string;
  suggestions: string[];
  details?: Record<string, any>;
}

interface ProgressInfo {
  current: number;
  total: number;
  percentage: number;
  currentOperation: string;
  eta?: number;
}
```

### Implementation Pattern
```python
import click
import json
from datetime import datetime
from typing import Optional, Dict, Any

@click.command()
@click.option('--json-output', is_flag=True, help='Output structured JSON')
def generate_c(json_output: bool, **kwargs):
    """Generate Requirements matrix C with optional JSON output."""
    
    def output_message(message_type: str, data: Dict[str, Any]):
        if json_output:
            response = {
                'status': message_type,
                'operation': 'generate-c',
                'timestamp': datetime.utcnow().isoformat(),
                **data
            }
            click.echo(json.dumps(response))
        else:
            # Traditional human-readable output
            if message_type == 'success':
                click.echo(f"Matrix C generation completed in {data.get('duration', 0)}s")
            elif message_type == 'progress':
                click.echo(f"Cell ({data['current_cell'][0]},{data['current_cell'][1]}): {data['content']}")
            elif message_type == 'error':
                click.echo(f"Error: {data['error']['message']}")
    
    try:
        # Start operation
        output_message('progress', {
            'progress': {'current': 0, 'total': 12, 'percentage': 0},
            'currentOperation': 'Starting matrix generation'
        })
        
        # Simulate cell generation
        for i in range(3):
            for j in range(4):
                cell_content = generate_cell(i, j)
                
                output_message('progress', {
                    'progress': {
                        'current': i * 4 + j + 1,
                        'total': 12,
                        'percentage': ((i * 4 + j + 1) / 12) * 100
                    },
                    'current_cell': [i, j],
                    'content': cell_content,
                    'currentOperation': f'Generated cell ({i},{j})'
                })
        
        # Success response
        output_message('success', {
            'data': {
                'matrix_id': 'C',
                'cells_generated': 12,
                'duration_seconds': 180.5
            }
        })
        
    except Exception as e:
        # Error response
        output_message('error', {
            'error': {
                'message': str(e),
                'code': get_error_code(e),
                'suggestions': get_error_suggestions(e),
                'details': get_error_details(e)
            }
        })
        sys.exit(1)
```

### Standardized Response Examples

#### Success Response
```json
{
  "status": "success",
  "operation": "generate-c",
  "timestamp": "2025-01-15T10:30:00.000Z",
  "data": {
    "matrix_id": "C",
    "cells_generated": 12,
    "duration_seconds": 180.5,
    "cells": [
      {
        "position": [0, 0],
        "content": "Problem.Systematic.Analysis",
        "stage": "product"
      }
    ]
  }
}
```

#### Progress Response
```json
{
  "status": "progress", 
  "operation": "generate-c",
  "timestamp": "2025-01-15T10:30:15.123Z",
  "progress": {
    "current": 5,
    "total": 12,
    "percentage": 41.7,
    "currentOperation": "Generated cell (1,0)",
    "eta": 95.2
  },
  "data": {
    "current_cell": [1, 0],
    "content": "Problem.Process.Management"
  }
}
```

#### Error Response
```json
{
  "status": "error",
  "operation": "generate-c", 
  "timestamp": "2025-01-15T10:30:00.000Z",
  "error": {
    "message": "Failed to connect to Neo4j at bolt://localhost:7687",
    "code": "NEO4J_CONNECTION_ERROR",
    "suggestions": [
      "Check if Neo4j is running: systemctl status neo4j",
      "Verify credentials in .env file",
      "Test connection: curl http://localhost:7474/browser/"
    ],
    "details": {
      "neo4j_uri": "bolt://localhost:7687",
      "connection_timeout": 30,
      "retry_attempts": 3
    }
  }
}
```

## Consequences

### Positive Consequences

1. **Admin UI Integration**: Clean JSON parsing for web interface
2. **API Readiness**: CLI tools can be easily wrapped by REST APIs
3. **Automation Friendly**: Scripts can reliably parse CLI output
4. **Better Error Handling**: Structured errors with actionable suggestions
5. **Progress Tracking**: Real-time progress updates for long operations
6. **Backward Compatibility**: Existing scripts continue to work unchanged
7. **Debugging**: Structured data easier to log and analyze
8. **Future Proofing**: Foundation for API development

### Negative Consequences

1. **Implementation Overhead**: Every CLI command needs JSON support
2. **Code Complexity**: Dual output paths increase code complexity
3. **Testing Burden**: Need to test both output formats
4. **Consistency Challenge**: Ensuring consistent JSON schema across commands
5. **Performance Impact**: JSON serialization overhead for large datasets
6. **Documentation Overhead**: Need to document JSON schemas

### Mitigation Strategies

1. **Shared Output Library**: Common utilities for JSON formatting
2. **Schema Validation**: Automated testing of JSON schema compliance
3. **Performance Testing**: Benchmark JSON output performance
4. **Documentation Generation**: Automated schema documentation
5. **Gradual Implementation**: Roll out JSON support incrementally
6. **Response Caching**: Cache formatted responses for repeated calls

## Implementation Notes

### Shared Output Utilities
```python
# cli_output.py - Shared utilities
from typing import Any, Dict, Optional
import json
import sys
from datetime import datetime

class CliOutputManager:
    def __init__(self, json_mode: bool = False, operation: str = "unknown"):
        self.json_mode = json_mode
        self.operation = operation
    
    def success(self, data: Dict[str, Any]):
        self._output('success', data=data)
    
    def progress(self, current: int, total: int, operation: str, data: Optional[Dict] = None):
        progress_data = {
            'progress': {
                'current': current,
                'total': total,
                'percentage': (current / total) * 100 if total > 0 else 0,
                'currentOperation': operation
            }
        }
        if data:
            progress_data.update(data)
        self._output('progress', **progress_data)
    
    def error(self, message: str, code: str, suggestions: list, details: Optional[Dict] = None):
        error_data = {
            'error': {
                'message': message,
                'code': code,
                'suggestions': suggestions,
                'details': details or {}
            }
        }
        self._output('error', **error_data)
        sys.exit(1)
    
    def _output(self, status: str, **kwargs):
        if self.json_mode:
            response = {
                'status': status,
                'operation': self.operation,
                'timestamp': datetime.utcnow().isoformat(),
                **kwargs
            }
            click.echo(json.dumps(response, indent=2))
        else:
            self._human_readable_output(status, **kwargs)
    
    def _human_readable_output(self, status: str, **kwargs):
        if status == 'success':
            data = kwargs.get('data', {})
            click.echo(f"Operation {self.operation} completed successfully")
            if 'duration_seconds' in data:
                click.echo(f"Duration: {data['duration_seconds']:.1f} seconds")
        elif status == 'progress':
            progress = kwargs.get('progress', {})
            click.echo(f"{progress.get('currentOperation', 'Processing')}... ({progress.get('current', 0)}/{progress.get('total', 0)})")
        elif status == 'error':
            error = kwargs.get('error', {})
            click.echo(f"Error: {error.get('message', 'Unknown error')}")
            for suggestion in error.get('suggestions', []):
                click.echo(f"  - {suggestion}")
```

### Command Integration Pattern
```python
@click.command()
@click.option('--json-output', is_flag=True, help='Output structured JSON')
def generate_c(json_output: bool, **kwargs):
    """Generate Requirements matrix C."""
    output = CliOutputManager(json_output, 'generate-c')
    
    try:
        # Existing logic with output integration
        for i, progress in enumerate(generate_matrix_c()):
            output.progress(i + 1, 12, f"Generated cell ({progress.i},{progress.j})", {
                'current_cell': [progress.i, progress.j],
                'content': progress.content
            })
        
        output.success({
            'matrix_id': 'C',
            'cells_generated': 12,
            'duration_seconds': 180.5
        })
        
    except Neo4jConnectionError as e:
        output.error(
            message=str(e),
            code='NEO4J_CONNECTION_ERROR',
            suggestions=[
                'Check if Neo4j is running: systemctl status neo4j',
                'Verify credentials in .env file'
            ]
        )
    except OpenAIError as e:
        output.error(
            message=str(e),
            code='OPENAI_API_ERROR',
            suggestions=[
                'Verify OPENAI_API_KEY is set',
                'Check API rate limits and usage'
            ]
        )
```

### Testing Strategy
```python
def test_json_output_success():
    """Test successful operation with JSON output."""
    runner = CliRunner()
    result = runner.invoke(generate_c, ['--json-output'])
    
    assert result.exit_code == 0
    response = json.loads(result.output)
    assert response['status'] == 'success'
    assert response['operation'] == 'generate-c'
    assert 'timestamp' in response
    assert 'data' in response

def test_json_output_error():
    """Test error handling with JSON output."""
    runner = CliRunner()
    
    with patch('chirality_cli.connect_to_neo4j') as mock_connect:
        mock_connect.side_effect = ConnectionError("Connection refused")
        
        result = runner.invoke(generate_c, ['--json-output'])
        
        assert result.exit_code == 1
        response = json.loads(result.output)
        assert response['status'] == 'error'
        assert response['error']['code'] == 'NEO4J_CONNECTION_ERROR'
        assert len(response['error']['suggestions']) > 0

def test_backward_compatibility():
    """Ensure human-readable output unchanged."""
    runner = CliRunner()
    result = runner.invoke(generate_c)  # No --json-output flag
    
    assert result.exit_code == 0
    assert 'Matrix C generation completed' in result.output
    # Should not be valid JSON
    with pytest.raises(json.JSONDecodeError):
        json.loads(result.output)
```

### Admin UI Integration
```typescript
// Admin UI integration example
async function runCliOperation(command: string, args: Record<string, any>) {
  const cliArgs = ['--json-output', ...formatArgs(args)];
  const process = spawn('python', ['chirality_cli.py', command, ...cliArgs]);
  
  let lastProgress: ProgressInfo | null = null;
  
  return new Promise((resolve, reject) => {
    process.stdout.on('data', (data) => {
      const lines = data.toString().split('\n').filter(Boolean);
      
      for (const line of lines) {
        try {
          const response: CliResponse = JSON.parse(line);
          
          switch (response.status) {
            case 'progress':
              lastProgress = response.progress!;
              onProgress?.(response.progress!);
              break;
            case 'success':
              resolve(response.data);
              break;
            case 'error':
              reject(new Error(response.error!.message));
              break;
          }
        } catch (e) {
          // Handle non-JSON output (shouldn't happen with --json-output)
          console.warn('Non-JSON output from CLI:', line);
        }
      }
    });
  });
}
```

### Schema Documentation
```yaml
# OpenAPI schema for CLI JSON responses
CliResponse:
  type: object
  required: [status, operation, timestamp]
  properties:
    status:
      type: string
      enum: [success, error, progress]
    operation:
      type: string
      description: CLI command name
    timestamp:
      type: string
      format: date-time
    data:
      type: object
      description: Success response data
    error:
      $ref: '#/components/schemas/CliError'
    progress:
      $ref: '#/components/schemas/ProgressInfo'

CliError:
  type: object
  required: [message, code, suggestions]
  properties:
    message:
      type: string
    code:
      type: string
    suggestions:
      type: array
      items:
        type: string
    details:
      type: object
```

## References

- [Click Documentation](https://click.palletsprojects.com/) - Python CLI framework
- [JSON Schema](https://json-schema.org/) - Schema definition standards
- [OpenAPI Specification](https://swagger.io/specification/) - API documentation
- [Subprocess Communication](https://docs.python.org/3/library/subprocess.html) - Process integration patterns
- Internal discussion: CLI Output Standardization Requirements