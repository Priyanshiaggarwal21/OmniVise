'use client';

import { ArrowRight, CalendarDays, CheckCircle2, Clock3, FileSpreadsheet, FileText, Search, TriangleAlert } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { ParsedDocument } from '../types';

type DocumentStatus = 'Parsed' | 'Pending' | 'Error';

interface DocumentsManagerProps {
  documents: ParsedDocument[];
  onInspectClaims: (document: ParsedDocument) => void;
}

const statusStyles: Record<DocumentStatus, { className: string; icon: typeof CheckCircle2 }> = {
  Parsed: { className: 'border-emerald-400/25 bg-emerald-500/10 text-emerald-300', icon: CheckCircle2 },
  Pending: { className: 'border-amber-400/25 bg-amber-500/10 text-amber-300', icon: Clock3 },
  Error: { className: 'border-rose-400/25 bg-rose-500/10 text-rose-300', icon: TriangleAlert },
};

function getDocumentStatus(status: ParsedDocument['status']): DocumentStatus {
  if (status === 'matching') return 'Pending';
  if (status === 'flagged') return 'Error';
  return 'Parsed';
}

function documentIcon(kind: ParsedDocument['kind']) {
  return kind === 'Invoice' || kind === 'Purchase Order' ? FileSpreadsheet : FileText;
}

export default function DocumentsManager({ documents, onInspectClaims }: DocumentsManagerProps) {
  const [query, setQuery] = useState('');
  const filteredDocuments = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return documents;
    return documents.filter((document) => [document.filename, document.vendor, document.kind, document.documentNumber].join(' ').toLowerCase().includes(normalizedQuery));
  }, [documents, query]);

  return (
    <section className="min-h-[calc(100vh-7rem)] rounded-3xl border border-white/10 bg-slate-950/65 p-5 shadow-2xl backdrop-blur-2xl md:p-7">
      <div className="flex flex-col gap-4 border-b border-white/10 pb-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-300/80">Workspace / Documents</p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-white">Documents Manager</h1>
          <p className="mt-1 text-xs text-slate-400">Review ingested source files and inspect the claims extracted from each document.</p>
        </div>
        <label className="relative w-full md:w-72">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search documents" aria-label="Search ingested documents" className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-2.5 pl-9 pr-3 text-xs text-slate-200 outline-none placeholder:text-slate-600 focus:border-indigo-400/50" />
        </label>
      </div>

      <div className="mt-5 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.025]">
        <div className="hidden grid-cols-[minmax(220px,1.5fr)_minmax(130px,0.8fr)_minmax(160px,1fr)_140px_150px] gap-4 border-b border-white/10 bg-white/[0.04] px-5 py-3 text-[10px] font-black uppercase tracking-wider text-slate-500 lg:grid">
          <span>Document Name</span><span>Upload Date</span><span>Entity</span><span>Processing Status</span><span className="text-right">Action</span>
        </div>
        <div className="divide-y divide-white/5">
          {filteredDocuments.map((document) => {
            const status = getDocumentStatus(document.status);
            const StatusIcon = statusStyles[status].icon;
            const DocumentIcon = documentIcon(document.kind);
            return (
              <div key={document.id} className="grid gap-4 px-5 py-4 transition hover:bg-white/[0.04] lg:grid-cols-[minmax(220px,1.5fr)_minmax(130px,0.8fr)_minmax(160px,1fr)_140px_150px] lg:items-center">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-indigo-400/20 bg-indigo-500/10 text-indigo-300"><DocumentIcon className="h-4 w-4" /></div>
                  <div className="min-w-0"><p className="truncate text-xs font-bold text-slate-100">{document.filename}</p><p className="mt-1 text-[10px] font-semibold text-slate-500">{document.kind} · {document.documentNumber}</p></div>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400"><CalendarDays className="h-3.5 w-3.5 text-slate-600" />{new Date(document.uploadedAt).toLocaleDateString()}</div>
                <div className="min-w-0 text-xs font-semibold text-slate-300"><span className="text-[10px] uppercase tracking-wider text-slate-600 lg:hidden">Entity · </span>{document.vendor}</div>
                <div><span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-black ${statusStyles[status].className}`}><StatusIcon className="h-3 w-3" />{status}</span></div>
                <div className="flex justify-start lg:justify-end"><button type="button" onClick={() => onInspectClaims(document)} className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-400/25 bg-indigo-500/10 px-3 py-2 text-[10px] font-black text-indigo-200 transition hover:border-indigo-400/45 hover:bg-indigo-500/20">Inspect Claims <ArrowRight className="h-3 w-3" /></button></div>
              </div>
            );
          })}
        </div>
        {filteredDocuments.length === 0 && <p className="px-5 py-12 text-center text-xs font-semibold text-slate-500">No ingested documents match your search.</p>}
      </div>
    </section>
  );
}
