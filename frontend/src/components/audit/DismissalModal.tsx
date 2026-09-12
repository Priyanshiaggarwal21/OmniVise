'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  X as XIcon,
  FileX2,
  ChevronDown,
  Check,
  AlertCircle,
  StickyNote,
  ShieldAlert,
} from 'lucide-react';
import type { DismissalReason } from '../../types';

const DISMISSAL_OPTIONS: { value: DismissalReason; hint: string }[] = [
  {
    value: 'Different reporting period',
    hint: 'Sources reference Q1 vs Q2, FY2024 vs FY2025, etc.',
  },
  {
    value: 'Different accounting standard',
    hint: 'GAAP vs Non-GAAP, ASC 606 vs IFRS 15, UK GAAP',
  },
  {
    value: 'Rounding difference',
    hint: 'Tolerance within ±1 rounding unit (millions, thousands)',
  },
  {
    value: 'Data entry error',
    hint: 'Transcription, OCR, or manual keying mistake confirmed',
  },
  {
    value: 'Custom',
    hint: 'Other rationale — document clearly in notes below',
  },
];

export interface DismissalModalProps {
  open: boolean;
  onConfirm: (reason: DismissalReason, notes: string) => void;
  onCancel: () => void;
  discrepancyId?: string;
  fieldLabel?: string;
}

export default function DismissalModal({
  open,
  onConfirm,
  onCancel,
  discrepancyId,
  fieldLabel,
}: DismissalModalProps) {
  const [selected, setSelected] = useState<DismissalReason | ''>('');
  const [notes, setNotes] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [touched, setTouched] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const notesRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (!open) return;
    setSelected('');
    setNotes('');
    setTouched(false);
    setDropdownOpen(false);
  }, [open]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!open) return;
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onCancel]);

  if (!open) return null;

  const canConfirm = selected !== '';
  const showError = touched && selected === '';
  const selectedHint = DISMISSAL_OPTIONS.find((o) => o.value === selected)?.hint;

  const submit = () => {
    setTouched(true);
    if (!canConfirm) return;
    onConfirm(selected as DismissalReason, notes.trim());
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dismissal-modal-title"
    >
      <div
        className="absolute inset-0 bg-slate-950/55 backdrop-blur-sm"
        onClick={onCancel}
        aria-hidden
      />

      <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-slate-950/80 backdrop-blur-xl shadow-[0_30px_80px_-15px_rgba(0,0,0,0.8)] overflow-hidden">
        <div
          className="absolute top-0 inset-x-0 h-[2px] opacity-90"
          style={{
            background:
              'linear-gradient(90deg, rgba(148,163,184,0.0), rgba(148,163,184,0.6), rgba(148,163,184,0.0))',
          }}
        />

        <header className="relative flex items-start justify-between gap-3 px-5 py-4 border-b border-white/5">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-9 h-9 shrink-0 rounded-xl bg-slate-500/10 border border-slate-400/15 flex items-center justify-center">
              <FileX2 className="w-4 h-4 text-slate-300" />
            </div>
            <div className="min-w-0">
              <h2
                id="dismissal-modal-title"
                className="text-sm font-extrabold text-white"
              >
                Dismiss discrepancy
              </h2>
              <p className="mt-0.5 text-[11px] text-slate-500 truncate">
                {discrepancyId ? `${discrepancyId} · ` : ''}
                {fieldLabel || 'Select a reason before confirming'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close dialog"
            className="w-8 h-8 rounded-lg border border-white/5 bg-white/[0.03] text-slate-400 hover:text-white hover:bg-white/[0.08] flex items-center justify-center shrink-0 transition"
          >
            <XIcon className="w-4 h-4" />
          </button>
        </header>

        <div className="px-5 py-4 space-y-4">
          <div ref={dropdownRef} className="relative">
            <label className="block">
              <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                Dismissal reason
                <span className="text-rose-400 ml-0.5">*</span>
              </span>
            </label>

            <button
              type="button"
              onClick={() => setDropdownOpen((v) => !v)}
              onBlur={() => setTouched(true)}
              className={`mt-1.5 w-full flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl border text-left transition focus:outline-none focus:ring-2 focus:ring-offset-0 ${
                showError
                  ? 'border-rose-400/40 bg-rose-500/[0.05] text-slate-100 ring-rose-400/20 focus:ring-rose-400/40'
                  : selected
                  ? 'border-white/10 bg-white/[0.04] text-slate-100 ring-slate-400/20 focus:ring-slate-400/40'
                  : 'border-white/10 bg-white/[0.03] text-slate-400 ring-slate-400/20 focus:ring-slate-400/40'
              }`}
              aria-haspopup="listbox"
              aria-expanded={dropdownOpen}
            >
              <span className="text-xs font-semibold truncate">
                {selected || 'Select a dismissal reason…'}
              </span>
              <ChevronDown
                className={`w-4 h-4 shrink-0 text-slate-400 transition-transform duration-200 ${
                  dropdownOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {dropdownOpen && (
              <ul
                role="listbox"
                className="absolute z-10 mt-1.5 w-full rounded-xl border border-white/10 bg-slate-950/95 backdrop-blur-xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.8)] overflow-hidden"
              >
                {DISMISSAL_OPTIONS.map((opt) => {
                  const active = selected === opt.value;
                  return (
                    <li key={opt.value}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={active}
                        onClick={() => {
                          setSelected(opt.value);
                          setDropdownOpen(false);
                          setTouched(true);
                        }}
                        className={`w-full text-left px-3.5 py-2.5 transition ${
                          active
                            ? 'bg-white/[0.06]'
                            : 'hover:bg-white/[0.04]'
                        } ${active ? '' : 'border-b border-white/5'} last:border-b-0`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p
                              className={`text-xs font-bold ${
                                active ? 'text-white' : 'text-slate-200'
                              }`}
                            >
                              {opt.value}
                            </p>
                            <p className="mt-0.5 text-[10px] text-slate-500 leading-snug">
                              {opt.hint}
                            </p>
                          </div>
                          {active && (
                            <Check className="w-4 h-4 text-emerald-300 shrink-0 mt-0.5" />
                          )}
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}

            {showError ? (
              <div className="mt-2 flex items-start gap-1.5">
                <AlertCircle className="w-3 h-3 text-rose-400 shrink-0 mt-0.5" />
                <p className="text-[10px] font-semibold text-rose-300">
                  A dismissal reason is required before confirming.
                </p>
              </div>
            ) : selectedHint && selected ? (
              <p className="mt-2 text-[10px] text-slate-500 leading-snug">
                <span className="text-slate-400 font-bold">Guidance:</span>{' '}
                {selectedHint}
              </p>
            ) : null}
          </div>

          <div>
            <label htmlFor="dismissal-notes" className="block">
              <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500 flex items-center gap-1.5">
                <StickyNote className="w-3 h-3" />
                Notes (optional)
              </span>
            </label>
            <textarea
              id="dismissal-notes"
              ref={notesRef}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Document context, evidence links, or reviewer name…"
              rows={4}
              className="mt-1.5 w-full resize-none px-3.5 py-2.5 rounded-xl border border-white/10 bg-white/[0.03] text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-400/30 focus:border-slate-400/30 transition"
            />
            <div className="mt-1 flex justify-end">
              <span className="font-mono text-[9px] text-slate-600 tabular-nums">
                {notes.length} / 2000
              </span>
            </div>
          </div>

          <div className="flex items-start gap-2.5 rounded-xl border border-sky-400/15 bg-sky-500/[0.04] px-3.5 py-2.5">
            <ShieldAlert className="w-3.5 h-3.5 text-sky-300 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-wider text-sky-300">
                Immutable audit trail
              </p>
              <p className="mt-0.5 text-[11px] text-slate-400 leading-snug">
                Dismissals are logged with your identity, timestamp, and this
                reason. The entry cannot be edited or deleted retroactively.
              </p>
            </div>
          </div>
        </div>

        <footer className="flex items-center justify-end gap-2 px-5 py-4 border-t border-white/5 bg-slate-950/60">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center justify-center px-4 py-2 rounded-xl border border-white/10 bg-white/[0.03] text-xs font-bold text-slate-300 hover:bg-white/[0.06] hover:text-white transition focus:outline-none focus:ring-2 focus:ring-slate-400/30 active:scale-[0.98]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!canConfirm}
            className={`inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl border text-xs font-bold transition focus:outline-none focus:ring-2 focus:ring-offset-0 active:scale-[0.98] ${
              canConfirm
                ? 'bg-slate-500/15 hover:bg-slate-500/25 border-slate-400/25 text-slate-100 ring-slate-400/30 focus:ring-slate-400/40'
                : 'bg-white/[0.02] border-white/5 text-slate-600 cursor-not-allowed'
            }`}
          >
            <Check className="w-3.5 h-3.5" />
            Confirm dismiss
          </button>
        </footer>
      </div>
    </div>
  );
}
