# Specification: OmniVise Enterprise XAI Audit Platform v3.0

## Problem Statement
OmniVise v2.x provides a basic document ingestion and discrepancy detection pipeline. To meet enterprise audit compliance requirements (SOX, SOC2, ASC 606), the platform must be upgraded to a full Explainable AI auditing platform with strict claim schemas, context-aware contradiction reasoning, interactive knowledge graph 2.0, human-in-the-loop governance, role-based access control with multi-tenant isolation, and audit-ready export capabilities.

## Users
- **Auditors**: Review flagged discrepancies, confirm/dismiss alerts, maintain audit trails
- **Admins**: Manage RBAC, configure risk thresholds, manage orgs/tenants
- **Analysts**: Investigate claims, perform cross-document verification
- **Viewers**: Read-only visibility for stakeholders and compliance officers

## Goals
1. Deliver strict Claim Schema + Context-Aware Contradiction Engine with 6-axis verification
2. Provide Knowledge Graph 2.0 with 7 node types, search/zoom/filter, timeline visualization
3. Implement Human-in-the-Loop workflow with 4 review actions and immutable audit trail
4. Deliver 4-role RBAC + multi-tenant org switcher with write gating
5. Provide 1-click exports (PDF/CSV/JSON) + full Settings/Help modules

## Non-Goals
- Backend API integration (all logic remains client-side demo)
- Real database persistence (in-memory state only)
- OCR/document parsing beyond existing synthetic pipeline
- SSO/OAuth integration
- Real PDF generation (download triggers synthetic data export only)

---

## Functional Requirements

### FR-1: Claim Schema (src/types/)
**Rule**: Define a `Claim` interface with 8 required fields:
- Entity, Metric, Value (numeric), Unit (USD / pp / count), Period (Q# FY####), SourceDoc, PageTimestamp, Speaker
**Rule**: Normalize function `normalizeClaim(raw) -> Claim` must accept strings like "Q3 revenue $45M" and output typed Claim.

### FR-2: Context-Aware Contradiction Engine (src/components/xai/)
**Rule**: 6-axis verification before flagging:
1. Entity match (OmniVise Holdings ≠ OmniVise Procurement)
2. Metric match (Revenue ≠ Gross Profit)
3. Period match (Q3 FY2026 vs Q3 FY2025)
4. Currency match (USD vs EUR)
5. Unit match ($ vs %)
6. Accounting Definition match (GAAP vs Non-GAAP)
**Rule**: Output categorical statuses: MATCH | POSSIBLE CONFLICT | CONTRADICTION | OUTDATED | DIFFERENT DEFINITION
**Rule**: Severity calculation: HIGH if |delta%| > 5% or |delta| > materiality threshold; MED if > 2%; LOW otherwise

### FR-3: Discrepancy Alert Cards & Evidence Drawer
**Rule**: Alert cards display 4 quadrants: WHAT (Claimed vs Reported values), WHY (contextual reasoning paragraph), CONFIDENCE% (0-100 visual progress bar), SEVERITY (HIGH/MED/LOW pill)
**Rule**: Evidence drawer renders side-by-side: Document Name, Page Number / Timestamp, Section, Quoted Text Snippet (exact substring with markdown bold highlight around divergent figure)
**Rubric**: Evidence snippets show both sources in a split layout with visual diff highlighting — score 2/2 if both sources include document metadata + quoted text, 1/2 if only values shown, 0/2 if missing.

### FR-4: Knowledge Graph 2.0 (src/components/graph/)
**Rule**: 7 node types with distinct visual palettes: Company → Document → Claim → Metric → Period → Evidence → Contradiction
**Rule**: Controls: Search box (node label substring), Zoom +/- buttons, Conflict-Only toggle (hides MATCH nodes), Severity filter dropdown (ALL/HIGH/MED/LOW)
**Rule**: Clicking any node opens its Evidence Drawer with breadcrumb trail to the source document
**Rule**: Historical Contradiction Timeline: Horizontal timeline with nodes for each period showing value changes, connecting lines with slope indicator (e.g. Q1 $41M → Q2 $45M → Q3 $43M)

### FR-5: Financial Impact & Materiality
**Rule**: Every discrepancy card shows % variance and $ delta. If |delta| > $1M OR |delta%| > 5%, display "⚠️ Potentially Material Discrepancy" banner
**Rule**: Multi-Document Cross Verification panel: tabs for Earnings Calls / Annual Reports / 10-K / Investor Presentations; compare same metric across 4 doc types

### FR-6: Executive Risk Summary Bar
**Rule**: Top-fixed dashboard bar displaying: 🔴 High count | 🟠 Medium count | 🟡 Low count + "Top Identified Risk: {Name}" with severity badge
**Rubric**: Visual prominence — 2/2 if bar uses gradient glassmorphism with animated severity dots, 1/2 if plain bar, 0/2 if missing.

### FR-7: Human-in-the-Loop Audit Actions
**Rule**: 4 buttons per alert card: ✓ Confirm | ✗ Dismiss | ⚑ Needs Review | ↑ Escalate
**Rule**: Dismiss opens modal with required dropdown reason (options: "Different reporting period" / "Different accounting standard" / "Rounding difference" / "Data entry error" / "Custom") + free text notes
**Rule**: Viewer role: all 4 buttons disabled + tooltip "Viewer role: write actions disabled"

### FR-8: Complete Immutable Audit Trail
**Rule**: Each action writes a log entry `AuditTrailEntry` with: Claim → Source(s) → Evidence → AI Analysis (confidence/severity) → Human Decision (action + reason) → Timestamp + Actor (email/role)
**Rule**: Display trail in chronological reverse order with immutable lock icon; no edit/delete UI

### FR-9: RBAC 4 Roles + Multi-Tenant
**Rule**: Update UserRole to 'Admin' | 'Auditor' | 'Analyst' | 'Viewer'
**Rule**: Permissions matrix:
- Admin: Upload + Review + Manage Roles + Export + Config
- Auditor: Upload + Review + Export (no role mgmt)
- Analyst: View + Cross-Verify + Notes (no confirm/dismiss)
- Viewer: View only — all mutation UI disabled
**Rule**: Organization Switcher in Sidebar header: dropdown "Company A (OmniVise Holdings)" vs "Company B (Nexus Semiconductor)" with data isolation visual indicator

### FR-10: Audit Report Exports
**Rule**: 3 buttons on Reports tab / Executive bar: Download PDF | Download CSV | Download JSON
**Rule**: Each triggers blob download of synthetic audit report containing: timestamp, dataset summary, all discrepancies with decisions, audit trail log

### FR-11: Settings View
**Rule**: Toggles: Screen Share Privacy Mode (auto-redact PII/bank accounts — regex mask `\d{4}-****-****-\d{4}`), Voice Audio (toggle), Watermark overlay (on/off toggle with user name)
**Rule**: Risk Sensitivity Slider: $1,000 to $50,000 materiality threshold; live label updates; HIGH severity recalibrated when slider changes

### FR-12: Help View
**Rule**: Lead Compliance Officer contact card:
- Name: Priyanshi Aggarwal (Lead Compliance Officer)
- Phone: +91 8860096173 (clickable tel:+918860096173)
- Email: audit-support@omnivise.ai (clickable mailto:)
**Rule**: Links panel: SOX Compliance Guide, SOC2 Type II Report, ASC 606 Revenue Recognition Standard
**Rule**: Priority Ticket form: Subject + Description fields + Severity dropdown + Submit button

---

## Non-Functional Requirements
### NFR-1: Dark Glassmorphism Consistency
**Rubric**: Every new card/modal/drawer uses the established pattern: backdrop-blur-xl, bg-slate-950/60-90, border-white/5-10, radial gradient washes, 40px grid overlays, rounded-2xl, glowing top-border gradients. Score 2/2 if all new UI matches existing aesthetic, 1/2 if minor deviations, 0/2 if flat/non-glass.

### NFR-2: TypeScript Strict Typing
**Rule**: All new components/interfaces use explicit types; no `any`; shared types live in src/types/index.ts
**Rule**: Props interfaces defined for every React component

### NFR-3: Single Responsibility
**Rule**: Each module (xai/, graph/, audit/, settings/, help/, dashboard/) is its own file; no 2000-line mega-file; page.tsx is orchestrator only

### NFR-4: Responsive
**Rule**: All new panels work at 1280px width (enterprise dashboard standard); mobile not required

---

## Constraints & Dependencies
- Preserve all existing functionality (upload samples, XAI drawer opening on discrepancy click, graph hover)
- Do not remove any existing components; extend them
- lucide-react icons only (no new icon libraries)
- Tailwind CSS only, no CSS-in-JS libraries
- Existing TypeScript types in src/types/index.ts are the single source of truth — extend, don't duplicate

---

## Acceptance Criteria

| ID | Type | Statement |
|---|---|---|
| AC-1 | rule | Claim interface with 8 fields + normalizeClaim function exist in src/types/index.ts |
| AC-2 | rule | ContradictionEngine implements 6-axis verification with 5 status outputs |
| AC-3 | rule | XAIDrawer WHAT/WHY/CONFIDENCE/SEVERITY quadrants render correctly |
| AC-4 | rule | Evidence Drawer side-by-side with Doc Name / Page / Section / Quoted text |
| AC-5 | rule | KnowledgeGraph has 7 node types, Search, Zoom, ConflictOnly toggle, Severity filter |
| AC-6 | rule | Historical Timeline renders period-to-period value changes |
| AC-7 | rubric | Materiality indicator + % variance on every card (threshold-based) |
| AC-8 | rule | Executive Risk Summary bar with 🔴/🟠/🟡 counts + Top Risk |
| AC-9 | rule | 4 audit action buttons (Confirm/Dismiss/NeedsReview/Escalate) + Dismiss modal |
| AC-10 | rule | Immutable AuditTrailEntry log with all 9 fields |
| AC-11 | rule | 4 UserRoles with correct permission gating + Viewer disabled states |
| AC-12 | rule | Organization switcher in Sidebar with 2 company options |
| AC-13 | rule | 3 Export buttons (PDF/CSV/JSON) trigger blob downloads |
| AC-14 | rule | Settings: Privacy Mode, Voice, Watermark toggles + $1k-$50k Risk Slider |
| AC-15 | rule | Help: Compliance officer card with tel:+918860096173 + email + docs + ticket form |
| AC-16 | rubric | Glassmorphism aesthetic uniformity across all new components (threshold 2/2) |
| AC-17 | rule | page.tsx orchestrates 9 view tabs (Overview/Monitor/Documents/Claims/Discrepancies/Graph/Reports/Settings/Help) |
