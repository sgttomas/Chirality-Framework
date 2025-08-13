import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { operation, problem_statement, domain_context } = body;

    if (!operation || !problem_statement) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: operation, problem_statement' },
        { status: 400 }
      );
    }

    // Map operations to CLI commands
    const operationMap: { [key: string]: string } = {
      'semantic-matrix-c': 'semantic-matrix-c',
      'semantic-matrix-f': 'semantic-matrix-f', 
      'semantic-matrix-d': 'semantic-matrix-d'
    };

    const cliOperation = operationMap[operation];
    if (!cliOperation) {
      return NextResponse.json(
        { success: false, error: `Unknown operation: ${operation}` },
        { status: 400 }
      );
    }

    // Generate output filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputFile = path.join(process.cwd(), `${operation}_${timestamp}.json`);

    // Execute chirality CLI
    const result = await new Promise<{ success: boolean; data?: any; error?: string }>((resolve) => {
      const cliPath = path.join(process.cwd(), 'chirality_cli.py');
      const childProcess = spawn('python3', [cliPath, cliOperation, '--out', outputFile], {
        cwd: process.cwd(),
        env: { 
          ...process.env,
          OPENAI_API_KEY: process.env.OPENAI_API_KEY,
          NEO4J_URI: process.env.NEO4J_URI,
          NEO4J_USERNAME: process.env.NEO4J_USERNAME,
          NEO4J_PASSWORD: process.env.NEO4J_PASSWORD
        }
      });

      let stdout = '';
      let stderr = '';

      childProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      childProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      childProcess.on('close', (code) => {
        if (code === 0) {
          resolve({
            success: true,
            data: {
              operation: cliOperation,
              output_file: outputFile,
              stdout: stdout.trim(),
              problem_statement,
              domain_context
            }
          });
        } else {
          resolve({
            success: false,
            error: `CLI process failed with code ${code}: ${stderr || stdout}`
          });
        }
      });

      childProcess.on('error', (error) => {
        resolve({
          success: false,
          error: `Failed to start CLI process: ${error.message}`
        });
      });
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Successfully executed ${operation}`,
      ...result.data
    });

  } catch (error) {
    console.error('Domain instantiation error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process domain instantiation' },
      { status: 500 }
    );
  }
}