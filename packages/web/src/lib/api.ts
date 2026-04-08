// In dev: BASE_URL is "/", API_BASE is "/api"
// In prod: BASE_URL is "/nexus/", API_BASE is "/nexus/api"
const API_BASE = `${import.meta.env.BASE_URL}api`.replace(/\/\//g, '/');

interface ApiError {
  error: string;
  code?: string;
}

class ApiClientError extends Error {
  public status: number;
  public code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.code = code;
  }
}

function getAuthToken(): string | null {
  return localStorage.getItem('nexus_token');
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  const token = getAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = `${API_BASE}${path}`;
  const options: RequestInit = {
    method,
    headers,
    credentials: 'include',
  };

  if (body !== undefined && method !== 'GET') {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);

  if (!response.ok) {
    let errorMessage = `Request failed with status ${response.status}`;
    let errorCode: string | undefined;

    try {
      const errorBody = (await response.json()) as ApiError;
      if (errorBody.error) {
        errorMessage = errorBody.error;
      }
      errorCode = errorBody.code;
    } catch {
      // Response body is not JSON, use default message
    }

    // Auto-logout on 401 (expired/invalid JWT)
    if (response.status === 401 && getAuthToken()) {
      localStorage.removeItem('nexus_token');
      localStorage.removeItem('nexus_user');
      window.location.href = '/login';
    }

    throw new ApiClientError(errorMessage, response.status, errorCode);
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export const apiClient = {
  get<T>(path: string): Promise<T> {
    return request<T>('GET', path);
  },

  post<T>(path: string, body?: unknown): Promise<T> {
    return request<T>('POST', path, body);
  },

  put<T>(path: string, body?: unknown): Promise<T> {
    return request<T>('PUT', path, body);
  },

  patch<T>(path: string, body?: unknown): Promise<T> {
    return request<T>('PATCH', path, body);
  },

  delete<T>(path: string): Promise<T> {
    return request<T>('DELETE', path);
  },
};

export { ApiClientError };
