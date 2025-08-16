import { Router } from 'express';
import { spawn } from 'child_process';
import { logger } from '../utils/logger.js';

export const cliRouter = Router();

// Execute CLI command
cliRouter.post('/execute', async (req, res) => {
  try {
    const { command, args = [], timeout = 60000 } = req.body;

    if (!command) {
      return res.status(400).json({
        error: 'Command is required'
      });
    }

    logger.info(`CLI command requested: ${command}`, { args });

    // Security: Only allow specific CLI commands
    const allowedCommands = [
      'semantic-matrix-c',
      'semantic-matrix-f', 
      'semantic-matrix-d',
      'full-pipeline',
      'semantic-init',
      'semantic-iv'
    ];

    if (!allowedCommands.includes(command)) {
      return res.status(403).json({
        error: 'Command not allowed',
        allowedCommands
      });
    }

    // TODO: Implement actual CLI execution
    // This would spawn: python chirality_cli.py ${command} ${args.join(' ')}
    
    res.json({
      status: 'processing',
      command,
      args,
      jobId: `cli_${command}_${Date.now()}`,
      message: `CLI command ${command} started`,
      timeout
    });

  } catch (error) {
    logger.error('CLI execution error:', error);
    res.status(500).json({
      error: 'CLI execution failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// List available CLI commands
cliRouter.get('/commands', (req, res) => {
  res.json({
    commands: [
      {
        name: 'semantic-matrix-c',
        description: 'Generate semantic matrix C (Requirements)',
        args: ['--out', '--ontology-pack', '--run-interpretations']
      },
      {
        name: 'semantic-matrix-f',
        description: 'Generate semantic matrix F (Objectives)',
        args: ['--out', '--ontology-pack']
      },
      {
        name: 'semantic-matrix-d',
        description: 'Generate semantic matrix D (Solution)',
        args: ['--out', '--ontology-pack']
      },
      {
        name: 'full-pipeline',
        description: 'Execute complete CF14 pipeline',
        args: ['--out', '--domain-pack']
      },
      {
        name: 'semantic-init',
        description: 'Phase 1 canonical initialization',
        args: ['--model', '--out']
      },
      {
        name: 'semantic-iv',
        description: 'Phase 2 context-specific instantiation',
        args: ['--problem-statement', '--domain-pack', '--out']
      }
    ]
  });
});