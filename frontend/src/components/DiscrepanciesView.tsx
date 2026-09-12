'use client';

import type { MatchedDiscrepancy, UserRole } from '../types';
import DiscrepancyAlertCard from './audit/DiscrepancyAlertCard';

interface DiscrepanciesViewProps {
  discrepancies: MatchedDiscrepancy[];
  selectedRole: UserRole;
  onSelect: (discrepancy: MatchedDiscrepancy) => void;
  onAction: (action: string, discrepancyId: string) => void;
}

export default function DiscrepanciesView({ discrepancies, selectedRole, onSelect, onAction }: DiscrepanciesViewProps) {
  return (
    <section className="min-h-[calc(100vh-7rem)] rounded-3xl border border-white/10 bg-slate-950/65 p-5 shadow-2xl backdrop-blur-2xl md:p-7">
      <div className="border-b border-white/10 pb-6">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-300/80">Workspace / Audit Control</p>
        <h1 className="mt-1 text-2xl font-black tracking-tight text-white">Discrepancies</h1>
        <p className="mt-1 text-xs text-slate-400">Review What and Why reasoning, validate confidence, and take an auditor action on each finding.</p>
      </div>
      <div className="mt-6 space-y-4">
        {discrepancies.map((discrepancy) => (
          <div
            key={discrepancy.id}
            className="cursor-pointer rounded-2xl outline-none transition hover:ring-1 hover:ring-indigo-400/30 focus-visible:ring-2 focus-visible:ring-indigo-400/60"
            onClick={(event) => {
              if ((event.target as HTMLElement).closest('button')) return;
              onSelect(discrepancy);
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') onSelect(discrepancy);
            }}
            role="button"
            tabIndex={0}
            aria-label={`Open evidence for ${discrepancy.field}`}
          >
            <DiscrepancyAlertCard
              discrepancy={discrepancy}
              role={selectedRole}
              onAction={(decision, discrepancyId) => onAction(decision, discrepancyId)}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
