const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface ApiResponse<T> {
  data?: T;
  error?: string;
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const token = localStorage.getItem('editorio-auth')
    ? JSON.parse(localStorage.getItem('editorio-auth')!).state?.token
    : null;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      return { error: data.error || 'Request failed' };
    }

    return { data };
  } catch (error) {
    return { error: 'Network error' };
  }
}

// Auth API
export const authApi = {
  register: (username: string, email: string, password: string) =>
    request<{ user: any; token: string }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, email, password }),
    }),

  login: (email: string, password: string) =>
    request<{ user: any; token: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  me: () => request<any>('/api/auth/me'),
};

// Rooms API
export const roomsApi = {
  create: (name: string, language = 'javascript') =>
    request<any>('/api/rooms', {
      method: 'POST',
      body: JSON.stringify({ name, language }),
    }),

  getByCode: (code: string) => request<any>(`/api/rooms/code/${code}`),

  getById: (id: string) => request<any>(`/api/rooms/${id}`),

  getToken: (id: string) =>
    request<{ token: string; roomId: string; roomName: string }>(
      `/api/rooms/${id}/token`
    ),

  list: () => request<any[]>('/api/rooms'),

  delete: (id: string) =>
    request<void>(`/api/rooms/${id}`, { method: 'DELETE' }),
};

// Code Execution API
export interface CodeExecutionResult {
  language: string;
  version: string;
  stdout: string;
  stderr: string;
  exitCode: number;
  output: string;
  compile?: {
    stdout: string;
    stderr: string;
    exitCode: number;
  } | null;
}

export const codeApi = {
  execute: (language: string, code: string, stdin?: string) =>
    request<CodeExecutionResult>('/api/code/execute', {
      method: 'POST',
      body: JSON.stringify({ language, code, stdin }),
    }),

  getRuntimes: () =>
    request<Array<{ language: string; version: string; aliases: string[] }>>('/api/code/runtimes'),
};
