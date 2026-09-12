'use client';
import React, { useState, useMemo, useCallback } from 'react';
import type { GraphNodeData, GraphEdgeData, MatchedDiscrepancy, KGNodeType, OpenEvidenceRequest, TimelinePoint } from '../../types';
import {
  Search,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  AlertTriangle,
  ChevronRight,
  X,
  TrendingUp,
  TrendingDown,
  Minus,
  Building2,
  FileText,
  Tag,
  CircleDot,
  Diamond,
  Square,
  Star,
} from 'lucide-react';

interface KnowledgeGraphProps {
  nodes?: GraphNodeData[];
  edges?: GraphEdgeData[];
  discrepancies?: MatchedDiscrepancy[];
  onSelectDiscrepancy: (d: MatchedDiscrepancy) => void;
  onOpenEvidence?: (req: OpenEvidenceRequest) => void;
}

type SeverityFilter = 'ALL' | 'HIGH' | 'MED' | 'LOW';

const DEFAULT_NODES: GraphNodeData[] = [
  { id: 'ent-default', label: 'OmniVise Corp', sublabel: 'Audit Entity', x: 160, y: 210, type: 'company' },
  { id: 'doc-a', label: 'Earnings Call Q2', sublabel: '2024-05-15', x: 400, y: 90, type: 'document' },
  { id: 'doc-b', label: '10-Q Filing Q2', sublabel: 'SEC Filed', x: 400, y: 330, type: 'document' },
  { id: 'claim-1', label: 'Revenue Growth', sublabel: '+12% YoY', x: 620, y: 110, type: 'claim' },
  { id: 'metric-1', label: 'Revenue', sublabel: '$45M', x: 620, y: 250, type: 'metric' },
  { id: 'period-1', label: 'Q2 2024', sublabel: 'Quarter', x: 840, y: 130, type: 'period' },
  { id: 'evidence-1', label: 'Transcript p.14', sublabel: 'CEO Statement', x: 620, y: 380, type: 'evidence' },
  { id: 'contradiction-1', label: 'Value Mismatch', sublabel: '$43M vs $45M', x: 840, y: 320, type: 'contradiction', severity: 'High', status: 'CONTRADICTION', relatedDiscrepancyId: 'disc-1' },
];

const DEFAULT_EDGES: GraphEdgeData[] = [
  { from: 'ent-default', to: 'doc-a' },
  { from: 'ent-default', to: 'doc-b' },
  { from: 'doc-a', to: 'claim-1' },
  { from: 'doc-a', to: 'evidence-1' },
  { from: 'doc-b', to: 'metric-1' },
  { from: 'claim-1', to: 'metric-1' },
  { from: 'claim-1', to: 'period-1' },
  { from: 'metric-1', to: 'contradiction-1' },
  { from: 'evidence-1', to: 'contradiction-1' },
  { from: 'period-1', to: 'contradiction-1' },
];

const BASE_VB_W = 1040;
const BASE_VB_H = 500;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.2;

interface NodeStyleSpec {
  shape: 'hexagon' | 'roundedRect' | 'tag' | 'circle' | 'diamond' | 'rect' | 'star';
  fill: string;
  fillBg: string;
  stroke: string;
  strokeWidth: string;
  textFill: string;
  subFill: string;
  label: string;
  glow: string;
}

const NODE_STYLES: Record<KGNodeType, NodeStyleSpec> = {
  company: {
    shape: 'hexagon',
    fill: 'rgba(99,102,241,0.14)',
    fillBg: '#312E81',
    stroke: '#6366F1',
    strokeWidth: '2',
    textFill: '#E0E7FF',
    subFill: '#818CF8',
    label: 'Company',
    glow: 'rgba(99,102,241,0.45)',
  },
  document: {
    shape: 'roundedRect',
    fill: 'rgba(148,163,184,0.10)',
    fillBg: '#1E293B',
    stroke: '#64748B',
    strokeWidth: '1.5',
    textFill: '#E2E8F0',
    subFill: '#94A3B8',
    label: 'Document',
    glow: 'rgba(148,163,184,0.35)',
  },
  claim: {
    shape: 'tag',
    fill: 'rgba(16,185,129,0.12)',
    fillBg: '#064E3B',
    stroke: '#10B981',
    strokeWidth: '1.5',
    textFill: '#D1FAE5',
    subFill: '#34D399',
    label: 'Claim',
    glow: 'rgba(16,185,129,0.40)',
  },
  metric: {
    shape: 'circle',
    fill: 'rgba(139,92,246,0.12)',
    fillBg: '#4C1D95',
    stroke: '#8B5CF6',
    strokeWidth: '1.5',
    textFill: '#EDE9FE',
    subFill: '#A78BFA',
    label: 'Metric',
    glow: 'rgba(139,92,246,0.40)',
  },
  period: {
    shape: 'diamond',
    fill: 'rgba(245,158,11,0.12)',
    fillBg: '#78350F',
    stroke: '#F59E0B',
    strokeWidth: '1.5',
    textFill: '#FEF3C7',
    subFill: '#FBBF24',
    label: 'Period',
    glow: 'rgba(245,158,11,0.40)',
  },
  evidence: {
    shape: 'rect',
    fill: 'rgba(56,189,248,0.10)',
    fillBg: '#0C4A6E',
    stroke: '#38BDF8',
    strokeWidth: '1.5',
    textFill: '#E0F2FE',
    subFill: '#7DD3FC',
    label: 'Evidence',
    glow: 'rgba(56,189,248,0.38)',
  },
  contradiction: {
    shape: 'star',
    fill: 'rgba(244,63,94,0.16)',
    fillBg: '#881337',
    stroke: '#F43F5E',
    strokeWidth: '2.5',
    textFill: '#FECDD3',
    subFill: '#FB7185',
    label: 'Contradiction',
    glow: 'rgba(244,63,94,0.55)',
  },
};

const SEV_RING: Record<NonNullable<GraphNodeData['severity']>, { glow: string; stroke: string; filterSeverity: SeverityFilter }> = {
  Critical: { glow: 'rgba(244,63,94,0.65)', stroke: '#F43F5E', filterSeverity: 'HIGH' },
  High:     { glow: 'rgba(245,158,11,0.50)',  stroke: '#F59E0B', filterSeverity: 'HIGH' },
  Medium:   { glow: 'rgba(56,189,248,0.42)',  stroke: '#38BDF8', filterSeverity: 'MED' },
  Low:      { glow: 'rgba(52,211,153,0.38)',  stroke: '#34D399', filterSeverity: 'LOW' },
};

const TIMELINE_SAMPLE: TimelinePoint[] = [
  { period: 'Q1 2024', value: 41000000, unit: 'USD', label: '$41M', metric: 'Revenue' },
  { period: 'Q2 2024', value: 45000000, unit: 'USD', label: '$45M', metric: 'Revenue' },
  { period: 'Q3 2024', value: 43000000, unit: 'USD', label: '$43M', metric: 'Revenue' },
];

function shapePath(shape: NodeStyleSpec['shape'], w: number, h: number): string {
  switch (shape) {
    case 'hexagon': {
      const r = Math.min(w, h) / 2;
      const pts: string[] = [];
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i - Math.PI / 2;
        pts.push(`${Math.cos(angle) * r},${Math.sin(angle) * r}`);
      }
      return `M ${pts.join(' L ')} Z`;
    }
    case 'roundedRect':
      return '';
    case 'tag': {
      const hw = w / 2, hh = h / 2;
      const notch = hh * 0.35;
      return `M ${-hw} ${-hh} L ${hw - notch} ${-hh} L ${hw} 0 L ${hw - notch} ${hh} L ${-hw} ${hh} Z`;
    }
    case 'circle':
      return '';
    case 'diamond': {
      const hw = w / 2, hh = h / 2;
      return `M 0 ${-hh} L ${hw} 0 L 0 ${hh} L ${-hw} 0 Z`;
    }
    case 'rect':
      return '';
    case 'star': {
      const outer = Math.min(w, h) / 2;
      const inner = outer * 0.45;
      const pts: string[] = [];
      for (let i = 0; i < 10; i++) {
        const r = i % 2 === 0 ? outer : inner;
        const angle = (Math.PI / 5) * i - Math.PI / 2;
        pts.push(`${Math.cos(angle) * r},${Math.sin(angle) * r}`);
      }
      return `M ${pts.join(' L ')} Z`;
    }
  }
}

function nodeWidth(type: KGNodeType): number {
  switch (type) {
    case 'company': return 96;
    case 'document': return 120;
    case 'claim': return 110;
    case 'metric': return 80;
    case 'period': return 90;
    case 'evidence': return 120;
    case 'contradiction': return 100;
  }
}

function nodeHeight(type: KGNodeType): number {
  switch (type) {
    case 'company': return 84;
    case 'document': return 64;
    case 'claim': return 60;
    case 'metric': return 80;
    case 'period': return 84;
    case 'evidence': return 64;
    case 'contradiction': return 92;
  }
}

export default function KnowledgeGraph({
  nodes: nodeProp,
  edges: edgeProp,
  discrepancies = [],
  onSelectDiscrepancy,
  onOpenEvidence,
}: KnowledgeGraphProps) {
  const [hovered, setHovered] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [zoomLevel, setZoomLevel] = useState(1);
  const [conflictOnly, setConflictOnly] = useState(false);
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('ALL');
  const [openBreadcrumb, setOpenBreadcrumb] = useState<OpenEvidenceRequest | null>(null);

  const nodes = useMemo(() => nodeProp && nodeProp.length > 0 ? nodeProp : DEFAULT_NODES, [nodeProp]);
  const edges = useMemo(() => edgeProp && edgeProp.length > 0 ? edgeProp : DEFAULT_EDGES, [edgeProp]);

  const nodeMap = useMemo(() => {
    const m = new Map<string, GraphNodeData>();
    nodes.forEach((n) => m.set(n.id, n));
    return m;
  }, [nodes]);

  const viewBox = useMemo(() => {
    const scaledW = BASE_VB_W / zoomLevel;
    const scaledH = BASE_VB_H / zoomLevel;
    const offsetX = (BASE_VB_W - scaledW) / 2;
    const offsetY = (BASE_VB_H - scaledH) / 2;
    return `${offsetX} ${offsetY} ${scaledW} ${scaledH}`;
  }, [zoomLevel]);

  const handleZoomIn = useCallback(() => {
    setZoomLevel((z) => Math.min(MAX_ZOOM, +(z + ZOOM_STEP).toFixed(2)));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoomLevel((z) => Math.max(MIN_ZOOM, +(z - ZOOM_STEP).toFixed(2)));
  }, []);

  const handleZoomReset = useCallback(() => {
    setZoomLevel(1);
    setSearchQuery('');
    setConflictOnly(false);
    setSeverityFilter('ALL');
  }, []);

  const isNodeVisible = useCallback(
    (n: GraphNodeData): boolean => {
      const normalizedType = (n.type === 'entity' || n.type === 'vendor') ? 'company' : n.type;
      if (searchQuery && searchQuery.trim().length > 0) {
        const q = searchQuery.trim().toLowerCase();
        const haystack = `${n.label} ${n.sublabel ?? ''}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      if (conflictOnly) {
        if (normalizedType === 'contradiction' && n.status === 'CONTRADICTION') return true;
        const connectedViaEdge = edges.some((e) => {
          const other = e.from === n.id ? e.to : e.from;
          const otherNode = nodeMap.get(other);
          if (!otherNode) return false;
          const otherType = (otherNode.type === 'entity' || otherNode.type === 'vendor') ? 'company' : otherNode.type;
          return otherType === 'contradiction' && otherNode.status === 'CONTRADICTION';
        });
        if (!connectedViaEdge) return false;
      }
      if (severityFilter !== 'ALL') {
        if (normalizedType === 'contradiction' || n.severity) {
          const sevKey = n.severity;
          if (sevKey) {
            const mapped = SEV_RING[sevKey];
            if (mapped && mapped.filterSeverity !== severityFilter) return false;
          } else if (normalizedType === 'contradiction') {
            return false;
          }
        }
      }
      return true;
    },
    [searchQuery, conflictOnly, severityFilter, edges, nodeMap]
  );

  const visibleNodes = useMemo(() => nodes.filter(isNodeVisible), [nodes, isNodeVisible]);
  const visibleNodeIds = useMemo(() => new Set(visibleNodes.map((n) => n.id)), [visibleNodes]);

  const visibleEdges = useMemo(
    () => edges.filter((e) => visibleNodeIds.has(e.from) && visibleNodeIds.has(e.to)),
    [edges, visibleNodeIds]
  );

  const findDiscrepancy = (relatedId?: string) =>
    relatedId ? discrepancies.find((d) => d.id === relatedId) : undefined;

  const relatedDiscrepancy = (node: GraphNodeData) => {
    if (node.relatedDiscrepancyId) {
      return discrepancies.find((d) => d.id === node.relatedDiscrepancyId);
    }
    return undefined;
  };

  const edgeRelevant = (e: GraphEdgeData) => {
    if (!hovered) return true;
    return e.from === hovered || e.to === hovered;
  };

  const nodeRelevant = (n: GraphNodeData) => {
    if (!hovered || n.id === hovered) return true;
    return edges.some((e) =>
      (e.from === hovered && e.to === n.id) || (e.to === hovered && e.from === n.id)
    );
  };

  const buildBreadcrumb = useCallback(
    (targetId: string): Array<{ label: string; type: KGNodeType }> => {
      const bc: Array<{ label: string; type: KGNodeType }> = [];
      const visited = new Set<string>();
      const queue: Array<{ id: string; path: Array<{ id: string; label: string; type: KGNodeType }> }> = [];
      const starts = nodes.filter((n) => {
        const t = (n.type === 'entity' || n.type === 'vendor') ? 'company' : n.type;
        return t === 'company';
      });
      starts.forEach((s) => queue.push({ id: s.id, path: [{ id: s.id, label: s.label, type: 'company' }] }));
      while (queue.length > 0) {
        const cur = queue.shift()!;
        if (visited.has(cur.id)) continue;
        visited.add(cur.id);
        if (cur.id === targetId) {
          bc.push(...cur.path.map((p) => ({ label: p.label, type: p.type })));
          return bc;
        }
        const neighbors: string[] = [];
        edges.forEach((e) => {
          if (e.from === cur.id) neighbors.push(e.to);
          if (e.to === cur.id) neighbors.push(e.from);
        });
        neighbors.forEach((nid) => {
          const nNode = nodeMap.get(nid);
          if (!nNode || visited.has(nid)) return;
          const nt = (nNode.type === 'entity' || nNode.type === 'vendor') ? 'company' : (nNode.type as KGNodeType);
          queue.push({ id: nid, path: [...cur.path, { id: nid, label: nNode.label, type: nt }] });
        });
      }
      const nNode = nodeMap.get(targetId);
      if (nNode) {
        const nt = (nNode.type === 'entity' || nNode.type === 'vendor') ? 'company' : (nNode.type as KGNodeType);
        bc.push({ label: nNode.label, type: nt });
      }
      return bc;
    },
    [nodes, edges, nodeMap]
  );

  const handleNodeClick = useCallback(
    (n: GraphNodeData) => {
      const normalizedType = (n.type === 'entity' || n.type === 'vendor') ? 'company' : n.type;
      const d = relatedDiscrepancy(n) || (normalizedType === 'contradiction' ? findDiscrepancy(n.id) : undefined);
      if (d && normalizedType === 'contradiction') {
        onSelectDiscrepancy(d);
        return;
      }
      if (normalizedType !== 'contradiction' && onOpenEvidence) {
        const bc = buildBreadcrumb(n.id);
        const req: OpenEvidenceRequest = {
          nodeId: n.id,
          nodeType: normalizedType as KGNodeType,
          breadcrumb: bc,
        };
        setOpenBreadcrumb(req);
        onOpenEvidence(req);
      }
    },
    [onSelectDiscrepancy, onOpenEvidence, relatedDiscrepancy, findDiscrepancy, buildBreadcrumb]
  );

  return (
    <div className="relative rounded-2xl border border-white/10 bg-gradient-to-br from-slate-950/90 via-slate-900/70 to-slate-950/90 backdrop-blur-xl shadow-2xl overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-400/50 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-fuchsia-400/30 to-transparent" />
      <div className="absolute -top-32 -left-32 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-80 h-80 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative p-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div>
            <h3 className="text-sm font-black text-white tracking-tight">Interactive Knowledge Graph v2.0</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Hover nodes to trace evidence paths · click contradictions for XAI · click any other node to open evidence drawer.
            </p>
          </div>
          <div className="hidden lg:flex items-center gap-2.5 text-[10.5px] font-bold flex-wrap">
            {(['company', 'document', 'claim', 'metric', 'period', 'evidence', 'contradiction'] as KGNodeType[]).map((t) => (
              <LegendItem key={t} type={t} />
            ))}
          </div>
        </div>

        {openBreadcrumb && (
          <div className="mb-4 flex items-center gap-2 flex-wrap px-4 py-2.5 rounded-xl border border-sky-400/20 bg-sky-500/5 backdrop-blur">
            <span className="text-[10px] font-black uppercase tracking-wider text-sky-300">Evidence Trail</span>
            {openBreadcrumb.breadcrumb?.map((step, i) => (
              <React.Fragment key={i}>
                {i > 0 && <ChevronRight className="w-3 h-3 text-slate-500" />}
                <span
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-white/10"
                  style={{ background: `${NODE_STYLES[step.type].fill}`, borderColor: `${NODE_STYLES[step.type].stroke}50` }}
                >
                  <TypeIconMini type={step.type} />
                  <span className="text-[11px] font-bold" style={{ color: NODE_STYLES[step.type].textFill }}>
                    {step.label}
                  </span>
                </span>
              </React.Fragment>
            ))}
            <button
              onClick={() => setOpenBreadcrumb(null)}
              className="ml-auto p-1 rounded-md hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
              aria-label="Close breadcrumb"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <div className="mb-3 flex flex-wrap items-center gap-2.5 p-3 rounded-xl border border-white/5 bg-slate-950/60 backdrop-blur">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search nodes by label…"
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-white/10 bg-slate-900/60 text-[12px] text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/40 transition-all"
            />
          </div>

          <div className="flex items-center gap-1 p-1 rounded-lg border border-white/10 bg-slate-900/40">
            <button
              onClick={handleZoomOut}
              className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Zoom out"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="px-2 text-[11px] font-bold text-slate-300 min-w-[38px] text-center tabular-nums">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              onClick={handleZoomIn}
              className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Zoom in"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <div className="w-px h-4 bg-white/10 mx-0.5" />
            <button
              onClick={handleZoomReset}
              className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Reset view"
              title="Reset View"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/10 bg-slate-900/40 cursor-pointer select-none group">
            <div className="relative">
              <input
                type="checkbox"
                checked={conflictOnly}
                onChange={(e) => setConflictOnly(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-8 h-4 rounded-full bg-slate-700 peer-checked:bg-rose-500/80 transition-colors" />
              <div className="absolute left-0.5 top-0.5 w-3 h-3 rounded-full bg-white transition-transform peer-checked:translate-x-4" />
            </div>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-300 group-hover:text-white transition-colors">
              <AlertTriangle className="w-3 h-3 text-rose-400" />
              Conflict Only
            </span>
          </label>

          <div className="relative">
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value as SeverityFilter)}
              className="appearance-none pl-3 pr-8 py-2 rounded-lg border border-white/10 bg-slate-900/60 text-[12px] font-bold text-white outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/40 transition-all cursor-pointer"
            >
              <option value="ALL">Severity: ALL</option>
              <option value="HIGH">Severity: HIGH</option>
              <option value="MED">Severity: MED</option>
              <option value="LOW">Severity: LOW</option>
            </select>
            <ChevronRight className="absolute right-2 top-1/2 -translate-y-1/2 rotate-90 w-3 h-3 text-slate-500 pointer-events-none" />
          </div>
        </div>

        <div className="rounded-xl border border-white/5 bg-slate-950/40 relative overflow-hidden">
          <svg viewBox={viewBox} className="w-full h-[460px] block" preserveAspectRatio="xMidYMid meet">
            <defs>
              <pattern id="grid-v2" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(148,163,184,0.08)" strokeWidth="1" />
              </pattern>
              <radialGradient id="contradictionGlowV2" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="rgba(244,63,94,0.45)" />
                <stop offset="100%" stopColor="rgba(244,63,94,0)" />
              </radialGradient>
              <filter id="softGlowV2" x="-150%" y="-150%" width="400%" height="400%">
                <feGaussianBlur stdDeviation="4.5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <filter id="strongPulseV2" x="-200%" y="-200%" width="500%" height="500%">
                <feGaussianBlur stdDeviation="8" result="pblur" />
                <feMerge>
                  <feMergeNode in="pblur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            <rect x="0" y="0" width={BASE_VB_W} height={BASE_VB_H} fill="url(#grid-v2)" />

            {visibleEdges.map((e, i) => {
              const from = nodeMap.get(e.from);
              const to = nodeMap.get(e.to);
              if (!from || !to) return null;
              const active = edgeRelevant(e);
              const highlighted = e.highlighted || (hovered && (e.from === hovered || e.to === hovered));
              return (
                <line
                  key={`e-${i}`}
                  x1={from.x}
                  y1={from.y}
                  x2={to.x}
                  y2={to.y}
                  stroke={highlighted ? '#F43F5E' : '#475569'}
                  strokeWidth={highlighted ? 2.5 : 1.5}
                  strokeDasharray={highlighted ? '0' : '5 4'}
                  opacity={active ? (highlighted ? 0.95 : 0.55) : 0.18}
                  style={{ transition: 'opacity 240ms ease, stroke 240ms ease' }}
                />
              );
            })}

            {visibleNodes.map((n) => {
              const rawType: KGNodeType = (n.type === 'entity' || n.type === 'vendor') ? 'company' : (n.type as KGNodeType);
              const style = NODE_STYLES[rawType];
              const isContradiction = rawType === 'contradiction';
              const sev = n.severity ? SEV_RING[n.severity] : null;
              const hoveredOrNeighbor = nodeRelevant(n);
              const w = nodeWidth(rawType);
              const h = nodeHeight(rawType);
              const discMatch = relatedDiscrepancy(n);

              return (
                <g
                  key={n.id}
                  transform={`translate(${n.x}, ${n.y})`}
                  className="cursor-pointer"
                  onMouseEnter={() => setHovered(n.id)}
                  onMouseLeave={() => setHovered(null)}
                  onClick={() => handleNodeClick(n)}
                  style={{
                    transition: 'transform 240ms ease, opacity 240ms ease',
                    opacity: hoveredOrNeighbor ? 1 : 0.3,
                    transformOrigin: `${n.x}px ${n.y}px`,
                  }}
                >
                  {isContradiction && (
                    <circle
                      r={h * 0.9}
                      fill="url(#contradictionGlowV2)"
                      className="animate-pulse"
                      opacity={0.9}
                    />
                  )}
                  {sev && hovered === n.id && (
                    <circle r={Math.max(w, h) * 0.75} fill={sev.glow} filter="url(#softGlowV2)" />
                  )}
                  {!sev && hovered === n.id && !isContradiction && (
                    <circle r={Math.max(w, h) * 0.7} fill={style.glow} opacity={0.5} filter="url(#softGlowV2)" />
                  )}

                  <NodeShapeRenderer type={rawType} w={w} h={h} style={style} sevStroke={sev?.stroke} hovered={hovered === n.id} />

                  <text
                    fill={style.textFill}
                    fontSize="10.5"
                    fontWeight={800}
                    textAnchor="middle"
                    dy={n.sublabel ? '-1' : '4'}
                  >
                    {truncate(n.label, 14)}
                  </text>
                  {n.sublabel && (
                    <text
                      fill={sev ? sev.stroke : style.subFill}
                      fontSize="8.5"
                      fontWeight={700}
                      textAnchor="middle"
                      dy="11"
                    >
                      {truncate(n.sublabel, 18)}
                    </text>
                  )}
                  {isContradiction && (
                    <text
                      fill="#FDA4AF"
                      fontSize="7.5"
                      fontWeight={800}
                      textAnchor="middle"
                      dy={n.sublabel ? 22 : 18}
                      style={{ letterSpacing: '0.05em' }}
                    >
                      CLICK · XAI
                    </text>
                  )}
                </g>
              );
            })}
          </svg>

          {visibleNodes.length <= 3 && (
            <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between px-3 py-2 rounded-lg bg-slate-900/70 border border-white/5 backdrop-blur">
              <p className="text-[10.5px] text-slate-400 font-semibold">
                Filters applied — showing {visibleNodes.length} of {nodes.length} nodes. Clear filters to reveal the evidence network.
              </p>
              <span className="inline-flex items-center gap-1 text-[10px] font-black text-indigo-300">
                Live
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              </span>
            </div>
          )}
        </div>

        <div className="mt-5">
          <HistoricalTimeline points={TIMELINE_SAMPLE} />
        </div>

        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
          <MiniStat label="Nodes" value={String(visibleNodes.length)} accent="text-indigo-300" />
          <MiniStat label="Relations" value={String(visibleEdges.length)} accent="text-sky-300" />
          <MiniStat
            label="Conflicts"
            value={String(visibleNodes.filter((n) => {
              const t = (n.type === 'entity' || n.type === 'vendor') ? 'company' : n.type;
              return t === 'contradiction';
            }).length)}
            accent="text-rose-300"
          />
          <MiniStat
            label="High/Critical"
            value={String(visibleNodes.filter((n) => n.severity === 'High' || n.severity === 'Critical').length)}
            accent="text-amber-300"
          />
        </div>
      </div>
    </div>
  );
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}

function NodeShapeRenderer({
  type,
  w,
  h,
  style,
  sevStroke,
  hovered,
}: {
  type: KGNodeType;
  w: number;
  h: number;
  style: NodeStyleSpec;
  sevStroke?: string;
  hovered: boolean;
}) {
  const stroke = sevStroke ?? style.stroke;
  const strokeW = parseFloat(style.strokeWidth) + (hovered ? 0.5 : 0);
  const hw = w / 2;
  const hh = h / 2;

  switch (style.shape) {
    case 'hexagon':
      return (
        <path
          d={shapePath('hexagon', w, h)}
          fill={style.fill}
          stroke={stroke}
          strokeWidth={strokeW}
          style={{ transition: 'stroke 240ms ease, stroke-width 240ms ease' }}
        />
      );
    case 'roundedRect':
      return (
        <rect
          x={-hw}
          y={-hh}
          width={w}
          height={h}
          rx={10}
          ry={10}
          fill={style.fill}
          stroke={stroke}
          strokeWidth={strokeW}
          style={{ transition: 'stroke 240ms ease, stroke-width 240ms ease' }}
        />
      );
    case 'tag':
      return (
        <path
          d={shapePath('tag', w, h)}
          fill={style.fill}
          stroke={stroke}
          strokeWidth={strokeW}
          style={{ transition: 'stroke 240ms ease, stroke-width 240ms ease' }}
        />
      );
    case 'circle':
      return (
        <circle
          r={Math.min(w, h) / 2}
          fill={style.fill}
          stroke={stroke}
          strokeWidth={strokeW}
          style={{ transition: 'stroke 240ms ease, stroke-width 240ms ease, r 240ms ease' }}
        />
      );
    case 'diamond':
      return (
        <path
          d={shapePath('diamond', w, h)}
          fill={style.fill}
          stroke={stroke}
          strokeWidth={strokeW}
          style={{ transition: 'stroke 240ms ease, stroke-width 240ms ease' }}
        />
      );
    case 'rect':
      return (
        <rect
          x={-hw}
          y={-hh}
          width={w}
          height={h}
          rx={4}
          ry={4}
          fill={style.fill}
          stroke={stroke}
          strokeWidth={strokeW}
          style={{ transition: 'stroke 240ms ease, stroke-width 240ms ease' }}
        />
      );
    case 'star':
      return (
        <path
          d={shapePath('star', w, h)}
          fill={style.fill}
          stroke={stroke}
          strokeWidth={strokeW}
          strokeLinejoin="round"
          style={{ transition: 'stroke 240ms ease, stroke-width 240ms ease' }}
        />
      );
  }
}

function TypeIconMini({ type }: { type: KGNodeType }) {
  const cls = 'w-3 h-3';
  const style = { color: NODE_STYLES[type].stroke };
  switch (type) {
    case 'company': return <Building2 className={cls} style={style} />;
    case 'document': return <FileText className={cls} style={style} />;
    case 'claim': return <Tag className={cls} style={style} />;
    case 'metric': return <CircleDot className={cls} style={style} />;
    case 'period': return <Diamond className={cls} style={style} />;
    case 'evidence': return <Square className={cls} style={style} />;
    case 'contradiction': return <Star className={cls} style={style} />;
  }
}

function LegendItem({ type }: { type: KGNodeType }) {
  const style = NODE_STYLES[type];
  return (
    <div className="flex items-center gap-1.5 text-slate-400 px-2 py-1 rounded-md hover:bg-white/5 transition-colors">
      <span
        className="w-3 h-3 inline-flex items-center justify-center rounded-sm"
        style={{ background: style.fill, border: `1px solid ${style.stroke}` }}
      >
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: style.stroke }} />
      </span>
      <span className="text-[10px] font-bold">{style.label}</span>
    </div>
  );
}

function MiniStat({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.03] px-3.5 py-2.5">
      <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">{label}</p>
      <p className={`text-lg font-black mt-0.5 ${accent}`}>{value}</p>
    </div>
  );
}

interface HistoricalTimelineProps {
  points: TimelinePoint[];
}

function HistoricalTimeline({ points }: HistoricalTimelineProps) {
  const SVG_W = 1040;
  const SVG_H = 170;
  const PAD_X = 80;
  const PAD_TOP = 36;
  const PAD_BOTTOM = 54;

  const deltas = useMemo(() => {
    const arr: Array<{ value: number; pct: number; label: string; direction: 'up' | 'down' | 'flat' }> = [];
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1].value;
      const cur = points[i].value;
      const diff = cur - prev;
      const pct = prev === 0 ? 0 : (diff / prev) * 100;
      const direction: 'up' | 'down' | 'flat' = diff > 0 ? 'up' : diff < 0 ? 'down' : 'flat';
      const sign = diff > 0 ? '+' : '';
      const formatted = formatCompact(Math.abs(diff), points[i].unit);
      arr.push({ value: diff, pct, label: `${sign}${formatted} (${sign}${pct.toFixed(1)}%)`, direction });
    }
    return arr;
  }, [points]);

  if (points.length === 0) return null;

  const values = points.map((p) => p.value);
  const minV = Math.min(...values);
  const maxV = Math.max(...values);
  const range = maxV - minV || 1;
  const innerW = SVG_W - PAD_X * 2;
  const innerH = SVG_H - PAD_TOP - PAD_BOTTOM;

  const xAt = (i: number) => PAD_X + (points.length === 1 ? innerW / 2 : (i * innerW) / (points.length - 1));
  const yAt = (v: number) => PAD_TOP + innerH - ((v - minV) / range) * innerH;

  return (
    <div className="rounded-xl border border-white/5 bg-gradient-to-br from-slate-950/60 via-slate-900/40 to-slate-950/60 p-4 backdrop-blur">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
          <h4 className="text-[11px] font-black text-white uppercase tracking-wider">Historical Timeline · Revenue Trend</h4>
        </div>
        <div className="flex items-center gap-3 text-[10px]">
          <span className="inline-flex items-center gap-1 text-emerald-400 font-bold"><TrendingUp className="w-3 h-3" /> Increase</span>
          <span className="inline-flex items-center gap-1 text-rose-400 font-bold"><TrendingDown className="w-3 h-3" /> Decrease</span>
          <span className="inline-flex items-center gap-1 text-slate-400 font-bold"><Minus className="w-3 h-3" /> Flat</span>
        </div>
      </div>

      <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} className="w-full h-[170px] block">
        <defs>
          <linearGradient id="tlLineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.8" />
            <stop offset="50%" stopColor="#8B5CF6" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#38BDF8" stopOpacity="0.8" />
          </linearGradient>
          <linearGradient id="tlAreaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
          </linearGradient>
          <filter id="tlGlow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="3" />
            <feMerge>
              <feMergeNode />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {[0, 0.25, 0.5, 0.75, 1].map((t, i) => {
          const y = PAD_TOP + innerH * (1 - t);
          const v = minV + range * t;
          return (
            <g key={`grid-${i}`}>
              <line
                x1={PAD_X}
                y1={y}
                x2={SVG_W - PAD_X}
                y2={y}
                stroke="rgba(148,163,184,0.08)"
                strokeWidth="1"
                strokeDasharray="3 3"
              />
              <text
                x={PAD_X - 10}
                y={y + 3}
                fill="rgba(148,163,184,0.5)"
                fontSize="8.5"
                fontWeight={600}
                textAnchor="end"
              >
                {formatCompact(v, points[0].unit)}
              </text>
            </g>
          );
        })}

        {points.length > 1 && (
          <path
            d={(() => {
              let d = `M ${xAt(0)} ${SVG_H - PAD_BOTTOM}`;
              points.forEach((p, i) => {
                d += ` L ${xAt(i)} ${yAt(p.value)}`;
              });
              d += ` L ${xAt(points.length - 1)} ${SVG_H - PAD_BOTTOM} Z`;
              return d;
            })()}
            fill="url(#tlAreaGrad)"
            opacity={0.7}
          />
        )}

        {points.slice(0, -1).map((p, i) => {
          const x1 = xAt(i);
          const y1 = yAt(p.value);
          const x2 = xAt(i + 1);
          const y2 = yAt(points[i + 1].value);
          const delta = deltas[i];
          const color = delta.direction === 'up' ? '#34D399' : delta.direction === 'down' ? '#F43F5E' : '#94A3B8';
          const mx = (x1 + x2) / 2;
          const my = (y1 + y2) / 2 - 12;
          return (
            <g key={`seg-${i}`}>
              <line
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="url(#tlLineGrad)"
                strokeWidth="2.5"
                strokeLinecap="round"
                filter="url(#tlGlow)"
              />
              <g transform={`translate(${mx}, ${my})`}>
                <rect
                  x={-44}
                  y={-10}
                  width={88}
                  height={20}
                  rx={6}
                  fill="rgba(15,23,42,0.85)"
                  stroke={`${color}40`}
                  strokeWidth="1"
                />
                <g transform="translate(-36, 0)">
                  {delta.direction === 'up' && <TrendingUp style={{ color }} width={9} height={9} y={-4.5} />}
                  {delta.direction === 'down' && <TrendingDown style={{ color }} width={9} height={9} y={-4.5} />}
                  {delta.direction === 'flat' && <Minus style={{ color }} width={9} height={9} y={-4.5} />}
                </g>
                <text
                  x={6}
                  y={3}
                  fontSize="8.5"
                  fontWeight={800}
                  fill={color}
                  textAnchor="middle"
                >
                  {delta.label}
                </text>
              </g>
            </g>
          );
        })}

        {points.map((p, i) => {
          const x = xAt(i);
          const y = yAt(p.value);
          return (
            <g key={`pt-${i}`} transform={`translate(${x}, ${y})`}>
              <circle r={16} fill="#0F172A" opacity={0.85} stroke="#F59E0B" strokeWidth="1.5" />
              <circle r={5} fill="#F59E0B" filter="url(#tlGlow)" />
              <text
                y={-22}
                fill="#FEF3C7"
                fontSize="10"
                fontWeight={900}
                textAnchor="middle"
              >
                {p.label}
              </text>
              <text
                y={32}
                fill="#FBBF24"
                fontSize="9.5"
                fontWeight={800}
                textAnchor="middle"
              >
                {p.period}
              </text>
              <text
                y={46}
                fill="#94A3B8"
                fontSize="8"
                fontWeight={600}
                textAnchor="middle"
              >
                {p.metric}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function formatCompact(value: number, unit: string): string {
  const abs = Math.abs(value);
  let numStr: string;
  if (abs >= 1e9) numStr = `${(value / 1e9).toFixed(1)}B`;
  else if (abs >= 1e6) numStr = `${(value / 1e6).toFixed(1)}M`;
  else if (abs >= 1e3) numStr = `${(value / 1e3).toFixed(1)}K`;
  else numStr = value.toFixed(0);
  if (unit === 'USD') return `$${numStr}`;
  if (unit === 'percent' || unit === 'pp') return `${numStr}%`;
  return `${numStr}${unit ? ' ' + unit : ''}`;
}
