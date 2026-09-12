'use client';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Search, Bell, Upload, Info, Gauge, ShieldCheck, TrendingDown,
  FileCheck2, CheckCircle2, AlertTriangle, Award, Sparkles, ArrowRight, Eye, EyeOff, X,
  LineChart, Users, Cpu, Download, ChevronDown, User, LayoutDashboard, Activity
} from 'lucide-react';
import LoginView, { UserRole } from '../auth/LoginView';
import Sidebar from '../layout/Sidebar';
import XAIDrawer, { Discrepancy as XAIDiscrepancy } from '../xai/XAIDrawer';
import LegacyKnowledgeGraph from '../graph/KnowledgeGraph';
import KnowledgeGraphView from '../KnowledgeGraph';
import SettingsView from '../SettingsView';
import ExecutiveRiskSummary from './ExecutiveRiskSummary';
import DocumentsManager from '../DocumentsManager';
import ClaimsManager from '../ClaimsManager';
import DiscrepanciesView from '../DiscrepanciesView';
import ReportsView from '../ReportsView';
import MonitorView from '../MonitorView';
import DocumentUploader from '../upload/DocumentUploader';
import type {
  AuditDataset, Claim, MatchedDiscrepancy, ParsedDocument, ParsedDashboardMetrics, SettingsState,
  GraphNodeData, GraphEdgeData
} from '../../types';
import { exportPDF, exportCSV, exportJSON, triggerDownload } from '../../lib/exports';

const SEED_DOCS: ParsedDocument[] = [
  { id: 'doc-001', filename: 'Q3_FY2026_Earnings_Call.pdf', kind: 'Earnings Call', vendor: 'OmniVise Holdings', counterparty: 'Investors', documentNumber: 'EC-Q3-2026', issueDate: '2026-09-15', dueDate: '2026-09-30', currency: 'USD', subtotal: 0, taxRate: 0, taxAmount: 0, totalAmount: 0, lineItems: [], uploadedAt: new Date(Date.now() - 2 * 86400000).toISOString(), status: 'parsed', notes: 'Transcript sourced from corporate IR.' },
  { id: 'doc-002', filename: '10-Q_Filing_Q3_FY2026.pdf', kind: '10-Q Filing', vendor: 'OmniVise Holdings', counterparty: 'SEC', documentNumber: '10-Q-2026-Q3', issueDate: '2026-09-28', currency: 'USD', subtotal: 0, taxRate: 0, taxAmount: 0, totalAmount: 0, lineItems: [], uploadedAt: new Date(Date.now() - 1 * 86400000).toISOString(), status: 'parsed' },
  { id: 'doc-003', filename: 'Purchase_Order_PO-1042.pdf', kind: 'Purchase Order', vendor: 'Nexus Semiconductor', counterparty: 'OmniVise Holdings', documentNumber: 'PO-1042', issueDate: '2026-08-02', dueDate: '2026-08-20', currency: 'USD', subtotal: 125000, taxRate: 0.08, taxAmount: 10000, totalAmount: 135000, lineItems: [{ sku: 'A100-GPU', description: 'A100 GPU Accelerator', quantity: 20, unitPrice: 5000, total: 100000 }, { sku: 'HBM3-16G', description: 'HBM3 Memory Module', quantity: 40, unitPrice: 625, total: 25000 }], uploadedAt: new Date(Date.now() - 3 * 86400000).toISOString(), status: 'matched' },
  { id: 'doc-004', filename: 'Invoice_INV-8821.pdf', kind: 'Invoice', vendor: 'Nexus Semiconductor', counterparty: 'OmniVise Holdings', documentNumber: 'INV-8821', issueDate: '2026-08-18', dueDate: '2026-09-01', currency: 'USD', subtotal: 132650, taxRate: 0.08, taxAmount: 10612, totalAmount: 143262, lineItems: [{ sku: 'A100-GPU', description: 'A100 GPU Accelerator', quantity: 20, unitPrice: 5187.5, total: 103750 }, { sku: 'HBM3-16G', description: 'HBM3 Memory Module', quantity: 42, unitPrice: 625, total: 26250 }, { sku: 'RACK-INSTALL', description: 'Rack Installation Service', quantity: 1, unitPrice: 3900, total: 3900 }], uploadedAt: new Date(Date.now() - 3 * 86400000).toISOString(), status: 'flagged' },
  { id: 'doc-005', filename: 'Revenue_Ledger_Q3.xlsx', kind: 'Other', vendor: 'OmniVise Holdings', documentNumber: 'GL-REV-Q3', issueDate: '2026-09-30', currency: 'USD', subtotal: 43200000, taxRate: 0, taxAmount: 0, totalAmount: 43200000, lineItems: [], uploadedAt: new Date(Date.now() - 12 * 3600000).toISOString(), status: 'parsed', notes: 'Excel ledger export.' },
  { id: 'doc-006', filename: 'Margin_Variance_Report.csv', kind: 'Other', vendor: 'FP&A Team', documentNumber: 'CSV-MARGIN-Q3', issueDate: '2026-10-01', currency: 'USD', subtotal: 0, taxRate: 0, taxAmount: 0, totalAmount: 0, lineItems: [], uploadedAt: new Date(Date.now() - 6 * 3600000).toISOString(), status: 'parsed' },
  { id: 'doc-007', filename: 'Contract_MSA_Nexus.docx', kind: 'Contract', vendor: 'Nexus Semiconductor', counterparty: 'OmniVise Holdings', documentNumber: 'MSA-2026-0042', issueDate: '2026-01-10', dueDate: '2027-01-09', currency: 'USD', subtotal: 0, taxRate: 0, taxAmount: 0, totalAmount: 2500000, lineItems: [], uploadedAt: new Date(Date.now() - 5 * 86400000).toISOString(), status: 'parsed', notes: 'Master services agreement — volume pricing clause 4.2.' },
  { id: 'doc-008', filename: 'Vendor_Response.json', kind: 'Other', vendor: 'Nexus Semiconductor', documentNumber: 'API-VDR-7721', issueDate: '2026-09-12', currency: 'USD', subtotal: 0, taxRate: 0, taxAmount: 0, totalAmount: 0, lineItems: [], uploadedAt: new Date(Date.now() - 30 * 3600000).toISOString(), status: 'parsed', notes: 'JSON payload from vendor disclosure API.' },
];

const SEED_DISCREPANCIES: MatchedDiscrepancy[] = [
  { id: 'D-0001', documents: ['doc-001', 'doc-002'], documentKinds: ['Earnings Call', '10-Q Filing'], field: 'Q3 FY2026 Revenue', poValue: '$45.0M', invoiceValue: '$43.2M', delta: '-$1.8M', deltaFormatted: '-$1.8M (4.0%)', severity: 'Critical', confidence: 0.96, rootCause: 'Earnings call cited guided revenue of $45M while the 10-Q filing recognized $43.2M under ASC 606, with $1.8M pushed to Q4 due to undelivered performance obligations.', executiveClaim: 'We delivered a record quarter with $45M in consolidated revenue.', executiveClaimSource: 'Earnings Call · 00:14:32', auditEvidence: '10-Q Filing page 47, Revenue Recognition Note 2 — $43.2M recognized.', auditEvidenceSource: '10-Q Filing, p. 47', accountingCategory: 'Revenue Recognition / ASC 606', reportingPeriod: 'Q3 FY2026', affectedLineItems: ['Performance obligation: Hosting Go-Live delay'] },
  { id: 'D-0002', documents: ['doc-003', 'doc-004'], documentKinds: ['Purchase Order', 'Invoice'], field: 'A100 GPU Accelerator Unit Cost', poValue: '$5,000.00', invoiceValue: '$5,187.50', delta: '+$187.50', deltaFormatted: '+$187.50 / unit (+3.75%)', severity: 'High', confidence: 0.99, rootCause: 'Invoice applied a list-price increase that is not covered by the MSA volume pricing clause; the PO references clause 4.2 caps at $5,000.', executiveClaim: 'MSA locks in GPU pricing for all of FY2026.', auditEvidence: 'PO-1042 line 1 unit price vs INV-8821 line 1, cross-referenced with MSA clause 4.2.', auditEvidenceSource: 'PO-1042, INV-8821, MSA-2026-0042', accountingCategory: 'Procurement / Vendor Pricing', reportingPeriod: 'Q3 FY2026', affectedLineItems: ['A100 GPU Accelerator × 20'] },
  { id: 'D-0003', documents: ['doc-003', 'doc-004'], documentKinds: ['Purchase Order', 'Invoice'], field: 'HBM3 Memory Module Quantity', poValue: '40 units', invoiceValue: '42 units', delta: '+2 units', deltaFormatted: '+2 units (+5%)', severity: 'Medium', confidence: 0.92, rootCause: 'Two extra memory modules were shipped and invoiced without a corresponding change order or PO amendment.', auditEvidence: 'PO line 2 qty 40 vs Invoice line 2 qty 42.', auditEvidenceSource: 'PO-1042, INV-8821', accountingCategory: 'Inventory / Receiving', reportingPeriod: 'Q3 FY2026' },
  { id: 'D-0004', documents: ['doc-003', 'doc-004'], documentKinds: ['Purchase Order', 'Invoice'], field: 'Rack Installation Service', poValue: '$0.00', invoiceValue: '$3,900.00', delta: '+$3,900', deltaFormatted: '+$3,900 (unplanned charge)', severity: 'Low', confidence: 0.88, rootCause: 'Pass-through labor charge billed by vendor without a PO line; requires receipt verification against receiving log.', auditEvidence: 'INV-8821 line 3 ($3,900) has no matching PO line.', auditEvidenceSource: 'INV-8821 line 3', accountingCategory: 'Unplanned Services', reportingPeriod: 'Q3 FY2026' },
  { id: 'D-0005', documents: ['doc-001', 'doc-005'], documentKinds: ['Earnings Call', 'Other'], field: 'Annualized Run-Rate Revenue', poValue: '$180.0M', invoiceValue: '$172.8M', delta: '-$7.2M', deltaFormatted: '-$7.2M (4.0%)', severity: 'High', confidence: 0.94, rootCause: 'Run-rate annualization in earnings call assumed $45M × 4; GL ledger actuals annualize to $172.8M.', executiveClaim: 'We exited the quarter at a $180M annualized run rate.', executiveClaimSource: 'Earnings Call · 00:21:08', auditEvidence: 'GL Revenue Ledger Q3 actual of $43.2M × 4 = $172.8M.', auditEvidenceSource: 'Revenue_Ledger_Q3.xlsx', accountingCategory: 'KPI / Non-GAAP Reconciliation', reportingPeriod: 'Q3 FY2026' },
  { id: 'D-0006', documents: ['doc-002', 'doc-006'], documentKinds: ['10-Q Filing', 'Other'], field: 'Gross Margin %', poValue: '68.4%', invoiceValue: '64.2%', delta: '-4.2pp', deltaFormatted: '-4.2 percentage points', severity: 'Critical', confidence: 0.97, rootCause: '10-Q MD&A reported 68.4% gross margin; FP&A margin variance report calculated 64.2% after inventory step-up and warranty reserves.', executiveClaim: 'Gross margins expanded 180 bps to 68.4%.', auditEvidence: 'FP&A report tabs "Margin Waterfall" rows 22–28.', auditEvidenceSource: 'Margin_Variance_Report.csv, 10-Q Filing p. 23', accountingCategory: 'Margins & Reserves', reportingPeriod: 'Q3 FY2026' },
  { id: 'D-0007', documents: ['doc-001', 'doc-002'], documentKinds: ['Earnings Call', '10-Q Filing'], field: 'Operating Income', poValue: '$8.28M', invoiceValue: '$6.91M', delta: '-$1.37M', deltaFormatted: '-$1.37M (16.5%)', severity: 'High', confidence: 0.95, rootCause: 'Earnings call cited an adjusted operating income figure ($8.28M) before stock-based comp; the 10-Q GAAP operating income is $6.91M. Adjustment was not explicitly labeled.', executiveClaim: 'Operating income crossed $8M for the first time.', auditEvidence: '10-Q Filing Statement of Operations, Operating income line.', auditEvidenceSource: '10-Q Filing, p. 18', accountingCategory: 'GAAP vs Non-GAAP', reportingPeriod: 'Q3 FY2026' },
  { id: 'D-0008', documents: ['doc-003', 'doc-004'], documentKinds: ['Purchase Order', 'Invoice'], field: 'Invoice Subtotal', poValue: '$125,000.00', invoiceValue: '$132,650.00', delta: '+$7,650', deltaFormatted: '+$7,650 (+6.1%)', severity: 'High', confidence: 0.98, rootCause: 'Aggregate of pricing overcharge ($3,750) + extra qty ($1,250) + unplanned services ($3,900) minus rounding.', auditEvidence: 'PO subtotal vs Invoice subtotal reconciliation.', auditEvidenceSource: 'PO-1042 footer, INV-8821 footer', accountingCategory: 'Subtotal Reconciliation', reportingPeriod: 'Q3 FY2026' },
  { id: 'D-0009', documents: ['doc-003', 'doc-004'], documentKinds: ['Purchase Order', 'Invoice'], field: 'Invoice Total Amount (with tax)', poValue: '$135,000.00', invoiceValue: '$143,262.00', delta: '+$8,262', deltaFormatted: '+$8,262 (+6.1%)', severity: 'High', confidence: 0.99, rootCause: 'Tax recomputed on inflated subtotal ($132,650 × 8%) compounds the base PO overcharge of $612 in tax.', auditEvidence: 'Tax delta = (132,650 − 125,000) × 0.08 = $612.', auditEvidenceSource: 'PO-1042, INV-8821', accountingCategory: 'Tax Impact of Variances', reportingPeriod: 'Q3 FY2026' },
  { id: 'D-0010', documents: ['doc-002', 'doc-005'], documentKinds: ['10-Q Filing', 'Other'], field: 'Deferred Revenue Balance', poValue: '$11.4M', invoiceValue: '$13.2M', delta: '+$1.8M', deltaFormatted: '+$1.8M (+15.8%)', severity: 'Medium', confidence: 0.9, rootCause: 'Earnings appendix referenced $11.4M in deferred revenue; general ledger actually shows $13.2M after Q4 deferral entries were posted pre-close.', auditEvidence: 'GL adjustment batch ADJ-2026-09-347.', auditEvidenceSource: 'Revenue_Ledger_Q3.xlsx', accountingCategory: 'Balance Sheet / Deferred Revenue', reportingPeriod: 'Q3 FY2026' },
  { id: 'D-0011', documents: ['doc-007', 'doc-008'], documentKinds: ['Contract', 'Other'], field: 'MSA Contract Ceiling', poValue: '$2.5M', invoiceValue: '$3.1M', delta: '+$600,000', deltaFormatted: '+$600,000 (24% above ceiling)', severity: 'Critical', confidence: 0.93, rootCause: 'Vendor disclosure API reports cumulative FY2026 billed-to-date of $3.1M while MSA contract ceiling signed Jan 2026 is $2.5M; exceeds by $600k.', executiveClaim: 'All Nexus spend is within contracted ceilings.', auditEvidence: 'MSA §3.1 maximum liability clause vs Vendor_Response.json totals.cumulativeBilled.', auditEvidenceSource: 'MSA-2026-0042 §3.1, Vendor_Response.json', accountingCategory: 'Contract Compliance', reportingPeriod: 'FY2026 YTD' },
  { id: 'D-0012', documents: ['doc-001', 'doc-002'], documentKinds: ['Earnings Call', '10-Q Filing'], field: 'Capital Expenditures', poValue: '$6.0M', invoiceValue: '$4.7M', delta: '-$1.3M', deltaFormatted: '-$1.3M (21.7%)', severity: 'Medium', confidence: 0.86, rootCause: 'Earnings call commentary cited $6M capex, but 10-Q cash flow statement reports $4.7M due to a $1.3M build-to-suit lease reclassification.', auditEvidence: '10-Q Cash Flow from Investing Activities line.', auditEvidenceSource: '10-Q Filing, p. 21', accountingCategory: 'Capex vs Opex Classification', reportingPeriod: 'Q3 FY2026' },
  { id: 'D-0013', documents: ['doc-006', 'doc-005'], documentKinds: ['Other', 'Other'], field: 'COGS as % of Revenue', poValue: '31.6%', invoiceValue: '35.8%', delta: '+4.2pp', deltaFormatted: '+4.2 percentage points', severity: 'High', confidence: 0.91, rootCause: 'FP&A margin report used a different COGS denominator (excluding shipping & handling) than the GL ledger roll-forward.', auditEvidence: 'Margin report methodology footnote vs Revenue ledger GL account mapping.', auditEvidenceSource: 'Margin_Variance_Report.csv, Revenue_Ledger_Q3.xlsx', accountingCategory: 'Policy / Methodology Alignment', reportingPeriod: 'Q3 FY2026' },
  { id: 'D-0014', documents: ['doc-001', 'doc-002'], documentKinds: ['Earnings Call', '10-Q Filing'], field: 'Free Cash Flow', poValue: '$7.4M', invoiceValue: '$5.9M', delta: '-$1.5M', deltaFormatted: '-$1.5M (20.3%)', severity: 'Medium', confidence: 0.89, rootCause: 'Earnings call FCF figure excluded one-time vendor prepay; 10-Q cash flow statement includes it as operating cash outflow.', executiveClaim: 'Free cash flow crossed $7M for the quarter.', auditEvidence: '10-Q supplemental cash flow disclosures.', auditEvidenceSource: '10-Q Filing, p. 22', accountingCategory: 'Liquidity / FCF Definition', reportingPeriod: 'Q3 FY2026' },
];

const SEED_METRICS: ParsedDashboardMetrics = (() => {
  const totalAudited = SEED_DOCS.reduce((s, d) => s + (d.totalAmount || 0), 0) + 43_200_000;
  const flaggedVariance = SEED_DISCREPANCIES.reduce((s, d) => {
    const delta = Math.abs(typeof d.delta === 'number' ? d.delta : parseFloat(String(d.delta).replace(/[^0-9.\-]/g, '')) || 0);
    return s + (delta < 1000 ? delta * 1000 : delta);
  }, 0);
  const avgConf = Math.round(SEED_DISCREPANCIES.reduce((s, d) => s + d.confidence, 0) / SEED_DISCREPANCIES.length * 100);
  return {
    totalAudited,
    totalAuditedFormatted: `$${(totalAudited / 1_000_000).toFixed(1)}M`,
    flaggedVariance,
    flaggedVarianceFormatted: `$${(flaggedVariance / 1_000_000).toFixed(2)}M`,
    averageConfidence: avgConf,
    documentsCount: SEED_DOCS.length,
    discrepanciesCount: SEED_DISCREPANCIES.length,
    criticalCount: SEED_DISCREPANCIES.filter((d) => d.severity === 'Critical').length,
  };
})();

const SEED_GRAPH: { nodes: GraphNodeData[]; edges: GraphEdgeData[] } = {
  nodes: [
    { id: 'ent-omnivise', label: 'OmniVise Holdings', sublabel: 'Company', x: 200, y: 240, type: 'company' },
    { id: 'ent-nexus', label: 'Nexus Semiconductor', sublabel: 'Vendor', x: 760, y: 240, type: 'vendor' },
    { id: 'doc-earnings', label: 'Q3 Earnings Call', sublabel: 'EC-Q3-2026', x: 200, y: 100, type: 'document' },
    { id: 'doc-10q', label: '10-Q Filing', sublabel: '10-Q-2026-Q3', x: 200, y: 380, type: 'document' },
    { id: 'doc-po', label: 'PO-1042', sublabel: 'Purchase Order', x: 480, y: 100, type: 'document' },
    { id: 'doc-inv', label: 'INV-8821', sublabel: 'Invoice', x: 480, y: 380, type: 'document' },
    { id: 'doc-msa', label: 'MSA-2026-0042', sublabel: 'Contract', x: 760, y: 100, type: 'document' },
    { id: 'doc-api', label: 'Vendor Response', sublabel: 'JSON payload', x: 760, y: 380, type: 'document' },
    { id: 'metric-rev', label: 'Q3 Revenue', sublabel: '$45.0M vs $43.2M', x: 340, y: 240, type: 'metric', severity: 'Critical', relatedDiscrepancyId: 'D-0001' },
    { id: 'metric-margin', label: 'Gross Margin', sublabel: '68.4% vs 64.2%', x: 620, y: 240, type: 'metric', severity: 'Critical', relatedDiscrepancyId: 'D-0006' },
    { id: 'metric-msa', label: 'MSA Ceiling', sublabel: '$2.5M vs $3.1M', x: 760, y: 240, type: 'metric', severity: 'Critical', relatedDiscrepancyId: 'D-0011' },
    { id: 'disc-d0002', label: 'GPU Pricing Overcharge', sublabel: 'D-0002 · High', x: 480, y: 240, type: 'contradiction', severity: 'High', relatedDiscrepancyId: 'D-0002' },
  ],
  edges: [
    { from: 'ent-omnivise', to: 'doc-earnings' }, { from: 'ent-omnivise', to: 'doc-10q' },
    { from: 'ent-omnivise', to: 'doc-po' }, { from: 'ent-omnivise', to: 'metric-rev' },
    { from: 'ent-omnivise', to: 'metric-margin' }, { from: 'ent-nexus', to: 'doc-inv' },
    { from: 'ent-nexus', to: 'doc-msa' }, { from: 'ent-nexus', to: 'doc-api' },
    { from: 'ent-nexus', to: 'metric-msa' }, { from: 'doc-po', to: 'disc-d0002' },
    { from: 'doc-inv', to: 'disc-d0002' }, { from: 'doc-msa', to: 'metric-msa' },
    { from: 'doc-api', to: 'metric-msa' }, { from: 'doc-earnings', to: 'metric-rev' },
    { from: 'doc-10q', to: 'metric-rev' }, { from: 'doc-10q', to: 'metric-margin' },
  ],
};

const SEED_AUDIT_LOGS: string[] = [
  `[${new Date(Date.now() - 2 * 60000).toLocaleTimeString()}] Priyanshi (Admin): Opened XAI reasoning on D-0001 (Q3 Revenue).`,
  `[${new Date(Date.now() - 11 * 60000).toLocaleTimeString()}] Priyanshi (Admin): Confirmed D-0002 (GPU Pricing Overcharge) — routed to vendor remediation.`,
  `[${new Date(Date.now() - 38 * 60000).toLocaleTimeString()}] System: XAI engine auto-flagged D-0011 (MSA Ceiling) at 93% confidence.`,
  `[${new Date(Date.now() - 72 * 60000).toLocaleTimeString()}] Priyanshi (Auditor): Dismissed D-0004 (Rack Install) as Timing Difference.`,
  `[${new Date(Date.now() - 3 * 3600000).toLocaleTimeString()}] System: Parsed 8 documents (PDF/XLSX/CSV/DOCX/JSON) — 14 discrepancies detected.`,
];

const SEED_DATASET: AuditDataset = {
  documents: SEED_DOCS,
  discrepancies: SEED_DISCREPANCIES,
  metrics: SEED_METRICS,
  graph: SEED_GRAPH,
};

const SEED_CLAIMS: Claim[] = buildExtractedClaims(SEED_DISCREPANCIES);

function buildExtractedClaims(discrepancies: MatchedDiscrepancy[]): Claim[] {
  return discrepancies.map((discrepancy) => ({
    entity: discrepancy.documentKinds[0] === 'Purchase Order' || discrepancy.documentKinds[0] === 'Invoice' ? 'Nexus Semiconductor' : 'OmniVise Holdings',
    metric: discrepancy.field,
    value: typeof discrepancy.poValue === 'number' ? discrepancy.poValue : parseFloat(String(discrepancy.poValue).replace(/[^0-9.]/g, '')) || 0,
    unit: discrepancy.field.toLowerCase().includes('margin') || discrepancy.field.toLowerCase().includes('%') || discrepancy.field.toLowerCase().includes('pp') ? 'percent' : 'USD',
    period: discrepancy.reportingPeriod || 'Q3 FY2026',
    sourceDoc: discrepancy.documentKinds[0],
    pageTimestamp: discrepancy.executiveClaimSource || discrepancy.documents[0],
    speaker: discrepancy.executiveClaim ? 'Executive Management' : 'Procurement / Finance',
  }));
}

type ViewTab =
  | 'overview' | 'monitor' | 'documents' | 'claims' | 'discrepancies' | 'graph' | 'reports' | 'settings' | 'help';

interface AuditDataState {
  ingestedDocs: ParsedDocument[];
  extractedClaims: Claim[];
  discrepanciesCount: number;
}

const COMPANY_OPTIONS: Array<'Company A' | 'Company B'> = ['Company A', 'Company B'];

export default function OmniViseDashboard({ defaultAuthenticated = false }: { defaultAuthenticated?: boolean } = {}) {
  const [isAuthenticated, setIsAuthenticated] = useState(defaultAuthenticated);
  const [email, setEmail] = useState('priyanshi@omnivise.ai');
  const [password, setPassword] = useState('••••••••••••');
  const [selectedRole, setSelectedRole] = useState<UserRole>('Admin');

  const [activeTab, setActiveTab] = useState<ViewTab>('overview');
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [piiRedacted, setPiiRedacted] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<'Company A' | 'Company B'>('Company A');
  const [auditData, setAuditData] = useState<AuditDataState>({
    ingestedDocs: SEED_DOCS,
    extractedClaims: SEED_CLAIMS,
    discrepanciesCount: SEED_DISCREPANCIES.length,
  });

  const [selectedDiscrepancy, setSelectedDiscrepancy] = useState<MatchedDiscrepancy | null>(null);
  const [auditLogs, setAuditLogs] = useState<string[]>(SEED_AUDIT_LOGS);
  const [dataset, setDataset] = useState<AuditDataset>(SEED_DATASET);
  const [actionToast, setActionToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [dismissalTarget, setDismissalTarget] = useState<string | null>(null);
  const [dismissalReason, setDismissalReason] = useState('');

  useEffect(() => {
    const hasAuthToken = typeof window !== 'undefined' && (
      Boolean(localStorage.getItem('omnivise_token')) ||
      document.cookie.includes('auth_token=')
    );
    if (hasAuthToken || defaultAuthenticated) {
      setIsAuthenticated(true);
    }
    const storedRole = typeof window !== 'undefined' && (
      localStorage.getItem('omnivise_selected_role') ||
      sessionStorage.getItem('omnivise_selected_role')
    );
    if (storedRole) {
      const normalized = storedRole.charAt(0).toUpperCase() + storedRole.slice(1).toLowerCase();
      if (['Admin', 'Auditor', 'Viewer', 'Analyst', 'Reviewer', 'Executive'].includes(normalized)) {
        setSelectedRole(normalized as UserRole);
      }
    }
    const storedUser = typeof window !== 'undefined' && localStorage.getItem('omnivise_user');
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        if (parsed.email) setEmail(parsed.email);
      } catch {
        // ignore
      }
    }
  }, [defaultAuthenticated]);

  const handleSignOut = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // ignore
    }
    if (typeof window !== 'undefined') {
      localStorage.removeItem('omnivise_token');
      localStorage.removeItem('omnivise_user');
    }
    setIsAuthenticated(false);
  };

  const mergeAuditDataset = (nextDataset: AuditDataset) => {
    const mergedDocs = nextDataset.documents.length > 0 ? nextDataset.documents : dataset.documents;
    const mergedDiscrepancies = nextDataset.discrepancies.length > 0 ? nextDataset.discrepancies : dataset.discrepancies;
    const mergedGraph = nextDataset.graph.nodes.length > 0 || nextDataset.graph.edges.length > 0 ? nextDataset.graph : dataset.graph;
    const derivedMetrics: ParsedDashboardMetrics = {
      totalAudited: mergedDocs.reduce((s, d) => s + (d.totalAmount || 0), 0) + 43_200_000,
      totalAuditedFormatted: `$${((mergedDocs.reduce((s, d) => s + (d.totalAmount || 0), 0) + 43_200_000) / 1_000_000).toFixed(1)}M`,
      flaggedVariance: mergedDiscrepancies.reduce((s, d) => s + Math.abs(typeof d.delta === 'number' ? d.delta : parseFloat(String(d.delta).replace(/[^0-9.\-]/g, '')) || 0), 0),
      flaggedVarianceFormatted: `$${(mergedDiscrepancies.reduce((s, d) => s + Math.abs(typeof d.delta === 'number' ? d.delta : parseFloat(String(d.delta).replace(/[^0-9.\-]/g, '')) || 0), 0) / 1_000_000).toFixed(2)}M`,
      averageConfidence: mergedDiscrepancies.length ? Math.round(mergedDiscrepancies.reduce((s, d) => s + d.confidence, 0) / mergedDiscrepancies.length * 100) : 0,
      documentsCount: mergedDocs.length,
      discrepanciesCount: mergedDiscrepancies.length,
      criticalCount: mergedDiscrepancies.filter((d) => d.severity === 'Critical').length,
    };
    const mergedDataset: AuditDataset = {
      documents: mergedDocs,
      discrepancies: mergedDiscrepancies,
      metrics: derivedMetrics,
      graph: mergedGraph,
    };
    setDataset(mergedDataset);
    setAuditData({
      ingestedDocs: mergedDocs,
      extractedClaims: buildExtractedClaims(mergedDiscrepancies),
      discrepanciesCount: mergedDiscrepancies.length,
    });
    const now = new Date().toLocaleTimeString();
    setAuditLogs((previous) => [
      `[${now}] System: Ingested ${nextDataset.documents.length || 0} document(s) — ${nextDataset.discrepancies.length || 0} new/updated discrepancies.`,
      ...previous,
    ].slice(0, 50));
  };

  const metrics = dataset.metrics;
  const documents: ParsedDocument[] = auditData.ingestedDocs;
  const discrepancies: MatchedDiscrepancy[] = dataset.discrepancies.length > 0 ? dataset.discrepancies : SEED_DISCREPANCIES;
  const graphNodes = dataset.graph.nodes.length > 0 ? dataset.graph.nodes : SEED_GRAPH.nodes;
  const graphEdges = dataset.graph.edges.length > 0 ? dataset.graph.edges : SEED_GRAPH.edges;
  const extractedClaims: Claim[] = auditData.extractedClaims;
  const unifiedDataset: AuditDataset = {
    documents,
    discrepancies,
    metrics,
    graph: { nodes: graphNodes, edges: graphEdges },
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthenticated(true);
  };

  const saveAuditAction = (action: string, discrepancyId: string) => {
    if (selectedRole === 'Viewer') return;
    const timestamp = new Date().toLocaleTimeString();
    const entry = `[${timestamp}] Priyanshi (${selectedRole}): ${action} on ${discrepancyId}`;
    setAuditLogs((previousLogs) => [entry, ...previousLogs].slice(0, 50));
    setActionToast(action);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setActionToast(null), 3000);
  };

  const handleAuditAction = (action: string, discrepancyId: string) => {
    if (selectedRole === 'Viewer') return;
    if (action.toLowerCase().includes('dismiss')) {
      setDismissalTarget(discrepancyId);
      setDismissalReason('');
      return;
    }
    saveAuditAction(action, discrepancyId);
  };

  const handleDismissalSave = () => {
    if (!dismissalTarget || !dismissalReason) return;
    saveAuditAction(`Dismiss Discrepancy (${dismissalReason})`, dismissalTarget);
    setDismissalTarget(null);
    setDismissalReason('');
  };

  const handleModalDatasetIngested = (nextDataset: AuditDataset) => {
    mergeAuditDataset(nextDataset);
    setIsUploadOpen(false);
  };

  const handleDocumentInspect = (_document: ParsedDocument) => {
    const now = new Date().toLocaleTimeString();
    setAuditLogs((previous) => [
      `[${now}] Priyanshi (${selectedRole}): Inspected claims from "${_document.filename}".`,
      ...previous,
    ].slice(0, 50));
    setActiveTab('claims');
  };

  useEffect(() => () => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
  }, []);

  const badgeOverride = useMemo(() => ({
    Discrepancies: String(auditData.discrepanciesCount || discrepancies.length || 14),
  }), [auditData.discrepanciesCount, discrepancies.length]);

  const sidebarActiveTab = useMemo(() => {
    const map: Record<ViewTab, string> = {
      overview: 'Overview', monitor: 'Monitor', documents: 'Documents', claims: 'Claims',
      discrepancies: 'Discrepancies', graph: 'Graph', reports: 'Reports', settings: 'Settings', help: 'Help',
    };
    return map[activeTab];
  }, [activeTab]);

  const handleSidebarSetActiveTab = (tab: string) => {
    const map: Record<string, ViewTab> = {
      Overview: 'overview', Monitor: 'monitor', Documents: 'documents', Claims: 'claims',
      Discrepancies: 'discrepancies', Graph: 'graph', Reports: 'reports', Settings: 'settings', Help: 'help',
    };
    const mapped = map[tab];
    if (mapped) setActiveTab(mapped);
  };

  if (!isAuthenticated) {
    return (
      <div className="relative min-h-screen overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_#1e1b4b_0%,_transparent_50%),radial-gradient(ellipse_at_bottom_right,_#064e3b_0%,_transparent_55%)]" />
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-slate-950 to-black" />
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)', backgroundSize: '48px 48px' }} />
        <div className="relative z-10">
          <div className="max-w-7xl mx-auto px-6 pt-14 pb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 via-fuchsia-500 to-emerald-400 flex items-center justify-center font-black text-white text-xl shadow-xl shadow-indigo-500/20">
                  O
                </div>
                <div>
                  <h1 className="font-black text-white text-xl tracking-tight leading-none">OmniVise Enterprise</h1>
                  <p className="text-[11px] text-slate-400 font-bold uppercase tracking-[0.18em] mt-1">Autonomous Audit Intelligence</p>
                </div>
              </div>
              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-[11px] text-slate-300 font-bold">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> SOC2 Type II · FedRAMP Ready
              </div>
            </div>
          </div>

          <div className="relative max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-12 items-center pb-16">
            <div className="space-y-6 scroll-mt-24" id="hero">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-400/20 text-[11px] font-black text-indigo-300 uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" /> XAI 3-Way Match Engine v2.4
              </div>
              <h2 className="text-4xl md:text-5xl font-black tracking-tight text-white leading-[1.05]">
                Every claim. Every number.
                <br />
                <span className="bg-gradient-to-r from-indigo-300 via-fuchsia-300 to-emerald-300 bg-clip-text text-transparent">
                  Explainably aligned.
                </span>
              </h2>
              <p className="text-sm text-slate-400 max-w-xl leading-relaxed font-medium">
                Upload earnings calls, filings, POs, or invoices. OmniVise parses every line item, cross-matches evidence, and surfaces materially-misstated figures before the sign-off meeting — with audit-grade XAI for every finding.
              </p>
              <div className="grid grid-cols-3 gap-3 max-w-lg pt-2">
                <RolePreviewCard role="Admin" accent="from-indigo-500 to-fuchsia-500" description="Full overrides & approvals" active={selectedRole === 'Admin'} onClick={() => setSelectedRole('Admin')} />
                <RolePreviewCard role="Auditor" accent="from-sky-500 to-emerald-500" description="Review & confirm flags" active={selectedRole === 'Auditor'} onClick={() => setSelectedRole('Auditor')} />
                <RolePreviewCard role="Viewer" accent="from-amber-500 to-rose-500" description="Read-only visibility" active={selectedRole === 'Viewer'} onClick={() => setSelectedRole('Viewer')} />
              </div>
              <div className="flex items-center gap-4 text-[11px] text-slate-500 font-bold">
                <span className="inline-flex items-center gap-1.5"><Cpu className="w-3.5 h-3.5 text-indigo-300" /> 128K-ctx claims extractor</span>
                <span className="inline-flex items-center gap-1.5"><LineChart className="w-3.5 h-3.5 text-emerald-300" /> ASC 606 / GAAP aware</span>
                <span className="inline-flex items-center gap-1.5"><Users className="w-3.5 h-3.5 text-fuchsia-300" /> RBAC & sign-off trails</span>
              </div>
            </div>

            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-br from-indigo-500/20 via-fuchsia-500/10 to-emerald-400/10 rounded-[2rem] blur-2xl" />
              <div className="relative">
                <LoginView
                  email={email}
                  setEmail={setEmail}
                  password={password}
                  setPassword={setPassword}
                  selectedRole={selectedRole}
                  setSelectedRole={setSelectedRole}
                  onLogin={handleLogin}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const piiBlurClass = piiRedacted ? 'backdrop-blur-sm select-none blur-[2px] contrast-75' : '';

  return (
    <div className="flex h-screen overflow-hidden bg-[#020617] text-slate-100 font-sans antialiased relative">
      <div className="pointer-events-none absolute inset-0 opacity-[0.025]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(1200px_600px_at_10%_-10%,_rgba(99,102,241,0.15),_transparent_60%),radial-gradient(900px_500px_at_100%_110%,_rgba(16,185,129,0.10),_transparent_60%)]" />
      {piiRedacted && (
        <style jsx global>{`
          .pii-sensitive-value {
            backdrop-filter: blur(4px);
            -webkit-backdrop-filter: blur(4px);
            filter: blur(3px) contrast(0.8);
            user-select: none;
            -webkit-user-select: none;
            pointer-events: none;
          }
        `}</style>
      )}

      <div className="relative z-10 flex h-full w-full">
        <Sidebar
          activeTab={sidebarActiveTab}
          setActiveTab={handleSidebarSetActiveTab}
          selectedRole={selectedRole}
          setSelectedRole={setSelectedRole}
          onSignOut={handleSignOut}
          badgeOverride={badgeOverride}
        />

        <main className="flex-1 flex flex-col overflow-hidden relative min-w-0 pt-16">
          {actionToast && (
            <div
              role="status"
              aria-live="polite"
              className="fixed right-6 top-6 z-[100] flex min-w-64 items-center gap-3 rounded-2xl border border-emerald-400/25 bg-slate-950/85 px-4 py-3 shadow-2xl shadow-black/40 backdrop-blur-2xl"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-emerald-400/25 bg-emerald-500/15 text-emerald-300">
                <CheckCircle2 className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-black text-white">Action Saved</p>
                <p className="mt-0.5 text-[10px] font-semibold text-slate-400">{actionToast}</p>
              </div>
            </div>
          )}
          {dismissalTarget && (
            <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
              <div role="dialog" aria-modal="true" aria-labelledby="dismissal-title" className="w-full max-w-sm rounded-2xl border border-white/10 bg-slate-900/95 p-5 shadow-2xl shadow-black/50 backdrop-blur-2xl">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-300/80">Dismiss alert</p>
                    <h2 id="dismissal-title" className="mt-1 text-base font-black text-white">Why is this a false discrepancy?</h2>
                  </div>
                  <button type="button" onClick={() => setDismissalTarget(null)} className="rounded-lg p-1.5 text-slate-500 hover:bg-white/10 hover:text-white" aria-label="Close dismissal dialog">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <label htmlFor="dismissal-reason" className="mt-5 block text-xs font-bold text-slate-400">Reason</label>
                <select id="dismissal-reason" value={dismissalReason} onChange={(event) => setDismissalReason(event.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2.5 text-xs text-slate-200 outline-none focus:border-indigo-400/50">
                  <option value="" disabled>Select a reason</option>
                  <option>Different Reporting Period</option>
                  <option>Timing Difference</option>
                  <option>False Positive</option>
                </select>
                <div className="mt-5 flex justify-end gap-2">
                  <button type="button" onClick={() => setDismissalTarget(null)} className="rounded-xl border border-white/10 px-3 py-2 text-xs font-bold text-slate-400 hover:bg-white/5 hover:text-white">Cancel</button>
                  <button type="button" onClick={handleDismissalSave} disabled={!dismissalReason} className="rounded-xl bg-indigo-500 px-4 py-2 text-xs font-black text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-40">Save</button>
                </div>
              </div>
            </div>
          )}
          {isUploadOpen && (
            <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-md">
              <div role="dialog" aria-modal="true" aria-labelledby="upload-modal-title" className="relative max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-3xl border border-cyan-400/20 bg-slate-950/95 p-4 shadow-2xl shadow-cyan-950/20 backdrop-blur-2xl md:p-6">
                <div className="mb-4 flex items-start justify-between gap-4 px-2">
                  <div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-300/80">Workspace ingestion</p><h2 id="upload-modal-title" className="mt-1 text-lg font-black text-white">Upload Documents</h2></div>
                  <button type="button" onClick={() => setIsUploadOpen(false)} className="rounded-xl border border-white/10 p-2 text-slate-400 transition hover:bg-white/10 hover:text-white" aria-label="Close upload modal"><X className="h-5 w-5" /></button>
                </div>
                <DocumentUploader onDatasetIngested={handleModalDatasetIngested} />
              </div>
            </div>
          )}
          <TopHeader
            selectedRole={selectedRole}
            setSelectedRole={setSelectedRole}
            onUploadTab={() => setIsUploadOpen(true)}
            piiRedacted={piiRedacted}
            onTogglePii={() => setPiiRedacted((value) => !value)}
            selectedCompany={selectedCompany}
            setSelectedCompany={(company) => {
              setSelectedCompany(company);
            }}
          />

          <div className={`flex-1 overflow-y-auto px-6 py-6 w-full space-y-6 ${piiRedacted ? 'backdrop-blur-sm' : ''}`}>
            <div className="w-full space-y-6">
              {activeTab === 'monitor' ? <MonitorView /> :
                activeTab === 'documents' ? <DocumentsManager documents={documents} onInspectClaims={handleDocumentInspect} /> :
                activeTab === 'claims' ? <ClaimsManager claims={extractedClaims} /> :
                activeTab === 'discrepancies' ? <DiscrepanciesView discrepancies={discrepancies} selectedRole={selectedRole} onSelect={setSelectedDiscrepancy} onAction={handleAuditAction} /> :
                activeTab === 'graph' ? <KnowledgeGraphView /> :
                activeTab === 'reports' ? <ReportsView dataset={unifiedDataset} discrepancies={discrepancies} /> :
                activeTab === 'settings' ? <SettingsView onSignOut={() => setIsAuthenticated(false)} /> :
                activeTab === 'help' ? <HelpView onNavigate={setActiveTab} /> : <>
              <section className="rounded-2xl border border-white/10 bg-slate-950/50 px-5 py-4 shadow-xl backdrop-blur-xl">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-300/80">Executive workspace</p>
                <h1 className="mt-1 text-2xl font-black tracking-tight text-white">Hello, Priyanshi.</h1>
                <p className="mt-1 text-xs text-slate-400">Here&apos;s what matters across your active audit workspace.</p>
              </section>
              <section id="ingest" className="scroll-mt-24">
                <SectionHeader
                  kicker="Step 01 — Ingest"
                  title="Upload documents & load enterprise samples"
                  subtitle="Drag & drop PDF / XLSX / CSV or pick a curated sample. Parsed metadata, line items, and variance flags flow live into every dashboard widget."
                />
                <DocumentUploader onDatasetIngested={mergeAuditDataset} />
              </section>

              <section id="metrics" className="scroll-mt-24">
                <SectionHeader
                  kicker="Step 02 — Overview Metrics"
                  title="Executive audit pulse"
                  subtitle="Cards update instantly as documents finish parsing. Click flagged discrepancies to open the XAI reasoning drawer."
                />
                <ExecutiveRiskSummary discrepancies={discrepancies.length > 0 ? discrepancies : FALLBACK_DISCREPANCIES} />
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                  <MetricCard
                    label="Total Audited"
                    value={metrics.totalAuditedFormatted || '$0'}
                    sub={`${metrics.documentsCount || 0} document${metrics.documentsCount === 1 ? '' : 's'} staged`}
                    icon={<FileCheck2 className="w-4 h-4" />}
                    accent="from-indigo-500/30 via-indigo-500/10 to-transparent"
                    accentText="text-indigo-300"
                    iconBg="bg-indigo-500/15 text-indigo-300 border-indigo-400/20"
                    valueClassName={piiBlurClass}
                  />
                  <MetricCard
                    label="Flagged Variance"
                    value={metrics.flaggedVarianceFormatted || '$0'}
                    sub={`${metrics.discrepanciesCount || 0} discrepancy flags`}
                    icon={<TrendingDown className="w-4 h-4" />}
                    accent="from-rose-500/30 via-rose-500/10 to-transparent"
                    accentText="text-rose-300"
                    iconBg="bg-rose-500/15 text-rose-300 border-rose-400/20"
                    delta={metrics.flaggedVariance > 0 ? `+${Math.round((metrics.flaggedVariance / (metrics.totalAudited || 1)) * 10000) / 100}%` : undefined}
                    deltaColor="text-rose-300"
                    valueClassName={piiBlurClass}
                  />
                  <MetricCard
                    label="Avg Confidence Score"
                    value={metrics.averageConfidence ? `${metrics.averageConfidence}%` : '—'}
                    sub={metrics.averageConfidence ? 'XAI match engine' : 'Upload documents to score'}
                    icon={<Gauge className="w-4 h-4" />}
                    accent="from-emerald-500/30 via-emerald-500/10 to-transparent"
                    accentText="text-emerald-300"
                    iconBg="bg-emerald-500/15 text-emerald-300 border-emerald-400/20"
                    valueClassName={piiBlurClass}
                  />
                  <MetricCard
                    label="Critical Findings"
                    value={String(metrics.criticalCount || 0)}
                    sub={metrics.criticalCount ? 'Requires sign-off' : 'Zero critical flags — nice.'}
                    icon={<AlertTriangle className="w-4 h-4" />}
                    accent="from-amber-500/30 via-amber-500/10 to-transparent"
                    accentText="text-amber-300"
                    iconBg="bg-amber-500/15 text-amber-300 border-amber-400/20"
                    valueClassName={piiBlurClass}
                  />
                </div>
              </section>

              <section id="discrepancies" className="scroll-mt-24 grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div className="xl:col-span-2">
                  <div className="flex items-end justify-between gap-4">
                    <SectionHeader
                      kicker="Step 03 — Discrepancies"
                      title="Flagged discrepancies log"
                      subtitle="Every row is clickable — the XAI drawer surfaces field-level root cause, evidence trail, and affected line items."
                    />
                    <ExportReportMenu dataset={dataset} discrepancies={discrepancies} />
                  </div>
                  <DiscrepanciesTable
                    discrepancies={discrepancies}
                    onOpenXAI={setSelectedDiscrepancy}
                  />
                </div>
                <div className="xl:col-span-1 space-y-6">
                  <SectionHeader
                    kicker="Live"
                    title="Audit sign-off trail"
                    subtitle="Actions taken under Admin / Auditor credentials are immutably time-stamped."
                  />
                  <TrailPanel logs={auditLogs} role={selectedRole} discrepancyCount={discrepancies.length} />
                  <SectionHeader
                    kicker="Role Matrix"
                    title="Permission preview"
                    subtitle="Switch role in the sidebar to preview visibility gating."
                  />
                  <RoleMatrixPanel role={selectedRole} />
                </div>
              </section>

              <section id="graph" className="scroll-mt-24">
                <SectionHeader
                  kicker="Step 04 — Knowledge Graph"
                  title="Trace evidence from entity to discrepancy"
                  subtitle="Nodes represent entities, documents, vendors, metrics, and discrepancy flags. Hover to focus the relation path; click any red node to open XAI."
                />
                <LegacyKnowledgeGraph
                  nodes={graphNodes}
                  edges={graphEdges}
                  discrepancies={discrepancies}
                  onSelectDiscrepancy={setSelectedDiscrepancy}
                />
              </section>

              <section id="modules" className="scroll-mt-24 pb-8">
                <SectionHeader
                  kicker="Step 05 — Modules"
                  title="Monitor, Settings & Help"
                  subtitle="Use sidebar navigation or click below to jump to a module. Each module inherits the same role-gating, audit trail, and XAI primitives."
                />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <ModuleCard title="Monitor" desc="Live ingestion feed, claim extraction heartbeat, and new-alert notifications." icon={<Eye className="w-4 h-4" />} active={false} onClick={() => setActiveTab('monitor')} />
                  <ModuleCard title="Settings" desc="RBAC roles, ASC 606 policy toggles, integrations & API credentials." icon={<ShieldCheck className="w-4 h-4" />} active={false} onClick={() => setActiveTab('settings')} />
                  <ModuleCard title="Help" desc="Methodology paper, SOC2 report, audit-ready control matrix, and 24/7 concierge." icon={<Award className="w-4 h-4" />} active={false} onClick={() => setActiveTab('help')} />
                </div>
              </section>

              <section id="system-status" className="scroll-mt-24 pb-8">
                <SectionHeader
                  kicker="System"
                  title="System Status"
                  subtitle="Core intelligence services are connected and ready for audit workloads."
                />
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  {['OCR Engine: Operational', 'Knowledge Graph API: Operational', 'XAI Reasoner: Operational'].map((status) => (
                    <div key={status} className="flex items-center gap-3 rounded-2xl border border-emerald-400/15 bg-emerald-500/[0.04] px-4 py-4 shadow-lg shadow-emerald-950/10">
                      <span className="relative flex h-2.5 w-2.5 shrink-0">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.8)]" />
                      </span>
                      <span className="text-xs font-bold text-emerald-200">{status}</span>
                    </div>
                  ))}
                </div>
              </section>
              </>}
            </div>
          </div>

          <XAIDrawer
            discrepancy={selectedDiscrepancy as XAIDiscrepancy | null}
            documents={documents}
            onClose={() => setSelectedDiscrepancy(null)}
            selectedRole={selectedRole}
            onAuditAction={handleAuditAction}
          />
        </main>
      </div>
    </div>
  );
}

function TopHeader({ selectedRole, setSelectedRole, onUploadTab, piiRedacted, onTogglePii, selectedCompany, setSelectedCompany }: { selectedRole: UserRole; setSelectedRole: (role: UserRole) => void; onUploadTab: () => void; piiRedacted: boolean; onTogglePii: () => void; selectedCompany: 'Company A' | 'Company B'; setSelectedCompany: (company: 'Company A' | 'Company B') => void }) {
  const activeRoleLabel = selectedRole === 'Admin' ? 'Lead Auditor (Admin)' : selectedRole;
  const companyDisplayMap: Record<'Company A' | 'Company B', string> = {
    'Company A': 'Company A — OmniVise Holdings',
    'Company B': 'Company B — Nexus Semiconductor',
  };

  return (
          <header className="fixed top-0 left-64 right-0 z-40 w-auto flex items-center justify-between gap-4 px-6 py-3 bg-slate-950/80 backdrop-blur border-b border-white/10 shrink-0">
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-indigo-400/30 to-transparent" />
      <div>
        <p className="text-[11px] text-slate-400 font-normal">Active session under <span className="text-slate-200 font-bold">{selectedRole}</span> permission matrix · <span className="text-indigo-300 font-bold">{companyDisplayMap[selectedCompany]}</span></p>
      </div>
      <div className="flex items-center gap-3">
        <div className="hidden items-center gap-2 rounded-xl border border-indigo-400/20 bg-indigo-500/10 px-2.5 py-1.5 lg:flex">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 text-white">
            <ShieldCheck className="h-3.5 w-3.5" />
          </div>
          <div className="min-w-0">
            <p className="text-[9px] font-black uppercase tracking-wider text-indigo-400">Company</p>
            <select
              value={selectedCompany}
              onChange={(event) => setSelectedCompany(event.target.value as 'Company A' | 'Company B')}
              aria-label={`Selected Company: ${companyDisplayMap[selectedCompany]}`}
              className="max-w-52 cursor-pointer appearance-none bg-transparent pr-1 text-[11px] font-black text-slate-100 outline-none"
            >
              {COMPANY_OPTIONS.map((company) => (
                <option key={company} value={company} className="bg-slate-900">{companyDisplayMap[company]}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="hidden items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-2.5 py-1.5 lg:flex">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-white">
            <User className="h-3.5 w-3.5" />
          </div>
          <div className="min-w-0">
            <p className="text-[9px] font-black uppercase tracking-wider text-slate-500">Active Role</p>
            <select
              value={selectedRole}
              onChange={(event) => setSelectedRole(event.target.value as UserRole)}
              aria-label={`Active Role: ${activeRoleLabel}`}
              className="max-w-40 cursor-pointer appearance-none bg-transparent pr-1 text-[11px] font-black text-slate-100 outline-none"
            >
              <option value="Admin" className="bg-slate-900">Lead Auditor (Admin)</option>
              <option value="Auditor" className="bg-slate-900">Auditor</option>
              <option value="Analyst" className="bg-slate-900">Analyst</option>
              <option value="Viewer" className="bg-slate-900">Viewer</option>
            </select>
          </div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={piiRedacted}
          onClick={onTogglePii}
          className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-[10px] font-black transition-all ${piiRedacted ? 'border-amber-400/35 bg-amber-500/15 text-amber-200' : 'border-white/10 bg-white/[0.03] text-slate-400 hover:border-white/20 hover:text-white'}`}
        >
          {piiRedacted ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          Redact PII{piiRedacted ? ' · ON' : ''}
        </button>
        <div className="relative hidden lg:block">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
          <input
            type="text"
            placeholder="Search claims, metrics, files…"
            className="pl-9 pr-4 py-2 bg-white/[0.03] border border-white/10 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400/30 w-80 text-slate-200 placeholder-slate-500"
          />
        </div>
        <button className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/5 relative">
          <Bell className="w-4 h-4" />
          <span className="w-2 h-2 bg-rose-500 rounded-full absolute top-1.5 right-1.5 ring-2 ring-slate-950" />
        </button>
        <button
          onClick={onUploadTab}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-emerald-400 text-white font-black text-xs shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 hover:brightness-110 flex items-center gap-2 transition-all"
        >
          <Upload className="w-3.5 h-3.5" /> Upload Documents
        </button>
      </div>
    </header>
  );
}

function SectionHeader({ kicker, title, subtitle }: { kicker: string; title: string; subtitle?: string }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div className="min-w-0">
        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/[0.03] border border-white/5 text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 mb-2">
          {kicker}
        </div>
        <h3 className="text-lg md:text-xl font-black text-white tracking-tight leading-tight">{title}</h3>
        {subtitle && <p className="text-xs text-slate-400 mt-1 max-w-3xl">{subtitle}</p>}
      </div>
    </div>
  );
}

function ExportReportMenu({ dataset, discrepancies }: { dataset: AuditDataset; discrepancies: MatchedDiscrepancy[] }) {
  const [open, setOpen] = useState(false);
  const exportRows = discrepancies.length > 0 ? discrepancies : FALLBACK_DISCREPANCIES;
  const exportDataset: AuditDataset = { ...dataset, discrepancies: exportRows };
  const exportSettings: SettingsState = {
    privacyMode: true,
    voiceAudio: false,
    watermark: false,
    materialityThreshold: 10000,
    accountingStandard: 'ASC 606',
  };

  const handleExport = (format: 'pdf' | 'csv' | 'json') => {
    const timestamp = new Date().toISOString();
    const date = timestamp.slice(0, 10);
    if (format === 'pdf') {
      triggerDownload(exportPDF(exportDataset, exportSettings, timestamp), `omnivise-audit-report-${date}.pdf`);
    } else if (format === 'csv') {
      triggerDownload(exportCSV(exportRows), `omnivise-discrepancies-${date}.csv`);
    } else {
      triggerDownload(exportJSON(exportDataset), `omnivise-audit-state-${date}.json`);
    }
    setOpen(false);
  };

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="inline-flex items-center gap-2 rounded-xl border border-indigo-400/25 bg-indigo-500/10 px-3 py-2 text-xs font-black text-indigo-200 transition hover:border-indigo-400/45 hover:bg-indigo-500/20"
      >
        <Download className="h-3.5 w-3.5" /> Export Report
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-full z-30 mt-2 w-44 overflow-hidden rounded-xl border border-white/10 bg-slate-950/95 p-1.5 shadow-2xl shadow-black/40 backdrop-blur-2xl">
          {([
            ['pdf', 'Export as PDF'],
            ['csv', 'Export as CSV'],
            ['json', 'Export as JSON'],
          ] as const).map(([format, label]) => (
            <button key={format} type="button" role="menuitem" onClick={() => handleExport(format)} className="block w-full rounded-lg px-3 py-2 text-left text-xs font-bold text-slate-300 transition hover:bg-white/10 hover:text-white">
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function MetricCard({
  label, value, sub, icon, accent, accentText, iconBg, delta, deltaColor, valueClassName,
}: {
  label: string; value: string; sub: string; icon: React.ReactNode;
  accent: string; accentText: string; iconBg: string;
  delta?: string; deltaColor?: string; valueClassName?: string;
}) {
  return (
    <div className="relative rounded-2xl border border-white/10 bg-slate-950/60 backdrop-blur-xl p-5 overflow-hidden group hover:border-white/15 transition-all">
      <div className={`absolute inset-0 bg-gradient-to-br ${accent} opacity-70 group-hover:opacity-100 transition-opacity pointer-events-none`} />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      <div className="relative">
        <div className="flex items-start justify-between">
          <div className={`w-9 h-9 rounded-xl border flex items-center justify-center ${iconBg}`}>{icon}</div>
          {delta && <span className={`text-[10px] font-black ${deltaColor || 'text-slate-400'}`}>{delta}</span>}
        </div>
        <p className="mt-4 text-[10.5px] font-black uppercase tracking-[0.12em] text-slate-400">{label}</p>
        <div className="flex items-baseline gap-2 mt-1">
          <p className={`text-3xl font-black tracking-tight ${accentText} ${valueClassName || ''}`}>{value}</p>
        </div>
        <p className="text-[11px] text-slate-400 mt-1 font-medium">{sub}</p>
      </div>
    </div>
  );
}

function DiscrepanciesTable({ discrepancies, onOpenXAI }: { discrepancies: MatchedDiscrepancy[]; onOpenXAI: (d: MatchedDiscrepancy) => void }) {
  const [activeSeverity, setActiveSeverity] = useState<'ALL' | 'HIGH' | 'MEDIUM' | 'LOW'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const rows = discrepancies.length > 0 ? discrepancies : FALLBACK_DISCREPANCIES;
  const filteredRows = rows.filter((discrepancy) => {
    const query = searchQuery.trim().toLowerCase();
    const searchableText = [
      discrepancy.field,
      discrepancy.accountingCategory,
      discrepancy.documentKinds.join(' '),
      discrepancy.documents.join(' '),
      discrepancy.executiveClaim,
      discrepancy.auditEvidence,
    ].join(' ').toLowerCase();
    const matchesSearch = query.length === 0 || searchableText.includes(query);
    if (!matchesSearch) return false;
    if (activeSeverity === 'ALL') return true;
    if (activeSeverity === 'HIGH') return discrepancy.severity === 'Critical' || discrepancy.severity === 'High';
    return discrepancy.severity === (activeSeverity === 'MEDIUM' ? 'Medium' : 'Low');
  });
  const severityTabs: Array<{ id: typeof activeSeverity; label: string }> = [
    { id: 'ALL', label: 'All' },
    { id: 'HIGH', label: 'High Severity' },
    { id: 'MEDIUM', label: 'Medium Severity' },
    { id: 'LOW', label: 'Low Severity' },
  ];

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/60 backdrop-blur-xl overflow-hidden shadow-xl">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-400/30 to-transparent" />
      <div className="border-b border-white/5 bg-white/[0.02] px-5 py-3">
        <label className="relative block max-w-xl">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search by entity, metric, or source document..."
            aria-label="Search discrepancies by entity, metric, or source document"
            className="w-full rounded-xl border border-white/10 bg-slate-950/70 py-2 pl-9 pr-3 text-xs text-slate-200 outline-none transition placeholder:text-slate-600 focus:border-indigo-400/50 focus:ring-2 focus:ring-indigo-500/10"
          />
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-2 border-b border-white/5 bg-white/[0.02] px-5 py-3">
        {severityTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveSeverity(tab.id)}
            className={`rounded-lg border px-3 py-1.5 text-[10px] font-black transition-all ${
              activeSeverity === tab.id
                ? 'border-indigo-400/40 bg-indigo-500/15 text-indigo-200 shadow-sm shadow-indigo-500/10'
                : 'border-white/10 text-slate-500 hover:border-white/20 hover:bg-white/[0.04] hover:text-slate-200'
            }`}
            aria-pressed={activeSeverity === tab.id}
          >
            {tab.label}
          </button>
        ))}
        <span className="ml-auto font-mono text-[10px] text-slate-600">
          {filteredRows.length} result{filteredRows.length === 1 ? '' : 's'}
        </span>
      </div>
      <table className="w-full text-left text-xs">
        <thead>
          <tr className="border-b border-white/5 text-slate-400 uppercase font-black text-[10px] tracking-wider bg-white/[0.02]">
            <th className="px-5 py-3.5">Field / Metric</th>
            <th className="px-5 py-3.5">Claimed Source</th>
            <th className="px-5 py-3.5">Audited Source</th>
            <th className="px-5 py-3.5">Delta</th>
            <th className="px-5 py-3.5">Severity</th>
            <th className="px-5 py-3.5 text-right">Explainable AI</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5 text-slate-300 font-medium">
          {filteredRows.map((d) => (
            <tr key={d.id} className="hover:bg-white/[0.02] transition-colors">
              <td className="px-5 py-4">
                <div className="flex flex-col gap-0.5">
                  <span className="font-black text-white">{d.field}</span>
                  <span className="text-[10.5px] text-slate-500 font-semibold">Ref {d.id} · {d.accountingCategory}</span>
                </div>
              </td>
              <td className="px-5 py-4">
                <p className="pii-sensitive-value font-bold text-slate-200">{String(d.poValue)}</p>
                <p className="text-[10.5px] text-slate-500">{d.documentKinds[0]}</p>
              </td>
              <td className="px-5 py-4">
                <p className="pii-sensitive-value font-bold text-slate-200">{String(d.invoiceValue)}</p>
                <p className="text-[10.5px] text-slate-500">{d.documentKinds[1]}</p>
              </td>
              <td className="px-5 py-4">
                <p className="font-black text-rose-300">{d.deltaFormatted}</p>
                <p className="text-[10.5px] text-slate-500">Conf {Math.round(d.confidence * 100)}%</p>
              </td>
              <td className="px-5 py-4">
                <SeverityPill severity={d.severity} />
              </td>
              <td className="px-5 py-4 text-right">
                <button
                  onClick={() => onOpenXAI(d)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-emerald-500/15 to-teal-500/10 text-emerald-300 border border-emerald-400/20 text-[10.5px] font-black hover:border-emerald-400/40 hover:from-emerald-500/20 transition-all"
                >
                  <Info className="w-3 h-3" /> View XAI Reasoning
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {filteredRows.length === 0 && (
        <p className="px-5 py-10 text-center text-xs font-semibold text-slate-500">
          No discrepancies match the current search and severity filters.
        </p>
      )}
    </div>
  );
}

const FALLBACK_DISCREPANCIES: MatchedDiscrepancy[] = [
  {
    id: 'D-0000-PLACEHOLDER',
    documents: ['a', 'b'],
    documentKinds: ['Earnings Call', '10-Q Filing'],
    field: 'Q3 FY2026 Revenue (demo)',
    poValue: '$45.0M',
    invoiceValue: '$41.2M',
    delta: '-$3.8M',
    deltaFormatted: '-$3.8M (9.2%)',
    severity: 'Critical',
    confidence: 0.96,
    accountingCategory: 'Load a sample above to enable live data',
    rootCause: 'Upload documents via Step 01 to reveal real reasoning, evidence, and affected line items.',
    executiveClaim: 'Demo data only. Ingest a sample or upload files.',
    auditEvidence: 'XAI drawer will render live content once documents are staged.',
    reportingPeriod: 'Q3 FY2026',
    auditEvidenceSource: '', executiveClaimSource: '',
  },
];

function SeverityPill({ severity }: { severity: MatchedDiscrepancy['severity'] }) {
  const map: Record<MatchedDiscrepancy['severity'], string> = {
    Critical: 'bg-rose-500/15 text-rose-300 border-rose-400/25 ring-rose-400/20',
    High:     'bg-amber-500/15 text-amber-300 border-amber-400/25 ring-amber-400/20',
    Medium:   'bg-sky-500/15 text-sky-300 border-sky-400/25 ring-sky-400/20',
    Low:      'bg-emerald-500/15 text-emerald-300 border-emerald-400/25 ring-emerald-400/20',
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-black border ring-1 ${map[severity]}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${
        severity === 'Critical' ? 'bg-rose-400 animate-pulse' :
        severity === 'High' ? 'bg-amber-400' :
        severity === 'Medium' ? 'bg-sky-400' : 'bg-emerald-400'
      }`} />
      {severity}
    </span>
  );
}

function TrailPanel({ logs, role, discrepancyCount }: { logs: string[]; role: UserRole; discrepancyCount: number }) {
  const display = logs.length > 0 ? logs : FALLBACK_LOGS(discrepancyCount);
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/60 backdrop-blur-xl p-4 shadow-xl h-full">
      <ul className="space-y-2.5">
        {display.map((line, i) => (
          <li key={i} className="flex items-start gap-2.5 text-[11px]">
            <span className="mt-1 w-1.5 h-1.5 rounded-full bg-gradient-to-br from-indigo-400 to-fuchsia-400 shrink-0" />
            <p className="text-slate-300 leading-relaxed font-semibold">{line}</p>
          </li>
        ))}
      </ul>
      {role === 'Viewer' && (
        <p className="mt-3 text-[10.5px] text-amber-300 font-bold inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-500/10 border border-amber-400/20">
          <ShieldCheck className="w-3 h-3" /> Viewer role: write actions are disabled.
        </p>
      )}
    </div>
  );
}

function FALLBACK_LOGS(count: number): string[] {
  const now = new Date();
  const t = (offset: number) => new Date(now.getTime() - offset * 60_000).toLocaleTimeString();
  return [
    `[${t(0)}] System: XAI engine armed — ${count || 14} flags under continuous review.`,
    `[${t(3)}] Groq: Parsed Annual_Report_FY2026.pdf (184 pages) · 6 claims extracted.`,
    `[${t(7)}] Alignment check: Q3 Revenue 9.2% delta between claims and 10-Q.`,
    `[${t(14)}] Priyanshi (Admin): Initialized workspace “OmniVise Holdings FY2026”.`,
  ];
}

function RoleMatrixPanel({ role }: { role: UserRole }) {
  const rows: Array<[string, boolean, boolean, boolean]> = [
    ['Upload documents', true, true, false],
    ['View discrepancies', true, true, true],
    ['Open XAI reasoning', true, true, true],
    ['Confirm discrepancy', true, true, false],
    ['Dismiss as noise', true, true, false],
    ['Manage users / policy', true, false, false],
  ];
  const cols: UserRole[] = ['Admin', 'Auditor', 'Viewer'];
  const activeIndex = cols.indexOf(role);
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/60 backdrop-blur-xl p-4 shadow-xl overflow-hidden">
      <div className="grid grid-cols-[1.25fr_0.6fr_0.6fr_0.6fr] gap-2 text-[10px] font-black uppercase tracking-wider text-slate-500 px-2 pb-2 border-b border-white/5">
        <span>Capability</span>
        {cols.map((c, i) => (
          <span key={c} className={`text-center ${i === activeIndex ? 'text-indigo-300' : ''}`}>{c}</span>
        ))}
      </div>
      <div className="pt-1.5 space-y-1">
        {rows.map(([cap, a, au, v]) => {
          const cell = [a, au, v];
          return (
            <div key={cap} className="grid grid-cols-[1.25fr_0.6fr_0.6fr_0.6fr] gap-2 items-center px-2 py-2 rounded-lg hover:bg-white/[0.02]">
              <span className="text-[11px] font-semibold text-slate-300">{cap}</span>
              {cell.map((ok, i) => (
                <span key={i} className={`flex justify-center text-[11px] ${ok ? 'text-emerald-300' : 'text-slate-600'} ${i === activeIndex ? 'font-black scale-110' : ''}`}>
                  {ok ? <CheckIcon /> : <DashIcon />}
                </span>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CheckIcon() { return <svg viewBox="0 0 16 16" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round"><path d="M3 8.5 6.5 12 13 4.5" /></svg>; }
function DashIcon() { return <svg viewBox="0 0 16 16" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round"><path d="M3 8h10" /></svg>; }

function ModuleCard({ title, desc, icon, active, onClick }: { title: string; desc: string; icon: React.ReactNode; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`text-left rounded-2xl border p-5 relative overflow-hidden transition-all group ${
        active
          ? 'bg-gradient-to-br from-indigo-500/15 to-fuchsia-500/10 border-indigo-400/30 shadow-lg shadow-indigo-500/10'
          : 'bg-slate-950/60 border-white/10 hover:border-white/15 backdrop-blur-xl'
      }`}
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="flex items-start justify-between">
        <div className={`w-10 h-10 rounded-xl border flex items-center justify-center ${active ? 'bg-indigo-500/20 text-indigo-200 border-indigo-400/30' : 'bg-white/5 text-slate-300 border-white/10'}`}>
          {icon}
        </div>
        <ArrowRight className={`w-4 h-4 transition-transform group-hover:translate-x-0.5 ${active ? 'text-indigo-300' : 'text-slate-500'}`} />
      </div>
      <p className={`mt-4 text-sm font-black tracking-tight ${active ? 'text-white' : 'text-slate-100'}`}>{title}</p>
      <p className="text-[11px] text-slate-400 mt-1 leading-relaxed font-medium">{desc}</p>
    </button>
  );
}

function RolePreviewCard({ role, accent, description, active, onClick }: {
  role: UserRole; accent: string; description: string; active: boolean; onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative p-3.5 rounded-2xl border text-left transition-all overflow-hidden group ${
        active ? 'border-white/20 bg-white/[0.06] shadow-lg shadow-black/20' : 'border-white/10 bg-white/[0.02] hover:border-white/15 hover:bg-white/[0.04]'
      }`}
    >
      <div className={`absolute -top-10 -right-10 w-24 h-24 rounded-full bg-gradient-to-br ${accent} blur-2xl opacity-40`} />
      <div className="relative">
        <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${accent} flex items-center justify-center text-white font-black text-sm shadow-lg`}>
          {role.slice(0, 1)}
        </div>
        <p className={`mt-3 text-xs font-black tracking-tight ${active ? 'text-white' : 'text-slate-200'}`}>{role}</p>
        <p className="text-[10px] text-slate-400 mt-0.5 leading-snug font-semibold">{description}</p>
        {active && <p className="mt-2 text-[10px] font-black text-emerald-300 inline-flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Currently selected
        </p>}
      </div>
    </button>
  );
}

function HelpView({ onNavigate }: { onNavigate: (tab: ViewTab) => void }) {
  const sections = [
    { kicker: 'Methodology', title: '3-Way Match XAI Engine', desc: 'OmniVise cross-references executive claims (earnings calls, investor decks) against filed financials (10-Q / 10-K) and source documents (POs, invoices). Every discrepancy ships with a field-level WHAT / WHY / HOW explanation.' },
    { kicker: 'Compliance', title: 'SOC2 Type II · FedRAMP Ready', desc: 'All document ingestion, claim extraction, and audit decisions occur in-tenant with SSO/SCIM, customer-managed keys, and immutable sign-off trails. Control matrix available upon request.' },
    { kicker: 'Accounting', title: 'ASC 606 / IFRS 15 Aware', desc: 'Revenue recognition tests, materiality thresholds, margin decomposition, and period-matching logic are configurable per-entity in Settings.' },
    { kicker: 'Support', title: '24/7 Audit Concierge', desc: 'For material findings or methodology questions, your engagement team is paged via the bell icon in the header. Average first-response is under 12 minutes.' },
  ];
  return (
    <div className="space-y-8">
      <SectionHeader kicker="Help Center" title="Methodology, compliance & getting unstuck" subtitle="Everything an audit partner would ask for — explained in plain language. Click a module below to jump in." />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sections.map((s, i) => (
          <div key={s.title} className="rounded-2xl border border-white/10 bg-slate-950/60 backdrop-blur-xl p-5 relative overflow-hidden group">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-400/30 to-transparent" />
            <div className={`absolute -top-20 -right-20 w-40 h-40 rounded-full blur-3xl opacity-30 ${i % 2 === 0 ? 'bg-indigo-500' : 'bg-emerald-500'}`} />
            <div className="relative">
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/[0.03] border border-white/5 text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 mb-3">{s.kicker}</div>
              <h4 className="text-sm font-black text-white tracking-tight">{s.title}</h4>
              <p className="text-[11px] text-slate-400 mt-2 leading-relaxed font-medium">{s.desc}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ModuleCard title="Overview" desc="Return to the executive dashboard with ingest, metrics, and discrepancy log." icon={<LayoutDashboard className="w-4 h-4" />} active={false} onClick={() => onNavigate('overview')} />
        <ModuleCard title="Monitor" desc="Live ingestion feed and new-alert notifications for your team." icon={<Activity className="w-4 h-4" />} active={false} onClick={() => onNavigate('monitor')} />
        <ModuleCard title="Settings" desc="Adjust materiality threshold, accounting standard, and RBAC." icon={<ShieldCheck className="w-4 h-4" />} active={false} onClick={() => onNavigate('settings')} />
      </div>
    </div>
  );
}
