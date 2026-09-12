'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Bell,
  Check,
  CheckCheck,
  ChevronRight,
  Clock,
  FileText,
  Loader2,
  Sparkles,
  X,
} from 'lucide-react';

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:8000';

export interface NotificationItem {
  id: string;
  user_id?: string | null;
  message: string;
  related_decision_id?: string | null;
  read: boolean;
  is_read?: boolean;
  created_at: string;
}

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/notifications/`);
      if (res.ok) {
        const data: NotificationItem[] = await res.json();
        setNotifications(data);
      }
    } catch {
      // Gracefully silent on network error in offline mode
    }
  }, []);

  // Initial fetch and gentle background poll (every 25s)
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 25000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Re-fetch whenever user opens the dropdown
  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      fetchNotifications().finally(() => setIsLoading(false));
    }
  }, [isOpen, fetchNotifications]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleMarkAsRead = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    // Optimistic UI update
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true, is_read: true } : n))
    );

    try {
      await fetch(`${API_BASE}/notifications/${id}/read`, { method: 'POST' });
    } catch {
      // Re-fetch on error
      fetchNotifications();
    }
  };

  const handleMarkAllRead = async () => {
    // Optimistic UI update
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, read: true, is_read: true }))
    );

    try {
      await fetch(`${API_BASE}/notifications/read-all`, { method: 'POST' });
    } catch {
      fetchNotifications();
    }
  };

  const handleSimulateUpdate = async () => {
    setIsSimulating(true);
    try {
      const res = await fetch(`${API_BASE}/notifications/trigger-source-update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source_filename: '10-Q_Q3_2024.pdf',
          claims_count: 14,
        }),
      });
      if (res.ok) {
        await fetchNotifications();
      }
    } catch {
      // ignore
    } finally {
      setIsSimulating(false);
    }
  };

  const unreadCount = notifications.filter((n) => !n.read && !n.is_read).length;

  const formatTime = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMin = Math.floor(diffMs / 60000);
      if (diffMin < 1) return 'Just now';
      if (diffMin < 60) return `${diffMin}m ago`;
      const diffHrs = Math.floor(diffMin / 60);
      if (diffHrs < 24) return `${diffHrs}h ago`;
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`relative p-2 rounded-lg transition-colors duration-150 cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent-teal/20 ${
          isOpen
            ? 'bg-bg-secondary text-accent-teal'
            : 'text-ink-muted hover:text-ink hover:bg-bg-secondary/70'
        }`}
        aria-label="Notifications"
        title="View Notifications"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-accent-teal text-white text-[9px] font-bold tracking-tight shadow-xs animate-fadeIn">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-bg border border-border rounded-lg shadow-xl z-50 overflow-hidden animate-fadeIn">
          {/* Header */}
          <div className="px-4 py-3 bg-[#F0F7F5] border-b border-accent-teal/20 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-accent-teal" />
              <h3 className="text-sm font-serif font-bold text-ink tracking-tight">
                Notifications
              </h3>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-accent-teal text-white">
                  {unreadCount} new
                </span>
              )}
            </div>

            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-accent-teal hover:underline underline-offset-2 cursor-pointer"
                  title="Mark all as read"
                >
                  <CheckCheck className="w-3 h-3" />
                  <span>Mark all read</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 text-ink-muted hover:text-ink rounded transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="max-h-84 overflow-y-auto divide-y divide-border">
            {isLoading && notifications.length === 0 ? (
              <div className="py-8 flex flex-col items-center justify-center gap-2 text-accent-teal">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-xs text-ink-muted">Checking alerts...</span>
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-8 px-4 text-center space-y-3">
                <div className="w-9 h-9 mx-auto rounded-full bg-bg-secondary flex items-center justify-center text-ink-muted">
                  <Bell className="w-4 h-4" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-ink">All caught up!</p>
                  <p className="text-[11px] text-ink-muted leading-relaxed max-w-xs mx-auto">
                    You will be alerted whenever a source update or re-ingested document impacts an existing Decision Snapshot.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleSimulateUpdate}
                  disabled={isSimulating}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-[11px] font-semibold bg-[#EBF5F3] text-accent-teal border border-accent-teal/30 hover:bg-accent-teal/20 transition-all cursor-pointer disabled:opacity-60"
                >
                  {isSimulating ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>Simulating...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3 h-3" />
                      <span>Simulate Source Update</span>
                    </>
                  )}
                </button>
              </div>
            ) : (
              notifications.map((notif) => {
                const isUnread = !notif.read && !notif.is_read;
                return (
                  <div
                    key={notif.id}
                    onClick={() => {
                      if (isUnread) handleMarkAsRead(notif.id);
                    }}
                    className={`p-3.5 transition-colors duration-150 flex items-start gap-2.5 cursor-pointer ${
                      isUnread
                        ? 'bg-[#F9FBFB] hover:bg-[#F0F7F5]/70'
                        : 'bg-bg hover:bg-bg-secondary/60'
                    }`}
                  >
                    {/* Unread indicator / icon */}
                    <div className="mt-1 shrink-0">
                      {isUnread ? (
                        <span
                          className="block w-2 h-2 rounded-full bg-accent-teal ring-4 ring-accent-teal/15"
                          title="Unread"
                        />
                      ) : (
                        <span className="block w-1.5 h-1.5 rounded-full bg-border" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <p
                        className={`text-xs leading-snug ${
                          isUnread ? 'font-medium text-ink' : 'text-ink-muted'
                        }`}
                      >
                        {notif.message}
                      </p>

                      <div className="flex items-center justify-between gap-2 pt-0.5">
                        <span className="text-[10px] font-mono text-ink-muted flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" />
                          {formatTime(notif.created_at)}
                        </span>

                        <div className="flex items-center gap-2 shrink-0">
                          {notif.related_decision_id && (
                            <Link
                              href="/dashboard/decisions"
                              onClick={() => {
                                if (isUnread) handleMarkAsRead(notif.id);
                                setIsOpen(false);
                              }}
                              className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-accent-teal hover:underline underline-offset-2"
                              title="Go to Decision Snapshots"
                            >
                              <span>View Snapshot</span>
                              <ChevronRight className="w-2.5 h-2.5" />
                            </Link>
                          )}

                          {isUnread && (
                            <button
                              type="button"
                              onClick={(e) => handleMarkAsRead(notif.id, e)}
                              className="p-1 rounded text-ink-muted hover:text-accent-teal transition-colors"
                              title="Mark as read"
                            >
                              <Check className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2.5 bg-bg-secondary border-t border-border flex items-center justify-between text-[11px]">
            <Link
              href="/dashboard/decisions"
              onClick={() => setIsOpen(false)}
              className="text-ink-muted hover:text-accent-teal transition-colors flex items-center gap-1 font-medium"
            >
              <FileText className="w-3 h-3" />
              <span>Decision Snapshots</span>
            </Link>

            <button
              type="button"
              onClick={handleSimulateUpdate}
              disabled={isSimulating}
              className="text-[10px] text-accent-teal hover:underline underline-offset-2 font-semibold disabled:opacity-60 cursor-pointer"
              title="Trigger source update notification"
            >
              {isSimulating ? 'Simulating...' : '+ Trigger Test Update'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
