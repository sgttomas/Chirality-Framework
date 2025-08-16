import 'dotenv/config';
import http from 'node:http';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createYoga, maskError } from 'graphql-yoga';
import { Neo4jGraphQL } from '@neo4j/graphql';
import neo4j, { Driver } from 'neo4j-driver';
import { useDepthLimit } from '@envelop/depth-limit';
import { useDisableIntrospection } from '@envelop/disable-introspection';
import { v4 as uuidv4 } from 'uuid';
import type { Plugin } from '@envelop/core';

// ---- Config ----
const PORT = Number(process.env.PORT ?? 8080);
const NEO4J_URI = process.env.NEO4J_URI!;
const NEO4J_USER = process.env.NEO4J_USER!;
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD!;
const NEO4J_MAX_POOL = Number(process.env.NEO4J_MAX_POOL ?? 50);
const NEO4J_CONNECTION_ACQUISITION_TIMEOUT_MS = Number(
  process.env.NEO4J_CONNECTION_ACQUISITION_TIMEOUT_MS ?? 60000
);
const NODE_ENV = process.env.NODE_ENV ?? 'development';
const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret-change-in-production';
const MAX_PAGE_SIZE = Number(process.env.MAX_PAGE_SIZE ?? 200);
const MAX_QUERY_DEPTH = Number(process.env.MAX_QUERY_DEPTH ?? 10);

// Basic sanity checks
for (const [k, v] of Object.entries({ NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD })) {
  if (!v) throw new Error(`Missing env: ${k}`);
}

// ---- Driver (single pooled instance) ----
const driver: Driver = neo4j.driver(
  NEO4J_URI,
  neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD),
  {
    // Pooling
    maxConnectionPoolSize: NEO4J_MAX_POOL,
    // Helpful in serverless-ish environments; safe on long-lived too
    connectionAcquisitionTimeout: NEO4J_CONNECTION_ACQUISITION_TIMEOUT_MS
  }
);

// Verify connection early (optional but nice)
await driver.getServerInfo().catch((e) => {
  console.error('Neo4j connection failed:', e);
  process.exit(1);
});

console.log('✓ Connected to Neo4j');

// ---- Auth helpers ----
interface JWTPayload {
  sub: string;
  role: 'reader' | 'writer' | 'admin';
  exp?: number;
}

function verifyJWT(token: string): JWTPayload | null {
  try {
    // Simple JWT decode for demo - use proper library in production
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    if (payload.exp && payload.exp < Date.now() / 1000) return null;
    return payload;
  } catch {
    return null;
  }
}

// ---- Cost limiting helpers ----
function validatePagination(args: any) {
  if (args.pagination?.take && args.pagination.take > MAX_PAGE_SIZE) {
    throw new Error(`Max page size is ${MAX_PAGE_SIZE}, got ${args.pagination.take}`);
  }
}

// ---- Schema: load SDL & build executable schema with @neo4j/graphql ----
const typeDefs = readFileSync(new URL('../schema.graphql', import.meta.url), 'utf8');

const resolvers = {
  Query: {
    // V1 Compatibility - top-level queries for the complex CLI schema
    valley: () => ({ 
      id: "cf14", 
      name: "Chirality Framework", 
      version: "14.2.1", 
      stations: [], 
      ontology: [] 
    }),
    station: (_: any, { id }: any) => ({ 
      id, 
      name: id, 
      index: 1, 
      ontology: [], 
      axes: { 
        row: { name: "rows", labels: [], ontology: [] }, 
        col: { name: "cols", labels: [], ontology: [] } 
      } 
    }),
    matrix: (_: any, { id, station }: any) => ({
      id,
      name: id,
      stationId: station,
      rowLabels: [],
      colLabels: [],
      ontology: [],
      cell: null
    }),
    ontologies: () => ({
      jsonldContext: {},
      entities: []
    }),
    
    // V1 Compatibility resolver
    pullCell: async (_: any, { station, matrix, row, col, includeOntologies = false }: { station: string; matrix: string; row: number; col: number; includeOntologies?: boolean }, context: any) => {
      const session = driver.session();
      try {
        // Fetch component + optional cell
        const result = await session.run(`
          MATCH (c:Component {station: $station, name: $matrix})
          OPTIONAL MATCH (c)-[:HAS_CELL]->(cell:Cell {row: $row, col: $col})
          RETURN c, cell
        `, { station, matrix, row, col });

        if (result.records.length === 0) {
          return {
            valley: { name: 'Chirality Framework', version: '14.2.1' },
            station: { name: station, index: 1 },
            matrix: { name: matrix, rowLabels: [], colLabels: [] },
            cell: null,
            ontologies: includeOntologies ? { jsonldContext: {}, entities: [] } : null
          };
        }

        const rec = result.records[0];
        const c = rec.get('c')?.properties;
        const cellNode = rec.get('cell');

        // Use the rowLabels and colLabels from component
        const rowLabels = c?.rowLabels || [];
        const colLabels = c?.colLabels || [];

        const cell = cellNode ? {
          row: cellNode.properties.row.toNumber?.() ?? cellNode.properties.row,
          col: cellNode.properties.col.toNumber?.() ?? cellNode.properties.col,
          stage: cellNode.properties.stage || null,
          value: cellNode.properties.resolved || null,
          labels: {
            rowLabel: rowLabels[cellNode.properties.row.toNumber?.() ?? cellNode.properties.row] ?? null,
            colLabel: colLabels[cellNode.properties.col.toNumber?.() ?? cellNode.properties.col] ?? null
          },
          traces: []
        } : null;

        return {
          valley: { name: 'Chirality Framework', version: '14.2.1' },
          station: { name: station, index: 1 },
          matrix: { 
            name: matrix, 
            rowLabels: rowLabels, 
            colLabels: colLabels,
            cell: cell
          },
          cell,
          ontologies: includeOntologies ? {
            jsonldContext: {},
            entities: c?.ontology ? [{ curie: 'UFO:Component', label: c.name }] : []
          } : null
        };
      } finally {
        await session.close();
      }
    }
  },
  
  Mutation: {
    // V1 Compatibility resolver  
    upsertCellStage: async (_: any, { input }: { input: any }, context: any) => {
      const session = driver.session();
      try {
        const { station, matrix, row, col, stage, value, model_id, prompt_hash, labels, meta } = input;
        
        // Create a content hash for deduplication (include location for identity)
        const contentHash = createHash('sha256')
          .update(JSON.stringify({ station, matrix, row, col, value, stage, labels, meta }))
          .digest('hex');

        // Find or create component
        const componentResult = await session.run(`
          MERGE (c:Component {station: $station, name: $matrix})
          ON CREATE SET 
            c.id = randomUUID(),
            c.kind = 'MATRIX',
            c.shape = [3, 4],
            c.rowLabels = ['Normative', 'Operative', 'Evaluative'],
            c.colLabels = ['Necessity', 'Sufficiency', 'Completeness', 'Consistency'],
            c.ontology = '{}',
            c.createdAt = datetime(),
            c.updatedAt = datetime()
          ON MATCH SET c.updatedAt = datetime()
          RETURN c
        `, { station, matrix });

        const component = componentResult.records[0].get('c');

        // Create or update cell
        const cellResult = await session.run(`
          MATCH (c:Component {id: $componentId})
          MERGE (c)-[:HAS_CELL]->(cell:Cell {row: $row, col: $col})
          ON CREATE SET 
            cell.id = randomUUID(),
            cell.resolved = $value,
            cell.rawTerms = [],
            cell.intermediate = [$stage],
            cell.operation = 'MULTIPLY',
            cell.createdAt = datetime(),
            cell.updatedAt = datetime()
          ON MATCH SET 
            cell.resolved = $value,
            cell.intermediate = cell.intermediate + [$stage],
            cell.updatedAt = datetime()
          RETURN cell, 
                 CASE WHEN cell.createdAt = cell.updatedAt THEN false ELSE true END as deduped
        `, { 
          componentId: component.properties.id, 
          row, 
          col, 
          value, 
          stage 
        });

        const cellRecord = cellResult.records[0];
        const cell = cellRecord.get('cell');
        const deduped = cellRecord.get('deduped');

        return {
          ok: true,
          id: cell.properties.id,
          version: 1,
          contentHash,
          deduped
        };
      } finally {
        await session.close();
      }
    }
  }
};

const neoSchema = new Neo4jGraphQL({
  typeDefs,
  resolvers,
  driver,
  features: {
    authorization: {
      key: JWT_SECRET,
    },
  },
});

// Build GraphQLSchema instance
const schema = await neoSchema.getSchema();

// ---- Logging plugin ----
const loggingPlugin: Plugin = {
  onParse() {
    // Return the "after-parse" function (NOT an object)
    return (({ result, context }: any) => {
      console.log(JSON.stringify({
        requestId: (context as any).requestId,
        timestamp: new Date().toISOString(),
        event: 'parse_complete',
        // parse errors => result is an array of GraphQLError
        hasErrors: Array.isArray(result) && result.length > 0,
      }));
    });
  },

  onValidate() {
    // Return the "after-validate" function (NOT an object)
    return (({ result, context }: any) => {
      console.log(JSON.stringify({
        requestId: (context as any).requestId,
        timestamp: new Date().toISOString(),
        event: 'validate_complete',
        // validate result is GraphQLError[]
        hasErrors: Array.isArray(result) && result.length > 0,
      }));
    });
  },

  onExecute() {
    // For execute, returning an object with onExecuteDone IS correct
    return {
      onExecuteDone({ result, args }) {
        const duration = Date.now() - (args.contextValue as any).startTime;
        const hasErrors = Array.isArray((result as any)?.errors) && (result as any).errors.length > 0;
        console.log(JSON.stringify({
          requestId: (args.contextValue as any).requestId,
          timestamp: new Date().toISOString(),
          event: 'request_complete',
          duration,
          operationName: args.operationName,
          hasErrors,
        }));
      },
    };
  },
};

// ---- Yoga server (Helix under the hood) ----
const yoga = createYoga({
  schema,
  // GraphiQL on by default in dev; disable in prod if needed.
  graphiql: NODE_ENV === 'development',
  maskedErrors: {
    maskError: (err: unknown) => maskError(err, 'Internal Error')
  },
  plugins: [
    loggingPlugin,
    useDepthLimit({
      maxDepth: MAX_QUERY_DEPTH,
    }),
    ...(NODE_ENV === 'production' ? [useDisableIntrospection()] : []),
  ],
  cors: {
    origin: NODE_ENV === 'development' 
      ? '*'
      : (process.env.ALLOWED_ORIGINS?.split(',') ?? []),
    credentials: true,
  },
  // Request context: add request id, user, etc.
  context: async ({ request }) => {
    const requestId = uuidv4();
    const startTime = Date.now();
    
    // Parse auth header
    const auth = request.headers.get('authorization') ?? '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    const user = token ? verifyJWT(token) : null;
    
    // Log request start
    console.log(JSON.stringify({
      requestId,
      timestamp: new Date().toISOString(),
      event: 'request_start',
      userAgent: request.headers.get('user-agent'),
      userId: user?.sub,
      userRole: user?.role,
    }));

    return {
      requestId,
      startTime,
      user,
      // Add any per-request resources here (avoid creating drivers/sessions here)
    };
  },
});

// ---- HTTP server ----
const server = http.createServer((req, res) => {
  // Health check endpoint for Docker
  if (req.url === '/health' && req.method === 'GET') {
    const payload = JSON.stringify({
      ok: true,
      service: 'chirality-graphql',
      timestamp: new Date().toISOString(),
      uptime_s: Math.floor(process.uptime()),
      version: '1.0.0'
    });
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(payload);
    return;
  }

  // Legacy health endpoints
  if ((req.url === '/healthz' || req.url === '/readyz') && req.method === 'GET') {
    const payload = JSON.stringify({
      ok: true,
      service: 'chirality-graphql',
      timestamp: new Date().toISOString(),
      uptime_s: Math.floor(process.uptime()),
    });
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(payload);
    return;
  }

  // Hand everything else to Yoga
  yoga(req, res);
});

// Graceful shutdown
const shutdown = async (signal: string) => {
  console.log(`\n${signal} received, shutting down…`);
  server.close(() => {
    driver.close().then(() => {
      console.log('Neo4j driver closed.');
      process.exit(0);
    });
  });
};
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// Start
server.listen(PORT, () => {
  console.log(`Graph API running at http://localhost:${PORT}/graphql`);
});