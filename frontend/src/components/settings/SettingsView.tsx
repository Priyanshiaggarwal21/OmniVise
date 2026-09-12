'use client';
import React, { useMemo, useState } from 'react';
import {
  Eye,
  EyeOff,
  Mic,
  MicOff,
  Droplets,
  ShieldAlert,
  Gauge,
  Scale,
  FileText,
  FileSpreadsheet,
  Braces,
  ChevronDown,
  Download,
} from 'lucide-react';
import type { SettingsState, AuditDataset, MatchedDiscrepancy } from '../../types';
import { exportPDF, exportCSV, exportJSON, triggerDownload } from '../../lib/exports';

const DEFAULT_SETTINGS: SettingsState = {
  privacyMode: true,
  voiceAudio: true,
  watermark: false,
  materialityThreshold: 10000,
  accountingStandard: 'ASC 606',
};

const SAMPLE_BANK_UNREDACTED = '1234-5678-9012-5678';
const BANK_REDACTION_REGEX = /(\d{4})-\d{4}-\d{4}-(\d{4})/;

function redactBank(input: string): string {
  return input.replace(BANK_REDACTION_REGEX, '$1-****-****-$2');
}

const SAMPLE_DISCREPANCIES: MatchedDiscrepancy[] = [
  {
    id: 'D-0241',
    documents: ['PO-1042', 'INV-8821'],
    documentKinds: ['Purchase Order', 'Invoice'],
    field: 'Total Amount',
    poValue: 125000,
    invoiceValue: 128750,
    delta: 3750,
    deltaFormatted: '+$3,750.00',
    severity: 'High',
    confidence: 0.96,
    rootCause: 'Freight surcharge omitted from PO',
    auditEvidence: 'Bill of lading #BL-7781 confirms weight adjustment',
    auditEvidenceSource: 'Carrier shipping manifest',
    accountingCategory: 'COGS / Freight-in',
    reportingPeriod: 'Q3 FY2026',
    affectedLineItems: ['SKU-081', 'SKU-092'],
  },
  {
    id: 'D-0242',
    documents: ['CTR-V3', 'MIN-04'],
    documentKinds: ['Contract', 'Earnings Call'],
    field: 'Launch Date',
    poValue: '2026-04-14',
    invoiceValue: '2026-05-02',
    delta: 18,
    deltaFormatted: '+18 days',
    severity: 'Medium',
    confidence: 0.88,
    rootCause: 'Regulatory approval slip',
    auditEvidence: 'FDA correspondence dated 2026-04-20',
    auditEvidenceSource: 'Regulatory filings',
    accountingCategory: 'Revenue Recognition',
    reportingPeriod: 'Q2 FY2026',
  },
];

const SAMPLE_DATASET: AuditDataset = {
  documents: [],
  discrepancies: SAMPLE_DISCREPANCIES,
  metrics: {
    totalAudited: 2847,
    totalAuditedFormatted: '2,847',
    flaggedVariance: 3.12,
    flaggedVarianceFormatted: '3.12%',
    averageConfidence: 0.92,
    documentsCount: 14,
    discrepanciesCount: 4,
    criticalCount: 1,
  },
  graph: { nodes: [], edges: [] },
};

interface ToggleProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  id: string;
  label: string;
  description: string;
  iconOn: React.ReactNode;
  iconOff: React.ReactNode;
  accent: 'violet' | 'cyan' | 'amber';
}

function Toggle({ checked, onChange, id, label, description, iconOn, iconOff, accent }: ToggleProps): React.ReactElement {
  const accentRing: Record<string, string> = {
    violet: 'bg-violet-500 shadow-[0_0_0_4px_rgba(139,92,246,0.15)]',
    cyan: 'bg-cyan-500 shadow-[0_0_0_4px_rgba(34,211,238,0.15)]',
    amber: 'bg-amber-500 shadow-[0_0_0_4px_rgba(245,158,11,0.15)]',
  };
  const accentBorder: Record<string, string> = {
    violet: 'border-violet-400/30',
    cyan: 'border-cyan-400/30',
    amber: 'border-amber-400/30',
  };
  const accentText: Record<string, string> = {
    violet: 'text-violet-300',
    cyan: 'text-cyan-300',
    amber: 'text-amber-300',
  };
  return (
    <div className={`flex items-start justify-between gap-4 rounded-xl border p-4 transition-colors ${checked ? `${accentBorder[accent]} bg-white/[0.04]` : 'border-white/10 bg-white/[0.02]'}`}>
      <div className="flex items-start gap-3 min-w-0">
        <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-slate-950/60 ${checked ? accentText[accent] : 'text-slate-500'}`}>
          {checked ? iconOn : iconOff}
        </div>
        <div className="min-w-0 flex-1">
          <label htmlFor={id} className="block cursor-pointer text-sm font-semibold text-slate-100">
            {label}
          </label>
          <p className="mt-0.5 text-xs leading-relaxed text-slate-400">{description}</p>
        </div>
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative mt-1 h-6 w-11 shrink-0 rounded-full border border-white/10 transition-colors ${checked ? accentRing[accent] : 'bg-slate-700/80'}`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-md transition-transform ${checked ? 'translate-x-5' : 'translate-x-0.5'}`}
        />
      </button>
    </div>
  );
}

const STANDARDS: readonly SettingsState['accountingStandard'][] = ['ASC 606', 'IFRS 15', 'UK GAAP'];

export default function SettingsView(): React.ReactElement {
  const [settings, setSettings] = useState<SettingsState>(DEFAULT_SETTINGS);
  const [dropdownOpen, setDropdownOpen] = useState<boolean>(false);

  const updateSetting = <K extends keyof SettingsState>(key: K, value: SettingsState[K]): void => {
    setSettings((prev: SettingsState): SettingsState => ({ ...prev, [key]: value }));
  };

  const bankDisplay: string = useMemo(
    () => (settings.privacyMode ? redactBank(SAMPLE_BANK_UNREDACTED) : SAMPLE_BANK_UNREDACTED),
    [settings.privacyMode]
  );

  const watermarkText: string = useMemo((): string => {
    const ts: string = new Date().toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
    return `Priyanshi · Admin · ${ts}`;
  }, []);

  const thresholdLabel: string = useMemo(
    (): string => '$' + settings.materialityThreshold.toLocaleString('en-US'),
    [settings.materialityThreshold]
  );

  const timestamp: string = useMemo((): string => new Date().toISOString(), []);

  const handleDownloadPDF = (): void => {
    const blob: Blob = exportPDF(SAMPLE_DATASET, settings, timestamp);
    triggerDownload(blob, `omnivise-audit-report-${timestamp.slice(0, 10)}.pdf`);
  };

  const handleDownloadCSV = (): void => {
    const blob: Blob = exportCSV(SAMPLE_DISCREPANCIES);
    triggerDownload(blob, `omnivise-discrepancies-${timestamp.slice(0, 10)}.csv`);
  };

  const handleDownloadJSON = (): void => {
    const blob: Blob = exportJSON({ settings, dataset: SAMPLE_DATASET });
    triggerDownload(blob, `omnivise-state-${timestamp.slice(0, 10)}.json`);
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 md:p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <header className="rounded-2xl border border-white/10 bg-slate-900/70 p-6 backdrop-blur-xl shadow-2xl">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-300/80">Workspace · Admin</p>
              <h1 className="mt-1 text-2xl font-bold text-slate-100">Platform Settings</h1>
              <p className="mt-1 text-sm text-slate-400">Configure privacy controls, risk thresholds, and reporting outputs.</p>
            </div>
            <div className="hidden shrink-0 items-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-500/5 px-3 py-2 text-xs font-semibold text-emerald-300 md:flex">
              <ShieldAlert className="h-4 w-4" />
              Configuration synced
            </div>
          </div>
        </header>

        <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-6 backdrop-blur-xl shadow-xl">
          <div className="mb-5 flex items-center gap-3 border-b border-white/10 pb-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-violet-400/25 bg-violet-500/10 text-violet-300">
              <Eye className="h-4.5 w-4.5" size={18} />
            </div>
            <div>
              <h2 className="text-sm font-black uppercase tracking-wider text-slate-200">Section 1 · Privacy &amp; Display</h2>
              <p className="text-xs text-slate-500">Screen presentation, audio ingestion, and attribution overlays.</p>
            </div>
          </div>

          <div className="space-y-3">
            <Toggle
              id="privacy-mode"
              checked={settings.privacyMode}
              onChange={(v): void => updateSetting('privacyMode', v)}
              label="Screen Share Privacy Mode"
              description="Redacts sensitive numeric identifiers in preview tiles and live share views."
              iconOn={<EyeOff className="h-4 w-4" />}
              iconOff={<Eye className="h-4 w-4" />}
              accent="violet"
            />
            {settings.privacyMode && (
              <div className="ml-2 overflow-hidden rounded-xl border border-violet-400/20 bg-slate-950/60 p-4">
                <p className="mb-2 text-[10px] font-black uppercase tracking-wider text-violet-300/80">Live Preview · Demo Redaction</p>
                <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-slate-900/80 px-4 py-3">
                  <div className="flex h-8 w-12 items-center justify-center rounded-md bg-gradient-to-br from-indigo-500/30 to-violet-600/30 text-[10px] font-bold text-indigo-200 border border-indigo-400/20">
                    BNK
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] text-slate-500">Sample Operating Account</p>
                    <p className="pii-sensitive-value font-mono text-sm font-bold tracking-wide text-slate-100">{bankDisplay}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-slate-500">Regex pattern</p>
                    <p className="font-mono text-[10px] text-violet-300">{`(\\d{4})-****-****-(\\d{4})`}</p>
                  </div>
                </div>
              </div>
            )}

            <Toggle
              id="voice-audio"
              checked={settings.voiceAudio}
              onChange={(v): void => updateSetting('voiceAudio', v)}
              label="Voice Audio"
              description="Enable live microphone capture and automatic transcript ingestion pipeline."
              iconOn={<Mic className="h-4 w-4" />}
              iconOff={<MicOff className="h-4 w-4" />}
              accent="cyan"
            />
            {settings.voiceAudio && (
              <div className="ml-2 flex items-center gap-3 rounded-xl border border-cyan-400/20 bg-cyan-500/[0.04] px-4 py-3">
                <div className="relative flex h-8 w-8 items-center justify-center rounded-full border border-cyan-400/30 bg-cyan-500/10 text-cyan-300">
                  <Mic className="h-3.5 w-3.5" />
                  <span className="absolute -right-0.5 -top-0.5 flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-60" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-cyan-400" />
                  </span>
                </div>
                <div>
                  <p className="text-xs font-semibold text-cyan-200">Transcripts auto-ingested</p>
                  <p className="text-[11px] text-slate-400">Live audio streams routed to the Groq engine for claim extraction.</p>
                </div>
              </div>
            )}

            <Toggle
              id="watermark"
              checked={settings.watermark}
              onChange={(v): void => updateSetting('watermark', v)}
              label="Watermark Overlay"
              description="Renders a faint diagonal attribution watermark on exported tiles and screenshots."
              iconOn={<Droplets className="h-4 w-4" />}
              iconOff={<Droplets className="h-4 w-4 opacity-50" />}
              accent="amber"
            />
            {settings.watermark && (
              <div className="ml-2 overflow-hidden rounded-xl border border-amber-400/20 bg-slate-950/60 p-2">
                <p className="px-2 pt-2 text-[10px] font-black uppercase tracking-wider text-amber-300/80">Preview Tile</p>
                <div className="relative mt-2 aspect-video overflow-hidden rounded-lg border border-white/10 bg-gradient-to-br from-slate-800/80 via-slate-900/90 to-slate-950">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Revenue Recognition · Q3 FY2026</p>
                      <p className="mt-1 text-xl font-bold text-slate-200">$41.2M</p>
                      <p className="mt-0.5 text-[10px] text-slate-500">Audited GAAP · Annual Report p.47</p>
                    </div>
                  </div>
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden">
                    <p
                      className="select-none whitespace-nowrap text-[11px] font-bold tracking-widest text-amber-300/20"
                      style={{ transform: 'rotate(-22deg)' }}
                    >
                      {watermarkText} &nbsp;·&nbsp; {watermarkText} &nbsp;·&nbsp; {watermarkText}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-6 backdrop-blur-xl shadow-xl">
          <div className="mb-5 flex items-center gap-3 border-b border-white/10 pb-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-rose-400/25 bg-rose-500/10 text-rose-300">
              <Gauge className="h-4.5 w-4.5" size={18} />
            </div>
            <div>
              <h2 className="text-sm font-black uppercase tracking-wider text-slate-200">Section 2 · Risk &amp; Materiality</h2>
              <p className="text-xs text-slate-500">Tune sensitivity thresholds and apply reporting-standard overrides.</p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
              <div className="mb-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-2.5">
                  <Scale className="h-4 w-4 text-rose-300" />
                  <label htmlFor="materiality" className="text-sm font-semibold text-slate-100">
                    Risk Sensitivity Slider
                  </label>
                </div>
                <div className="rounded-lg border border-rose-400/25 bg-rose-500/[0.06] px-3 py-1.5">
                  <p className="font-mono text-sm font-bold text-rose-200">{thresholdLabel} materiality threshold</p>
                </div>
              </div>
              <div className="relative px-1">
                <input
                  id="materiality"
                  type="range"
                  min={1000}
                  max={50000}
                  step={1000}
                  value={settings.materialityThreshold}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
                    updateSetting('materialityThreshold', Number(e.target.value))
                  }
                  className="w-full cursor-pointer appearance-none rounded-full bg-slate-800 accent-rose-500 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-rose-500 [&::-webkit-slider-thumb]:shadow-[0_0_0_4px_rgba(244,63,94,0.15)] [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-rose-500"
                />
                <div className="mt-2 flex items-center justify-between px-1 font-mono text-[10px] text-slate-500">
                  <span>$1,000</span>
                  <span>$15,000</span>
                  <span>$30,000</span>
                  <span>$50,000</span>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2 rounded-lg border border-slate-700/50 bg-slate-950/50 px-3 py-2">
                <ShieldAlert className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                <p className="text-[11px] text-slate-400">
                  Deltas exceeding <span className="font-mono font-bold text-rose-300">{thresholdLabel}</span> escalate automatically to the audit committee queue.
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
              <div className="mb-3 flex items-center gap-2.5">
                <FileText className="h-4 w-4 text-indigo-300" />
                <label className="text-sm font-semibold text-slate-100">Accounting Standard</label>
              </div>
              <div className="relative">
                <button
                  type="button"
                  onClick={(): void => setDropdownOpen((o: boolean): boolean => !o)}
                  onBlur={(): void => { window.setTimeout((): void => setDropdownOpen(false), 150); }}
                  className="flex w-full items-center justify-between gap-3 rounded-xl border border-indigo-400/25 bg-slate-950/60 px-4 py-3 text-left transition-colors hover:border-indigo-400/50 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                  aria-haspopup="listbox"
                  aria-expanded={dropdownOpen}
                >
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Active Standard</p>
                    <p className="mt-0.5 font-bold text-slate-100">{settings.accountingStandard}</p>
                  </div>
                  <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                {dropdownOpen && (
                  <ul
                    role="listbox"
                    className="absolute z-20 mt-2 w-full overflow-hidden rounded-xl border border-indigo-400/25 bg-slate-900/95 py-1 shadow-2xl backdrop-blur-xl"
                  >
                    {STANDARDS.map((std: SettingsState['accountingStandard']): React.ReactElement => {
                      const active: boolean = settings.accountingStandard === std;
                      return (
                        <li key={std}>
                          <button
                            type="button"
                            onMouseDown={(e: React.MouseEvent<HTMLButtonElement>): void => e.preventDefault()}
                            onClick={(): void => {
                              updateSetting('accountingStandard', std);
                              setDropdownOpen(false);
                            }}
                            className={`flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-sm transition-colors ${
                              active
                                ? 'bg-indigo-500/10 text-indigo-200'
                                : 'text-slate-200 hover:bg-white/[0.03]'
                            }`}
                            role="option"
                            aria-selected={active}
                          >
                            <span>
                              <span className="font-semibold">{std}</span>
                              <span className="ml-2 text-[11px] text-slate-500">
                                {std === 'ASC 606' && 'US GAAP · Revenue from contracts'}
                                {std === 'IFRS 15' && 'IFRS · Revenue recognition'}
                                {std === 'UK GAAP' && 'FRS 102 · UK and Ireland'}
                              </span>
                            </span>
                            {active && <div className="h-2 w-2 rounded-full bg-indigo-400" />}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
              <p className="mt-3 pl-1 text-[11px] text-slate-500">
                Controls matching logic, threshold currency, and footnote disclosure text across all exports.
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-6 backdrop-blur-xl shadow-xl">
          <div className="mb-5 flex items-center gap-3 border-b border-white/10 pb-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-emerald-400/25 bg-emerald-500/10 text-emerald-300">
              <Download className="h-4.5 w-4.5" size={18} />
            </div>
            <div>
              <h2 className="text-sm font-black uppercase tracking-wider text-slate-200">Section 3 · Export &amp; Reports</h2>
              <p className="text-xs text-slate-500">Download current workspace snapshot in the format required by your audit file.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <button
              type="button"
              onClick={handleDownloadPDF}
              className="group relative overflow-hidden rounded-xl border border-rose-400/25 bg-gradient-to-br from-rose-500/10 via-rose-500/5 to-transparent p-4 text-left transition-all hover:border-rose-400/50 hover:from-rose-500/15 active:scale-[0.98]"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-rose-400/30 bg-rose-500/10 text-rose-300 group-hover:text-rose-200">
                  <FileText className="h-5 w-5" />
                </div>
                <Download className="h-4 w-4 text-rose-300/70 transition-transform group-hover:translate-y-0.5 group-hover:text-rose-200" />
              </div>
              <div className="mt-3">
                <p className="text-sm font-bold text-slate-100">Download PDF</p>
                <p className="mt-0.5 text-[11px] text-slate-400">Narrative report with XAI reasoning, metrics summary, and findings register.</p>
              </div>
              <div className="pointer-events-none absolute -right-8 -bottom-8 h-24 w-24 rounded-full bg-rose-500/10 blur-2xl transition-opacity group-hover:opacity-80" />
            </button>

            <button
              type="button"
              onClick={handleDownloadCSV}
              className="group relative overflow-hidden rounded-xl border border-emerald-400/25 bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent p-4 text-left transition-all hover:border-emerald-400/50 hover:from-emerald-500/15 active:scale-[0.98]"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-emerald-400/30 bg-emerald-500/10 text-emerald-300 group-hover:text-emerald-200">
                  <FileSpreadsheet className="h-5 w-5" />
                </div>
                <Download className="h-4 w-4 text-emerald-300/70 transition-transform group-hover:translate-y-0.5 group-hover:text-emerald-200" />
              </div>
              <div className="mt-3">
                <p className="text-sm font-bold text-slate-100">Download CSV</p>
                <p className="mt-0.5 text-[11px] text-slate-400">Flat discrepancy matrix ready for Excel, ACL, or analytics pipelines.</p>
              </div>
              <div className="pointer-events-none absolute -right-8 -bottom-8 h-24 w-24 rounded-full bg-emerald-500/10 blur-2xl transition-opacity group-hover:opacity-80" />
            </button>

            <button
              type="button"
              onClick={handleDownloadJSON}
              className="group relative overflow-hidden rounded-xl border border-indigo-400/25 bg-gradient-to-br from-indigo-500/10 via-indigo-500/5 to-transparent p-4 text-left transition-all hover:border-indigo-400/50 hover:from-indigo-500/15 active:scale-[0.98]"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-indigo-400/30 bg-indigo-500/10 text-indigo-300 group-hover:text-indigo-200">
                  <Braces className="h-5 w-5" />
                </div>
                <Download className="h-4 w-4 text-indigo-300/70 transition-transform group-hover:translate-y-0.5 group-hover:text-indigo-200" />
              </div>
              <div className="mt-3">
                <p className="text-sm font-bold text-slate-100">Download JSON</p>
                <p className="mt-0.5 text-[11px] text-slate-400">Full workspace state snapshot including settings and audit dataset graph.</p>
              </div>
              <div className="pointer-events-none absolute -right-8 -bottom-8 h-24 w-24 rounded-full bg-indigo-500/10 blur-2xl transition-opacity group-hover:opacity-80" />
            </button>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-slate-950/50 p-3 text-[11px] text-slate-400">
            <ShieldAlert className="h-3.5 w-3.5 shrink-0 text-slate-500" />
            <span>All exports are signed with current settings.</span>
            <span className="font-mono text-slate-500">· Standard: {settings.accountingStandard}</span>
            <span className="font-mono text-slate-500">· Threshold: {thresholdLabel}</span>
            <span className="ml-auto font-mono text-slate-500">generated {timestamp.slice(0, 19).replace('T', ' ')}</span>
          </div>
        </section>

        <footer className="pb-4 text-center text-[10px] font-medium uppercase tracking-widest text-slate-600">
          OmniVise Platform · v1.0.0 · Audit Configuration
        </footer>
      </div>
    </div>
  );
}
