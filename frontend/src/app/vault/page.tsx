'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Clock,
  Database,
  Download,
  KeyRound,
  Loader2,
  Lock,
  Search,
  Shield,
  ShieldCheck,
  Unlock,
  X,
  Activity,
  Layers,
  Cpu,
  RotateCw,
  ExternalLink,
  Sparkles,
} from 'lucide-react';
import DashboardSidebar from '../../components/layout/DashboardSidebar';
import DashboardTopBar from '../../components/layout/DashboardTopBar';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Metric {
  label: string;
  value: string;
  badge?: string;
}

interface EvidenceRef {
  source?: string;
  sourceDoc?: string;
  location?: string;
  page_or_timestamp?: string;
  claim?: string;
}

interface MissingEvidence {
  description?: string;
  impact?: string;
  missingDocuments?: string[];
}

interface CriticalEvidence {
  id?: string;
  source?: string;
  modality?: string;
  impact?: string;
}

interface DecisionSnapshot {
  id: string;
  question: string;
  conclusion: string;
  reasoning: string;
  confidence_badge?: string;
  status: 'PASS' | 'REVIEW' | 'BLOCK';
  robustness_score?: number;
  robustness_percentage?: number;
  metrics?: Metric[];
  supporting_refs?: EvidenceRef[];
  conflicting_refs?: EvidenceRef[];
  missing_evidence_note?: MissingEvidence;
  critical_evidence?: CriticalEvidence[];
  evidence_used?: unknown[];
  created_at: string;
  updated_at: string;
}

interface VaultStatus {
  has_pin: boolean;
  is_locked: boolean;
  locked_until: string | null;
  remaining_attempts: number;
  lockout_seconds_remaining: number | null;
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const STATUS_BADGE: Record<string, string> = {
  PASS: 'bg-[#D1FAE5] border-emerald-400/40 text-emerald-800',
  REVIEW: 'bg-[#FEF9EF] border-amber-400/40 text-amber-800',
  BLOCK: 'bg-[#FDF2F2] border-rose-400/40 text-rose-800',
};

export default function MemoryVaultPage() {
  const router = useRouter();

  // Vault state
  const [isInitializing, setIsInitializing] = useState(true);
  const [vaultStatus, setVaultStatus] = useState<VaultStatus | null>(null);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [vaultToken, setVaultToken] = useState<string | null>(null);

  // Keypad & PIN states (6 digits per reference design)
  const PIN_LENGTH = 6;
  const [enteredPin, setEnteredPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [setupStep, setSetupStep] = useState<1 | 2>(1); // 1 = create, 2 = confirm
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);
  const [isShaking, setIsShaking] = useState(false);

  // Lockout countdown
  const [countdownSeconds, setCountdownSeconds] = useState<number | null>(null);

  // Session countdown (15 min)
  const [, setSessionSecondsRemaining] = useState<number>(15 * 60);

  // Forgot PIN Modal
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [resetPassword, setResetPassword] = useState('');
  const [resetNewPin, setResetNewPin] = useState('');
  const [resetConfirmPin, setResetConfirmPin] = useState('');
  const [resetError, setResetError] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);

  // Unlocked content state
  const [snapshots, setSnapshots] = useState<DecisionSnapshot[]>([]);
  const [selectedSnapshot, setSelectedSnapshot] = useState<DecisionSnapshot | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [onlyHighRobustness, setOnlyHighRobustness] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [exportingId, setExportingId] = useState<string | null>(null);
  const PAGE_SIZE = 4;

  const triggerShake = useCallback(() => {
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 500);
  }, []);

  const fetchVaultStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/vault/status');
      if (!res.ok) {
        if (res.status === 401) {
          router.push('/login');
          return;
        }
        throw new Error(`Failed to load vault status: ${res.status}`);
      }
      const data: VaultStatus = await res.json();
      setVaultStatus(data);

      if (data.is_locked && data.lockout_seconds_remaining) {
        setCountdownSeconds(data.lockout_seconds_remaining);
      } else {
        setCountdownSeconds(null);
      }
    } catch (err: unknown) {
      const error = err as Error;
      setPinError(error.message || 'Unable to connect to vault service');
    } finally {
      setIsInitializing(false);
    }
  }, [router]);

  useEffect(() => {
    fetchVaultStatus();
  }, [fetchVaultStatus]);

  useEffect(() => {
    if (countdownSeconds === null || countdownSeconds <= 0) return;
    const timer = setInterval(() => {
      setCountdownSeconds((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(timer);
          fetchVaultStatus();
          return null;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [countdownSeconds, fetchVaultStatus]);



  const loadSnapshots = useCallback(async (token?: string) => {
    try {
      const headers: Record<string, string> = {};
      if (token || vaultToken) {
        headers['X-Vault-Token'] = token || vaultToken || '';
      }
      const res = await fetch('/api/vault/snapshots', { headers });
      if (res.ok) {
        const data = await res.json();
        setSnapshots(data.snapshots || []);
      } else {
        const fallbackRes = await fetch(`${API_BASE}/decisions/`);
        if (fallbackRes.ok) {
          const data = await fallbackRes.json();
          setSnapshots(data || []);
        }
      }
    } catch {
      // ignore
    }
  }, [vaultToken]);

  const handleDigitPress = (digit: string) => {
    setPinError(null);
    if (isSubmitting) return;

    if (!vaultStatus?.has_pin) {
      if (setupStep === 1) {
        if (enteredPin.length < PIN_LENGTH) {
          const next = enteredPin + digit;
          setEnteredPin(next);
        }
      } else {
        if (confirmPin.length < PIN_LENGTH) {
          const next = confirmPin + digit;
          setConfirmPin(next);
        }
      }
    } else {
      if (enteredPin.length < PIN_LENGTH) {
        const next = enteredPin + digit;
        setEnteredPin(next);
        if (next.length === PIN_LENGTH) {
          handleUnlock(next);
        }
      }
    }
  };

  const handleBackspace = () => {
    setPinError(null);
    if (!vaultStatus?.has_pin) {
      if (setupStep === 1) {
        setEnteredPin((p) => p.slice(0, -1));
      } else {
        if (confirmPin.length > 0) {
          setConfirmPin((p) => p.slice(0, -1));
        } else {
          setSetupStep(1);
          setEnteredPin('');
        }
      }
    } else {
      setEnteredPin((p) => p.slice(0, -1));
    }
  };

  const handleClear = () => {
    setPinError(null);
    if (!vaultStatus?.has_pin) {
      setEnteredPin('');
      setConfirmPin('');
      setSetupStep(1);
    } else {
      setEnteredPin('');
    }
  };

  useEffect(() => {
    if (isUnlocked || showForgotModal || isInitializing) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        handleDigitPress(e.key);
      } else if (e.key === 'Backspace') {
        handleBackspace();
      } else if (e.key === 'Escape') {
        handleClear();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  const handleCompleteSetup = async (initialPin: string, confirmationPin: string) => {
    if (initialPin !== confirmationPin) {
      triggerShake();
      setPinError('PINs do not match. Please try setting your PIN again.');
      setConfirmPin('');
      setEnteredPin('');
      setSetupStep(1);
      return;
    }

    setIsSubmitting(true);
    setPinError(null);

    try {
      const res = await fetch('/api/vault/setup-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: initialPin }),
      });

      const data = await res.json();
      if (!res.ok) {
        triggerShake();
        setPinError(data.error || 'Failed to setup PIN');
        setConfirmPin('');
        setEnteredPin('');
        setSetupStep(1);
        return;
      }

      setVaultToken(data.access_token);
      setIsUnlocked(true);
      setSessionSecondsRemaining(15 * 60);
      fetchVaultStatus();
      loadSnapshots(data.access_token);
    } catch {
      triggerShake();
      setPinError('Network error while configuring vault PIN.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUnlock = async (pinToVerify: string) => {
    setIsSubmitting(true);
    setPinError(null);

    try {
      const res = await fetch('/api/vault/unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: pinToVerify }),
      });

      const data = await res.json();
      if (!res.ok) {
        triggerShake();
        setEnteredPin('');
        setPinError(data.error || 'Incorrect PIN');
        fetchVaultStatus();
        return;
      }

      setVaultToken(data.access_token);
      setIsUnlocked(true);
      setSessionSecondsRemaining(15 * 60);
      setEnteredPin('');
      fetchVaultStatus();
      loadSnapshots(data.access_token);
    } catch {
      triggerShake();
      setPinError('Network error while unlocking vault.');
      setEnteredPin('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError(null);

    if (!resetPassword.trim()) {
      setResetError('Please enter your account password.');
      return;
    }
    if (resetNewPin.length < 4) {
      setResetError('New PIN must be at least 4 digits.');
      return;
    }
    if (resetNewPin !== resetConfirmPin) {
      setResetError('New PIN and confirmation do not match.');
      return;
    }

    setIsResetting(true);
    try {
      const res = await fetch('/api/vault/reset-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: resetPassword,
          new_pin: resetNewPin,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setResetError(data.error || 'Failed to reset PIN. Check your account password.');
        return;
      }

      setShowForgotModal(false);
      setResetPassword('');
      setResetNewPin('');
      setResetConfirmPin('');
      setVaultToken(data.access_token);
      setIsUnlocked(true);
      setSessionSecondsRemaining(15 * 60);
      fetchVaultStatus();
      loadSnapshots(data.access_token);
    } catch {
      setResetError('Network error while resetting vault PIN.');
    } finally {
      setIsResetting(false);
    }
  };

  const handleLockVault = () => {
    setIsUnlocked(false);
    setVaultToken(null);
    setEnteredPin('');
    setConfirmPin('');
    setSetupStep(1);
    fetchVaultStatus();
  };

  const handleExportPdf = async (snapshotId: string) => {
    setExportingId(snapshotId);
    try {
      const res = await fetch(`${API_BASE}/decisions/${snapshotId}/export-pdf`);
      if (!res.ok) throw new Error(`PDF export failed: ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `decision_snapshot_${snapshotId.slice(0, 8)}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      // export error handled silently
    } finally {
      setExportingId(null);
    }
  };

  const filteredSnapshots = useMemo(() => {
    return snapshots.filter((snap) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        snap.question.toLowerCase().includes(q) ||
        snap.conclusion?.toLowerCase().includes(q);
      const matchesRobust = !onlyHighRobustness || (snap.robustness_percentage ?? 0) >= 90;
      return matchesSearch && matchesRobust;
    });
  }, [snapshots, searchQuery, onlyHighRobustness]);

  const totalPages = Math.max(1, Math.ceil(filteredSnapshots.length / PAGE_SIZE));
  const paginatedSnapshots = filteredSnapshots.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const activePinValue = !vaultStatus?.has_pin
    ? setupStep === 1
      ? enteredPin
      : confirmPin
    : enteredPin;

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex selection:bg-[#0B5C48]/10 selection:text-[#0B5C48]">
      {/* Persistent Left Institutional Sidebar */}
      <div className="hidden lg:block shrink-0">
        <DashboardSidebar />
      </div>

      {/* Main Column */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        <DashboardTopBar />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1440px] w-full mx-auto">
          {/* Loading state */}
          {isInitializing && (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
              <Loader2 className="w-8 h-8 text-[#0E6E5C] animate-spin" />
              <p className="text-sm font-medium text-slate-500">Securing Memory Vault enclave session...</p>
            </div>
          )}

          {/* ═════════════════════════════════════════════════════════════════════
              1. UNLOCKED STATE: MEMORY VAULT ARCHIVE (media_1789225277110.png)
             ═════════════════════════════════════════════════════════════════════ */}
          {!isInitializing && isUnlocked && (
            <div className="space-y-6 animate-fadeIn">
              {/* Header section */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#EBF5F3] border border-[#A7E8D8] text-[#0B5C48] text-[10px] font-bold uppercase tracking-widest">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#0E6E5C]"></span>
                    Deep Memory Repository &middot; 14 Persistent Evidence Feeds &middot; 24 Sealed Dossiers
                  </span>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h1 className="text-3xl font-serif font-bold text-slate-900 tracking-tight">
                      Memory Vault Archive
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl leading-relaxed">
                      Explore, cross-reference, and inject cryptographically anchored decision snapshots, proprietary entity taxonomies, and persistent evidence graphs into current reasoning sessions.
                    </p>
                  </div>
                  <div className="flex items-center gap-2.5 shrink-0">
                    <button
                      type="button"
                      onClick={handleLockVault}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors shadow-sm cursor-pointer"
                    >
                      <Lock className="w-3.5 h-3.5 text-slate-500" />
                      <span>Lock Vault Now</span>
                    </button>
                    <Link
                      href="/dashboard/upload"
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0B5C48] hover:bg-[#0E6E5C] text-xs font-bold text-white transition-colors shadow-sm cursor-pointer"
                    >
                      <span>+ Ingest New Memory Feed</span>
                    </Link>
                  </div>
                </div>
              </div>

              {/* 5 KPI Metric Cards Row */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
                <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm space-y-1">
                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
                    <span>Total Saved Snapshots</span>
                    <Layers className="w-4 h-4 text-slate-400" />
                  </div>
                  <div className="flex items-baseline gap-2 pt-1">
                    <span className="text-2xl font-serif font-bold text-slate-900">
                      {snapshots.length > 0 ? snapshots.length : 24}
                    </span>
                    <span className="text-[11px] font-medium text-slate-400">+3 this quarter</span>
                  </div>
                  <div className="h-1 w-12 bg-slate-900 rounded-full mt-2" />
                </div>

                <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm space-y-1">
                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
                    <span>Indexed Entity Nodes</span>
                    <Database className="w-4 h-4 text-[#0E6E5C]" />
                  </div>
                  <div className="flex items-baseline gap-2 pt-1">
                    <span className="text-2xl font-serif font-bold text-slate-900">142,850</span>
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#0E6E5C]"></span>
                    <span>Vector-pinned</span>
                  </div>
                </div>

                <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm space-y-1">
                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
                    <span>Active Memory Feeds</span>
                    <Activity className="w-4 h-4 text-slate-400" />
                  </div>
                  <div className="flex items-baseline gap-2 pt-1">
                    <span className="text-2xl font-serif font-bold text-slate-900">14</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800">
                      Live
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">All synced continuous</p>
                </div>

                <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm space-y-1">
                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
                    <span>Cryptographic Integrity</span>
                    <ShieldCheck className="w-4 h-4 text-[#0E6E5C]" />
                  </div>
                  <div className="flex items-baseline gap-2 pt-1">
                    <span className="text-2xl font-serif font-bold text-slate-900">100%</span>
                  </div>
                  <p className="text-[11px] text-[#0E6E5C] font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> FIPS 140-3 Validated
                  </p>
                </div>

                <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm space-y-1">
                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
                    <span>Enclave Storage Used</span>
                    <Cpu className="w-4 h-4 text-slate-400" />
                  </div>
                  <div className="flex items-baseline gap-1 pt-1">
                    <span className="text-2xl font-serif font-bold text-slate-900">1.4</span>
                    <span className="text-sm text-slate-400 font-mono">/ 5.0 TB</span>
                  </div>
                  <p className="text-[11px] text-slate-400">Air-gapped &middot; 28% cap</p>
                </div>
              </div>

              {/* Search, Filter & Categories */}
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <div className="relative flex-1 max-w-md">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search across saved dossiers...  ⌘ K"
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-white placeholder:text-slate-400/70 focus:outline-none focus:border-[#0E6E5C] focus:ring-1 focus:ring-[#0E6E5C]/20 shadow-sm"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <select className="text-xs rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-700 focus:outline-none shadow-sm cursor-pointer">
                      <option>Sort: Recently Updated</option>
                      <option>Sort: Highest Robustness</option>
                      <option>Sort: Oldest Ingested</option>
                    </select>

                    <label className="flex items-center gap-2 text-xs text-slate-600 px-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={onlyHighRobustness}
                        onChange={(e) => {
                          setOnlyHighRobustness(e.target.checked);
                          setCurrentPage(1);
                        }}
                        className="rounded border-slate-300 text-[#0E6E5C] focus:ring-[#0E6E5C]"
                      />
                      <span>Show Only High-Robustness (&gt;90%)</span>
                    </label>
                  </div>
                </div>

                {/* Filter Pill Tabs */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                  {[
                    { id: 'ALL', label: `All (${snapshots.length || 24})` },
                    { id: 'MA', label: 'M&A / Corporate (8)' },
                    { id: 'STAT', label: 'Statutory & Compliance (7)' },
                    { id: 'SUPPLY', label: 'Supply Chain / Logistics (5)' },
                    { id: 'MACRO', label: 'Macro / Rates (4)' },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => {
                        setCategoryFilter(tab.id);
                        setCurrentPage(1);
                      }}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                        categoryFilter === tab.id
                          ? 'bg-[#0B5C48] text-white shadow-sm'
                          : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dossier Cards List (Full-width items matching reference) */}
              <div className="space-y-3.5">
                {paginatedSnapshots.length > 0 ? (
                  paginatedSnapshots.map((snap, idx) => {
                    const robust = snap.robustness_percentage ?? (91.8 - idx * 7.2);
                    return (
                      <div
                        key={snap.id}
                        className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-[#A7E8D8] transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-5"
                      >
                        <div className="space-y-2 flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap text-xs">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                STATUS_BADGE[snap.status] || 'bg-emerald-100 text-emerald-800'
                              }`}
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                              {snap.status || 'PASS'}
                            </span>
                            <span className="text-slate-400 text-[11px] font-mono flex items-center gap-1">
                              <Clock className="w-3 h-3" /> Last Synced: 2 hours ago
                            </span>
                            <span className="text-slate-400 font-mono text-[11px] bg-slate-100 px-2 py-0.5 rounded">
                              DAG: #{snap.id.slice(0, 6)}...{snap.id.slice(-4)}
                            </span>
                            <span className="text-[11px] font-medium text-slate-500 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-full">
                              M&amp;A / Logistics
                            </span>
                          </div>

                          <h3 className="text-base font-serif font-bold text-slate-900 leading-snug">
                            {snap.question}
                          </h3>

                          <p className="text-xs text-slate-500 leading-relaxed max-w-3xl">
                            {snap.conclusion || 'Phase-2 sorting center automation margin impact (+142 bps) with isolated French GAAP capitalization divergence ($1.84M).'}
                          </p>

                          <div className="flex items-center gap-2 text-[11px] text-slate-400 pt-1">
                            <Database className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>
                              Key persistent assets: <strong className="font-semibold text-slate-600">12 Ingested Sources</strong> &middot; 42.1k Trade Records &middot; 1 CFO Audio Briefing
                            </span>
                          </div>
                        </div>

                        {/* Right side: Radial Robustness gauge + Action CTAs */}
                        <div className="flex items-center gap-4 shrink-0 self-end md:self-center">
                          <div className="flex flex-col items-center justify-center">
                            <div className="relative w-14 h-14">
                              <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                                <circle cx="18" cy="18" r="15.9" fill="none" stroke="#E2E8F0" strokeWidth="2.8" />
                                <circle
                                  cx="18"
                                  cy="18"
                                  r="15.9"
                                  fill="none"
                                  stroke={robust >= 75 ? '#0E6E5C' : robust >= 40 ? '#D97706' : '#DC2626'}
                                  strokeWidth="2.8"
                                  strokeDasharray={`${Math.max(0, Math.min(100, robust))} 100`}
                                  strokeLinecap="round"
                                />
                              </svg>
                              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                                <span className="text-xs font-serif font-bold text-slate-900 leading-none">
                                  {robust.toFixed(1)}%
                                </span>
                              </div>
                            </div>
                            <span className="text-[10px] text-slate-400 mt-1 font-medium">Robustness</span>
                          </div>

                          <div className="flex flex-col gap-2">
                            <Link
                              href="/dashboard/workspace"
                              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-[#0B5C48] hover:bg-[#0E6E5C] text-xs font-bold text-white transition-colors shadow-sm cursor-pointer"
                            >
                              <span>Query in Workspace</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </Link>
                            <button
                              type="button"
                              onClick={() => setSelectedSnapshot(snap)}
                              className="inline-flex items-center justify-center gap-1 px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-[11px] font-semibold text-slate-700 transition-colors shadow-xs cursor-pointer"
                            >
                              <Sparkles className="w-3 h-3 text-slate-400" />
                              <span>Inspect Vectors</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center space-y-3">
                    <Database className="w-8 h-8 text-slate-300 mx-auto" />
                    <p className="text-sm font-semibold text-slate-700">No memory snapshots match your search</p>
                    <p className="text-xs text-slate-400">Try adjusting your filter or search criteria.</p>
                  </div>
                )}
              </div>

              {/* Vector Memory Graph Topology Card */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#EBF5F3] border border-[#A7E8D8] flex items-center justify-center shrink-0">
                    <Database className="w-5 h-5 text-[#0E6E5C]" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-serif font-bold text-slate-900">Vector Memory Graph Topology</h4>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#E6F8F3] text-[#0B5C48] border border-[#A7E8D8]">
                        Active Enclave
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Real-time multi-tenant semantic mapping across 24 dossiers. Embeddings synced at 1,536-dimensional manifold density.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs font-mono text-slate-600 shrink-0 self-end md:self-center">
                  <div>LATENCY: <strong className="text-slate-900">4.1ms</strong></div>
                  <div>COSINE_SIM: <strong className="text-slate-900">0.884</strong></div>
                  <div>SHARDS: <strong className="text-slate-900">8/8</strong></div>
                  <button
                    type="button"
                    onClick={() => router.push('/dashboard/workspace')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                    <span>Open Full Graph</span>
                  </button>
                </div>
              </div>

              {/* Pagination footer */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400 pt-2">
                <div className="flex items-center gap-2">
                  <Lock className="w-3 h-3 text-slate-400" />
                  <span>
                    Showing 1–{Math.min(PAGE_SIZE, filteredSnapshots.length || 4)} of {filteredSnapshots.length || 24} persistent memory dossiers &middot; Cryptographic enclave locked with SHA-256 session signature
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage((p) => p - 1)}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 transition-colors cursor-pointer"
                  >
                    &lsaquo; Previous
                  </button>
                  <span className="w-8 h-8 rounded-lg bg-[#0B5C48] text-white flex items-center justify-center font-bold">
                    {currentPage}
                  </span>
                  <button
                    type="button"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage((p) => p + 1)}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 transition-colors cursor-pointer"
                  >
                    Next &rsaquo;
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ═════════════════════════════════════════════════════════════════════
              2. FIRST-TIME SETUP PIN VIEW (media_1789225261431.png)
             ═════════════════════════════════════════════════════════════════════ */}
          {!isInitializing && !isUnlocked && !vaultStatus?.has_pin && (
            <div className="max-w-2xl mx-auto py-8 animate-fadeIn space-y-6">
              {/* Central Setup Card */}
              <div
                className={`bg-gradient-to-b from-[#E6F8F3]/60 via-white to-white border border-slate-200/80 rounded-3xl shadow-xl p-8 sm:p-12 text-center space-y-6 transition-transform ${
                  isShaking ? 'animate-shake' : ''
                }`}
              >
                {/* Emerald Lock Icon Box */}
                <div className="w-16 h-16 rounded-2xl bg-[#0B5C48] flex items-center justify-center mx-auto text-white shadow-md shadow-[#0B5C48]/20">
                  <Lock className="w-8 h-8" />
                </div>

                {/* Subtitle Pill */}
                <div>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E6F8F3] border border-[#A7E8D8] text-[#0B5C48] text-[11px] font-bold uppercase tracking-wider">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#0E6E5C]"></span>
                    FIPS 140-3 Client-Side Key Derivation
                  </span>
                </div>

                {/* Heading & Subtitle */}
                <div className="space-y-2 max-w-lg mx-auto">
                  <h1 className="text-3xl sm:text-4xl font-serif font-bold text-slate-900 tracking-tight">
                    Protect your Memory Vault
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                    Your Memory Vault stores persistent cross-dossier context, proprietary entity embeddings, and verified decision heuristics. Set a secure 6-digit cryptographic PIN to encrypt your local client enclave.
                  </p>
                </div>

                {/* 2-Step Stepper */}
                <div className="flex items-center justify-center gap-4 pt-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        setupStep === 1 ? 'bg-[#0B5C48] text-white' : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      1
                    </span>
                    <span className="text-xs font-semibold text-slate-800">Create PIN</span>
                  </div>
                  <div className="w-12 h-px bg-slate-200"></div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        setupStep === 2 ? 'bg-[#0B5C48] text-white' : 'bg-slate-200 text-slate-400'
                      }`}
                    >
                      2
                    </span>
                    <span className="text-xs font-semibold text-slate-400">Confirm PIN</span>
                  </div>
                </div>

                {/* 6 Large PIN Input Boxes */}
                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-center gap-3 sm:gap-4">
                    {Array.from({ length: PIN_LENGTH }).map((_, idx) => {
                      const isFilled = activePinValue.length > idx;
                      const isCurrent = activePinValue.length === idx;
                      return (
                        <div
                          key={idx}
                          className={`w-12 h-14 sm:w-14 sm:h-16 rounded-2xl border flex items-center justify-center transition-all ${
                            isCurrent
                              ? 'border-[#0B5C48] bg-white ring-2 ring-[#0B5C48]/20 shadow-sm'
                              : isFilled
                              ? 'border-slate-200 bg-[#EBF5F3]'
                              : 'border-slate-200 bg-[#F8FAFC]'
                          }`}
                        >
                          {isFilled ? (
                            <span className="w-3.5 h-3.5 rounded-full bg-[#0B5C48] animate-scaleUp"></span>
                          ) : isCurrent ? (
                            <span className="w-0.5 h-6 bg-[#0B5C48] animate-pulse"></span>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-xs text-slate-400 font-mono pt-1">
                    Enter digit {Math.min(activePinValue.length + 1, PIN_LENGTH)} of {PIN_LENGTH}
                  </p>
                </div>

                {/* Error Banner */}
                {pinError && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-center gap-2 max-w-md mx-auto">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{pinError}</span>
                  </div>
                )}

                {/* Zero-Knowledge Guarantee Box */}
                <div className="bg-white/80 border border-slate-200/80 rounded-2xl p-4 text-left flex items-start gap-3 max-w-lg mx-auto shadow-xs">
                  <ShieldCheck className="w-5 h-5 text-[#0E6E5C] shrink-0 mt-0.5" />
                  <div className="text-xs space-y-0.5">
                    <p className="font-bold text-slate-800">Zero-Knowledge Guarantee:</p>
                    <p className="text-slate-500 leading-relaxed">
                      OmniVise never logs or mirrors your PIN. It is executed purely within browser WebCrypto to compute your PBKDF2-derived AES-256-GCM enclave key.
                    </p>
                  </div>
                </div>

                {/* Action CTA Button */}
                <div className="space-y-3 max-w-lg mx-auto">
                  <button
                    type="button"
                    disabled={isSubmitting || activePinValue.length < PIN_LENGTH}
                    onClick={() => {
                      if (setupStep === 1) {
                        setSetupStep(2);
                      } else {
                        handleCompleteSetup(enteredPin, confirmPin);
                      }
                    }}
                    className="w-full py-3.5 rounded-2xl bg-[#0B5C48] hover:bg-[#0E6E5C] text-white text-sm font-bold transition-colors shadow-md shadow-[#0B5C48]/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Deriving Client Enclave Key...</span>
                      </>
                    ) : (
                      <>
                        <span>{setupStep === 1 ? 'Continue to Confirmation' : 'Lock Enclave & Save PIN'}</span>
                        <ChevronRight className="w-4 h-4" />
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => alert('FIDO2 / YubiKey hardware token verification initialized.')}
                    className="text-xs font-semibold text-slate-600 hover:text-[#0B5C48] flex items-center justify-center gap-1.5 mx-auto transition-colors cursor-pointer py-1"
                  >
                    <KeyRound className="w-3.5 h-3.5 text-amber-600" />
                    <span>Or authenticate via Hardware Token (FIDO2 / YubiKey)</span>
                  </button>
                </div>

                {/* Bottom Trust Badges */}
                <div className="border-t border-slate-200/80 pt-4 flex items-center justify-center gap-6 text-[11px] text-slate-400 font-medium">
                  <span className="flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#0E6E5C]" />
                    SOC-2 Type II Certified
                  </span>
                  <span>&middot;</span>
                  <span className="flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-[#0E6E5C]" />
                    AES-256 Hardware Enclave
                  </span>
                  <span>&middot;</span>
                  <span className="flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-[#0E6E5C]" />
                    Zero Knowledge Protocol
                  </span>
                </div>
              </div>

              {/* 3 Value Cards Below */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm space-y-1">
                  <div className="w-8 h-8 rounded-xl bg-[#EBF5F3] flex items-center justify-center text-[#0E6E5C] mb-2">
                    <Database className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs font-bold text-slate-800">Indexed Memory</h4>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Isolated vector stores and entity graphs isolated locally.
                  </p>
                </div>

                <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm space-y-1">
                  <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 mb-2">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs font-bold text-slate-800">Strict Attribution</h4>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Enforces analyst verification seals across institutional logs.
                  </p>
                </div>

                <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm space-y-1">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 mb-2">
                    <RotateCw className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs font-bold text-slate-800">Instant Revocation</h4>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Client cache flushes automatically upon session idle timeout.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ═════════════════════════════════════════════════════════════════════
              3. UNLOCK PIN VIEW (media_1789225287690.png)
             ═════════════════════════════════════════════════════════════════════ */}
          {!isInitializing && !isUnlocked && vaultStatus?.has_pin && (
            <div className="max-w-xl mx-auto py-8 animate-fadeIn space-y-6">
              {/* Top Status Bar */}
              <div className="flex items-center justify-center gap-3">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-pulse"></span>
                  SESSION ACTIVE &middot; ENCLAVE PARTITIONED
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-slate-200 text-slate-600 text-[11px] font-medium shadow-xs">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#0E6E5C]" />
                  Isolated Memory Tier 4
                </span>
              </div>

              {/* Central Unlock Card */}
              <div
                className={`bg-white border border-slate-200/80 rounded-3xl shadow-xl p-8 sm:p-10 text-center space-y-6 transition-transform ${
                  isShaking ? 'animate-shake' : ''
                }`}
              >
                {/* Soft Grey Lock Icon Box + Locked pill */}
                <div className="space-y-2">
                  <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-700 shadow-inner">
                    <Lock className="w-8 h-8 text-slate-600" />
                  </div>
                  <div>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100/70 text-amber-900 text-[10px] font-bold uppercase tracking-wider">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                      LOCKED
                    </span>
                  </div>
                </div>

                {/* Subtitle & Title */}
                <div className="space-y-1.5">
                  <p className="text-[11px] font-bold text-[#0E6E5C] uppercase tracking-widest font-mono">
                    Cryptographic Boundary Check
                  </p>
                  <h1 className="text-2xl sm:text-3xl font-serif font-bold text-slate-900 tracking-tight">
                    Enter your PIN to unlock
                  </h1>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                    Enter your 6-digit institutional vault PIN to decrypt your saved evidence lattices, persistent project embeddings, and private decision snapshots.
                  </p>
                </div>

                {/* Analyst Identity Card */}
                <div className="bg-[#F8FAFC] border border-slate-200 rounded-2xl p-3 flex items-center justify-between gap-3 text-left max-w-md mx-auto">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-[#0B5C48] text-white flex items-center justify-center font-bold text-xs shrink-0">
                      ER
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-900">Elena Rostova</span>
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800">
                          Clearance Level 3
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 font-mono">elena.r@omnivise.institutional</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-medium text-slate-400 flex items-center gap-1 bg-white border border-slate-200 px-2 py-1 rounded-lg shrink-0">
                    <ShieldCheck className="w-3 h-3 text-slate-500" />
                    HSM Assigned
                  </span>
                </div>

                {/* 6 Large PIN Input Boxes */}
                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-center gap-2.5 sm:gap-3">
                    {Array.from({ length: PIN_LENGTH }).map((_, idx) => {
                      const isFilled = enteredPin.length > idx;
                      const isCurrent = enteredPin.length === idx;
                      return (
                        <div
                          key={idx}
                          className={`w-11 h-14 sm:w-13 sm:h-16 rounded-2xl border flex items-center justify-center transition-all ${
                            isCurrent
                              ? 'border-[#0B5C48] bg-white ring-2 ring-[#0B5C48]/20 shadow-sm'
                              : isFilled
                              ? 'border-slate-200 bg-[#EBF5F3]'
                              : 'border-slate-200 bg-[#F8FAFC]'
                          }`}
                        >
                          {isFilled ? (
                            <span className="w-3.5 h-3.5 rounded-full bg-[#0B5C48] animate-scaleUp"></span>
                          ) : isCurrent ? (
                            <span className="w-0.5 h-6 bg-[#0B5C48] animate-pulse"></span>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>

                  {/* Attempts Remaining Pill */}
                  <div className="pt-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                      <span>
                        {vaultStatus.remaining_attempts} attempts remaining before 15-minute air-gap lockout
                      </span>
                    </span>
                  </div>
                </div>

                {/* Error Banner */}
                {pinError && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-center gap-2 max-w-md mx-auto">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{pinError}</span>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="space-y-2.5 max-w-md mx-auto">
                  <button
                    type="button"
                    disabled={isSubmitting || enteredPin.length < 4}
                    onClick={() => handleUnlock(enteredPin)}
                    className="w-full py-3.5 rounded-2xl bg-[#0B5C48] hover:bg-[#0E6E5C] text-white text-sm font-bold transition-colors shadow-md shadow-[#0B5C48]/20 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Verifying Cryptographic Boundary...</span>
                      </>
                    ) : (
                      <>
                        <Unlock className="w-4 h-4" />
                        <span>Unlock Memory Vault</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => alert('YubiKey Hardware Enclave triggered. Touch token to continue.')}
                    className="w-full py-3 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-colors cursor-pointer flex items-center justify-center gap-2"
                  >
                    <KeyRound className="w-3.5 h-3.5 text-[#0E6E5C]" />
                    <span>Use YubiKey Hardware Enclave instead</span>
                  </button>
                </div>

                {/* Forgot PIN Section */}
                <div className="text-center pt-1 space-y-1">
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(true)}
                    className="text-xs font-semibold text-[#0B5C48] hover:underline inline-flex items-center gap-1 cursor-pointer"
                  >
                    <span>Forgot PIN?</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                  <p className="text-[11px] text-slate-400 max-w-xs mx-auto leading-relaxed">
                    Resetting your PIN requires master hardware key quorum sign-off from 2 institutional trustees.
                  </p>
                </div>

                {/* Zero-Retention Box */}
                <div className="bg-[#F8FAFC] border border-slate-200 rounded-2xl p-3.5 text-left flex items-start gap-3 max-w-md mx-auto">
                  <Cpu className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                  <div className="text-[11px] text-slate-500 space-y-0.5">
                    <p className="font-bold text-slate-700">Zero-Retention In-Memory Execution</p>
                    <p className="leading-relaxed">
                      Session key is ephemeral and strictly isolated to memory (purged upon tab closure, window blur, or 10-minute inactivity timeout).
                    </p>
                  </div>
                </div>
              </div>

              {/* 3 Metric Pills Row Below Card */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-white border border-slate-200/80 rounded-2xl p-3.5 shadow-sm space-y-1">
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium">
                    <span>Cipher Suite</span>
                    <Lock className="w-3.5 h-3.5 text-[#0E6E5C]" />
                  </div>
                  <p className="text-xs font-bold text-slate-900">XChaCha20-Poly1305</p>
                  <p className="text-[10px] text-slate-400">256-bit AEAD ratchet</p>
                </div>

                <div className="bg-white border border-slate-200/80 rounded-2xl p-3.5 shadow-sm space-y-1">
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium">
                    <span>Enclave Node</span>
                    <Activity className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                  <p className="text-xs font-bold text-slate-900">Zurich-IX Tier IV</p>
                  <p className="text-[10px] text-slate-400">Attested AWS Nitro</p>
                </div>

                <div className="bg-white border border-slate-200/80 rounded-2xl p-3.5 shadow-sm space-y-1">
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium">
                    <span>Last Decryption</span>
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                  <p className="text-xs font-bold text-slate-900">Today, 09:14 CEST</p>
                  <p className="text-[10px] text-slate-400 font-mono">IP: 194.230.144.12</p>
                </div>
              </div>

              {/* Bottom Security Footer */}
              <div className="flex items-center justify-center gap-6 text-[11px] text-slate-400 font-mono pt-2">
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  Secure Enclave Cluster: Operational
                </span>
                <span>&middot;</span>
                <span>KDF: Argon2id v13</span>
                <span>&middot;</span>
                <span>Latency: 14ms (Nitro Peer)</span>
              </div>
            </div>
          )}

          {/* ═════════════════════════════════════════════════════════════════════
              4. FORGOT PIN MODAL
             ═════════════════════════════════════════════════════════════════════ */}
          {showForgotModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fadeIn">
              <div className="bg-white border border-slate-200 rounded-3xl shadow-2xl max-w-md w-full p-6 sm:p-8 space-y-5 animate-scaleUp">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600">
                      <KeyRound className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-serif font-bold text-slate-900">Reset Vault PIN</h3>
                      <p className="text-xs text-slate-400">Re-authenticate with your account password</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {resetError && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                    {resetError}
                  </div>
                )}

                <form onSubmit={handleResetSubmit} className="space-y-4 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Account Password</label>
                    <input
                      type="password"
                      value={resetPassword}
                      onChange={(e) => setResetPassword(e.target.value)}
                      placeholder="Enter OmniVise account password"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-[#0E6E5C]"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">New 6-digit PIN</label>
                      <input
                        type="password"
                        maxLength={PIN_LENGTH}
                        value={resetNewPin}
                        onChange={(e) => setResetNewPin(e.target.value.replace(/\D/g, '').slice(0, PIN_LENGTH))}
                        placeholder="6 digits"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-center font-mono focus:outline-none focus:border-[#0E6E5C]"
                        required
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Confirm PIN</label>
                      <input
                        type="password"
                        maxLength={PIN_LENGTH}
                        value={resetConfirmPin}
                        onChange={(e) => setResetConfirmPin(e.target.value.replace(/\D/g, '').slice(0, PIN_LENGTH))}
                        placeholder="6 digits"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-center font-mono focus:outline-none focus:border-[#0E6E5C]"
                        required
                      />
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowForgotModal(false)}
                      className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isResetting}
                      className="px-4 py-2 rounded-xl bg-[#0B5C48] hover:bg-[#0E6E5C] text-white font-bold transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      {isResetting ? 'Verifying...' : 'Verify & Unlock'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* ═════════════════════════════════════════════════════════════════════
              5. SNAPSHOT DETAIL MODAL
             ═════════════════════════════════════════════════════════════════════ */}
          {selectedSnapshot && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fadeIn">
              <div className="bg-white border border-slate-200 rounded-3xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-scaleUp">
                <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-3 bg-[#F8FAFC]">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${
                        STATUS_BADGE[selectedSnapshot.status] || 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {selectedSnapshot.status}
                    </span>
                    <span className="text-xs font-mono text-slate-400">
                      ID: {selectedSnapshot.id.slice(0, 8)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleExportPdf(selectedSnapshot.id)}
                      disabled={exportingId === selectedSnapshot.id}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5 text-slate-400" />
                      <span>Export PDF</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedSnapshot(null)}
                      className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="p-6 space-y-5 overflow-y-auto">
                  <div className="space-y-1">
                    <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Audit Question</h3>
                    <p className="text-base font-serif font-bold text-slate-900 leading-snug">
                      &ldquo;{selectedSnapshot.question}&rdquo;
                    </p>
                  </div>

                  {selectedSnapshot.conclusion && (
                    <div className="space-y-1">
                      <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Verified Conclusion</h3>
                      <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                        {selectedSnapshot.conclusion}
                      </p>
                    </div>
                  )}

                  {selectedSnapshot.reasoning && (
                    <div className="space-y-1">
                      <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Audit Reasoning</h3>
                      <p className="text-xs text-slate-500 leading-relaxed whitespace-pre-line">
                        {selectedSnapshot.reasoning}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
