'use client';

import React, { useState } from 'react';
import {
  Sparkles,
  Layers,
  Shield,
  ShieldCheck,
  Cpu,
  ArrowRight,
  Bookmark,
  Clock,
  Download,
  CheckCircle2,
  AlertTriangle,
  Play,
  Pause,
  ExternalLink,
  Lock,
  FileText,
  FileSpreadsheet,
  Music,
  GitBranch,
  X,
  FileCheck2,
  Activity,
  Flag,
  Info,
} from 'lucide-react';

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:8000';

interface EvidenceItem {
  id: string;
  sourceDoc: string;
  location: string;
  type: 'PDF' | 'Audio' | 'XLSX';
  badge: string;
  badgeTone: 'mint' | 'blue' | 'green';
  actionLabel: string;
  quote: string;
  footerLeft: string;
  footerRight: string;
}

export default function WorkspacePage() {
  const [query, setQuery] = useState(
    'Did Q3 operating margins expand in the European logistics division after the warehouse automation initiative?'
  );
  const [scope, setScope] = useState('All Ingested Sources (14)');
  const [strictness, setStrictness] = useState('High Assurance (RPS)');
  const [model, setModel] = useState('Deterministic Ground-Truth');

  const [isLoading, setIsLoading] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isSignedOff, setIsSignedOff] = useState(false);
  const [isFlagged, setIsFlagged] = useState(false);
  const [isReconciled, setIsReconciled] = useState(false);
  const [savedToDossier, setSavedToDossier] = useState(false);
  const [counterfactualRunning, setCounterfactualRunning] = useState(false);
  const [counterfactualResult, setCounterfactualResult] = useState<string | null>(null);
  const [inspectItem, setInspectItem] = useState<EvidenceItem | null>(null);

  const supportingItems: EvidenceItem[] = [
    {
      id: 'supp-1',
      sourceDoc: 'Q3_Consolidated_Financial_Audit_SEC10K.pdf',
      location: 'Page 42, Table 4.1',
      type: 'PDF',
      badge: 'Verified SHA-256',
      badgeTone: 'mint',
      actionLabel: 'Inspect',
      quote:
        '"...operating margin across Western European fulfillment hubs registered at 12.82% vs 11.40% in prior quarter, driven by automated carton routing efficiency gains."',
      footerLeft: 'Anchoring Weight: 42%',
      footerRight: 'Provenance DAG: 0x8a92...fb11',
    },
    {
      id: 'supp-2',
      sourceDoc: 'Executive_Strategy_Audio_Briefing_Q4.wav',
      location: '14:28 – 15:10',
      type: 'Audio',
      badge: 'Acoustic Corroboration',
      badgeTone: 'blue',
      actionLabel: isPlayingAudio ? 'Pause Snippet' : 'Play Snippet',
      quote:
        '"...CFO noted that robotic sortation in Rotterdam and Lyon met target payback thresholds two quarters ahead of operational models."',
      footerLeft: 'Speaker Diarization: CFO Confirmed (98.9%)',
      footerRight: 'Temporal Offset: 2024-10-18',
    },
    {
      id: 'supp-3',
      sourceDoc: 'CrossBorder_Trade_Settlement_Ledger_2024.xlsx',
      location: 'Hub_Margins!R84:V112',
      type: 'XLSX',
      badge: 'Deterministic Match',
      badgeTone: 'green',
      actionLabel: 'Inspect',
      quote:
        '"...Gross line-item margin delta +1.42% confirmed in settlement ledger across 42,100 automated clearance dispatches."',
      footerLeft: 'Transactions Sampled: 42,100 units',
      footerRight: 'Ledger Hash: k8012-78df',
    },
  ];

  const handleInference = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
    }, 600);
  };

  const handleSaveToDossier = async () => {
    setSavedToDossier(true);
    try {
      await fetch(`${API_BASE}/decisions/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: query,
          conclusion:
            'European logistics operating margins expanded by +142 bps (from 11.40% to 12.82%) following Phase-2 automated sorting deployment in Q3 2024.',
          confidence_badge: '91.8% Robustness Score · RPS Verified',
        }),
      });
    } catch {
      // ignore
    }
    setTimeout(() => setSavedToDossier(false), 3500);
  };

  const handleExportReport = () => {
    const reportData = {
      title: 'OmniVise Evidence Reasoning Report',
      query,
      status: 'Review Required (Divergence Detected)',
      robustnessScore: '91.8%',
      consensusGate: '#08',
      dagBlockHash: '7f4d...6641e',
      timestamp: new Date().toISOString(),
      analyst: 'Elena Rostova (0x8b1C)',
      findings: {
        operatingMarginDelta: '+142 bps',
        statutoryGapVariance: '$1.84M',
      },
    };
    const blob = new Blob([JSON.stringify(reportData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `OmniVise-Reasoning-Report-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSimulateCounterfactual = () => {
    setCounterfactualRunning(true);
    setTimeout(() => {
      setCounterfactualRunning(false);
      setCounterfactualResult(
        'Ablation Test Complete: Masking French Subsidiary statutory filing shifts baseline conclusion from +142 bps to +104 bps (Stability Index: 91.8%).'
      );
      setTimeout(() => setCounterfactualResult(null), 6000);
    }, 1200);
  };

  return (
    <div className="space-y-8 animate-fadeIn max-w-[1360px] mx-auto pb-12">
      {/* Top Status & Header Controls */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#E8F6F2] text-[#0B5C48] border border-[#C6ECE0] text-[11px] font-bold tracking-wider uppercase shadow-xs flex-wrap">
            <span className="w-2 h-2 rounded-full bg-[#0B5C48]" />
            <span>Verified Reasoning Engine &middot; Active</span>
            <span className="text-slate-500 font-mono font-normal pl-2 border-l border-[#C6ECE0]">
              &amp;#9201; Latency: 412ms
            </span>
            <span className="text-slate-500 font-mono font-normal pl-2 border-l border-[#C6ECE0]">
              Consensus DAG #9042
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-sans font-bold text-slate-900 tracking-tight">
            Evidence Reasoning Workspace
          </h1>
          <p className="text-sm text-slate-500 max-w-3xl leading-relaxed">
            Query multi-modal evidence lattices with cryptographic provenance, automated contradiction detection, and adversarial robustness scoring.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 shrink-0 flex-wrap">
          <button
            type="button"
            onClick={() => {
              setQuery(
                'Are there price or quantity variances on the Nexus Semiconductor POs?'
              );
            }}
            className="px-4 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold rounded-full flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
          >
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>History (24)</span>
          </button>

          <button
            type="button"
            onClick={handleSaveToDossier}
            className="px-4 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold rounded-full flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
          >
            <Bookmark className="w-3.5 h-3.5 text-slate-400" />
            <span>{savedToDossier ? 'Saved to Dossier ✓' : 'Save to Dossier'}</span>
          </button>

          <button
            type="button"
            onClick={handleExportReport}
            className="px-5 py-2.5 bg-[#0B5C48] hover:bg-[#084838] active:bg-[#06392c] text-white text-xs font-semibold rounded-full flex items-center gap-2 shadow-sm shadow-emerald-950/20 transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Audit Report</span>
          </button>
        </div>
      </div>

      {/* Query Bar Container */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs space-y-4">
        <form onSubmit={handleInference} className="space-y-4">
          {/* Main Input Row */}
          <div className="relative flex items-center">
            <div className="w-9 h-9 rounded-xl bg-[#E6F8F3] text-[#0B5C48] flex items-center justify-center shrink-0 absolute left-3 pointer-events-none">
              <Sparkles className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Enter cross-source query to verify against grounded evidence..."
              className="w-full pl-14 pr-4 py-3.5 bg-[#F8FAFC] border border-slate-200 text-slate-900 text-xs sm:text-sm font-medium rounded-2xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0B5C48]/10 focus:border-[#0B5C48] transition-all"
            />
          </div>

          {/* Controls & Action Buttons Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-2 flex-wrap text-xs">
              {/* Scope Dropdown */}
              <div className="relative">
                <select
                  value={scope}
                  onChange={(e) => setScope(e.target.value)}
                  className="px-3 py-1.5 bg-[#F8FAFC] border border-slate-200 text-slate-700 text-xs font-medium rounded-xl appearance-none pr-7 focus:outline-none focus:border-[#0B5C48]"
                >
                  <option>Scope: All Ingested Sources (14)</option>
                  <option>Scope: Primary Regulatory Filings (6)</option>
                  <option>Scope: Audio &amp; Deposition Transcripts (4)</option>
                </select>
                <Layers className="w-3 h-3 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
              </div>

              {/* Strictness Dropdown */}
              <div className="relative">
                <select
                  value={strictness}
                  onChange={(e) => setStrictness(e.target.value)}
                  className="px-3 py-1.5 bg-[#F8FAFC] border border-slate-200 text-slate-700 text-xs font-medium rounded-xl appearance-none pr-7 focus:outline-none focus:border-[#0B5C48]"
                >
                  <option>Strictness: High Assurance (RPS)</option>
                  <option>Strictness: Medium (Exploratory)</option>
                  <option>Strictness: Zero-Tolerance Statutory</option>
                </select>
                <Shield className="w-3 h-3 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
              </div>

              {/* Model Dropdown */}
              <div className="relative">
                <select
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="px-3 py-1.5 bg-[#F8FAFC] border border-slate-200 text-slate-700 text-xs font-medium rounded-xl appearance-none pr-7 focus:outline-none focus:border-[#0B5C48]"
                >
                  <option>Model: Deterministic Ground-Truth</option>
                  <option>Model: Dual-Consensus Arbitrator</option>
                </select>
                <Cpu className="w-3 h-3 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto">
              <button
                type="button"
                onClick={() => setQuery('')}
                className="text-xs font-semibold text-slate-500 hover:text-slate-900 cursor-pointer"
              >
                Clear
              </button>

              <button
                type="submit"
                disabled={isLoading}
                className="px-6 py-2.5 bg-[#0B5C48] hover:bg-[#084838] active:bg-[#06392c] text-white text-xs font-semibold rounded-xl flex items-center gap-2 shadow-sm transition-all cursor-pointer disabled:opacity-60"
              >
                <span>{isLoading ? 'Synthesizing...' : 'Run Inference'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </form>
      </div>

      {counterfactualResult && (
        <div className="p-3.5 bg-[#E6F8F3] border border-[#BCEEE2] rounded-2xl text-xs text-[#0B5C48] flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#0B5C48]" />
            <span>{counterfactualResult}</span>
          </div>
          <button
            type="button"
            onClick={() => setCounterfactualResult(null)}
            className="text-slate-400 hover:text-slate-600"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Two Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (8 cols): Synthesis, Supporting, and Conflicting Evidence */}
        <div className="lg:col-span-8 space-y-6">
          {/* Card 1: Synthesis & Verified Conclusion */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#E6F8F3] text-[#0B5C48] flex items-center justify-center shrink-0">
                  <GitBranch className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900 font-sans tracking-tight">
                    Synthesis &amp; Verified Conclusion
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    Evaluated 3m ago via Consensus Gate #08
                  </p>
                </div>
              </div>

              <span className="bg-amber-50 text-amber-800 border border-amber-200/80 text-[10px] font-bold px-3 py-1 rounded-full whitespace-nowrap self-start sm:self-auto flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                STATUS: REVIEW REQUIRED (DIVERGENCE DETECTED)
              </span>
            </div>

            {/* Narrative with Highlighted Figures */}
            <div className="text-xs sm:text-sm text-slate-700 leading-relaxed space-y-2">
              <p>
                European logistics operating margins expanded by{' '}
                <strong className="text-[#0B5C48] font-bold bg-[#E6F8F3] px-1.5 py-0.5 rounded">
                  +142 bps
                </strong>{' '}
                (from 11.40% to 12.82%) following the Phase-2 automated sorting deployment in Q3
                2024. However,{' '}
                <strong className="text-amber-800 font-bold bg-amber-50 px-1.5 py-0.5 rounded">
                  capital expenditure capitalization rules differ
                </strong>{' '}
                between French and DACH subsidiaries, creating an unmitigated statutory GAAP
                reconciliation variance of approximately{' '}
                <strong className="text-amber-800 font-bold bg-amber-50 px-1.5 py-0.5 rounded">
                  $1.84M
                </strong>
                .
              </p>
            </div>

            {/* Bottom Metrics Pills Bar */}
            <div className="pt-4 border-t border-slate-100 grid grid-cols-3 gap-3">
              <div className="flex items-center gap-2 p-2 bg-[#F8FAFC] rounded-xl border border-slate-200/60">
                <ShieldCheck className="w-4 h-4 text-[#0B5C48] shrink-0" />
                <div>
                  <span className="text-[10px] text-slate-400 block leading-tight">
                    Grounding Score
                  </span>
                  <span className="text-xs font-bold text-slate-900 font-mono">94.2%</span>
                </div>
              </div>

              <div className="flex items-center gap-2 p-2 bg-[#F8FAFC] rounded-xl border border-slate-200/60">
                <Layers className="w-4 h-4 text-[#0B5C48] shrink-0" />
                <div>
                  <span className="text-[10px] text-slate-400 block leading-tight">
                    Corroborating
                  </span>
                  <span className="text-xs font-bold text-slate-900 font-mono">3 Sources</span>
                </div>
              </div>

              <div className="flex items-center gap-2 p-2 bg-amber-50/60 rounded-xl border border-amber-200/60">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <div>
                  <span className="text-[10px] text-amber-800 block leading-tight">
                    Divergence
                  </span>
                  <span className="text-xs font-bold text-amber-900 font-mono">1 Flagged</span>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Supporting Evidence */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-xs space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-900">
                <FileText className="w-4 h-4 text-[#0B5C48]" />
                <h3 className="text-sm font-bold tracking-tight">Supporting Evidence</h3>
              </div>
              <span className="bg-[#E6F8F3] text-[#0B5C48] border border-[#BCEEE2] text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                3 Sources Verified
              </span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed -mt-3">
              Corroborated across 3 distinct modal anchors
            </p>

            {/* Supporting items list */}
            <div className="space-y-4 pt-1">
              {supportingItems.map((item) => (
                <div
                  key={item.id}
                  className="bg-[#F8FAFC] border border-slate-200/80 rounded-2xl p-4 sm:p-5 space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-slate-900">{item.sourceDoc}</span>
                      <span className="text-[11px] text-slate-400 font-mono">&middot; {item.location}</span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="bg-[#E6F8F3] text-[#0B5C48] border border-[#BCEEE2] text-[10px] font-bold px-2 py-0.5 rounded-md">
                        {item.badge}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          if (item.type === 'Audio') {
                            setIsPlayingAudio(!isPlayingAudio);
                          } else {
                            setInspectItem(item);
                          }
                        }}
                        className="text-xs font-semibold text-slate-700 hover:text-slate-900 hover:underline flex items-center gap-1"
                      >
                        {item.type === 'Audio' ? (
                          isPlayingAudio ? (
                            <>
                              <Pause className="w-3 h-3" /> Pause Snippet
                            </>
                          ) : (
                            <>
                              <Play className="w-3 h-3" /> Play Snippet
                            </>
                          )
                        ) : (
                          <>
                            {item.actionLabel} <ExternalLink className="w-3 h-3" />
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 font-serif italic bg-white p-3 rounded-xl border border-slate-200/60 leading-relaxed">
                    {item.quote}
                  </p>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono pt-1">
                    <span>{item.footerLeft}</span>
                    <span className="text-slate-500">{item.footerRight}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Card 3: Conflicting Evidence & Divergent Claims */}
          <div className="bg-[#FFFBF5] border border-amber-200/80 rounded-3xl p-6 sm:p-7 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>Conflicting Evidence &amp; Divergent Claims</span>
              </div>
              <span className="bg-amber-100 text-amber-900 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-amber-200">
                ! 1 Discrepancy Flagged
              </span>
            </div>
            <p className="text-xs text-amber-800/80 -mt-2">
              1 inconsistency detected across accounting jurisdictions
            </p>

            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-amber-200/60 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-slate-900">
                    French_Subsidiary_Statutory_Accounts_FY24.pdf
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">&middot; Page 18, Note 7</span>
                </div>
                <span className="bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold px-2 py-0.5 rounded-md">
                  Statutory Divergence
                </span>
              </div>

              <p className="text-xs text-slate-600 font-serif italic bg-[#F8FAFC] p-3 rounded-xl border border-slate-200/60 leading-relaxed">
                &ldquo;...Software maintenance licensing and local robotics depreciation were recorded under SG&amp;A rather than COGS, artificially elevating operational gross margin by approximately 58 bps.&rdquo;
              </p>

              {/* Impact Analysis Callout */}
              <div className="p-3.5 bg-amber-50/80 border border-amber-200/80 rounded-xl space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                  <Info className="w-3.5 h-3.5 text-amber-700" />
                  <span>Impact Analysis</span>
                </div>
                <p className="text-xs text-amber-900 leading-relaxed">
                  Deterministic GAAP variance of <strong className="font-bold">$1.84M</strong> between statutory local filing and group IFRS consolidation. Without this reclassification, reported operating margin improvement would be <strong className="font-bold">+104 bps</strong> instead of +142 bps.
                </p>
              </div>

              {/* Divergence Actions */}
              <div className="flex flex-col sm:flex-row items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsFlagged(true)}
                  className="w-full sm:w-auto px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Flag className="w-3.5 h-3.5 text-amber-600" />
                  <span>{isFlagged ? 'Flagged for Review ✓' : 'Flag for Auditor Review'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsReconciled(true)}
                  className="w-full sm:w-auto px-4 py-2 bg-amber-400 hover:bg-amber-500 active:bg-amber-600 text-slate-950 text-xs font-bold rounded-xl transition-colors cursor-pointer shadow-xs"
                >
                  {isReconciled ? 'Reconciliation Staged ✓' : 'Reconcile Divergence'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (4 cols): Adversarial Robustness & Audit Trail Gate */}
        <div className="lg:col-span-4 space-y-6">
          {/* Card 1: Adversarial Robustness */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-900">
                <ShieldCheck className="w-4 h-4 text-[#0B5C48]" />
                <h3 className="text-sm font-bold tracking-tight">Adversarial Robustness</h3>
              </div>
              <span className="bg-[#E6F8F3] text-[#0B5C48] border border-[#BCEEE2] text-[10px] font-bold px-2 py-0.5 rounded-full">
                RPS Verified
              </span>
            </div>

            {/* Radial Meter & Confidence summary */}
            <div className="flex flex-col items-center text-center p-4 bg-[#F8FAFC] border border-slate-200/70 rounded-2xl space-y-2">
              <div className="relative w-24 h-24 flex items-center justify-center">
                {/* SVG circular track */}
                <svg className="w-24 h-24 transform -rotate-90">
                  <circle
                    cx="48"
                    cy="48"
                    r="40"
                    stroke="#E2E8F0"
                    strokeWidth="8"
                    fill="transparent"
                  />
                  <circle
                    cx="48"
                    cy="48"
                    r="40"
                    stroke="#0B5C48"
                    strokeWidth="8"
                    strokeDasharray="251.2"
                    strokeDashoffset={251.2 * (1 - 0.918)}
                    strokeLinecap="round"
                    fill="transparent"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-lg font-extrabold text-slate-900 font-mono leading-none">
                    91.8%
                  </span>
                  <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold mt-0.5">
                    SCORE
                  </span>
                </div>
              </div>

              <div className="space-y-0.5">
                <h4 className="text-xs font-bold text-slate-900">
                  High Institutional Confidence
                </h4>
                <p className="text-[11px] text-slate-500 leading-tight max-w-[200px]">
                  Robust against semantic drift and hostile prompt counterfactuals.
                </p>
              </div>
            </div>

            {/* Progress Metric Bars */}
            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-600">Grounding-Truth Anchoring</span>
                  <span className="font-bold font-mono text-slate-900">98.4%</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full bg-[#0B5C48] rounded-full w-[98.4%]" />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-600">Source Diversity Index</span>
                  <span className="font-bold font-mono text-slate-900">88.0%</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full bg-[#0B5C48] rounded-full w-[88%]" />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-600">Adversarial Resistance</span>
                  <span className="font-bold font-mono text-slate-900">94.5%</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full bg-[#0B5C48] rounded-full w-[94.5%]" />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-600">Cross-Modal Verification</span>
                  <span className="font-bold font-mono text-slate-900">86.2%</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full bg-[#0B5C48] rounded-full w-[86.2%]" />
                </div>
              </div>
            </div>

            {/* Critical Evidence Anchors Table */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <span>Critical Evidence Anchors</span>
                <span>Ablation Impact</span>
              </div>

              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between p-2 bg-[#F8FAFC] rounded-xl border border-slate-200/60">
                  <div className="flex items-center gap-1.5 truncate max-w-[150px]">
                    <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate text-slate-800 font-medium">SEC 10-K Table 4.1</span>
                  </div>
                  <span className="bg-emerald-50 text-[#0B5C48] border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded">
                    42% Essential
                  </span>
                </div>

                <div className="flex items-center justify-between p-2 bg-[#F8FAFC] rounded-xl border border-slate-200/60">
                  <div className="flex items-center gap-1.5 truncate max-w-[150px]">
                    <FileSpreadsheet className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate text-slate-800 font-medium">Settlement Ledger</span>
                  </div>
                  <span className="bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold px-2 py-0.5 rounded">
                    28% - High
                  </span>
                </div>

                <div className="flex items-center justify-between p-2 bg-[#F8FAFC] rounded-xl border border-slate-200/60">
                  <div className="flex items-center gap-1.5 truncate max-w-[150px]">
                    <Music className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate text-slate-800 font-medium">Q4 Exec Audio</span>
                  </div>
                  <span className="bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-bold px-2 py-0.5 rounded">
                    18% - Corroborating
                  </span>
                </div>
              </div>
            </div>

            {/* Robustness Actions */}
            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={handleSimulateCounterfactual}
                disabled={counterfactualRunning}
                className="w-full py-2.5 px-4 bg-[#EFF4FE] hover:bg-[#E0EBFD] text-[#1E3A8A] font-semibold text-xs rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer border border-[#D5E2F5]"
              >
                <Activity className="w-3.5 h-3.5" />
                <span>{counterfactualRunning ? 'Simulating...' : 'Simulate Counterfactual'}</span>
              </button>

              <button
                type="button"
                onClick={handleExportReport}
                className="w-full py-2.5 px-4 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer border border-slate-200"
              >
                <FileCheck2 className="w-3.5 h-3.5 text-slate-400" />
                <span>Generate Audit Attestation</span>
              </button>
            </div>
          </div>

          {/* Card 2: Audit Trail & Sign-Off Gate */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-[#E6F8F3] text-[#0B5C48] flex items-center justify-center shrink-0">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Audit Trail &amp; Sign-Off Gate</h3>
                <p className="text-[11px] text-slate-400">Cryptographic validation protocol</p>
              </div>
            </div>

            {/* Key-Value Block */}
            <div className="p-3.5 bg-[#F8FAFC] border border-slate-200/80 rounded-2xl space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">HSM Module:</span>
                <span className="font-semibold text-slate-900">FIPS 140-3 Level 4</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">DAG Block Hash:</span>
                <span className="font-mono text-slate-700 bg-white px-1.5 py-0.5 rounded border border-slate-200 text-[11px]">
                  7f4d...6641e
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Analyst Signer:</span>
                <span className="font-semibold text-slate-900">Elena Rostova (0x8b1C)</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Timestamp:</span>
                <span className="font-mono text-slate-500 text-[11px]">2025-02-24 14:32:09 UTC</span>
              </div>
            </div>

            {/* Gate Sign-off Buttons */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setIsSignedOff(true)}
                className={`w-full py-3 px-4 font-semibold text-xs rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs ${
                  isSignedOff
                    ? 'bg-emerald-600 text-white cursor-default'
                    : 'bg-[#0B5C48] hover:bg-[#084838] active:bg-[#06392c] text-white'
                }`}
              >
                {isSignedOff ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Reasoning Signed Off &amp; DAG Sealed</span>
                  </>
                ) : (
                  <>
                    <FileCheck2 className="w-4 h-4" />
                    <span>Sign Off on Reasoning</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  alert(
                    'Querying consensus nodes for leaf hashes: DAG node #8812 -> #9042 with 100% root integrity.'
                  );
                }}
                className="w-full py-2.5 px-4 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold text-xs rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <span>Request Deeper DAG Trace</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Inspect Evidence Modal */}
      {inspectItem && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#0B5C48]" />
                <h3 className="text-sm font-bold text-slate-900">Source Evidence Inspector</h3>
              </div>
              <button
                type="button"
                onClick={() => setInspectItem(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3 text-xs text-slate-600">
              <p>
                <strong>Source Document:</strong> {inspectItem.sourceDoc}
              </p>
              <p>
                <strong>Location:</strong> {inspectItem.location}
              </p>
              <p>
                <strong>Verification Badge:</strong> {inspectItem.badge}
              </p>
              <div className="p-3 bg-[#F8FAFC] rounded-xl border border-slate-200 font-serif italic text-slate-800 leading-relaxed">
                {inspectItem.quote}
              </div>
              <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 pt-1">
                <span>{inspectItem.footerLeft}</span>
                <span>{inspectItem.footerRight}</span>
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setInspectItem(null)}
                className="px-4 py-2 bg-[#0B5C48] text-white text-xs font-semibold rounded-xl"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
