import { Router } from 'express';
import { logger } from '../utils/logger.js';

export const healthRouter = Router();

// Basic health check
healthRouter.get('/', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: '1.0.0'
  });
});

// Readiness check (includes dependencies)
healthRouter.get('/ready', async (req, res) => {
  const checks = {
    service: true,
    neo4j: false,
    graphql: false,
    openai: false
  };

  // Check Neo4j
  try {
    // TODO: Add Neo4j connection check
    checks.neo4j = !!process.env.NEO4J_URI;
  } catch (error) {
    logger.warn('Neo4j health check failed:', error);
  }

  // Check GraphQL
  try {
    const graphqlUrl = process.env.GRAPHQL_API_BASE;
    if (graphqlUrl) {
      // TODO: Add actual GraphQL health check
      checks.graphql = true;
    }
  } catch (error) {
    logger.warn('GraphQL health check failed:', error);
  }

  // Check OpenAI
  checks.openai = !!process.env.OPENAI_API_KEY;

  const allHealthy = Object.values(checks).every(check => check);

  res.status(allHealthy ? 200 : 503).json({
    status: allHealthy ? 'ready' : 'not ready',
    checks,
    timestamp: new Date().toISOString()
  });
});