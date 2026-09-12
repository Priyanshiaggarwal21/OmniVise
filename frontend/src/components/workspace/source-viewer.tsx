"use client";

import { FileText, Film, Headphones, Maximize2, MoreHorizontal, Play, Upload } from "lucide-react";
import { useState } from "react";

type SourceTab = "media" | "document";

export function SourceViewer() {
  const [activeTab, setActiveTab] = useState<SourceTab>("media");

  return (
    <section className="workspace-pane min-h-[620px]" aria-label="Source viewer">
      <div className="pane-heading">
        <div>
          <p className="eyebrow">Pane 01 / Sources</p>
          <h1 className="pane-title">Source viewer</h1>
        </div>
        <button className="icon-button" aria-label="More source actions" title="More source actions">
          <MoreHorizontal size={17} />
        </button>
      </div>

      <div className="tab-bar" role="tablist" aria-label="Source type">
        <button className={`tab-button ${activeTab === "media" ? "tab-active" : ""}`} onClick={() => setActiveTab("media")} role="tab" aria-selected={activeTab === "media"}>
          <Film size={14} /> Media
        </button>
        <button className={`tab-button ${activeTab === "document" ? "tab-active" : ""}`} onClick={() => setActiveTab("document")} role="tab" aria-selected={activeTab === "document"}>
          <FileText size={14} /> Documents
        </button>
      </div>

      {activeTab === "media" ? (
        <div className="flex flex-1 flex-col gap-5">
          <div className="media-stage">
            <div className="media-grid" />
            <div className="relative z-10 flex flex-col items-center gap-3 text-center">
              <div className="flex h-12 w-12 items-center justify-center border border-blue-400/30 bg-blue-500/10 text-blue-300">
                <Play size={20} fill="currentColor" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-200">No media selected</p>
                <p className="mt-1 text-xs text-slate-500">Select an ingestion source to begin scrubbing</p>
              </div>
            </div>
            <span className="absolute bottom-3 left-3 z-10 font-mono text-[10px] text-slate-500">00:00:00.000</span>
            <button className="absolute bottom-2 right-2 z-10 p-2 text-slate-500 hover:text-white" aria-label="Expand media" title="Expand media">
              <Maximize2 size={14} />
            </button>
          </div>
          <div>
            <div className="mb-2 flex items-center justify-between text-xs">
              <span className="flex items-center gap-2 text-slate-400"><Headphones size={13} /> Synchronized transcript</span>
              <span className="font-mono text-slate-600">--:--</span>
            </div>
            <div className="h-1 bg-slate-800"><div className="h-full w-0 bg-blue-500" /></div>
          </div>
        </div>
      ) : (
        <div className="flex flex-1 flex-col gap-4">
          <div className="document-stage">
            <FileText size={28} className="text-slate-600" />
            <p className="mt-3 text-sm text-slate-300">No document selected</p>
            <p className="mt-1 text-xs text-slate-500">PDF, XLSX, DOCX, and TXT sources</p>
          </div>
          <div className="border border-dashed border-border bg-surface/40 p-4 text-center">
            <Upload size={18} className="mx-auto text-slate-500" />
            <p className="mt-2 text-xs text-slate-400">Drop a source to ingest</p>
          </div>
        </div>
      )}

      <div className="mt-5 border-t border-border pt-4">
        <div className="flex items-center justify-between">
          <span className="eyebrow">Ingestion queue</span>
          <span className="font-mono text-[10px] text-slate-600">0 / 10</span>
        </div>
        <div className="mt-3 flex items-center justify-between border border-border bg-surface px-3 py-3">
          <span className="text-xs text-slate-500">Awaiting source files</span>
          <Upload size={14} className="text-slate-600" />
        </div>
      </div>
    </section>
  );
}
