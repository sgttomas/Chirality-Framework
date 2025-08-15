# ADR-007: Health Check and Monitoring Standards

## Status

Proposed

## Context

The Chirality Framework consists of multiple services (GraphQL service, CLI tools, Neo4j database) that need comprehensive health monitoring for:

1. **Production Deployment**: Kubernetes and container orchestration require standardized health endpoints
2. **Development Experience**: Developers need quick feedback on system status during setup
3. **Service Dependencies**: Services depend on Neo4j, OpenAI API, and each other
4. **Operational Monitoring**: Operations teams need consistent monitoring across all services
5. **Automated Testing**: CI/CD pipelines need reliable health validation

Current state:
- No standardized health check endpoints
- Inconsistent error reporting across services
- Manual verification of service dependencies
- Limited observability into service health

Requirements:
- Standardized health check endpoints (`/health`, `/ready`)
- Dependency validation (Neo4j, OpenAI API connectivity)
- Performance metrics collection
- Consistent health check response format
- Integration with monitoring tools (Prometheus, etc.)

Health check patterns considered:
- **Basic HTTP endpoints**: Simple health status responses
- **Kubernetes-style checks**: Separate liveness and readiness probes
- **Comprehensive diagnostics**: Detailed health information with dependency status
- **Performance-aware**: Include performance metrics in health responses

## Decision

We will implement **Kubernetes-style health check standards** with comprehensive diagnostics:

### Standardized Endpoints

#### 1. Health Endpoint (`/health`)
**Purpose**: Liveness probe - is the service running?
**Response**: Basic service status
```http
GET /health
```

**Healthy Response (200 OK):**
```json
{
  "status": "healthy",
  "timestamp": "2025-01-15T10:30:00.000Z",
  "service": "graphql-service",
  "version": "1.0.0",
  "uptime": 3600.5
}
```

**Unhealthy Response (503 Service Unavailable):**
```json
{
  "status": "unhealthy",
  "timestamp": "2025-01-15T10:30:00.000Z",
  "service": "graphql-service",
  "error": "Service initialization failed",
  "details": {
    "error_code": "INIT_FAILURE",
    "component": "graphql_schema"
  }
}
```

#### 2. Readiness Endpoint (`/ready`)
**Purpose**: Readiness probe - is the service ready to accept traffic?
**Response**: Service + dependency status
```http
GET /ready
```

**Ready Response (200 OK):**
```json
{
  "status": "ready",
  "timestamp": "2025-01-15T10:30:00.000Z",
  "service": "graphql-service",
  "dependencies": {
    "neo4j": {
      "status": "connected",
      "latency_ms": 23.5,
      "last_check": "2025-01-15T10:29:55.000Z"
    },
    "graphql_schema": {
      "status": "loaded",
      "types_count": 15,
      "last_compiled": "2025-01-15T10:25:00.000Z"
    }
  },
  "checks": {
    "database_connectivity": "pass",
    "schema_compilation": "pass",
    "memory_usage": "pass"
  }
}
```

**Not Ready Response (503 Service Unavailable):**
```json
{
  "status": "not_ready",
  "timestamp": "2025-01-15T10:30:00.000Z",
  "service": "graphql-service", 
  "dependencies": {
    "neo4j": {
      "status": "disconnected",
      "error": "Connection timeout after 30s",
      "last_attempt": "2025-01-15T10:29:45.000Z"
    }
  },
  "checks": {
    "database_connectivity": "fail",
    "schema_compilation": "pass", 
    "memory_usage": "pass"
  },
  "suggestions": [
    "Check Neo4j service status",
    "Verify network connectivity",
    "Validate database credentials"
  ]
}
```

#### 3. Metrics Endpoint (`/metrics`)
**Purpose**: Performance and operational metrics
**Response**: Prometheus-compatible metrics
```http
GET /metrics
```

### Implementation Pattern

#### GraphQL Service Health Checks
```typescript
// graphql-service/src/health.ts
import { Router } from 'express';
import { driver } from './neo4j';

export const healthRouter = Router();

interface HealthStatus {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  service: string;
  version: string;
  uptime: number;
  error?: string;
  details?: Record<string, any>;
}

interface ReadinessStatus {
  status: 'ready' | 'not_ready';
  timestamp: string;
  service: string;
  dependencies: Record<string, DependencyStatus>;
  checks: Record<string, 'pass' | 'fail'>;
  suggestions?: string[];
}

interface DependencyStatus {
  status: 'connected' | 'disconnected' | 'degraded';
  latency_ms?: number;
  last_check: string;
  error?: string;
}

// Health endpoint (liveness)
healthRouter.get('/health', async (req, res) => {
  try {
    const health: HealthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'graphql-service',
      version: process.env.npm_package_version || '1.0.0',
      uptime: process.uptime()
    };
    
    res.status(200).json(health);
  } catch (error) {
    const health: HealthStatus = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      service: 'graphql-service',
      version: process.env.npm_package_version || '1.0.0',
      uptime: process.uptime(),
      error: error.message,
      details: {
        error_code: 'HEALTH_CHECK_FAILURE',
        stack: error.stack
      }
    };
    
    res.status(503).json(health);
  }
});

// Readiness endpoint (readiness)
healthRouter.get('/ready', async (req, res) => {
  const startTime = Date.now();
  const checks: Record<string, 'pass' | 'fail'> = {};
  const dependencies: Record<string, DependencyStatus> = {};
  const suggestions: string[] = [];
  
  try {
    // Check Neo4j connectivity
    const neo4jStart = Date.now();
    await driver.verifyConnectivity();
    const neo4jLatency = Date.now() - neo4jStart;
    
    dependencies.neo4j = {
      status: 'connected',
      latency_ms: neo4jLatency,
      last_check: new Date().toISOString()
    };
    checks.database_connectivity = 'pass';
    
  } catch (error) {
    dependencies.neo4j = {
      status: 'disconnected',
      error: error.message,
      last_check: new Date().toISOString()
    };
    checks.database_connectivity = 'fail';
    suggestions.push('Check Neo4j service status');
    suggestions.push('Verify database credentials');
  }
  
  try {
    // Check GraphQL schema compilation
    const schema = await neoSchema.getSchema();
    const typeCount = schema.getTypeMap();
    
    dependencies.graphql_schema = {
      status: 'loaded',
      last_check: new Date().toISOString()
    };
    checks.schema_compilation = 'pass';
    
  } catch (error) {
    dependencies.graphql_schema = {
      status: 'disconnected',
      error: error.message,
      last_check: new Date().toISOString()
    };
    checks.schema_compilation = 'fail';
    suggestions.push('Check GraphQL schema definitions');
  }
  
  // Check memory usage
  const memUsage = process.memoryUsage();
  const memUsageMB = memUsage.heapUsed / 1024 / 1024;
  
  if (memUsageMB < 512) { // Less than 512MB
    checks.memory_usage = 'pass';
  } else {
    checks.memory_usage = 'fail';
    suggestions.push('High memory usage detected');
  }
  
  const allPassed = Object.values(checks).every(check => check === 'pass');
  const status = allPassed ? 'ready' : 'not_ready';
  
  const readiness: ReadinessStatus = {
    status,
    timestamp: new Date().toISOString(),
    service: 'graphql-service',
    dependencies,
    checks,
    ...(suggestions.length > 0 && { suggestions })
  };
  
  res.status(allPassed ? 200 : 503).json(readiness);
});

// Metrics endpoint (Prometheus format)
healthRouter.get('/metrics', async (req, res) => {
  const metrics = await collectMetrics();
  res.set('Content-Type', 'text/plain');
  res.send(formatPrometheusMetrics(metrics));
});
```

#### CLI Health Check Commands
```python
# Add health-check command to chirality_cli.py
@click.command()
@click.option('--json-output', is_flag=True, help='Output structured JSON')
@click.option('--verbose', is_flag=True, help='Detailed health information')
def health_check(json_output: bool, verbose: bool):
    """Perform comprehensive health check of all services."""
    
    checks = {}
    overall_status = 'healthy'
    suggestions = []
    
    # Check Neo4j connectivity
    try:
        driver = GraphDatabase.driver(
            os.getenv('NEO4J_URI'),
            auth=(os.getenv('NEO4J_USER'), os.getenv('NEO4J_PASSWORD'))
        )
        start_time = time.time()
        driver.verify_connectivity()
        latency = (time.time() - start_time) * 1000
        driver.close()
        
        checks['neo4j_connection'] = {
            'status': 'pass',
            'latency_ms': latency,
            'details': 'Connected successfully'
        }
    except Exception as e:
        checks['neo4j_connection'] = {
            'status': 'fail',
            'error': str(e),
            'details': 'Failed to connect to Neo4j'
        }
        overall_status = 'unhealthy'
        suggestions.extend([
            'Check if Neo4j is running',
            'Verify NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD in environment'
        ])
    
    # Check OpenAI API
    try:
        client = openai.OpenAI(api_key=os.getenv('OPENAI_API_KEY'))
        # Test API access without making expensive calls
        checks['openai_api'] = {
            'status': 'pass',
            'details': 'API client initialized successfully'
        }
    except Exception as e:
        checks['openai_api'] = {
            'status': 'fail',
            'error': str(e),
            'details': 'Failed to initialize OpenAI client'
        }
        overall_status = 'unhealthy'
        suggestions.extend([
            'Verify OPENAI_API_KEY is set correctly',
            'Check OpenAI API status and rate limits'
        ])
    
    # Check GraphQL service connectivity
    try:
        response = requests.get('http://localhost:8080/health', timeout=10)
        if response.status_code == 200:
            checks['graphql_service'] = {
                'status': 'pass',
                'details': 'GraphQL service is healthy'
            }
        else:
            raise Exception(f"GraphQL service returned {response.status_code}")
    except Exception as e:
        checks['graphql_service'] = {
            'status': 'fail',
            'error': str(e),
            'details': 'GraphQL service not accessible'
        }
        overall_status = 'unhealthy'
        suggestions.append('Start GraphQL service: cd graphql-service && npm run dev')
    
    # Check environment variables
    required_vars = ['OPENAI_API_KEY', 'NEO4J_URI', 'NEO4J_USER', 'NEO4J_PASSWORD']
    missing_vars = [var for var in required_vars if not os.getenv(var)]
    
    if missing_vars:
        checks['environment_variables'] = {
            'status': 'fail',
            'error': f'Missing variables: {missing_vars}',
            'details': 'Required environment variables not set'
        }
        overall_status = 'unhealthy'
        suggestions.append('Set missing environment variables in .env file')
    else:
        checks['environment_variables'] = {
            'status': 'pass',
            'details': 'All required environment variables set'
        }
    
    # Output results
    result = {
        'status': overall_status,
        'timestamp': datetime.utcnow().isoformat(),
        'service': 'chirality-cli',
        'checks': checks,
        'summary': {
            'total_checks': len(checks),
            'passed': sum(1 for check in checks.values() if check['status'] == 'pass'),
            'failed': sum(1 for check in checks.values() if check['status'] == 'fail')
        }
    }
    
    if suggestions:
        result['suggestions'] = suggestions
    
    if json_output:
        click.echo(json.dumps(result, indent=2))
    else:
        # Human-readable output
        click.echo(f"Health Check Status: {overall_status.upper()}")
        click.echo(f"Timestamp: {result['timestamp']}")
        click.echo()
        
        for check_name, check_result in checks.items():
            status_icon = "✅" if check_result['status'] == 'pass' else "❌"
            click.echo(f"{status_icon} {check_name.replace('_', ' ').title()}: {check_result['status'].upper()}")
            
            if verbose and 'details' in check_result:
                click.echo(f"   Details: {check_result['details']}")
            if check_result['status'] == 'fail' and 'error' in check_result:
                click.echo(f"   Error: {check_result['error']}")
        
        if suggestions:
            click.echo("\nSuggestions:")
            for suggestion in suggestions:
                click.echo(f"  - {suggestion}")
    
    # Exit with error code if unhealthy
    if overall_status == 'unhealthy':
        sys.exit(1)
```

### Docker Integration
```dockerfile
# GraphQL service Dockerfile health check
FROM node:18-alpine

# ... service setup ...

# Health check for Docker
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8080/health || exit 1

EXPOSE 8080
CMD ["npm", "start"]
```

### Kubernetes Integration
```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: chirality-graphql
spec:
  template:
    spec:
      containers:
      - name: graphql-service
        image: chirality/graphql-service:latest
        ports:
        - containerPort: 8080
        
        # Liveness probe
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
        
        # Readiness probe  
        readinessProbe:
          httpGet:
            path: /ready
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 3

---
apiVersion: v1
kind: Service
metadata:
  name: chirality-graphql-service
spec:
  selector:
    app: chirality-graphql
  ports:
  - port: 8080
    targetPort: 8080
```

### Monitoring Integration
```yaml
# prometheus-config.yaml
global:
  scrape_interval: 15s

scrape_configs:
- job_name: 'chirality-graphql'
  static_configs:
  - targets: ['localhost:8080']
  metrics_path: /metrics
  scrape_interval: 10s

- job_name: 'chirality-health'
  static_configs:
  - targets: ['localhost:8080']
  metrics_path: /ready
  scrape_interval: 30s
```

## Consequences

### Positive Consequences

1. **Production Readiness**: Standardized health checks enable reliable deployments
2. **Developer Experience**: Quick system status validation during development
3. **Operational Visibility**: Consistent monitoring across all services
4. **Automated Recovery**: Health checks enable automatic service recovery
5. **Dependency Tracking**: Clear visibility into service dependencies
6. **Performance Monitoring**: Built-in performance metrics collection
7. **Troubleshooting**: Actionable suggestions for common issues

### Negative Consequences

1. **Implementation Overhead**: Health checks add complexity to each service
2. **Performance Impact**: Regular health checks consume system resources
3. **False Positives**: Overly sensitive checks may trigger unnecessary alerts
4. **Maintenance Burden**: Health check logic needs ongoing maintenance
5. **Dependencies**: Health checks themselves become potential failure points

### Mitigation Strategies

1. **Efficient Implementation**: Lightweight health checks with minimal overhead
2. **Configurable Intervals**: Adjustable check frequencies based on environment
3. **Circuit Breaker Pattern**: Prevent cascading failures from health checks
4. **Comprehensive Testing**: Test health check reliability under various conditions
5. **Documentation**: Clear documentation for health check interpretation
6. **Monitoring the Monitors**: Alert on health check system failures

## Implementation Notes

### Development Scripts Integration
```bash
# Update dev-start.sh to include health validation
echo "Validating service health..."
python chirality_cli.py health-check --json-output > health_status.json

if [ $? -eq 0 ]; then
    echo "✅ All services healthy"
else
    echo "❌ Health check failed. See health_status.json for details"
    cat health_status.json
fi
```

### CI/CD Integration
```yaml
# .github/workflows/health-check.yml
name: Health Check Validation

on: [push, pull_request]

jobs:
  health-check:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v2
    
    - name: Setup services
      run: |
        docker-compose up -d neo4j
        cd graphql-service && npm install && npm run dev &
        
    - name: Wait for services
      run: sleep 30
      
    - name: Run health checks
      run: |
        python chirality_cli.py health-check --json-output
        curl -f http://localhost:8080/health
        curl -f http://localhost:8080/ready
```

### Alerting Rules
```yaml
# alerting-rules.yaml
groups:
- name: chirality-health
  rules:
  - alert: ServiceUnhealthy
    expr: up{job="chirality-graphql"} == 0
    for: 1m
    labels:
      severity: critical
    annotations:
      summary: "Chirality GraphQL service is down"
      
  - alert: ServiceNotReady
    expr: probe_success{job="chirality-health"} == 0
    for: 2m
    labels:
      severity: warning
    annotations:
      summary: "Chirality service not ready"
```

## References

- [Kubernetes Health Checks](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/) - K8s health check patterns
- [Prometheus Monitoring](https://prometheus.io/docs/practices/naming/) - Metrics collection standards
- [12-Factor App Health Checks](https://12factor.net/admin-processes) - Application health patterns
- [Docker Health Checks](https://docs.docker.com/engine/reference/builder/#healthcheck) - Container health validation
- [OpenAPI Health Check Specification](https://inadarei.github.io/rfc-healthcheck/) - Standard health check format