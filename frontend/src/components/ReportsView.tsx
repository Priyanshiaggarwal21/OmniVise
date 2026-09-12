'use client';

import { Download, FileJson, FileSpreadsheet, FileText, ShieldAlert, TrendingDown } from 'lucide-react';
import { useMemo } from 'react';
import type { AuditDataset, MatchedDiscrepancy, SettingsState } from '../types';
import { exportCSV, exportJSON, exportPDF, triggerDownload } from '../lib/exports';

interface ReportsViewProps {
  dataset: AuditDataset;
  discrepancies: MatchedDiscrepancy[];
}

const EXPORT_SETTINGS: SettingsState = {
  privacyMode: true,
  voiceAudio: false,
  watermark: false,
  materialityThreshold: 10000,
  accountingStandard: 'ASC 606',
};

export default function ReportsView({ dataset, discrepancies }: ReportsViewProps) {
  const rows = discrepancies;
  const categoryBreakdown = useMemo(() => {
    const counts = new Map<string, number>();
    rows.forEach((row) => counts.set(row.accountingCategory, (counts.get(row.accountingCategory) || 0) + 1));
    return Array.from(counts.entries()).sort(([, countA], [, countB]) => countB - countA);
  }, [rows]);

  const severityCounts = useMemo(() => ({
    Critical: rows.filter((row) => row.severity === 'Critical').length,
    High: rows.filter((row) => row.severity === 'High').length,
    Medium: rows.filter((row) => row.severity === 'Medium').length,
    Low: rows.filter((row) => row.severity === 'Low').length,
  }), [rows]);
  const highRiskCount = severityCounts.Critical + severityCounts.High;
  const maxCategoryCount = Math.max(...categoryBreakdown.map(([, count]) => count), 1);
  const totalVariance = rows.reduce((sum, row) => sum + Math.abs(typeof row.delta === 'number' ? row.delta : parseFloat(String(row.delta).replace(/[^0-9.\-]/g, '')) || 0), 0);
  const exportDataset = { ...dataset, discrepancies: rows };

  const download = (format: 'pdf' | 'csv' | 'json') => {
    const date = new Date().toISOString().slice(0, 10);
    if (format === 'pdf') triggerDownload(exportPDF(exportDataset, EXPORT_SETTINGS, new Date().toISOString()), `omnivise-audit-report-${date}.pdf`);
    if (format === 'csv') triggerDownload(exportCSV(rows), `omnivise-audit-trail-${date}.csv`);
    if (format === 'json') triggerDownload(exportJSON(exportDataset), `omnivise-audit-trail-${date}.json`);
  };

  return (
    <section className="min-h-[calc(100vh-7rem)] rounded-3xl border border-white/10 bg-slate-950/65 p-5 shadow-2xl backdrop-blur-2xl md:p-7">
      <div className="flex flex-col gap-4 border-b border-white/10 pb-6 md:flex-row md:items-end md:justify-between"><div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-fuchsia-300/80">Workspace / Reports</p><h1 className="mt-1 text-2xl font-black tracking-tight text-white">Audit Reports</h1><p className="mt-1 text-xs text-slate-400">Dynamic risk analysis and downloadable audit trails.</p></div><div className="flex flex-wrap gap-2"> <ExportButton label="PDF" icon={<FileText className="h-3.5 w-3.5" />} onClick={() => download('pdf')} /><ExportButton label="CSV" icon={<FileSpreadsheet className="h-3.5 w-3.5" />} onClick={() => download('csv')} /><ExportButton label="JSON" icon={<FileJson className="h-3.5 w-3.5" />} onClick={() => download('json')} /></div></div>

      <div className="mt-6 grid gap-4 md:grid-cols-3"><RiskMetric label="Open Findings" value={rows.length.toString()} tone="indigo" /><RiskMetric label="High Risk" value={highRiskCount.toString()} tone="rose" /><RiskMetric label="Total Variance" value={`$${(totalVariance / 1_000_000).toFixed(1)}M`} tone="amber" /></div>

      <div className="mt-6 grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"><div className="flex items-center justify-between"><div><p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Discrepancy Breakdown</p><h2 className="mt-1 text-base font-black text-white">By Category</h2></div><TrendingDown className="h-4 w-4 text-rose-300" /></div><div className="mt-6 space-y-4">{categoryBreakdown.length === 0 ? <p className="text-xs text-slate-500">No discrepancy data available.</p> : categoryBreakdown.map(([category, count]) => <div key={category}><div className="mb-1.5 flex justify-between gap-3 text-xs"><span className="truncate font-semibold text-slate-300">{category}</span><span className="font-mono font-bold text-slate-500">{count}</span></div><div className="h-2 rounded-full bg-white/5"><div className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-rose-400 transition-all" style={{ width: `${(count / maxCategoryCount) * 100}%` }} /></div></div>)}</div></div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"><div className="flex items-center gap-2"><ShieldAlert className="h-4 w-4 text-amber-300" /><div><p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Executive Risk Summary</p><h2 className="mt-1 text-base font-black text-white">Severity distribution</h2></div></div><div className="mt-6 space-y-3">{([['Critical', severityCounts.Critical, 'bg-rose-400'], ['High', severityCounts.High, 'bg-amber-400'], ['Medium', severityCounts.Medium, 'bg-sky-400'], ['Low', severityCounts.Low, 'bg-emerald-400']] as const).map(([label, count, color]) => <div key={label} className="flex items-center gap-3"><span className={`h-2.5 w-2.5 rounded-full ${color}`} /><span className="w-16 text-xs font-bold text-slate-300">{label}</span><div className="h-2 flex-1 rounded-full bg-white/5"><div className={`h-full rounded-full ${color}`} style={{ width: `${rows.length ? (count / rows.length) * 100 : 0}%` }} /></div><span className="w-5 text-right font-mono text-xs text-slate-500">{count}</span></div>)}</div><div className="mt-6 rounded-xl border border-amber-400/20 bg-amber-500/10 p-3"><p className="text-[10px] font-black uppercase tracking-wider text-amber-300">Risk posture</p><p className="mt-1 text-sm font-black text-amber-100">{highRiskCount > 0 ? `${highRiskCount} high-risk finding${highRiskCount === 1 ? '' : 's'} require attention.` : 'No high-risk findings detected.'}</p></div></div>
      </div>

      <div className="mt-5 flex items-center gap-2 text-[10px] font-semibold text-slate-500"><Download className="h-3.5 w-3.5" /> Exports include the current discrepancy audit trail and generated timestamp.</div>
    </section>
  );
}

function ExportButton({ label, icon, onClick }: { label: string; icon: React.ReactNode; onClick: () => void }) {
  return <button type="button" onClick={onClick} className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-400/25 bg-indigo-500/10 px-3 py-2 text-[10px] font-black text-indigo-200 transition hover:border-indigo-400/45 hover:bg-indigo-500/20">{icon} Export {label}</button>;
}

function RiskMetric({ label, value, tone }: { label: string; value: string; tone: 'indigo' | 'rose' | 'amber' }) {
  const styles = { indigo: 'border-indigo-400/20 bg-indigo-500/10 text-indigo-200', rose: 'border-rose-400/20 bg-rose-500/10 text-rose-200', amber: 'border-amber-400/20 bg-amber-500/10 text-amber-200' };
  return <div className={`rounded-2xl border p-4 ${styles[tone]}`}><p className="text-[10px] font-black uppercase tracking-widest opacity-70">{label}</p><p className="mt-2 text-2xl font-black">{value}</p></div>;
}
