'use client';

import React, { useMemo } from 'react';
import {
  Lock,
  Check,
  X,
  Flag,
  ArrowUp,
  ShieldCheck,
  Clock,
} from 'lucide-react';
import type { AuditTrailEntry, AuditDecision } from '../../types';

const DECISION_ICON: Record<AuditDecision, typeof Check> = {
  Confirm: Check,
  Dismiss: X,
  'Needs Review': Flag,
  Escalate: ArrowUp,
};

const DECISION_STYLE: Record<
  AuditDecision,
  { chip: string; icon: string; bar: string }
> = {
  Confirm: {
    chip: 'bg-emerald-500/12 text-emerald-300 border-emerald-400/25',
    icon: 'text-emerald-300',
    bar: 'bg-emerald-400/60',
  },
  Dismiss: {
    chip: 'bg-slate-500/12 text-slate-200 border-slate-400/25',
    icon: 'text-slate-300',
    bar: 'bg-slate-400/50',
  },
  'Needs Review': {
    chip: 'bg-amber-500/12 text-amber-300 border-amber-400/25',
    icon: 'text-amber-300',
    bar: 'bg-amber-400/60',
  },
  Escalate: {
    chip: 'bg-fuchsia-500/12 text-fuchsia-300 border-fuchsia-400/25',
    icon: 'text-fuchsia-300',
    bar: 'bg-fuchsia-400/60',
  },
};

const SEVERITY_STYLE: Record<
  AuditTrailEntry['aiSeverity'],
  string
> = {
  Critical:
    'bg-rose-500/12 text-rose-300 border-rose-400/20',
  High:
    'bg-amber-500/12 text-amber-300 border-amber-400/20',
  Medium:
    'bg-sky-500/12 text-sky-300 border-sky-400/20',
  Low:
    'bg-emerald-500/12 text-emerald-300 border-emerald-400/20',
};

function formatTime(timestamp: string): string {
  try {
    const d = new Date(timestamp);
    if (Number.isNaN(d.getTime())) return timestamp;
    const now = new Date();
    const sameDay =
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate();
    const hh = d.getHours().toString().padStart(2, '0');
    const mm = d.getMinutes().toString().padStart(2, '0');
    const ss = d.getSeconds().toString().padStart(2, '0');
    const time = `${hh}:${mm}:${ss}`;
    if (sameDay) return time;
    const mo = (d.getMonth() + 1).toString().padStart(2, '0');
    const da = d.getDate().toString().padStart(2, '0');
    return `${mo}/${da} ${time}`;
  } catch {
    return timestamp;
  }
}

function actorInitials(email: string): string {
  const name = email.split('@')[0] || 'xx';
  const parts = name.split(/[._-]/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function roleColor(role: AuditTrailEntry['actor']['role']): string {
  switch (role) {
    case 'Admin':
      return 'from-fuchsia-500/40 to-rose-500/40 text-fuchsia-100 border-fuchsia-400/25';
    case 'Auditor':
      return 'from-indigo-500/40 to-sky-500/40 text-indigo-100 border-indigo-400/25';
    case 'Analyst':
      return 'from-emerald-500/40 to-teal-500/40 text-emerald-100 border-emerald-400/25';
    case 'Viewer':
      return 'from-slate-500/40 to-slate-600/40 text-slate-200 border-slate-400/25';
  }
}

export interface AuditTrailProps {
  entries: AuditTrailEntry[];
  title?: string;
  maxHeight?: string;
}

export default function AuditTrail({
  entries,
  title = 'Audit Trail',
  maxHeight,
}: AuditTrailProps) {
  const sorted = useMemo(() => {
    return [...entries].sort((a, b) => {
      const ta = new Date(a.timestamp).getTime();
      const tb = new Date(b.timestamp).getTime();
      return tb - ta;
    });
  }, [entries]);

  return (
    <section
      className="relative w-full rounded-2xl border border-white/10 bg-slate-950/70 backdrop-blur-xl overflow-hidden"
      aria-label="Audit trail — immutable decision log"
    >
      <div
        className="absolute top-0 inset-x-0 h-[2px] opacity-80"
        style={{
          background:
            'linear-gradient(90deg, rgba(129,140,248,0.0), rgba(129,140,248,0.65), rgba(129,140,248,0.0))',
        }}
      />

      <header className="relative flex items-center justify-between gap-3 px-5 py-3.5 border-b border-white/5">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-400/20 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-4 h-4 text-indigo-300" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-extrabold text-white truncate">
              {title}
            </h2>
            <p className="text-[10px] text-slate-500 flex items-center gap-1.5 mt-0.5">
              <Lock className="w-2.5 h-2.5" />
              Immutable · Write-once ledger
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Clock className="w-3 h-3 text-slate-500" />
          <span className="font-mono text-[10px] text-slate-500 tabular-nums">
            {sorted.length} {sorted.length === 1 ? 'entry' : 'entries'}
          </span>
        </div>
      </header>

      <div
        className="relative"
        style={maxHeight ? { maxHeight, overflowY: 'auto' } : undefined}
      >
        {sorted.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <div className="w-12 h-12 mx-auto rounded-2xl border border-white/5 bg-white/[0.02] flex items-center justify-center mb-3">
              <Clock className="w-5 h-5 text-slate-600" />
            </div>
            <p className="text-xs font-semibold text-slate-400">
              No audit decisions yet
            </p>
            <p className="mt-1 text-[11px] text-slate-600">
              Actions on discrepancies will appear here in reverse chronological order.
            </p>
          </div>
        ) : (
          <ol className="relative">
            {sorted.map((entry, idx) => {
              const style = DECISION_STYLE[entry.humanDecision];
              const SevIcon = DECISION_ICON[entry.humanDecision];
              const confPct = Math.round(entry.aiConfidence * 100);
              const isLast = idx === sorted.length - 1;
              const refLabel =
                entry.discrepancyId ||
                (entry.claimId ? `C-${entry.claimId.slice(0, 5).toUpperCase()}` : entry.id.slice(0, 7).toUpperCase());
              const refDisplay =
                entry.discrepancyId && !entry.discrepancyId.toUpperCase().startsWith('D-')
                  ? `D-${entry.discrepancyId.toUpperCase()}`
                  : entry.discrepancyId?.toUpperCase() || `D-${refLabel}`;

              return (
                <li key={entry.id} className="relative">
                  {!isLast && (
                    <span
                      aria-hidden
                      className="absolute left-[42px] top-[52px] bottom-0 w-px bg-gradient-to-b from-white/10 via-white/5 to-transparent"
                    />
                  )}

                  <div className="flex items-start gap-3 px-5 py-4 border-b border-white/[0.04] last:border-b-0 hover:bg-white/[0.015] transition">
                    <div className="relative shrink-0">
                      <div
                        className={`w-10 h-10 rounded-2xl border bg-gradient-to-br ${roleColor(
                          entry.actor.role,
                        )} flex items-center justify-center font-extrabold text-[11px] tracking-tight shadow-lg shadow-black/20`}
                      >
                        {actorInitials(entry.actor.email)}
                      </div>
                      <span
                        className={`absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full border-2 border-slate-950/90 flex items-center justify-center ${style.chip}`}
                        aria-hidden
                      >
                        <SevIcon className={`w-2.5 h-2.5 ${style.icon}`} />
                      </span>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="font-mono text-[10px] text-slate-500 tabular-nums shrink-0">
                          [{formatTime(entry.timestamp)}]
                        </span>
                        <span className="text-[11px] font-bold text-slate-200 truncate">
                          {entry.actor.email}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          ({entry.actor.role})
                        </span>
                        <span className="text-[11px] font-bold text-slate-100">
                          :
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[10px] font-black uppercase tracking-wider ${style.chip}`}
                        >
                          <SevIcon className="w-2.5 h-2.5" />
                          {entry.humanDecision}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          on
                        </span>
                        <span className="font-mono text-[11px] font-extrabold text-indigo-300 tabular-nums">
                          {refDisplay}
                        </span>
                        {entry.discrepancyField && (
                          <span className="text-[10px] text-slate-500 truncate max-w-[180px]">
                            · {entry.discrepancyField}
                          </span>
                        )}
                      </div>

                      {(entry.humanReason || entry.humanNotes) && (
                        <p className="mt-1.5 text-[11px] leading-snug text-slate-300">
                          <span className="text-slate-500">&ldquo;</span>
                          <span className="italic">
                            {entry.humanReason || entry.humanNotes}
                          </span>
                          <span className="text-slate-500">&rdquo;</span>
                        </p>
                      )}

                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-white/5 bg-white/[0.03]">
                          <span className="text-[9px] font-black uppercase tracking-wider text-slate-500">
                            Conf
                          </span>
                          <span className="font-mono text-[10px] text-slate-200 tabular-nums">
                            {confPct}%
                          </span>
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-black uppercase tracking-wider ${SEVERITY_STYLE[entry.aiSeverity]}`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              entry.aiSeverity === 'Critical'
                                ? 'bg-rose-400'
                                : entry.aiSeverity === 'High'
                                ? 'bg-amber-400'
                                : entry.aiSeverity === 'Medium'
                                ? 'bg-sky-400'
                                : 'bg-emerald-400'
                            }`}
                          />
                          {entry.aiSeverity}
                        </span>
                        <span className="inline-flex items-center gap-1 ml-auto text-[9px] font-bold uppercase tracking-wider text-slate-500">
                          <Lock className="w-2.5 h-2.5" />
                          Sealed
                        </span>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>

      <footer className="relative px-5 py-2.5 border-t border-white/5 bg-slate-950/80 flex items-center justify-between">
        <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-600 flex items-center gap-1.5">
          <Lock className="w-2.5 h-2.5" />
          Edits and deletions are not permitted on sealed entries
        </p>
        <p className="font-mono text-[9px] text-slate-600 tabular-nums">
          ISA 230 · AS 1215 compliant
        </p>
      </footer>
    </section>
  );
}
