# CLAUDE_GRAPHQL.md

Specific guidance for Claude Code when working on GraphQL service development for the Chirality Framework.

## GraphQL Service Context

The GraphQL service (`graphql-service/`) provides the primary data layer for the Chirality Framework, offering direct Neo4j integration for semantic matrix operations, component management, and graph queries.

### Service Architecture

```
┌─────────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  GraphQL Yoga      │────│  @neo4j/graphql │────│  Neo4j Database │
│  HTTP Server       │    │  Schema Layer   │    │  Graph Storage  │
│  (Port 8080)       │    │  Auto Resolvers │    │  Components     │
└─────────────────────┘    └─────────────────┘    └─────────────────┘
         │                           │                       │
    ┌────┴────┐                ┌────┴────┐              ┌────┴────┐
    │Health   │                │Type Defs│              │Cypher   │
    │Endpoints│                │Resolvers│              │Queries  │
    │Metrics  │                │Codegen  │              │Indexes  │
    └─────────┘                └─────────┘              └─────────┘
```

## Current GraphQL Service Status

### ✅ Implemented Features
- Basic GraphQL Yoga server setup
- Neo4j integration via @neo4j/graphql
- Core schema definitions for Components, Cells, Stations
- Basic queries and mutations
- Development server with hot reload

### 🔄 High Priority Development Requirements

#### 1. Health Check Endpoints (Immediate Priority)
**File**: `graphql-service/src/index.ts`
**Current Issue**: No health monitoring capabilities

**Required Implementation**:
```typescript
import { createYoga } from 'graphql-yoga'
import { Neo4jGraphQL } from '@neo4j/graphql'
import { driver } from './neo4j-driver'

// Health check endpoints
const healthRoutes = {
  '/health': async (req: Request, res: Response) => {
    try {
      // Basic service health
      const response = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'graphql-service',
        version: process.env.npm_package_version || '1.0.0'
      }
      
      res.status(200).json(response)
    } catch (error) {
      res.status(503).json({
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      })
    }
  },

  '/ready': async (req: Request, res: Response) => {
    try {
      // Check Neo4j connectivity
      await driver.verifyConnectivity()
      
      // Check GraphQL schema compilation
      await neoSchema.getSchema()
      
      res.status(200).json({
        status: 'ready',
        timestamp: new Date().toISOString(),
        dependencies: {
          neo4j: 'connected',
          graphql: 'schema_loaded'
        }
      })
    } catch (error) {
      res.status(503).json({
        status: 'not_ready',
        error: error.message,
        timestamp: new Date().toISOString()
      })
    }
  }
}

// Enhanced server setup
const yoga = createYoga({
  schema: neoSchema.schema,
  context: ({ request }) => ({
    driver,
    correlationId: request.headers.get('x-correlation-id') || generateId()
  }),
  plugins: [
    requestLoggingPlugin(),
    performanceMetricsPlugin()
  ]
})

const server = createServer(yoga)

// Add health routes
Object.entries(healthRoutes).forEach(([path, handler]) => {
  server.on('request', (req, res) => {
    if (req.url === path && req.method === 'GET') {
      handler(req, res)
      return
    }
  })
})
```

#### 2. Request Logging & Monitoring (High Priority)
**Current Issue**: No observability into GraphQL operations

**Required Implementation**:
```typescript
interface RequestMetrics {
  correlationId: string
  operation?: string
  operationType?: 'query' | 'mutation' | 'subscription'
  startTime: number
  endTime?: number
  duration?: number
  success: boolean
  error?: string
  userId?: string
}

const requestLoggingPlugin = () => ({
  onRequest: ({ request, endResponse }) => {
    const correlationId = request.headers.get('x-correlation-id') || generateId()
    const startTime = Date.now()
    
    // Log request start
    console.log(JSON.stringify({
      level: 'info',
      message: 'GraphQL request started',
      correlationId,
      method: request.method,
      url: request.url,
      timestamp: new Date().toISOString(),
      userAgent: request.headers.get('user-agent')
    }))
    
    return {
      onResponse: ({ response }) => {
        const endTime = Date.now()
        const duration = endTime - startTime
        
        // Log request completion
        console.log(JSON.stringify({
          level: 'info',
          message: 'GraphQL request completed',
          correlationId,
          duration,
          status: response.status,
          timestamp: new Date().toISOString()
        }))
      }
    }
  },
  
  onParse: ({ params, setParsedDocument }) => {
    return {
      onParseDone: ({ result }) => {
        if (result instanceof Error) {
          console.error(JSON.stringify({
            level: 'error',
            message: 'GraphQL parse error',
            error: result.message,
            timestamp: new Date().toISOString()
          }))
        }
      }
    }
  }
})

const performanceMetricsPlugin = () => {
  const metrics = new Map<string, RequestMetrics[]>()
  
  return {
    onExecute: ({ args }) => {
      const startTime = performance.now()
      const operationName = args.document.definitions[0]?.name?.value || 'anonymous'
      
      return {
        onExecuteDone: ({ result }) => {
          const endTime = performance.now()
          const duration = endTime - startTime
          
          // Store metrics
          if (!metrics.has(operationName)) {
            metrics.set(operationName, [])
          }
          
          metrics.get(operationName)!.push({
            correlationId: args.contextValue.correlationId,
            operation: operationName,
            startTime,
            endTime,
            duration,
            success: !result.errors,
            error: result.errors?.[0]?.message
          })
          
          // Log slow queries (>1 second)
          if (duration > 1000) {
            console.warn(JSON.stringify({
              level: 'warn',
              message: 'Slow GraphQL query detected',
              operation: operationName,
              duration,
              correlationId: args.contextValue.correlationId,
              timestamp: new Date().toISOString()
            }))
          }
        }
      }
    }
  }
}
```

#### 3. Performance Metrics Collection (High Priority)
**Current Issue**: No performance monitoring or optimization insights

**Required Implementation**:
```typescript
// Metrics collection service
class MetricsCollector {
  private queryTimes: Map<string, number[]> = new Map()
  private errorCounts: Map<string, number> = new Map()
  private connectionPoolStats = {
    active: 0,
    idle: 0,
    total: 0
  }

  recordQueryTime(operation: string, duration: number) {
    if (!this.queryTimes.has(operation)) {
      this.queryTimes.set(operation, [])
    }
    this.queryTimes.get(operation)!.push(duration)
    
    // Keep only last 100 measurements
    const times = this.queryTimes.get(operation)!
    if (times.length > 100) {
      times.shift()
    }
  }

  recordError(operation: string) {
    const current = this.errorCounts.get(operation) || 0
    this.errorCounts.set(operation, current + 1)
  }

  getMetrics() {
    const metrics = {
      queries: {},
      errors: Object.fromEntries(this.errorCounts),
      connectionPool: this.connectionPoolStats,
      timestamp: new Date().toISOString()
    }

    // Calculate query statistics
    for (const [operation, times] of this.queryTimes) {
      if (times.length > 0) {
        metrics.queries[operation] = {
          count: times.length,
          avgDuration: times.reduce((a, b) => a + b, 0) / times.length,
          minDuration: Math.min(...times),
          maxDuration: Math.max(...times),
          p95Duration: this.percentile(times, 0.95)
        }
      }
    }

    return metrics
  }

  private percentile(arr: number[], p: number): number {
    const sorted = [...arr].sort((a, b) => a - b)
    const index = Math.ceil(sorted.length * p) - 1
    return sorted[index]
  }
}

const metricsCollector = new MetricsCollector()

// Metrics endpoint
const metricsHandler = async (req: Request, res: Response) => {
  try {
    const metrics = metricsCollector.getMetrics()
    
    // Add system metrics
    const systemMetrics = {
      ...metrics,
      system: {
        memory: process.memoryUsage(),
        uptime: process.uptime(),
        cpuUsage: process.cpuUsage()
      }
    }
    
    res.status(200).json(systemMetrics)
  } catch (error) {
    res.status(500).json({
      error: 'Failed to collect metrics',
      message: error.message
    })
  }
}
```

#### 4. Rate Limiting Protection (High Priority)
**Current Issue**: No protection against query abuse or DoS attacks

**Required Implementation**:
```typescript
import { RateLimiterRedis } from 'rate-limiter-flexible'

// Rate limiter configuration
const rateLimiter = new RateLimiterRedis({
  storeClient: redisClient, // Optional: use Redis for distributed limiting
  keyPrefix: 'chirality_gql',
  points: 100, // Number of requests
  duration: 60, // Per 60 seconds
  blockDuration: 60, // Block for 60 seconds if limit exceeded
})

const rateLimitingPlugin = () => ({
  onRequest: async ({ request, endResponse }) => {
    const clientId = getClientId(request) // IP address or user ID
    
    try {
      await rateLimiter.consume(clientId)
    } catch (rejRes) {
      const secs = Math.round(rejRes.msBeforeNext / 1000) || 1
      
      endResponse(
        new Response(
          JSON.stringify({
            error: 'Rate limit exceeded',
            retryAfter: secs,
            limit: 100,
            window: 60
          }),
          {
            status: 429,
            headers: {
              'Retry-After': String(secs),
              'X-RateLimit-Limit': '100',
              'X-RateLimit-Remaining': '0',
              'X-RateLimit-Reset': new Date(Date.now() + rejRes.msBeforeNext).toISOString()
            }
          }
        )
      )
    }
  }
})

function getClientId(request: Request): string {
  // Try to get user ID from auth header
  const authHeader = request.headers.get('authorization')
  if (authHeader) {
    // Extract user ID from JWT or API key
    return extractUserIdFromAuth(authHeader)
  }
  
  // Fallback to IP address
  return request.headers.get('x-forwarded-for') || 
         request.headers.get('x-real-ip') || 
         'unknown'
}
```

### 🔶 Medium Priority Enhancements

#### 5. Query Optimization (Medium Priority)
**File**: `graphql-service/src/schema.ts`

```typescript
// Enhanced schema with performance optimizations
const typeDefs = `
  type Component {
    id: ID!
    name: String!
    station: String!
    shape: [Int!]!
    cells: [Cell!]! @relationship(type: "HAS_CELL", direction: OUT)
    
    # Add indexes for common queries
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
    
    # Performance optimization fields
    searchableContent: String @fulltext(indexes: ["cellContent"])
  }
  
  # Optimized queries with built-in filtering
  type Query {
    # Paginated component queries
    components(
      station: String
      limit: Int = 20
      offset: Int = 0
      orderBy: ComponentOrderBy = CREATED_AT_DESC
    ): [Component!]!
    
    # Efficient cell search
    searchCells(
      query: String!
      station: String
      limit: Int = 10
    ): [Cell!]! @fulltext(indexes: ["cellContent"])
    
    # Performance monitoring
    queryMetrics: QueryMetrics!
  }
  
  enum ComponentOrderBy {
    CREATED_AT_ASC
    CREATED_AT_DESC
    NAME_ASC
    NAME_DESC
  }
  
  type QueryMetrics {
    totalQueries: Int!
    avgQueryTime: Float!
    slowQueries: [SlowQuery!]!
  }
  
  type SlowQuery {
    operation: String!
    duration: Float!
    timestamp: DateTime!
  }
`

// Custom resolvers for performance
const resolvers = {
  Query: {
    queryMetrics: () => {
      return metricsCollector.getMetrics()
    }
  },
  
  Component: {
    // Optimize cell loading with DataLoader
    cells: async (parent, args, context) => {
      return cellLoader.load(parent.id)
    }
  }
}

// DataLoader for efficient batch loading
import DataLoader from 'dataloader'

const cellLoader = new DataLoader(async (componentIds: string[]) => {
  const session = driver.session()
  try {
    const result = await session.run(`
      MATCH (c:Component)-[:HAS_CELL]->(cell:Cell)
      WHERE c.id IN $componentIds
      RETURN c.id as componentId, collect(cell) as cells
    `, { componentIds })
    
    // Return cells in same order as componentIds
    const cellMap = new Map()
    result.records.forEach(record => {
      cellMap.set(record.get('componentId'), record.get('cells'))
    })
    
    return componentIds.map(id => cellMap.get(id) || [])
  } finally {
    await session.close()
  }
})
```

#### 6. Caching Layer (Medium Priority)
```typescript
import Redis from 'ioredis'

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379')

// GraphQL response caching
const cachingPlugin = () => ({
  onExecute: ({ args }) => {
    const operationName = args.document.definitions[0]?.name?.value
    const cacheKey = generateCacheKey(args)
    
    return {
      onExecuteDone: async ({ result }) => {
        // Cache successful queries for 5 minutes
        if (!result.errors && isCacheable(operationName)) {
          await redis.setex(cacheKey, 300, JSON.stringify(result))
        }
      }
    }
  },
  
  onRequest: async ({ request, setResult }) => {
    const cacheKey = generateCacheKey(request)
    const cached = await redis.get(cacheKey)
    
    if (cached) {
      setResult(JSON.parse(cached))
    }
  }
})

function generateCacheKey(args: any): string {
  // Create cache key from query and variables
  return `gql:${hashQuery(args.document)}:${hashVariables(args.variableValues)}`
}

function isCacheable(operationName: string): boolean {
  // Only cache read operations
  const readOnlyOps = ['components', 'component', 'cells', 'searchCells']
  return readOnlyOps.includes(operationName)
}
```

## GraphQL Development Patterns

### 1. Schema-First Development
```typescript
// Define schema first, then implement resolvers
const typeDefs = `
  type Mutation {
    createComponent(input: ComponentInput!): Component!
    updateCell(id: ID!, content: String!): Cell!
    bulkUpdateCells(updates: [CellUpdateInput!]!): [Cell!]!
  }
  
  input ComponentInput {
    name: String!
    station: String!
    shape: [Int!]!
  }
  
  input CellUpdateInput {
    id: ID!
    resolved: String
    intermediate: [String!]
  }
`

// Implement type-safe resolvers
const resolvers: Resolvers = {
  Mutation: {
    createComponent: async (parent, { input }, context) => {
      // Validate input
      validateComponentInput(input)
      
      // Create component in Neo4j
      const session = context.driver.session()
      try {
        const result = await session.run(`
          CREATE (c:Component $props)
          RETURN c
        `, { props: input })
        
        return result.records[0].get('c').properties
      } finally {
        await session.close()
      }
    },
    
    bulkUpdateCells: async (parent, { updates }, context) => {
      // Validate all updates first
      updates.forEach(validateCellUpdate)
      
      // Perform batch update
      const session = context.driver.session()
      const tx = session.beginTransaction()
      
      try {
        const results = []
        for (const update of updates) {
          const result = await tx.run(`
            MATCH (cell:Cell {id: $id})
            SET cell.resolved = $resolved,
                cell.intermediate = $intermediate
            RETURN cell
          `, update)
          
          results.push(result.records[0].get('cell').properties)
        }
        
        await tx.commit()
        return results
      } catch (error) {
        await tx.rollback()
        throw error
      } finally {
        await session.close()
      }
    }
  }
}
```

### 2. Error Handling Patterns
```typescript
import { GraphQLError } from 'graphql'

// Custom error types
class ChiralityGraphQLError extends GraphQLError {
  constructor(message: string, code: string, statusCode: number = 400) {
    super(message, {
      extensions: {
        code,
        statusCode,
        timestamp: new Date().toISOString()
      }
    })
  }
}

class ValidationError extends ChiralityGraphQLError {
  constructor(field: string, message: string) {
    super(`Validation failed for ${field}: ${message}`, 'VALIDATION_ERROR', 400)
  }
}

class DatabaseError extends ChiralityGraphQLError {
  constructor(operation: string, originalError: Error) {
    super(`Database operation failed: ${operation}`, 'DATABASE_ERROR', 500)
    this.extensions.originalError = originalError.message
  }
}

// Error handling in resolvers
const resolvers = {
  Query: {
    component: async (parent, { id }, context) => {
      try {
        if (!id) {
          throw new ValidationError('id', 'Component ID is required')
        }
        
        const session = context.driver.session()
        const result = await session.run(`
          MATCH (c:Component {id: $id})
          RETURN c
        `, { id })
        
        if (result.records.length === 0) {
          throw new ChiralityGraphQLError(`Component not found: ${id}`, 'NOT_FOUND', 404)
        }
        
        return result.records[0].get('c').properties
        
      } catch (error) {
        if (error instanceof ChiralityGraphQLError) {
          throw error
        }
        
        // Log unexpected errors
        console.error('Unexpected error in component query:', error)
        throw new DatabaseError('component lookup', error)
      }
    }
  }
}
```

### 3. Integration Testing
```typescript
import { createTestClient } from 'apollo-server-testing'
import { gql } from 'apollo-server-core'

describe('GraphQL Service', () => {
  let testClient: any
  
  beforeEach(async () => {
    // Setup test database
    await setupTestDatabase()
    
    // Create test client
    testClient = createTestClient({
      typeDefs,
      resolvers,
      context: { driver: testDriver }
    })
  })
  
  afterEach(async () => {
    await cleanupTestDatabase()
  })
  
  test('should create component', async () => {
    const CREATE_COMPONENT = gql`
      mutation CreateComponent($input: ComponentInput!) {
        createComponent(input: $input) {
          id
          name
          station
          shape
        }
      }
    `
    
    const result = await testClient.mutate({
      mutation: CREATE_COMPONENT,
      variables: {
        input: {
          name: 'Test Matrix',
          station: 'Requirements',
          shape: [3, 4]
        }
      }
    })
    
    expect(result.errors).toBeUndefined()
    expect(result.data.createComponent).toMatchObject({
      name: 'Test Matrix',
      station: 'Requirements',
      shape: [3, 4]
    })
  })
  
  test('should handle validation errors', async () => {
    const result = await testClient.mutate({
      mutation: CREATE_COMPONENT,
      variables: {
        input: {
          name: '', // Invalid empty name
          station: 'Requirements',
          shape: [3, 4]
        }
      }
    })
    
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0].extensions.code).toBe('VALIDATION_ERROR')
  })
})
```

## Production Deployment Considerations

### Environment Variables
```env
# GraphQL Service Configuration
NODE_ENV=production
PORT=8080
LOG_LEVEL=info

# Neo4j Configuration
NEO4J_URI=neo4j+s://production-cluster.databases.neo4j.io
NEO4J_USER=production_user
NEO4J_PASSWORD=secure_password
NEO4J_DATABASE=chirality

# Rate Limiting
RATE_LIMIT_MAX=1000
RATE_LIMIT_WINDOW=900000

# Caching
REDIS_URL=redis://cache-cluster:6379
CACHE_TTL=300

# Monitoring
METRICS_ENABLED=true
HEALTH_CHECK_INTERVAL=30000
```

### Production Startup Script
```typescript
// production-server.ts
import { createServer } from 'http'
import { createYoga } from 'graphql-yoga'
import { setupHealthChecks } from './health'
import { setupMetrics } from './metrics'
import { setupRateLimiting } from './rate-limiting'

async function startServer() {
  try {
    // Validate environment
    validateEnvironment()
    
    // Setup GraphQL yoga with all plugins
    const yoga = createYoga({
      schema: neoSchema.schema,
      plugins: [
        requestLoggingPlugin(),
        performanceMetricsPlugin(),
        rateLimitingPlugin(),
        cachingPlugin()
      ]
    })
    
    const server = createServer(yoga)
    
    // Setup health checks
    setupHealthChecks(server)
    
    // Setup metrics endpoint
    setupMetrics(server)
    
    const port = process.env.PORT || 8080
    server.listen(port, () => {
      console.log(`GraphQL service running on port ${port}`)
      console.log(`GraphQL endpoint: http://localhost:${port}/graphql`)
      console.log(`Health check: http://localhost:${port}/health`)
      console.log(`Metrics: http://localhost:${port}/metrics`)
    })
    
    // Graceful shutdown
    process.on('SIGTERM', gracefulShutdown)
    process.on('SIGINT', gracefulShutdown)
    
  } catch (error) {
    console.error('Failed to start GraphQL service:', error)
    process.exit(1)
  }
}

function gracefulShutdown() {
  console.log('Shutting down GraphQL service...')
  // Close database connections
  driver.close()
  // Close server
  server.close(() => {
    console.log('GraphQL service shut down gracefully')
    process.exit(0)
  })
}

startServer()
```

---

**Key Development Guidelines**:
1. Always implement health checks before adding new features
2. Add request logging and metrics for all new resolvers
3. Use rate limiting to protect against abuse
4. Implement proper error handling with actionable messages
5. Test GraphQL operations thoroughly with integration tests
6. Monitor query performance and optimize slow operations