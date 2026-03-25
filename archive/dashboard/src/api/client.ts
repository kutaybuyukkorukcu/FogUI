import { useAuthStore } from '../store/authStore';

// Empty because Vite proxy handles /api and /auth routing in development
// In production, same-origin requests will hit the backend directly
async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const token = useAuthStore.getState().token;
  
  const response = await fetch(endpoint, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  return response.json();
}

export const api = {
  // API Keys
  listApiKeys: () => request<ApiKey[]>('/api/keys'),
  createApiKey: (name: string) => request<ApiKey>('/api/keys', {
    method: 'POST',
    body: JSON.stringify({ name }),
  }),
  revokeApiKey: (id: string) => request<void>(`/api/keys/${id}`, {
    method: 'DELETE',
  }),

  // Usage (to be implemented in backend)
  getUsageStats: () => request<UsageStats>('/api/usage/stats'),

  // User (to be implemented in backend)
  getProfile: () => request<UserProfile>('/api/user/profile'),
  updateProfile: (data: Partial<UserProfile>) => request<UserProfile>('/api/user/profile', {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
};

// Types
export interface ApiKey {
  id: string;
  name: string;
  fullKey?: string; // Only present on creation
  keyPrefix: string;
  lastUsedAt?: string;
  createdAt: string;
  active: boolean;
}

export interface UsageStats {
  currentPeriod: {
    transforms: number;
    quota: number;
    remaining: number;
  };
  history: {
    date: string;
    transforms: number;
  }[];
}

export interface UserProfile {
  id: string;
  email: string;
  name?: string;
  createdAt: string;
}
