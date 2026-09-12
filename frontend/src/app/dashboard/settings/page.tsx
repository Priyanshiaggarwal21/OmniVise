'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  Lock,
  Bell,
  HardDrive,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Check,
  RotateCcw,
  Key,
  Smartphone,
  Briefcase,
  Download,
  Palette,
} from 'lucide-react';

export default function SettingsPage() {
  const [userName, setUserName] = useState('Elena Rostova');
  const [userEmail, setUserEmail] = useState('elena.r@omnivise.institutional');
  const [userRole, setUserRole] = useState('Analyst');
  const [mobilePhone, setMobilePhone] = useState('+1 (555) 438-9201');
  const [capacity, setCapacity] = useState('Lead Macro & Corporate Forensics');

  // Notification toggles
  const [notifContradictions, setNotifContradictions] = useState(true);
  const [notifConsensus, setNotifConsensus] = useState(true);
  const [notifBatchTelemetry, setNotifBatchTelemetry] = useState(false);
  const [notifDailyDigest, setNotifDailyDigest] = useState(true);
  const [notifSmsEmergency, setNotifSmsEmergency] = useState(false);

  // Appearance & density
  const [surfaceMode, setSurfaceMode] = useState<'light' | 'dark'>('light');
  const [density, setDensity] = useState<'compact' | 'standard' | 'comfortable'>('standard');
  const [fontScale, setFontScale] = useState<'100' | '110' | '120'>('100');

  // Purge state
  const [purgeState, setPurgeState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [purgeFeedback, setPurgeFeedback] = useState<string | null>(null);
  const [saveSuccessNotice, setSaveSuccessNotice] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedRole =
        localStorage.getItem('omnivise_selected_role') ||
        sessionStorage.getItem('omnivise_selected_role');
      if (storedRole) setUserRole(storedRole);

      const storedUser = localStorage.getItem('omnivise_user');
      if (storedUser) {
        try {
          const parsed = JSON.parse(storedUser);
          if (parsed.name) setUserName(parsed.name);
          if (parsed.email) setUserEmail(parsed.email);
        } catch {
          // ignore
        }
      }
    }
  }, []);

  const handleSaveAll = () => {
    setSaveSuccessNotice(true);
    setTimeout(() => setSaveSuccessNotice(false), 3000);
  };

  const handleResetDefaults = () => {
    setNotifContradictions(true);
    setNotifConsensus(true);
    setNotifBatchTelemetry(false);
    setNotifDailyDigest(true);
    setNotifSmsEmergency(false);
    setDensity('standard');
    setFontScale('100');
    setSurfaceMode('light');
  };

  const handleDownloadLog = () => {
    const logData = {
      exportTime: new Date().toISOString(),
      analyst: userName,
      role: userRole,
      hsmSession: 'PKCS#11 ACTIVE',
      enclaveLevel: 4,
      recentActions: [
        'Validated Q3_Consolidated_Financial_Audit_SEC10K.pdf [Sha-256: 0x8f4c...92a1]',
        'Approved APAC Logistics Expansion Brief consensus gate [0x8b...32fa]',
        'Initiated contradiction query on Operating Margin delta',
      ],
    };
    const blob = new Blob([JSON.stringify(logData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Analyst-Activity-Log-${userName.replace(/\s+/g, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  async function purgeSession() {
    setPurgeState('loading');
    setPurgeFeedback(null);
    try {
      const res = await fetch('/api/workspace/purge-session', { method: 'POST' });
      if (!res.ok) throw new Error('Purge failed');
      const data = await res.json();
      setPurgeState('done');
      const filesCount = data.deleted_files_count ?? 0;
      const embCount = data.embeddings_purged ?? 0;
      setPurgeFeedback(
        filesCount > 0 || embCount > 0
          ? `Purged ${filesCount} temp file(s) and ${embCount} ephemeral embedding(s).`
          : 'All session temporary artifacts, embeddings, and cached frames purged.'
      );
      setTimeout(() => {
        setPurgeState('idle');
        setPurgeFeedback(null);
      }, 5000);
    } catch {
      setPurgeState('error');
      setPurgeFeedback('Failed to purge session data. Please try again.');
      setTimeout(() => {
        setPurgeState('idle');
        setPurgeFeedback(null);
      }, 4000);
    }
  }

  const initials = userName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase() || 'ER';

  return (
    <div className="space-y-8 animate-fadeIn max-w-[1360px] mx-auto pb-12">
      {/* Top Banner & Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#E8F6F2] text-[#0B5C48] border border-[#C6ECE0] text-[11px] font-bold tracking-wider uppercase shadow-xs">
            <span className="w-2 h-2 rounded-full bg-[#0B5C48]" />
            <span>Institutional Credentials &amp; Preferences &middot; Active Session</span>
            <span className="text-slate-500 font-mono font-normal pl-2 border-l border-[#C6ECE0] flex items-center gap-1">
              <Lock className="w-3 h-3 text-slate-400" />
              Enclave Level-4
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-sans font-bold text-slate-900 tracking-tight">
            Account &amp; System Settings
          </h1>
          <p className="text-sm text-slate-500 max-w-3xl leading-relaxed">
            Manage analyst profile credentials, algorithmic alert thresholds, cryptographic vault governance, and interface preferences within the isolated enclave.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="px-4 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold rounded-full flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
            <span>Reset Defaults</span>
          </button>

          <button
            type="button"
            onClick={handleSaveAll}
            className="px-5 py-2.5 bg-[#0B5C48] hover:bg-[#084838] active:bg-[#06392c] text-white text-xs font-semibold rounded-full flex items-center gap-2 shadow-sm shadow-emerald-950/20 transition-all cursor-pointer"
          >
            <Check className="w-4 h-4 stroke-[2.5]" />
            <span>Save All Changes</span>
          </button>
        </div>
      </div>

      {saveSuccessNotice && (
        <div className="p-3 bg-[#E6F8F3] border border-[#BCEEE2] rounded-2xl text-xs text-[#0B5C48] flex items-center gap-2 shadow-xs">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span className="font-medium">All settings and cryptographic preferences saved to secure enclave.</span>
        </div>
      )}

      {/* Two Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (7 cols): Profile & Notifications */}
        <div className="lg:col-span-7 space-y-6">
          {/* Card 1: Profile & Identity Verification */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-xs space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900 font-sans tracking-tight">
                  Profile &amp; Identity Verification
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Personal identifiers and cryptographic analyst credentials
                </p>
              </div>
              <span className="bg-[#E6F8F3] text-[#0B5C48] border border-[#BCEEE2] text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                Verified FIPS 140-3 Analyst
              </span>
            </div>

            {/* Avatar Profile Box */}
            <div className="bg-[#F8FAFC] border border-slate-200/80 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="relative">
                  <div className="w-12 h-12 rounded-2xl bg-[#0B5C48] text-white flex items-center justify-center font-bold font-sans text-base shadow-xs">
                    {initials}
                  </div>
                  <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 absolute -bottom-1 -right-1 ring-2 ring-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900">{userName}</h3>
                    <span className="bg-amber-100 text-amber-900 font-mono text-[10px] font-bold px-1.5 py-0.5 rounded">
                      Clearance L3
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Senior Institutional {userRole} &mdash; Macro Logistics &amp; M&amp;A
                  </p>
                  <p className="font-mono text-[10px] text-[#0B5C48] mt-1">
                    ECDSA-P384 : 0x8F41...b729
                  </p>
                </div>
              </div>

              <button
                type="button"
                className="px-3.5 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl whitespace-nowrap shadow-xs transition-colors self-start sm:self-center"
              >
                Upload New Photo
              </button>
            </div>

            {/* Form Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Full Legal Name
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#F8FAFC] border border-slate-200 text-slate-900 text-xs rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0B5C48]/10 focus:border-[#0B5C48]"
                  />
                  <CheckCircle2 className="w-4 h-4 text-[#0B5C48] absolute right-3.5 top-3" />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                    Institutional Email
                  </label>
                  <span className="text-[10px] text-slate-400 font-semibold flex items-center gap-1">
                    <Lock className="w-2.5 h-2.5 text-slate-400" /> Domain Locked
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="email"
                    value={userEmail}
                    readOnly
                    className="w-full px-3.5 py-2.5 bg-slate-100/80 border border-slate-200 text-slate-600 text-xs rounded-xl cursor-not-allowed font-mono"
                  />
                  <ShieldCheck className="w-4 h-4 text-[#0B5C48] absolute right-3.5 top-3" />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                    Authorized Signal Mobile
                  </label>
                  <span className="text-[10px] text-[#0B5C48] font-bold">SMS 2FA Verified</span>
                </div>
                <div className="relative">
                  <input
                    type="tel"
                    value={mobilePhone}
                    onChange={(e) => setMobilePhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#F8FAFC] border border-slate-200 text-slate-900 text-xs rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0B5C48]/10 focus:border-[#0B5C48]"
                  />
                  <Smartphone className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Designated Capacity
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={capacity}
                    onChange={(e) => setCapacity(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#F8FAFC] border border-slate-200 text-slate-900 text-xs rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0B5C48]/10 focus:border-[#0B5C48]"
                  />
                  <Briefcase className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
                </div>
              </div>
            </div>

            {/* Hardware Enclave Sub-Block */}
            <div className="pt-2 border-t border-slate-100 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-900">
                    Hardware Enclave &amp; Master Authentication
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Cryptographic key management and FIPS rotation policies
                  </p>
                </div>
                <button
                  type="button"
                  className="text-xs font-semibold text-slate-700 hover:text-slate-900 px-3 py-1.5 bg-[#F1F5F9] border border-slate-200 rounded-lg hover:bg-slate-200 transition-colors"
                >
                  Change Master Password
                </button>
              </div>

              {/* YubiKey item */}
              <div className="bg-[#F8FAFC] border border-slate-200/80 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-[#E6F8F3] text-[#0B5C48] flex items-center justify-center shrink-0">
                    <Key className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">
                        YubiKey 5C NFC &middot; Serial #9482D14
                      </span>
                      <span className="bg-[#E6F8F3] text-[#0B5C48] text-[10px] font-bold px-2 py-0.5 rounded-full">
                        Primary Enforced
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      FIPS Level 3 physical token &middot; Last validated 14m ago
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl whitespace-nowrap shadow-xs transition-colors self-start sm:self-center"
                >
                  + Add New Key
                </button>
              </div>
            </div>
          </div>

          {/* Card 2: Notifications & Real-Time Alerts */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-xs space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-900">
                <Bell className="w-4 h-4 text-[#0B5C48]" />
                <h2 className="text-base font-bold font-sans tracking-tight">
                  Notifications &amp; Real-Time Alerts
                </h2>
              </div>
              <span className="bg-[#F1F5F9] text-slate-600 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-slate-200">
                5 Configured Channels
              </span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed -mt-2">
              Configure multi-modal alerts, consensus breaches, and regulatory divergence warnings
            </p>

            {/* Toggle Rows */}
            <div className="space-y-4 pt-1">
              {/* Toggle 1 */}
              <div className="flex items-start justify-between gap-4 pb-3 border-b border-slate-100">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900">
                      Contradiction &amp; Divergence Alerts
                    </span>
                    <span className="bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold px-1.5 py-0.5 rounded">
                      Priority 1
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Immediate high-priority notifications when contradictory statutory filings or accounting variances &gt; $500k are detected.
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={notifContradictions}
                  onClick={() => setNotifContradictions(!notifContradictions)}
                  className={`w-9 h-5 rounded-full transition-colors relative flex items-center px-0.5 shrink-0 mt-0.5 ${
                    notifContradictions ? 'bg-[#0B5C48]' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`w-4 h-4 rounded-full bg-white transition-transform ${
                      notifContradictions ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Toggle 2 */}
              <div className="flex items-start justify-between gap-4 pb-3 border-b border-slate-100">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900">
                      Consensus Gate Approvals
                    </span>
                    <span className="bg-[#E6F8F3] text-[#0B5C48] border border-[#BCEEE2] text-[10px] font-bold px-1.5 py-0.5 rounded">
                      Quorum
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Receive signature requests when decisions reach consensus threshold quorum (&ge;90% robustness rating across models).
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={notifConsensus}
                  onClick={() => setNotifConsensus(!notifConsensus)}
                  className={`w-9 h-5 rounded-full transition-colors relative flex items-center px-0.5 shrink-0 mt-0.5 ${
                    notifConsensus ? 'bg-[#0B5C48]' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`w-4 h-4 rounded-full bg-white transition-transform ${
                      notifConsensus ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Toggle 3 */}
              <div className="flex items-start justify-between gap-4 pb-3 border-b border-slate-100">
                <div className="space-y-1">
                  <span className="text-xs font-bold text-slate-900">
                    New Ingestion Batch Telemetry
                  </span>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Summary digests when large multi-modal document corpora finish embedding generation and vector pinning.
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={notifBatchTelemetry}
                  onClick={() => setNotifBatchTelemetry(!notifBatchTelemetry)}
                  className={`w-9 h-5 rounded-full transition-colors relative flex items-center px-0.5 shrink-0 mt-0.5 ${
                    notifBatchTelemetry ? 'bg-[#0B5C48]' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`w-4 h-4 rounded-full bg-white transition-transform ${
                      notifBatchTelemetry ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Toggle 4 */}
              <div className="flex items-start justify-between gap-4 pb-3 border-b border-slate-100">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900">
                      Daily Audit Ledger Digest
                    </span>
                    <span className="bg-slate-100 text-slate-600 font-mono text-[10px] font-bold px-1.5 py-0.5 rounded">
                      08:00 UTC
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Automated morning summary of sealed DAG blocks, immutable hash receipts, and cryptographic integrity proofs.
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={notifDailyDigest}
                  onClick={() => setNotifDailyDigest(!notifDailyDigest)}
                  className={`w-9 h-5 rounded-full transition-colors relative flex items-center px-0.5 shrink-0 mt-0.5 ${
                    notifDailyDigest ? 'bg-[#0B5C48]' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`w-4 h-4 rounded-full bg-white transition-transform ${
                      notifDailyDigest ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Toggle 5 */}
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900">
                      SMS Emergency Escalation
                    </span>
                    <span className="bg-amber-100 text-amber-900 text-[10px] font-bold px-1.5 py-0.5 rounded">
                      FIPS Trigger
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Dispatch encrypted SMS alerts for critical FIPS compliance infractions or air-gap perimeter anomaly events.
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={notifSmsEmergency}
                  onClick={() => setNotifSmsEmergency(!notifSmsEmergency)}
                  className={`w-9 h-5 rounded-full transition-colors relative flex items-center px-0.5 shrink-0 mt-0.5 ${
                    notifSmsEmergency ? 'bg-[#0B5C48]' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`w-4 h-4 rounded-full bg-white transition-transform ${
                      notifSmsEmergency ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (5 cols): Data Governance & Interface */}
        <div className="lg:col-span-5 space-y-6">
          {/* Card 1: Data Governance & Vault */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
            <div>
              <div className="flex items-center gap-2 text-slate-900">
                <HardDrive className="w-4 h-4 text-[#0B5C48]" />
                <h3 className="text-base font-bold font-sans tracking-tight">
                  Data Governance &amp; Vault
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Cryptographic memory indexing, retention cycles, and session hygiene
              </p>
            </div>

            {/* Memory Vault Status Box */}
            <div className="p-3.5 bg-[#F8FAFC] border border-slate-200/80 rounded-2xl space-y-2">
              <div className="flex items-start gap-2.5">
                <HardDrive className="w-4 h-4 text-[#0B5C48] shrink-0 mt-0.5" />
                <p className="text-xs text-slate-600 leading-relaxed">
                  Memory Vault is currently indexing{' '}
                  <strong className="text-slate-900">14 verified evidence feeds</strong> and{' '}
                  <strong className="text-slate-900">24 sealed decision dossiers</strong>.
                </p>
              </div>
              <Link
                href="/vault"
                className="text-xs font-semibold text-[#0B5C48] hover:underline flex items-center gap-1 pt-1"
              >
                <span>Open Memory Vault Configuration</span>
                <span>&rarr;</span>
              </Link>
            </div>

            {/* Session Cache Lifecycle Dropdown */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                Session Cache Lifecycle
              </label>
              <select className="w-full px-3.5 py-2.5 bg-[#F8FAFC] border border-slate-200 text-slate-900 text-xs rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0B5C48]/10 focus:border-[#0B5C48]">
                <option>Strict Air-Gap (Purge on Session End)</option>
                <option>24-Hour Ephemeral Cache</option>
                <option>Session Persistent (Audit Vault Key Required)</option>
              </select>
            </div>

            {/* Download Analyst Activity Log */}
            <button
              type="button"
              onClick={handleDownloadLog}
              className="w-full py-2.5 px-4 bg-[#F8FAFC] hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl flex items-center justify-between transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Download className="w-3.5 h-3.5 text-slate-400" />
                <span>Download Analyst Activity Log</span>
              </div>
              <span className="font-mono text-[10px] text-slate-400">JSON / CSV (Signed)</span>
            </button>

            {/* Danger Zone: Purge Session */}
            <div className="p-4 bg-rose-50/60 border border-rose-200/80 rounded-2xl space-y-3 pt-3.5">
              <div className="flex items-center gap-2 text-rose-700 font-bold text-xs">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>Purge Local Session &amp; Memory Cache</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Instantly flushes local cryptographic session tokens, temporary unanchored query vectors, and browser-cached deduction graphs. Does not affect immutable blockchain DAG ledger.
              </p>

              <button
                type="button"
                onClick={purgeSession}
                disabled={purgeState === 'loading' || purgeState === 'done'}
                className="w-full py-2 px-4 border border-rose-300 text-rose-700 hover:bg-rose-100 text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {purgeState === 'loading' ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Purging Enclave...</span>
                  </>
                ) : purgeState === 'done' ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Purged</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Purge Session Data</span>
                  </>
                )}
              </button>

              {purgeFeedback && (
                <p className={`text-[11px] font-medium pt-1 ${purgeState === 'error' ? 'text-rose-600' : 'text-[#0B5C48]'}`}>
                  {purgeFeedback}
                </p>
              )}
            </div>
          </div>

          {/* Card 2: Interface & Appearance */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-5">
            <div>
              <div className="flex items-center gap-2 text-slate-900">
                <Palette className="w-4 h-4 text-[#0B5C48]" />
                <h3 className="text-base font-bold font-sans tracking-tight">
                  Interface &amp; Appearance
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Visual theme display preferences and accessibility scale
              </p>
            </div>

            {/* Visual Surface Mode (2 Cards side by side) */}
            <div className="space-y-2">
              <span className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                Visual Surface Mode
              </span>
              <div className="grid grid-cols-2 gap-3">
                {/* Light mode */}
                <div
                  onClick={() => setSurfaceMode('light')}
                  className={`p-3 rounded-2xl border-2 transition-all cursor-pointer space-y-2 ${
                    surfaceMode === 'light'
                      ? 'border-[#0B5C48] bg-white shadow-xs'
                      : 'border-slate-200 bg-[#F8FAFC]'
                  }`}
                >
                  <div className="h-12 rounded-xl bg-slate-100 p-2 flex flex-col justify-between">
                    <span className="w-7 h-1.5 rounded-full bg-[#0B5C48]" />
                    <span className="w-12 h-1 rounded-full bg-slate-300" />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">Luminescent</h4>
                      <p className="text-[10px] text-slate-500">Precision Light</p>
                    </div>
                    {surfaceMode === 'light' && (
                      <CheckCircle2 className="w-4 h-4 text-[#0B5C48]" />
                    )}
                  </div>
                </div>

                {/* Dark mode */}
                <div
                  onClick={() => setSurfaceMode('dark')}
                  className={`p-3 rounded-2xl border-2 transition-all cursor-pointer space-y-2 ${
                    surfaceMode === 'dark'
                      ? 'border-[#0B5C48] bg-slate-900 text-white shadow-xs'
                      : 'border-slate-200 bg-[#F8FAFC]'
                  }`}
                >
                  <div className="h-12 rounded-xl bg-slate-800 p-2 flex flex-col justify-between">
                    <span className="w-7 h-1.5 rounded-full bg-emerald-400" />
                    <span className="w-12 h-1 rounded-full bg-slate-600" />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">Midnight</h4>
                      <p className="text-[10px] text-slate-400">Lattice Dark</p>
                    </div>
                    <span className="text-[9px] font-mono font-semibold text-slate-400 bg-slate-100 px-1 py-0.5 rounded">
                      Q2 2026
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Analytical Data Density */}
            <div className="space-y-2">
              <span className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                Analytical Data Density
              </span>
              <div className="bg-[#F1F5F9] p-1 rounded-xl flex items-center text-xs">
                {(['compact', 'standard', 'comfortable'] as const).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDensity(d)}
                    className={`flex-1 py-1.5 rounded-lg capitalize font-medium transition-all ${
                      density === d
                        ? 'bg-white text-slate-900 font-bold shadow-xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            {/* Font Scaling */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                  Font Scaling
                </span>
                <span className="text-[10px] font-mono text-[#0B5C48] font-bold">
                  {fontScale}% (Baseline)
                </span>
              </div>
              <div className="bg-[#F1F5F9] p-1 rounded-xl flex items-center text-xs">
                {(['100', '110', '120'] as const).map((scale) => (
                  <button
                    key={scale}
                    type="button"
                    onClick={() => setFontScale(scale)}
                    className={`flex-1 py-1.5 rounded-lg font-medium transition-all ${
                      fontScale === scale
                        ? 'bg-white text-slate-900 font-bold shadow-xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {scale}% {scale === '100' ? 'Default' : ''}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom System Enclave Status Bar */}
      <div className="w-full bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-2 text-slate-700 font-medium">
          <span className="w-2 h-2 rounded-full bg-[#0B5C48]" />
          <span>System Node: <strong className="font-mono text-slate-900">fra-node-89.omnivise.network</strong></span>
        </div>

        <div className="flex items-center gap-4 text-slate-500 text-[11px] flex-wrap justify-center">
          <span>HSM Session: <strong className="text-slate-700 font-mono font-semibold">PKCS#11 ACTIVE</strong></span>
          <span>&middot;</span>
          <span>Last Master Config Synced: <strong>2m ago</strong></span>
        </div>

        <span className="bg-[#EBF2FC] text-[#1E3A8A] border border-[#D5E2F5] text-[10px] font-bold px-3 py-1 rounded-full whitespace-nowrap">
          Air-Gap Shielded
        </span>
      </div>
    </div>
  );
}