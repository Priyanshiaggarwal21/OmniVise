export interface WorkspaceTemplate {
  id: string;
  name: string;
  badge: string;
  description: string;
  starterQuestion: string;
  suggestedCategories: string[];
}

export const WORKSPACE_TEMPLATES: WorkspaceTemplate[] = [
  {
    id: 'acquisition-review',
    name: 'Acquisition Review',
    badge: 'M&A Due Diligence',
    description: 'Audit target revenue quality, deferred revenue schedules, and executive statements against filings.',
    starterQuestion: 'What was the guided revenue vs GAAP reported revenue in Q3?',
    suggestedCategories: [
      'SEC Filings (10-K / 10-Q)',
      'Vendor & Revenue Ledgers',
      'Earnings Call Transcripts',
    ],
  },
  {
    id: 'vendor-comparison',
    name: 'Vendor Comparison',
    badge: 'Procurement & Supply Chain',
    description: 'Reconcile purchase order pricing, volume tiering, and logistics surcharges across suppliers.',
    starterQuestion: 'Are there price or quantity variances on the Nexus Semiconductor POs?',
    suggestedCategories: [
      'Supplier POs & Invoices',
      'Subledger Reconciliations',
      'Shipping & Freight Surcharges',
    ],
  },
  {
    id: 'compliance-check',
    name: 'Compliance Check',
    badge: 'Controls & Audit Committee',
    description: 'Verify executive delivery claims, internal control punch-lists, and conditional acceptance records.',
    starterQuestion: 'Did executive statements match signed delivery milestones?',
    suggestedCategories: [
      'Milestone Sign-Off Sheets',
      'Board Committee Recordings',
      'Regulatory & Permit Filings',
    ],
  },
];
