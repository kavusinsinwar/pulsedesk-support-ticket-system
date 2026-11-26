'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Bell, Check, CheckCheck, RefreshCw } from 'lucide-react';
import { useSocket } from '@/context/SocketContext';
import { api, ApiClientError } from '@/lib/api';
import { formatRelativeTime } from '@/lib/format';
import { Notification } from '@/lib/types';
import { duration, ease } from '@/motion/tokens';
import { Button } from '@/components/ui/Button';
import { Lozenge } from '@/components/ui/Lozenge';
import { Skeleton } from '@/components/ui/Skeleton';

export default function NotificationsPage() {
  const { socket } = useSocket();
  const [items, setItems] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      const res = await api.notifications.list(filter === 'unread');
      setItems(res.data.items);
      setUnreadCount(res.data.unreadCount);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Unable to load notifications');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!socket) return;
    socket.on('notification:new', load);
    return () => {
      socket.off('notification:new', load);
    };
  }, [socket, load]);

  const handleMarkRead = async (id: string) => {
    setBusyId(id);
    try {
      await api.notifications.markAsRead(id);
      await load();
    } finally {
      setBusyId(null);
    }
  };

  const handleMarkAllRead = async () => {
    setMarkingAll(true);
    try {
      await api.notifications.markAllAsRead();
      await load();
    } finally {
      setMarkingAll(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 rounded-sm border border-line bg-surface-sunken p-0.5">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`h-7 rounded-sm px-3 text-[13px] font-medium transition-colors duration-[80ms] ${
              filter === 'all'
                ? 'bg-surface text-ink shadow-raised'
                : 'text-ink-subtle hover:text-ink'
            }`}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => setFilter('unread')}
            className={`h-7 rounded-sm px-3 text-[13px] font-medium transition-colors duration-[80ms] ${
              filter === 'unread'
                ? 'bg-surface text-ink shadow-raised'
                : 'text-ink-subtle hover:text-ink'
            }`}
          >
            Unread ({unreadCount})
          </button>
        </div>

        {unreadCount > 0 && (
          <Button
            variant="default"
            loading={markingAll}
            leftIcon={<CheckCheck className="h-3.5 w-3.5" />}
            onClick={handleMarkAllRead}
          >
            Mark all as read
          </Button>
        )}
      </div>

      {error && (
        <div className="flex items-center justify-between rounded-sm border border-line-danger bg-surface px-4 py-3 text-[13px] text-ink-danger">
          <span>{error}</span>
          <Button
            variant="danger"
            size="compact"
            leftIcon={<RefreshCw className="h-3 w-3" />}
            onClick={load}
          >
            Retry
          </Button>
        </div>
      )}

      <div className="overflow-hidden rounded-sm border border-line bg-surface">
        {loading ? (
          <div className="space-y-3 p-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: duration.moderate, ease: ease.out }}
            className="flex flex-col items-center p-12 text-center"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-sunken text-ink-subtlest">
              <Bell className="h-6 w-6" />
            </div>
            <p className="mt-3 text-[18px] font-medium text-ink">You&apos;re all caught up</p>
            <p className="mt-1 text-[14px] text-ink-subtle">
              Notifications appear here in real time when tickets change or receive replies.
            </p>
          </motion.div>
        ) : (
          <div className="divide-y divide-line">
            {items.map((n) => (
              <div
                key={n.id}
                className={`flex flex-col justify-between gap-3 p-4 transition-colors duration-[80ms] hover:bg-surface-hover sm:flex-row sm:items-center ${
                  n.isRead ? '' : 'bg-brand-subtle/30'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {!n.isRead && <span className="h-2 w-2 rounded-full bg-brand" />}
                    <Lozenge appearance={n.isRead ? 'neutral' : 'blue'}>
                      {n.eventType}
                    </Lozenge>
                    <span className="text-[12px] text-ink-subtlest">
                      {formatRelativeTime(n.createdAt)}
                    </span>
                  </div>
                  <p className="text-[14px] font-medium text-ink">{n.title}</p>
                  <p className="text-[13px] text-ink-subtle">{n.message}</p>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  {n.ticketId && (
                    <Link
                      href={`/dashboard/tickets/${n.ticketId}`}
                      className="inline-flex h-8 items-center rounded-sm border border-line bg-surface px-3 text-[13px] font-medium text-ink hover:bg-surface-hover"
                    >
                      View issue
                    </Link>
                  )}
                  {!n.isRead && (
                    <Button
                      variant="primary"
                      loading={busyId === n.id}
                      leftIcon={<Check className="h-3.5 w-3.5" />}
                      onClick={() => handleMarkRead(n.id)}
                    >
                      Mark read
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
