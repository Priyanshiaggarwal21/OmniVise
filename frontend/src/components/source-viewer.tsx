'use client';
import React, { useState } from 'react';
import { Upload, FileText, CheckCircle2 } from 'lucide-react';

export default function SourceViewer() {
  const [uploading, setUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch('http://localhost:8000/api/v1/ingest/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      setUploadedFile(data.filename);
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900/90 border-r border-slate-800 p-5 rounded-l-lg backdrop-blur-md">
      <div className="mb-4 border-b border-slate-800 pb-3">
        <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
          <FileText className="w-5 h-5 text-indigo-400"/>
          1. Source Ingestion Zone
        </h2>
        <p className="text-sm text-slate-400 mt-1">Upload documents, transcripts, or video files for real-time analysis.</p>
      </div>
      <label className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-indigo-500/40 hover:border-indigo-400 bg-slate-950/60 hover:bg-slate-950/90 rounded-xl cursor-pointer transition-all p-6 text-center shadow-inner group">
        <Upload className="w-12 h-12 text-indigo-400 mb-3 group-hover:scale-110 transition-transform"/>
        <span className="text-base font-semibold text-slate-200 mb-1">
          {uploading ? 'Processing File...' : 'Drop files here or Click to Upload'}
        </span>
        <span className="text-xs text-slate-400">Supports PDF, DOCX, MP3, MP4 (Max 100MB)</span>
        <input type="file" className="hidden" onChange={handleFileUpload} />
      </label>
      {uploadedFile && (
        <div className="mt-4 p-3 bg-emerald-950/40 border border-emerald-500/40 rounded-lg flex items-center gap-3 text-emerald-300 text-sm font-medium">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0"/>
          <span>Ingested: <strong>{uploadedFile}</strong></span>
        </div>
      )}
    </div>
  );
}
