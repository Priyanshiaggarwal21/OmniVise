from datetime import datetime
from threading import Lock
from typing import Dict, List, Optional
from uuid import uuid4

from app.schemas import (
    ContradictionType,
    Discrepancy,
    DiscrepancyStatus,
    DocumentPage,
    ExtractedClaim,
    IngestedDocument,
    LiveEvent,
    Severity,
    StatsResponse,
)

_lock = Lock()

claims: List[ExtractedClaim] = []
discrepancies: List[Discrepancy] = []
documents: List[IngestedDocument] = []
events: List[LiveEvent] = []


def _now_clock() -> str:
    return datetime.utcnow().strftime("%H:%M:%S")


def add_event(kind: str, message: str, severity: Optional[str] = None, related_id: Optional[str] = None) -> LiveEvent:
    event = LiveEvent(
        id=str(uuid4())[:8],
        kind=kind,
        message=message,
        timestamp=_now_clock(),
        severity=severity,
        related_id=related_id,
    )
    events.insert(0, event)
    del events[200:]
    return event


def seed() -> None:
    if claims:
        return

    seeded_claims = [
        ExtractedClaim(
            id="c-rev-q1-stmt",
            entity="OmniVise Holdings",
            metric="Revenue",
            value=38.4,
            currency_unit="USD millions",
            reporting_period="Q1 FY2026",
            source_document="Q1 FY2026 Earnings Call",
            page_or_timestamp="00:08:14",
            speaker="CEO — Priyanshi Aggarwal",
            statement_text="Q1 revenue came in at $38.4 million, slightly ahead of plan.",
        ),
        ExtractedClaim(
            id="c-rev-q1-10q",
            entity="OmniVise Holdings",
            metric="Revenue",
            value=38.4,
            currency_unit="USD millions",
            reporting_period="Q1 FY2026",
            source_document="Form 10-Q Q1 FY2026",
            page_or_timestamp="Page 12",
            speaker="Controller",
            statement_text="Total revenue for the three months ended was $38.4 million.",
        ),
        ExtractedClaim(
            id="c-rev-q2-stmt",
            entity="OmniVise Holdings",
            metric="Revenue",
            value=41.1,
            currency_unit="USD millions",
            reporting_period="Q2 FY2026",
            source_document="Q2 FY2026 Earnings Call",
            page_or_timestamp="00:11:02",
            speaker="CFO",
            statement_text="We delivered $41.1 million of revenue in Q2.",
        ),
        ExtractedClaim(
            id="c-rev-q2-10q",
            entity="OmniVise Holdings",
            metric="Revenue",
            value=40.8,
            currency_unit="USD millions",
            reporting_period="Q2 FY2026",
            source_document="Form 10-Q Q2 FY2026",
            page_or_timestamp="Page 14",
            speaker="Controller",
            statement_text="Revenue recognized under ASC 606 was $40.8 million.",
        ),
        ExtractedClaim(
            id="c-rev-q3-stmt",
            entity="OmniVise Holdings",
            metric="Revenue",
            value=45.0,
            currency_unit="USD millions",
            reporting_period="Q3 FY2026",
            source_document="Q3 FY2026 Earnings Call",
            page_or_timestamp="12:43",
            speaker="CEO — Priyanshi Aggarwal",
            statement_text="Revenue reached $45 million.",
        ),
        ExtractedClaim(
            id="c-rev-q3-ar",
            entity="OmniVise Holdings",
            metric="Revenue",
            value=41.2,
            currency_unit="USD millions",
            reporting_period="Q3 FY2026",
            source_document="Annual Report FY2026",
            page_or_timestamp="Page 47",
            speaker="Independent Auditor",
            statement_text="Consolidated GAAP revenue for Q3 was $41.2 million.",
        ),
        ExtractedClaim(
            id="c-rev-q4-stmt",
            entity="OmniVise Holdings",
            metric="Revenue",
            value=47.6,
            currency_unit="USD millions",
            reporting_period="Q4 FY2026",
            source_document="Q4 FY2026 Earnings Call",
            page_or_timestamp="00:09:40",
            speaker="CEO — Priyanshi Aggarwal",
            statement_text="Q4 closed at $47.6 million of revenue.",
        ),
        ExtractedClaim(
            id="c-rev-q4-10k",
            entity="OmniVise Holdings",
            metric="Revenue",
            value=46.9,
            currency_unit="USD millions",
            reporting_period="Q4 FY2026",
            source_document="Form 10-K FY2026",
            page_or_timestamp="Page 51",
            speaker="Controller",
            statement_text="Fourth-quarter GAAP revenue was $46.9 million.",
        ),
        ExtractedClaim(
            id="c-margin-q3-stmt",
            entity="OmniVise Holdings",
            metric="Operating Margin",
            value=18.4,
            currency_unit="percent",
            reporting_period="Q3 FY2026",
            source_document="Q3 FY2026 Earnings Call",
            page_or_timestamp="00:16:22",
            speaker="CFO",
            statement_text="Operating margin expanded to 18.4 percent.",
        ),
        ExtractedClaim(
            id="c-margin-q3-ar",
            entity="OmniVise Holdings",
            metric="Operating Margin",
            value=16.1,
            currency_unit="percent",
            reporting_period="Q3 FY2026",
            source_document="Annual Report FY2026",
            page_or_timestamp="Page 49",
            speaker="Independent Auditor",
            statement_text="GAAP operating margin was 16.1 percent.",
        ),
        ExtractedClaim(
            id="c-headcount-q3",
            entity="OmniVise Holdings",
            metric="Headcount",
            value=412,
            currency_unit="FTE",
            reporting_period="Q3 FY2026",
            source_document="HR Census Export",
            page_or_timestamp="Row 1",
            speaker="CHRO",
            statement_text="Period-end headcount was 412 full-time employees.",
        ),
        ExtractedClaim(
            id="c-headcount-call",
            entity="OmniVise Holdings",
            metric="Headcount",
            value=390,
            currency_unit="FTE",
            reporting_period="Q3 FY2026",
            source_document="Q3 FY2026 Earnings Call",
            page_or_timestamp="00:22:01",
            speaker="CEO — Priyanshi Aggarwal",
            statement_text="We ended the quarter with roughly 390 people.",
        ),
    ]

    seeded_docs = [
        IngestedDocument(
            id="doc-call-q3",
            filename="Q3_FY2026_Earnings_Call.txt",
            status="processed",
            progress=100,
            summary="Executive remarks on Q3 revenue, margin, and headcount.",
            ai_engine="Groq Engine Active",
            pages=[
                DocumentPage(
                    page=1,
                    text="CEO: Good morning. Revenue reached $45 million. We remain confident in the full-year outlook. Operating margin expanded to 18.4 percent on a non-GAAP basis.",
                ),
                DocumentPage(
                    page=2,
                    text="CFO: Cash conversion remains healthy. We ended the quarter with roughly 390 people after the hiring pause in July.",
                ),
            ],
            claim_ids=["c-rev-q3-stmt", "c-margin-q3-stmt", "c-headcount-call"],
        ),
        IngestedDocument(
            id="doc-ar",
            filename="Annual_Report_FY2026.pdf",
            status="processed",
            progress=100,
            summary="Audited GAAP financials for OmniVise Holdings.",
            ai_engine="Groq Engine Active",
            pages=[
                DocumentPage(
                    page=47,
                    text="Note 4 — Revenue. Consolidated GAAP revenue for the third quarter was $41.2 million, recognized under ASC 606.",
                ),
                DocumentPage(
                    page=49,
                    text="GAAP operating income of $6.6 million implies an operating margin of 16.1 percent for Q3 FY2026.",
                ),
            ],
            claim_ids=["c-rev-q3-ar", "c-margin-q3-ar"],
        ),
        IngestedDocument(
            id="doc-10q-q2",
            filename="Form_10Q_Q2_FY2026.pdf",
            status="processed",
            progress=100,
            summary="Q2 10-Q revenue recognition footnote.",
            pages=[
                DocumentPage(
                    page=14,
                    text="Revenue recognized under ASC 606 was $40.8 million for the three months ended.",
                )
            ],
            claim_ids=["c-rev-q2-10q"],
        ),
        IngestedDocument(
            id="doc-hr",
            filename="HR_Census_Q3.csv",
            status="processed",
            progress=100,
            summary="Period-end FTE census.",
            pages=[DocumentPage(page=1, text="Period-end headcount,412 FTE,OmniVise Holdings,Q3 FY2026")],
            claim_ids=["c-headcount-q3"],
        ),
    ]

    seeded_discrepancies = [
        Discrepancy(
            id="D-0241",
            metric="Revenue",
            entity="OmniVise Holdings",
            claimed_value=45.0,
            reported_value=41.2,
            difference=-3.8,
            percentage_diff=-8.45,
            severity=Severity.critical,
            confidence_score=0.96,
            contradiction_type=ContradictionType.numerical,
            status=DiscrepancyStatus.open,
            evidence_source="Annual Report FY2026 — Page 47",
            claimed_claim_id="c-rev-q3-stmt",
            reported_claim_id="c-rev-q3-ar",
            executive_statement="Revenue reached $45 million.",
            source_evidence="Consolidated GAAP revenue for Q3 was $41.2 million.",
            claimed_source="Q3 FY2026 Earnings Call — 12:43",
            reported_source="Annual Report FY2026 — Page 47",
            reporting_period="Q3 FY2026",
            currency_unit="USD millions",
            alignment={
                "entity": True,
                "metric": True,
                "period": True,
                "currency": True,
                "accounting_definition": False,
                "note": "Claim appears non-GAAP / rounded; evidence is audited GAAP.",
            },
            timestamp="00:04:12",
        ),
        Discrepancy(
            id="D-0242",
            metric="Operating Margin",
            entity="OmniVise Holdings",
            claimed_value=18.4,
            reported_value=16.1,
            difference=-2.3,
            percentage_diff=-12.5,
            severity=Severity.high,
            confidence_score=0.91,
            contradiction_type=ContradictionType.semantic,
            status=DiscrepancyStatus.in_review,
            evidence_source="Annual Report FY2026 — Page 49",
            claimed_claim_id="c-margin-q3-stmt",
            reported_claim_id="c-margin-q3-ar",
            executive_statement="Operating margin expanded to 18.4 percent.",
            source_evidence="GAAP operating margin was 16.1 percent.",
            claimed_source="Q3 FY2026 Earnings Call — 00:16:22",
            reported_source="Annual Report FY2026 — Page 49",
            reporting_period="Q3 FY2026",
            currency_unit="percent",
            alignment={
                "entity": True,
                "metric": True,
                "period": True,
                "currency": True,
                "accounting_definition": False,
                "note": "Non-GAAP vs GAAP operating margin.",
            },
            timestamp="00:16:22",
        ),
        Discrepancy(
            id="D-0243",
            metric="Revenue",
            entity="OmniVise Holdings",
            claimed_value=41.1,
            reported_value=40.8,
            difference=-0.3,
            percentage_diff=-0.73,
            severity=Severity.medium,
            confidence_score=0.88,
            contradiction_type=ContradictionType.numerical,
            status=DiscrepancyStatus.open,
            evidence_source="Form 10-Q Q2 FY2026 — Page 14",
            claimed_claim_id="c-rev-q2-stmt",
            reported_claim_id="c-rev-q2-10q",
            executive_statement="We delivered $41.1 million of revenue in Q2.",
            source_evidence="Revenue recognized under ASC 606 was $40.8 million.",
            claimed_source="Q2 FY2026 Earnings Call — 00:11:02",
            reported_source="Form 10-Q Q2 FY2026 — Page 14",
            reporting_period="Q2 FY2026",
            currency_unit="USD millions",
            alignment={
                "entity": True,
                "metric": True,
                "period": True,
                "currency": True,
                "accounting_definition": True,
            },
            timestamp="00:11:02",
        ),
        Discrepancy(
            id="D-0244",
            metric="Headcount",
            entity="OmniVise Holdings",
            claimed_value=390,
            reported_value=412,
            difference=22,
            percentage_diff=5.64,
            severity=Severity.medium,
            confidence_score=0.84,
            contradiction_type=ContradictionType.temporal,
            status=DiscrepancyStatus.needs_review,
            evidence_source="HR Census Export — Row 1",
            claimed_claim_id="c-headcount-call",
            reported_claim_id="c-headcount-q3",
            executive_statement="We ended the quarter with roughly 390 people.",
            source_evidence="Period-end headcount was 412 full-time employees.",
            claimed_source="Q3 FY2026 Earnings Call — 00:22:01",
            reported_source="HR Census Export — Row 1",
            reporting_period="Q3 FY2026",
            currency_unit="FTE",
            alignment={
                "entity": True,
                "metric": True,
                "period": True,
                "currency": True,
                "accounting_definition": True,
                "note": "Possible mid-quarter vs period-end snapshot mismatch.",
            },
            timestamp="00:22:01",
        ),
    ]

    claims.extend(seeded_claims)
    documents.extend(seeded_docs)
    discrepancies.extend(seeded_discrepancies)
    add_event("ingest", "Annual_Report_FY2026.pdf processed (2 pages)")
    add_event("claim", "Extracted Revenue $45.0M from Q3 earnings call")
    add_event("alert", "Critical contradiction: Q3 Revenue $45.0M vs $41.2M", "Critical", "D-0241")
    add_event("alert", "High severity: Operating Margin 18.4% vs 16.1%", "High", "D-0242")


def stats() -> StatsResponse:
    critical = sum(1 for d in discrepancies if d.severity == Severity.critical)
    closed = {"Confirmed", "Dismissed"}
    remaining = sum(1 for d in discrepancies if d.status.value not in closed)
    total = max(len(discrepancies), 1)
    completion = int(round(100 * (total - remaining) / total)) if discrepancies else 100
    sources = len({c.source_document for c in claims})
    return StatsResponse(
        documents_processed=len(documents),
        claims_extracted=len(claims),
        discrepancies_detected=len(discrepancies),
        critical_count=critical,
        review_completion=completion,
        items_remaining=remaining,
        sources=sources,
    )


def upsert_claim(claim: ExtractedClaim) -> ExtractedClaim:
    with _lock:
        claims.append(claim)
        add_event("claim", f"Extracted {claim.metric} {claim.value} {claim.currency_unit} ({claim.reporting_period})")
        return claim


def upsert_document(doc: IngestedDocument) -> IngestedDocument:
    with _lock:
        documents.insert(0, doc)
        add_event("ingest", f"{doc.filename} {doc.status} ({doc.progress}%)")
        return doc


def upsert_discrepancy(item: Discrepancy) -> Discrepancy:
    with _lock:
        existing = next((d for d in discrepancies if d.id == item.id), None)
        if existing:
            discrepancies.remove(existing)
        discrepancies.insert(0, item)
        add_event("alert", f"{item.severity.value} {item.contradiction_type.value}: {item.metric}", item.severity.value, item.id)
        return item


def update_status(discrepancy_id: str, status: DiscrepancyStatus) -> Optional[Discrepancy]:
    with _lock:
        for item in discrepancies:
            if item.id == discrepancy_id:
                item.status = status
                item.updated_at = datetime.utcnow()
                add_event("review", f"{discrepancy_id} marked {status.value}", related_id=discrepancy_id)
                return item
        return None


def get_claim(claim_id: str) -> Optional[ExtractedClaim]:
    return next((c for c in claims if c.id == claim_id), None)


seed()
