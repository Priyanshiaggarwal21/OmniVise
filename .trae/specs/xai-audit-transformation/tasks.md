# Implementation Tasks: OmniVise XAI Audit Transformation

## Dependency Map
- Task 1 (types) ← all depend
- Task 2 (engine) ← 3,4,5,6
- Task 7 (auth/sidebar) ← 10
- Tasks 3-6,8-9 independent after 1
- Task 10 (orchestration) last

---

## Task 1: Extend Shared Type Layer (src/types/index.ts)

**Priority**: high  
**Status**: pending  
**Coverage**: AC-1, AC-2, AC-9, AC-10, AC-11, AC-12

### Work Items
1. Add `Claim` interface (8 fields: entity, metric, value, unit, period, sourceDoc, pageTimestamp, speaker)
2. Add `Unit = 'USD' | 'EUR' | 'percent' | 'count' | 'pp' | 'ratio'`
3. Add `ContradictionStatus = 'MATCH' | 'POSSIBLE CONFLICT' | 'CONTRADICTION' | 'OUTDATED' | 'DIFFERENT DEFINITION'`
4. Add `KGNodeType` extension: `'company' | 'document' | 'claim' | 'metric' | 'period' | 'evidence' | 'contradiction'` (7 types total)
5. Add `AuditDecision = 'Confirm' | 'Dismiss' | 'Needs Review' | 'Escalate'`
6. Add `AuditTrailEntry` with 9 fields: claimId, sources, evidenceRef, aiConfidence, aiSeverity, humanDecision, humanReason, timestamp, actor
7. Add `DismissalReason = 'Different reporting period' | 'Different accounting standard' | 'Rounding difference' | 'Data entry error' | 'Custom'`
8. Add `UserRole` upgrade: `'Admin' | 'Auditor' | 'Analyst' | 'Viewer'`
9. Add `OrgId = 'company-a' | 'company-b'` with `Organization` type
10. Add `SettingsState` with: privacyMode, voiceAudio, watermark, materialityThreshold (number)
11. Add `EvidenceSnippet`: documentName, pageOrTimestamp, section, quotedText, highlightStart, highlightEnd
12. Add `CrossVerificationRow`: metric, earningsCall?, annualReport?, filing10K?, investorDeck?

### Test Requirements
- **[rule TR-1.1]** `Claim` interface compiles with 8 required fields
- **[rule TR-1.2]** `ContradictionStatus` union has exactly 5 string literals in correct order
- **[rule TR-1.3]** `UserRole` has exactly 4 options (Admin/Auditor/Analyst/Viewer)
- **[rule TR-1.4]** `AuditTrailEntry` includes all 9 required fields
- **[rubric TR-1.5]** Type completeness: 2/2 if ≥11 new types added with no `any`, 1/2 if ≤8, 0/2 if `any` present

---

## Task 2: Context-Aware Contradiction Engine (src/components/xai/ContradictionEngine.tsx)

**Priority**: high  
**Status**: pending  
**Depends On**: Task 1  
**Coverage**: AC-2

### Work Items
1. Export `normalizeClaim(rawText: string, context?: Partial<Claim>): Claim` function
   - Parse "Q3 revenue $45M" → {metric:'Revenue', period:'Q3 FY2026', value:45000000, unit:'USD', ...}
   - Parse "operating margin 18.4%" → {metric:'Operating Margin', value:18.4, unit:'percent', ...}
2. Export `verify6Axis(a: Claim, b: Claim): {axis: string; pass: boolean; note: string}[]` for all 6 axes:
   - Entity, Metric, Period, Currency/Unit, Accounting Definition, Age (outdated check)
3. Export `classifyContradiction(a: Claim, b: Claim, axisResults): ContradictionStatus`
4. Export `computeSeverity(a: Claim, b: Claim, status, materialityThreshold): 'HIGH' | 'MED' | 'LOW'`
5. Export `buildReasoning(a, b, status, severity): string` — generates WHY paragraph
6. Export `buildEvidenceSnippets(a: Claim, b: Claim): [EvidenceSnippet, EvidenceSnippet]`
7. Export default `ContradictionEngine` component displaying the 6-axis verification grid for debug/transparency

### Test Requirements
- **[rule TR-2.1]** `normalizeClaim("Q3 revenue $45M")` returns value=45000000, unit='USD', metric includes 'Revenue', period='Q3 FY2026'
- **[rule TR-2.2]** 6-axis verify rejects claims where period differs (OUTDATED or POSSIBLE CONFLICT)
- **[rule TR-2.3]** classifies MATCH when all 6 axes pass
- **[rubric TR-2.4]** Severity correctness: HIGH when |delta%|>5, MED when >2, LOW otherwise. 2/2 if all 3 ranges, 1/2 if 2, 0/2 if hardcoded.

---

## Task 3: XAI Drawer v2 - Alert Quadrants + Evidence (src/components/xai/XAIDrawer.tsx)

**Priority**: high  
**Status**: pending  
**Depends On**: Tasks 1, 2  
**Coverage**: AC-3, AC-4

### Work Items
1. Keep existing drawer layout; insert 4-card grid after header:
   - WHAT card: side-by-side Claimed vs Reported (value, source, period) with visual delta arrow
   - WHY card: contextual reasoning paragraph + 6-axis chips (pass/fail icons)
   - CONFIDENCE card: numeric % + gradient progress bar + sample size note
   - SEVERITY card: HIGH/MED/LOW pill + materiality threshold indicator banner if triggered
2. Add full-height "Evidence Drawer" accordion panel. Split into 2 columns:
   - Left column: Source A (Document Name, Page/Timestamp, Section, Quoted Text with bold highlight on divergent number)
   - Right column: Source B (same structure)
3. Add timestamp, speaker, and confidence per-snippet badges
4. Add "Copy Evidence to Clipboard" button per snippet

### Test Requirements
- **[rule TR-3.1]** 4 cards (WHAT/WHY/CONFIDENCE/SEVERITY) render in a 2x2 responsive grid
- **[rule TR-3.2]** Evidence panel renders 2 columns, each with Doc Name + Page/Timestamp + Section + Quoted Text fields
- **[rubric TR-3.3]** Glassmorphism on new sub-cards: 2/2 if consistent blur+gradient+border with existing, 1/2 if partial, 0/2 if flat

---

## Task 4: Audit Alert Cards + Dismiss Modal + Trail (src/components/audit/)

**Priority**: high  
**Status**: pending  
**Depends On**: Task 1  
**Coverage**: AC-7, AC-8, AC-9, AC-10

### Work Items
1. Build `DiscrepancyAlertCard.tsx` — full-width card with:
   - Header: field name, severity pill, confidence bar
   - Body: 2 values (claimed vs audited) with delta, % variance
   - Materiality banner if |delta|>$1M or |%|>5
   - Action footer: 4 buttons (Confirm/Dismiss/Needs Review/Escalate) gated by role
2. Build `DismissalModal.tsx` — modal overlay with:
   - Required DismissalReason dropdown (5 options)
   - Free text notes field
   - Cancel / Confirm Dismiss buttons
   - Cancel dismisses modal with no action
3. Build `AuditTrail.tsx` — reverse-chrono list with:
   - Immutable lock icon per entry
   - Entry: `[Time] Actor (Role): Action on D-XXXX "Reason" · Conf X% · Sev {level}`
   - No edit/delete UI
4. Build `AuditActions.ts` hook-like state helpers

### Test Requirements
- **[rule TR-4.1]** All 4 action buttons render; Viewer role → all disabled + tooltip
- **[rule TR-4.2]** Dismiss modal has 5 dismissal reason options, requires selection before confirm
- **[rule TR-4.3]** Audit trail renders entries with all 9 fields (Claim, Sources, Evidence, AI Conf, AI Sev, Human Decision, Reason, Timestamp, Actor)
- **[rubric TR-4.4]** Modal glassmorphism polish: 2/2 if backdrop blur + gradient border + z-50 overlay, 1/2 if basic modal, 0/2 if flat

---

## Task 5: Knowledge Graph v2.0 (src/components/graph/KnowledgeGraph.tsx)

**Priority**: high  
**Status**: pending  
**Depends On**: Tasks 1, 2  
**Coverage**: AC-5, AC-6

### Work Items
1. Upgrade GraphNodeData.type → 7 types: company, document, claim, metric, period, evidence, contradiction (distinct palettes, SVG shapes: circle/hexagon/square/rounded/diamond/tag/flag)
2. Controls bar (top of graph panel):
   - Search input (filter nodes by label substring)
   - Zoom In / Out buttons (+/-) + Reset
   - "Conflict Only" toggle switch (hides MATCH nodes)
   - Severity filter dropdown (ALL / HIGH / MED / LOW)
3. Click handler: any node → open Evidence Drawer (use existing onSelectDiscrepancy or add onOpenEvidence callback) with breadcrumb: Company > Doc > Claim > Evidence
4. Build `HistoricalTimeline.tsx` sub-component under graph:
   - Horizontal timeline, nodes for each period
   - Lines connecting values with slope indicator (↑ ↓)
   - Annotate deltas ($ and %) between periods
   - Sample: Q1 $41M → Q2 $45M → Q3 $43M
5. Mini stats: add "Timeline points" count

### Test Requirements
- **[rule TR-5.1]** 7 node types render with distinct visual styles (shape + color)
- **[rule TR-5.2]** Controls bar contains: search input, 2 zoom buttons, 1 toggle, 1 dropdown (5 controls total)
- **[rule TR-5.3]** Historical Timeline has ≥3 period nodes with connecting lines + delta labels
- **[rubric TR-5.4]** SVG interactivity: 2/2 if hover glow + click animation + conflict pulse all working, 1/2 if 2 of 3, 0/2 if static

---

## Task 6: Dashboard Modules — Executive Summary + Cross-Verifier (src/components/dashboard/)

**Priority**: high  
**Status**: pending  
**Depends On**: Tasks 1, 2  
**Coverage**: AC-6, AC-7, AC-8

### Work Items
1. Build `ExecutiveRiskSummary.tsx` — sticky top bar (under TopHeader) with:
   - 🔴 High: {count} · 🟠 Medium: {count} · 🟡 Low: {count} (live from dataset)
   - Right side: "Top Identified Risk: {#1 discrepancy.field}" with severity badge
2. Build `MaterialityIndicator.tsx` — reusable component:
   - Compute % variance, $ delta
   - Show banner ⚠️ "Potentially Material Discrepancy" if threshold exceeded
   - Link to ASC 606 / SAB 99 materiality guidance note
3. Build `CrossDocVerification.tsx` — panel with 4 tabs:
   - Earnings Calls, Annual Reports, 10-K Filings, Investor Presentations
   - Rows = metrics, cells = value per doc type
   - Highlight cells with red background where values differ materially
4. Integrate Timeline in dashboard alongside graph

### Test Requirements
- **[rule TR-6.1]** Executive bar shows 3 severity counts (colors + numbers) + Top Risk label
- **[rule TR-6.2]** Materiality banner appears when |delta%|>5 or |delta|>$1M, hidden otherwise
- **[rule TR-6.3]** Cross-verifier has 4 tabs with at least 2 rows showing metric x doc-type matrix
- **[rubric TR-6.4]** Cross-verifier cell diff highlighting: 2/2 if gradient cell bg + bold delta, 1/2 if plain text, 0/2 if no highlighting

---

## Task 7: Auth + Sidebar — 4 Roles + Org Switcher

**Priority**: medium  
**Status**: pending  
**Depends On**: Task 1  
**Coverage**: AC-11, AC-12

### Work Items
1. Update `LoginView.tsx` UserRole select → 4 options (add Analyst: "Analyst — Investigation Access")
2. Update `Sidebar.tsx`:
   - Add org switcher dropdown in brand area (below logo, above nav): "Company A — OmniVise Holdings" / "Company B — Nexus Semiconductor"
   - Show 🔒 data isolation badge next to org name (green check for current org)
   - Role selector in bottom widget → 4 options matching LoginView
3. Permission matrix component update in page.tsx (RoleMatrixPanel): add Analyst column with capabilities between Auditor and Viewer

### Test Requirements
- **[rule TR-7.1]** LoginView + Sidebar role selectors have 4 options each, no duplicates
- **[rule TR-7.2]** Org dropdown renders 2 company options
- **[rule TR-7.3]** Sidebar role change → RoleMatrixPanel active column changes

---

## Task 8: Settings View (src/components/settings/SettingsView.tsx)

**Priority**: medium  
**Status**: pending  
**Depends On**: Task 1  
**Coverage**: AC-13, AC-14

### Work Items
1. New file `SettingsView.tsx`, render in Settings tab:
   - Section 1: Privacy & Display
     - Screen Share Privacy Mode toggle (on/off). On: preview text shows bank-account-style regex redaction demo
     - Voice Audio toggle (on/off; note: "Transcripts auto-ingested if enabled")
     - Watermark Overlay toggle. On: preview tile shows faint "Priyanshi · Admin · timestamp" watermark
   - Section 2: Risk & Materiality
     - Risk Sensitivity Slider: range 1000-50000 USD, step 1000. Live label "$X,XXX materiality threshold". Apply change immediately to severity calculations
     - Dropdown: Accounting Standard (ASC 606 / IFRS 15 / UK GAAP)
   - Section 3: Export & Reports
     - 3 download buttons: Download PDF, Download CSV, Download JSON
     - Each triggers `URL.createObjectURL` + `<a download>` with synthetic audit report blob (JSON: full state, CSV: discrepancies, PDF: text report)
2. Export functions in `lib/exports.ts` helper

### Test Requirements
- **[rule TR-8.1]** 3 toggles exist with correct labels; Watermark on → shows preview tile
- **[rule TR-8.2]** Slider range 1000-50000, value change updates displayed label
- **[rule TR-8.3]** 3 Export buttons render; clicking logs blob download trigger to console (demo)
- **[rubric TR-8.4]** Export UX: 2/2 if all 3 buttons have distinct icons + file-type labels + progress toast, 1/2 if basic buttons, 0/2 if no feedback

---

## Task 9: Help View (src/components/help/HelpView.tsx)

**Priority**: medium  
**Status**: pending  
**Depends On**: Task 1  
**Coverage**: AC-15

### Work Items
1. New file `HelpView.tsx`:
   - Card 1: Lead Compliance Officer Contact
     - Avatar, Name "Priyanshi Aggarwal", Title "Lead Compliance Officer, OmniVise"
     - Phone: clickable link `tel:+918860096173` displaying "+91 88600 96173"
     - Email: clickable `mailto:audit-support@omnivise.ai`
     - "Available 24/7 for priority audit matters" tagline
   - Card 2: Compliance Documentation Library
     - 3 link buttons: SOX Compliance Guide (doc icon), SOC2 Type II Report (shield icon), ASC 606 Revenue Recognition Standard (book icon)
     - Each opens in new tab placeholder (href="#")
   - Card 3: Priority Support Ticket Form
     - Subject input field
     - Description textarea
     - Severity dropdown: P1-Critical / P2-High / P3-Medium / P4-Low
     - Submit button → on submit show success toast "Ticket #T-XXXX submitted; response within 4h for P1"

### Test Requirements
- **[rule TR-9.1]** Phone link has `href="tel:+918860096173"`, email has `href="mailto:audit-support@omnivise.ai"`
- **[rule TR-9.2]** Compliance docs section renders 3 document links with icons
- **[rule TR-9.3]** Ticket form has subject, description, 4-option severity dropdown, submit; submit shows success UI

---

## Task 10: Orchestration & Tab Routing (src/app/page.tsx)

**Priority**: high  
**Status**: pending  
**Depends On**: Tasks 1-9  
**Coverage**: AC-16, AC-17

### Work Items
1. Add new state hooks:
   - activeOrg: 'company-a' | 'company-b'
   - settings: SettingsState (privacyMode, voiceAudio, watermark, materialityThreshold, accountingStandard)
   - showDismissalModal: null | {discrepancyId}
   - auditTrailEntries: AuditTrailEntry[]
   - openEvidence: null | {nodeId, nodeType}
2. Conditional rendering per activeTab:
   - Overview: ExecutiveRiskSummary + MetricCards + Uploader + Alerts preview
   - Monitor: Live feed + TrailPanel + ClaimsTable
   - Documents: DocumentsPanel
   - Claims: Claim register table + normalize preview
   - Discrepancies: DiscrepancyAlertCard list (not table) + CrossDocVerification
   - Graph: KG v2 + Timeline
   - Reports: Export dashboard + CrossDocVerification full
   - Settings: SettingsView
   - Help: HelpView
3. Pass state & callbacks through prop drilling (or React context if cleaner)
4. Apply watermark overlay globally if settings.watermark=true
5. Apply PII redaction regex to displayed account numbers if privacyMode=true
6. Ensure dark glassmorphism on *every* new panel (validate visually)

### Test Requirements
- **[rule TR-10.1]** Clicking each of 9 sidebar tabs renders the correct dedicated view (no broken tabs)
- **[rule TR-10.2]** Watermark enabled → fixed overlay with user+role+timestamp appears; disable → hidden
- **[rule TR-10.3]** Org switcher changes org state and shows data-isolation visual badge
- **[rubric TR-10.4]** Full visual consistency: 2/2 if all new views use matching glass cards + gradients + radial blurs + grid patterns, 1/2 if ≥50% match, 0/2 if inconsistent aesthetic
