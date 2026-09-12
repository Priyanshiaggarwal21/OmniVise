'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, BadgeCheck, Building2, Check, Clipboard, FileText, Search, X, ZoomIn, ZoomOut } from 'lucide-react';

type NodeKind = 'company' | 'document' | 'claim' | 'evidence';

type GraphNode = {
  id: string;
  label: string;
  kind: NodeKind;
  x: number;
  y: number;
  conflict?: boolean;
  quote: string;
  source: string;
};

const nodes: GraphNode[] = [
  { id: 'company', label: 'OmniVise Corp', kind: 'company', x: 16, y: 50, quote: 'OmniVise Corp reported consolidated revenue for the quarter.', source: '10-Q Filing, p. 4' },
  { id: 'document', label: 'Q2 Earnings Call', kind: 'document', x: 38, y: 27, quote: 'We expect the enterprise launch to complete by June 14.', source: 'Earnings Call, 00:14:32' },
  { id: 'document-2', label: '10-Q Filing', kind: 'document', x: 38, y: 73, quote: 'The filing records the launch completion date as July 2.', source: '10-Q Filing, p. 18' },
  { id: 'claim', label: 'Launch by June 14', kind: 'claim', x: 63, y: 27, conflict: true, quote: 'The enterprise launch will be complete by June 14, 2026.', source: 'Earnings Call, 00:14:32' },
  { id: 'claim-2', label: 'Revenue at $45M', kind: 'claim', x: 63, y: 73, quote: 'Quarterly revenue reached $45M, representing 12% year-over-year growth.', source: 'Earnings Call, 00:21:08' },
  { id: 'evidence', label: 'Launch approval', kind: 'evidence', x: 86, y: 27, conflict: true, quote: 'Regulatory approval was received on July 2, delaying the production launch.', source: 'Approval Memo, p. 2' },
  { id: 'evidence-2', label: 'Invoice ledger', kind: 'evidence', x: 86, y: 73, quote: 'Audited ledger reports recognized revenue of $43M for the same period.', source: 'Invoice Ledger, p. 9' },
];

const edges = [
  ['company', 'document'], ['company', 'document-2'], ['document', 'claim'], ['document-2', 'claim-2'],
  ['claim', 'evidence'], ['claim-2', 'evidence-2'],
];

const kindStyles: Record<NodeKind, { icon: typeof Building2; color: string; badge: string }> = {
  company: { icon: Building2, color: 'border-indigo-400/40 bg-indigo-500/15 text-indigo-200', badge: 'Company' },
  document: { icon: FileText, color: 'border-slate-400/30 bg-slate-500/15 text-slate-200', badge: 'Document' },
  claim: { icon: AlertTriangle, color: 'border-amber-400/40 bg-amber-500/15 text-amber-200', badge: 'Claim' },
  evidence: { icon: BadgeCheck, color: 'border-emerald-400/40 bg-emerald-500/15 text-emerald-200', badge: 'Evidence' },
};

export default function KnowledgeGraph() {
  const [query, setQuery] = useState('');
  const [conflictsOnly, setConflictsOnly] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [selected, setSelected] = useState<GraphNode | null>(null);
  const [copied, setCopied] = useState(false);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (copyTimer.current) clearTimeout(copyTimer.current);
  }, []);

  const copyProof = async () => {
    if (!selected) return;
    try {
      await navigator.clipboard.writeText(selected.quote);
    } catch {
      return;
    }
    setCopied(true);
    if (copyTimer.current) clearTimeout(copyTimer.current);
    copyTimer.current = setTimeout(() => setCopied(false), 1800);
  };

  const visibleNodes = useMemo(() => nodes.filter((node) => !conflictsOnly || node.conflict), [conflictsOnly]);
  const normalizedQuery = query.trim().toLowerCase();
  const matchesQuery = (node: GraphNode): boolean => `${node.label} ${node.kind}`.toLowerCase().includes(normalizedQuery);
  const matchingNodeIds = new Set(visibleNodes.filter(matchesQuery).map((node) => node.id));
  const visibleIds = new Set(visibleNodes.map((node) => node.id));

  return (
    <section className="min-h-[calc(100vh-7rem)] rounded-3xl border border-white/10 bg-slate-900/60 p-5 shadow-2xl backdrop-blur-xl md:p-7">
      <div className="flex flex-col gap-4 border-b border-white/10 pb-5 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-300/80">Graph intelligence</p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-white">Knowledge Graph</h1>
          <p className="mt-1 max-w-xl text-xs text-slate-400">Trace the evidence chain from company to document, claim, and supporting evidence.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search nodes" className="w-48 rounded-xl border border-white/10 bg-slate-950/70 py-2 pl-9 pr-3 text-xs text-slate-200 outline-none focus:border-indigo-400/50" />
          </label>
          <button onClick={() => setConflictsOnly((value) => !value)} className={`rounded-xl border px-3 py-2 text-xs font-bold transition ${conflictsOnly ? 'border-rose-400/40 bg-rose-500/15 text-rose-200' : 'border-white/10 bg-white/[0.03] text-slate-400 hover:text-white'}`} aria-pressed={conflictsOnly}>
            {conflictsOnly ? 'Showing conflicts' : 'Conflict-Only'}
          </button>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between rounded-xl border border-white/10 bg-slate-950/50 p-2">
        <p className="px-2 text-[11px] text-slate-500">{normalizedQuery ? `${matchingNodeIds.size} matching` : visibleNodes.length} of {nodes.length} nodes visible</p>
        <div className="flex items-center gap-1">
          <button onClick={() => setZoom((value) => Math.max(0.7, value - 0.1))} className="rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white" aria-label="Zoom out"><ZoomOut size={15} /></button>
          <span className="w-12 text-center font-mono text-[10px] text-slate-500">{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom((value) => Math.min(1.5, value + 0.1))} className="rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white" aria-label="Zoom in"><ZoomIn size={15} /></button>
        </div>
      </div>

      <div className="relative mt-4 min-h-[560px] overflow-hidden rounded-2xl border border-white/10 bg-[#070b16]" style={{ transform: `scale(${zoom})`, transformOrigin: 'center top' }}>
        <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'linear-gradient(rgba(148,163,184,.12) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,.12) 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          {edges.map(([from, to]) => {
            const source = nodes.find((node) => node.id === from);
            const target = nodes.find((node) => node.id === to);
            if (!source || !target || !visibleIds.has(source.id) || !visibleIds.has(target.id)) return null;
            const edgeIsDimmed = normalizedQuery.length > 0 && !matchingNodeIds.has(source.id) && !matchingNodeIds.has(target.id);
            return <line key={`${from}-${to}`} x1={source.x} y1={source.y} x2={target.x} y2={target.y} stroke={source.conflict || target.conflict ? '#fb7185' : '#475569'} strokeWidth="0.22" strokeDasharray="1 0.7" opacity={edgeIsDimmed ? 0.15 : 1} />;
          })}
        </svg>
        {visibleNodes.map((node) => {
          const style = kindStyles[node.kind];
          const Icon = style.icon;
          const isMatch = normalizedQuery.length === 0 || matchingNodeIds.has(node.id);
          return <button key={node.id} onClick={() => setSelected(node)} className={`absolute z-10 -translate-x-1/2 -translate-y-1/2 rounded-xl border px-3 py-2 text-left shadow-lg transition hover:-translate-y-[calc(50%+3px)] hover:shadow-indigo-500/20 ${style.color} ${node.conflict ? 'ring-2 ring-rose-500/20' : ''} ${normalizedQuery && isMatch ? 'ring-2 ring-indigo-300/70 shadow-lg shadow-indigo-500/30' : ''} ${normalizedQuery && !isMatch ? 'opacity-25 grayscale' : ''}`} style={{ left: `${node.x}%`, top: `${node.y}%` }}>
            <span className="flex items-center gap-2 text-xs font-bold"><Icon size={14} />{node.label}</span>
            <span className="mt-1 block text-[9px] font-black uppercase tracking-widest opacity-60">{style.badge}{node.conflict ? ' · conflict' : ''}</span>
          </button>;
        })}
        {normalizedQuery && matchingNodeIds.size === 0 && <p className="absolute left-1/2 top-4 z-20 -translate-x-1/2 rounded-lg border border-amber-400/20 bg-slate-950/85 px-3 py-2 text-xs text-amber-200 shadow-xl">No matching nodes</p>}
      </div>

      {selected && <aside className="fixed inset-y-0 right-0 z-50 w-full max-w-md border-l border-white/10 bg-slate-950/95 p-6 shadow-2xl backdrop-blur-2xl" aria-label="Evidence drawer">
        <div className="flex items-start justify-between"><div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-300/80">Evidence drawer</p><h2 className="mt-2 text-xl font-black text-white">{selected.label}</h2></div><button onClick={() => setSelected(null)} className="rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white" aria-label="Close evidence drawer"><X size={18} /></button></div>
        <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.04] p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Quoted text</p>
            <button type="button" onClick={copyProof} className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-400/25 bg-indigo-500/10 px-2.5 py-1.5 text-[10px] font-black text-indigo-200 transition hover:border-indigo-400/45 hover:bg-indigo-500/20" aria-label={copied ? 'Proof copied' : 'Copy quoted proof'}>
              {copied ? <Check size={12} /> : <Clipboard size={12} />}
              {copied ? 'Copied!' : 'Copy Proof'}
            </button>
          </div>
          <blockquote className="mt-3 border-l-2 border-indigo-400 pl-4 text-sm leading-relaxed text-slate-200">“{selected.quote}”</blockquote>
          <p className="mt-5 text-xs font-bold text-indigo-300">{selected.source}</p>
        </div>
      </aside>}
    </section>
  );
}
