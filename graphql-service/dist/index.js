import 'dotenv/config';
import http from 'node:http';
import { readFileSync } from 'node:fs';
import { createYoga, maskError } from 'graphql-yoga';
import { Neo4jGraphQL } from '@neo4j/graphql';
import neo4j from 'neo4j-driver';
import { useDepthLimit } from '@envelop/depth-limit';
import { useDisableIntrospection } from '@envelop/disable-introspection';
import { v4 as uuidv4 } from 'uuid';
// ---- Config ----
const PORT = Number(process.env.PORT ?? 8080);
const NEO4J_URI = process.env.NEO4J_URI;
const NEO4J_USER = process.env.NEO4J_USER;
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD;
const NEO4J_MAX_POOL = Number(process.env.NEO4J_MAX_POOL ?? 50);
const NEO4J_CONNECTION_ACQUISITION_TIMEOUT_MS = Number(process.env.NEO4J_CONNECTION_ACQUISITION_TIMEOUT_MS ?? 60000);
const NODE_ENV = process.env.NODE_ENV ?? 'development';
const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret-change-in-production';
const MAX_PAGE_SIZE = Number(process.env.MAX_PAGE_SIZE ?? 200);
const MAX_QUERY_DEPTH = Number(process.env.MAX_QUERY_DEPTH ?? 10);
// Basic sanity checks
for (const [k, v] of Object.entries({ NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD })) {
    if (!v)
        throw new Error(`Missing env: ${k}`);
}
// ---- Driver (single pooled instance) ----
const driver = neo4j.driver(NEO4J_URI, neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD), {
    // Pooling
    maxConnectionPoolSize: NEO4J_MAX_POOL,
    // Helpful in serverless-ish environments; safe on long-lived too
    connectionAcquisitionTimeout: NEO4J_CONNECTION_ACQUISITION_TIMEOUT_MS
});
// Verify connection early (optional but nice)
await driver.getServerInfo().catch((e) => {
    console.error('Neo4j connection failed:', e);
    process.exit(1);
});
console.log('✓ Connected to Neo4j');
function verifyJWT(token) {
    try {
        // Simple JWT decode for demo - use proper library in production
        const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
        if (payload.exp && payload.exp < Date.now() / 1000)
            return null;
        return payload;
    }
    catch {
        return null;
    }
}
// ---- Cost limiting helpers ----
function validatePagination(args) {
    if (args.pagination?.take && args.pagination.take > MAX_PAGE_SIZE) {
        throw new Error(`Max page size is ${MAX_PAGE_SIZE}, got ${args.pagination.take}`);
    }
}
// ---- Schema: load SDL & build executable schema with @neo4j/graphql ----
const typeDefs = readFileSync(new URL('../../schema.graphql', import.meta.url), 'utf8');
const resolvers = {
    Query: {
    // Custom resolvers can be added here if needed
    },
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
const loggingPlugin = {
    onParse() {
        // Return the "after-parse" function (NOT an object)
        return (({ result, context }) => {
            console.log(JSON.stringify({
                requestId: context.requestId,
                timestamp: new Date().toISOString(),
                event: 'parse_complete',
                // parse errors => result is an array of GraphQLError
                hasErrors: Array.isArray(result) && result.length > 0,
            }));
        });
    },
    onValidate() {
        // Return the "after-validate" function (NOT an object)
        return (({ result, context }) => {
            console.log(JSON.stringify({
                requestId: context.requestId,
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
                const duration = Date.now() - args.contextValue.startTime;
                const hasErrors = Array.isArray(result?.errors) && result.errors.length > 0;
                console.log(JSON.stringify({
                    requestId: args.contextValue.requestId,
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
        maskError: (err) => maskError(err, 'Internal Error')
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
    if (req.url === '/healthz' && req.method === 'GET') {
        const payload = JSON.stringify({
            ok: true,
            service: 'graphql-service',
            timestamp: new Date().toISOString(),
            uptime_s: Math.floor(process.uptime()),
        });
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(payload);
        return;
    }
    if (req.url === '/readyz' && req.method === 'GET') {
        // TODO: check Neo4j connectivity before returning ok: true
        const payload = JSON.stringify({
            ok: true,
            service: 'graphql-service',
            timestamp: new Date().toISOString(),
        });
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(payload);
        return;
    }
    // Hand everything else to Yoga
    yoga(req, res);
});
// Graceful shutdown
const shutdown = async (signal) => {
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
