'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowUpDown,
  Bookmark,
  CheckCircle2,
  Clock,
  Database,
  Eye,
  FileText,
  Filter,
  History,
  Layers,
  Loader2,
  MessageSquare,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Upload,
  User,
  X,
} from 'lucide-react';

// -- Types ---------------------------------------------------------------------

interface ActivityLogItem {
  id: string;
  user_id?: string | null;
  action_type: string;
  target: string;
  timestamp: string;
  details?: string | null;
}

interface ActivityStats {
  total_events: number;
  action_counts: Record<string, number>;
  latest_timestamp?: string | null;
}

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:8000';

const ALLOWED_ROLES = ['admin', 'reviewer'];

// -- Action badge and styling definitions --------------------------------------

interface ActionConfig {
  label: string;
  badgeClass: string;
  icon: React.ComponentType<{ className?: string }>;
}

const ACTION_CONFIGS: Record<string, ActionConfig> = {
  evidence_uploaded: {
    label: 'Evidence Uploaded',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
    icon: Upload,
  },
  query_run: {
    label: 'Query Run',
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
    icon: MessageSquare,
  },
  decision_saved: {
    label: 'Decision Saved',
    badgeClass: 'bg-teal-50 text-teal-700 border-teal-200',
    icon: Bookmark,
  },
  decision_reviewed: {
    label: 'Decision Reviewed',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
    icon: Eye,
  },
  decision_approved: {
    label: 'Decision Approved',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: ShieldCheck,
  },
};

const DEFAULT_ACTION_CONFIG: ActionConfig = {
  label: 'System Action',
  badgeClass: 'bg-gray-50 text-gray-700 border-gray-200',
  icon: Activity,
};

export default function ActivityLogPage() {
  const [userRole, setUserRole] = useState<string>('');
  const [isRoleChecked, setIsRoleChecked] = useState<boolean>(false);
  const [activities, setActivities] = useState<ActivityLogItem[]>([]);
  const [stats, setStats] = useState<ActivityStats | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [actionFilter, setActionFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [userFilter, setUserFilter] = useState<string>('');
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  // Check role authorization on client
  useEffect(() => {
    let currentRole = '';
    if (typeof window !== 'undefined') {
      currentRole =
        localStorage.getItem('omnivise_selected_role') ||
        sessionStorage.getItem('omnivise_selected_role') ||
        '';

      const storedUser = localStorage.getItem('omnivise_user');
      if (storedUser) {
        try {
          const parsed = JSON.parse(storedUser);
          if (parsed.role) currentRole = parsed.role;
        } catch {
          // ignore
        }
      }
    }

    if (currentRole) {
      setUserRole(currentRole);
      setIsRoleChecked(true);
    }

    // Verify with /api/auth/me
    fetch('/api/auth/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.user?.role) {
          setUserRole(data.user.role);
        }
      })
      .catch(() => {
        // use cached role
      })
      .finally(() => {
        setIsRoleChecked(true);
      });
  }, []);

  const isAuthorized = useMemo(() => {
    if (!userRole) return false;
    return ALLOWED_ROLES.includes(userRole.toLowerCase().trim());
  }, [userRole]);

  // Fetch activities from backend
  const fetchActivities = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const headers: Record<string, string> = {};
      const token = typeof window !== 'undefined' ? localStorage.getItem('omnivise_token') : null;
      if (token) headers['Authorization'] = 'Bearer ' + token;
      if (userRole) headers['X-User-Role'] = userRole.toLowerCase().trim();

      const [logsRes, statsRes] = await Promise.all([
        fetch(`${API_BASE}/activity/?limit=100`, { headers }),
        fetch(`${API_BASE}/activity/stats`, { headers }),
      ]);

      if (!logsRes.ok) {
        if (logsRes.status === 403) {
          throw new Error('Access denied: Admin or Reviewer role required.');
        }
        throw new Error(`Failed to load activity logs: HTTP ${logsRes.status}`);
      }

      const data: ActivityLogItem[] = await logsRes.json();
      setActivities(data);

      if (statsRes.ok) {
        const statsData: ActivityStats = await statsRes.json();
        setStats(statsData);
      }
      setLastRefreshed(new Date());
    } catch (err: unknown) {
      const e = err as Error;
      setError(e.message || 'Error fetching activity log');
    } finally {
      setIsLoading(false);
    }
  }, [userRole]);

  useEffect(() => {
    if (isRoleChecked && isAuthorized) {
      fetchActivities();
    }
  }, [isRoleChecked, isAuthorized, fetchActivities]);

  // Handler for simulating an event
  const handleSimulateEvent = async (actionType: string) => {
    setIsSimulating(true);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('omnivise_token') : null;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = 'Bearer ' + token;
      if (userRole) headers['X-User-Role'] = userRole.toLowerCase().trim();

      let target = 'SEC_10-Q_Q3_2024.pdf';
      let details: Record<string, unknown> = {};

      if (actionType === 'evidence_uploaded') {
        target = 'Vendor_Ledger_Aug2024.xlsx';
        details = { source: 'Excel Ledger', pages_or_rows: 42, modality: 'spreadsheet' };
      } else if (actionType === 'query_run') {
        target = 'Evaluate Q3 gross margin divergence between 10-Q and internal vendor billing';
        details = { filter_source: 'SEC Filing', retrieved: 6 };
      } else if (actionType === 'decision_saved') {
        target = 'Snapshot: Operating expenses variance under NX-8821 PO terms';
        details = { status: 'REVIEW', robustness: 88 };
      } else if (actionType === 'decision_reviewed') {
        target = 'Snapshot: Revenue contradiction flagged in Note 8 disclosures';
        details = { reviewer: userRole, action: 'marked_under_review' };
      } else if (actionType === 'decision_approved') {
        target = 'Snapshot: Wafer expedite surcharge verification';
        details = { approved_by: userRole, status: 'PASS' };
      }

      const res = await fetch(`${API_BASE}/activity/`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action_type: actionType,
          target,
          user_id: userRole.toLowerCase(),
          details,
        }),
      });

      if (res.ok) {
        await fetchActivities();
      }
    } catch {
      // ignore
    } finally {
      setIsSimulating(false);
    }
  };

  // Filtered activities computed client-side for immediate responsiveness
  const filteredActivities = useMemo(() => {
    return activities.filter((item) => {
      // Action type filter
      if (actionFilter !== 'ALL' && item.action_type !== actionFilter) {
        return false;
      }
      // Target or details search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesTarget = item.target.toLowerCase().includes(query);
        const matchesDetails = item.details?.toLowerCase().includes(query) ?? false;
        const matchesType = item.action_type.toLowerCase().includes(query);
        if (!matchesTarget && !matchesDetails && !matchesType) return false;
      }
      // User ID filter
      if (userFilter.trim()) {
        const u = userFilter.toLowerCase().trim();
        if (!item.user_id?.toLowerCase().includes(u)) return false;
      }
      return true;
    });
  }, [activities, actionFilter, searchQuery, userFilter]);

  // Format relative timestamp
  const formatTimeAgo = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffSec = Math.floor(diffMs / 1000);
      if (diffSec < 45) return 'Just now';
      const diffMin = Math.floor(diffSec / 60);
      if (diffMin < 60) return diffMin + 'm ago';
      const diffHrs = Math.floor(diffMin / 60);
      if (diffHrs < 24) return diffHrs + 'h ago';
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const formatExactDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  // -- Access Restricted Screen ------------------------------------------------
  if (isRoleChecked && !isAuthorized) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4 space-y-6 animate-fadeIn">
        <div className="bg-bg border border-border rounded-xl p-8 shadow-sm text-center space-y-5">
          <div className="w-14 h-14 mx-auto rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
            <ShieldAlert className="w-7 h-7" />
          </div>

          <div className="space-y-2">
            <h1 className="text-xl font-serif font-bold text-ink tracking-tight">
              Restricted Access: Activity Log
            </h1>
            <p className="text-xs text-ink-muted leading-relaxed max-w-md mx-auto">
              The Activity Log contains an immutable, system-wide operational audit trail and is
              restricted to <strong>Admin</strong> and <strong>Reviewer</strong> roles in compliance with enterprise audit security policies.
            </p>
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-bg-secondary border border-border text-xs text-ink-muted font-medium">
            <span>Your current role:</span>
            <span className="font-semibold text-ink uppercase tracking-wider text-[11px]">
              {userRole || 'Analyst (Default)'}
            </span>
          </div>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/select-role"
              className="w-full sm:w-auto px-4 py-2 rounded-lg bg-accent-teal text-white text-xs font-semibold hover:bg-accent-teal/90 transition-all shadow-xs"
            >
              Switch Role to Admin or Reviewer
            </Link>
            <Link
              href="/dashboard"
              className="w-full sm:w-auto px-4 py-2 rounded-lg border border-border text-ink-muted hover:text-ink hover:bg-bg-secondary text-xs font-semibold transition-all"
            >
              Return to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // -- Authorized View (Admin / Reviewer) --------------------------------------
  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-serif font-bold text-ink tracking-tight">
              Activity Log
            </h1>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-[#F0F7F5] border border-accent-teal/30 text-accent-teal uppercase tracking-wider">
              <ShieldCheck className="w-3 h-3" />
              <span>{userRole || 'Reviewer'} Access</span>
            </span>
          </div>
          <p className="text-xs text-ink-muted">
            Chronological, immutable audit trail tracking evidence uploads, queries, and decision lifecycle actions.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Quick Simulation Menu */}
          <div className="relative group">
            <button
              type="button"
              disabled={isSimulating}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-accent-teal/40 bg-[#F0F7F5] text-accent-teal hover:bg-accent-teal/20 text-xs font-semibold transition-all cursor-pointer disabled:opacity-60"
            >
              {isSimulating ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5" />
              )}
              <span>+ Simulate Event</span>
            </button>
            <div className="absolute right-0 mt-1 w-56 bg-bg border border-border rounded-lg shadow-xl py-1 z-20 hidden group-hover:block animate-fadeIn text-xs">
              <button
                type="button"
                onClick={() => handleSimulateEvent('evidence_uploaded')}
                className="w-full text-left px-3 py-2 hover:bg-bg-secondary flex items-center gap-2 text-ink"
              >
                <Upload className="w-3.5 h-3.5 text-blue-600" />
                <span>Evidence Uploaded</span>
              </button>
              <button
                type="button"
                onClick={() => handleSimulateEvent('query_run')}
                className="w-full text-left px-3 py-2 hover:bg-bg-secondary flex items-center gap-2 text-ink"
              >
                <MessageSquare className="w-3.5 h-3.5 text-purple-600" />
                <span>Query Run</span>
              </button>
              <button
                type="button"
                onClick={() => handleSimulateEvent('decision_saved')}
                className="w-full text-left px-3 py-2 hover:bg-bg-secondary flex items-center gap-2 text-ink"
              >
                <Bookmark className="w-3.5 h-3.5 text-teal-600" />
                <span>Decision Saved</span>
              </button>
              <button
                type="button"
                onClick={() => handleSimulateEvent('decision_reviewed')}
                className="w-full text-left px-3 py-2 hover:bg-bg-secondary flex items-center gap-2 text-ink"
              >
                <Eye className="w-3.5 h-3.5 text-amber-600" />
                <span>Decision Reviewed</span>
              </button>
              <button
                type="button"
                onClick={() => handleSimulateEvent('decision_approved')}
                className="w-full text-left px-3 py-2 hover:bg-bg-secondary flex items-center gap-2 text-ink"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Decision Approved</span>
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={fetchActivities}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-bg hover:bg-bg-secondary text-ink text-xs font-semibold transition-all cursor-pointer disabled:opacity-60"
            title="Refresh logs"
          >
            <RefreshCw className={"w-3.5 h-3.5 " + (isLoading ? "animate-spin" : "")} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-bg border border-border rounded-xl p-3.5 space-y-1 shadow-xs">
          <div className="flex items-center justify-between text-ink-muted">
            <span className="text-[11px] font-medium uppercase tracking-wide">Total Events</span>
            <History className="w-4 h-4 text-accent-teal" />
          </div>
          <p className="text-xl font-serif font-bold text-ink">{activities.length}</p>
          <span className="text-[10px] text-ink-muted font-mono">
            {stats?.latest_timestamp ? "Updated " + formatTimeAgo(stats.latest_timestamp) : 'Live stream'}
          </span>
        </div>

        <div className="bg-bg border border-border rounded-xl p-3.5 space-y-1 shadow-xs">
          <div className="flex items-center justify-between text-ink-muted">
            <span className="text-[11px] font-medium uppercase tracking-wide">Evidence Uploads</span>
            <Upload className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-xl font-serif font-bold text-ink">
            {stats?.action_counts?.evidence_uploaded ?? activities.filter((a) => a.action_type === 'evidence_uploaded').length}
          </p>
          <span className="text-[10px] text-blue-700 font-medium">Ingestion Pipeline</span>
        </div>

        <div className="bg-bg border border-border rounded-xl p-3.5 space-y-1 shadow-xs">
          <div className="flex items-center justify-between text-ink-muted">
            <span className="text-[11px] font-medium uppercase tracking-wide">Queries Run</span>
            <MessageSquare className="w-4 h-4 text-purple-600" />
          </div>
          <p className="text-xl font-serif font-bold text-ink">
            {stats?.action_counts?.query_run ?? activities.filter((a) => a.action_type === 'query_run').length}
          </p>
          <span className="text-[10px] text-purple-700 font-medium">Workspace Searches</span>
        </div>

        <div className="bg-bg border border-border rounded-xl p-3.5 space-y-1 shadow-xs">
          <div className="flex items-center justify-between text-ink-muted">
            <span className="text-[11px] font-medium uppercase tracking-wide">Decisions Saved</span>
            <Bookmark className="w-4 h-4 text-teal-600" />
          </div>
          <p className="text-xl font-serif font-bold text-ink">
            {stats?.action_counts?.decision_saved ?? activities.filter((a) => a.action_type === 'decision_saved').length}
          </p>
          <span className="text-[10px] text-teal-700 font-medium">Immutable Snapshots</span>
        </div>

        <div className="bg-bg border border-border rounded-xl p-3.5 space-y-1 shadow-xs col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-ink-muted">
            <span className="text-[11px] font-medium uppercase tracking-wide">Sign-offs & Reviews</span>
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-xl font-serif font-bold text-ink">
            {(stats?.action_counts?.decision_approved ?? activities.filter((a) => a.action_type === 'decision_approved').length) +
             (stats?.action_counts?.decision_reviewed ?? activities.filter((a) => a.action_type === 'decision_reviewed').length)}
          </p>
          <span className="text-[10px] text-emerald-700 font-medium">Governance Audit</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-bg border border-border rounded-xl p-3.5 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Action Type Filter Pills */}
          <div className="w-full md:w-auto flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            {[
              { id: 'ALL', label: 'All Events' },
              { id: 'evidence_uploaded', label: 'Evidence Uploaded' },
              { id: 'query_run', label: 'Query Run' },
              { id: 'decision_saved', label: 'Decision Saved' },
              { id: 'decision_reviewed', label: 'Reviewed' },
              { id: 'decision_approved', label: 'Approved' },
            ].map((pill) => {
              const active = actionFilter === pill.id;
              return (
                <button
                  key={pill.id}
                  type="button"
                  onClick={() => setActionFilter(pill.id)}
                  className={"px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer " +
                    (active
                      ? 'bg-accent-teal text-white shadow-xs'
                      : 'bg-bg-secondary text-ink-muted hover:text-ink hover:bg-border/60')}
                >
                  {pill.label}
                </button>
              );
            })}
          </div>

          {/* Search & User Filter Inputs */}
          <div className="w-full md:w-auto flex items-center gap-2">
            <div className="relative flex-1 sm:w-60">
              <Search className="w-3.5 h-3.5 text-ink-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search target or keyword..."
                className="w-full pl-8 pr-7 py-1.5 rounded-lg bg-bg-secondary border border-border text-ink text-xs placeholder:text-ink-muted/70 focus:outline-none focus:ring-1 focus:ring-accent-teal"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            <div className="relative w-36 sm:w-40">
              <User className="w-3.5 h-3.5 text-ink-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={userFilter}
                onChange={(e) => setUserFilter(e.target.value)}
                placeholder="User filter..."
                className="w-full pl-8 pr-2 py-1.5 rounded-lg bg-bg-secondary border border-border text-ink text-xs placeholder:text-ink-muted/70 focus:outline-none focus:ring-1 focus:ring-accent-teal"
              />
            </div>

            {(actionFilter !== 'ALL' || searchQuery || userFilter) && (
              <button
                type="button"
                onClick={() => {
                  setActionFilter('ALL');
                  setSearchQuery('');
                  setUserFilter('');
                }}
                className="p-1.5 text-ink-muted hover:text-rose-600 rounded transition-colors"
                title="Clear all filters"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-bg border border-border rounded-xl shadow-xs overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border flex items-center justify-between bg-[#FAFCFC]">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-accent-teal" />
            <h2 className="text-sm font-semibold text-ink">Audit Operations</h2>
            <span className="text-xs text-ink-muted font-mono">
              ({filteredActivities.length} of {activities.length} events)
            </span>
          </div>
          <span className="text-[11px] text-ink-muted font-mono">
            Newest first &middot; ISO 8601 timestamps
          </span>
        </div>

        {isLoading ? (
          <div className="py-16 flex flex-col items-center justify-center gap-2 text-accent-teal">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span className="text-xs text-ink-muted">Loading audit log events...</span>
          </div>
        ) : error ? (
          <div className="p-6 text-center space-y-2">
            <AlertCircle className="w-6 h-6 text-rose-500 mx-auto" />
            <p className="text-sm font-medium text-rose-600">{error}</p>
            <button
              type="button"
              onClick={fetchActivities}
              className="text-xs text-accent-teal hover:underline font-semibold"
            >
              Try Again
            </button>
          </div>
        ) : filteredActivities.length === 0 ? (
          <div className="py-16 px-4 text-center space-y-3">
            <div className="w-10 h-10 mx-auto rounded-full bg-bg-secondary flex items-center justify-center text-ink-muted">
              <History className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-ink">No activity events found</p>
              <p className="text-xs text-ink-muted max-w-sm mx-auto">
                {activities.length === 0
                  ? 'No events have been recorded yet. Upload a document, run a query, or click "+ Simulate Event" to generate audit logs.'
                  : 'No events match your current filter criteria. Try resetting the filters.'}
              </p>
            </div>
            {activities.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setActionFilter('ALL');
                  setSearchQuery('');
                  setUserFilter('');
                }}
                className="text-xs font-semibold text-accent-teal hover:underline"
              >
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border bg-bg-secondary/60 text-ink-muted font-semibold tracking-wide uppercase text-[10px]">
                  <th className="py-3 px-4 w-44">Timestamp</th>
                  <th className="py-3 px-4 w-48">Action Type</th>
                  <th className="py-3 px-4">Target / Scope</th>
                  <th className="py-3 px-4 w-36">User</th>
                  <th className="py-3 px-4 w-52">Metadata / Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredActivities.map((item) => {
                  const cfg = ACTION_CONFIGS[item.action_type] || DEFAULT_ACTION_CONFIG;
                  const Icon = cfg.icon;

                  // Parse details safely if json
                  let parsedDetails: Record<string, unknown> | null = null;
                  if (item.details) {
                    try {
                      parsedDetails = JSON.parse(item.details);
                    } catch {
                      parsedDetails = null;
                    }
                  }

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-[#F9FBFB] transition-colors duration-150 group"
                    >
                      {/* Timestamp */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span
                            className="font-medium text-ink flex items-center gap-1"
                            title={formatExactDate(item.timestamp)}
                          >
                            <Clock className="w-3 h-3 text-ink-muted shrink-0" />
                            <span>{formatTimeAgo(item.timestamp)}</span>
                          </span>
                          <span className="text-[10px] text-ink-muted font-mono">
                            {formatExactDate(item.timestamp)}
                          </span>
                        </div>
                      </td>

                      {/* Action Type Badge */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={"inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-semibold tracking-tight " + cfg.badgeClass}
                        >
                          <Icon className="w-3 h-3 shrink-0" />
                          <span>{cfg.label}</span>
                        </span>
                      </td>

                      {/* Target */}
                      <td className="py-3 px-4">
                        <div className="space-y-0.5 max-w-xl">
                          <p className="font-medium text-ink break-words leading-relaxed">
                            {item.target}
                          </p>
                          <span className="text-[10px] font-mono text-ink-muted/80 block">
                            ID: {item.id}
                          </span>
                        </div>
                      </td>

                      {/* User */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <div className="w-5 h-5 rounded-full bg-accent-teal/10 text-accent-teal flex items-center justify-center font-bold text-[10px]">
                            {(item.user_id || 'sys').slice(0, 2).toUpperCase()}
                          </div>
                          <span className="font-mono text-ink font-medium">
                            {item.user_id || 'System'}
                          </span>
                        </div>
                      </td>

                      {/* Details / Metadata */}
                      <td className="py-3 px-4">
                        {parsedDetails ? (
                          <div className="flex flex-wrap gap-1">
                            {Object.entries(parsedDetails).map(([key, val]) => (
                              <span
                                key={key}
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-bg-secondary border border-border text-[10px] font-mono text-ink-muted"
                                title={key + ': ' + String(val)}
                              >
                                <span className="font-semibold text-ink">{key}:</span>
                                <span className="truncate max-w-[120px]">{String(val)}</span>
                              </span>
                            ))}
                          </div>
                        ) : item.details ? (
                          <span className="text-xs text-ink-muted font-mono truncate block max-w-xs">
                            {item.details}
                          </span>
                        ) : (
                          <span className="text-ink-muted text-[11px] italic"></span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
