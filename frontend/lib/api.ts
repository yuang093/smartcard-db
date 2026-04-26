const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

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

  const defaultHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...headers,
  };

  const config: RequestInit = {
    method,
    headers: defaultHeaders,
    ...(body ? { body: JSON.stringify(body) } : {}),
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Request failed' }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }

  // Handle empty responses
  const text = await response.text();
  if (!text) return {} as T;
  return JSON.parse(text);
}

// Auth API
export const authApi = {
  register: (email: string, password: string) =>
    apiRequest('/api/v1/auth/register', {
      method: 'POST',
      body: { email, password },
    }),

  login: (username: string, password: string) =>
    apiRequest<{ access_token: string; token_type: string }>('/api/v1/auth/login', {
      method: 'POST',
      body: new URLSearchParams({ username, password }),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    }),

  getMe: () =>
    apiRequest<{ id: string; email: string; created_at: string }>('/api/v1/auth/me'),
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

export const cardsApi = {
  list: (search?: string) =>
    apiRequest<Card[]>(`/api/v1/cards${search ? `?search=${encodeURIComponent(search)}` : ''}`),

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