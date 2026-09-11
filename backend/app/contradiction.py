import json
import os
import re
from typing import Any, Dict, List, Optional, Tuple
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
                        "note": "",
                    },
                }
            )
    return found


def _extract_unit_and_scale(text: str, metadata: Optional[dict] = None) -> Tuple[str, float]:
    text = (text or "").lower()
    meta = metadata or {}
    unit_hint = str(meta.get("unit") or meta.get("currency_unit") or "").lower()

    if "crore" in unit_hint or re.search(r"\b(?:crores?|cr)\b", text):
        return "crore", 1e7
    if "lakh" in unit_hint or "lac" in unit_hint or re.search(r"\b(?:lakhs?|lacs?)\b", text):
        return "lakh", 1e5
    if "billion" in unit_hint or re.search(r"\b(?:billions?|bn)\b", text) or re.search(r"\b[0-9.]+\s*b\b", text):
        return "billion", 1e9
    if "million" in unit_hint or re.search(r"\b(?:millions?|mn)\b", text) or re.search(r"\b[0-9.]+\s*m\b", text):
        return "million", 1e6
    if "thousand" in unit_hint or re.search(r"\b(?:thousands?|k)\b", text) or re.search(r"\b[0-9.]+\s*k\b", text):
        return "thousand", 1e3
    return "base", 1.0


def _normalize_evidence_value(val: Optional[float], text: str, metadata: Optional[dict] = None) -> Tuple[Optional[float], str]:
    if val is None:
        match = re.search(r"[\$€£₹]?\s*([0-9]{1,3}(?:,[0-9]{3})+(?:\.[0-9]+)?|[0-9]+(?:\.[0-9]+)?)", text)
        if match:
            try:
                val = float(match.group(1).replace(",", ""))
            except ValueError:
                return None, "base"
        else:
            return None, "base"

    try:
        val = float(val)
    except (TypeError, ValueError):
        return None, "base"

    unit_name, scale = _extract_unit_and_scale(text, metadata)
    if scale == 1.0:
        return val, unit_name

    # Check if value was already scaled in the raw object
    matches = re.findall(r"([0-9]+(?:\.[0-9]+)?)", text.replace(",", ""))
    for m in matches:
        try:
            num = float(m)
            if num > 0 and abs(val - num * scale) < 0.01 * (num * scale):
                return val, unit_name
        except ValueError:
            pass

    if val < scale:
        return val * scale, unit_name
    return val, unit_name


def _clean_entity_str(entity: Optional[str]) -> str:
    if not entity:
        return ""
    ent = entity.lower().strip()
    ent = re.sub(r"[^\w\s]", " ", ent)
    ent = re.sub(r"\b(?:corp|corporation|inc|incorporated|llc|ltd|limited|co|company|holdings|group|technologies|technology|semiconductor|tech)\b", "", ent)
    return " ".join(ent.split())


def _entities_align(ent_a: Optional[str], ent_b: Optional[str], text_a: str, text_b: str) -> bool:
    ca = _clean_entity_str(ent_a)
    cb = _clean_entity_str(ent_b)
    if ca and cb:
        if ca == cb or ca in cb or cb in ca:
            return True

    # Fallback to checking mentions in respective texts
    if ca and len(ca) > 2 and ca in text_b.lower():
        return True
    if cb and len(cb) > 2 and cb in text_a.lower():
        return True
    return False


def _extract_metric_name(claim: str, raw_text: str = "", metadata: Optional[dict] = None) -> str:
    meta = metadata or {}
    for key in ("metric", "target_metric", "category"):
        if meta.get(key):
            return str(meta[key]).lower().strip()

    combined = f"{claim} {raw_text}".lower()

    if any(w in combined for w in ["guided revenue", "guidance", "outlook"]):
        return "revenue"
    if any(w in combined for w in ["revenue", "sales", "topline", "top-line"]):
        return "revenue"
    if any(w in combined for w in ["net bookings", "bookings"]):
        return "bookings"
    if any(w in combined for w in ["unit price", "po-", "inv-", "invoice", "purchase order", "cost per unit"]):
        return "unit_price"
    if any(w in combined for w in ["operating margin", "gross margin", "margin"]):
        return "margin"
    if any(w in combined for w in ["net income", "profit", "earnings", "ebitda"]):
        return "net_income"
    if any(w in combined for w in ["headcount", "fte"]):
        return "headcount"
    if any(w in combined for w in ["milestone", "sla", "delivery"]):
        return "milestone"
    return "general"


def _extract_temporal_period(date_str: Optional[str], text: str, metadata: Optional[dict] = None) -> Tuple[Optional[str], Optional[str]]:
    meta = metadata or {}
    q_hint = meta.get("quarter") or meta.get("reporting_period")
    if q_hint:
        qm = re.search(r"(q[1-4])", str(q_hint).lower())
        ym = re.search(r"(20\d{2})", str(q_hint))
        if qm:
            return qm.group(1).upper(), (ym.group(1) if ym else None)

    combined = f"{date_str or ''} {text}".lower()
    qm = re.search(r"\b(q[1-4])\b", combined)
    quarter = qm.group(1).upper() if qm else None

    ym = re.search(r"\b(20\d{2})\b", combined)
    year = ym.group(1) if ym else None

    if date_str and not quarter:
        iso_m = re.search(r"\d{4}-(\d{2})-\d{2}", date_str)
        if iso_m:
            month = int(iso_m.group(1))
            quarter = f"Q{(month - 1) // 3 + 1}"
        if not year:
            iso_y = re.search(r"(\d{4})-\d{2}-\d{2}", date_str)
            if iso_y:
                year = iso_y.group(1)

    return quarter, year


def _to_evidence_dict(item: Any) -> dict:
    if hasattr(item, "model_dump"):
        return item.model_dump()
    if isinstance(item, dict):
        if "evidence" in item:
            ev = item["evidence"]
            if hasattr(ev, "model_dump"):
                return ev.model_dump()
            if isinstance(ev, dict):
                return dict(ev)
        return dict(item)
    return {}


def _analyze_pair(rec_a: dict, rec_b: dict) -> Optional[dict]:
    id_a = str(rec_a.get("id") or "ev-a")
    id_b = str(rec_b.get("id") or "ev-b")

    text_a = f"{rec_a.get('claim', '')} {rec_a.get('raw_text_preview', '')} {rec_a.get('source', '')}"
    text_b = f"{rec_b.get('claim', '')} {rec_b.get('raw_text_preview', '')} {rec_b.get('source', '')}"

    ent_aligned = _entities_align(rec_a.get("entity"), rec_b.get("entity"), text_a, text_b)
    metric_a = _extract_metric_name(rec_a.get("claim", ""), rec_a.get("raw_text_preview", ""), rec_a.get("metadata"))
    metric_b = _extract_metric_name(rec_b.get("claim", ""), rec_b.get("raw_text_preview", ""), rec_b.get("metadata"))
    metric_aligned = (metric_a == metric_b) or (metric_a in ["revenue", "bookings"] and metric_b in ["revenue", "bookings"])

    # If neither entity nor metric align, these evidence items are discussing different things
    if not ent_aligned and not metric_aligned:
        return None

    qa, ya = _extract_temporal_period(rec_a.get("date"), text_a, rec_a.get("metadata"))
    qb, yb = _extract_temporal_period(rec_b.get("date"), text_b, rec_b.get("metadata"))

    temporal_aligned = True
    if (qa and qb and qa != qb) or (ya and yb and ya != yb):
        temporal_aligned = False

    norm_a, unit_a = _normalize_evidence_value(rec_a.get("value"), text_a, rec_a.get("metadata"))
    norm_b, unit_b = _normalize_evidence_value(rec_b.get("value"), text_b, rec_b.get("metadata"))

    period_str = f"{qa or ''} {ya or ''}".strip()
    if not period_str and (qb or yb):
        period_str = f"{qb or ''} {yb or ''}".strip()
    period_label = period_str or "unspecified period"
    entity_label = rec_a.get("entity") or rec_b.get("entity") or "Entity"

    # 1. Check for DERIVED-FROM
    derivation_terms = [
        "derived from", "calculated from", "computed from", "variance vs",
        "difference between", "formula", "reconciliation cell", "variance per unit", "rate variance"
    ]
    ref_b_mentions_a = any(term in text_b.lower() for term in derivation_terms) and (
        id_a.lower() in text_b.lower()
        or str(rec_a.get("source", "")).lower() in text_b.lower()
        or str(rec_a.get("location", "")).lower() in text_b.lower()
    )
    ref_a_mentions_b = any(term in text_a.lower() for term in derivation_terms) and (
        id_b.lower() in text_a.lower()
        or str(rec_b.get("source", "")).lower() in text_a.lower()
        or str(rec_b.get("location", "")).lower() in text_a.lower()
    )

    if ref_b_mentions_a:
        return {
            "evidence_a": id_a,
            "evidence_b": id_b,
            "evidence_a_id": id_a,
            "evidence_b_id": id_b,
            "classification": "DERIVED-FROM",
            "reason": f"Evidence {id_b} ({rec_b.get('source')}) derives calculations or variance from {id_a} ({rec_a.get('source')}).",
            "alignment": {"entity": ent_aligned, "metric": metric_aligned, "temporal": temporal_aligned, "unit": unit_a == unit_b},
            "normalized_value_a": norm_a,
            "normalized_value_b": norm_b,
        }
    if ref_a_mentions_b:
        return {
            "evidence_a": id_a,
            "evidence_b": id_b,
            "evidence_a_id": id_a,
            "evidence_b_id": id_b,
            "classification": "DERIVED-FROM",
            "reason": f"Evidence {id_a} ({rec_a.get('source')}) derives calculations or variance from {id_b} ({rec_b.get('source')}).",
            "alignment": {"entity": ent_aligned, "metric": metric_aligned, "temporal": temporal_aligned, "unit": unit_a == unit_b},
            "normalized_value_a": norm_a,
            "normalized_value_b": norm_b,
        }

    # 2. Check for SUPERSEDES
    ver_a_raw = str(rec_a.get("version") or "1.0")
    ver_b_raw = str(rec_b.get("version") or "1.0")
    supersede_terms = ["restated", "revised", "amendment", "amended", "supersedes", "replaces", "updated filing"]

    ver_a_match = re.search(r"(\d+(?:\.\d+)?)", ver_a_raw)
    ver_b_match = re.search(r"(\d+(?:\.\d+)?)", ver_b_raw)
    ver_a_num = float(ver_a_match.group(1)) if ver_a_match else 1.0
    ver_b_num = float(ver_b_match.group(1)) if ver_b_match else 1.0

    b_supersedes_a = (ver_b_num > ver_a_num) or any(t in text_b.lower() for t in supersede_terms)
    a_supersedes_b = (ver_a_num > ver_b_num) or any(t in text_a.lower() for t in supersede_terms)

    if ent_aligned and metric_aligned:
        if b_supersedes_a and not a_supersedes_b:
            return {
                "evidence_a": id_a,
                "evidence_b": id_b,
                "evidence_a_id": id_a,
                "evidence_b_id": id_b,
                "classification": "SUPERSEDES",
                "reason": f"Evidence {id_b} (version {ver_b_raw}) supersedes earlier evidence {id_a} (version {ver_a_raw}) for {entity_label} {metric_a}.",
                "alignment": {"entity": ent_aligned, "metric": metric_aligned, "temporal": temporal_aligned, "unit": unit_a == unit_b},
                "normalized_value_a": norm_a,
                "normalized_value_b": norm_b,
            }
        if a_supersedes_b and not b_supersedes_a:
            return {
                "evidence_a": id_a,
                "evidence_b": id_b,
                "evidence_a_id": id_a,
                "evidence_b_id": id_b,
                "classification": "SUPERSEDES",
                "reason": f"Evidence {id_a} (version {ver_a_raw}) supersedes earlier evidence {id_b} (version {ver_b_raw}) for {entity_label} {metric_a}.",
                "alignment": {"entity": ent_aligned, "metric": metric_aligned, "temporal": temporal_aligned, "unit": unit_a == unit_b},
                "normalized_value_a": norm_a,
                "normalized_value_b": norm_b,
            }

    # 3. Check for SUPPORTS vs CONTRADICTS
    if norm_a is not None and norm_b is not None:
        diff = abs(norm_a - norm_b)
        base = max(abs(norm_a), abs(norm_b))
        rel_diff = (diff / base) if base > 0 else 0.0

        if rel_diff < 0.01:
            return {
                "evidence_a": id_a,
                "evidence_b": id_b,
                "evidence_a_id": id_a,
                "evidence_b_id": id_b,
                "classification": "SUPPORTS",
                "reason": f"Both sources corroborate {metric_a} for {entity_label} ({period_label}) with matching normalized value ~{norm_a:,.2f}.",
                "alignment": {"entity": ent_aligned, "metric": metric_aligned, "temporal": temporal_aligned, "unit": unit_a == unit_b},
                "normalized_value_a": norm_a,
                "normalized_value_b": norm_b,
            }
        elif temporal_aligned and ent_aligned and metric_aligned:
            return {
                "evidence_a": id_a,
                "evidence_b": id_b,
                "evidence_a_id": id_a,
                "evidence_b_id": id_b,
                "classification": "CONTRADICTS",
                "reason": f"Conflicting {metric_a} values for {entity_label} ({period_label}): {rec_a.get('source')} reports {norm_a:,.2f} vs {rec_b.get('source')} reports {norm_b:,.2f} (diff: {diff:,.2f}, {rel_diff*100:.1f}%).",
                "alignment": {"entity": ent_aligned, "metric": metric_aligned, "temporal": temporal_aligned, "unit": unit_a == unit_b},
                "normalized_value_a": norm_a,
                "normalized_value_b": norm_b,
            }

    # 4. Fallback: UNRESOLVED
    if ent_aligned and metric_aligned:
        return {
            "evidence_a": id_a,
            "evidence_b": id_b,
            "evidence_a_id": id_a,
            "evidence_b_id": id_b,
            "classification": "UNRESOLVED",
            "reason": f"Both items discuss {entity_label} {metric_a}, but values or temporal alignment cannot be conclusively reconciled.",
            "alignment": {"entity": ent_aligned, "metric": metric_aligned, "temporal": temporal_aligned, "unit": unit_a == unit_b},
            "normalized_value_a": norm_a,
            "normalized_value_b": norm_b,
        }

    return None


def analyze_evidence_relationships(evidence_list: list) -> List[dict]:
    """Analyze cross-source relationships between pairs of evidence items.

    Classifies relationships as SUPPORTS, CONTRADICTS, SUPERSEDES, DERIVED-FROM, or UNRESOLVED.
    """
    if not evidence_list or len(evidence_list) < 2:
        return []

    records = [_to_evidence_dict(item) for item in evidence_list]
    relationships: List[dict] = []
    seen_pairs = set()

    for i in range(len(records)):
        for j in range(i + 1, len(records)):
            rec_a = records[i]
            rec_b = records[j]
            id_a = str(rec_a.get("id") or f"idx-{i}")
            id_b = str(rec_b.get("id") or f"idx-{j}")

            pair_key = tuple(sorted([id_a, id_b]))
            if pair_key in seen_pairs:
                continue
            seen_pairs.add(pair_key)

            rel = _analyze_pair(rec_a, rec_b)
            if rel:
                relationships.append(rel)

    return relationships
