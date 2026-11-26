'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Bell,
  CheckCheck,
  ChevronDown,
  ChevronLeft,
  Kanban,
  LayoutDashboard,
  List,
  LogOut,
  Menu,
  Moon,
  Plus,
  Radio,
  Search,
  Sun,
  X,
} from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { useAuth } from '@/context/AuthContext';
import { RealtimeTicketEvent, useSocket } from '@/context/SocketContext';
import { useTheme } from '@/context/ThemeContext';
import { useToast } from '@/context/ToastContext';
import { api } from '@/lib/api';
import { formatRelativeTime, formatTicketCode } from '@/lib/format';
import { Notification } from '@/lib/types';
import { duration, ease, spring } from '@/motion/tokens';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Lozenge } from '@/components/ui/Lozenge';
import { Tooltip } from '@/components/ui/Tooltip';
import { CommandPalette } from '@/components/layout/CommandPalette';
import { CreateTicketModal } from '@/components/tickets/CreateTicketModal';

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const { socket, connected } = useSocket();
  const { theme, toggleTheme } = useTheme();
  const { pushToast } = useToast();
  const pathname = usePathname();
  const router = useRouter();

  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [cmdkOpen, setCmdkOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [bellOpen, setBellOpen] = useState(false);
  const [bellWiggleKey, setBellWiggleKey] = useState(0);

  const bellRef = useRef<HTMLDivElement>(null);

  const loadNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const res = await api.notifications.list();
      setNotifications(res.data.items);
      setUnreadCount(res.data.unreadCount);
    } catch {
      // Non-blocking
    }
  }, [user]);

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth >= 768 && window.innerWidth < 1024) {
      setCollapsed(true);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    loadNotifications();
  }, [user, loadNotifications]);

  // Global Cmd+K or / shortcut for Command Palette
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isTyping =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable);

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCmdkOpen((prev) => !prev);
      } else if (!isTyping && e.key === '/') {
        e.preventDefault();
        setCmdkOpen(true);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // Real-time Socket.IO notifications & toast alerts
  useEffect(() => {
    if (!socket || !user) return;

    const onNotificationNew = () => {
      setBellWiggleKey((k) => k + 1);
      loadNotifications();
    };

    const onTicketEvent = (event: RealtimeTicketEvent) => {
      if (event.actorId === user.id) return;
      const code = formatTicketCode(event.ticketNumber);

      if (event.type === 'TICKET_CREATED') {
        pushToast({
          variant: 'realtime',
          title: `New ticket ${code}`,
          description: `${event.actorName}: ${event.ticketTitle}`,
          action: {
            label: 'View ticket',
            onClick: () => router.push(`/dashboard/tickets/${event.ticketId}`),
          },
        });
      } else if (event.type === 'TICKET_STATUS_CHANGED') {
        pushToast({
          variant: 'realtime',
          title: `${code} moved to ${event.toStatus?.replace('_', ' ')}`,
          description: `Updated by ${event.actorName}`,
        });
      } else if (event.type === 'TICKET_RESOLVED') {
        pushToast({
          variant: 'realtime',
          title: `${code} marked Resolved`,
          description: `Resolved by ${event.actorName}`,
        });
      } else if (event.type === 'COMMENT_ADDED') {
        pushToast({
          variant: 'realtime',
          title: `New reply on ${code}`,
          description: `${event.actorName}: "${event.commentPreview}"`,
        });
      }
    };

    socket.on('notification:new', onNotificationNew);
    socket.on('ticket:event', onTicketEvent);
    return () => {
      socket.off('notification:new', onNotificationNew);
      socket.off('ticket:event', onTicketEvent);
    };
  }, [socket, user, loadNotifications, pushToast, router]);

  useEffect(() => {
    if (!bellOpen) return;
    const onOutside = (e: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setBellOpen(false);
      }
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setBellOpen(false);
    };
    document.addEventListener('mousedown', onOutside);
    window.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onOutside);
      window.removeEventListener('keydown', onEsc);
    };
  }, [bellOpen]);

  const handleNotificationClick = (n: Notification) => {
    if (!n.isRead) {
      setNotifications((prev) =>
        prev.map((item) => (item.id === n.id ? { ...item, isRead: true } : item))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
      api.notifications.markAsRead(n.id).catch(() => loadNotifications());
    }
    setBellOpen(false);
    if (n.ticketId) {
      router.push(`/dashboard/tickets/${n.ticketId}`);
    }
  };

  const handleMarkAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
    await api.notifications.markAllAsRead().catch(() => loadNotifications());
  };

  if (loading || !user) {
    return (
      <div className="flex h-screen items-center justify-center bg-surface">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand border-t-transparent" />
      </div>
    );
  }

  const navItems = [
    { href: '/dashboard', label: 'Summary', icon: LayoutDashboard, exact: true },
    { href: '/dashboard/board', label: 'Board', icon: Kanban, exact: false },
    { href: '/dashboard/tickets', label: 'List', icon: List, exact: false },
    { href: '/dashboard/notifications', label: 'Notifications', icon: Bell, exact: false },
  ];

  const isNavActive = (item: (typeof navItems)[number]) =>
    item.exact ? pathname === item.href : pathname.startsWith(item.href);

  const activeLabel = navItems.find(isNavActive)?.label ?? 'Ticket';

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-surface text-ink">
      {/* Section 3: Top bar (56px, sticky, z-100, bg --bg, border --border) */}
      <header className="z-[100] flex h-14 shrink-0 items-center justify-between border-b border-line bg-surface px-4 theme-surface">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="rounded-sm p-1.5 text-ink-subtle hover:bg-surface-hover md:hidden"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Original PulseDesk geometric SVG logo (24px) */}
          <Link href="/dashboard/board" className="flex items-center gap-2">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
              className="shrink-0"
            >
              <rect width="24" height="24" rx="4" fill="var(--color-brand)" />
              <path
                d="M6 12.5H9.5L11.2 8L13.6 16L15.4 11.5H18"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span className="text-[16px] font-semibold tracking-tight text-ink">
              PulseDesk
            </span>
          </Link>

          {/* Top bar nav menus */}
          <nav className="hidden items-center gap-1 pl-2 lg:flex">
            {navItems.slice(0, 3).map((item) => {
              const active = isNavActive(item);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`inline-flex h-8 items-center gap-1 rounded-sm px-2.5 text-[14px] font-medium transition-colors duration-[80ms] ${
                    active
                      ? 'bg-brand-subtle text-brand'
                      : 'text-ink-subtle hover:bg-surface-hover hover:text-ink'
                  }`}
                >
                  <span>{item.label}</span>
                  <ChevronDown className="h-3.5 w-3.5 opacity-60" />
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          {/* Search input: 200px -> 320px on focus, 180ms */}
          <div className="hidden sm:block">
            <button
              type="button"
              onClick={() => setCmdkOpen(true)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              style={{ width: searchFocused ? 320 : 200 }}
              className="flex h-8 items-center justify-between rounded-sm border border-line bg-surface px-2.5 text-[13px] text-ink-disabled transition-all duration-[180ms] ease-out hover:bg-surface-hover"
            >
              <span className="flex items-center gap-2 truncate">
                <Search className="h-3.5 w-3.5 shrink-0 text-ink-subtlest" />
                <span className="truncate">Search tickets...</span>
              </span>
              <kbd className="rounded-sm border border-line px-1 py-0.5 font-mono text-[10px] text-ink-subtlest">
                ⌘K
              </kbd>
            </button>
          </div>

          <Button
            variant="primary"
            size="default"
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => setCreateOpen(true)}
          >
            Create
          </Button>

          {/* Real-time connection status */}
          <Tooltip
            content={
              connected
                ? 'Live WebSocket updates active'
                : 'Reconnecting to real-time stream...'
            }
          >
            <span
              className={`hidden h-7 items-center gap-1 rounded-full px-2 text-[11px] font-medium sm:inline-flex ${
                connected
                  ? 'text-ink-success'
                  : 'text-ink-warning'
              }`}
              style={{
                backgroundColor: connected
                  ? 'var(--lozenge-green-bg)'
                  : 'var(--lozenge-yellow-bg)',
              }}
            >
              <Radio className={`h-3 w-3 ${connected ? 'animate-pulse' : ''}`} />
              {connected ? 'Live' : 'Syncing'}
            </span>
          </Tooltip>

          {/* Notification Bell with 400ms wiggle on new notification */}
          <div className="relative" ref={bellRef}>
            <button
              type="button"
              onClick={() => setBellOpen((prev) => !prev)}
              className="relative flex h-8 w-8 items-center justify-center rounded-sm text-ink-subtle transition-colors duration-[80ms] hover:bg-surface-hover hover:text-ink"
              aria-label="Notifications"
            >
              <motion.span
                key={bellWiggleKey}
                animate={
                  bellWiggleKey > 0
                    ? { rotate: [0, -12, 12, -6, 0] }
                    : undefined
                }
                transition={{ duration: 0.4, ease: ease.standard }}
              >
                <Bell className="h-4 w-4" />
              </motion.span>
              <AnimatePresence>
                {unreadCount > 0 && (
                  <motion.span
                    key={unreadCount}
                    initial={{ scale: 0.6, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.6, opacity: 0 }}
                    transition={spring.pop}
                    className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#C9372C] px-1 text-[10px] font-bold text-white"
                  >
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </motion.span>
                )}
              </AnimatePresence>
            </button>

            <AnimatePresence>
              {bellOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.96, y: -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.15, ease: ease.out }}
                  className="absolute right-0 mt-2 w-80 origin-top-right rounded-md border border-line bg-surface-overlay shadow-overlay sm:w-96 z-[400]"
                >
                  <div className="flex items-center justify-between border-b border-line px-4 py-3">
                    <span className="text-[14px] font-semibold text-ink">
                      Notifications
                    </span>
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={handleMarkAllRead}
                        className="inline-flex items-center gap-1 text-[12px] font-medium text-ink-link hover:underline"
                      >
                        <CheckCheck className="h-3.5 w-3.5" />
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div className="max-h-80 divide-y divide-line overflow-y-auto">
                    {notifications.length === 0 ? (
                      <p className="p-6 text-center text-[13px] text-ink-subtle">
                        No notifications yet
                      </p>
                    ) : (
                      notifications.slice(0, 8).map((n) => (
                        <button
                          key={n.id}
                          type="button"
                          onClick={() => handleNotificationClick(n)}
                          className={`w-full px-4 py-3 text-left transition-colors duration-[80ms] hover:bg-surface-hover ${
                            n.isRead ? '' : 'bg-brand-subtle/40'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-[13px] font-medium text-ink">{n.title}</p>
                            <span className="shrink-0 text-[11px] text-ink-subtlest">
                              {formatRelativeTime(n.createdAt)}
                            </span>
                          </div>
                          <p className="mt-0.5 line-clamp-2 text-[12px] text-ink-subtle">
                            {n.message}
                          </p>
                        </button>
                      ))
                    )}
                  </div>
                  <div className="border-t border-line p-2 text-center">
                    <Link
                      href="/dashboard/notifications"
                      onClick={() => setBellOpen(false)}
                      className="text-[12px] font-medium text-ink-link hover:underline"
                    >
                      View all notifications
                    </Link>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Theme Toggle */}
          <Tooltip content={theme === 'light' ? 'Switch to Dark theme' : 'Switch to Light theme'}>
            <button
              type="button"
              onClick={toggleTheme}
              className="flex h-8 w-8 items-center justify-center rounded-sm text-ink-subtle transition-colors duration-[80ms] hover:bg-surface-hover hover:text-ink"
              aria-label="Toggle theme"
            >
              {theme === 'light' ? (
                <Moon className="h-4 w-4" />
              ) : (
                <Sun className="h-4 w-4" />
              )}
            </button>
          </Tooltip>

          {/* Profile Menu */}
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button
                type="button"
                className="rounded-full p-0.5 transition-transform duration-[80ms] active:scale-95"
                aria-label="Account menu"
              >
                <Avatar name={user.name} size={24} liftOnHover={false} />
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                align="end"
                sideOffset={8}
                className="z-[400] min-w-[210px] rounded-md border border-line bg-surface-overlay py-1.5 shadow-overlay"
              >
                <div className="border-b border-line px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-[13px] font-semibold text-ink">{user.name}</p>
                    <Lozenge appearance={user.role === 'ADMIN' ? 'blue' : 'neutral'}>
                      {user.role}
                    </Lozenge>
                  </div>
                  <p className="truncate text-[12px] text-ink-subtlest">{user.email}</p>
                </div>
                <DropdownMenu.Item
                  onSelect={() => {
                    logout();
                    router.push('/login');
                  }}
                  className="mt-1 flex h-8 cursor-pointer items-center gap-2 px-3 text-[13px] text-ink-danger outline-none hover:bg-surface-hover"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Sign out
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>
      </header>

      {/* Workspace Body: Fixed Unscrollable Sidebar + Scrollable Content */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* Desktop Collapsible Sidebar (240px -> 56px over 250ms ease.standard) */}
        <motion.aside
          initial={false}
          animate={{ width: collapsed ? 56 : 240 }}
          transition={{ duration: duration.moderate, ease: ease.standard }}
          className="relative z-[200] hidden h-full shrink-0 flex-col border-r border-line bg-surface-sunken theme-surface md:flex"
        >
          {/* Collapse Toggle Button on Sidebar Edge */}
          <button
            type="button"
            onClick={() => setCollapsed((prev) => !prev)}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="absolute -right-3 top-6 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-line bg-surface text-ink-subtle shadow-raised transition-colors duration-[80ms] hover:bg-brand hover:text-white"
          >
            <motion.span
              animate={{ rotate: collapsed ? 180 : 0 }}
              transition={{ duration: duration.base, ease: ease.standard }}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </motion.span>
          </button>

          {/* Project Header */}
          <div className="flex shrink-0 items-center gap-2.5 border-b border-line px-3 py-4">
            <div
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm text-[12px] font-bold text-white"
              style={{ backgroundColor: 'var(--color-brand)' }}
            >
              PD
            </div>
            <AnimatePresence initial={false}>
              {!collapsed && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.1 }}
                  className="min-w-0"
                >
                  <p className="truncate text-[14px] font-semibold text-ink">
                    PulseDesk Support
                  </p>
                  <p className="truncate text-[12px] text-ink-subtlest">
                    Service Desk Project
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Unscrollable Nav List (3-4 core sections) */}
          <nav className="flex-1 overflow-hidden px-2 py-3">
            {!collapsed && (
              <p className="px-2.5 pb-1.5 text-[11px] font-semibold uppercase tracking-[0.04em] text-ink-subtlest">
                Planning
              </p>
            )}
            <div className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = isNavActive(item);

                const linkContent = (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`relative flex h-9 items-center justify-between rounded-sm px-2.5 text-[14px] font-medium transition-colors duration-[80ms] ${
                      active
                        ? 'bg-brand-subtle text-brand'
                        : 'text-ink-subtle hover:bg-surface-hover hover:text-ink'
                    }`}
                  >
                    {active && (
                      <motion.span
                        layoutId="sidebar-active-bar"
                        transition={spring.layout}
                        className="absolute bottom-1.5 left-0 top-1.5 w-[3px] rounded-r bg-brand"
                      />
                    )}
                    <span className="flex min-w-0 items-center gap-3">
                      <Icon className="h-4 w-4 shrink-0" />
                      {!collapsed && (
                        <motion.span
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ duration: 0.1 }}
                          className="truncate"
                        >
                          {item.label}
                        </motion.span>
                      )}
                    </span>
                    {!collapsed && item.href === '/dashboard/notifications' && unreadCount > 0 && (
                      <Lozenge appearance="red">{unreadCount}</Lozenge>
                    )}
                  </Link>
                );

                return collapsed ? (
                  <Tooltip key={item.href} content={item.label} side="right">
                    {linkContent}
                  </Tooltip>
                ) : (
                  linkContent
                );
              })}
            </div>
          </nav>

          {/* Pinned Sidebar Footer (never scrolls) */}
          <div className="shrink-0 border-t border-line p-2.5">
            <div
              className={`flex items-center gap-2.5 rounded-sm p-1.5 ${
                collapsed ? 'justify-center' : ''
              }`}
            >
              <Avatar name={user.name} size={32} liftOnHover={false} />
              {!collapsed && (
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <p className="truncate text-[13px] font-medium text-ink">{user.name}</p>
                    <Lozenge appearance={user.role === 'ADMIN' ? 'blue' : 'neutral'}>
                      {user.role}
                    </Lozenge>
                  </div>
                  <p className="truncate text-[11px] text-ink-subtlest">{user.email}</p>
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => {
                logout();
                router.push('/login');
              }}
              className={`mt-1 flex h-8 w-full items-center gap-2 rounded-sm px-2.5 text-[13px] font-medium text-ink-subtle transition-colors duration-[80ms] hover:bg-surface-hover hover:text-ink-danger ${
                collapsed ? 'justify-center' : ''
              }`}
            >
              <LogOut className="h-4 w-4 shrink-0" />
              {!collapsed && <span>Sign out</span>}
            </button>
          </div>
        </motion.aside>

        {/* Mobile Drawer */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[500] flex md:hidden"
              style={{ backgroundColor: 'var(--bg-blanket)' }}
              onMouseDown={(e) => {
                if (e.target === e.currentTarget) setMobileMenuOpen(false);
              }}
            >
              <motion.aside
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ duration: duration.slow, ease: ease.out }}
                className="flex h-full w-64 flex-col bg-surface-sunken shadow-overlay"
              >
                <div className="flex items-center justify-between border-b border-line px-4 py-3.5">
                  <span className="font-semibold text-ink">PulseDesk Support</span>
                  <button
                    type="button"
                    onClick={() => setMobileMenuOpen(false)}
                    className="rounded-sm p-1 text-ink-subtle hover:bg-surface-hover"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <nav className="flex-1 space-y-1 p-3">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    const active = isNavActive(item);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex h-9 items-center gap-3 rounded-sm px-3 text-[14px] font-medium ${
                          active
                            ? 'bg-brand-subtle text-brand'
                            : 'text-ink-subtle hover:bg-surface-hover'
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        {item.label}
                      </Link>
                    );
                  })}
                </nav>
                <div className="border-t border-line p-3">
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      logout();
                      router.push('/login');
                    }}
                    className="flex h-8 w-full items-center gap-2 rounded-sm px-3 text-[13px] font-medium text-ink-danger hover:bg-surface-hover"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </button>
                </div>
              </motion.aside>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Scrollable Right Content Area with Breadcrumbs + Animated Tabs */}
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden bg-surface theme-surface">
          <div className="shrink-0 border-b border-line px-6 pt-4 sm:px-8">
            <div className="flex items-center gap-1.5 text-[13px] text-ink-subtle">
              <Link href="/dashboard" className="hover:underline">
                Projects
              </Link>
              <span className="text-ink-subtlest">/</span>
              <Link href="/dashboard/board" className="hover:underline">
                PulseDesk Support
              </Link>
              <span className="text-ink-subtlest">/</span>
              <span className="text-ink">{activeLabel}</span>
            </div>

            <div className="mt-1 flex items-center justify-between gap-4">
              <h1 className="text-[20px] font-medium leading-[24px] text-ink">
                PulseDesk Service Desk
              </h1>
            </div>

            {/* Section 4.6: Tabs with layoutId sliding 2px brand indicator */}
            <div className="mt-2 flex gap-1 overflow-x-auto">
              {navItems.map((tab) => {
                const active = isNavActive(tab);
                return (
                  <Link
                    key={tab.href}
                    href={tab.href}
                    className={`relative inline-flex h-10 shrink-0 items-center px-3 text-[14px] font-medium transition-colors duration-[80ms] ${
                      active
                        ? 'text-brand'
                        : 'text-ink-subtle hover:bg-surface-hover hover:text-ink'
                    }`}
                  >
                    {tab.label}
                    {active && (
                      <motion.span
                        layoutId="shell-tab-indicator"
                        transition={spring.layout}
                        className="absolute bottom-0 left-0 right-0 h-[2px] bg-brand"
                      />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>

          <main className="flex-1 overflow-y-auto px-6 py-6 sm:px-8">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, ease: ease.out }}
            >
              {children}
            </motion.div>
          </main>
        </div>
      </div>

      <CommandPalette
        open={cmdkOpen}
        onClose={() => setCmdkOpen(false)}
        onOpenCreate={() => setCreateOpen(true)}
      />

      <CreateTicketModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => {
          router.refresh();
        }}
      />
    </div>
  );
}
