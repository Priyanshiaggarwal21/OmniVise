'use client';
import React, { useEffect, useMemo, useState } from 'react';
import {
  X, Info, ShieldCheck, AlertTriangle, CheckCircle2, FileText,
  TrendingDown, Target, Gauge, ChevronDown, ChevronUp, Copy, Check as CheckIcon,
  ArrowRightLeft, AlertCircle, Clock, User, Zap, ThumbsUp, ThumbsDown, ArrowUp,
} from 'lucide-react';
import type { UserRole } from '../auth/LoginView';
import type { MatchedDiscrepancy, ParsedDocument, Claim, EvidenceSnippet } from '../../types';
import ContradictionEngine, {
  normalizeClaim, verify6Axis, classifyContradiction,
  computeSeverity, buildReasoning, buildEvidenceSnippets, formatValue,
} from './ContradictionEngine';

export { type MatchedDiscrepancy } from '../../types';

export type Discrepancy = MatchedDiscrepancy;

type SourceProofTab = 'transcript' | 'annual-report' | 'investor-pitch';

const sevColor: Record<MatchedDiscrepancy['severity'], { bg: string; text: string; ring: string; dot: string; gradient: string }> = {
  Critical: { bg: 'bg-rose-500/10', text: 'text-rose-300', ring: 'ring-rose-400/30', dot: 'bg-rose-500', gradient: 'from-rose-500 to-fuchsia-500' },
  High:     { bg: 'bg-amber-500/10', text: 'text-amber-300', ring: 'ring-amber-400/30', dot: 'bg-amber-500', gradient: 'from-amber-500 to-orange-500' },
  Medium:   { bg: 'bg-sky-500/10', text: 'text-sky-300', ring: 'ring-sky-400/30', dot: 'bg-sky-500', gradient: 'from-sky-500 to-indigo-500' },
  Low:      { bg: 'bg-emerald-500/10', text: 'text-emerald-300', ring: 'ring-emerald-400/30', dot: 'bg-emerald-500', gradient: 'from-emerald-500 to-teal-500' },
};

interface XAIDrawerProps {
  discrepancy: Discrepancy | null;
  documents?: ParsedDocument[];
  onClose: () => void;
  selectedRole: UserRole;
  onAuditAction: (action: string, discrepancyId: string) => void;
}

export default function XAIDrawer({ discrepancy, documents = [], onClose, selectedRole, onAuditAction }: XAIDrawerProps) {
  const [evidenceOpen, setEvidenceOpen] = useState(true);
  const [engineOpen, setEngineOpen] = useState(false);
  const [activeSourceTab, setActiveSourceTab] = useState<SourceProofTab>('transcript');
  const [copiedIdx, setCopiedIdx] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<'up' | 'down' | null>(null);

  useEffect(() => {
    setFeedback(null);
  }, [discrepancy?.id]);

  const analysis = useMemo(() => {
    if (!discrepancy) return null;
    const period = discrepancy.reportingPeriod || 'Q3 FY2026';
    const toNum = (v: string | number): number => typeof v === 'number' ? v : parseFloat(String(v).replace(/[^0-9.]/g, '')) || 0;
    const aValue = toNum(discrepancy.poValue);
    const bValue = toNum(discrepancy.invoiceValue);
    const isPercent = discrepancy.field.toLowerCase().includes('margin') || discrepancy.field.toLowerCase().includes('eps');
    const claimA: Claim = normalizeClaim(`${period} ${discrepancy.field} ${formatValue(aValue, isPercent ? 'percent' : 'USD')}`, {
      sourceDoc: discrepancy.documentKinds[0],
      pageTimestamp: discrepancy.executiveClaimSource || discrepancy.documents[0],
      speaker: discrepancy.executiveClaim ? 'Executive Management' : '',
      entity: 'OmniVise Holdings',
    });
    const claimB: Claim = normalizeClaim(`${period} ${discrepancy.field} ${formatValue(bValue, isPercent ? 'percent' : 'USD')}`, {
      sourceDoc: discrepancy.documentKinds[1],
      pageTimestamp: discrepancy.auditEvidenceSource || discrepancy.documents[1],
      speaker: 'Independent Auditor',
      entity: 'OmniVise Holdings',
    });
    const axes = verify6Axis(claimA, claimB);
    const status = classifyContradiction(claimA, claimB, axes);
    const severity = computeSeverity(claimA, claimB, status, 10000);
    const reasoning = buildReasoning(claimA, claimB, status, severity);
    const snippets = buildEvidenceSnippets(claimA, claimB);
    return { claimA, claimB, axes, status, severity, reasoning, snippets };
  }, [discrepancy]);

  if (!discrepancy || !analysis) return null;

  const leftDoc = documents.find((d) => d.id === discrepancy.documents[0]);
  const rightDoc = documents.find((d) => d.id === discrepancy.documents[1]);
  const sev = sevColor[discrepancy.severity];
  const confPct = Math.round(discrepancy.confidence * 100);
  const toNum = (v: string | number): number => typeof v === 'number' ? v : parseFloat(String(v).replace(/[^0-9.]/g, '')) || 0;
  const aVal = toNum(discrepancy.poValue);
  const bVal = toNum(discrepancy.invoiceValue);
  const deltaAbs = Math.abs(bVal - aVal);
  const pctVar = aVal === 0 ? 0 : (deltaAbs / Math.abs(aVal)) * 100;
  const isMaterial = pctVar > 5 || deltaAbs > 1_000_000;

  const sourceProofs: Record<SourceProofTab, EvidenceSnippet> = {
    transcript: { ...analysis.snippets[0], documentName: 'Earnings Call Transcript' },
    'annual-report': { ...analysis.snippets[1], documentName: '10-K Annual Report' },
    'investor-pitch': {
      ...analysis.snippets[0],
      documentName: 'Investor Pitch',
      pageOrTimestamp: discrepancy.executiveClaimSource || 'Slide 18',
      section: 'Investor outlook',
      quotedText: discrepancy.executiveClaim || analysis.snippets[0].quotedText,
    },
  };
  const activeProof = sourceProofs[activeSourceTab];

  const handleCopySnippet = async (idx: string, snippet: EvidenceSnippet) => {
    const text = `[${snippet.documentName}] ${snippet.pageOrTimestamp} · ${snippet.section}\n${snippet.quotedText}\n— ${snippet.speaker || ''}`;
    try { await navigator.clipboard.writeText(text); } catch {}
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 1800);
  };

  return (
    <div className="fixed inset-y-0 right-0 w-[620px] max-w-[98vw] bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900 shadow-2xl border-l border-white/10 z-50 flex flex-col">
      <div className="absolute inset-y-0 left-0 w-px bg-gradient-to-b from-transparent via-indigo-400/40 to-transparent" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-indigo-400/50 via-fuchsia-400/40 to-emerald-400/40" />

      <div className="flex items-center justify-between p-6 pb-4 border-b border-white/5 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/30 to-emerald-400/20 border border-white/10 flex items-center justify-center text-indigo-200 shadow-lg shadow-indigo-500/10">
            <Gauge className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-black text-white tracking-tight">Explainable AI (XAI) Reasoning</h3>
              <span className={`px-2 py-0.5 text-[10px] font-black rounded-full ring-1 inline-flex items-center gap-1 ${sev.bg} ${sev.text} ${sev.ring}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${sev.dot} ${discrepancy.severity === 'Critical' ? 'animate-pulse' : ''}`} />
                {discrepancy.severity}
              </span>
              <span className={`px-2 py-0.5 text-[10px] font-black rounded-full border border-white/10 bg-white/5 text-slate-200 inline-flex items-center gap-1`}>
                <Zap className="w-2.5 h-2.5 text-fuchsia-300" /> {analysis.status}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">Discrepancy {discrepancy.id} · Confidence {confPct}% · {discrepancy.accountingCategory}</p>
          </div>
        </div>
        <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors shrink-0">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <AlertQuadrantCard
              title="WHAT"
              kicker="Delta Detected"
              kickerColor="text-rose-300"
              kickerBg="bg-rose-500/15"
              icon={<TrendingDown className="w-3.5 h-3.5" />}
              accentBg="bg-gradient-to-br from-rose-500/10 via-rose-500/5 to-transparent"
              accentBorder="border-rose-400/15"
            >
              <p className="text-sm font-black text-white leading-tight">
                {discrepancy.field}
                <span className={`ml-2 bg-gradient-to-r ${sev.gradient} bg-clip-text text-transparent`}>
                  {discrepancy.deltaFormatted}
                </span>
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="rounded-lg border border-white/10 bg-white/[0.03] p-2.5">
                  <p className="text-[9px] font-black uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1">
                    <FileText className="w-2.5 h-2.5 text-indigo-300" />
                    {discrepancy.documentKinds[0]}
                  </p>
                  <p className="text-xs font-bold text-white break-all">{String(discrepancy.poValue)}</p>
                  {leftDoc && <p className="text-[9px] text-slate-500 mt-0.5 truncate">{leftDoc.documentNumber}</p>}
                </div>
                <div className="rounded-lg border border-rose-400/20 bg-rose-500/[0.04] p-2.5">
                  <p className="text-[9px] font-black uppercase tracking-wider text-rose-300 mb-1 flex items-center gap-1">
                    <ShieldCheck className="w-2.5 h-2.5" />
                    {discrepancy.documentKinds[1]}
                  </p>
                  <p className="text-xs font-bold text-white break-all">{String(discrepancy.invoiceValue)}</p>
                  {rightDoc && <p className="text-[9px] text-rose-400/70 mt-0.5 truncate">{rightDoc.documentNumber}</p>}
                </div>
              </div>
            </AlertQuadrantCard>

            <AlertQuadrantCard
              title="WHY"
              kicker="Contextual Reasoning"
              kickerColor="text-amber-300"
              kickerBg="bg-amber-500/15"
              icon={<AlertTriangle className="w-3.5 h-3.5" />}
              accentBg="bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent"
              accentBorder="border-amber-400/15"
            >
              <p className="text-[11px] leading-relaxed text-amber-50/90 font-medium">
                {discrepancy.rootCause || analysis.reasoning}
              </p>
              <div className="mt-3 flex items-center gap-2 flex-wrap">
                <TagChip icon={<Target className="w-2.5 h-2.5 text-indigo-300" />} label={discrepancy.accountingCategory} />
                {discrepancy.reportingPeriod && (
                  <TagChip icon={<Clock className="w-2.5 h-2.5 text-sky-300" />} label={`Period: ${discrepancy.reportingPeriod}`} />
                )}
                <TagChip icon={<ArrowRightLeft className="w-2.5 h-2.5 text-fuchsia-300" />} label={`Variance: ${pctVar.toFixed(1)}%`} />
              </div>
            </AlertQuadrantCard>

            <AlertQuadrantCard
              title="CONFIDENCE"
              kicker="Match Engine Score"
              kickerColor="text-emerald-300"
              kickerBg="bg-emerald-500/15"
              icon={<CheckCircle2 className="w-3.5 h-3.5" />}
              accentBg="bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent"
              accentBorder="border-emerald-400/15"
            >
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-black tracking-tight text-emerald-300">{confPct}</p>
                <p className="text-lg font-black text-emerald-300/60">%</p>
              </div>
              <div className="mt-2 h-2 rounded-full bg-white/5 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-500"
                  style={{ width: `${confPct}%` }}
                />
              </div>
              <div className="mt-3 grid grid-cols-3 gap-1.5 text-[9px]">
                <EvidenceChip label="Sources" value="2" />
                <EvidenceChip label="Axes Pass" value={`${analysis.axes.filter(a => a.pass).length}/6`} />
                <EvidenceChip label="Samples" value={String(discrepancy.affectedLineItems?.length || 'N/A')} />
              </div>
            </AlertQuadrantCard>

            <AlertQuadrantCard
              title="SEVERITY"
              kicker="Risk Classification"
              kickerColor={sev.text}
              kickerBg={sev.bg}
              icon={<AlertCircle className="w-3.5 h-3.5" />}
              accentBg={`bg-gradient-to-br ${sev.bg} via-transparent to-transparent`}
              accentBorder="border-white/10"
            >
              <div className="flex items-center gap-3">
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${sev.gradient} flex items-center justify-center shadow-lg shadow-black/30`}>
                  <span className="text-white font-black text-lg">
                    {discrepancy.severity === 'Critical' ? '!' : discrepancy.severity === 'High' ? 'H' : discrepancy.severity === 'Medium' ? 'M' : 'L'}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`text-lg font-black ${sev.text} tracking-tight`}>{discrepancy.severity}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5 font-semibold">
                    {deltaAbs >= 1_000_000 ? `$${(deltaAbs / 1_000_000).toFixed(1)}M delta` : `$${deltaAbs.toLocaleString()} delta`} · {pctVar.toFixed(1)}% variance
                  </p>
                </div>
              </div>
              {isMaterial && (
                <div className="mt-3 rounded-lg border border-amber-400/30 bg-amber-500/10 px-3 py-2 flex items-start gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-300 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] font-black text-amber-300 uppercase tracking-wider">Potentially Material Discrepancy</p>
                    <p className="text-[9.5px] text-amber-200/80 mt-0.5 font-semibold leading-snug">
                      Exceeds 5% / $1M SAB 99 materiality threshold. Requires SOX sign-off documentation.
                    </p>
                  </div>
                </div>
              )}
            </AlertQuadrantCard>
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-950/70 backdrop-blur-xl overflow-hidden shadow-xl">
            <button
              onClick={() => setEngineOpen((v) => !v)}
              className="w-full flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-indigo-500/15 text-indigo-300 flex items-center justify-center border border-indigo-400/20">
                  <Gauge className="w-3.5 h-3.5" />
                </div>
                <div className="text-left">
                  <p className="text-xs font-black text-white">Contradiction Engine · 6-Axis Verification</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Transparent axis-by-axis claim alignment check</p>
                </div>
              </div>
              {engineOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </button>
            {engineOpen && (
              <div className="px-4 pb-4 border-t border-white/5 pt-4">
                <ContradictionEngine claimA={analysis.claimA} claimB={analysis.claimB} />
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-950/70 backdrop-blur-xl overflow-hidden shadow-xl">
            <button
              onClick={() => setEvidenceOpen((v) => !v)}
              className="w-full flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/15 text-emerald-300 flex items-center justify-center border border-emerald-400/20">
                  <FileText className="w-3.5 h-3.5" />
                </div>
                <div className="text-left">
                  <p className="text-xs font-black text-white">Evidence Drawer · Side-by-Side Source Proof</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Document, Page/Timestamp, Section, and Quoted Text per source</p>
                </div>
              </div>
              {evidenceOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </button>
            {evidenceOpen && (
              <div className="px-4 pb-4 border-t border-white/5 pt-4">
                <div className="mb-4 flex flex-wrap gap-1.5 rounded-xl border border-white/10 bg-white/[0.02] p-1.5" role="tablist" aria-label="Source document proofs">
                  {([
                    ['transcript', 'Earnings Call Transcript'],
                    ['annual-report', '10-K Annual Report'],
                    ['investor-pitch', 'Investor Pitch'],
                  ] as const).map(([tab, label]) => (
                    <button key={tab} type="button" role="tab" aria-selected={activeSourceTab === tab} onClick={() => { setActiveSourceTab(tab); setCopiedIdx(null); }} className={`rounded-lg px-3 py-2 text-[10px] font-black transition-all ${activeSourceTab === tab ? 'bg-indigo-500/20 text-indigo-200 ring-1 ring-indigo-400/30' : 'text-slate-500 hover:bg-white/[0.04] hover:text-slate-200'}`}>
                      {label}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-1 gap-3">
                  <EvidenceCard
                    idx={activeSourceTab === 'annual-report' ? 1 : 0}
                    snippet={activeProof}
                    accent={activeSourceTab === 'annual-report'
                      ? { label: 'Source B · Audited', badge: 'bg-emerald-500/15 text-emerald-300 border-emerald-400/20', border: 'border-emerald-400/20' }
                      : { label: `Source Proof · ${activeSourceTab === 'investor-pitch' ? 'Investor Pitch' : 'Claimed'}`, badge: 'bg-indigo-500/15 text-indigo-300 border-indigo-400/20', border: 'border-indigo-400/20' }}
                    copied={copiedIdx === activeSourceTab}
                    onCopy={() => handleCopySnippet(activeSourceTab, activeProof)}
                  />
                </div>

                {discrepancy.executiveClaim && (
                  <div className="mt-3 rounded-xl border border-indigo-400/15 bg-white/[0.02] p-3.5">
                    <div className="flex items-center gap-1.5 mb-2">
                      <User className="w-3 h-3 text-indigo-300" />
                      <p className="text-[10px] font-black uppercase tracking-wider text-indigo-300">Executive / Claimed Statement</p>
                    </div>
                    <p className="text-xs leading-relaxed text-slate-100 font-semibold">{discrepancy.executiveClaim}</p>
                    {discrepancy.executiveClaimSource && (
                      <p className="text-[10px] text-slate-400 mt-1.5 font-semibold">— {discrepancy.executiveClaimSource}</p>
                    )}
                  </div>
                )}
                {discrepancy.auditEvidence && (
                  <div className="mt-3 rounded-xl border border-emerald-400/15 bg-white/[0.02] p-3.5">
                    <div className="flex items-center gap-1.5 mb-2">
                      <ShieldCheck className="w-3 h-3 text-emerald-300" />
                      <p className="text-[10px] font-black uppercase tracking-wider text-emerald-300">Audit / Filed Evidence</p>
                    </div>
                    <p className="text-xs leading-relaxed text-emerald-50/90 font-semibold">{discrepancy.auditEvidence}</p>
                    {discrepancy.auditEvidenceSource && (
                      <p className="text-[10px] text-emerald-300/80 mt-1.5 font-semibold">— {discrepancy.auditEvidenceSource}</p>
                    )}
                  </div>
                )}

                {discrepancy.affectedLineItems && discrepancy.affectedLineItems.length > 0 && (
                  <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.02] p-3.5">
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                      <Target className="w-3 h-3 text-amber-300" /> Affected Line Items
                    </p>
                    <ul className="space-y-1.5">
                      {discrepancy.affectedLineItems.map((item, i) => (
                        <li key={i} className="flex items-center gap-2 text-[11px] text-slate-200">
                          <CheckCircle2 className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                          <span className="font-semibold">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="p-6 pt-4 border-t border-white/5 space-y-3 bg-gradient-to-t from-slate-950 to-transparent shrink-0">
        <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5">
          {feedback ? (
            <p className="text-xs font-bold text-emerald-300">Thank you for training the model</p>
          ) : (
            <p className="text-xs font-semibold text-slate-400">Was this reasoning helpful?</p>
          )}
          <div className="flex items-center gap-1.5">
            <button type="button" onClick={() => setFeedback('up')} aria-label="Reasoning was helpful" aria-pressed={feedback === 'up'} className={`rounded-lg border p-2 transition ${feedback === 'up' ? 'border-emerald-400/35 bg-emerald-500/15 text-emerald-300' : 'border-white/10 text-slate-500 hover:bg-white/10 hover:text-emerald-300'}`}>
              <ThumbsUp className="h-3.5 w-3.5" />
            </button>
            <button type="button" onClick={() => setFeedback('down')} aria-label="Reasoning was not helpful" aria-pressed={feedback === 'down'} className={`rounded-lg border p-2 transition ${feedback === 'down' ? 'border-rose-400/35 bg-rose-500/15 text-rose-300' : 'border-white/10 text-slate-500 hover:bg-white/10 hover:text-rose-300'}`}>
              <ThumbsDown className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
        {selectedRole === 'Viewer' ? (
          <button disabled className="w-full py-3 text-xs font-black rounded-xl bg-slate-800 text-slate-500 cursor-not-allowed border border-white/5">
            Action Restricted (Viewer role — read-only)
          </button>
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <button
              onClick={() => onAuditAction('Dismiss Discrepancy', discrepancy.id)}
              className="py-3 text-xs font-black rounded-xl bg-white/5 text-slate-200 hover:bg-white/10 border border-white/10 transition-all flex items-center justify-center gap-1.5"
            >
              <X className="w-3.5 h-3.5" /> Dismiss as Noise
            </button>
            <button
              onClick={() => onAuditAction('Confirm Discrepancy', discrepancy.id)}
              className={`py-3 text-xs font-black rounded-xl bg-gradient-to-r ${sev.gradient} text-white shadow-lg shadow-black/30 hover:brightness-110 transition-all flex items-center justify-center gap-1.5`}
            >
              <CheckIcon className="w-3.5 h-3.5" /> Confirm Discrepancy
            </button>
            <button
              onClick={() => onAuditAction('Escalate Discrepancy', discrepancy.id)}
              className="py-3 text-xs font-black rounded-xl bg-fuchsia-500/10 text-fuchsia-200 hover:bg-fuchsia-500/20 border border-fuchsia-400/25 transition-all flex items-center justify-center gap-1.5"
            >
              <ArrowUp className="w-3.5 h-3.5" /> Escalate
            </button>
          </div>
        )}
        <div className="flex items-center justify-between text-[10.5px] text-slate-500 font-semibold">
          <span>Authorized role: {selectedRole}</span>
          <span>Ref: {discrepancy.id}</span>
        </div>
      </div>
    </div>
  );
}

function AlertQuadrantCard({
  title, kicker, kickerColor, kickerBg, icon, accentBg, accentBorder, children,
}: {
  title: string;
  kicker: string;
  kickerColor: string;
  kickerBg: string;
  icon: React.ReactNode;
  accentBg: string;
  accentBorder: string;
  children: React.ReactNode;
}) {
  return (
    <section className={`relative rounded-2xl border ${accentBorder} p-4 overflow-hidden ${accentBg} shadow-lg shadow-black/10`}>
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      <div className="relative flex items-center gap-2 mb-3">
        <div className={`w-6 h-6 rounded-lg ${kickerBg} ${kickerColor} flex items-center justify-center border border-current/20`}>
          {icon}
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-[9.5px] font-black uppercase tracking-[0.12em] ${kickerColor}`}>{kicker}</span>
          <span className="text-[10px] font-black text-slate-500 tracking-[0.18em]">— {title}</span>
        </div>
      </div>
      <div className="relative">{children}</div>
    </section>
  );
}

function TagChip({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold text-slate-200">
      {icon}
      {label}
    </div>
  );
}

function EvidenceChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-black/20 border border-white/5 px-1.5 py-1 text-center">
      <p className="text-[8px] font-black uppercase tracking-wider text-slate-500">{label}</p>
      <p className="text-[10px] font-black text-emerald-300 mt-0.5">{value}</p>
    </div>
  );
}

function EvidenceCard({
  idx, snippet, accent, copied, onCopy,
}: {
  idx: number;
  snippet: EvidenceSnippet;
  accent: { label: string; badge: string; border: string };
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <div className={`rounded-xl border ${accent.border} bg-white/[0.025] p-3.5 relative overflow-hidden`}>
      <div className="absolute -top-16 -right-16 w-32 h-32 bg-gradient-to-br from-indigo-500/10 to-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="relative">
        <div className="flex items-center justify-between mb-2.5">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${accent.badge}`}>
            {idx === 0 ? <Info className="w-2.5 h-2.5" /> : <ShieldCheck className="w-2.5 h-2.5" />}
            {accent.label}
          </span>
          <button
            onClick={onCopy}
            title="Copy evidence to clipboard"
            className={`p-1.5 rounded-lg border text-[10px] font-bold transition-all ${
              copied
                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-400/25'
                : 'bg-white/5 text-slate-400 border-white/10 hover:text-white hover:bg-white/10'
            }`}
          >
            {copied ? <span className="inline-flex items-center gap-1"><CheckIcon className="w-3 h-3" /> Copied</span> : <Copy className="w-3 h-3" />}
          </button>
        </div>
        <dl className="grid grid-cols-[min-content_1fr] gap-x-2 gap-y-1.5 text-[10.5px] mb-2.5">
          <dt className="text-slate-500 font-black uppercase tracking-wider whitespace-nowrap">Doc</dt>
          <dd className="text-slate-200 font-bold truncate">{snippet.documentName}</dd>
          <dt className="text-slate-500 font-black uppercase tracking-wider whitespace-nowrap">Page</dt>
          <dd className="text-slate-300 font-semibold">{snippet.pageOrTimestamp}</dd>
          <dt className="text-slate-500 font-black uppercase tracking-wider whitespace-nowrap">Section</dt>
          <dd className="text-slate-300 font-semibold">{snippet.section}</dd>
          {snippet.speaker && (
            <>
              <dt className="text-slate-500 font-black uppercase tracking-wider whitespace-nowrap">Speaker</dt>
              <dd className="text-indigo-200 font-bold">{snippet.speaker}</dd>
            </>
          )}
        </dl>
        <div className="rounded-lg bg-black/25 border border-white/5 p-2.5">
          <p className="text-[11px] leading-relaxed text-slate-100 font-medium">
            {renderHighlightedQuote(snippet)}
          </p>
        </div>
        <div className="mt-2 flex items-center gap-2 flex-wrap">
          {typeof snippet.confidence === 'number' && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-[9px] font-black text-emerald-300 border border-emerald-400/20">
              <Zap className="w-2 h-2" /> Conf {(snippet.confidence * 100).toFixed(0)}%
            </span>
          )}
          {snippet.timestamp && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-white/5 text-[9px] font-bold text-slate-400 border border-white/10">
              <Clock className="w-2 h-2" /> {snippet.timestamp}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function renderHighlightedQuote(snippet: EvidenceSnippet): React.ReactNode {
  const { quotedText, highlightStart, highlightEnd } = snippet;
  if (typeof highlightStart !== 'number' || typeof highlightEnd !== 'number') return quotedText;
  return (
    <>
      {quotedText.slice(0, highlightStart)}
      <span className="font-black bg-gradient-to-r from-amber-300 to-yellow-300 bg-clip-text text-transparent underline decoration-amber-400/40 decoration-2 underline-offset-2">
        {quotedText.slice(highlightStart, highlightEnd)}
      </span>
      {quotedText.slice(highlightEnd)}
    </>
  );
}
