import { Router, Request, Response } from 'express';
import { executeCode, getRuntimes, ExecuteRequest } from '../services/code-runner.js';

const router: Router = Router();

// Get available runtimes
router.get('/runtimes', async (_req: Request, res: Response): Promise<void> => {
  try {
    const runtimes = await getRuntimes();
    res.json(runtimes);
  } catch (error) {
    console.error('Failed to get runtimes:', error);
    res.status(500).json({ error: 'Failed to get available runtimes' });
  }
});

// Execute code
router.post('/execute', async (req: Request<object, object, ExecuteRequest>, res: Response): Promise<void> => {
  try {
    const { language, code, stdin, args } = req.body;

    if (!language || !code) {
      res.status(400).json({ error: 'Language and code are required' });
      return;
    }

    const result = await executeCode({ language, code, stdin, args });
    
    res.json({
      language: result.language,
      version: result.version,
      stdout: result.run.stdout,
      stderr: result.run.stderr,
      exitCode: result.run.code,
      output: result.run.output,
      compile: result.compile ? {
        stdout: result.compile.stdout,
        stderr: result.compile.stderr,
        exitCode: result.compile.code,
      } : null,
    });
  } catch (error) {
    console.error('Code execution failed:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Code execution failed' 
    });
  }
});

export default router;
