'use client';

import { CheckCircle2, FileText, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { Claim } from '../types';

interface ClaimsManagerProps {
  claims: Claim[];
}

const SAMPLE_CLAIMS: Claim[] = [
  { entity: 'OmniVise Holdings', metric: 'Revenue', value: 45000000, unit: 'USD', period: 'Q3 FY2026', sourceDoc: 'Earnings Call Transcript', pageTimestamp: '00:14:32', speaker: 'Priyanshi Aggarwal' },
  { entity: 'OmniVise Holdings', metric: 'Operating Margin', value: 18.4, unit: 'percent', period: 'Q3 FY2026', sourceDoc: '10-K Annual Report', pageTimestamp: 'Page 47', speaker: 'Independent Auditor' },
  { entity: 'Nexus Semiconductor', metric: 'Contract Total', value: 125000, unit: 'USD', period: 'Q3 FY2026', sourceDoc: 'Purchase Order PO-1042', pageTimestamp: 'Page 3', speaker: 'Procurement' },
];

function formatValue(claim: Claim): string {
  if (claim.unit === 'percent') return `${claim.value}%`;
  if (claim.unit === 'USD' || claim.unit === 'EUR') {
    const symbol = claim.unit === 'EUR' ? '€' : '$';
    if (Math.abs(claim.value) >= 1_000_000) return `${symbol}${(claim.value / 1_000_000).toFixed(1)}M`;
    if (Math.abs(claim.value) >= 1_000) return `${symbol}${(claim.value / 1_000).toFixed(1)}K`;
    return `${symbol}${claim.value.toLocaleString()}`;
  }
  return claim.value.toLocaleString();
}

export default function ClaimsManager({ claims }: ClaimsManagerProps) {
  const [query, setQuery] = useState('');
  const sourceClaims = claims.length > 0 ? claims : SAMPLE_CLAIMS;
  const filteredClaims = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return sourceClaims;
    return sourceClaims.filter((claim) => [claim.entity, claim.metric, claim.period, claim.sourceDoc, claim.pageTimestamp, claim.speaker, formatValue(claim)].join(' ').toLowerCase().includes(normalizedQuery));
  }, [query, sourceClaims]);

  return (
    <section className="min-h-[calc(100vh-7rem)] rounded-3xl border border-white/10 bg-slate-950/65 p-5 shadow-2xl backdrop-blur-2xl md:p-7">
      <div className="flex flex-col gap-4 border-b border-white/10 pb-6 md:flex-row md:items-end md:justify-between">
        <div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-300/80">Workspace / Claims</p><h1 className="mt-1 text-2xl font-black tracking-tight text-white">Claims Extraction</h1><p className="mt-1 text-xs text-slate-400">Review normalized claims, source citations, timestamps, and attributed speakers.</p></div>
        <label className="relative w-full md:w-72"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" /><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search claims" aria-label="Search extracted claims" className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-2.5 pl-9 pr-3 text-xs text-slate-200 outline-none placeholder:text-slate-600 focus:border-emerald-400/50" /></label>
      </div>

      <div className="mt-5 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.025]">
        <div className="hidden grid-cols-[1fr_1fr_1.1fr_1.2fr_1fr_1fr] gap-4 border-b border-white/10 bg-white/[0.04] px-5 py-3 text-[10px] font-black uppercase tracking-wider text-slate-500 lg:grid"><span>Entity</span><span>Metric</span><span>Normalized Value</span><span>Source Document</span><span>Page / Timestamp</span><span>Speaker</span></div>
        <div className="divide-y divide-white/5">
          {filteredClaims.map((claim, index) => (
            <div key={`${claim.entity}-${claim.metric}-${claim.period}-${index}`} className="grid gap-3 px-5 py-4 transition hover:bg-white/[0.04] lg:grid-cols-[1fr_1fr_1.1fr_1.2fr_1fr_1fr] lg:items-center lg:gap-4">
              <div><span className="text-[10px] font-black uppercase tracking-wider text-emerald-300/70 lg:hidden">Entity</span><p className="text-xs font-bold text-slate-100">{claim.entity}</p></div>
              <div><span className="text-[10px] font-black uppercase tracking-wider text-emerald-300/70 lg:hidden">Metric</span><p className="text-xs font-semibold text-slate-300">{claim.metric}</p></div>
              <div><span className="text-[10px] font-black uppercase tracking-wider text-emerald-300/70 lg:hidden">Normalized Value</span><p className="font-mono text-sm font-black text-emerald-300">{formatValue(claim)}</p><p className="mt-1 text-[10px] font-semibold text-slate-500">{claim.period}</p></div>
              <div className="flex min-w-0 items-center gap-2"><FileText className="h-3.5 w-3.5 shrink-0 text-slate-600" /><div className="min-w-0"><span className="text-[10px] font-black uppercase tracking-wider text-emerald-300/70 lg:hidden">Source Document</span><p className="truncate text-xs font-semibold text-slate-300">{claim.sourceDoc}</p></div></div>
              <div><span className="text-[10px] font-black uppercase tracking-wider text-emerald-300/70 lg:hidden">Page / Timestamp</span><p className="font-mono text-[11px] font-semibold text-slate-400">{claim.pageTimestamp}</p></div>
              <div><span className="text-[10px] font-black uppercase tracking-wider text-emerald-300/70 lg:hidden">Speaker</span><p className="text-xs font-semibold text-slate-300">{claim.speaker || 'Unattributed'}</p></div>
            </div>
          ))}
        </div>
        {filteredClaims.length === 0 && <div className="flex flex-col items-center gap-2 px-5 py-12 text-center text-xs font-semibold text-slate-500"><CheckCircle2 className="h-5 w-5 text-slate-600" />No extracted claims match your search.</div>}
      </div>
    </section>
  );
}
