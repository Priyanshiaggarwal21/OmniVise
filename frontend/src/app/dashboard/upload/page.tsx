'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  UploadCloud,
  FileText,
  FileSpreadsheet,
  FileArchive,
  FileImage,
  Music,
  Video,
  Globe,
  CheckCircle2,
  Clock,
  Trash2,
  Shield,
  HelpCircle,
  Sliders,
  Sparkles,
  GitBranch,
  X,
  Pause,
  HardDrive,
  Info,
  Layers,
  Lock,
} from 'lucide-react';

export type FileProcessingStatus = 'Queued' | 'Processing' | 'Ready' | 'Error';

export interface AuditFileItem {
  id: string;
  name: string;
  size: string;
  type: string;
  progress: number;
  status: FileProcessingStatus;
  claimsCount?: number;
  addedAt: string;
  sourceType: 'file' | 'link';
  hash?: string;
  dagNode?: string;
  detail?: string;
}

const INITIAL_FILES: AuditFileItem[] = [
  {
    id: 'sample-1',
    name: 'Q3_Consolidated_Financial_Audit_SEC10K.pdf',
    size: '42.8 MB',
    type: 'PDF',
    progress: 100,
    status: 'Ready',
    claimsCount: 42,
    addedAt: 'Uploaded 2 mins ago',
    sourceType: 'file',
    hash: '0x8f4c...92a1',
    dagNode: 'DAG Node #8812',
  },
  {
    id: 'sample-2',
    name: 'Executive_Strategy_Audio_Briefing_Q4.wav',
    size: '118.4 MB',
    type: 'Audio',
    progress: 68,
    status: 'Processing',
    addedAt: 'Acoustic diarization active',
    detail: 'Transcribing & generating causal tokens',
    sourceType: 'file',
  },
  {
    id: 'sample-3',
    name: 'CrossBorder_Trade_Settlement_Ledger_2024.xlsx',
    size: '14.2 MB',
    type: 'XLSX/CSV',
    progress: 0,
    status: 'Queued',
    addedAt: 'Tabular lattice parser',
    detail: 'Awaiting consensus pipeline slot #4',
    sourceType: 'file',
  },
];

export default function UploadEvidencePage() {
  const [files, setFiles] = useState<AuditFileItem[]>(INITIAL_FILES);
  const [isDragging, setIsDragging] = useState(false);
  const [linkInput, setLinkInput] = useState('');
  const [autoVerify, setAutoVerify] = useState(true);
  const [inspectModalFile, setInspectModalFile] = useState<AuditFileItem | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeIntervals = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const getFormatFromFilename = (filename: string): string => {
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    if (['pdf'].includes(ext)) return 'PDF';
    if (['doc', 'docx'].includes(ext)) return 'DOCX';
    if (['ppt', 'pptx'].includes(ext)) return 'PPTX';
    if (['xls', 'xlsx', 'csv'].includes(ext)) return 'XLSX/CSV';
    if (['png', 'jpg', 'jpeg', 'webp', 'svg'].includes(ext)) return 'Images';
    if (['zip', 'tar', 'gz', '7z'].includes(ext)) return 'ZIP';
    if (['mp3', 'wav', 'm4a', 'aac', 'ogg'].includes(ext)) return 'Audio';
    if (['mp4', 'mov', 'avi', 'mkv'].includes(ext)) return 'Video';
    return 'Document';
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  const runUploadSimulation = useCallback((fileId: string) => {
    if (activeIntervals.current.has(fileId)) {
      clearInterval(activeIntervals.current.get(fileId));
      activeIntervals.current.delete(fileId);
    }

    const initialDelay = setTimeout(() => {
      setFiles((prev) =>
        prev.map((item) => {
          if (item.id === fileId) {
            return {
              ...item,
              status: 'Processing',
              progress: Math.max(item.progress, 20),
            };
          }
          return item;
        })
      );

      const interval = setInterval(() => {
        setFiles((prev) => {
          const target = prev.find((item) => item.id === fileId);
          if (!target) {
            clearInterval(interval);
            activeIntervals.current.delete(fileId);
            return prev;
          }

          if (target.progress >= 100) {
            clearInterval(interval);
            activeIntervals.current.delete(fileId);
            return prev.map((item) =>
              item.id === fileId
                ? {
                    ...item,
                    status: 'Ready',
                    progress: 100,
                    claimsCount: item.claimsCount || Math.floor(Math.random() * 30) + 15,
                    hash: item.hash || `0x${Math.random().toString(16).substring(2, 6)}...${Math.random().toString(16).substring(2, 6)}`,
                    dagNode: item.dagNode || `DAG Node #${Math.floor(Math.random() * 9000) + 1000}`,
                  }
                : item
            );
          }

          const increment = Math.floor(Math.random() * 20) + 12;
          const nextProgress = Math.min(100, target.progress + increment);
          const isFinished = nextProgress >= 100;

          if (isFinished) {
            clearInterval(interval);
            activeIntervals.current.delete(fileId);
          }

          return prev.map((item) =>
            item.id === fileId
              ? {
                  ...item,
                  status: isFinished ? 'Ready' : 'Processing',
                  progress: nextProgress,
                  claimsCount: isFinished
                    ? item.claimsCount || Math.floor(Math.random() * 30) + 15
                    : undefined,
                  hash: isFinished
                    ? `0x${Math.random().toString(16).substring(2, 6)}...${Math.random().toString(16).substring(2, 6)}`
                    : undefined,
                  dagNode: isFinished
                    ? `DAG Node #${Math.floor(Math.random() * 9000) + 1000}`
                    : undefined,
                }
              : item
          );
        });
      }, 600);

      activeIntervals.current.set(fileId, interval);
    }, 500);

    return () => clearTimeout(initialDelay);
  }, []);

  useEffect(() => {
    const intervalsMap = activeIntervals.current;
    INITIAL_FILES.forEach((file) => {
      if (file.status === 'Processing') {
        runUploadSimulation(file.id);
      }
    });

    return () => {
      intervalsMap.forEach((interval) => clearInterval(interval));
      intervalsMap.clear();
    };
  }, [runUploadSimulation]);

  const handleAddFiles = (newFileList: FileList | File[]) => {
    const newItems: AuditFileItem[] = Array.from(newFileList).map((file) => ({
      id: `file-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      name: file.name,
      size: formatFileSize(file.size),
      type: getFormatFromFilename(file.name),
      progress: 0,
      status: 'Queued',
      addedAt: 'Uploaded just now',
      sourceType: 'file',
    }));

    setFiles((prev) => [...newItems, ...prev]);

    newItems.forEach((item) => {
      runUploadSimulation(item.id);
    });
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleAddFiles(e.dataTransfer.files);
    }
  };

  const handleAddLink = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = linkInput.trim();
    if (!trimmed) return;

    try {
      const url =
        trimmed.startsWith('http://') || trimmed.startsWith('https://')
          ? trimmed
          : `https://${trimmed}`;

      const newLinkItem: AuditFileItem = {
        id: `link-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
        name: url,
        size: 'DOM Snapshot',
        type: 'Web Link',
        progress: 0,
        status: 'Queued',
        addedAt: 'Target verified',
        detail: 'Capturing DOM tree & sha-256 seal',
        sourceType: 'link',
      };

      setFiles((prev) => [newLinkItem, ...prev]);
      runUploadSimulation(newLinkItem.id);
      setLinkInput('');
    } catch {
      // ignore
    }
  };

  const handleRemoveFile = (id: string) => {
    if (activeIntervals.current.has(id)) {
      clearInterval(activeIntervals.current.get(id));
      activeIntervals.current.delete(id);
    }
    setFiles((prev) => prev.filter((item) => item.id !== id));
  };

  const renderFileIcon = (type: string) => {
    switch (type) {
      case 'PDF':
        return (
          <div className="w-9 h-9 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center shrink-0">
            <FileText className="w-4 h-4" />
          </div>
        );
      case 'Audio':
        return (
          <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center shrink-0">
            <Music className="w-4 h-4" />
          </div>
        );
      case 'XLSX/CSV':
        return (
          <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 text-[#0B5C48] flex items-center justify-center shrink-0">
            <FileSpreadsheet className="w-4 h-4" />
          </div>
        );
      case 'Images':
        return (
          <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center shrink-0">
            <FileImage className="w-4 h-4" />
          </div>
        );
      case 'ZIP':
        return (
          <div className="w-9 h-9 rounded-xl bg-purple-50 border border-purple-200 text-purple-600 flex items-center justify-center shrink-0">
            <FileArchive className="w-4 h-4" />
          </div>
        );
      case 'Video':
        return (
          <div className="w-9 h-9 rounded-xl bg-cyan-50 border border-cyan-200 text-cyan-700 flex items-center justify-center shrink-0">
            <Video className="w-4 h-4" />
          </div>
        );
      default:
        return (
          <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 text-slate-600 flex items-center justify-center shrink-0">
            <Globe className="w-4 h-4" />
          </div>
        );
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Top Banner & Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2">
        <div className="space-y-3">
          {/* Status indicator pill */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#E8F6F2] text-[#0B5C48] border border-[#C6ECE0] text-[11px] font-bold tracking-wider uppercase shadow-xs">
            <span className="w-2 h-2 rounded-full bg-[#0B5C48]" />
            <span>Cryptographic Ingestion Pipeline &middot; Ready</span>
            <span className="text-slate-500 font-mono font-normal pl-2 border-l border-[#C6ECE0]">
              FIPS 140-3 Sealed
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-sans font-bold text-slate-900 tracking-tight">
            Upload <span className="text-[#0B5C48]">Evidence</span>
          </h1>
          <p className="text-sm text-slate-500 max-w-2xl leading-relaxed">
            Ingest multi-modal documents, structured data feeds, and web targets into verified cryptographic vector lattices.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 shrink-0">
          <Link
            href="/dashboard/help"
            className="px-4 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold rounded-full flex items-center gap-2 shadow-xs transition-colors"
          >
            <HelpCircle className="w-3.5 h-3.5 text-slate-500" />
            <span>Batch Guidelines</span>
          </Link>

          <Link
            href="/dashboard/settings"
            className="px-4 py-2.5 bg-[#EFF3F9] hover:bg-slate-200 border border-[#D5DEEC] text-slate-700 text-xs font-semibold rounded-full flex items-center gap-2 shadow-xs transition-colors"
          >
            <Sliders className="w-3.5 h-3.5 text-slate-500" />
            <span>Upload Settings</span>
          </Link>
        </div>
      </div>

      {/* Main Two-Column Viewport */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Dashed Drag & Drop Box */}
          <div
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-3xl bg-white p-8 sm:p-12 text-center transition-all shadow-xs ${
              isDragging
                ? 'border-[#0B5C48] bg-[#E8F6F2]/30 ring-4 ring-[#0B5C48]/10'
                : 'border-[#A7E8D8] hover:border-[#0B5C48]/70'
            }`}
          >
            <input
              type="file"
              multiple
              ref={fileInputRef}
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  handleAddFiles(e.target.files);
                  e.target.value = '';
                }
              }}
              className="hidden"
            />

            <div className="w-12 h-12 rounded-2xl bg-[#E8F6F2] text-[#0B5C48] flex items-center justify-center mx-auto mb-4 shadow-xs">
              <UploadCloud className="w-6 h-6" />
            </div>

            <h2 className="text-base font-bold text-slate-900 mb-1 font-sans">
              Drag files here or click to browse
            </h2>
            <p className="text-xs text-slate-500 max-w-md mx-auto mb-6 leading-relaxed">
              Supports batches up to 500 MB per file. Direct end-to-end encryption with FIPS 140-3 zero-knowledge hashing.
            </p>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-6 py-2.5 bg-[#0B5C48] hover:bg-[#084838] active:bg-[#06392c] text-white text-xs font-semibold rounded-xl inline-flex items-center gap-2 shadow-sm shadow-emerald-950/20 transition-all cursor-pointer"
            >
              <span>📁 Browse Local Files</span>
            </button>
          </div>

          {/* Supported Formats Bar */}
          <div className="space-y-2">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
              Supported Formats:
            </span>
            <div className="flex items-center gap-2 flex-wrap text-xs">
              {['PDF', 'DOCX', 'PPTX', 'XLSX / CSV', 'Images', 'ZIP', 'Audio / Video'].map(
                (fmt) => (
                  <span
                    key={fmt}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-slate-200 text-slate-700 font-medium shadow-xs"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                    <span>{fmt}</span>
                  </span>
                )
              )}
            </div>
          </div>

          {/* Live Web Target / API Endpoint */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
                <Globe className="w-4 h-4 text-[#0B5C48]" />
                <span>Or ingest from live web target / API endpoint</span>
              </div>
              <span className="text-[10px] font-mono text-slate-400 font-medium">
                DOM Snapshot + Hash
              </span>
            </div>

            <form onSubmit={handleAddLink} className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Globe className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                <input
                  type="text"
                  value={linkInput}
                  onChange={(e) => setLinkInput(e.target.value)}
                  placeholder="https://sec.gov/edgar/data/... or https://court-rec..."
                  className="w-full pl-10 pr-4 py-2.5 bg-[#F8FAFC] border border-slate-200 text-slate-900 text-xs rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0B5C48]/10 focus:border-[#0B5C48] transition-all placeholder:text-slate-400"
                />
              </div>
              <button
                type="submit"
                className="px-5 py-2.5 bg-[#0B5C48] hover:bg-[#084838] active:bg-[#06392c] text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 shadow-xs transition-colors shrink-0 cursor-pointer"
              >
                <span>Fetch &amp; Verify</span>
              </button>
            </form>

            <div className="flex items-center gap-2 text-[11px] text-slate-400">
              <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>Automated DOM snapshot, cryptographic timestamp, and recursive link extraction enabled.</span>
            </div>
          </div>

          {/* Recent Ingestion Queue */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <h3 className="text-base font-bold text-slate-900 font-sans tracking-tight">
                  Recent Ingestion Queue
                </h3>
                <span className="bg-[#E6F8F3] text-[#0B5C48] border border-[#BCEEE2] text-xs font-bold px-2.5 py-0.5 rounded-full">
                  {files.length} Files in Batch
                </span>
              </div>

              {/* Auto-verify toggle */}
              <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer select-none">
                <span>Auto-verify on complete</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={autoVerify}
                  onClick={() => setAutoVerify(!autoVerify)}
                  className={`w-8 h-4.5 rounded-full transition-colors relative flex items-center px-0.5 ${
                    autoVerify ? 'bg-[#0B5C48]' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`w-3.5 h-3.5 rounded-full bg-white transition-transform ${
                      autoVerify ? 'translate-x-3.5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </label>
            </div>

            {/* File Cards */}
            <div className="space-y-3">
              {files.map((file) => (
                <div
                  key={file.id}
                  className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs space-y-3"
                >
                  <div className="flex items-start sm:items-center justify-between gap-3">
                    <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                      {renderFileIcon(file.type)}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className="text-xs font-bold text-slate-900 truncate max-w-sm sm:max-w-md block"
                            title={file.name}
                          >
                            {file.name}
                          </span>
                          {file.status === 'Ready' && (
                            <span className="bg-[#E6F8F3] text-[#0B5C48] border border-[#BCEEE2] text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              Ready
                            </span>
                          )}
                          {file.status === 'Processing' && (
                            <span className="bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                              Processing ({file.progress}%)
                            </span>
                          )}
                          {file.status === 'Queued' && (
                            <span className="bg-slate-100 text-slate-600 border border-slate-200 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              Queued
                            </span>
                          )}
                        </div>

                        <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-2 flex-wrap">
                          <span>{file.size}</span>
                          <span>&middot;</span>
                          <span>{file.addedAt}</span>
                          {file.hash && (
                            <>
                              <span>&middot;</span>
                              <span className="font-mono">Sha-256: {file.hash}</span>
                            </>
                          )}
                          {file.detail && (
                            <>
                              <span>&middot;</span>
                              <span>{file.detail}</span>
                            </>
                          )}
                        </div>

                        {file.dagNode && (
                          <div className="flex items-center gap-1.5 text-xs text-[#0B5C48] font-medium mt-1.5">
                            <GitBranch className="w-3.5 h-3.5 text-[#0B5C48]" />
                            <span>Anchored in {file.dagNode}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right action buttons */}
                    <div className="flex items-center gap-2 shrink-0">
                      {file.status === 'Ready' && (
                        <button
                          type="button"
                          onClick={() => setInspectModalFile(file)}
                          className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl shadow-xs transition-colors"
                        >
                          Inspect Embeddings
                        </button>
                      )}
                      {file.status === 'Processing' && (
                        <div className="flex items-center gap-1 text-slate-400">
                          <button
                            type="button"
                            className="p-1.5 hover:text-slate-600 rounded-lg hover:bg-slate-100"
                            title="Pause"
                          >
                            <Pause className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveFile(file.id)}
                            className="p-1.5 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                            title="Cancel"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                      {file.status === 'Queued' && (
                        <button
                          type="button"
                          onClick={() => handleRemoveFile(file.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                          title="Cancel"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {file.status === 'Ready' && (
                        <button
                          type="button"
                          onClick={() => handleRemoveFile(file.id)}
                          className="p-1.5 text-slate-300 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                          title="Delete from session"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Processing progress bar */}
                  {file.status === 'Processing' && (
                    <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden mt-2">
                      <div
                        className="h-full bg-amber-500 rounded-full transition-all duration-300"
                        style={{ width: `${file.progress}%` }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column (4 cols): Ingestion Policies & Evidence Quota */}
        <div className="lg:col-span-4 space-y-6">
          {/* Card 1: Ingestion Policies */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-1">
              <div className="flex items-center gap-2 text-slate-900">
                <Shield className="w-4 h-4 text-[#0B5C48]" />
                <h3 className="text-sm font-bold tracking-tight">Ingestion Policies</h3>
              </div>
              <span className="bg-emerald-50 text-[#0B5C48] border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#0B5C48]" />
                STRICT
              </span>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="p-3 bg-[#F8FAFC] border border-slate-200/70 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-600">
                  <Layers className="w-3.5 h-3.5 text-slate-400" />
                  <span>Ingestion Node</span>
                </div>
                <div className="text-right">
                  <span className="font-semibold text-slate-900 block text-xs">US-East-1</span>
                  <span className="text-[10px] text-slate-400 block leading-tight">(Isolated)</span>
                </div>
              </div>

              <div className="p-3 bg-[#F8FAFC] border border-slate-200/70 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-600">
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                  <span>PII &amp; Secret Redaction</span>
                </div>
                <span className="font-semibold text-[#0B5C48]">Enforced</span>
              </div>

              <div className="p-3 bg-[#F8FAFC] border border-slate-200/70 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-600">
                  <Sparkles className="w-3.5 h-3.5 text-slate-400" />
                  <span>Deduplication</span>
                </div>
                <span className="font-semibold text-slate-900">Exact &amp; Semantic</span>
              </div>

              <div className="p-3 bg-[#F8FAFC] border border-slate-200/70 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-600">
                  <Shield className="w-3.5 h-3.5 text-slate-400" />
                  <span>Air-gap Verification</span>
                </div>
                <span className="font-semibold text-[#0B5C48]">Enabled</span>
              </div>
            </div>
          </div>

          {/* Card 2: Evidence Quota */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-1">
              <div className="flex items-center gap-2 text-slate-900">
                <HardDrive className="w-4 h-4 text-slate-500" />
                <h3 className="text-sm font-bold tracking-tight">Evidence Quota</h3>
              </div>
              <span className="text-xs text-slate-400 font-medium">Monthly Tier</span>
            </div>

            <div className="space-y-3">
              <div className="flex items-baseline justify-between">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold text-slate-900 font-sans tracking-tight">
                    1.4
                  </span>
                  <span className="text-xs text-slate-500 font-semibold">/ 5.0 TB used</span>
                </div>
                <span className="bg-[#E6F8F3] text-[#0B5C48] border border-[#BCEEE2] text-xs font-bold px-2 py-0.5 rounded-full">
                  28%
                </span>
              </div>

              {/* Progress track */}
              <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full bg-[#0B5C48] rounded-full w-[28%]" />
              </div>

              <p className="text-[11px] text-slate-400 leading-relaxed pt-1">
                3.6 TB high-assurance cryptographic storage remaining for billing cycle.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Inspect Embeddings Modal */}
      {inspectModalFile && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#0B5C48]" />
                <h3 className="text-sm font-bold text-slate-900">Embedding Vectors &amp; DAG Node</h3>
              </div>
              <button
                type="button"
                onClick={() => setInspectModalFile(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2 text-xs text-slate-600">
              <p>
                <strong>Source:</strong> {inspectModalFile.name}
              </p>
              <p>
                <strong>Cryptographic Anchor:</strong> {inspectModalFile.dagNode || 'DAG Node #8812'}
              </p>
              <p>
                <strong>Sha-256:</strong>{' '}
                <span className="font-mono text-[11px] text-slate-800">
                  {inspectModalFile.hash || '0x8f4c391a92e104bd...'}
                </span>
              </p>
              <p>
                <strong>Claim Offsets Extracted:</strong> {inspectModalFile.claimsCount || 42}
              </p>
              <div className="p-3 bg-[#F8FAFC] rounded-xl border border-slate-200 font-mono text-[10px] text-slate-700 max-h-32 overflow-y-auto">
                {`[
  { "dim": 1536, "norm": 0.9998, "token": "Operating_Margin" },
  { "dim": 1536, "norm": 0.9991, "token": "GAAP_Revenue_43.2M" },
  { "dim": 1536, "norm": 0.9984, "token": "ASC_606_Contract" }
]`}
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setInspectModalFile(null)}
                className="px-4 py-2 bg-[#0B5C48] text-white text-xs font-semibold rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
