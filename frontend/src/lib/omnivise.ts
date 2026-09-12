export type Role = 'Admin' | 'Auditor' | 'Viewer';
export type ContradictionType = 'Numerical' | 'Temporal' | 'Semantic';
export type DiscrepancyStatus =
  | 'Open'
  | 'In Review'
  | 'Confirmed'
  | 'Dismissed'
  | 'Needs Review'
  | 'Escalated';
export type Severity = 'Critical' | 'High' | 'Medium' | 'Low';

export interface ExtractedClaim {
  id: string;
  entity: string;
  metric: string;
  value: number;
  currency_unit: string;
  reporting_period: string;
  source_document: string;
  page_or_timestamp: string;
  speaker: string;
  statement_text: string;
  extracted_at?: string;
  confidence_score: number;
}

export interface Discrepancy {
  id: string;
  metric: string;
  entity: string;
  claimed_value: number;
  reported_value: number;
  difference: number;
  percentage_diff: number;
  severity: Severity;
  confidence_score: number;
  contradiction_type: ContradictionType;
  status: DiscrepancyStatus;
  evidence_source: string;
  claimed_claim_id?: string;
  reported_claim_id?: string;
  executive_statement: string;
  source_evidence: string;
  claimed_source: string;
  reported_source: string;
  reporting_period: string;
  currency_unit: string;
  alignment: Record<string, boolean | string>;
  timestamp: string;
}

export interface DocumentPage {
  page: number;
  text: string;
}

export interface IngestedDocument {
  id: string;
  filename: string;
  status: string;
  progress: number;
  pages: DocumentPage[];
  claim_ids: string[];
  summary: string;
  ai_engine: string;
}

export interface LiveEvent {
  id: string;
  kind: string;
  message: string;
  timestamp: string;
  severity?: string | null;
  related_id?: string | null;
}

export interface Stats {
  documents_processed: number;
  claims_extracted: number;
  discrepancies_detected: number;
  critical_count: number;
  review_completion: number;
  items_remaining: number;
  sources: number;
}

export interface GraphNode {
  id: string;
  label: string;
  kind: string;
  x: number;
  y: number;
  severity?: string | null;
  related_ids?: string[];
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  kind: string;
}

export interface GraphResponse {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface Session {
  access_token: string;
  name: string;
  email: string;
  role: Role;
}

export const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export const MOCK_CLAIMS: ExtractedClaim[] = [
  {
    id: 'c-rev-q1-stmt',
    entity: 'OmniVise Holdings',
    metric: 'Revenue',
    value: 38.4,
    currency_unit: 'USD millions',
    reporting_period: 'Q1 FY2026',
    source_document: 'Q1 FY2026 Earnings Call',
    page_or_timestamp: '00:08:14',
    speaker: 'CEO — Priyanshi Aggarwal',
    statement_text: 'Q1 revenue came in at $38.4 million, slightly ahead of plan.',
    confidence_score: 0.93,
  },
  {
    id: 'c-rev-q1-10q',
    entity: 'OmniVise Holdings',
    metric: 'Revenue',
    value: 38.4,
    currency_unit: 'USD millions',
    reporting_period: 'Q1 FY2026',
    source_document: 'Form 10-Q Q1 FY2026',
    page_or_timestamp: 'Page 12',
    speaker: 'Controller',
    statement_text: 'Total revenue for the three months ended was $38.4 million.',
    confidence_score: 0.97,
  },
  {
    id: 'c-rev-q2-stmt',
    entity: 'OmniVise Holdings',
    metric: 'Revenue',
    value: 41.1,
    currency_unit: 'USD millions',
    reporting_period: 'Q2 FY2026',
    source_document: 'Q2 FY2026 Earnings Call',
    page_or_timestamp: '00:11:02',
    speaker: 'CFO',
    statement_text: 'We delivered $41.1 million of revenue in Q2.',
    confidence_score: 0.9,
  },
  {
    id: 'c-rev-q2-10q',
    entity: 'OmniVise Holdings',
    metric: 'Revenue',
    value: 40.8,
    currency_unit: 'USD millions',
    reporting_period: 'Q2 FY2026',
    source_document: 'Form 10-Q Q2 FY2026',
    page_or_timestamp: 'Page 14',
    speaker: 'Controller',
    statement_text: 'Revenue recognized under ASC 606 was $40.8 million.',
    confidence_score: 0.96,
  },
  {
    id: 'c-rev-q3-stmt',
    entity: 'OmniVise Holdings',
    metric: 'Revenue',
    value: 45,
    currency_unit: 'USD millions',
    reporting_period: 'Q3 FY2026',
    source_document: 'Q3 FY2026 Earnings Call',
    page_or_timestamp: '12:43',
    speaker: 'CEO — Priyanshi Aggarwal',
    statement_text: 'Revenue reached $45 million.',
    confidence_score: 0.94,
  },
  {
    id: 'c-rev-q3-ar',
    entity: 'OmniVise Holdings',
    metric: 'Revenue',
    value: 41.2,
    currency_unit: 'USD millions',
    reporting_period: 'Q3 FY2026',
    source_document: 'Annual Report FY2026',
    page_or_timestamp: 'Page 47',
    speaker: 'Independent Auditor',
    statement_text: 'Consolidated GAAP revenue for Q3 was $41.2 million.',
    confidence_score: 0.99,
  },
  {
    id: 'c-rev-q4-stmt',
    entity: 'OmniVise Holdings',
    metric: 'Revenue',
    value: 47.6,
    currency_unit: 'USD millions',
    reporting_period: 'Q4 FY2026',
    source_document: 'Q4 FY2026 Earnings Call',
    page_or_timestamp: '00:09:40',
    speaker: 'CEO — Priyanshi Aggarwal',
    statement_text: 'Q4 closed at $47.6 million of revenue.',
    confidence_score: 0.92,
  },
  {
    id: 'c-rev-q4-10k',
    entity: 'OmniVise Holdings',
    metric: 'Revenue',
    value: 46.9,
    currency_unit: 'USD millions',
    reporting_period: 'Q4 FY2026',
    source_document: 'Form 10-K FY2026',
    page_or_timestamp: 'Page 51',
    speaker: 'Controller',
    statement_text: 'Fourth-quarter GAAP revenue was $46.9 million.',
    confidence_score: 0.97,
  },
  {
    id: 'c-margin-q3-stmt',
    entity: 'OmniVise Holdings',
    metric: 'Operating Margin',
    value: 18.4,
    currency_unit: 'percent',
    reporting_period: 'Q3 FY2026',
    source_document: 'Q3 FY2026 Earnings Call',
    page_or_timestamp: '00:16:22',
    speaker: 'CFO',
    statement_text: 'Operating margin expanded to 18.4 percent.',
    confidence_score: 0.9,
  },
  {
    id: 'c-margin-q3-ar',
    entity: 'OmniVise Holdings',
    metric: 'Operating Margin',
    value: 16.1,
    currency_unit: 'percent',
    reporting_period: 'Q3 FY2026',
    source_document: 'Annual Report FY2026',
    page_or_timestamp: 'Page 49',
    speaker: 'Independent Auditor',
    statement_text: 'GAAP operating margin was 16.1 percent.',
    confidence_score: 0.98,
  },
  {
    id: 'c-headcount-call',
    entity: 'OmniVise Holdings',
    metric: 'Headcount',
    value: 390,
    currency_unit: 'FTE',
    reporting_period: 'Q3 FY2026',
    source_document: 'Q3 FY2026 Earnings Call',
    page_or_timestamp: '00:22:01',
    speaker: 'CEO — Priyanshi Aggarwal',
    statement_text: 'We ended the quarter with roughly 390 people.',
    confidence_score: 0.81,
  },
  {
    id: 'c-headcount-q3',
    entity: 'OmniVise Holdings',
    metric: 'Headcount',
    value: 412,
    currency_unit: 'FTE',
    reporting_period: 'Q3 FY2026',
    source_document: 'HR Census Export',
    page_or_timestamp: 'Row 1',
    speaker: 'CHRO',
    statement_text: 'Period-end headcount was 412 full-time employees.',
    confidence_score: 0.95,
  },
];

export const MOCK_DISCREPANCIES: Discrepancy[] = [
  {
    id: 'D-0241',
    metric: 'Revenue',
    entity: 'OmniVise Holdings',
    claimed_value: 45,
    reported_value: 41.2,
    difference: -3.8,
    percentage_diff: -8.45,
    severity: 'Critical',
    confidence_score: 0.96,
    contradiction_type: 'Numerical',
    status: 'Open',
    evidence_source: 'Annual Report FY2026 — Page 47',
    claimed_claim_id: 'c-rev-q3-stmt',
    reported_claim_id: 'c-rev-q3-ar',
    executive_statement: 'Revenue reached $45 million.',
    source_evidence: 'Consolidated GAAP revenue for Q3 was $41.2 million.',
    claimed_source: 'Q3 FY2026 Earnings Call — 12:43',
    reported_source: 'Annual Report FY2026 — Page 47',
    reporting_period: 'Q3 FY2026',
    currency_unit: 'USD millions',
    alignment: {
      entity: true,
      metric: true,
      period: true,
      currency: true,
      accounting_definition: false,
      note: 'Claim appears non-GAAP / rounded; evidence is audited GAAP.',
    },
    timestamp: '00:04:12',
  },
  {
    id: 'D-0242',
    metric: 'Operating Margin',
    entity: 'OmniVise Holdings',
    claimed_value: 18.4,
    reported_value: 16.1,
    difference: -2.3,
    percentage_diff: -12.5,
    severity: 'High',
    confidence_score: 0.91,
    contradiction_type: 'Semantic',
    status: 'In Review',
    evidence_source: 'Annual Report FY2026 — Page 49',
    claimed_claim_id: 'c-margin-q3-stmt',
    reported_claim_id: 'c-margin-q3-ar',
    executive_statement: 'Operating margin expanded to 18.4 percent.',
    source_evidence: 'GAAP operating margin was 16.1 percent.',
    claimed_source: 'Q3 FY2026 Earnings Call — 00:16:22',
    reported_source: 'Annual Report FY2026 — Page 49',
    reporting_period: 'Q3 FY2026',
    currency_unit: 'percent',
    alignment: {
      entity: true,
      metric: true,
      period: true,
      currency: true,
      accounting_definition: false,
      note: 'Non-GAAP vs GAAP operating margin.',
    },
    timestamp: '00:16:22',
  },
  {
    id: 'D-0243',
    metric: 'Revenue',
    entity: 'OmniVise Holdings',
    claimed_value: 41.1,
    reported_value: 40.8,
    difference: -0.3,
    percentage_diff: -0.73,
    severity: 'Medium',
    confidence_score: 0.88,
    contradiction_type: 'Numerical',
    status: 'Open',
    evidence_source: 'Form 10-Q Q2 FY2026 — Page 14',
    claimed_claim_id: 'c-rev-q2-stmt',
    reported_claim_id: 'c-rev-q2-10q',
    executive_statement: 'We delivered $41.1 million of revenue in Q2.',
    source_evidence: 'Revenue recognized under ASC 606 was $40.8 million.',
    claimed_source: 'Q2 FY2026 Earnings Call — 00:11:02',
    reported_source: 'Form 10-Q Q2 FY2026 — Page 14',
    reporting_period: 'Q2 FY2026',
    currency_unit: 'USD millions',
    alignment: { entity: true, metric: true, period: true, currency: true, accounting_definition: true },
    timestamp: '00:11:02',
  },
  {
    id: 'D-0244',
    metric: 'Headcount',
    entity: 'OmniVise Holdings',
    claimed_value: 390,
    reported_value: 412,
    difference: 22,
    percentage_diff: 5.64,
    severity: 'Medium',
    confidence_score: 0.84,
    contradiction_type: 'Temporal',
    status: 'Needs Review',
    evidence_source: 'HR Census Export — Row 1',
    claimed_claim_id: 'c-headcount-call',
    reported_claim_id: 'c-headcount-q3',
    executive_statement: 'We ended the quarter with roughly 390 people.',
    source_evidence: 'Period-end headcount was 412 full-time employees.',
    claimed_source: 'Q3 FY2026 Earnings Call — 00:22:01',
    reported_source: 'HR Census Export — Row 1',
    reporting_period: 'Q3 FY2026',
    currency_unit: 'FTE',
    alignment: {
      entity: true,
      metric: true,
      period: true,
      currency: true,
      accounting_definition: true,
      note: 'Possible mid-quarter vs period-end snapshot mismatch.',
    },
    timestamp: '00:22:01',
  },
];

export const MOCK_DOCUMENTS: IngestedDocument[] = [
  {
    id: 'doc-call-q3',
    filename: 'Q3_FY2026_Earnings_Call.txt',
    status: 'processed',
    progress: 100,
    summary: 'Executive remarks on Q3 revenue, margin, and headcount.',
    ai_engine: 'Groq Engine Active',
    claim_ids: ['c-rev-q3-stmt', 'c-margin-q3-stmt', 'c-headcount-call'],
    pages: [
      {
        page: 1,
        text: 'CEO: Good morning. Revenue reached $45 million. We remain confident in the full-year outlook. Operating margin expanded to 18.4 percent on a non-GAAP basis.',
      },
      {
        page: 2,
        text: 'CFO: Cash conversion remains healthy. We ended the quarter with roughly 390 people after the hiring pause in July.',
      },
    ],
  },
  {
    id: 'doc-ar',
    filename: 'Annual_Report_FY2026.pdf',
    status: 'processed',
    progress: 100,
    summary: 'Audited GAAP financials for OmniVise Holdings.',
    ai_engine: 'Groq Engine Active',
    claim_ids: ['c-rev-q3-ar', 'c-margin-q3-ar'],
    pages: [
      {
        page: 47,
        text: 'Note 4 — Revenue. Consolidated GAAP revenue for the third quarter was $41.2 million, recognized under ASC 606.',
      },
      {
        page: 49,
        text: 'GAAP operating income of $6.6 million implies an operating margin of 16.1 percent for Q3 FY2026.',
      },
    ],
  },
  {
    id: 'doc-10q-q2',
    filename: 'Form_10Q_Q2_FY2026.pdf',
    status: 'processed',
    progress: 100,
    summary: 'Q2 10-Q revenue recognition footnote.',
    ai_engine: 'Groq Engine Active',
    claim_ids: ['c-rev-q2-10q'],
    pages: [
      {
        page: 14,
        text: 'Revenue recognized under ASC 606 was $40.8 million for the three months ended.',
      },
    ],
  },
];

export const MOCK_EVENTS: LiveEvent[] = [
  { id: 'e1', kind: 'alert', message: 'Critical contradiction: Q3 Revenue $45.0M vs $41.2M', timestamp: '11:18:02', severity: 'Critical', related_id: 'D-0241' },
  { id: 'e2', kind: 'claim', message: 'Extracted Revenue $45.0 USD millions (Q3 FY2026)', timestamp: '11:17:44' },
  { id: 'e3', kind: 'ingest', message: 'Annual_Report_FY2026.pdf processed (100%)', timestamp: '11:17:12' },
  { id: 'e4', kind: 'alert', message: 'High Semantic: Operating Margin 18.4% vs 16.1%', timestamp: '11:16:40', severity: 'High', related_id: 'D-0242' },
];

export const MOCK_STATS: Stats = {
  documents_processed: MOCK_DOCUMENTS.length,
  claims_extracted: MOCK_CLAIMS.length,
  discrepancies_detected: MOCK_DISCREPANCIES.length,
  critical_count: MOCK_DISCREPANCIES.filter((d) => d.severity === 'Critical').length,
  review_completion: 0,
  items_remaining: MOCK_DISCREPANCIES.length,
  sources: 6,
};

export const MOCK_GRAPH: GraphResponse = {
  nodes: [
    { id: 'ent-0', label: 'OmniVise Holdings', kind: 'entity', x: 12, y: 48 },
    { id: 'doc-0', label: 'Q3 Earnings Call', kind: 'document', x: 32, y: 22 },
    { id: 'doc-1', label: 'Annual Report', kind: 'document', x: 32, y: 72 },
    { id: 'claim-a', label: 'Revenue $45.0M', kind: 'claim', x: 58, y: 22 },
    { id: 'claim-b', label: 'Revenue $41.2M', kind: 'claim', x: 58, y: 72 },
    { id: 'contra-1', label: 'D-0241 Contradiction', kind: 'contradiction', x: 84, y: 48, severity: 'Critical' },
  ],
  edges: [
    { id: 'g1', source: 'ent-0', target: 'claim-a', kind: 'entity-claim' },
    { id: 'g2', source: 'ent-0', target: 'claim-b', kind: 'entity-claim' },
    { id: 'g3', source: 'doc-0', target: 'claim-a', kind: 'document-claim' },
    { id: 'g4', source: 'doc-1', target: 'claim-b', kind: 'document-claim' },
    { id: 'g5', source: 'claim-a', target: 'contra-1', kind: 'claim-contradiction' },
    { id: 'g6', source: 'claim-b', target: 'contra-1', kind: 'claim-contradiction' },
  ],
};

const SESSION_KEY = 'omnivise.session';

export function loadSession(): Session | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

export function saveSession(session: Session | null) {
  if (typeof window === 'undefined') return;
  if (!session) localStorage.removeItem(SESSION_KEY);
  else localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function canWrite(role?: Role) {
  return role === 'Admin' || role === 'Auditor';
}

async function request<T>(path: string, init: RequestInit = {}, fallback: T, token?: string): Promise<{ data: T; live: boolean }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4000);
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        ...(init.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(init.headers || {}),
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      return { data: (await res.json()) as T, live: true };
    }
    return { data: fallback, live: true };
  } catch {
    return { data: fallback, live: false };
  } finally {
    clearTimeout(timer);
  }
}

export async function loginRequest(email: string, password: string): Promise<Session> {
  const demos: Record<string, { password: string; session: Session }> = {
    'admin@omnivise.ai': {
      password: 'admin123',
      session: { access_token: 'mock-admin', name: 'Priyanshi Aggarwal', email, role: 'Admin' },
    },
    'auditor@omnivise.ai': {
      password: 'audit123',
      session: { access_token: 'mock-auditor', name: 'Alex Chen', email, role: 'Auditor' },
    },
    'viewer@omnivise.ai': {
      password: 'view123',
      session: { access_token: 'mock-viewer', name: 'Jordan Hale', email, role: 'Viewer' },
    },
  };

  try {
    const res = await fetch(`${API_BASE}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (res.ok) return (await res.json()) as Session;
    if (res.status === 401) throw new Error('Invalid credentials');
  } catch (err) {
    if (err instanceof Error && err.message === 'Invalid credentials') throw err;
  }

  const match = demos[email.toLowerCase()];
  if (!match || match.password !== password) throw new Error('Invalid credentials');
  return match.session;
}

export const api = {
  stats: (token?: string) => request('/api/v1/audit/stats', {}, MOCK_STATS, token),
  discrepancies: (token?: string) => request('/api/v1/audit/discrepancies', {}, MOCK_DISCREPANCIES, token),
  claims: (token?: string) => request('/api/v1/audit/claims', {}, MOCK_CLAIMS, token),
  documents: (token?: string) => request('/api/v1/ingest/documents', {}, MOCK_DOCUMENTS, token),
  events: (token?: string) => request('/api/v1/audit/events', {}, MOCK_EVENTS, token),
  graph: (token?: string) => request('/api/v1/audit/graph', {}, MOCK_GRAPH, token),
  patchStatus: async (id: string, status: DiscrepancyStatus, token?: string) => {
    const { data, live } = await request<Discrepancy>(
      `/api/v1/audit/discrepancies/${id}`,
      { method: 'PATCH', body: JSON.stringify({ status }) },
      { ...MOCK_DISCREPANCIES[0], id, status },
      token
    );
    return { data, live };
  },
  upload: async (file: File, token?: string) => {
    const form = new FormData();
    form.append('file', file);
    try {
      const res = await fetch(`${API_BASE}/api/v1/ingest/upload`, {
        method: 'POST',
        body: form,
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error('upload failed');
      return { data: await res.json(), live: true as const };
    } catch {
      return {
        live: false as const,
        data: {
          filename: file.name,
          status: 'processed',
          ai_engine: 'Local mock ingest',
          summary: `Offline ingest of ${file.name}`,
        },
      };
    }
  },
};
