export type Role = 'USER' | 'ADMIN';
export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type TicketCategory =
  | 'TECHNICAL'
  | 'BILLING'
  | 'ACCOUNT'
  | 'FEATURE_REQUEST'
  | 'GENERAL';

export type EventType =
  | 'TICKET_CREATED'
  | 'TICKET_UPDATED'
  | 'TICKET_STATUS_CHANGED'
  | 'COMMENT_ADDED'
  | 'TICKET_RESOLVED';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt?: string;
}

export interface Comment {
  id: string;
  content: string;
  ticketId: string;
  authorId: string;
  createdAt: string;
  updatedAt: string;
  author: Pick<User, 'id' | 'name' | 'email' | 'role'>;
}

export interface ActivityLog {
  id: string;
  eventType: EventType;
  description: string;
  metadata?: Record<string, unknown> | null;
  ticketId: string;
  actorId: string;
  createdAt: string;
  actor: Pick<User, 'id' | 'name' | 'email' | 'role'>;
}

export interface Ticket {
  id: string;
  ticketNumber: number;
  title: string;
  description: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  createdById: string;
  assignedToId: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: Pick<User, 'id' | 'name' | 'email' | 'role'>;
  assignedTo: Pick<User, 'id' | 'name' | 'email' | 'role'> | null;
  _count?: {
    comments: number;
  };
}

export interface TicketDetail extends Ticket {
  comments: Comment[];
  activityLogs: ActivityLog[];
}

export interface Notification {
  id: string;
  userId: string;
  ticketId: string | null;
  eventType: EventType;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface DashboardStats {
  total: number;
  resolutionRate: number;
  statusCounts: Record<TicketStatus, number>;
  priorityCounts: Record<TicketPriority, number>;
  categoryCounts: Record<TicketCategory, number>;
  recentTickets: Ticket[];
}
