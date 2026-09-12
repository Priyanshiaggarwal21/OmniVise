'use client';
import React, { useState, useCallback } from 'react';
import {
  Phone,
  Mail,
  Clock,
  FileText,
  ShieldCheck,
  BookOpen,
  Send,
  CheckCircle2,
  X,
  Download,
} from 'lucide-react';
import { triggerDownload } from '../../lib/exports';

type TicketSeverity = 'Low' | 'Medium' | 'High';
type TicketCategory = 'Audit Issue' | 'OCR Parsing' | 'Security';

interface SupportTicketForm {
  subject: string;
  category: TicketCategory;
  description: string;
  severity: TicketSeverity;
}

interface ToastState {
  id: string;
  ticketNumber: string;
  severity: TicketSeverity;
  visible: boolean;
}

const SEVERITY_OPTIONS: { value: TicketSeverity; label: string; color: string }[] = [
  { value: 'Low', label: 'Low (General Query)', color: 'bg-emerald-500/10 text-emerald-300 ring-emerald-400/30' },
  { value: 'Medium', label: 'Medium (Data Discrepancy)', color: 'bg-sky-500/10 text-sky-300 ring-sky-400/30' },
  { value: 'High', label: 'High (Audit Blocker)', color: 'bg-rose-500/10 text-rose-300 ring-rose-400/30' },
];

const CATEGORY_OPTIONS: TicketCategory[] = ['Audit Issue', 'OCR Parsing', 'Security'];

const DOC_LINKS: { title: string; icon: 'filetext' | 'shield' | 'book'; href: string }[] = [
  { title: 'SOX Compliance Guide', icon: 'filetext', href: '#' },
  { title: 'SOC2 Type II Report', icon: 'shield', href: '#' },
  { title: 'ASC 606 Revenue Recognition Standard', icon: 'book', href: '#' },
];

function generateTicketId(): string {
  const suffix = Math.floor(1000 + Math.random() * 9000).toString();
  return `T-${suffix}`;
}

const DEMO_PURCHASE_ORDER = `document_type,document_number,vendor,issue_date,sku,description,quantity,unit_price,total
Purchase Order,PO-DEMO-1042,Northstar Components,2026-07-01,SKU-081,A100 GPU,2,12500,25000
Purchase Order,PO-DEMO-1042,Northstar Components,2026-07-01,SKU-092,HBM3 Memory Kit,4,1800,7200
Purchase Order,PO-DEMO-1042,Northstar Components,2026-07-01,SKU-117,Installation Service,1,3900,3900`;

const DEMO_INVOICE = `document_type,document_number,vendor,issue_date,sku,description,quantity,unit_price,total
Invoice,INV-DEMO-8821,Northstar Components,2026-07-18,SKU-081,A100 GPU,2,12950,25900
Invoice,INV-DEMO-8821,Northstar Components,2026-07-18,SKU-092,HBM3 Memory Kit,4,1800,7200
Invoice,INV-DEMO-8821,Northstar Components,2026-07-18,SKU-117,Installation Service,1,3900,3900`;

function DocIcon({ kind }: { kind: 'filetext' | 'shield' | 'book' }): React.ReactElement {
  if (kind === 'filetext') return <FileText className="w-4 h-4" />;
  if (kind === 'shield') return <ShieldCheck className="w-4 h-4" />;
  return <BookOpen className="w-4 h-4" />;
}

export default function HelpView(): React.ReactElement {
  const [form, setForm] = useState<SupportTicketForm>({
    subject: '',
    category: 'Audit Issue',
    description: '',
    severity: 'Medium',
  });
  const [toast, setToast] = useState<ToastState | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [demoFilesDownloaded, setDemoFilesDownloaded] = useState(false);

  const handleDemoDownload = (): void => {
    triggerDownload(new Blob([DEMO_PURCHASE_ORDER], { type: 'text/csv;charset=utf-8' }), 'demo-purchase-order.csv');
    window.setTimeout(() => {
      triggerDownload(new Blob([DEMO_INVOICE], { type: 'text/csv;charset=utf-8' }), 'demo-invoice.csv');
    }, 100);
    setDemoFilesDownloaded(true);
    window.setTimeout(() => setDemoFilesDownloaded(false), 3000);
  };

  const handleSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>): void => {
      e.preventDefault();
      if (!form.subject.trim() || !form.description.trim()) return;

      setIsSubmitting(true);

      window.setTimeout(() => {
        const ticketNumber = generateTicketId();
        setToast({
          id: Math.random().toString(36).slice(2, 10),
          ticketNumber,
          severity: form.severity,
          visible: true,
        });
        setForm({ subject: '', category: 'Audit Issue', description: '', severity: 'Medium' });
        setIsSubmitting(false);

        window.setTimeout(() => {
          setToast((prev) => (prev ? { ...prev, visible: false } : prev));
          window.setTimeout(() => setToast(null), 400);
        }, 5000);
      }, 600);
    },
    [form]
  );

  const sevOption = SEVERITY_OPTIONS.find((opt) => opt.value === form.severity);
  const selectClasses = sevOption ? sevOption.color : SEVERITY_OPTIONS[1].color;

  return (
    <div className="min-h-screen w-full relative p-4 md:p-8">
      <div className="absolute inset-0 bg-slate-950 pointer-events-none" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-7xl mx-auto space-y-6">
        <div className="mb-2">
          <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">Help &amp; Compliance Support</h1>
          <p className="text-sm text-slate-400 mt-1.5">
            Reach the compliance team, access audit documentation, or file a priority support ticket.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section className="relative rounded-2xl border border-white/10 bg-slate-950/60 backdrop-blur-xl shadow-2xl overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-fuchsia-400/60 to-transparent" />
            <div className="absolute -top-24 -left-24 w-64 h-64 bg-fuchsia-500/10 rounded-full blur-3xl" />
            <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl" />

            <div className="relative p-6 md:p-7">
              <div className="flex items-center gap-2 mb-5">
                <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.12em] rounded-full bg-fuchsia-500/10 text-fuchsia-300 ring-1 ring-fuchsia-400/30">
                  Card 1 · Dedicated Contact
                </span>
              </div>

              <div className="flex items-start gap-5">
                <div className="relative shrink-0">
                  <div className="absolute inset-0 rounded-full bg-gradient-to-br from-fuchsia-500 via-indigo-500 to-emerald-400 blur-[2px] opacity-80 scale-[1.04]" />
                  <div className="relative w-20 h-20 rounded-full bg-slate-900 flex items-center justify-center">
                    <div className="w-[72px] h-[72px] rounded-full bg-gradient-to-br from-fuchsia-600 via-indigo-600 to-emerald-500 flex items-center justify-center">
                      <span className="text-xl font-black text-white drop-shadow-md">PA</span>
                    </div>
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <h2 className="text-lg md:text-xl font-black text-white tracking-tight">Lead Auditor</h2>
                  <p className="text-xs md:text-sm text-slate-400 mt-0.5 font-semibold">
                    Priyanshi Aggarwal · OmniVise
                  </p>

                  <div className="mt-4 flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 ring-1 ring-emerald-400/30 text-emerald-300 text-[10.5px] font-black">
                      <Clock className="w-3.5 h-3.5" />
                      24/7
                    </span>
                    <span className="text-[11.5px] text-slate-300 font-semibold">
                      Available 24/7 for priority audit matters
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-6 space-y-2.5">
                <a
                  href="tel:+918860096173"
                  className="group flex items-center gap-3 px-4 py-3 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/20 transition-all"
                >
                  <div className="w-9 h-9 rounded-lg bg-indigo-500/15 text-indigo-300 flex items-center justify-center shrink-0 group-hover:bg-indigo-500/25 transition-colors">
                    <Phone className="w-[18px] h-[18px]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Direct Phone</p>
                    <p className="text-sm font-bold text-white mt-0.5">+91 8860096173</p>
                  </div>
                  <span className="text-[10.5px] font-black text-indigo-300 opacity-0 group-hover:opacity-100 transition-opacity">
                    Call →
                  </span>
                </a>

                <a
                  href="mailto:audit-support@omnivise.ai"
                  className="group flex items-center gap-3 px-4 py-3 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/20 transition-all"
                >
                  <div className="w-9 h-9 rounded-lg bg-emerald-500/15 text-emerald-300 flex items-center justify-center shrink-0 group-hover:bg-emerald-500/25 transition-colors">
                    <Mail className="w-[18px] h-[18px]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Audit Support Email</p>
                    <p className="text-sm font-bold text-white mt-0.5 truncate">audit-support@omnivise.ai</p>
                  </div>
                  <span className="text-[10.5px] font-black text-emerald-300 opacity-0 group-hover:opacity-100 transition-opacity">
                    Email →
                  </span>
                </a>
              </div>
            </div>
          </section>

          <section className="relative rounded-2xl border border-white/10 bg-slate-950/60 backdrop-blur-xl shadow-2xl overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-400/60 to-transparent" />
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl" />
            <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-sky-500/10 rounded-full blur-3xl" />

            <div className="relative p-6 md:p-7">
              <div className="flex items-center gap-2 mb-5">
                <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.12em] rounded-full bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-400/30">
                  Card 2 · Documentation
                </span>
              </div>

              <div className="flex items-start gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/30 to-sky-500/20 border border-white/10 flex items-center justify-center text-emerald-200 shrink-0">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-white tracking-tight">Compliance Documentation Library</h2>
                  <p className="text-xs text-slate-400 mt-0.5 font-semibold">
                    Reference materials for audit teams and regulators.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {DOC_LINKS.map((doc) => (
                  <a
                    key={doc.title}
                    href={doc.href}
                    className="group flex items-center gap-3.5 px-4 py-3.5 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/20 transition-all"
                  >
                    <div className={`w-9 h-9 rounded-lg shrink-0 flex items-center justify-center transition-colors ${
                      doc.icon === 'filetext' ? 'bg-indigo-500/15 text-indigo-300 group-hover:bg-indigo-500/25' :
                      doc.icon === 'shield' ? 'bg-emerald-500/15 text-emerald-300 group-hover:bg-emerald-500/25' :
                      'bg-amber-500/15 text-amber-300 group-hover:bg-amber-500/25'
                    }`}>
                      <DocIcon kind={doc.icon} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-white leading-snug group-hover:text-white">{doc.title}</p>
                      <p className="text-[10.5px] text-slate-500 mt-0.5 font-semibold">
                        {doc.icon === 'filetext' ? 'Internal control framework & procedures' :
                         doc.icon === 'shield' ? 'Latest attestation · Auditor signed' :
                         'Technical accounting standard guidance'}
                      </p>
                    </div>
                    <svg
                      className="w-4 h-4 text-slate-500 group-hover:text-white shrink-0 transition-all group-hover:translate-x-0.5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M5 12h14" />
                      <path d="m12 5 7 7-7 7" />
                    </svg>
                  </a>
                ))}
              </div>

              <div className="mt-5 rounded-xl border border-indigo-400/20 bg-indigo-500/[0.06] p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-indigo-400/25 bg-indigo-500/15 text-indigo-300">
                    <Download className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-white">Demo audit files</p>
                    <p className="mt-1 text-[10.5px] font-semibold leading-relaxed text-slate-400">Download a matched PO and invoice pair with a deliberate line-item variance for testing.</p>
                  </div>
                </div>
                <button type="button" onClick={handleDemoDownload} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-indigo-400/25 bg-indigo-500/15 px-3 py-2.5 text-xs font-black text-indigo-200 transition hover:border-indigo-400/45 hover:bg-indigo-500/25">
                  <Download className="h-3.5 w-3.5" />
                  {demoFilesDownloaded ? 'Demo PO & Invoice Downloaded' : 'Download Demo PO & Invoice'}
                </button>
              </div>
            </div>
          </section>

          <section className="relative lg:col-span-2 rounded-2xl border border-white/10 bg-slate-950/60 backdrop-blur-xl shadow-2xl overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-400/60 via-fuchsia-400/50 to-transparent" />
            <div className="absolute -top-32 left-1/3 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl" />
            <div className="absolute -bottom-32 right-1/3 w-80 h-80 bg-fuchsia-500/10 rounded-full blur-3xl" />

            <div className="relative p-6 md:p-8">
              <div className="flex items-center gap-2 mb-5">
                <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.12em] rounded-full bg-indigo-500/10 text-indigo-300 ring-1 ring-indigo-400/30">
                  Card 3 · Support Ticket
                </span>
              </div>

              <div className="flex items-start gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/30 via-fuchsia-500/20 to-emerald-500/20 border border-white/10 flex items-center justify-center text-indigo-200 shrink-0">
                  <Send className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-white tracking-tight">Priority Support Ticket Form</h2>
                  <p className="text-xs text-slate-400 mt-0.5 font-semibold">
                    High-severity issues receive priority handling. All tickets route to the compliance on-call engineer.
                  </p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label htmlFor="ticket-subject" className="block text-[11px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                    Subject
                  </label>
                  <input
                    id="ticket-subject"
                    type="text"
                    required
                    value={form.subject}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
                      setForm((prev) => ({ ...prev, subject: e.target.value }))
                    }
                    placeholder="Brief summary of the issue or request…"
                    className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/10 text-sm font-semibold text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-400/40 focus:border-indigo-400/30 transition-all"
                  />
                </div>

                <div>
                  <label htmlFor="ticket-severity" className="block text-[11px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                    Priority
                  </label>
                  <div className="relative">
                    <select
                      id="ticket-priority"
                      required
                      value={form.severity}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>): void =>
                        setForm((prev) => ({ ...prev, severity: e.target.value as TicketSeverity }))
                      }
                      className={`w-full px-4 py-3 rounded-xl border text-sm font-bold appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:border-transparent transition-all ring-1 bg-white/[0.03] ${selectClasses} focus:ring-indigo-400/40`}
                    >
                      {SEVERITY_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value} className="bg-slate-900 text-white">
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    <svg
                      className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </div>
                  <p className="text-[10.5px] text-slate-500 mt-1.5 font-semibold">
                    {form.severity === 'High' && 'Audit blocker or sign-off risk — priority response.'}
                    {form.severity === 'Medium' && 'Data discrepancy requiring review and reconciliation.'}
                    {form.severity === 'Low' && 'General question or non-blocking support request.'}
                  </p>
                </div>

                <div>
                  <label htmlFor="ticket-category" className="block text-[11px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                    Category
                  </label>
                  <select
                    id="ticket-category"
                    required
                    value={form.category}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>): void =>
                      setForm((prev) => ({ ...prev, category: e.target.value as TicketCategory }))
                    }
                    className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-bold text-slate-200 outline-none focus:border-indigo-400/40 focus:ring-2 focus:ring-indigo-400/40"
                  >
                    {CATEGORY_OPTIONS.map((category) => <option key={category} value={category} className="bg-slate-900 text-white">{category}</option>)}
                  </select>
                </div>

                <div>
                  <label htmlFor="ticket-description" className="block text-[11px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                    Details
                  </label>
                  <textarea
                    id="ticket-description"
                    required
                    rows={5}
                    value={form.description}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>): void =>
                      setForm((prev) => ({ ...prev, description: e.target.value }))
                    }
                    placeholder="Describe the audit issue, OCR behavior, or security concern..."
                    className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/10 text-sm font-semibold text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-400/40 focus:border-indigo-400/30 transition-all resize-y min-h-[140px]"
                  />
                </div>

                <div className="flex items-center justify-between gap-4 pt-1">
                  <p className="text-[10.5px] text-slate-500 font-semibold">
                    All fields required. Tickets are logged in the compliance CRM with immutable audit trail.
                  </p>
                  <button
                    type="submit"
                    disabled={isSubmitting || !form.subject.trim() || !form.description.trim()}
                    className="shrink-0 inline-flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-black text-white bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-emerald-500 shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:brightness-100 disabled:hover:shadow-indigo-500/20 transition-all"
                  >
                    {isSubmitting ? (
                      <>
                        <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Submitting…
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Submit Ticket
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </section>
        </div>
      </div>

      {toast && (
        <div
          className={`fixed top-4 right-4 md:top-6 md:right-6 z-50 w-[min(calc(100vw-2rem),420px)] transition-all duration-300 ${
            toast.visible ? 'translate-y-0 opacity-100' : '-translate-y-4 opacity-0 pointer-events-none'
          }`}
        >
          <div className="relative rounded-2xl border border-emerald-400/20 bg-gradient-to-br from-slate-950/95 to-slate-900/95 backdrop-blur-2xl shadow-2xl overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-400/60 to-transparent" />
            <div className="absolute -top-16 -right-16 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl" />

            <div className="relative p-5 flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 ring-1 ring-emerald-400/30 text-emerald-300 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-sm font-black text-white leading-snug">
                  Ticket #{toast.ticketNumber} submitted
                </p>
                <p className="text-xs text-slate-400 mt-1 font-semibold leading-relaxed">
                  Ticket routed to the compliance team. Reference #{toast.ticketNumber} in all follow-ups.
                </p>
                <div className="mt-2.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 ring-1 ring-white/10 text-[10px] font-bold text-slate-300">
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    toast.severity === 'High' ? 'bg-rose-500' :
                    toast.severity === 'Medium' ? 'bg-sky-500' :
                    'bg-emerald-500'
                  }`} />
                  Priority: {toast.severity}
                </div>
              </div>

              <button
                onClick={(): void => {
                  setToast((prev) => (prev ? { ...prev, visible: false } : prev));
                  window.setTimeout(() => setToast(null), 400);
                }}
                className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 transition-colors shrink-0"
                aria-label="Dismiss toast"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export type { TicketCategory, TicketSeverity, SupportTicketForm };
