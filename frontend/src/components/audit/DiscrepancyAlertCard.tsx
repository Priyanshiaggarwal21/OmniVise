'use client';

import React, { useMemo, useState } from 'react';
import {
  Check,
  X,
  Flag,
  ArrowUp,
  AlertTriangle,
  ShieldAlert,
  HelpCircle,
} from 'lucide-react';
import type {
  MatchedDiscrepancy,
  AuditDecision,
  UserRole,
  Unit,
} from '../../types';

const SEVERITY_STYLES: Record<
  MatchedDiscrepancy['severity'],
  { bg: string; text: string; border: string; ring: string }
> = {
  Critical: {
    bg: 'bg-rose-500/15',
    text: 'text-rose-300',
    border: 'border-rose-400/30',
    ring: 'ring-rose-400/40',
  },
  High: {
    bg: 'bg-amber-500/15',
    text: 'text-amber-300',
    border: 'border-amber-400/30',
    ring: 'ring-amber-400/40',
  },
  Medium: {
    bg: 'bg-sky-500/15',
    text: 'text-sky-300',
    border: 'border-sky-400/30',
    ring: 'ring-sky-400/40',
  },
  Low: {
    bg: 'bg-emerald-500/15',
    text: 'text-emerald-300',
    border: 'border-emerald-400/30',
    ring: 'ring-emerald-400/40',
  },
};

const CONFIDENCE_GRADIENT =
  'bg-gradient-to-r from-rose-500 via-amber-500 via-emerald-500 to-emerald-400';

function formatValue(v: string | number, unit: Unit = 'USD', signed = false): string {
  const sign = signed && typeof v === 'number' && v > 0 ? '+' : signed && typeof v === 'number' && v < 0 ? '-' : '';
  const abs = typeof v === 'number' ? Math.abs(v) : v;
  if (unit === 'USD' || unit === 'EUR') {
    const sym = unit === 'EUR' ? '€' : '$';
    if (typeof abs === 'number') {
      if (abs >= 1_000_000_000) return `${sign}${sym}${(abs / 1_000_000_000).toFixed(1)}B`;
      if (abs >= 1_000_000) return `${sign}${sym}${(abs / 1_000_000).toFixed(1)}M`;
      if (abs >= 1_000) return `${sign}${sym}${(abs / 1_000).toFixed(1)}K`;
      return `${sign}${sym}${abs.toFixed(0)}`;
    }
    return `${sign}${sym}${abs}`;
  }
  if (unit === 'percent') return `${sign}${abs}%`;
  return `${sign}${abs}`;
}

function parseNumeric(v: string | number): number {
  if (typeof v === 'number') return v;
  const cleaned = String(v).replace(/[^0-9.\-]/g, '');
  return cleaned ? parseFloat(cleaned) : 0;
}

export interface DiscrepancyAlertCardProps {
  discrepancy: MatchedDiscrepancy;
  role: UserRole;
  onAction: (decision: AuditDecision, discrepancyId: string) => void;
  onDismissClick?: () => void;
  unit?: Unit;
}

export default function DiscrepancyAlertCard({
  discrepancy,
  role,
  onAction,
  onDismissClick,
  unit = 'USD',
}: DiscrepancyAlertCardProps) {
  const [tooltipFor, setTooltipFor] = useState<string | null>(null);

  const isViewer = role === 'Viewer';

  const claimed = discrepancy.poValue;
  const audited = discrepancy.invoiceValue;
  const deltaNum = discrepancy.delta !== undefined ? parseNumeric(discrepancy.delta) : parseNumeric(audited) - parseNumeric(claimed);

  const { percentVariance, isMaterial } = useMemo(() => {
    const base = Math.max(Math.abs(parseNumeric(claimed)), Math.abs(parseNumeric(audited)), 0.0001);
    const pct = (deltaNum / base) * 100;
    const absDelta = Math.abs(deltaNum);
    const material = Math.abs(pct) > 5 || absDelta > 1_000_000;
    return { percentVariance: pct, isMaterial: material };
  }, [claimed, audited, deltaNum]);

  const sevStyle = SEVERITY_STYLES[discrepancy.severity];
  const deltaSign = deltaNum > 0 ? '+' : deltaNum < 0 ? '-' : '';
  const deltaAbsFormatted = discrepancy.deltaFormatted || formatValue(Math.abs(deltaNum), unit);
  const pctAbs = Math.abs(percentVariance);

  const actions: { key: AuditDecision; label: string; icon: typeof Check; accent: string }[] = [
    {
      key: 'Confirm',
      label: 'Confirm',
      icon: Check,
      accent:
        'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border-emerald-400/25 ring-emerald-400/30',
    },
    {
      key: 'Dismiss',
      label: 'Dismiss',
      icon: X,
      accent:
        'bg-slate-500/10 hover:bg-slate-500/20 text-slate-200 border-slate-400/25 ring-slate-400/30',
    },
    {
      key: 'Needs Review',
      label: 'Needs Review',
      icon: Flag,
      accent:
        'bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border-amber-400/25 ring-amber-400/30',
    },
    {
      key: 'Escalate',
      label: 'Escalate',
      icon: ArrowUp,
      accent:
        'bg-fuchsia-500/10 hover:bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-400/25 ring-fuchsia-400/30',
    },
  ];

  const handleAction = (decision: AuditDecision) => {
    if (isViewer) return;
    if (decision === 'Dismiss' && onDismissClick) {
      onDismissClick();
    } else {
      onAction(decision, discrepancy.id);
    }
  };

  const confPct = Math.round(discrepancy.confidence * 100);

  return (
    <article
      className={`w-full relative overflow-hidden rounded-2xl border backdrop-blur-xl bg-slate-950/70 border-white/10 ${sevStyle.border}`}
      aria-label={`Discrepancy ${discrepancy.id} — ${discrepancy.field}`}
    >
      <div
        className="absolute top-0 inset-x-0 h-[2px] opacity-80"
        style={{
          background:
            discrepancy.severity === 'Critical'
              ? 'linear-gradient(90deg, rgba(244,63,94,0.0), rgba(244,63,94,0.7), rgba(244,63,94,0.0))'
              : discrepancy.severity === 'High'
              ? 'linear-gradient(90deg, rgba(245,158,11,0.0), rgba(245,158,11,0.7), rgba(245,158,11,0.0))'
              : discrepancy.severity === 'Medium'
              ? 'linear-gradient(90deg, rgba(56,189,248,0.0), rgba(56,189,248,0.7), rgba(56,189,248,0.0))'
              : 'linear-gradient(90deg, rgba(52,211,153,0.0), rgba(52,211,153,0.7), rgba(52,211,153,0.0))',
        }}
      />

      <header className="relative flex flex-wrap items-center gap-x-4 gap-y-3 px-5 py-4 border-b border-white/5">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-slate-400 shrink-0" />
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
              Discrepancy · {discrepancy.id}
            </p>
          </div>
          <h3 className="mt-1.5 text-sm font-extrabold text-white truncate">
            {discrepancy.field}
          </h3>
          <p className="mt-0.5 text-[11px] text-slate-500 truncate">
            {discrepancy.documentKinds[0]} ↔ {discrepancy.documentKinds[1]}
          </p>
        </div>

        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-black uppercase tracking-wider ${sevStyle.bg} ${sevStyle.text} ${sevStyle.border}`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${discrepancy.severity === 'Critical' ? 'bg-rose-400 animate-pulse' : discrepancy.severity === 'High' ? 'bg-amber-400' : discrepancy.severity === 'Medium' ? 'bg-sky-400' : 'bg-emerald-400'}`}
          />
          {discrepancy.severity}
        </span>

        <div className="w-full sm:w-56 shrink-0">
          <div className="flex items-center justify-between mb-1.5">
            <span className="group relative inline-flex cursor-help" tabIndex={0} aria-describedby="confidence-tooltip">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                AI Confidence
              </span>
              <span id="confidence-tooltip" role="tooltip" className="pointer-events-none absolute bottom-full left-0 z-30 mb-2 w-64 rounded-lg border border-white/10 bg-slate-900/95 px-3 py-2 text-[10px] font-semibold normal-case leading-relaxed tracking-normal text-slate-200 opacity-0 shadow-2xl backdrop-blur-xl transition-opacity group-hover:opacity-100 group-focus:opacity-100">
                Confidence calculated based on document OCR clarity, metric matching, and temporal alignment
              </span>
            </span>
            <span className="font-mono text-[10px] text-slate-300 tabular-nums">
              {confPct}%
            </span>
          </div>
          <div className="relative h-1.5 w-full rounded-full bg-white/5 overflow-hidden">
            <div
              className={`absolute inset-y-0 left-0 rounded-full ${CONFIDENCE_GRADIENT} transition-[width] duration-500`}
              style={{ width: `${confPct}%` }}
            />
          </div>
        </div>
      </header>

      <div className="px-5 py-4 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-xl border border-white/5 bg-white/[0.03] p-3">
            <div className="flex items-center gap-1.5 mb-2">
              <span className="text-[9px] font-black uppercase tracking-wider text-indigo-400/90">
                Claimed
              </span>
            </div>
            <p className="text-[11px] text-slate-500 truncate">
              {discrepancy.documents[0]}
            </p>
            <p className="mt-1 text-base font-black text-white font-mono tabular-nums">
              {formatValue(parseNumeric(claimed), unit)}
            </p>
          </div>

          <div className="rounded-xl border border-rose-400/15 bg-rose-500/[0.04] p-3 relative">
            <div className="flex items-center gap-1.5 mb-2">
              <span className="text-[9px] font-black uppercase tracking-wider text-rose-300">
                Audited
              </span>
            </div>
            <p className="text-[11px] text-slate-500 truncate">
              {discrepancy.documents[1]}
            </p>
            <p className="mt-1 text-base font-black text-rose-200 font-mono tabular-nums">
              {formatValue(parseNumeric(audited), unit)}
            </p>
          </div>

          <div
            className={`rounded-xl border p-3 ${
              Math.abs(percentVariance) > 5
                ? 'border-amber-400/20 bg-amber-500/[0.05]'
                : 'border-white/5 bg-white/[0.03]'
            }`}
          >
            <div className="flex items-center gap-1.5 mb-2">
              <span
                className={`text-[9px] font-black uppercase tracking-wider ${
                  Math.abs(percentVariance) > 5 ? 'text-amber-300' : 'text-slate-400'
                }`}
              >
                Delta · Variance
              </span>
            </div>
            <p
              className={`text-base font-black font-mono tabular-nums ${
                deltaNum > 0
                  ? 'text-emerald-300'
                  : deltaNum < 0
                  ? 'text-rose-300'
                  : 'text-slate-200'
              }`}
            >
              {deltaSign}
              {deltaAbsFormatted}
            </p>
            <p
              className={`mt-0.5 text-[11px] font-bold font-mono tabular-nums ${
                Math.abs(percentVariance) > 5 ? 'text-amber-300' : 'text-slate-400'
              }`}
            >
              {percentVariance > 0 ? '+' : ''}
              {percentVariance.toFixed(2)}% variance
            </p>
          </div>
        </div>

        {isMaterial && (
          <div className="flex items-start gap-3 rounded-xl border border-amber-400/25 bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-transparent px-4 py-3">
            <AlertTriangle className="w-4.5 h-4.5 text-amber-300 shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-extrabold text-amber-200">
                ⚠️ Potentially Material Discrepancy
              </p>
              <p className="mt-1 text-[11px] text-amber-200/70 leading-snug">
                This variance exceeds the materiality threshold ({pctAbs.toFixed(1)}%
                {Math.abs(deltaNum) > 1_000_000
                  ? ` · ${formatValue(Math.abs(deltaNum), unit)} absolute delta`
                  : ''}
                ). Confirm with a senior reviewer before sign-off per ASC 606 / ISA 320.
              </p>
            </div>
          </div>
        )}

        {discrepancy.rootCause && (
          <div className="rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3">
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
              Root Cause
            </p>
            <p className="text-xs text-slate-300 leading-relaxed">
              {discrepancy.rootCause}
            </p>
          </div>
        )}
      </div>

      <footer className="relative px-5 py-4 border-t border-white/5 bg-slate-950/60 flex flex-wrap items-center gap-2 justify-end">
        {actions.map(({ key, label, icon: Icon, accent }) => {
          const disabled = isViewer;
          return (
            <div
              key={key}
              className="relative"
              onMouseEnter={() => disabled && setTooltipFor(key)}
              onMouseLeave={() => setTooltipFor(null)}
            >
              <button
                type="button"
                disabled={disabled}
                onClick={() => handleAction(key)}
                className={`group inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border text-[11px] font-bold transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-0 ${
                  disabled
                    ? 'opacity-40 cursor-not-allowed border-white/5 bg-white/[0.02] text-slate-500'
                    : `${accent} ring-offset-slate-950/70 active:scale-[0.98] focus:ring-2`
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>

              {tooltipFor === key && disabled && (
                <div className="absolute z-20 bottom-full mb-2 right-0 whitespace-nowrap px-2.5 py-1.5 rounded-lg bg-slate-900/95 backdrop-blur-xl border border-white/10 shadow-2xl">
                  <div className="flex items-center gap-1.5">
                    <HelpCircle className="w-3 h-3 text-slate-400" />
                    <p className="text-[10px] font-semibold text-slate-200">
                      Viewer role is read-only
                    </p>
                  </div>
                  <div
                    className="absolute top-full right-4 w-2 h-2 rotate-45 bg-slate-900/95 border-r border-b border-white/10"
                    aria-hidden
                  />
                </div>
              )}
            </div>
          );
        })}
      </footer>
      <p className="border-t border-white/5 px-5 py-2 text-right font-mono text-[9px] font-semibold tracking-wide text-slate-500">
        Last Verified: 2 mins ago by Lead Auditor
      </p>
    </article>
  );
}
