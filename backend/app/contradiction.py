import json
import os
import re
from typing import List, Tuple
from uuid import uuid4

from groq import Groq

from app.schemas import ContradictionType, Discrepancy, DiscrepancyStatus, ExtractedClaim, Severity
from app import store

GROQ_MODEL = "llama-3.3-70b-versatile"

EXTRACTION_SYSTEM_PROMPT = """You are OmniVise Core AI, extracting structured financial and operational claims.
Return ONLY valid JSON:
{"claims":[{"entity","metric","value","currency_unit","reporting_period","source_document","page_or_timestamp","speaker","statement_text","confidence_score"}]}
value must be a number. Keep reporting_period like Q1 FY2026 when possible.
"""

CONTRADICTION_SYSTEM_PROMPT = """You are the OmniVise Contradiction Engine (Llama-3.3-70b).

Before declaring ANY contradiction you MUST check alignment on ALL five dimensions:
1. Entity — same legal entity / reporting unit (not a subsidiary vs consolidated mix-up).
2. Metric — identical KPI, not a related proxy (e.g. bookings ≠ revenue).
3. Period — identical reporting_period (Q3 ≠ FY; YTD ≠ quarter).
4. Currency / Unit — same currency and scale (USD millions ≠ EUR thousands).
5. Accounting Definitions — GAAP vs non-GAAP, adjusted vs reported, ASC 606 recognition, FTE vs headcount.

If any dimension fails, do NOT emit a contradiction. Emit alignment notes instead.

contradiction_type must be one of: Numerical, Temporal, Semantic.
severity must be one of: Critical, High, Medium, Low.

Return ONLY JSON:
{"discrepancies":[{
  "claimed_claim_id","reported_claim_id","metric","entity","claimed_value","reported_value",
  "difference","percentage_diff","severity","confidence_score","contradiction_type",
  "evidence_source","executive_statement","source_evidence","reporting_period","currency_unit",
  "alignment":{"entity":true,"metric":true,"period":true,"currency":true,"accounting_definition":true,"note":""}
}]}
"""


def _client() -> Groq:
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise RuntimeError("GROQ_API_KEY missing")
    return Groq(api_key=api_key)


def _parse_json(text: str) -> dict:
    text = (text or "").strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        match = re.search(r"\{[\s\S]*\}", text)
        if not match:
            return {}
        try:
            return json.loads(match.group(0))
        except json.JSONDecodeError:
            return {}


def extract_claims(document_name: str, text: str) -> Tuple[List[ExtractedClaim], str]:
    engine = "Heuristic extractor (Groq offline)"
    raw_claims: List[dict] = []
    if os.getenv("GROQ_API_KEY"):
        try:
            completion = _client().chat.completions.create(
                model=GROQ_MODEL,
                temperature=0.1,
                response_format={"type": "json_object"},
                messages=[
                    {"role": "system", "content": EXTRACTION_SYSTEM_PROMPT},
                    {
                        "role": "user",
                        "content": f"Document: {document_name}\n\nContent:\n{text[:12000]}",
                    },
                ],
            )
            payload = _parse_json(completion.choices[0].message.content or "")
            raw_claims = payload.get("claims") or []
            engine = "Groq llama-3.3-70b-versatile"
        except Exception as exc:
            engine = f"Groq Error: {exc}"
            raw_claims = []

    if not raw_claims:
        raw_claims = _heuristic_extract(document_name, text)

    extracted: List[ExtractedClaim] = []
    for item in raw_claims:
        try:
            extracted.append(
                ExtractedClaim(
                    id=f"c-{uuid4().hex[:10]}",
                    entity=str(item.get("entity") or "Unknown entity"),
                    metric=str(item.get("metric") or "Unspecified metric"),
                    value=float(item.get("value") or 0),
                    currency_unit=str(item.get("currency_unit") or "USD"),
                    reporting_period=str(item.get("reporting_period") or "Unspecified"),
                    source_document=str(item.get("source_document") or document_name),
                    page_or_timestamp=str(item.get("page_or_timestamp") or "n/a"),
                    speaker=str(item.get("speaker") or "Unknown"),
                    statement_text=str(item.get("statement_text") or text[:280]),
                    confidence_score=float(item.get("confidence_score") or 0.7),
                )
            )
        except (TypeError, ValueError):
            continue
    return extracted, engine


def detect_contradictions(new_claims: List[ExtractedClaim]) -> Tuple[List[Discrepancy], str]:
    corpus = [c.model_dump(mode="json") for c in store.claims]
    incoming = [c.model_dump(mode="json") for c in new_claims]
    engine = "Heuristic contradiction engine"
    raw: List[dict] = []

    if os.getenv("GROQ_API_KEY") and incoming:
        try:
            completion = _client().chat.completions.create(
                model=GROQ_MODEL,
                temperature=0.0,
                response_format={"type": "json_object"},
                messages=[
                    {"role": "system", "content": CONTRADICTION_SYSTEM_PROMPT},
                    {
                        "role": "user",
                        "content": json.dumps({"existing_claims": corpus, "new_claims": incoming}, default=str)[:20000],
                    },
                ],
            )
            payload = _parse_json(completion.choices[0].message.content or "")
            raw = payload.get("discrepancies") or []
            engine = "Groq llama-3.3-70b-versatile"
        except Exception as exc:
            engine = f"Groq Error: {exc}"
            raw = []

    if not raw:
        raw = _heuristic_contradictions(new_claims)
        if "Groq" not in engine:
            engine = "Heuristic contradiction engine"

    results: List[Discrepancy] = []
    for item in raw:
        try:
            claimed = float(item.get("claimed_value") or 0)
            reported = float(item.get("reported_value") or 0)
            difference = float(item.get("difference") if item.get("difference") is not None else reported - claimed)
            pct = float(
                item.get("percentage_diff")
                if item.get("percentage_diff") is not None
                else (0 if claimed == 0 else round((difference / claimed) * 100, 2))
            )
            results.append(
                Discrepancy(
                    id=f"D-{uuid4().hex[:6].upper()}",
                    metric=str(item.get("metric") or "Metric"),
                    entity=str(item.get("entity") or "Unknown"),
                    claimed_value=claimed,
                    reported_value=reported,
                    difference=difference,
                    percentage_diff=pct,
                    severity=_coerce_severity(item.get("severity")),
                    confidence_score=float(item.get("confidence_score") or 0.8),
                    contradiction_type=_coerce_type(item.get("contradiction_type")),
                    status=DiscrepancyStatus.open,
                    evidence_source=str(item.get("evidence_source") or ""),
                    claimed_claim_id=item.get("claimed_claim_id"),
                    reported_claim_id=item.get("reported_claim_id"),
                    executive_statement=str(item.get("executive_statement") or ""),
                    source_evidence=str(item.get("source_evidence") or ""),
                    claimed_source="",
                    reported_source=str(item.get("evidence_source") or ""),
                    reporting_period=str(item.get("reporting_period") or ""),
                    currency_unit=str(item.get("currency_unit") or ""),
                    alignment=item.get("alignment") or {},
                    timestamp=store._now_clock(),
                )
            )
        except (TypeError, ValueError):
            continue
    return results, engine


def _coerce_severity(value) -> Severity:
    try:
        return Severity(str(value))
    except ValueError:
        return Severity.medium


def _coerce_type(value) -> ContradictionType:
    try:
        return ContradictionType(str(value))
    except ValueError:
        return ContradictionType.numerical


def _heuristic_extract(document_name: str, text: str) -> List[dict]:
    money = re.findall(
        r"(revenue|margin|headcount|arr|ebitda)[^\n.]{0,40}?\$?\s*([0-9]+(?:\.[0-9]+)?)\s*(million|percent|%|fte)?",
        text,
        flags=re.I,
    )
    claims = []
    for metric, value, unit in money[:8]:
        unit_norm = unit or "USD millions"
        if unit in {"%", "percent"}:
            unit_norm = "percent"
        claims.append(
            {
                "entity": "OmniVise Holdings",
                "metric": metric.title(),
                "value": float(value),
                "currency_unit": unit_norm,
                "reporting_period": "Unspecified",
                "source_document": document_name,
                "page_or_timestamp": "Page 1",
                "speaker": "Document",
                "statement_text": text[:240],
                "confidence_score": 0.62,
            }
        )
    if not claims:
        claims.append(
            {
                "entity": "OmniVise Holdings",
                "metric": "Document ingested",
                "value": 1,
                "currency_unit": "count",
                "reporting_period": "Unspecified",
                "source_document": document_name,
                "page_or_timestamp": "Page 1",
                "speaker": "System",
                "statement_text": text[:240] or "Empty document",
                "confidence_score": 0.4,
            }
        )
    return claims


def _aligned(a: ExtractedClaim, b: ExtractedClaim) -> bool:
    return (
        a.entity.lower() == b.entity.lower()
        and a.metric.lower() == b.metric.lower()
        and a.reporting_period.lower() == b.reporting_period.lower()
        and a.currency_unit.lower() == b.currency_unit.lower()
        and a.id != b.id
    )


def _heuristic_contradictions(new_claims: List[ExtractedClaim]) -> List[dict]:
    found: List[dict] = []
    pool = list(store.claims) + list(new_claims)
    seen = set()
    for left in new_claims:
        for right in pool:
            if not _aligned(left, right):
                continue
            if abs(left.value - right.value) < 1e-9:
                continue
            key = tuple(sorted([left.id, right.id]))
            if key in seen:
                continue
            seen.add(key)
            claimed, reported = left, right
            diff = reported.value - claimed.value
            pct = 0 if claimed.value == 0 else round((diff / claimed.value) * 100, 2)
            abs_pct = abs(pct)
            severity = "Low"
            if abs_pct >= 8:
                severity = "Critical"
            elif abs_pct >= 3:
                severity = "High"
            elif abs_pct >= 1:
                severity = "Medium"
            found.append(
                {
                    "claimed_claim_id": claimed.id,
                    "reported_claim_id": reported.id,
                    "metric": claimed.metric,
                    "entity": claimed.entity,
                    "claimed_value": claimed.value,
                    "reported_value": reported.value,
                    "difference": round(diff, 4),
                    "percentage_diff": pct,
                    "severity": severity,
                    "confidence_score": 0.82,
                    "contradiction_type": "Numerical",
                    "evidence_source": f"{reported.source_document} — {reported.page_or_timestamp}",
                    "executive_statement": claimed.statement_text,
                    "source_evidence": reported.statement_text,
                    "reporting_period": claimed.reporting_period,
                    "currency_unit": claimed.currency_unit,
                    "alignment": {
                        "entity": True,
                        "metric": True,
                        "period": True,
                        "currency": True,
                        "accounting_definition": True,
                    },
                }
            )
    return found
