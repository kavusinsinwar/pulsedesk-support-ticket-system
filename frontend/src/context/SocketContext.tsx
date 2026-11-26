'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '@/context/AuthContext';
import { getStoredToken } from '@/lib/api';

export interface RealtimeTicketEvent {
  type:
    | 'TICKET_CREATED'
    | 'TICKET_UPDATED'
    | 'TICKET_STATUS_CHANGED'
    | 'COMMENT_ADDED'
    | 'TICKET_RESOLVED';
  ticketId: string;
  ticketNumber: number;
  ticketTitle: string;
  actorId: string;
  actorName: string;
  fromStatus?: string;
  toStatus?: string;
  changedFields?: string[];
  commentPreview?: string;
  occurredAt: string;
}

interface SocketContextValue {
  socket: Socket | null;
  connected: boolean;
}

const SocketContext = createContext<SocketContextValue>({
  socket: null,
  connected: false,
});

function getSocketBaseUrl(): string {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';
  return apiUrl.replace(/\/api\/v1\/?$/, '');
}

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const token = getStoredToken();
    if (!user || !token) {
      setSocket((prev) => {
        prev?.disconnect();
        return null;
      });
      setConnected(false);
      return;
    }

    const client = io(getSocketBaseUrl(), {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    client.on('connect', () => setConnected(true));
    client.on('disconnect', () => setConnected(false));

    setSocket(client);

    return () => {
      client.disconnect();
      setConnected(false);
    };
  }, [user]);

  return (
    <SocketContext.Provider value={{ socket, connected }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket(): SocketContextValue {
  return useContext(SocketContext);
}
