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

    // Auto-logout on 401 (expired/invalid JWT).
    // Skip on customer QR routes — those use cookie sessions, not staff JWTs,
    // so a 401 there must not redirect the customer to /login even if a
    // staff token happens to be present in localStorage.
    //
    // Subpath-aware: under prod we deploy at /nexus/, so the customer path
    // is `/nexus/order/...`. Use BASE_URL-relative comparison so the dev
    // server (`/`) and prod (`/nexus/`) both detect customer routes
    // correctly. Same fix on the redirect target — bare `/login` would
    // hop to the parent CV site under subpath deployment.
    const base = import.meta.env.BASE_URL || '/';
    const path = window.location.pathname;
    const relative = path.startsWith(base) ? path.slice(base.length - 1) : path;
    const isCustomerRoute = relative.startsWith('/order/');
    if (response.status === 401 && getAuthToken() && !isCustomerRoute) {
      localStorage.removeItem('nexus_token');
      localStorage.removeItem('nexus_user');
      window.location.href = `${base}login`.replace(/\/+/g, '/');
    }

    throw new ApiClientError(errorMessage, response.status, errorCode);
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

async function uploadFile<T>(
  path: string,
  file: File,
  onProgress?: (percent: number) => void,
): Promise<T> {
  const token = getAuthToken();
  const url = `${API_BASE}${path}`;

  // Use XMLHttpRequest for progress reporting
  return new Promise<T>((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText) as T);
        } catch {
          reject(new ApiClientError('Invalid response from server', xhr.status));
        }
      } else {
        let errorMessage = `Upload failed with status ${xhr.status}`;
        let errorCode: string | undefined;
        try {
          const errorBody = JSON.parse(xhr.responseText) as ApiError;
          if (errorBody.error) {
            errorMessage = errorBody.error;
          }
          errorCode = errorBody.code;
        } catch {
          // Response body is not JSON
        }
        reject(new ApiClientError(errorMessage, xhr.status, errorCode));
      }
    });

    xhr.addEventListener('error', () => {
      reject(new ApiClientError('Network error during upload', 0));
    });

    xhr.addEventListener('abort', () => {
      reject(new ApiClientError('Upload aborted', 0));
    });

    xhr.open('POST', url);
    xhr.withCredentials = true;

    if (token) {
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    }

    const formData = new FormData();
    formData.append('file', file);

    xhr.send(formData);
  });
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

  upload<T>(path: string, file: File, onProgress?: (percent: number) => void): Promise<T> {
    return uploadFile<T>(path, file, onProgress);
  },
};

export { ApiClientError };
