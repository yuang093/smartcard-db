const API_BASE_URL = '';

export function clearToken() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('smartcard_auth');
    console.debug('[Auth] Token cleared from localStorage');
  }
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  const auth = localStorage.getItem('smartcard_auth');
  if (!auth) return null;
  try {
    return JSON.parse(auth).token;
  } catch {
    return null;
  }
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { method = 'GET', body, headers = {} } = options;

  // Get token from localStorage if available
  let token: string | null = null;
  if (typeof window !== 'undefined') {
    const auth = localStorage.getItem('smartcard_auth');
    if (auth) {
      try {
        token = JSON.parse(auth).token;
      } catch {}
    }
  }

  // Build headers - explicit headers take precedence over defaults
  const requestHeaders: Record<string, string> = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...headers,
  };

  // Set Content-Type to JSON only if not already set by explicit headers
  if (!requestHeaders['Content-Type']) {
    requestHeaders['Content-Type'] = 'application/json';
  }

  const config: RequestInit = {
    method,
    headers: requestHeaders,
    ...(body ? { body: typeof body === 'string' ? body : (body instanceof URLSearchParams ? body.toString() : JSON.stringify(body)) } : {}),
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

  if (!response.ok) {
    const text = await response.text();
    let errorMessage = `HTTP ${response.status}`;
    try {
      const errorData = JSON.parse(text);
      // Handle FastAPI validation error format
      if (Array.isArray(errorData)) {
        errorMessage = errorData.map(e => e.msg || JSON.stringify(e)).join(', ');
      } else if (errorData.detail) {
        errorMessage = typeof errorData.detail === 'string' ? errorData.detail : JSON.stringify(errorData.detail);
      } else {
        errorMessage = JSON.stringify(errorData);
      }
    } catch {}
    throw new Error(errorMessage);
  }

  // Handle empty responses
  const text = await response.text();
  if (!text) return {} as T;
  return JSON.parse(text);
}

// Auth API
export const authApi = {
  register: (username: string, password: string) =>
    apiRequest('/api/v1/auth/register', {
      method: 'POST',
      body: { username, password },
    }),

  login: (username: string, password: string) =>
    apiRequest<{ access_token: string; token_type: string }>('/api/v1/auth/login', {
      method: 'POST',
      body: new URLSearchParams({ username, password }),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    }),

  getMe: () =>
    apiRequest<{ id: string; username: string; created_at: string }>('/api/v1/auth/me'),

  getMeWithToken: (token: string) =>
    apiRequest<{ id: string; username: string; created_at: string }>('/api/v1/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    }),
};

// Cards API
export interface Card {
  id: string;
  user_id: string;
  name?: string;
  company?: string;
  title?: string;
  phone?: string;
  mobile?: string;
  email?: string;
  address?: string;
  front_image_url?: string;
  back_image_url?: string;
  created_at: string;
  updated_at: string;
  tags: { id: string; name: string; color: string }[];
}

export interface DuplicateWarning {
  name: string;
  company: string;
  count: number;
  cards: { id: string; created_at: string }[];
}

export const cardsApi = {
  list: (search?: string, tagId?: string) => {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (tagId) params.append('tag_id', tagId);
      const query = params.toString() ? `?${params.toString()}` : '';
      return apiRequest<Card[]>(`/api/v1/cards${query}`);
    },

  get: (id: string) => apiRequest<Card>(`/api/v1/cards/${id}`),

  create: (data: Partial<Card>) =>
    apiRequest<Card>('/api/v1/cards', {
      method: 'POST',
      body: data,
    }),

  update: (id: string, data: Partial<Card>) =>
    apiRequest<Card>(`/api/v1/cards/${id}`, {
      method: 'PUT',
      body: data,
    }),

  delete: (id: string) =>
    apiRequest<{ message: string }>(`/api/v1/cards/${id}`, {
      method: 'DELETE',
    }),

  checkDuplicates: (name: string, company?: string) =>
    apiRequest<DuplicateWarning[]>(`/api/v1/cards/check-duplicates?name=${encodeURIComponent(name)}&company=${encodeURIComponent(company || '')}`),
};

// Tags API
export interface Tag {
  id: string;
  user_id: string;
  name: string;
  color: string;
  created_at: string;
}

export const tagsApi = {
  list: () => apiRequest<Tag[]>('/api/v1/tags'),

  create: (name: string, color: string) =>
    apiRequest<Tag>('/api/v1/tags', {
      method: 'POST',
      body: { name, color },
    }),

  update: (id: string, data: { name?: string; color?: string }) =>
    apiRequest<Tag>(`/api/v1/tags/${id}`, {
      method: 'PUT',
      body: data,
    }),

  delete: (id: string) =>
    apiRequest<{ message: string }>(`/api/v1/tags/${id}`, {
      method: 'DELETE',
    }),
};

// Default export for backward compatibility with code that uses `import api from "@/lib/api"`
export default {
  get: <T>(url: string) => apiRequest<T>(url),
  post: async <T>(url: string, body: unknown) => {
    try {
      return await apiRequest<T>(url, { method: 'POST', body });
    } catch (err) {
      // Re-throw with a structured error format for backward compatibility
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(msg);
    }
  },
  put: <T>(url: string, body: unknown) => apiRequest<T>(url, { method: 'PUT', body }),
  delete: <T>(url: string) => apiRequest<T>(url, { method: 'DELETE' }),
  postForm: <T>(url: string, body: unknown) => apiRequest<T>(url, { method: 'POST', body }),
};