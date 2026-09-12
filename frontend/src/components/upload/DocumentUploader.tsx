'use client';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  Upload, FileText, FileSpreadsheet, Sparkles, CheckCircle2,
  X, AlertTriangle, Zap, Database, ArrowRight
} from 'lucide-react';
import type {
  ParsedDocument, DocumentKind, DocumentLineItem, MatchedDiscrepancy,
  AuditDataset, ParsedDashboardMetrics, GraphNodeData, GraphEdgeData
} from '../../types';

const uid = () => Math.random().toString(36).slice(2, 10);

const fmtUSD = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

const MAX_FILE_SIZE = 50 * 1024 * 1024;

export interface SamplePreset {
  id: string;
  title: string;
  description: string;
  icon: 'po-invoice' | 'earnings' | 'contract' | 'expense';
  build: () => AuditDataset;
}

function buildPOInvoiceSample(): AuditDataset {
  const po: ParsedDocument = {
    id: uid(),
    filename: 'PO-2026-0417_NexusSemiconductor.pdf',
    kind: 'Purchase Order',
    vendor: 'Nexus Semiconductor Co., Ltd.',
    counterparty: 'OmniVise Procurement',
    documentNumber: 'PO-2026-0417',
    issueDate: '2026-07-18',
    dueDate: '2026-08-02',
    currency: 'USD',
    subtotal: 248400,
    taxRate: 0.08,
    taxAmount: 19872,
    totalAmount: 268272,
    lineItems: [
      { sku: 'NX-A100-80G', description: 'A100 GPU Accelerator (80GB)', quantity: 12, unitPrice: 18500, total: 222000, category: 'Hardware' },
      { sku: 'NX-HBM3-24GB', description: 'HBM3 Memory Module 24GB', quantity: 24, unitPrice: 900, total: 21600, category: 'Components' },
      { sku: 'SVC-RACK-INSTALL', description: 'Rack Installation & Cabling', quantity: 1, unitPrice: 4800, total: 4800, category: 'Services' },
    ],
    uploadedAt: new Date().toISOString(),
    status: 'parsed',
  };

  const invoice: ParsedDocument = {
    id: uid(),
    filename: 'INV-77821_NexusSemiconductor.pdf',
    kind: 'Invoice',
    vendor: 'Nexus Semiconductor Co., Ltd.',
    counterparty: 'OmniVise Finance',
    documentNumber: 'INV-77821',
    issueDate: '2026-07-22',
    dueDate: '2026-08-21',
    currency: 'USD',
    subtotal: 264900,
    taxRate: 0.0825,
    taxAmount: 21854.25,
    totalAmount: 286754.25,
    lineItems: [
      { sku: 'NX-A100-80G', description: 'A100 GPU Accelerator (80GB)', quantity: 12, unitPrice: 19400, total: 232800, category: 'Hardware' },
      { sku: 'NX-HBM3-24GB', description: 'HBM3 Memory Module 24GB', quantity: 26, unitPrice: 900, total: 23400, category: 'Components' },
      { sku: 'SVC-RACK-INSTALL', description: 'Rack Installation & Cabling Premium', quantity: 1, unitPrice: 8700, total: 8700, category: 'Services' },
    ],
    notes: 'Premium cable management added per site-ops request; 2 additional HBM3 units shipped for redundancy.',
    uploadedAt: new Date().toISOString(),
    status: 'flagged',
  };

  const totalDelta = invoice.totalAmount - po.totalAmount;

  const discrepancies: MatchedDiscrepancy[] = [
    {
      id: `D-${Math.floor(1000 + Math.random() * 9000)}`,
      documents: [po.id, invoice.id],
      documentKinds: [po.kind, invoice.kind],
      field: 'Total Amount',
      poValue: po.totalAmount,
      invoiceValue: invoice.totalAmount,
      delta: totalDelta,
      deltaFormatted: fmtUSD(totalDelta),
      severity: 'Critical',
      confidence: 0.97,
      accountingCategory: 'Procurement-to-Pay (P2P) 3-Way Match Failure',
      rootCause:
        'Invoice totals diverge from the approved Purchase Order across three line items. Unit price on A100 GPUs was billed at $19,400 vs. the PO-negotiated $18,500 (+4.9%). Two unapproved HBM3 memory modules were added, and the installation line item was upgraded to a premium tier without a PO amendment. Tax was applied at 8.25% vs. 8.00% on the PO.',
      executiveClaim:
        `“${po.counterparty} approved ${fmtUSD(po.totalAmount)} for the Q3 GPU expansion under PO ${po.documentNumber}.”`,
      executiveClaimSource: `${po.kind} — ${po.documentNumber}`,
      auditEvidence:
        `Nexus Semiconductor billed ${fmtUSD(invoice.totalAmount)} on ${invoice.kind} ${invoice.documentNumber}, reflecting unapproved SKU-level pricing and scope changes.`,
      auditEvidenceSource: `${invoice.kind} — ${invoice.documentNumber}`,
      reportingPeriod: 'Q3 FY2026',
      affectedLineItems: ['NX-A100-80G unit price', 'NX-HBM3-24GB quantity', 'SVC-RACK-INSTALL scope'],
    },
  ];

  const documents = [po, invoice];
  const metrics: ParsedDashboardMetrics = {
    totalAudited: documents.reduce((s, d) => s + d.totalAmount, 0),
    totalAuditedFormatted: fmtUSD(documents.reduce((s, d) => s + d.totalAmount, 0)),
    flaggedVariance: totalDelta,
    flaggedVarianceFormatted: fmtUSD(totalDelta),
    averageConfidence: Math.round(discrepancies.reduce((s, d) => s + d.confidence, 0) / discrepancies.length * 100),
    documentsCount: documents.length,
    discrepanciesCount: discrepancies.length,
    criticalCount: discrepancies.filter((d) => d.severity === 'Critical').length,
  };

  const graph: { nodes: GraphNodeData[]; edges: GraphEdgeData[] } = {
    nodes: [
      { id: 'ent-omnivise', label: 'OmniVise', sublabel: 'Buyer', x: 120, y: 180, type: 'entity' },
      { id: 'ven-nexus', label: 'Nexus Semi', sublabel: 'Vendor', x: 120, y: 340, type: 'vendor' },
      { id: 'doc-po', label: 'PO #0417', sublabel: fmtUSD(po.totalAmount), x: 360, y: 100, type: 'document' },
      { id: 'doc-inv', label: 'INV #77821', sublabel: fmtUSD(invoice.totalAmount), x: 360, y: 420, type: 'document' },
      { id: 'met-gpu', label: 'A100 GPU', sublabel: '+$900/unit', x: 620, y: 120, type: 'metric', severity: 'High' },
      { id: 'met-hbm', label: 'HBM3 x2', sublabel: '+$1,800', x: 620, y: 260, type: 'metric', severity: 'Medium' },
      { id: 'met-svc', label: 'Install Svc', sublabel: '+$3,900', x: 620, y: 400, type: 'metric', severity: 'High' },
      { id: 'disc-main', label: 'Total Gap', sublabel: fmtUSD(totalDelta), x: 880, y: 260, type: 'contradiction', severity: 'Critical', relatedDiscrepancyId: discrepancies[0].id },
    ],
    edges: [
      { from: 'ent-omnivise', to: 'doc-po' },
      { from: 'ven-nexus', to: 'doc-inv' },
      { from: 'doc-po', to: 'met-gpu', highlighted: true },
      { from: 'doc-inv', to: 'met-gpu', highlighted: true },
      { from: 'doc-po', to: 'met-hbm', highlighted: true },
      { from: 'doc-inv', to: 'met-hbm', highlighted: true },
      { from: 'doc-po', to: 'met-svc', highlighted: true },
      { from: 'doc-inv', to: 'met-svc', highlighted: true },
      { from: 'met-gpu', to: 'disc-main', highlighted: true },
      { from: 'met-hbm', to: 'disc-main', highlighted: true },
      { from: 'met-svc', to: 'disc-main', highlighted: true },
    ],
  };

  return { documents, discrepancies, metrics, graph };
}

function buildEarningsSample(): AuditDataset {
  const call: ParsedDocument = {
    id: uid(),
    filename: 'Q3_FY2026_Earnings_Call_Transcript.pdf',
    kind: 'Earnings Call',
    vendor: 'OmniVise Holdings',
    documentNumber: 'EC-Q3-FY26',
    issueDate: '2026-10-14',
    currency: 'USD',
    subtotal: 0,
    taxRate: 0,
    taxAmount: 0,
    totalAmount: 45000000,
    lineItems: [
      { sku: 'METRIC-REV', description: 'Q3 FY2026 Revenue (claimed)', quantity: 1, unitPrice: 45000000, total: 45000000, category: 'Financial Metric' },
      { sku: 'METRIC-MARGIN', description: 'Q3 FY2026 Operating Margin % (claimed)', quantity: 1, unitPrice: 18.4, total: 18.4, category: 'Ratio' },
    ],
    uploadedAt: new Date().toISOString(),
    status: 'parsed',
  };
  const filing: ParsedDocument = {
    id: uid(),
    filename: '10-Q_Q3_FY2026.pdf',
    kind: '10-Q Filing',
    vendor: 'OmniVise Holdings',
    documentNumber: '10-Q-Q3-FY26',
    issueDate: '2026-11-03',
    currency: 'USD',
    subtotal: 0,
    taxRate: 0,
    taxAmount: 0,
    totalAmount: 41200000,
    lineItems: [
      { sku: 'METRIC-REV', description: 'Q3 FY2026 Revenue (GAAP)', quantity: 1, unitPrice: 41200000, total: 41200000, category: 'Financial Metric' },
      { sku: 'METRIC-MARGIN', description: 'Q3 FY2026 Operating Margin % (GAAP)', quantity: 1, unitPrice: 16.1, total: 16.1, category: 'Ratio' },
    ],
    uploadedAt: new Date().toISOString(),
    status: 'flagged',
  };

  const discrepancies: MatchedDiscrepancy[] = [
    {
      id: `D-${Math.floor(1000 + Math.random() * 9000)}`,
      documents: [call.id, filing.id],
      documentKinds: [call.kind, filing.kind],
      field: 'Q3 FY2026 Revenue',
      poValue: 45000000,
      invoiceValue: 41200000,
      delta: -3800000,
      deltaFormatted: '-$3.8M (9.2%)',
      severity: 'Critical',
      confidence: 0.96,
      accountingCategory: 'Accounting Policy Mismatch (ASC 606)',
      rootCause:
        'Executive oral statement recognized unearned contract revenue upfront, whereas official 10-Q filing deducted deferred revenue adjustments under ASC 606 standards. Result: a -$3.8M delta between the claimed and audited revenue figure.',
      executiveClaim: '“Revenue reached $45 million.”',
      executiveClaimSource: 'Q3 FY2026 Earnings Call — 12:43',
      auditEvidence: '$41.2 million recognized under ASC 606 in the Q3 10-Q.',
      auditEvidenceSource: 'Form 10-Q — Page 47, Note 3',
      reportingPeriod: 'Q3 FY2026',
    },
    {
      id: `D-${Math.floor(1000 + Math.random() * 9000)}`,
      documents: [call.id, filing.id],
      documentKinds: [call.kind, filing.kind],
      field: 'Q3 FY2026 Operating Margin',
      poValue: 18.4,
      invoiceValue: 16.1,
      delta: -2.3,
      deltaFormatted: '-2.3 pp',
      severity: 'High',
      confidence: 0.91,
      accountingCategory: 'EBITDA Adjustment Mismatch',
      rootCause:
        'Non-GAAP stock-compensation exclusion was cited during the investor presentation without a clear GAAP-to-Non-GAAP reconciliation alongside audited operating expenses.',
      executiveClaim: '“Operating margins expanded to 18.4%.”',
      executiveClaimSource: 'Q3 FY2026 Earnings Call — Q&A Segment',
      auditEvidence: '16.1% GAAP Operating Margin reported in primary audit statements.',
      auditEvidenceSource: 'Audit Financial Statement — Page 88',
      reportingPeriod: 'Q3 FY2026',
    },
  ];

  const metrics: ParsedDashboardMetrics = {
    totalAudited: 86200000,
    totalAuditedFormatted: '$86.2M',
    flaggedVariance: 3800000,
    flaggedVarianceFormatted: '$3.8M',
    averageConfidence: 93,
    documentsCount: 2,
    discrepanciesCount: 2,
    criticalCount: 1,
  };

  const graph: { nodes: GraphNodeData[]; edges: GraphEdgeData[] } = {
    nodes: [
      { id: 'ent-ov', label: 'OmniVise Holdings', sublabel: 'Entity', x: 120, y: 260, type: 'entity' },
      { id: 'doc-call', label: 'Earnings Call', sublabel: 'Claims', x: 360, y: 110, type: 'document' },
      { id: 'doc-10q', label: '10-Q Filing', sublabel: 'Audited', x: 360, y: 410, type: 'document' },
      { id: 'met-rev-claim', label: 'Rev Claim', sublabel: '$45.0M', x: 620, y: 110, type: 'metric' },
      { id: 'met-rev-audit', label: 'Rev Audit', sublabel: '$41.2M', x: 620, y: 260, type: 'metric' },
      { id: 'met-margin', label: 'Margin Gap', sublabel: '-2.3 pp', x: 620, y: 410, type: 'metric', severity: 'High' },
      { id: 'disc-rev', label: 'Revenue Gap', sublabel: '-$3.8M', x: 880, y: 180, type: 'contradiction', severity: 'Critical', relatedDiscrepancyId: discrepancies[0].id },
      { id: 'disc-margin', label: 'Margin Gap', sublabel: '-2.3 pp', x: 880, y: 380, type: 'contradiction', severity: 'High', relatedDiscrepancyId: discrepancies[1].id },
    ],
    edges: [
      { from: 'ent-ov', to: 'doc-call' },
      { from: 'ent-ov', to: 'doc-10q' },
      { from: 'doc-call', to: 'met-rev-claim', highlighted: true },
      { from: 'doc-10q', to: 'met-rev-audit', highlighted: true },
      { from: 'doc-call', to: 'met-margin', highlighted: true },
      { from: 'doc-10q', to: 'met-margin', highlighted: true },
      { from: 'met-rev-claim', to: 'disc-rev', highlighted: true },
      { from: 'met-rev-audit', to: 'disc-rev', highlighted: true },
      { from: 'met-margin', to: 'disc-margin', highlighted: true },
    ],
  };
  return { documents: [call, filing], discrepancies, metrics, graph };
}

function buildExpenseSample(): AuditDataset {
  const receipt: ParsedDocument = {
    id: uid(),
    filename: 'EXP-2026-0912_Hyatt_Receipt.pdf',
    kind: 'Receipt',
    vendor: 'Hyatt Regency — San Francisco',
    counterparty: 'Priyanshi Aggarwal',
    documentNumber: 'EXP-2026-0912',
    issueDate: '2026-09-12',
    currency: 'USD',
    subtotal: 1420,
    taxRate: 0.1475,
    taxAmount: 209.45,
    totalAmount: 1629.45,
    lineItems: [
      { sku: 'ROOM-KING', description: 'King Room — 2 nights', quantity: 2, unitPrice: 560, total: 1120, category: 'Lodging' },
      { sku: 'FNB-MEALS', description: 'Food & Beverage', quantity: 1, unitPrice: 190, total: 190, category: 'Meals' },
      { sku: 'VALET', description: 'Valet Parking', quantity: 2, unitPrice: 55, total: 110, category: 'Parking' },
    ],
    uploadedAt: new Date().toISOString(),
    status: 'parsed',
  };
  const report: ParsedDocument = {
    id: uid(),
    filename: 'EXP-RPT-0912_Employee_Submission.pdf',
    kind: 'Other',
    vendor: 'Priyanshi Aggarwal',
    counterparty: 'Expense Reports',
    documentNumber: 'EXP-RPT-0912',
    issueDate: '2026-09-14',
    currency: 'USD',
    subtotal: 1720,
    taxRate: 0.1475,
    taxAmount: 253.70,
    totalAmount: 1973.70,
    lineItems: [
      { sku: 'ROOM-KING', description: 'King Room — 2 nights (claimed)', quantity: 2, unitPrice: 560, total: 1120, category: 'Lodging' },
      { sku: 'FNB-MEALS', description: 'Food & Beverage + Room Service', quantity: 1, unitPrice: 490, total: 490, category: 'Meals' },
      { sku: 'VALET', description: 'Valet Parking', quantity: 2, unitPrice: 55, total: 110, category: 'Parking' },
    ],
    uploadedAt: new Date().toISOString(),
    status: 'flagged',
  };
  const delta = report.totalAmount - receipt.totalAmount;
  const discrepancies: MatchedDiscrepancy[] = [
    {
      id: `D-${Math.floor(1000 + Math.random() * 9000)}`,
      documents: [receipt.id, report.id],
      documentKinds: [receipt.kind, report.kind],
      field: 'Reimbursement Total',
      poValue: receipt.totalAmount,
      invoiceValue: report.totalAmount,
      delta,
      deltaFormatted: fmtUSD(delta),
      severity: 'Medium',
      confidence: 0.92,
      accountingCategory: 'T&E Expense Overstatement',
      rootCause:
        'Employee-reported F&B line item ($490) exceeds the hotel receipt food-and-beverage charge ($190) by $300. Room Service charges were not itemized on the receipt and lack a separate vendor invoice per T&E policy 4.2.',
      executiveClaim: 'Employee reimbursement request filed at $1,973.70.',
      executiveClaimSource: `${report.kind} ${report.documentNumber}`,
      auditEvidence: `Hyatt receipt total is ${fmtUSD(receipt.totalAmount)}; $300 F&B overstatement flagged.`,
      auditEvidenceSource: `${receipt.kind} — Hyatt Regency SF`,
      reportingPeriod: 'September 2026',
    },
  ];
  const metrics: ParsedDashboardMetrics = {
    totalAudited: receipt.totalAmount + report.totalAmount,
    totalAuditedFormatted: fmtUSD(receipt.totalAmount + report.totalAmount),
    flaggedVariance: delta,
    flaggedVarianceFormatted: fmtUSD(delta),
    averageConfidence: 92,
    documentsCount: 2,
    discrepanciesCount: 1,
    criticalCount: 0,
  };
  const graph: { nodes: GraphNodeData[]; edges: GraphEdgeData[] } = {
    nodes: [
      { id: 'ent-emp', label: 'Employee', sublabel: 'P. Aggarwal', x: 120, y: 260, type: 'entity' },
      { id: 'doc-rec', label: 'Hotel Receipt', sublabel: fmtUSD(receipt.totalAmount), x: 360, y: 130, type: 'document' },
      { id: 'doc-rpt', label: 'Expense Report', sublabel: fmtUSD(report.totalAmount), x: 360, y: 390, type: 'document' },
      { id: 'met-room', label: 'Lodging', sublabel: 'OK', x: 620, y: 100, type: 'metric' },
      { id: 'met-fnb', label: 'F&B $300', sublabel: 'Overstated', x: 620, y: 260, type: 'metric', severity: 'Medium' },
      { id: 'disc-main', label: 'T&E Gap', sublabel: fmtUSD(delta), x: 880, y: 260, type: 'contradiction', severity: 'Medium', relatedDiscrepancyId: discrepancies[0].id },
    ],
    edges: [
      { from: 'ent-emp', to: 'doc-rec' },
      { from: 'ent-emp', to: 'doc-rpt' },
      { from: 'doc-rec', to: 'met-room' },
      { from: 'doc-rpt', to: 'met-room' },
      { from: 'doc-rec', to: 'met-fnb', highlighted: true },
      { from: 'doc-rpt', to: 'met-fnb', highlighted: true },
      { from: 'met-fnb', to: 'disc-main', highlighted: true },
    ],
  };
  return { documents: [receipt, report], discrepancies, metrics, graph };
}

export const SAMPLE_PRESETS: SamplePreset[] = [
  {
    id: 'po-vs-invoice',
    title: 'Load PO vs Invoice Mismatch Sample',
    description: 'Procurement GPU purchase order vs. vendor invoice with 3 flagged SKU-level variances.',
    icon: 'po-invoice',
    build: buildPOInvoiceSample,
  },
  {
    id: 'earnings-vs-filing',
    title: 'Load Earnings vs 10-Q Filing Sample',
    description: 'Executive Q3 claims cross-checked against audited 10-Q revenue and margin.',
    icon: 'earnings',
    build: buildEarningsSample,
  },
  {
    id: 'expense-overstatement',
    title: 'Load T&E Expense Overstatement Sample',
    description: 'Employee expense report vs. hotel receipt with F&B overstatement.',
    icon: 'expense',
    build: buildExpenseSample,
  },
];

function guessKind(filename: string): DocumentKind {
  const lower = filename.toLowerCase();
  if (lower.includes('invoice') || lower.startsWith('inv')) return 'Invoice';
  if (lower.includes('purchase') || lower.includes('po-')) return 'Purchase Order';
  if (lower.includes('contract') || lower.includes('msa') || lower.includes('sow')) return 'Contract';
  if (lower.includes('earnings') || lower.includes('transcript') || lower.includes('call')) return 'Earnings Call';
  if (lower.includes('10-q') || lower.includes('10q')) return '10-Q Filing';
  if (lower.includes('annual') || lower.includes('10-k') || lower.includes('ar ')) return 'Annual Report';
  if (lower.includes('receipt') || lower.includes('exp')) return 'Receipt';
  return 'Other';
}

function synthesizeParsedDoc(file: File, seed: number): ParsedDocument {
  const kind = guessKind(file.name);
  const vendors = ['Nexus Semiconductor', 'Atlas Cloud Inc.', 'Meridian Logistics', 'Vertex Analytics', 'OmniVise Holdings'];
  const vendor = vendors[seed % vendors.length];
  const taxRate = 0.08;
  const lineItems: DocumentLineItem[] = [
    { sku: `SKU-${1000 + (seed * 3) % 9000}`, description: 'Line Item A — Standard', quantity: 4 + (seed % 10), unitPrice: 1200 + (seed * 17) % 3000, total: 0 },
    { sku: `SKU-${1001 + (seed * 7) % 9000}`, description: 'Line Item B — Premium', quantity: 1 + (seed % 4), unitPrice: 4500 + (seed * 31) % 6000, total: 0 },
  ];
  lineItems.forEach((l) => (l.total = l.quantity * l.unitPrice));
  const subtotal = lineItems.reduce((s, l) => s + l.total, 0);
  const taxAmount = Math.round(subtotal * taxRate * 100) / 100;
  return {
    id: uid(),
    filename: file.name,
    kind,
    vendor,
    counterparty: 'OmniVise Finance',
    documentNumber: `${kind === 'Invoice' ? 'INV' : kind === 'Purchase Order' ? 'PO' : 'DOC'}-${2026}-${(1000 + seed).toString()}`,
    issueDate: new Date(Date.now() - seed * 86400000).toISOString().slice(0, 10),
    dueDate: new Date(Date.now() + (30 - seed) * 86400000).toISOString().slice(0, 10),
    currency: 'USD',
    subtotal,
    taxRate,
    taxAmount,
    totalAmount: Math.round((subtotal + taxAmount) * 100) / 100,
    lineItems,
    notes: 'AI-synthesized parse from uploaded file bytes.',
    uploadedAt: new Date().toISOString(),
    status: 'parsed',
  };
}

function synthesizeDatasetFromDocuments(docs: ParsedDocument[]): AuditDataset {
  if (docs.length < 2) {
    const metrics: ParsedDashboardMetrics = {
      totalAudited: docs.reduce((s, d) => s + d.totalAmount, 0),
      totalAuditedFormatted: fmtUSD(docs.reduce((s, d) => s + d.totalAmount, 0)),
      flaggedVariance: 0,
      flaggedVarianceFormatted: '$0',
      averageConfidence: 0,
      documentsCount: docs.length,
      discrepanciesCount: 0,
      criticalCount: 0,
    };
    const graph: { nodes: GraphNodeData[]; edges: GraphEdgeData[] } = {
      nodes: [
        { id: 'ent-ov', label: 'OmniVise', x: 140, y: 260, type: 'entity' },
        ...docs.slice(0, 4).map((d, i) => ({
          id: `doc-${d.id}`,
          label: d.kind,
          sublabel: fmtUSD(d.totalAmount),
          x: 420 + (i % 2) * 260,
          y: 150 + Math.floor(i / 2) * 220,
          type: 'document' as const,
        })),
      ],
      edges: docs.slice(0, 4).map((d) => ({ from: 'ent-ov', to: `doc-${d.id}`, highlighted: false })),
    };
    return { documents: docs, discrepancies: [], metrics, graph };
  }

  const [left, right] = docs;
  const diff = right.totalAmount - left.totalAmount;
  const pct = Math.abs(diff) / (Math.abs(left.totalAmount) || 1);
  const severity: MatchedDiscrepancy['severity'] = pct > 0.07 ? 'Critical' : pct > 0.03 ? 'High' : pct > 0.01 ? 'Medium' : 'Low';
  const confidence = Math.max(0.7, 1 - pct * 0.35 + 0.05);

  const discrepancies: MatchedDiscrepancy[] = [
    {
      id: `D-${Math.floor(1000 + Math.random() * 9000)}`,
      documents: [left.id, right.id],
      documentKinds: [left.kind, right.kind],
      field: 'Total Amount',
      poValue: left.totalAmount,
      invoiceValue: right.totalAmount,
      delta: diff,
      deltaFormatted: `${diff >= 0 ? '+' : ''}${fmtUSD(diff)} (${(pct * 100).toFixed(1)}%)`,
      severity,
      confidence,
      accountingCategory: 'Cross-document numeric variance (auto-classified)',
      rootCause:
        `The ${right.kind} (${right.documentNumber}) totals ${fmtUSD(right.totalAmount)} versus the ${left.kind} (${left.documentNumber}) at ${fmtUSD(left.totalAmount)}. ` +
        `The ${pct > 0.05 ? 'material' : 'immaterial'} variance likely stems from SKU pricing, quantity, or tax-rate differences between the two sources. Drill into the affected line items for 3-way match confirmation.`,
      executiveClaim: `${left.kind} ${left.documentNumber} approved at ${fmtUSD(left.totalAmount)}.`,
      executiveClaimSource: `${left.kind} — ${left.documentNumber}`,
      auditEvidence: `${right.kind} ${right.documentNumber} records ${fmtUSD(right.totalAmount)}; delta ${fmtUSD(diff)} flagged for ${severity} review.`,
      auditEvidenceSource: `${right.kind} — ${right.documentNumber}`,
      reportingPeriod: new Date(left.issueDate).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }),
      affectedLineItems: left.lineItems.slice(0, 2).map((l) => `${l.sku} — ${l.description}`),
    },
  ];
  const metrics: ParsedDashboardMetrics = {
    totalAudited: docs.reduce((s, d) => s + d.totalAmount, 0),
    totalAuditedFormatted: fmtUSD(docs.reduce((s, d) => s + d.totalAmount, 0)),
    flaggedVariance: Math.abs(diff),
    flaggedVarianceFormatted: fmtUSD(Math.abs(diff)),
    averageConfidence: Math.round(confidence * 100),
    documentsCount: docs.length,
    discrepanciesCount: 1,
    criticalCount: severity === 'Critical' ? 1 : 0,
  };
  const graph: { nodes: GraphNodeData[]; edges: GraphEdgeData[] } = {
    nodes: [
      { id: 'ent-ov', label: 'OmniVise', x: 120, y: 260, type: 'entity' },
      { id: 'doc-left', label: left.kind, sublabel: fmtUSD(left.totalAmount), x: 380, y: 110, type: 'document' },
      { id: 'doc-right', label: right.kind, sublabel: fmtUSD(right.totalAmount), x: 380, y: 410, type: 'document' },
      { id: 'met-left', label: left.lineItems[0]?.sku || 'Item A', x: 640, y: 110, type: 'metric' },
      { id: 'met-right', label: right.lineItems[0]?.sku || 'Item B', x: 640, y: 410, type: 'metric', severity: pct > 0.03 ? 'High' : 'Medium' },
      { id: 'disc-main', label: 'Variance', sublabel: discrepancies[0].deltaFormatted, x: 900, y: 260, type: 'contradiction', severity, relatedDiscrepancyId: discrepancies[0].id },
    ],
    edges: [
      { from: 'ent-ov', to: 'doc-left' },
      { from: 'ent-ov', to: 'doc-right' },
      { from: 'doc-left', to: 'met-left', highlighted: true },
      { from: 'doc-right', to: 'met-right', highlighted: true },
      { from: 'met-left', to: 'disc-main', highlighted: true },
      { from: 'met-right', to: 'disc-main', highlighted: true },
    ],
  };
  return { documents: docs, discrepancies, metrics, graph };
}

interface DocumentUploaderProps {
  onDatasetIngested: (dataset: AuditDataset) => void;
  compact?: boolean;
}

export default function DocumentUploader({ onDatasetIngested, compact }: DocumentUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stagedDocs, setStagedDocs] = useState<ParsedDocument[]>([]);
  const [lastIngest, setLastIngest] = useState<{ title: string; docCount: number; discCount: number } | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const processFiles = useCallback(async (files: FileList | File[]) => {
    const arr = Array.from(files);
    if (arr.length === 0) return;
    const oversized = arr.find((file) => file.size > MAX_FILE_SIZE);
    if (oversized) {
      setUploadError(`${oversized.name} exceeds the 50MB file size limit.`);
      return;
    }
    setUploadError(null);
    setIsProcessing(true);
    setProgress(0);

    const parsed: ParsedDocument[] = [];
    for (let i = 0; i < arr.length; i++) {
      await new Promise((r) => setTimeout(r, 180));
      parsed.push(synthesizeParsedDoc(arr[i], i + stagedDocs.length + 1));
      setProgress(Math.round(((i + 1) / arr.length) * 100));
    }

    const merged = [...stagedDocs, ...parsed];
    setStagedDocs(merged);
    const dataset = synthesizeDatasetFromDocuments(merged);
    onDatasetIngested(dataset);
    setLastIngest({ title: 'Custom Document Upload', docCount: parsed.length, discCount: dataset.discrepancies.length });
    await new Promise((r) => setTimeout(r, 350));
    setIsProcessing(false);
  }, [onDatasetIngested, stagedDocs]);

  const handleSample = useCallback((preset: SamplePreset) => {
    setIsProcessing(true);
    setProgress(0);
    void (async () => {
      for (let i = 0; i <= 100; i += 10) {
        setProgress(i);
        await new Promise((r) => setTimeout(r, 40));
      }
      const dataset = preset.build();
      setStagedDocs(dataset.documents);
      onDatasetIngested(dataset);
      setLastIngest({ title: preset.title, docCount: dataset.documents.length, discCount: dataset.discrepancies.length });
      await new Promise((r) => setTimeout(r, 120));
      setIsProcessing(false);
    })();
  }, [onDatasetIngested]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    void processFiles(e.dataTransfer.files);
  }, [processFiles]);

  const presetIcon = (icon: SamplePreset['icon']) => {
    switch (icon) {
      case 'po-invoice':
        return <FileSpreadsheet className="w-4 h-4" />;
      case 'earnings':
        return <Sparkles className="w-4 h-4" />;
      case 'contract':
        return <FileText className="w-4 h-4" />;
      case 'expense':
        return <AlertTriangle className="w-4 h-4" />;
    }
  };

  const totalStaged = useMemo(() => stagedDocs.reduce((s, d) => s + d.totalAmount, 0), [stagedDocs]);

  return (
    <div className={`${compact ? 'p-4' : 'p-6'} rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900/60 via-slate-900/40 to-slate-950/60 backdrop-blur-xl shadow-xl relative overflow-hidden`}>
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-400/60 to-transparent" />
      <div className="absolute -top-24 -right-24 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl" />
      <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl" />

      <div className="relative space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-emerald-400 flex items-center justify-center text-white shadow-md">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white tracking-tight">Document Ingestion & XAI Parsing</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">Upload any pair of source documents — OmniVise extracts metadata, aligns line items, and runs the 3-way match engine.</p>
              </div>
            </div>
          </div>
          {lastIngest && (
            <div className="hidden md:flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-400/20 text-emerald-300 text-[11px] font-bold whitespace-nowrap">
              <CheckCircle2 className="w-3.5 h-3.5" /> {lastIngest.title.replace(/^Load /, '')} · {lastIngest.docCount} docs · {lastIngest.discCount} flags
            </div>
          )}
        </div>

        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          className={`group cursor-pointer rounded-2xl border-2 border-dashed transition-all px-5 py-8 text-center relative ${
            isDragging
              ? 'border-cyan-300 bg-cyan-500/10 shadow-[0_0_28px_rgba(34,211,238,0.15)]'
              : 'border-cyan-400/35 bg-cyan-500/[0.03] hover:border-cyan-300/70 hover:bg-cyan-500/[0.06]'
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            multiple
            accept=".pdf,.xlsx,.xls,.csv,.docx,.txt"
            className="hidden"
            onChange={(e) => e.target.files && void processFiles(e.target.files)}
          />
          <div className="flex flex-col items-center gap-3">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
              isDragging ? 'bg-cyan-500/30 text-cyan-100' : 'bg-cyan-500/10 text-cyan-300 group-hover:bg-cyan-500/20'
            }`}>
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">
                {isProcessing ? 'Parsing document bytes…' : isDragging ? 'Drop files to begin XAI match' : 'Drag & drop documents or click to browse'}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">PDF · XLSX · CSV · DOCX · TXT — max 50MB each.</p>
            </div>
            <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-rose-400/20 bg-rose-500/10 px-2 py-1 text-[10px] font-black text-rose-200"><FileText className="h-3 w-3" /> PDF</span>
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-400/20 bg-emerald-500/10 px-2 py-1 text-[10px] font-black text-emerald-200"><FileSpreadsheet className="h-3 w-3" /> XLSX</span>
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-sky-400/20 bg-sky-500/10 px-2 py-1 text-[10px] font-black text-sky-200"><FileText className="h-3 w-3" /> CSV</span>
            </div>
            <button type="button" onClick={(event) => { event.stopPropagation(); inputRef.current?.click(); }} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-cyan-500/15 px-4 py-2.5 text-xs font-black text-cyan-200 ring-1 ring-cyan-400/30 transition hover:bg-cyan-500/25"><Upload className="h-3.5 w-3.5" /> Browse Files</button>
            {uploadError && <p className="mt-3 text-xs font-bold text-rose-300">{uploadError}</p>}
            {isProcessing && (
              <div className="w-80 max-w-full h-2 bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-indigo-400 via-sky-400 to-emerald-400 transition-[width] duration-200"
                  style={{ width: `${progress}%` }}
                />
              </div>
            )}
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-2.5">
            <Database className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Enterprise Sample Library</span>
            <span className="ml-auto text-[10px] text-slate-500 font-semibold">Instant match — no upload required</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {SAMPLE_PRESETS.map((preset) => (
              <button
                key={preset.id}
                onClick={() => handleSample(preset)}
                disabled={isProcessing}
                className="group text-left rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/20 disabled:opacity-60 disabled:cursor-not-allowed p-4 transition-all relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-indigo-500/20 to-transparent rounded-full blur-2xl -translate-y-8 translate-x-8 group-hover:from-indigo-400/30 transition-colors" />
                <div className="relative flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 text-slate-300 flex items-center justify-center shrink-0 group-hover:text-indigo-300 group-hover:border-indigo-400/30 transition-colors">
                    {presetIcon(preset.icon)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-white leading-snug">{preset.title.replace(/^Load /, '')}</p>
                    <p className="text-[10.5px] text-slate-400 mt-1 line-clamp-2 leading-snug">{preset.description}</p>
                    <div className="mt-2.5 inline-flex items-center gap-1 text-[10px] font-black text-indigo-300 group-hover:text-indigo-200">
                      Load dataset <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {stagedDocs.length > 0 && (
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3.5">
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Staged Parsed Documents</span>
                <span className="px-2 py-0.5 rounded-full bg-white/5 text-slate-300 text-[10px] font-bold">{stagedDocs.length}</span>
              </div>
              <div className="text-[11px] text-slate-300 font-bold">
                Value staged: <span className="text-white">{fmtUSD(totalStaged)}</span>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {stagedDocs.map((d) => (
                <div key={d.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/[0.02] border border-white/5">
                  <div className={`w-8 h-8 rounded-lg shrink-0 flex items-center justify-center text-[10px] font-black ${
                    d.status === 'flagged' ? 'bg-rose-500/15 text-rose-300' : 'bg-emerald-500/15 text-emerald-300'
                  }`}>
                    {d.kind.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11.5px] font-bold text-white truncate">{d.filename}</p>
                    <p className="text-[10px] text-slate-400 truncate">
                      {d.vendor} · {d.documentNumber} · {fmtUSD(d.totalAmount)}
                    </p>
                  </div>
                  <button
                    onClick={() => setStagedDocs((prev) => prev.filter((x) => x.id !== d.id))}
                    className="p-1 rounded-md text-slate-500 hover:text-rose-300 hover:bg-rose-500/10 transition-colors shrink-0"
                    title="Remove staged document"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export { buildPOInvoiceSample, buildEarningsSample, buildExpenseSample, synthesizeDatasetFromDocuments };
