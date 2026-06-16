const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? '/api'

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('totp_token') : null
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
    ...options,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Erro desconhecido' }))
    throw new Error(err.message ?? `HTTP ${res.status}`)
  }
  return res.json()
}

export const api = {
  auth: {
    login: (email: string, password: string) =>
      request<{ token: string; user: unknown }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),
    register: (name: string, email: string, password: string) =>
      request<{ token: string; user: unknown }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name, email, password }),
      }),
    me: () => request<{ user: unknown }>('/auth/me'),
  },
  services: {
    list: (teamId: string) => request<{ services: unknown[] }>(`/teams/${teamId}/services`),
    create: (teamId: string, data: unknown) =>
      request<{ service: unknown }>(`/teams/${teamId}/services`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    delete: (teamId: string, serviceId: string) =>
      request<void>(`/teams/${teamId}/services/${serviceId}`, { method: 'DELETE' }),
  },
  teams: {
    list: () => request<{ teams: unknown[] }>('/teams'),
    create: (name: string) =>
      request<{ team: unknown }>('/teams', { method: 'POST', body: JSON.stringify({ name }) }),
  },
}
