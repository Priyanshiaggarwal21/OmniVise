export type DocumentKind = 'Purchase Order' | 'Invoice' | 'Contract' | 'Earnings Call' | '10-Q Filing' | '10-K Filing' | 'Annual Report' | 'Investor Presentation' | 'Receipt' | 'Other';

export type Unit = 'USD' | 'EUR' | 'percent' | 'count' | 'pp' | 'ratio';

export type ContradictionStatus = 'MATCH' | 'POSSIBLE CONFLICT' | 'CONTRADICTION' | 'OUTDATED' | 'DIFFERENT DEFINITION';

export type KGNodeType = 'company' | 'document' | 'claim' | 'metric' | 'period' | 'evidence' | 'contradiction';

export type AuditDecision = 'Confirm' | 'Dismiss' | 'Needs Review' | 'Escalate';

export type DismissalReason = 'Different reporting period' | 'Different accounting standard' | 'Rounding difference' | 'Data entry error' | 'Custom';

export type UserRole = 'Admin' | 'Auditor' | 'Analyst' | 'Viewer';

export type OrgId = 'company-a' | 'company-b';

export interface Organization {
  id: OrgId;
  name: string;
  displayName: string;
}

export interface Claim {
  id?: string;
  entity: string;
  metric: string;
  value: number;
  unit: Unit;
  period: string;
  sourceDoc: string;
  pageTimestamp: string;
  speaker: string;
  accountingStandard?: 'GAAP' | 'Non-GAAP' | 'IFRS 15' | 'UK GAAP';
}

export interface EvidenceSnippet {
  id?: string;
  documentName: string;
  pageOrTimestamp: string;
  section: string;
  quotedText: string;
  highlightStart?: number;
  highlightEnd?: number;
  speaker?: string;
  confidence?: number;
  timestamp?: string;
}

export interface AuditTrailEntry {
  id: string;
  claimId: string;
  sources: string[];
  evidenceRef: string[];
  aiConfidence: number;
  aiSeverity: 'Critical' | 'High' | 'Medium' | 'Low';
  humanDecision: AuditDecision;
  humanReason?: string;
  humanNotes?: string;
  timestamp: string;
  actor: {
    email: string;
    role: UserRole;
  };
  discrepancyId?: string;
  discrepancyField?: string;
}

export interface SettingsState {
  privacyMode: boolean;
  voiceAudio: boolean;
  watermark: boolean;
  materialityThreshold: number;
  accountingStandard: 'ASC 606' | 'IFRS 15' | 'UK GAAP';
}

export interface CrossVerificationRow {
  metric: string;
  earningsCall?: string | number;
  annualReport?: string | number;
  filing10K?: string | number;
  investorDeck?: string | number;
  period?: string;
}

export interface TimelinePoint {
  period: string;
  value: number;
  unit: Unit;
  label: string;
  metric: string;
}

export interface AxisResult {
  axis: 'Entity' | 'Metric' | 'Period' | 'Currency/Unit' | 'Accounting Definition' | 'Age/Outdated';
  pass: boolean;
  note: string;
}

export interface OpenEvidenceRequest {
  nodeId: string;
  nodeType: KGNodeType;
  breadcrumb?: Array<{ label: string; type: KGNodeType }>;
}

export interface DocumentLineItem {
  sku: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  category?: string;
}

export interface ParsedDocument {
  id: string;
  filename: string;
  kind: DocumentKind;
  vendor: string;
  counterparty?: string;
  documentNumber: string;
  issueDate: string;
  dueDate?: string;
  currency: string;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  totalAmount: number;
  lineItems: DocumentLineItem[];
  notes?: string;
  uploadedAt: string;
  status: 'parsed' | 'matching' | 'matched' | 'flagged';
}

export interface MatchedDiscrepancy {
  id: string;
  documents: [string, string];
  documentKinds: [DocumentKind, DocumentKind];
  field: string;
  poValue: string | number;
  invoiceValue: string | number;
  delta: string | number;
  deltaFormatted: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  confidence: number;
  rootCause: string;
  executiveClaim?: string;
  executiveClaimSource?: string;
  auditEvidence: string;
  auditEvidenceSource: string;
  accountingCategory: string;
  reportingPeriod?: string;
  affectedLineItems?: string[];
}

export interface ParsedDashboardMetrics {
  totalAudited: number;
  totalAuditedFormatted: string;
  flaggedVariance: number;
  flaggedVarianceFormatted: string;
  averageConfidence: number;
  documentsCount: number;
  discrepanciesCount: number;
  criticalCount: number;
}

export interface GraphNodeData {
  id: string;
  label: string;
  sublabel?: string;
  x: number;
  y: number;
  type: KGNodeType | 'entity' | 'vendor';
  severity?: 'Critical' | 'High' | 'Medium' | 'Low';
  relatedDiscrepancyId?: string;
  status?: ContradictionStatus;
}

export interface GraphEdgeData {
  from: string;
  to: string;
  highlighted?: boolean;
  label?: string;
}

export interface AuditDataset {
  documents: ParsedDocument[];
  discrepancies: MatchedDiscrepancy[];
  metrics: ParsedDashboardMetrics;
  graph: { nodes: GraphNodeData[]; edges: GraphEdgeData[] };
}
