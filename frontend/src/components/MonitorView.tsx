'use client';

import { AlertTriangle, CheckCircle2, FileSearch, RefreshCw, Server, Wifi, Zap } from 'lucide-react';
import { useEffect, useState } from 'react';

type StreamFlag = { id: string; item: string; source: string; variance: string; severity: 'High' | 'Medium' | 'Low'; time: string };
type OcrLog = { id: number; file: string; message: string; time: string; tone: 'success' | 'info' | 'warning' };

const INITIAL_FLAGS: StreamFlag[] = [
  { id: 'VF-1042', item: 'A100 GPU Accelerator', source: 'PO-1042 / INV-8821', variance: '+$3,750', severity: 'High', time: '00:14:32' },
  { id: 'VF-1043', item: 'HBM3 Memory Module', source: 'PO-1042 / INV-8821', variance: '+2 units', severity: 'Medium', time: '00:15:08' },
  { id: 'VF-1044', item: 'Rack Installation', source: 'PO-1042 / INV-8821', variance: '+$3,900', severity: 'Low', time: '00:16:41' },
];

const INITIAL_LOGS: OcrLog[] = [
  { id: 1, file: 'INV-8821.pdf', message: 'Invoice fields normalized and indexed', time: '12:41:08', tone: 'success' },
  { id: 2, file: 'PO-1042.pdf', message: 'OCR confidence 98.4% · 14 line items found', time: '12:40:52', tone: 'info' },
  { id: 3, file: 'Q3-earnings-call.mp3', message: 'Speaker segments synchronized', time: '12:40:19', tone: 'success' },
];

const integrations = [
  { name: 'SAP ERP', detail: 'Production connector', latency: '184 ms', iconClass: 'bg-emerald-500/15 text-emerald-300' },
  { name: 'QuickBooks', detail: 'Sandbox connector', latency: '231 ms', iconClass: 'bg-sky-500/15 text-sky-300' },
];

export default function MonitorView() {
  const [flags, setFlags] = useState(INITIAL_FLAGS);
  const [logs, setLogs] = useState(INITIAL_LOGS);
  const [lastPulse, setLastPulse] = useState(new Date());

  useEffect(() => {
    const interval = window.setInterval(() => {
      const now = new Date();
      setLastPulse(now);
      setLogs((currentLogs) => [{ id: now.getTime(), file: 'reconciliation-stream', message: 'Line-item stream heartbeat received', time: now.toLocaleTimeString(), tone: 'info' as const }, ...currentLogs].slice(0, 5));
    }, 5000);
    return () => window.clearInterval(interval);
  }, []);

  const refreshStream = () => {
    const now = new Date();
    setLastPulse(now);
    setFlags((currentFlags) => currentFlags.map((flag) => ({ ...flag, time: now.toLocaleTimeString() })));
  };

  return (
    <section className="min-h-[calc(100vh-7rem)] rounded-3xl border border-white/10 bg-slate-950/65 p-5 shadow-2xl backdrop-blur-2xl md:p-7">
      <div className="flex flex-col gap-4 border-b border-white/10 pb-6 md:flex-row md:items-end md:justify-between"><div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-300/80">Workspace / Live Monitor</p><h1 className="mt-1 text-2xl font-black tracking-tight text-white">Reconciliation Stream</h1><p className="mt-1 text-xs text-slate-400">Incoming line-item variance flags and OCR extraction events.</p></div><div className="flex items-center gap-3"><span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-500/10 px-3 py-1.5 text-[10px] font-black text-emerald-300"><span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" /><span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" /></span>Stream live</span><button type="button" onClick={refreshStream} className="rounded-xl border border-white/10 p-2 text-slate-400 transition hover:bg-white/10 hover:text-white" aria-label="Refresh reconciliation stream"><RefreshCw className="h-4 w-4" /></button></div></div>

      <div className="mt-6 grid gap-4 md:grid-cols-3"><StreamMetric icon={<Zap className="h-4 w-4" />} label="Events / min" value="24" tone="cyan" /><StreamMetric icon={<AlertTriangle className="h-4 w-4" />} label="Active flags" value={flags.length.toString()} tone="rose" /><StreamMetric icon={<FileSearch className="h-4 w-4" />} label="OCR queue" value="03" tone="amber" /></div>

      <div className="mt-6 grid gap-5 xl:grid-cols-[1.25fr_0.75fr]">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"><div className="flex items-center justify-between"><div><p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Incoming events</p><h2 className="mt-1 text-base font-black text-white">Line-item variance flags</h2></div><span className="font-mono text-[10px] text-slate-600">Last pulse {lastPulse.toLocaleTimeString()}</span></div><div className="mt-5 space-y-2">{flags.map((flag) => <div key={flag.id} className="flex flex-col gap-3 rounded-xl border border-white/10 bg-slate-950/55 p-4 transition hover:border-white/20 sm:flex-row sm:items-center"><div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${flag.severity === 'High' ? 'bg-rose-500/15 text-rose-300' : flag.severity === 'Medium' ? 'bg-amber-500/15 text-amber-300' : 'bg-emerald-500/15 text-emerald-300'}`}><AlertTriangle className="h-4 w-4" /></div><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><p className="truncate text-xs font-bold text-slate-100">{flag.item}</p><span className="font-mono text-[9px] text-slate-600">{flag.id}</span></div><p className="mt-1 text-[11px] text-slate-500">{flag.source} · {flag.time}</p></div><div className="flex items-center gap-3"><span className={`rounded-full border px-2 py-1 text-[9px] font-black uppercase ${flag.severity === 'High' ? 'border-rose-400/25 bg-rose-500/10 text-rose-300' : flag.severity === 'Medium' ? 'border-amber-400/25 bg-amber-500/10 text-amber-300' : 'border-emerald-400/25 bg-emerald-500/10 text-emerald-300'}`}>{flag.severity}</span><span className="font-mono text-sm font-black text-rose-300">{flag.variance}</span></div></div>)}</div></div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"><div className="flex items-center gap-2"><FileSearch className="h-4 w-4 text-indigo-300" /><div><p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Processing pipeline</p><h2 className="mt-1 text-base font-black text-white">OCR extraction logs</h2></div></div><div className="mt-5 space-y-3">{logs.map((log) => <div key={log.id} className="flex gap-3"><div className={`mt-1 h-2 w-2 shrink-0 rounded-full ${log.tone === 'success' ? 'bg-emerald-400' : log.tone === 'warning' ? 'bg-amber-400' : 'bg-indigo-400'}`} /><div className="min-w-0"><p className="truncate text-xs font-semibold text-slate-300">{log.message}</p><p className="mt-1 truncate font-mono text-[10px] text-slate-600">{log.file} · {log.time}</p></div></div>)}</div></div>
      </div>

      <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] p-5"><div className="flex items-center justify-between"><div><p className="text-[10px] font-black uppercase tracking-widest text-slate-500">ERP integrations</p><h2 className="mt-1 text-base font-black text-white">Live connection status</h2></div><Server className="h-4 w-4 text-slate-500" /></div><div className="mt-5 grid gap-3 md:grid-cols-2">{integrations.map((integration) => <div key={integration.name} className="flex items-center gap-3 rounded-xl border border-emerald-400/15 bg-emerald-500/[0.04] p-4"><div className={`flex h-9 w-9 items-center justify-center rounded-xl ${integration.iconClass}`}><Wifi className="h-4 w-4" /></div><div className="min-w-0 flex-1"><p className="text-sm font-bold text-slate-100">{integration.name}</p><p className="mt-1 text-[10px] text-slate-500">{integration.detail} · {integration.latency}</p></div><span className="inline-flex items-center gap-1.5 text-[10px] font-black text-emerald-300"><CheckCircle2 className="h-3.5 w-3.5" />Operational</span></div>)}</div></div>
    </section>
  );
}

function StreamMetric({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string; tone: 'cyan' | 'rose' | 'amber' }) {
  const styles = { cyan: 'border-cyan-400/20 bg-cyan-500/10 text-cyan-200', rose: 'border-rose-400/20 bg-rose-500/10 text-rose-200', amber: 'border-amber-400/20 bg-amber-500/10 text-amber-200' };
  return <div className={`rounded-2xl border p-4 ${styles[tone]}`}><div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest opacity-80">{icon}{label}</div><p className="mt-2 text-2xl font-black">{value}</p></div>;
}
