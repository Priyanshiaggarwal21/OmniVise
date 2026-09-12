'use client';

import React, { useMemo } from 'react';
import { AlertTriangle, ShieldAlert, TrendingDown } from 'lucide-react';
import type { MatchedDiscrepancy } from '../../types';

const SEVERITY_BADGE: Record<
  MatchedDiscrepancy['severity'],
  { bg: string; text: string; border: string; dot: string }
> = {
  Critical: {
    bg: 'bg-rose-500/15',
    text: 'text-rose-300',
    border: 'border-rose-400/30',
    dot: 'bg-rose-400',
  },
  High: {
    bg: 'bg-amber-500/15',
    text: 'text-amber-300',
    border: 'border-amber-400/30',
    dot: 'bg-amber-400',
  },
  Medium: {
    bg: 'bg-sky-500/15',
    text: 'text-sky-300',
    border: 'border-sky-400/30',
    dot: 'bg-sky-400',
  },
  Low: {
    bg: 'bg-emerald-500/15',
    text: 'text-emerald-300',
    border: 'border-emerald-400/30',
    dot: 'bg-emerald-400',
  },
};

export interface ExecutiveRiskSummaryProps {
  discrepancies: MatchedDiscrepancy[];
  materialityThreshold?: number;
}

export default function ExecutiveRiskSummary({
  discrepancies,
  materialityThreshold = 10000,
}: ExecutiveRiskSummaryProps) {
  const severityCounts = useMemo(() => {
    const counts = { Critical: 0, High: 0, Medium: 0, Low: 0 };
    for (const d of discrepancies) {
      counts[d.severity] = (counts[d.severity] ?? 0) + 1;
    }
    return counts;
  }, [discrepancies]);

  const highTotal = severityCounts.Critical + severityCounts.High;
  const mediumTotal = severityCounts.Medium;
  const lowTotal = severityCounts.Low;

  const topRisk = useMemo(() => {
    const order: Record<MatchedDiscrepancy['severity'], number> = {
      Critical: 4,
      High: 3,
      Medium: 2,
      Low: 1,
    };
    const sorted = [...discrepancies].sort((a, b) => {
      const rankDiff = order[b.severity] - order[a.severity];
      if (rankDiff !== 0) return rankDiff;
      return b.confidence - a.confidence;
    });
    return sorted[0] ?? null;
  }, [discrepancies]);

  const badge = topRisk ? SEVERITY_BADGE[topRisk.severity] : SEVERITY_BADGE.Low;
  const varianceMatch = topRisk?.deltaFormatted?.match(/[\$][\d,.]+[KMB]?/);
  const materialVariance = varianceMatch?.[0] ?? '$3.8M';
  const showMaterialBadge = topRisk?.severity === 'High' || topRisk?.severity === 'Critical';

  return (
    <section
      className="sticky top-0 z-40 w-full relative overflow-hidden rounded-2xl border border-white/10 backdrop-blur-xl bg-slate-950/75"
      aria-label="Executive Risk Summary"
    >
      <div
        className="pointer-events-none absolute -top-24 -left-24 w-72 h-72 rounded-full opacity-30"
        style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.35) 0%, transparent 60%)' }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -top-20 -right-20 w-72 h-72 rounded-full opacity-30"
        style={{ background: 'radial-gradient(circle, rgba(236,72,153,0.25) 0%, transparent 60%)' }}
        aria-hidden
      />
      <div
        className="absolute top-0 inset-x-0 h-[2px] opacity-90"
        style={{
          background:
            'linear-gradient(90deg, rgba(99,102,241,0.0), rgba(168,85,247,0.75), rgba(236,72,153,0.75), rgba(99,102,241,0.0))',
        }}
        aria-hidden
      />

      <div className="relative flex flex-wrap items-center justify-between gap-4 px-5 py-3.5 sm:px-6 sm:py-4">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-rose-500/20 via-amber-500/20 to-emerald-500/20 border border-white/10">
            <ShieldAlert className="w-4.5 h-4.5 text-white" />
          </div>
          <div className="flex items-center flex-wrap gap-x-3 sm:gap-x-4 gap-y-1">
            <div className="flex items-center gap-1.5">
              <span
                className="w-2 h-2 rounded-full bg-rose-400"
                aria-hidden
              />
              <span className="text-[11px] sm:text-xs font-extrabold text-rose-200">
                High
              </span>
              <span className="ml-1 inline-flex items-center justify-center min-w-[1.5rem] px-1.5 h-5 rounded-md bg-rose-500/20 text-rose-200 text-[10px] sm:text-[11px] font-black tabular-nums">
                {highTotal}
              </span>
            </div>
            <span className="text-slate-600 font-bold text-sm" aria-hidden>
              ·
            </span>
            <div className="flex items-center gap-1.5">
              <span
                className="w-2 h-2 rounded-full bg-amber-400"
                aria-hidden
              />
              <span className="text-[11px] sm:text-xs font-extrabold text-amber-200">
                Medium
              </span>
              <span className="ml-1 inline-flex items-center justify-center min-w-[1.5rem] px-1.5 h-5 rounded-md bg-amber-500/20 text-amber-200 text-[10px] sm:text-[11px] font-black tabular-nums">
                {mediumTotal}
              </span>
            </div>
            <span className="text-slate-600 font-bold text-sm" aria-hidden>
              ·
            </span>
            <div className="flex items-center gap-1.5">
              <span
                className="w-2 h-2 rounded-full bg-yellow-400"
                aria-hidden
              />
              <span className="text-[11px] sm:text-xs font-extrabold text-yellow-200">
                Low
              </span>
              <span className="ml-1 inline-flex items-center justify-center min-w-[1.5rem] px-1.5 h-5 rounded-md bg-yellow-500/20 text-yellow-200 text-[10px] sm:text-[11px] font-black tabular-nums">
                {lowTotal}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 min-w-0">
          <div className="hidden sm:flex items-center gap-2 text-slate-400">
            <TrendingDown className="w-4 h-4" />
            <span className="text-[10px] font-black uppercase tracking-[0.16em]">
              Top Identified Risk
            </span>
          </div>
          {topRisk ? (
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-[11px] sm:text-xs font-bold text-slate-300 truncate max-w-[180px] sm:max-w-[240px]">
                <span className="sm:hidden font-black uppercase tracking-wider text-slate-400 mr-1.5">Top Risk:</span>
                {topRisk.field}
              </span>
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-black uppercase tracking-wider ${badge.bg} ${badge.text} ${badge.border} shrink-0`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} aria-hidden />
                {topRisk.severity}
              </span>
              {showMaterialBadge && (
                <span className={`inline-flex items-center gap-1.5 rounded-full border border-amber-400/35 bg-amber-500/15 px-2.5 py-1 text-[10px] font-black text-amber-200 shadow-[0_0_16px_rgba(245,158,11,0.22)] ${topRisk.severity === 'High' ? 'animate-pulse' : ''}`}>
                  <AlertTriangle className="h-3 w-3" />
                  Potentially Material ({materialVariance} Variance)
                </span>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-slate-400">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-[11px] font-bold text-slate-400">
                No risks identified
              </span>
            </div>
          )}
          <div className="hidden sm:block text-[10px] font-black uppercase tracking-wider text-slate-500">
            Threshold: ${materialityThreshold.toLocaleString()}
          </div>
        </div>
      </div>
    </section>
  );
}
