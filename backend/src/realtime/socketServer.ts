import { Server as HttpServer } from 'http';
import { Role } from '@prisma/client';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { env } from '../config/env';
import { ticketRepository } from '../repositories/ticket.repository';
import { userRepository } from '../repositories/user.repository';
import { verifyJwt } from '../utils/jwt';

interface SocketUser {
  id: string;
  name: string;
  email: string;
  role: Role;
}

interface AuthenticatedSocket extends Socket {
  data: {
    user?: SocketUser;
  };
}

let ioInstance: SocketIOServer | null = null;

export function initSocketServer(httpServer: HttpServer): SocketIOServer {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: env.CORS_ORIGIN.split(',').map((o) => o.trim()),
      credentials: true,
    },
  });

  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const token =
        (socket.handshake.auth?.token as string | undefined) ||
        socket.handshake.headers.authorization?.replace(/^Bearer\s+/i, '');

      if (!token) {
        return next(new Error('Authentication token required'));
      }

      const payload = verifyJwt(token);
      const user = await userRepository.findById(payload.sub);
      if (!user) {
        return next(new Error('User not found'));
      }

      socket.data.user = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      };
      next();
    } catch {
      next(new Error('Invalid or expired token'));
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    const user = socket.data.user;
    if (!user) {
      socket.disconnect(true);
      return;
    }

    socket.join(`user:${user.id}`);
    if (user.role === Role.ADMIN) {
      socket.join('role:ADMIN');
    }

    socket.on('ticket:join', async (ticketId: string) => {
      if (!ticketId || typeof ticketId !== 'string') return;
      try {
        const ticket = await ticketRepository.findByIdBasic(ticketId);
        if (!ticket) return;
        if (user.role === Role.ADMIN || ticket.createdById === user.id) {
          socket.join(`ticket:${ticketId}`);
        }
      } catch {
        // Ignore invalid ticket room join attempts
      }
    });

    socket.on('ticket:leave', (ticketId: string) => {
      if (!ticketId || typeof ticketId !== 'string') return;
      socket.leave(`ticket:${ticketId}`);
    });
  });

  ioInstance = io;
  return io;
}

export function emitRealtimeEvent(params: {
  ticketId: string;
  ticketCreatedById: string;
  eventName: 'ticket:event' | 'ticket:deleted';
  payload: Record<string, unknown>;
}): void {
  if (!ioInstance) return;

  ioInstance
    .to(`ticket:${params.ticketId}`)
    .to(`user:${params.ticketCreatedById}`)
    .to('role:ADMIN')
    .emit(params.eventName, params.payload);
}

export function emitRealtimeNotification(userIds: string[]): void {
  if (!ioInstance || userIds.length === 0) return;
  userIds.forEach((userId) => {
    ioInstance!.to(`user:${userId}`).emit('notification:new', { timestamp: Date.now() });
  });
}

export function closeSocketServer(): void {
  if (ioInstance) {
    ioInstance.close();
    ioInstance = null;
  }
}
