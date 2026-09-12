'use client';
import React, { useMemo } from 'react';
import { Check, X, AlertTriangle, Clock, FileText, ShieldCheck } from 'lucide-react';
import type {
  Claim, Unit, ContradictionStatus, AxisResult, EvidenceSnippet,
} from '../../types';

export function normalizeClaim(rawText: string, context: Partial<Claim> = {}): Claim {
  const text = rawText.trim();
  const lower = text.toLowerCase();

  const entity = context.entity || extractEntity(text) || 'OmniVise Holdings';
  let metric = context.metric || extractMetric(text);
  let unit: Unit = context.unit || extractUnit(text, lower);
  let value = context.value ?? extractNumericValue(text, unit);
  let period = context.period || extractPeriod(text, lower);
  const sourceDoc = context.sourceDoc || '';
  const pageTimestamp = context.pageTimestamp || '';
  const speaker = context.speaker || '';

  if (unit === 'USD' && value > 0 && value < 10_000) {
    if (lower.includes('b') || lower.includes('billion')) value = value * 1_000_000_000;
    else if (lower.includes('m') || lower.includes('million')) value = value * 1_000_000;
    else if (lower.includes('k') || lower.includes('thousand')) value = value * 1_000;
  }
  if (lower.includes('non-gaap')) metric = `${metric} (Non-GAAP)`;

  return {
    entity, metric, value, unit, period, sourceDoc, pageTimestamp, speaker,
    accountingStandard: context.accountingStandard ||
      (lower.includes('non-gaap') ? 'Non-GAAP' : lower.includes('gaap') ? 'GAAP' : undefined),
    id: context.id,
  };
}

function extractEntity(text: string): string {
  const m = text.match(/(?:OmniVise|Nexus|Atlas|Meridian|Vertex|Holdings|Semiconductor|Cloud|Logistics|Analytics)[A-Za-z &.,]*/);
  return m ? m[0].replace(/[.,]$/, '').trim() : '';
}

function extractMetric(text: string): string {
  const t = text.toLowerCase();
  if (t.includes('revenue') || t.includes('rev ')) return 'Revenue';
  if (t.includes('operating margin') || t.includes('op margin')) return 'Operating Margin';
  if (t.includes('gross margin') || t.includes('gross profit')) return 'Gross Margin';
  if (t.includes('net income')) return 'Net Income';
  if (t.includes('ebitda')) return 'EBITDA';
  if (t.includes('earnings per share') || t.includes('eps')) return 'EPS';
  if (t.includes('total amount') || t.includes('total')) return 'Total Amount';
  return 'Financial Metric';
}

function extractUnit(_text: string, lower: string): Unit {
  if (lower.includes('%') || lower.includes('percent') || lower.includes('margin')) return 'percent';
  if (lower.includes('€') || lower.includes('eur') || lower.includes('euro')) return 'EUR';
  if (lower.includes('pp') || lower.includes('basis point') || lower.includes('bps')) return 'pp';
  if (lower.includes('ratio')) return 'ratio';
  if (lower.includes('count') || lower.includes('units shipped')) return 'count';
  return 'USD';
}

function extractNumericValue(text: string, unit: Unit): number {
  const cleaned = text
    .replace(/\$\s*/g, '')
    .replace(/€\s*/g, '')
    .replace(/,/g, '')
    .replace(/%/g, '');
  const numMatch = cleaned.match(/\d+(?:\.\d+)?/);
  if (!numMatch) return 0;
  const base = parseFloat(numMatch[0]);
  if (unit === 'USD') {
    const lower = text.toLowerCase();
    if (lower.includes('b') && /\d[\d.]*\s*b/i.test(text)) return base * 1_000_000_000;
    if (lower.includes('m') && /\d[\d.]*\s*m/i.test(text)) return base * 1_000_000;
    if (lower.includes('k') && /\d[\d.]*\s*k/i.test(text)) return base * 1_000;
  }
  return base;
}

function extractPeriod(text: string, lower: string): string {
  const q = lower.match(/q([1-4])/);
  const y = text.match(/20\d{2}/);
  const year = y ? y[0] : 'FY2026';
  if (q) return `Q${q[1]} FY${year}`;
  const m = lower.match(/(january|february|march|april|may|june|july|august|september|october|november|december|q[1-4])\s+(20\d{2})?/);
  if (m) return `${m[0].trim()} ${year}`;
  const half = lower.match(/h([12])/);
  if (half) return `H${half[1]} ${year}`;
  return `FY${year}`;
}

export function verify6Axis(a: Claim, b: Claim): AxisResult[] {
  return [
    {
      axis: 'Entity',
      pass: normalizeEntity(a.entity) === normalizeEntity(b.entity),
      note: a.entity === b.entity ? 'Same reporting entity' : `"${a.entity}" vs "${b.entity}" — verify consolidation scope`,
    },
    {
      axis: 'Metric',
      pass: fuzzyMetricMatch(a.metric, b.metric),
      note: metricMatchNote(a.metric, b.metric),
    },
    {
      axis: 'Period',
      pass: a.period === b.period,
      note: a.period === b.period ? `Same reporting window (${a.period})` : `${a.period} vs ${b.period} — different period may be intentional`,
    },
    {
      axis: 'Currency/Unit',
      pass: a.unit === b.unit && sameCurrencyScope(a, b),
      note: a.unit === b.unit ? `Unit aligned (${a.unit})` : `Unit mismatch: ${a.unit} vs ${b.unit}`,
    },
    {
      axis: 'Accounting Definition',
      pass: (a.accountingStandard || 'GAAP') === (b.accountingStandard || 'GAAP'),
      note: `Def: ${a.accountingStandard || 'GAAP (inferred)'} vs ${b.accountingStandard || 'GAAP (inferred)'}`,
    },
    {
      axis: 'Age/Outdated',
      pass: !isOutdated(a, b),
      note: isOutdated(a, b) ? `One source is >90 days older; may be superseded filing` : `Both sources within same cadence`,
    },
  ];
}

function normalizeEntity(e: string): string {
  return e.toLowerCase()
    .replace(/holdings|inc\.?|ltd\.?|llc|co\.?|corp\.?|corporation|semiconductor|/g, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

function fuzzyMetricMatch(a: string, b: string): boolean {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '').replace(/nongaap|gaap/g, '');
  return norm(a) === norm(b) || norm(a).includes(norm(b)) || norm(b).includes(norm(a));
}

function metricMatchNote(a: string, b: string): string {
  if (a === b) return `Metric: ${a}`;
  return `Metric comparison: "${a}" vs "${b}" — cross-check SKU / accounting label`;
}

function sameCurrencyScope(a: Claim, b: Claim): boolean {
  if (a.unit === 'USD' && b.unit === 'USD') return true;
  return a.unit === b.unit;
}

function isOutdated(a: Claim, b: Claim): boolean {
  const parseQ = (p: string) => {
    const q = p.match(/Q([1-4])/); const y = p.match(/20(\d{2})/);
    if (!q || !y) return null;
    return (parseInt(y[1]) * 4) + parseInt(q[1]);
  };
  const aq = parseQ(a.period); const bq = parseQ(b.period);
  if (aq && bq && Math.abs(aq - bq) > 3) return true;
  return false;
}

export function classifyContradiction(
  a: Claim, b: Claim, axisResults: AxisResult[],
): ContradictionStatus {
  const failed = axisResults.filter((r) => !r.pass);
  if (failed.length === 0) {
    const delta = Math.abs(a.value - b.value);
    const pct = delta / (Math.max(Math.abs(a.value), Math.abs(b.value), 0.0001));
    if (pct < 0.005) return 'MATCH';
    if (pct < 0.02) return 'POSSIBLE CONFLICT';
    return 'CONTRADICTION';
  }
  const failedAxes = new Set(failed.map((f) => f.axis));
  if (failedAxes.has('Age/Outdated')) return 'OUTDATED';
  if (failedAxes.has('Accounting Definition')) return 'DIFFERENT DEFINITION';
  if (failedAxes.has('Period')) return 'OUTDATED';
  if (failed.length === 1) return 'POSSIBLE CONFLICT';
  return 'CONTRADICTION';
}

export function computeSeverity(
  a: Claim, b: Claim, status: ContradictionStatus,
  materialityThreshold: number = 10000,
): 'HIGH' | 'MED' | 'LOW' {
  if (status === 'MATCH') return 'LOW';
  const delta = Math.abs(a.value - b.value);
  const base = Math.max(Math.abs(a.value), Math.abs(b.value), 0.0001);
  const pct = (delta / base) * 100;
  if (delta >= 1_000_000 || pct > 5 || delta >= materialityThreshold * 100) return 'HIGH';
  if (pct > 2 || delta >= materialityThreshold) return 'MED';
  return 'LOW';
}

export function buildReasoning(
  a: Claim, b: Claim, status: ContradictionStatus, severity: 'HIGH' | 'MED' | 'LOW',
): string {
  const delta = b.value - a.value;
  const pct = (delta / Math.max(Math.abs(a.value), 0.0001)) * 100;
  const deltaFmt = formatValue(delta, a.unit, true);
  const pctFmt = `${pct.toFixed(1)}%`;
  const base = `OmniVise compared two claims for ${a.metric} over ${a.period}. `;
  switch (status) {
    case 'MATCH':
      return `${base}Claimed ${formatValue(a.value, a.unit)} matches reported ${formatValue(b.value, a.unit)} within the 0.5% tolerance window. No material variance detected.`;
    case 'POSSIBLE CONFLICT':
      return `${base}A minor delta of ${deltaFmt} (${pctFmt}) exists between the ${a.sourceDoc || 'executive claim'} (${formatValue(a.value, a.unit)}) and the ${b.sourceDoc || 'audited filing'} (${formatValue(b.value, a.unit)}). Severity is ${severity} because the delta is below the primary materiality threshold, but manual reconciliation is recommended before sign-off.`;
    case 'CONTRADICTION':
      return `${base}The claims diverge materially. Claimed value was ${formatValue(a.value, a.unit)} in "${a.sourceDoc || a.metric}" (${a.speaker || 'Executive'}), while the audited figure is ${formatValue(b.value, a.unit)} — a ${deltaFmt} (${pctFmt}) variance. Classification: ${severity}. Cross-check the referenced evidence snippets below to confirm whether this is a timing difference or a genuine misstatement.`;
    case 'OUTDATED':
      return `${base}The two sources reference different reporting periods: ${a.period} vs ${b.period}. The older claim should not be used as the current-period figure; re-run matching against the same-quarter filing.`;
    case 'DIFFERENT DEFINITION':
      return `${base}The figures use different accounting conventions (${a.accountingStandard || 'GAAP'} vs ${b.accountingStandard || 'Non-GAAP'}). This is expected when management presents a non-GAAP adjusted metric alongside the GAAP audited filing; verify a reconciliation line exists in the 10-Q footnotes.`;
  }
}

export function buildEvidenceSnippets(a: Claim, b: Claim): [EvidenceSnippet, EvidenceSnippet] {
  const build = (c: Claim, side: 'Claimed' | 'Audited'): EvidenceSnippet => {
    const valStr = formatValue(c.value, c.unit);
    const quoted = `“${c.metric} reached ${valStr} for ${c.period}${c.speaker ? `,” stated ${c.speaker}.` : '.”'}`;
    return {
      documentName: c.sourceDoc || `${side} Source Document`,
      pageOrTimestamp: c.pageTimestamp || (side === 'Claimed' ? 'Earnings Call 12:43' : 'Filing Page 47'),
      section: c.accountingStandard
        ? `${c.accountingStandard} Financial Statements · Note 3`
        : (side === 'Claimed' ? 'Prepared Remarks — Business Outlook' : 'Consolidated Statements of Operations'),
      quotedText: quoted,
      speaker: c.speaker || (side === 'Claimed' ? 'CEO / CFO' : 'External Auditor'),
      confidence: 0.94,
      timestamp: new Date().toLocaleDateString(),
      highlightStart: quoted.indexOf(valStr),
      highlightEnd: quoted.indexOf(valStr) + valStr.length,
    };
  };
  return [build(a, 'Claimed'), build(b, 'Audited')];
}

export function formatValue(v: number, unit: Unit, signed = false): string {
  const sign = signed && v > 0 ? '+' : (signed && v < 0 ? '-' : '');
  const abs = Math.abs(v);
  switch (unit) {
    case 'USD':
    case 'EUR': {
      const sym = unit === 'EUR' ? '€' : '$';
      if (abs >= 1_000_000_000) return `${sign}${sym}${(abs / 1_000_000_000).toFixed(1)}B`;
      if (abs >= 1_000_000) return `${sign}${sym}${(abs / 1_000_000).toFixed(1)}M`;
      if (abs >= 1_000) return `${sign}${sym}${(abs / 1_000).toFixed(1)}K`;
      return `${sign}${sym}${abs.toFixed(0)}`;
    }
    case 'percent': return `${sign}${abs.toFixed(1)}%`;
    case 'pp': return `${sign}${abs.toFixed(1)} pp`;
    case 'ratio': return `${sign}${abs.toFixed(2)}x`;
    case 'count': return `${sign}${abs.toLocaleString()}`;
  }
}

interface ContradictionEngineProps {
  claimA: Claim;
  claimB: Claim;
  materialityThreshold?: number;
}

export default function ContradictionEngine({ claimA, claimB, materialityThreshold = 10000 }: ContradictionEngineProps) {
  const analysis = useMemo(() => {
    const axes = verify6Axis(claimA, claimB);
    const status = classifyContradiction(claimA, claimB, axes);
    const severity = computeSeverity(claimA, claimB, status, materialityThreshold);
    const reasoning = buildReasoning(claimA, claimB, status, severity);
    return { axes, status, severity, reasoning };
  }, [claimA, claimB, materialityThreshold]);

  const statusColor: Record<ContradictionStatus, string> = {
    'MATCH': 'bg-emerald-500/15 text-emerald-300 border-emerald-400/25',
    'POSSIBLE CONFLICT': 'bg-sky-500/15 text-sky-300 border-sky-400/25',
    'CONTRADICTION': 'bg-rose-500/15 text-rose-300 border-rose-400/25',
    'OUTDATED': 'bg-amber-500/15 text-amber-300 border-amber-400/25',
    'DIFFERENT DEFINITION': 'bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-400/25',
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-3.5 h-3.5 text-indigo-300" />
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Claim A — Executive</span>
          </div>
          <p className="text-xs font-bold text-white">{claimA.metric}</p>
          <p className="text-[11px] text-slate-400 mt-1">
            {claimA.entity} · {claimA.period} · {formatValue(claimA.value, claimA.unit)}
          </p>
        </div>
        <div className="rounded-xl border border-rose-400/20 bg-rose-500/[0.04] p-3">
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheck className="w-3.5 h-3.5 text-rose-300" />
            <span className="text-[10px] font-black uppercase tracking-wider text-rose-300">Claim B — Audited</span>
          </div>
          <p className="text-xs font-bold text-white">{claimB.metric}</p>
          <p className="text-[11px] text-rose-300/90 mt-1">
            {claimB.entity} · {claimB.period} · {formatValue(claimB.value, claimB.unit)}
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">6-Axis Context Verification</span>
          <span className={`px-2 py-0.5 rounded-full border text-[10px] font-black ${statusColor[analysis.status]}`}>
            {analysis.status}
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {analysis.axes.map((r) => (
            <div key={r.axis} className={`flex items-start gap-2.5 rounded-lg border px-3 py-2.5 ${
              r.pass ? 'bg-emerald-500/[0.04] border-emerald-400/15' : 'bg-rose-500/[0.04] border-rose-400/15'
            }`}>
              <span className={`mt-0.5 w-5 h-5 rounded-md shrink-0 flex items-center justify-center ${
                r.pass ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
              }`}>
                {r.axis === 'Age/Outdated' ? (r.pass ? <Check className="w-3 h-3" /> : <Clock className="w-3 h-3" />)
                  : r.axis === 'Accounting Definition' ? (r.pass ? <Check className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />)
                  : (r.pass ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />)}
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-black text-white">{r.axis}</p>
                <p className="text-[10px] text-slate-400 mt-0.5 leading-snug">{r.note}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-indigo-400/20 bg-gradient-to-br from-indigo-500/10 via-indigo-500/5 to-transparent p-4">
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle className="w-3.5 h-3.5 text-indigo-300" />
          <span className="text-[10px] font-black uppercase tracking-wider text-indigo-300">XAI Reasoning · {analysis.severity} severity</span>
        </div>
        <p className="text-xs leading-relaxed text-slate-100 font-medium">{analysis.reasoning}</p>
      </div>
    </div>
  );
}
