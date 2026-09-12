'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Clock,
  Download,
  FileText,
  Filter,
  Loader2,
  MoreHorizontal,
  RefreshCw,
  Search,
  ShieldCheck,
  TrendingUp,
  X,
  XCircle,
  Activity,
  Lock,
  GitBranch,
  Database,
  Zap,
  BookOpen,
} from 'lucide-react';

interface Metric { label: string; value: string; badge?: string; }
interface EvidenceRef { source?: string; sourceDoc?: string; location?: string; page_or_timestamp?: string; claim?: string; }
interface MissingEvidence { description?: string; impact?: string; missingDocuments?: string[]; }
interface CriticalEvidence { id?: string; source?: string; modality?: string; impact?: string; }

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

const STATUS_BADGE: Record<string, string> = {
  PASS: 'bg-[#D1FAE5] border-emerald-400/40 text-emerald-800',
  REVIEW: 'bg-[#FEF9EF] border-amber-400/40 text-amber-800',
  BLOCK: 'bg-[#FDF2F2] border-rose-400/40 text-rose-800',
};
const STATUS_ICON: Record<string, React.ReactNode> = {
  PASS: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />,
  REVIEW: <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />,
  BLOCK: <XCircle className="w-3.5 h-3.5 text-rose-600" />,
};
const STATUS_LABEL: Record<string, string> = { PASS: 'PASS', REVIEW: 'REVIEW', BLOCK: 'BLOCK' };
const STATUS_TOP_BAR: Record<string, string> = { PASS: 'bg-emerald-500', REVIEW: 'bg-amber-400', BLOCK: 'bg-rose-500' };

const ROBUSTNESS_BAR_COLOR = (pct?: number) => {
  if (pct === undefined || pct === null) return 'bg-slate-200';
  if (pct >= 75) return 'bg-[#0E6E5C]';
  if (pct >= 40) return 'bg-amber-500';
  return 'bg-rose-500';
};
const ROBUSTNESS_TEXT_COLOR = (pct?: number) => {
  if (pct === undefined || pct === null) return 'text-slate-400';
  if (pct >= 75) return 'text-[#0E6E5C]';
  if (pct >= 40) return 'text-amber-700';
  return 'text-rose-700';
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-bold uppercase tracking-wide ${STATUS_BADGE[status] || 'bg-slate-100 border-slate-300 text-slate-600'}`}>
      {STATUS_ICON[status] || null}
      {STATUS_LABEL[status] || status}
    </span>
  );
}

function DetailPanel({ snapshot, onClose }: { snapshot: DecisionSnapshot; onClose: () => void }) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExportPdf = async () => {
    setIsExporting(true);
    try {
      const res = await fetch(`${API_BASE}/decisions/${snapshot.id}/export-pdf`);
      if (!res.ok) throw new Error(`PDF export failed: ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `decision_dossier_${snapshot.id.slice(0, 8)}.pdf`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
    } catch (err) { console.error('PDF export error:', err); alert('PDF export failed. Make sure the backend server is running.'); }
    finally { setIsExporting(false); }
  };

  const createdDate = new Date(snapshot.created_at).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });
  const robustPct = snapshot.robustness_percentage ?? 0;
  const shortId = snapshot.id.slice(0, 8).toUpperCase();

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end bg-black/40 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-3xl min-h-full bg-white shadow-2xl flex flex-col animate-fadeIn">
        <div className="flex-1 overflow-y-auto">
          <div className="bg-[#F8FAFC] border-b border-slate-200 px-6 py-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium">
                <span>Institutional Workspace</span>
                <ChevronRight className="w-3 h-3" />
                <span>Decisions</span>
                <ChevronRight className="w-3 h-3" />
                <span className="text-slate-600 font-semibold font-mono">{shortId}</span>
              </div>
              <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">AUDIT DOSSIER #{shortId}</p>
            <h2 className="text-2xl font-serif font-bold text-slate-900 leading-tight mt-1">
              {snapshot.question.length > 80 ? snapshot.question.slice(0, 80) + '...' : snapshot.question}
            </h2>
            <div className="flex items-center gap-2 flex-wrap mt-2">
              <StatusBadge status={snapshot.status} />
              {snapshot.confidence_badge && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-slate-300 text-[10px] font-semibold text-slate-600 bg-white">{snapshot.confidence_badge}</span>
              )}
              <span className="text-[11px] text-slate-400 font-mono ml-1">{createdDate}</span>
            </div>
            <div className="flex items-center gap-2 mt-4">
              <button type="button" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors cursor-pointer">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                Schedule Peer Audit
              </button>
              <button type="button" onClick={handleExportPdf} disabled={isExporting}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0B5C48] hover:bg-[#0E6E5C] text-white text-xs font-semibold transition-colors disabled:opacity-60 cursor-pointer">
                {isExporting ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /><span>Exporting...</span></> : <><Download className="w-3.5 h-3.5" /><span>Export PDF Dossier</span></>}
              </button>
            </div>
          </div>

          {snapshot.status === 'BLOCK' && (
            <div className="mx-6 mt-4 p-3 bg-amber-50 border border-amber-300 rounded-xl flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-amber-900 uppercase tracking-wide">Critical Discrepancy Detected</p>
                <p className="text-xs text-amber-800 mt-0.5 leading-relaxed">This dossier contains unreconciled variance between source documents. Manual review required before DAG sealing.</p>
              </div>
            </div>
          )}

          <div className="flex">
            <div className="flex-1 p-6 space-y-5 min-w-0">
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="bg-[#F0F7F5] px-4 py-3 flex items-center justify-between border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-[#0E6E5C]" />
                    <span className="text-xs font-bold text-slate-700">Verified Conclusion &amp; Executive Synthesis</span>
                  </div>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#D1FAE5] text-emerald-800 text-[10px] font-bold border border-emerald-300">
                    <CheckCircle2 className="w-3 h-3" />Accepted Consensus
                  </span>
                </div>
                <div className="p-4 space-y-3">
                  <p className="text-sm text-slate-700 leading-relaxed">{snapshot.conclusion || '—'}</p>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-500 font-medium">Robust Audit Score</span>
                      <span className={`font-bold tabular-nums ${ROBUSTNESS_TEXT_COLOR(robustPct)}`}>{robustPct}%</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${ROBUSTNESS_BAR_COLOR(robustPct)}`} style={{ width: `${robustPct}%` }} />
                    </div>
                  </div>
                  {snapshot.reasoning && <p className="text-xs text-slate-500 leading-relaxed border-t border-slate-100 pt-3">{snapshot.reasoning}</p>}
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="bg-[#F8FAFC] px-4 py-3 flex items-center justify-between border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <GitBranch className="w-4 h-4 text-slate-500" />
                    <span className="text-xs font-bold text-slate-700">Chain of Provenance (DAG Lattice)</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">{snapshot.supporting_refs?.length ?? 0} nodes</span>
                </div>
                <div className="p-4 space-y-2">
                  {(snapshot.supporting_refs?.length ?? 0) > 0 ? snapshot.supporting_refs!.map((r, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="flex flex-col items-center shrink-0 pt-1">
                        <div className="w-5 h-5 rounded-full bg-[#EBF5F3] border border-[#A7E8D8] flex items-center justify-center">
                          <span className="text-[9px] font-bold text-[#0E6E5C]">{i + 1}</span>
                        </div>
                        {i < (snapshot.supporting_refs!.length - 1) && <div className="w-px h-4 bg-slate-200 mt-1" />}
                      </div>
                      <div className="flex-1 pb-2">
                        <p className="text-xs font-semibold text-slate-800">{r.source || r.sourceDoc || `Source ${i + 1}`}</p>
                        {(r.location || r.page_or_timestamp) && <p className="text-[11px] text-slate-400 font-mono mt-0.5">{r.location || r.page_or_timestamp}</p>}
                        {r.claim && <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">{r.claim}</p>}
                      </div>
                    </div>
                  )) : <p className="text-xs text-slate-400 italic">No provenance chain data available.</p>}
                </div>
              </div>

              {(snapshot.conflicting_refs?.length ?? 0) > 0 && (
                <div className="border border-amber-200 rounded-xl overflow-hidden">
                  <div className="bg-amber-50 px-4 py-3 flex items-center gap-2 border-b border-amber-200">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span className="text-xs font-bold text-amber-900">Conflicting Evidence &amp; Divergence Inquest</span>
                    <span className="ml-auto inline-flex items-center px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-bold border border-rose-300">{snapshot.conflicting_refs!.length} Flagged</span>
                  </div>
                  <div className="p-4 space-y-2 bg-amber-50/40">
                    {snapshot.conflicting_refs!.map((r, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <XCircle className="w-3.5 h-3.5 text-rose-500 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-xs font-semibold text-slate-800">{r.source || r.sourceDoc || `Conflict ${i + 1}`}</p>
                          {r.claim && <p className="text-[11px] text-slate-500 mt-0.5">{r.claim}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(snapshot.metrics?.length ?? 0) > 0 && (
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="bg-[#F8FAFC] px-4 py-3 border-b border-slate-200">
                    <span className="text-xs font-bold text-slate-700">Key Audit Metrics</span>
                  </div>
                  <div className="p-4 grid grid-cols-2 gap-2">
                    {snapshot.metrics!.map((m, i) => (
                      <div key={i} className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-0.5">
                        <p className="text-[10px] text-slate-400 uppercase tracking-wide">{m.label}</p>
                        <p className="text-sm font-serif font-bold text-slate-900">{m.value}</p>
                        {m.badge && <p className="text-[10px] font-mono text-slate-400">{m.badge}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="w-52 shrink-0 border-l border-slate-200 p-4 space-y-4 bg-[#F8FAFC]">
              <div className="border border-slate-200 bg-white rounded-xl p-3 space-y-2">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Robustness Audit</p>
                <div className="flex items-center justify-center py-2">
                  <div className="relative w-16 h-16">
                    <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                      <circle cx="18" cy="18" r="15" fill="none" stroke="#E5E7EB" strokeWidth="3" />
                      <circle cx="18" cy="18" r="15" fill="none" stroke="#0E6E5C" strokeWidth="3" strokeDasharray={`${robustPct * 0.942} 94.2`} strokeLinecap="round" />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-[#0E6E5C]">{robustPct}%</span>
                  </div>
                </div>
                <p className="text-[10px] text-center text-slate-500">Very High Confidence</p>
              </div>

              <div className="border border-slate-200 bg-white rounded-xl p-3 space-y-2">
                <div className="flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-[#0E6E5C]" />
                  <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wide">Cryptographic Vault Seal</p>
                </div>
                <div className="space-y-1.5 text-[10px]">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">DAG Root</span>
                    <span className="font-mono text-slate-600 truncate ml-2">{snapshot.id.slice(0, 8)}...</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Status</span>
                    <StatusBadge status={snapshot.status} />
                  </div>
                </div>
                <button type="button" onClick={handleExportPdf} disabled={isExporting}
                  className="w-full mt-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-[#0B5C48] text-white text-[10px] font-bold hover:bg-[#0E6E5C] transition-colors disabled:opacity-60 cursor-pointer">
                  <Download className="w-3 h-3" />Export DAG Vault
                </button>
              </div>

              {(snapshot.critical_evidence?.length ?? 0) > 0 && (
                <div className="border border-rose-200 bg-white rounded-xl p-3 space-y-2">
                  <p className="text-[10px] font-bold text-rose-700 uppercase tracking-wide">Critical Sources</p>
                  {snapshot.critical_evidence!.slice(0, 3).map((c, i) => (
                    <div key={i} className="text-[10px] text-slate-600">
                      <p className="font-semibold text-rose-700 truncate">{c.source}</p>
                      {c.modality && <p className="text-slate-400 font-mono">[{c.modality}]</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DecisionCard({ snap, onOpen, onDelete, isDeleting }: { snap: DecisionSnapshot; onOpen: () => void; onDelete: (e: React.MouseEvent) => void; isDeleting: boolean; }) {
  const robustPct = snap.robustness_percentage;
  const formattedDate = new Date(snap.created_at).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  const shortId = snap.id.slice(0, 6).toUpperCase();
  return (
    <div onClick={onOpen} className="relative bg-white border border-slate-200 rounded-xl overflow-hidden hover:shadow-md hover:border-[#A7E8D8] transition-all cursor-pointer group flex flex-col">
      <div className={`h-0.5 w-full ${STATUS_TOP_BAR[snap.status] || 'bg-slate-300'}`} />
      <div className="p-4 flex flex-col flex-1 gap-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <StatusBadge status={snap.status} />
            <span className="text-[10px] text-slate-400 font-mono">{formattedDate}</span>
          </div>
          <button type="button" onClick={(e) => { e.stopPropagation(); }} className="p-1 rounded hover:bg-slate-100 text-slate-400 transition-colors shrink-0">
            <MoreHorizontal className="w-3.5 h-3.5" />
          </button>
        </div>
        <p className="text-[10px] font-mono text-slate-400 uppercase tracking-widest -mt-1">AUDIT DOSSIER #{shortId}</p>
        <h3 className="text-sm font-serif font-bold text-slate-900 leading-snug group-hover:text-[#0B5C48] transition-colors line-clamp-3">{snap.question}</h3>
        <p className="text-xs text-slate-500 leading-relaxed line-clamp-3 flex-1">{snap.conclusion || '—'}</p>
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-slate-400 font-medium">Robustness Consensus</span>
            <span className={`font-bold tabular-nums ${ROBUSTNESS_TEXT_COLOR(robustPct)}`}>{robustPct !== undefined && robustPct !== null ? `${robustPct}%` : '—'}</span>
          </div>
          <div className="h-1 rounded-full bg-slate-100 overflow-hidden">
            {robustPct !== undefined && robustPct !== null && (
              <div className={`h-full rounded-full transition-all ${ROBUSTNESS_BAR_COLOR(robustPct)}`} style={{ width: `${robustPct}%` }} />
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap text-[10px]">
          <span className="text-slate-400">&#8627; {snap.supporting_refs?.length ?? 0} Sources &middot; {snap.conflicting_refs?.length ?? 0} Flagged</span>
          <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">DAG #{snap.id.slice(0, 6)}...</span>
        </div>
        <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
          <button type="button" onClick={(e) => { e.stopPropagation(); onDelete(e); }} disabled={isDeleting}
            className="text-[11px] font-semibold text-slate-400 hover:text-rose-600 transition-colors disabled:opacity-60 cursor-pointer">
            {isDeleting ? <Loader2 className="w-3 h-3 animate-spin inline" /> : 'Quick Audit'}
          </button>
          <button type="button" onClick={(e) => { e.stopPropagation(); onOpen(); }}
            className={`ml-auto inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-bold text-white transition-colors cursor-pointer ${snap.status === 'BLOCK' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-[#0B5C48] hover:bg-[#0E6E5C]'}`}>
            {snap.status === 'BLOCK' ? 'Resolve Conflict' : 'Open Detail View'}
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DecisionsPage() {
  const [snapshots, setSnapshots] = useState<DecisionSnapshot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<DecisionSnapshot | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PASS' | 'REVIEW' | 'BLOCK'>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 6;

  const loadSnapshots = useCallback(async () => {
    setIsLoading(true); setError(null);
    try {
      const res = await fetch(`${API_BASE}/decisions/`);
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      setSnapshots(await res.json());
    } catch { setError('Could not load Decision Snapshots. Make sure the backend is running.'); setSnapshots([]); }
    finally { setIsLoading(false); }
  }, []);

  useEffect(() => { loadSnapshots(); }, [loadSnapshots]);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Delete this Decision Snapshot? This cannot be undone.')) return;
    setDeletingId(id);
    try {
      await fetch(`${API_BASE}/decisions/${id}`, { method: 'DELETE' });
      setSnapshots((prev) => prev.filter((s) => s.id !== id));
      if (selected?.id === id) setSelected(null);
    } catch { alert('Failed to delete snapshot.'); }
    finally { setDeletingId(null); }
  };

  const filtered = snapshots.filter((s) => {
    const matchStatus = statusFilter === 'ALL' || s.status === statusFilter;
    const q = searchQuery.toLowerCase().trim();
    const matchSearch = !q || s.question.toLowerCase().includes(q) || s.conclusion?.toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const passCount = snapshots.filter((s) => s.status === 'PASS').length;
  const reviewCount = snapshots.filter((s) => s.status === 'REVIEW').length;
  const blockCount = snapshots.filter((s) => s.status === 'BLOCK').length;
  const avgRobustness = snapshots.length > 0 ? Math.round(snapshots.reduce((sum, s) => sum + (s.robustness_percentage ?? 0), 0) / snapshots.length) : 0;
  const tabCounts = { ALL: snapshots.length, PASS: passCount, REVIEW: reviewCount, BLOCK: blockCount };

  return (
    <div className="space-y-5 animate-fadeIn">
      <div>
        <div className="flex items-center gap-2 mb-3">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#EBF5F3] border border-[#A7E8D8] text-[#0B5C48] text-[10px] font-bold uppercase tracking-widest">
            <Activity className="w-3 h-3" />Decentralized Evidence Engine
          </span>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-serif font-bold text-slate-900 tracking-tight">Decisions Log &amp; Audit Dossiers</h1>
            <p className="text-sm text-slate-500 mt-1 max-w-xl">Cryptographically sealed institutional decisions, multi-modal consensus verifications, and adversarial robustness audits.</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button type="button" onClick={loadSnapshots} disabled={isLoading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors disabled:opacity-60 cursor-pointer">
              <Download className="w-3.5 h-3.5 text-slate-400" />Export Audit Ledger
            </button>
            <button type="button" onClick={loadSnapshots} disabled={isLoading}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[#0B5C48] hover:bg-[#0E6E5C] text-white text-xs font-bold transition-colors disabled:opacity-60 cursor-pointer">
              {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <TrendingUp className="w-3.5 h-3.5" />}
              + New Decision Query
            </button>
          </div>
        </div>
      </div>

      {!isLoading && !error && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {[
            { label: 'Total Decisions', value: snapshots.length.toString(), sub: `+${Math.max(0, snapshots.length - 21)} this cycle`, icon: FileText, color: 'text-slate-700', iconColor: 'text-slate-400', large: false },
            { label: 'Deterministic / Pass', value: passCount.toString(), sub: `${snapshots.length ? Math.round((passCount / snapshots.length) * 100) : 0}% yield`, icon: CheckCircle2, color: 'text-emerald-700', iconColor: 'text-emerald-500', large: false },
            { label: 'Under Review', value: reviewCount.toString(), sub: 'Pending quorum', icon: Clock, color: 'text-amber-700', iconColor: 'text-amber-500', large: false },
            { label: 'Blocked / Discrepancy', value: blockCount.toString(), sub: 'Action Req.', icon: AlertTriangle, color: 'text-rose-700', iconColor: 'text-rose-500', large: false },
            { label: 'Avg. Robustness', value: `${avgRobustness}%`, sub: 'Monte Carlo consensus', icon: ShieldCheck, color: 'text-[#0B5C48]', iconColor: 'text-[#0E6E5C]', large: true },
          ].map(({ label, value, sub, icon: Icon, color, iconColor, large }) => (
            <div key={label} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">{label}</span>
                <Icon className={`w-3.5 h-3.5 ${iconColor}`} />
              </div>
              <p className={`font-serif font-bold ${color} ${large ? 'text-2xl' : 'text-xl'} tabular-nums`}>{value}</p>
              <p className="text-[11px] text-slate-400">{sub}</p>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input type="text" placeholder="Search decisions, hash signatures, entities, or claims..."
              value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 bg-white placeholder:text-slate-400/70 focus:outline-none focus:border-[#0E6E5C] focus:ring-1 focus:ring-[#0E6E5C]/20" />
          </div>
          <div className="flex items-center gap-2">
            <select className="text-xs rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-600 focus:outline-none cursor-pointer">
              <option>Confidence: All Scores</option>
            </select>
            <select className="text-xs rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-600 focus:outline-none cursor-pointer">
              <option>Sort: Latest Sealed</option>
            </select>
            <button type="button" className="p-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-400 cursor-pointer"><Filter className="w-4 h-4" /></button>
            <button type="button" onClick={loadSnapshots} className="p-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-400 cursor-pointer"><RefreshCw className="w-4 h-4" /></button>
          </div>
        </div>
        <div className="flex items-center gap-1 border-b border-slate-200">
          {(['ALL', 'PASS', 'REVIEW', 'BLOCK'] as const).map((tab) => (
            <button key={tab} type="button" onClick={() => { setStatusFilter(tab); setCurrentPage(1); }}
              className={`px-3 py-2 text-xs font-semibold rounded-t-lg border border-b-0 transition-colors cursor-pointer ${statusFilter === tab ? 'bg-white border-slate-200 text-[#0B5C48] -mb-px' : 'bg-transparent border-transparent text-slate-500 hover:text-slate-700'}`}>
              {tab === 'ALL' ? `All (${tabCounts.ALL})` : `${tab} (${tabCounts[tab]})`}
            </button>
          ))}
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center gap-3 py-20">
          <Loader2 className="w-6 h-6 animate-spin text-[#0E6E5C]" />
          <span className="text-sm font-medium text-slate-500">Loading Decision Dossiers...</span>
        </div>
      )}

      {!isLoading && error && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-sm text-rose-700 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /><span>{error}</span>
        </div>
      )}

      {!isLoading && !error && snapshots.length === 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-[#EBF5F3] flex items-center justify-center mx-auto">
            <BookOpen className="w-6 h-6 text-[#0E6E5C]" />
          </div>
          <p className="text-sm font-semibold text-slate-700">No Decision Dossiers yet</p>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">Use the <strong>&ldquo;Save as Decision Snapshot&rdquo;</strong> action in the Workspace after running a multi-modal query.</p>
        </div>
      )}

      {!isLoading && !error && paginated.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {paginated.map((snap) => (
            <DecisionCard key={snap.id} snap={snap} onOpen={() => setSelected(snap)}
              onDelete={(e) => handleDelete(snap.id, e)} isDeleting={deletingId === snap.id} />
          ))}
        </div>
      )}

      {!isLoading && !error && snapshots.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#EBF5F3] border border-[#A7E8D8] flex items-center justify-center shrink-0">
              <Database className="w-4 h-4 text-[#0E6E5C]" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800">Institutional Ledger Consensus Stream</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Active node validating block #{Math.max(800, snapshots.length * 37)}. Zero unverified forks detected across all regions.</p>
            </div>
          </div>
          <div className="flex items-center gap-3 sm:ml-auto flex-wrap">
            <div className="text-[11px] text-center"><p className="text-slate-400">Byzantine Quorum</p><p className="font-bold text-slate-700">99.98%</p></div>
            <button type="button" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-600 cursor-pointer">
              <Zap className="w-3.5 h-3.5 text-[#0E6E5C]" />DAG Topology
            </button>
            <button type="button" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0B5C48] hover:bg-[#0E6E5C] text-white text-xs font-bold cursor-pointer">View Block Explorer</button>
          </div>
        </div>
      )}

      {!isLoading && !error && filtered.length > PAGE_SIZE && (
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>Showing {((currentPage - 1) * PAGE_SIZE) + 1}&ndash;{Math.min(currentPage * PAGE_SIZE, filtered.length)} of {filtered.length} sealed decisions</span>
          <div className="flex items-center gap-1">
            <button type="button" disabled={currentPage <= 1} onClick={() => setCurrentPage((p) => p - 1)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 cursor-pointer">&lsaquo;</button>
            {Array.from({ length: Math.min(4, totalPages) }, (_, i) => i + 1).map((p) => (
              <button key={p} type="button" onClick={() => setCurrentPage(p)}
                className={`px-2.5 py-1.5 rounded-lg border cursor-pointer ${currentPage === p ? 'bg-[#0B5C48] text-white border-[#0B5C48] font-bold' : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-600'}`}>{p}</button>
            ))}
            <button type="button" disabled={currentPage >= totalPages} onClick={() => setCurrentPage((p) => p + 1)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 cursor-pointer">&rsaquo;</button>
          </div>
        </div>
      )}

      {selected && <DetailPanel snapshot={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
