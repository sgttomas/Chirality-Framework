# ADR-003: CLI Integration Pattern for Admin UI

## Status

Accepted

## Context

The Chirality Framework's backend operations are primarily driven by Python CLI tools (`chirality_cli.py`, `neo4j_admin.py`) that perform semantic matrix generation and database administration. The Admin UI needs to execute these CLI operations and provide real-time feedback to users.

Several integration patterns were considered:

1. **Direct Python Integration**: Import CLI modules directly in Node.js using Python bridge
2. **HTTP API Wrapper**: Create REST endpoints that wrap CLI operations
3. **CLI Process Spawning**: Spawn CLI processes from Node.js and capture output
4. **Message Queue**: Use message queue (Redis/RabbitMQ) for async CLI execution
5. **gRPC Service**: Create gRPC service layer for CLI operations

Key requirements:
- Real-time progress feedback during long operations (matrix generation can take 3-5 minutes)
- Error handling with actionable error messages
- Process isolation to prevent Node.js blocking
- Ability to cancel long-running operations
- Structured output for UI consumption

## Decision

We chose **CLI Process Spawning** with the following implementation pattern:

### Architecture
```
┌─────────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Admin UI          │────│   API Routes    │────│   CLI Process   │
│   (React/Next.js)   │    │   (Node.js)     │    │   (Python)      │
└─────────────────────┘    └─────────────────┘    └─────────────────┘
         │                           │                       │
    ┌────┴────┐                ┌────┴────┐              ┌────┴────┐
    │HTTP     │                │spawn()  │              │stdout   │
    │Request  │                │child_   │              │stderr   │
    │/Response│                │process  │              │exit_code│
    └─────────┘                └─────────┘              └─────────┘
```

### Implementation Details

#### API Route Pattern (`chirality-admin/pages/api/phase1/step.ts`)
```typescript
// Standardized CLI execution wrapper
async function runCli(command: string, args: Record<string, any>) {
  const process = spawn('python', ['chirality_cli.py', command, ...formatArgs(args)]);
  
  return new Promise((resolve, reject) => {
    let output = '';
    let errors = '';
    
    // Set timeout for long operations
    const timeout = setTimeout(() => {
      process.kill();
      reject(new Error('CLI operation timed out'));
    }, 5 * 60 * 1000); // 5 minutes
    
    process.stdout.on('data', (data) => {
      output += data.toString();
      // Stream real-time updates to frontend
      emitProgressUpdate(data.toString());
    });
    
    process.stderr.on('data', (data) => {
      errors += data.toString();
    });
    
    process.on('close', (code) => {
      clearTimeout(timeout);
      if (code === 0) {
        resolve(output);
      } else {
        reject(new Error(`CLI failed: ${errors}`));
      }
    });
  });
}
```

#### CLI Commands Supported
- `push-axioms`: Load matrices A, B, J from normative specification
- `generate-c`: Generate Requirements matrix C
- `generate-f`: Generate Objectives matrix F
- `generate-d`: Generate Solution Objectives matrix D
- `verify-stages`: Verify semantic stage completion

#### Error Handling Strategy
1. **Process-level errors**: Capture exit codes and stderr
2. **Timeout handling**: Kill processes that exceed reasonable time limits
3. **Resource cleanup**: Ensure proper process cleanup on failure
4. **Structured error responses**: Convert CLI errors to actionable UI messages

## Consequences

### Positive Consequences

1. **Process Isolation**: CLI operations run in separate processes, preventing Node.js blocking
2. **Real-time Feedback**: Can capture and stream stdout for progress updates
3. **Error Isolation**: CLI crashes don't affect the web server
4. **Flexible Execution**: Can easily modify CLI arguments and behavior
5. **Resource Management**: Can set timeouts and kill runaway processes
6. **Debugging**: Easy to test CLI operations independently
7. **Scalability**: Multiple CLI operations can run concurrently

### Negative Consequences

1. **Process Overhead**: Spawning processes has higher overhead than direct calls
2. **Platform Dependencies**: Process spawning behavior differs across operating systems
3. **Output Parsing**: Need to parse CLI output for structured data
4. **Environment Coupling**: CLI environment (Python, dependencies) must be available
5. **Inter-process Communication**: Limited to stdout/stderr communication
6. **Resource Usage**: Each CLI operation consumes additional system resources

### Mitigation Strategies

1. **Structured CLI Output**: Add `--json-output` flag to all CLI commands
2. **Process Pool Management**: Limit concurrent CLI operations to prevent resource exhaustion
3. **Environment Validation**: Validate Python and CLI availability at startup
4. **Graceful Degradation**: Provide fallback UI when CLI is unavailable
5. **Resource Monitoring**: Track process memory and CPU usage
6. **Timeout Configuration**: Make timeouts configurable based on operation type

## Implementation Notes

### Phase 1: Basic Integration (Completed)
```typescript
// Current implementation in step.ts
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { action, parameters } = req.body;
  
  try {
    let result;
    switch (action) {
      case 'push-axioms':
        result = await runCli('push-axioms', {
          api_base: parameters.api_base,
          spec: 'NORMATIVE_Chirality_Framework_14.2.1.1.txt'
        });
        break;
      case 'generate-c':
        result = await runCli('generate-c', {
          api_base: parameters.api_base,
          matrix: 'C'
        });
        break;
      default:
        throw new Error(`Unknown action: ${action}`);
    }
    
    res.status(200).json({ status: 'success', output: result });
  } catch (error) {
    res.status(500).json({ status: 'error', error: error.message });
  }
}
```

### Phase 2: Enhanced Integration (In Progress)
- Add remaining CLI commands (`generate-f`, `generate-d`, `verify-stages`)
- Implement real-time progress streaming via WebSocket or Server-Sent Events
- Add structured JSON output parsing
- Implement operation cancellation

### Phase 3: Production Hardening (Planned)
- Process pool management for concurrent operations
- Advanced error handling and recovery
- Performance monitoring and optimization
- Resource usage tracking and limits

### CLI Output Format Evolution
```bash
# Current: Human-readable output
$ python chirality_cli.py generate-c
Generating Requirements matrix C...
Cell (0,0): Problem.Systematic.Analysis
Cell (0,1): Problem.Systematic.Design
...
Matrix C generation completed in 180s

# Planned: Structured JSON output
$ python chirality_cli.py generate-c --json-output
{
  "status": "success",
  "operation": "generate-c",
  "matrix_id": "C",
  "cells_generated": 12,
  "duration_seconds": 180,
  "progress_updates": [
    {"cell": [0,0], "content": "Problem.Systematic.Analysis", "timestamp": "..."},
    {"cell": [0,1], "content": "Problem.Systematic.Design", "timestamp": "..."}
  ]
}
```

### Error Response Standardization
```typescript
interface CliErrorResponse {
  status: 'error';
  operation: string;
  message: string;
  suggestions: string[];
  details?: {
    exitCode: number;
    stderr: string;
    duration: number;
  };
  timestamp: string;
}
```

### Real-time Communication Pattern
```typescript
// Future implementation with Server-Sent Events
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.headers.accept === 'text/event-stream') {
    // Set up SSE for real-time updates
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    });
    
    const process = spawn('python', ['chirality_cli.py', 'generate-c', '--json-output']);
    
    process.stdout.on('data', (data) => {
      res.write(`data: ${data}\n\n`);
    });
    
    process.on('close', () => {
      res.end();
    });
  } else {
    // Traditional request/response for simple operations
    const result = await runCli(action, parameters);
    res.json(result);
  }
}
```

## References

- [Node.js Child Process](https://nodejs.org/api/child_process.html) - Official Node.js documentation
- [Server-Sent Events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events) - Real-time communication pattern
- [Process Management Best Practices](https://nodejs.org/en/docs/guides/child-processes/) - Node.js process management
- Python subprocess module documentation
- Internal discussion: CLI Integration Strategy Planning