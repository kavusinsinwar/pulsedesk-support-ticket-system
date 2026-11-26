import {
  Comment,
  DashboardStats,
  Notification,
  PaginationMeta,
  Ticket,
  TicketCategory,
  TicketDetail,
  TicketPriority,
  TicketStatus,
  User,
} from './types';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

const TOKEN_STORAGE_KEY = 'helpdesk_jwt_token';

export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function setStoredToken(token: string | null): void {
  if (typeof window === 'undefined') return;
  if (token) {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  }
}

export class ApiClientError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: Array<{ field: string; message: string }>;

  constructor(
    message: string,
    statusCode: number,
    code = 'API_ERROR',
    details?: Array<{ field: string; message: string }>
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

interface ApiEnvelope<T> {
  success: boolean;
  message?: string;
  data: T;
  meta?: PaginationMeta;
  error?: {
    code: string;
    message: string;
    details?: Array<{ field: string; message: string }>;
  };
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<ApiEnvelope<T>> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  const json = (await response.json()) as ApiEnvelope<T>;

  if (!response.ok || !json.success) {
    throw new ApiClientError(
      json.error?.message || 'Something went wrong',
      response.status,
      json.error?.code,
      json.error?.details
    );
  }

  return json;
}

export const api = {
  auth: {
    register: (payload: { name: string; email: string; password: string }) =>
      request<{ user: User; token: string }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    login: (payload: { email: string; password: string }) =>
      request<{ user: User; token: string }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    me: () => request<{ user: User }>('/auth/me'),
    listAdmins: () => request<{ admins: User[] }>('/auth/admins'),
  },

  tickets: {
    list: (params: {
      status?: TicketStatus | '';
      priority?: TicketPriority | '';
      category?: TicketCategory | '';
      search?: string;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
      page?: number;
      limit?: number;
    }) => {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          searchParams.set(key, String(value));
        }
      });
      const qs = searchParams.toString();
      return request<Ticket[]>(`/tickets${qs ? `?${qs}` : ''}`);
    },
    getById: (id: string) => request<{ ticket: TicketDetail }>(`/tickets/${id}`),
    create: (payload: {
      title: string;
      description: string;
      category: TicketCategory;
      priority: TicketPriority;
    }) =>
      request<{ ticket: Ticket }>('/tickets', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    update: (
      id: string,
      payload: Partial<{
        title: string;
        description: string;
        category: TicketCategory;
        priority: TicketPriority;
      }>
    ) =>
      request<{ ticket: TicketDetail }>(`/tickets/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }),
    adminUpdate: (
      id: string,
      payload: Partial<{
        status: TicketStatus;
        priority: TicketPriority;
        assignedToId: string | null;
      }>
    ) =>
      request<{ ticket: TicketDetail }>(`/tickets/${id}/admin`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }),
    delete: (id: string) =>
      request<{ id: string }>(`/tickets/${id}`, {
        method: 'DELETE',
      }),
    addComment: (id: string, content: string) =>
      request<{ comment: Comment }>(`/tickets/${id}/comments`, {
        method: 'POST',
        body: JSON.stringify({ content }),
      }),
  },

  notifications: {
    list: (unreadOnly = false) =>
      request<{ items: Notification[]; unreadCount: number }>(
        `/notifications${unreadOnly ? '?unreadOnly=true' : ''}`
      ),
    markAsRead: (id: string) =>
      request<{ id: string; isRead: boolean }>(`/notifications/${id}/read`, {
        method: 'PATCH',
      }),
    markAllAsRead: () =>
      request<{ updatedCount: number }>('/notifications/read-all', {
        method: 'PATCH',
      }),
  },

  dashboard: {
    stats: () => request<{ stats: DashboardStats }>('/dashboard/stats'),
  },
};
