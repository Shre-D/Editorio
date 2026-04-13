/**
 * Code Runner Service - Communicates with Piston API for code execution
 */

const PISTON_URL = process.env.PISTON_URL || 'http://piston:2000';

export interface ExecuteRequest {
  language: string;
  code: string;
  stdin?: string;
  args?: string[];
}

export interface ExecuteResponse {
  language: string;
  version: string;
  run: {
    stdout: string;
    stderr: string;
    code: number;
    signal: string | null;
    output: string;
  };
  compile?: {
    stdout: string;
    stderr: string;
    code: number;
    signal: string | null;
    output: string;
  };
}

export interface RuntimeInfo {
  language: string;
  version: string;
  aliases: string[];
}

/**
 * Get all available runtimes from Piston
 */
export async function getRuntimes(): Promise<RuntimeInfo[]> {
  const response = await fetch(`${PISTON_URL}/api/v2/runtimes`);
  if (!response.ok) {
    throw new Error(`Failed to get runtimes: ${response.statusText}`);
  }
  return response.json() as Promise<RuntimeInfo[]>;
}

/**
 * Execute code using Piston
 */
export async function executeCode(request: ExecuteRequest): Promise<ExecuteResponse> {
  // Map common language names to Piston language identifiers
  const languageMap: Record<string, string> = {
    'javascript': 'javascript',
    'typescript': 'typescript',
    'python': 'python',
    'java': 'java',
    'cpp': 'c++',
    'c++': 'c++',
    'c': 'c',
    'go': 'go',
    'rust': 'rust',
  };

  const language = languageMap[request.language.toLowerCase()] || request.language.toLowerCase();

  const payload = {
    language,
    version: '*', // Use latest available version
    files: [
      {
        name: getFileName(language),
        content: request.code,
      },
    ],
    stdin: request.stdin || '',
    args: request.args || [],
    run_timeout: 3000, // 3 second timeout
    compile_timeout: 10000,
  };

  const response = await fetch(`${PISTON_URL}/api/v2/execute`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Execution failed: ${error}`);
  }

  return response.json() as Promise<ExecuteResponse>;
}

/**
 * Get appropriate file name for language
 */
function getFileName(language: string): string {
  const extensions: Record<string, string> = {
    javascript: 'main.js',
    typescript: 'main.ts',
    python: 'main.py',
    java: 'Main.java',
    cpp: 'main.cpp',
    c: 'main.c',
    go: 'main.go',
    rust: 'main.rs',
    ruby: 'main.rb',
    php: 'main.php',
    csharp: 'Main.cs',
  };
  return extensions[language] || 'main.txt';
}
