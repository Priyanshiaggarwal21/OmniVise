'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  GitBranch,
  Shield,
  ShieldCheck,
  Lock,
  ArrowRight,
  PlusCircle,
  Download,
  Key,
  RefreshCw,
  Fingerprint,
  FileCheck2,
  FileAudio,
  Radio,
  Clock,
  Sparkles,
} from 'lucide-react';

type FilterCategory = 'all' | 'ingestion' | 'conflicts' | 'approvals';

export default function DashboardHomePage() {
  const [userName, setUserName] = useState('Elena Rostova');
  const [filter, setFilter] = useState<FilterCategory>('all');
  const [gateCleared, setGateCleared] = useState(false);
  const [isSweeping, setIsSweeping] = useState(false);
  const [sweepNotice, setSweepNotice] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedUser = localStorage.getItem('omnivise_user');
      if (storedUser) {
        try {
          const parsed = JSON.parse(storedUser);
          if (parsed.name) setUserName(parsed.name);
        } catch {
          // ignore
        }
      }
    }
  }, []);

  const firstName = userName.split(' ')[0] || 'Elena';

  const handleSweep = () => {
    setIsSweeping(true);
    setTimeout(() => {
      setIsSweeping(false);
      setSweepNotice(true);
      setTimeout(() => setSweepNotice(false), 3500);
    }, 1200);
  };

  const handleExport = () => {
    const data = {
      workspace: 'Institutional Workspace',
      epoch: 'Epoch 1084.9',
      exportDate: new Date().toISOString(),
      integrityStatus: '100% SECURE',
      evidenceSources: 14,
      activeDecisions: 8,
      pendingReviews: 5,
      recentConflicts: 2,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `OmniVise-Audit-Package-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Top Banner & Actions Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2">
        <div className="space-y-3">
          {/* Status indicator pill */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#E8F6F2] text-[#0B5C48] border border-[#C6ECE0] text-[11px] font-bold tracking-wider uppercase shadow-xs">
            <span className="w-2 h-2 rounded-full bg-[#0B5C48]" />
            <span>Stochastic Audit Pipeline &middot; Active</span>
            <span className="text-slate-500 font-mono font-normal pl-2 border-l border-[#C6ECE0]">
              Epoch 1084.9
            </span>
          </div>

          {/* Greeting */}
          <h1 className="text-3xl sm:text-4xl font-sans font-bold text-slate-900 tracking-tight">
            Welcome back, <span className="text-[#0B5C48]">{firstName}</span>
          </h1>
          <p className="text-sm text-slate-500 max-w-2xl leading-relaxed">
            Here is what happened across your verified evidence streams and pending decision gates today.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={handleExport}
            className="px-4 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold rounded-full flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export Audit Package</span>
          </button>

          <Link
            href="/dashboard/upload"
            className="px-5 py-2.5 bg-[#0B5C48] hover:bg-[#084838] active:bg-[#06392c] text-white text-xs font-semibold rounded-full flex items-center gap-2 shadow-sm shadow-emerald-950/20 transition-all cursor-pointer"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Upload Evidence</span>
          </Link>
        </div>
      </div>

      {/* Sweep notification toast */}
      {sweepNotice && (
        <div className="p-3 bg-[#E6F8F3] border border-[#BCEEE2] rounded-2xl text-xs text-[#0B5C48] flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2 font-medium">
            <Sparkles className="w-4 h-4 text-[#0B5C48]" />
            <span>Automated conflict sweep complete: Zero novel discrepancies detected across 14 evidence streams.</span>
          </div>
          <span className="font-mono text-[10px] bg-white/80 px-2 py-0.5 rounded border border-[#BCEEE2]">
            NODE: US-EAST-SEC-04
          </span>
        </div>
      )}

      {/* 4 KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Card 1: Evidence Sources */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Evidence Sources
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100 text-[10px] font-bold">
                <TrendingUp className="w-3 h-3" />
                +16%
              </span>
            </div>
            <div className="flex items-baseline gap-1.5 mb-1">
              <span className="text-3xl font-extrabold text-slate-900 tracking-tight font-sans">
                14
              </span>
              <span className="text-xs font-semibold text-slate-500">Connected</span>
            </div>
            <p className="text-[11px] text-slate-400 mb-4">
              +2 streaming hubs added this week
            </p>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-slate-100">
            {['PDF', 'PostgreSQL', 'PCM Audio', 'SEC 10-K'].map((tag) => (
              <span
                key={tag}
                className="text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200/60"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Card 2: Active Decisions */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Active Decisions
              </span>
              <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100 text-[10px] font-bold">
                On Track
              </span>
            </div>
            <div className="flex items-baseline gap-1.5 mb-1">
              <span className="text-3xl font-extrabold text-slate-900 tracking-tight font-sans">
                8
              </span>
              <span className="text-xs font-semibold text-slate-500">In Progress</span>
            </div>
            <p className="text-[11px] text-slate-400 mb-4">
              3 require consensus clearance
            </p>
          </div>
          <div className="pt-2 border-t border-slate-100 space-y-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-500">Confidence Threshold</span>
              <span className="text-[#0B5C48] font-bold font-mono">87.4%</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
              <div className="h-full bg-[#0B5C48] rounded-full w-[87.4%]" />
            </div>
          </div>
        </div>

        {/* Card 3: Pending Reviews */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Pending Reviews
              </span>
              <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200/60 text-[10px] font-bold flex items-center gap-1">
                ! Action Needed
              </span>
            </div>
            <div className="flex items-baseline gap-1.5 mb-1">
              <span className="text-3xl font-extrabold text-slate-900 tracking-tight font-sans">
                5
              </span>
              <span className="text-xs font-semibold text-slate-500">Awaiting Sign-off</span>
            </div>
            <p className="text-[11px] text-slate-400 mb-4">
              2 high-priority executive dossiers
            </p>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <div className="flex items-center gap-1.5 text-slate-600">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              <span>Tier-1 Institutional</span>
            </div>
            <span className="font-mono text-slate-600 font-semibold bg-slate-100 px-1.5 py-0.5 rounded text-[10px]">
              SLA: 2h 45m
            </span>
          </div>
        </div>

        {/* Card 4: Recent Conflicts */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Recent Conflicts
              </span>
              <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-100 text-[10px] font-bold">
                Warning
              </span>
            </div>
            <div className="flex items-baseline gap-1.5 mb-1">
              <span className="text-3xl font-extrabold text-rose-600 tracking-tight font-sans">
                2
              </span>
              <span className="text-xs font-semibold text-slate-500">Detected</span>
            </div>
            <p className="text-[11px] text-slate-400 mb-4">
              Deterministic DAG divergence found
            </p>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <div className="flex items-center gap-1.5 text-slate-500">
              <GitBranch className="w-3.5 h-3.5 text-slate-400" />
              <span>Cross-source</span>
            </div>
            <Link
              href="/dashboard/decisions"
              className="text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-0.5 hover:underline"
            >
              <span>Inspect 2 claims</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>

      {/* Two Column Layout: Feed (Left) & Security/Actions (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (8 cols): Recent Activity & Evidence Stream */}
        <div className="lg:col-span-8 bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-xs space-y-6">
          {/* Header row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight font-sans">
                Recent Activity &amp; Evidence Stream
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Continuous verification events emitted by cryptographic ingestion nodes
              </p>
            </div>
            <Link
              href="/dashboard/activity"
              className="text-xs font-semibold text-[#0B5C48] hover:underline flex items-center gap-1 whitespace-nowrap self-start sm:self-auto"
            >
              <span>View Audit Log</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                filter === 'all'
                  ? 'bg-[#0B5C48] text-white shadow-xs'
                  : 'bg-[#F1F5F9] text-slate-600 hover:text-slate-900 hover:bg-slate-200'
              }`}
            >
              All Events
            </button>
            <button
              type="button"
              onClick={() => setFilter('ingestion')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                filter === 'ingestion'
                  ? 'bg-[#0B5C48] text-white shadow-xs'
                  : 'bg-[#F1F5F9] text-slate-600 hover:text-slate-900 hover:bg-slate-200'
              }`}
            >
              Evidence Ingestion
            </button>
            <button
              type="button"
              onClick={() => setFilter('conflicts')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                filter === 'conflicts'
                  ? 'bg-[#0B5C48] text-white shadow-xs'
                  : 'bg-[#F1F5F9] text-slate-600 hover:text-slate-900 hover:bg-slate-200'
              }`}
            >
              Contradictions Flagged
            </button>
            <button
              type="button"
              onClick={() => setFilter('approvals')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                filter === 'approvals'
                  ? 'bg-[#0B5C48] text-white shadow-xs'
                  : 'bg-[#F1F5F9] text-slate-600 hover:text-slate-900 hover:bg-slate-200'
              }`}
            >
              Approvals
            </button>
          </div>

          {/* Event Stream List */}
          <div className="space-y-3 pt-1">
            {/* Event 1: Q2 Operating Margin Contraction */}
            {(filter === 'all' || filter === 'conflicts') && (
              <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:bg-slate-50/80">
                <div className="flex items-start gap-3.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200/60 text-amber-600 flex items-center justify-center shrink-0 mt-0.5">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-xs font-bold text-slate-900">
                        Q2 Operating Margin Contraction Claim
                      </h3>
                      <span className="bg-amber-50 text-amber-800 border border-amber-200/60 text-[10px] font-bold px-2 py-0.5 rounded-full">
                        Conflict Flagged
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      Divergent claims between SEC 10-Q filing and investor earnings transcript.
                    </p>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-2 font-medium flex-wrap">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        14m ago
                      </span>
                      <span>&middot;</span>
                      <span>Analyst Chen</span>
                      <span>&middot;</span>
                      <span className="font-mono">Claim ID #DAG-902</span>
                    </div>
                  </div>
                </div>
                <Link
                  href="/dashboard/decisions"
                  className="px-3.5 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-800 text-xs font-semibold rounded-xl whitespace-nowrap shadow-xs transition-colors self-start sm:self-center"
                >
                  Review Divergence
                </Link>
              </div>
            )}

            {/* Event 2: APAC Logistics Expansion Brief */}
            {(filter === 'all' || filter === 'approvals') && (
              <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:bg-slate-50/80">
                <div className="flex items-start gap-3.5">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200/60 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-xs font-bold text-slate-900">
                        APAC Logistics Expansion Brief
                      </h3>
                      <span className="bg-blue-50 text-blue-700 border border-blue-100 text-[10px] font-bold px-2 py-0.5 rounded-full">
                        Approved
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      Cryptographic multi-sig stamp completed across all sovereign audit nodes.
                    </p>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-2 font-medium flex-wrap">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        1h ago
                      </span>
                      <span>&middot;</span>
                      <span>Reviewer Elena Rostova</span>
                      <span>&middot;</span>
                      <span className="font-mono text-[#0B5C48]">0x8b...32fa</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-[#0B5C48] bg-[#E6F8F3] px-3 py-1.5 rounded-xl border border-[#BCEEE2] self-start sm:self-center whitespace-nowrap">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Consensus Met</span>
                </div>
              </div>
            )}

            {/* Event 3: Ingested 142 Audio Transcripts */}
            {(filter === 'all' || filter === 'ingestion') && (
              <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:bg-slate-50/80">
                <div className="flex items-start gap-3.5">
                  <div className="w-9 h-9 rounded-xl bg-purple-50 border border-purple-200/60 text-purple-600 flex items-center justify-center shrink-0 mt-0.5">
                    <FileAudio className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-xs font-bold text-slate-900">
                        Ingested 142 Audio Transcripts &amp; Earnings Records
                      </h3>
                      <span className="bg-purple-50 text-purple-700 border border-purple-100 text-[10px] font-bold px-2 py-0.5 rounded-full">
                        Ingested
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      Byte-level acoustic anchoring generated for cross-modal statement alignment.
                    </p>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-2 font-medium flex-wrap">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        3h ago
                      </span>
                      <span>&middot;</span>
                      <span>Pipeline v4.2 Agent</span>
                      <span>&middot;</span>
                      <span className="font-mono">412.4 MB Processed</span>
                    </div>
                  </div>
                </div>
                <Link
                  href="/dashboard/upload"
                  className="text-xs font-semibold text-slate-700 hover:text-slate-900 transition-colors self-start sm:self-center whitespace-nowrap hover:underline"
                >
                  Inspect Embeddings
                </Link>
              </div>
            )}

            {/* Event 4: Federal Trade Subpoena Discovery Lattice */}
            {(filter === 'all' || filter === 'approvals') && (
              <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:bg-slate-50/80">
                <div className="flex items-start gap-3.5">
                  <div className="w-9 h-9 rounded-xl bg-cyan-50 border border-cyan-200/60 text-cyan-700 flex items-center justify-center shrink-0 mt-0.5">
                    <Radio className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-xs font-bold text-slate-900">
                        Federal Trade Subpoena Discovery Lattice
                      </h3>
                      <span className="bg-emerald-50 text-emerald-800 border border-emerald-200/60 text-[10px] font-bold px-2 py-0.5 rounded-full">
                        Passed 98.4%
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      Deterministic simulation executed under 250 bps variance ceiling.
                    </p>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-2 font-medium flex-wrap">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        5h ago
                      </span>
                      <span>&middot;</span>
                      <span>Automated Resilience Test</span>
                    </div>
                  </div>
                </div>
                <div className="bg-[#EEF2FF] text-[#4F46E5] border border-[#D5DEFD] text-[11px] font-mono font-bold px-2.5 py-1 rounded-lg self-start sm:self-center whitespace-nowrap">
                  L-SCORE : 0.998
                </div>
              </div>
            )}

            {/* Event 5: M&A Tech Due Diligence Repository */}
            {(filter === 'all' || filter === 'ingestion') && (
              <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:bg-slate-50/80">
                <div className="flex items-start gap-3.5">
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-200/60 text-indigo-600 flex items-center justify-center shrink-0 mt-0.5">
                    <GitBranch className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-xs font-bold text-slate-900">
                        M&amp;A Tech Due Diligence Repository
                      </h3>
                      <span className="bg-indigo-50 text-indigo-700 border border-indigo-100 text-[10px] font-bold px-2 py-0.5 rounded-full">
                        Linked
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      3 verified causal corroborations mapped between GL ledger &amp; data room.
                    </p>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-2 font-medium flex-wrap">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        Yesterday
                      </span>
                      <span>&middot;</span>
                      <span className="font-mono">Graph Node #REL-881</span>
                    </div>
                  </div>
                </div>
                <Link
                  href="/dashboard/workspace"
                  className="text-xs font-semibold text-slate-700 hover:text-slate-900 transition-colors self-start sm:self-center whitespace-nowrap hover:underline"
                >
                  Open Graph View
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Right Column (4 cols): System Integrity & Quick Sign-Off */}
        <div className="lg:col-span-4 space-y-6">
          {/* Card 1: System Integrity */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-1">
              <div className="flex items-center gap-2 text-slate-900">
                <Shield className="w-4 h-4 text-[#0B5C48]" />
                <h3 className="text-sm font-bold tracking-tight">System Integrity</h3>
              </div>
              <span className="bg-[#E6F8F3] text-[#0B5C48] border border-[#BCEEE2] text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#0B5C48]" />
                100% SECURE
              </span>
            </div>

            <div className="space-y-3 text-xs">
              {/* Item 1: Cryptographic Ledger */}
              <div className="p-3 bg-[#F8FAFC] border border-slate-200/70 rounded-2xl space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-800 font-semibold">
                    <FileCheck2 className="w-3.5 h-3.5 text-[#0B5C48]" />
                    <span>Cryptographic Ledger</span>
                  </div>
                  <span className="text-[10px] font-semibold text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                    Synced
                  </span>
                </div>
                <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 pt-0.5">
                  <span>Node US-EAST-SEC-04</span>
                  <span>0xec94...441b</span>
                </div>
              </div>

              {/* Item 2: Hallucination Guardrail */}
              <div className="p-3 bg-[#F8FAFC] border border-slate-200/70 rounded-2xl space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-800 font-semibold">
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                    <span>Hallucination Guardrail</span>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/60">
                    Deterministic
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed pt-0.5">
                  Ground-truth mathematical validator active. Model output bounded strictly to anchored evidence tokens.
                </p>
              </div>

              {/* Item 3: FIPS 140-3 Token */}
              <div className="p-3 bg-[#F8FAFC] border border-slate-200/70 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-[#E8F6F2] text-[#0B5C48] flex items-center justify-center">
                    <Key className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-800 block leading-tight">
                      FIPS 140-3 Token
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      Active Session (YubiKey 5Ci)
                    </span>
                  </div>
                </div>
                <Lock className="w-3.5 h-3.5 text-slate-400" />
              </div>
            </div>

            {/* Sweep button */}
            <button
              type="button"
              onClick={handleSweep}
              disabled={isSweeping}
              className="w-full py-2.5 px-4 bg-[#EEF2FF] hover:bg-[#E0E7FF] text-[#4F46E5] font-semibold text-xs rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-60"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSweeping ? 'animate-spin' : ''}`} />
              <span>{isSweeping ? 'Scanning Topology...' : 'Run Automated Conflict Sweep'}</span>
            </button>
          </div>

          {/* Card 2: Quick Sign-Off */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-1">
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                Quick Sign-Off
              </h3>
              <span className="text-xs text-slate-400 font-medium">Queue: 3 Pending</span>
            </div>

            {/* Dossier Card */}
            <div className="p-4 bg-[#F8FAFC] border border-slate-200/80 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="bg-amber-50 text-amber-800 border border-amber-200/60 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  REQUIRES ACTION
                </span>
                <span className="text-xs text-slate-400 font-medium">Priority 1</span>
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-900 leading-snug">
                  Q3 Sovereign Bond Portfolio Rebalancing
                </h4>
                <div className="flex items-center justify-between text-xs text-slate-500 mt-2">
                  <span>Evidence Anchor: 19 Sources</span>
                  <span className="text-[#0B5C48] font-bold font-mono">99.1% Confidence</span>
                </div>
              </div>

              {gateCleared ? (
                <div className="p-2.5 bg-[#E6F8F3] border border-[#BCEEE2] rounded-xl text-center text-xs font-semibold text-[#0B5C48] flex items-center justify-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Gate Cleared &amp; Logged to DAG</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setGateCleared(true)}
                    className="flex-1 py-2 bg-[#0B5C48] hover:bg-[#084838] active:bg-[#06392c] text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer shadow-xs"
                  >
                    Clear Gate
                  </button>
                  <Link
                    href="/dashboard/decisions"
                    className="px-3 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors text-center"
                  >
                    Details
                  </Link>
                </div>
              )}
            </div>

            {/* Biometric validation note */}
            <div className="pt-1 flex items-center justify-between text-[11px] text-slate-400">
              <span className="leading-tight">Multi-factor biometric validation enforced</span>
              <Fingerprint className="w-4 h-4 text-slate-400 shrink-0" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
