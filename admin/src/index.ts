import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { orchestrateRouter } from './routes/orchestrate.js';
import { healthRouter } from './routes/health.js';
import { cliRouter } from './routes/cli.js';
import { logger } from './utils/logger.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disable for API
  crossOriginEmbedderPolicy: false
}));

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['http://localhost:3210'] 
    : true,
  credentials: true
}));

// Performance middleware
app.use(compression());

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    userAgent: req.get('User-Agent'),
    ip: req.ip
  });
  next();
});

// Routes
app.use('/api/health', healthRouter);
app.use('/api/orchestrate', orchestrateRouter);
app.use('/api/cli', cliRouter);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'Chirality Admin/Orchestrator',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/api/health',
      orchestrate: '/api/orchestrate',
      cli: '/api/cli'
    }
  });
});

// Error handling
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: `Route ${req.method} ${req.path} not found`
  });
});

// Start server
app.listen(PORT, () => {
  logger.info(`Chirality Admin service listening on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`GraphQL API: ${process.env.GRAPHQL_API_BASE || 'http://localhost:8080'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('Received SIGTERM, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('Received SIGINT, shutting down gracefully');
  process.exit(0);
});

export default app;