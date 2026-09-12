"use client";

import { ChevronRight, Clock3, Mic2, ShieldCheck, UserRound } from "lucide-react";

const discrepancies = [
  { label: "Launch date mismatch", source: "Contract v3 / Call 04", severity: "critical", time: "00:14:32.480" },
  { label: "Budget variance detected", source: "Invoice 1042 / Sheet", severity: "warning", time: "00:21:08.120" },
  { label: "Scope confirmed", source: "Call 04 / Transcript", severity: "verified", time: "00:08:51.900" },
];

const speakers = [
  { name: "Speaker A", role: "Project lead", activity: "Confirmed launch window", time: "00:14:32" },
  { name: "Speaker B", role: "Finance", activity: "Flagged budget revision", time: "00:21:08" },
];

export function AuditPanel() {
  return (
    <section className="workspace-pane min-h-[620px]" aria-label="Audit panel">
      <div className="pane-heading">
        <div>
          <p className="eyebrow">Pane 03 / Audit</p>
          <h2 className="pane-title">Discrepancy matrix</h2>
        </div>
        <span className="font-mono text-[10px] text-slate-500">03 findings</span>
      </div>

      <div className="space-y-2">
        {discrepancies.map((item) => (
          <button key={item.label} className="finding-row group">
            <div className={`severity-mark severity-${item.severity}`} />
            <div className="min-w-0 flex-1 text-left">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-xs font-medium text-slate-200">{item.label}</p>
                <ChevronRight size={14} className="shrink-0 text-slate-600 transition group-hover:text-slate-300" />
              </div>
              <p className="mt-1 truncate text-[11px] text-slate-500">{item.source}</p>
              <div className="mt-2 flex items-center justify-between">
                <span className={`severity-tag tag-${item.severity}`}>{item.severity}</span>
                <span className="font-mono text-[10px] text-slate-600">{item.time}</span>
              </div>
            </div>
          </button>
        ))}
      </div>

      <div className="mt-7 border-t border-border pt-5">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="eyebrow">Speaker audit log</p>
            <h3 className="mt-1 text-sm font-medium text-slate-200">Recent commitments</h3>
          </div>
          <Mic2 size={16} className="text-slate-600" />
        </div>
        <div className="space-y-1">
          {speakers.map((speaker) => (
            <div key={speaker.name} className="audit-entry">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center border border-border bg-charcoal text-slate-500"><UserRound size={13} /></div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2"><p className="text-xs text-slate-300">{speaker.name}</p><span className="font-mono text-[10px] text-slate-600">{speaker.time}</span></div>
                <p className="mt-1 truncate text-[11px] text-slate-500">{speaker.activity}</p>
                <p className="mt-1 text-[10px] text-slate-600">{speaker.role}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-auto flex items-center gap-3 border border-emerald-500/20 bg-emerald-500/5 p-3">
        <ShieldCheck size={17} className="text-emerald-500" />
        <div><p className="text-xs text-emerald-300">Grounding active</p><p className="mt-0.5 text-[10px] text-slate-500">Citations synchronized to sources</p></div>
        <Clock3 size={14} className="ml-auto text-slate-600" />
      </div>
    </section>
  );
}
