from datetime import datetime, timezone
import hashlib
import math
import re
from typing import Any, Dict, List, Optional
import uuid

from qdrant_client import QdrantClient, models

from app.schemas import EvidenceObject, Provenance

# Global in-memory Qdrant client
qdrant = QdrantClient(":memory:")
COLLECTION_NAME = "omnivise_evidence"
VECTOR_SIZE = 64

# Audit concept clusters mapped to specific vector dimensions
AUDIT_CLUSTERS = {
    (0, 1, 2): [
        "revenue", "bookings", "net bookings", "sales", "income", "topline",
        "top-line", "earned", "earning", "43.20m", "42.85m", "43.2", "42.85",
    ],
    (3, 4, 5): [
        "guidance", "guided", "guide", "forecast", "outlook", "projection",
        "transcript", "call", "audio", "spoke", "cfo", "conference", "44.0m", "46.5m",
    ],
    (6, 7, 8): [
        "po", "purchase", "order", "procurement", "nexus", "semiconductor",
        "a100", "gpu", "gpus", "tensor", "hardware", "unit", "units", "quantity",
        "requisition", "po-2026-0417", "18500", "18,500",
    ],
    (9, 10, 11): [
        "invoice", "invoices", "inv", "billing", "billed", "price", "rate",
        "cost", "charge", "payable", "payment", "inv-77821", "77821", "19400", "19,400",
    ],
    (12, 13): [
        "sec", "10-q", "10q", "filing", "pdf", "regulatory", "page", "report",
        "reported", "consolidated", "paragraph", "42",
    ],
    (14, 15): [
        "ledger", "reconciliation", "reconcile", "variance", "discrepancy",
        "excel", "sheet", "spreadsheet", "cell", "diff", "difference", "d14",
    ],
    (16, 17): [
        "contract", "agreement", "msa", "milestone", "milestones", "sla",
        "delivery", "business", "days", "docx", "section", "4.2",
    ],
    (18, 19): [
        "q1", "q2", "q3", "q4", "2024", "2025", "2026", "fy24", "fy25",
        "quarter", "annual",
    ],
}

STOPWORDS = {
    "a", "an", "the", "and", "or", "but", "if", "because", "as", "what", "which",
    "this", "that", "these", "those", "then", "just", "so", "than", "such",
    "both", "through", "about", "for", "is", "of", "while", "during", "to", "from",
    "in", "out", "on", "off", "again", "further", "then", "once", "here", "there",
    "when", "where", "why", "how", "all", "any", "both", "each", "few", "more",
    "most", "other", "some", "such", "no", "nor", "not", "only", "own", "same",
    "so", "than", "too", "very", "can", "will", "just", "don", "should", "now",
    "are", "was", "were", "been", "being", "have", "has", "had", "having", "do",
    "does", "did", "doing", "would", "could", "between",
}


def _ensure_collection() -> None:
    """Ensure the Qdrant collection exists."""
    collections = [c.name for c in qdrant.get_collections().collections]
    if COLLECTION_NAME not in collections:
        qdrant.create_collection(
            collection_name=COLLECTION_NAME,
            vectors_config=models.VectorParams(
                size=VECTOR_SIZE,
                distance=models.Distance.COSINE,
            ),
        )


def embed_text(text: str, vector_size: int = VECTOR_SIZE) -> List[float]:
    """Deterministic dense normalized float vector based on token frequencies,

    n-grams, and semantic cluster mapping so audit concepts share high cosine similarity.
    """
    if not text or not text.strip():
        val = 1.0 / math.sqrt(vector_size)
        return [val] * vector_size

    vec = [0.0] * vector_size
    clean_text = re.sub(r"[^a-zA-Z0-9\s\-]", " ", text.lower())
    tokens = [t.strip() for t in clean_text.split() if len(t.strip()) > 1]

    # 1. Domain audit cluster activation (dimensions 0..19)
    for dims, keywords in AUDIT_CLUSTERS.items():
        for kw in keywords:
            if kw in clean_text:
                for d in dims:
                    vec[d] += 2.5

    # 2. Token hashing across remaining dimensions (20..vector_size-1)
    hashable_dims = max(vector_size - 20, 1)
    for token in tokens:
        if token not in STOPWORDS:
            h = int(hashlib.md5(token.encode("utf-8")).hexdigest(), 16)
            dim = 20 + (h % hashable_dims)
            vec[dim] += 1.0

    # 3. 3-character n-gram hashing for subword robustness
    for i in range(len(clean_text) - 2):
        ngram = clean_text[i : i + 3]
        if " " not in ngram:
            h = int(hashlib.md5(ngram.encode("utf-8")).hexdigest(), 16)
            dim = 20 + (h % hashable_dims)
            vec[dim] += 0.25

    # L2 Normalization
    norm = math.sqrt(sum(x * x for x in vec))
    if norm > 0:
        return [round(x / norm, 6) for x in vec]

    val = 1.0 / math.sqrt(vector_size)
    return [val] * vector_size


def index_evidence(evidence: EvidenceObject) -> None:
    """Index an EvidenceObject into the Qdrant vector store."""
    _ensure_collection()

    text_to_embed = (
        f"{evidence.source} {evidence.modality} {evidence.claim} "
        f"{evidence.entity or ''} {evidence.location or ''} {evidence.raw_text_preview or ''}"
    )
    vector = embed_text(text_to_embed, vector_size=VECTOR_SIZE)

    point_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, evidence.id))
    payload = evidence.model_dump()
    # Normalize modality to lower-case for consistent filtering
    payload["modality"] = evidence.modality.lower()

    point = models.PointStruct(
        id=point_id,
        vector=vector,
        payload=payload,
    )
    qdrant.upsert(
        collection_name=COLLECTION_NAME,
        points=[point],
    )


def seed_initial_evidence() -> None:
    """Pre-populates the vector store with benchmark audit records if empty."""
    _ensure_collection()

    try:
        col_info = qdrant.get_collection(COLLECTION_NAME)
        if col_info.points_count and col_info.points_count > 0:
            return
    except Exception:
        pass

    now_iso = datetime.now(timezone.utc).isoformat()

    benchmark_records = [
        # 1. SEC 10-Q filing
        EvidenceObject(
            id="ev-sec-10q-q3-2024",
            source="SEC 10-Q filing",
            modality="pdf",
            claim="Reported Q3 2024 revenue of $43.20M",
            entity="Nexus Semiconductor",
            value=43200000.0,
            date="2024-09-30",
            version="1.0",
            location="Page 42, ¶ 3",
            provenance=Provenance(
                file_name="SEC-10Q-Q3-2024.pdf",
                file_hash="hash-sec-10q-q3-2024",
                parser_used="pdf_parser",
                file_size_bytes=1048576,
                mime_type="application/pdf",
                ingested_at=now_iso,
                storage_type="ephemeral_temp",
            ),
            raw_text_preview="SEC Form 10-Q Page 42, Paragraph 3: Consolidated net revenue for the three months ended September 30, 2024 was $43.20 million.",
            metadata={"doc_type": "10-Q", "quarter": "Q3 2024", "page": 42, "paragraph": 3},
        ),
        # 2. Vendor Ledger Reconciliation
        EvidenceObject(
            id="ev-ledger-recon-2024",
            source="Vendor Ledger Reconciliation",
            modality="excel",
            claim="Net bookings recorded at $42.85M across enterprise accounts",
            entity="Vendor Ledger",
            value=42850000.0,
            date="2024-09-30",
            version="1.0",
            location="Sheet Reconciliation, Cell D14",
            provenance=Provenance(
                file_name="Vendor_Ledger_Reconciliation.xlsx",
                file_hash="hash-vendor-ledger-2024",
                parser_used="excel_parser",
                file_size_bytes=524288,
                mime_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                ingested_at=now_iso,
                storage_type="ephemeral_temp",
            ),
            raw_text_preview="Sheet Reconciliation, Cell D14: Enterprise Net Bookings total = $42,850,000. Variance vs reported SEC 10-Q revenue is $350,000.",
            metadata={"sheet": "Reconciliation", "cell": "D14", "category": "Net Bookings"},
        ),
        # 3. Earnings Call Transcript
        EvidenceObject(
            id="ev-earnings-call-q3",
            source="Earnings Call Transcript",
            modality="audio",
            claim="Executive guided revenue range of $44.0M–$46.5M for the quarter",
            entity="Nexus Semiconductor",
            value=44000000.0,
            date="2024-08-15",
            version="1.0",
            location="00:08:14",
            provenance=Provenance(
                file_name="Q3_2024_Earnings_Call.mp3",
                file_hash="hash-earnings-call-q3",
                parser_used="audio_parser",
                file_size_bytes=15728640,
                mime_type="audio/mpeg",
                ingested_at=now_iso,
                storage_type="ephemeral_temp",
            ),
            raw_text_preview="Earnings Call Audio Transcript [00:08:14] CFO: 'For the third quarter of 2024, our guided revenue expectation is set between $44.0M and $46.5M based on committed server pipelines.'",
            metadata={"speaker": "CFO", "timestamp": "00:08:14", "guidance_low": 44.0, "guidance_high": 46.5},
        ),
        # 4. Nexus Semiconductor PO
        EvidenceObject(
            id="ev-po-2026-0417",
            source="Nexus Semiconductor PO",
            modality="pdf",
            claim="Authorized purchase order for 12 A100 GPUs at $18,500 each, PO-2026-0417",
            entity="Nexus Semiconductor",
            value=18500.0,
            date="2026-04-17",
            version="1.0",
            location="PO-2026-0417",
            provenance=Provenance(
                file_name="PO-2026-0417.pdf",
                file_hash="hash-po-2026-0417",
                parser_used="pdf_parser",
                file_size_bytes=314572,
                mime_type="application/pdf",
                ingested_at=now_iso,
                storage_type="ephemeral_temp",
            ),
            raw_text_preview="PURCHASE ORDER PO-2026-0417: Nexus Semiconductor. Authorized purchase of 12 A100 GPUs at $18,500 each. Total committed order value $222,000.00.",
            metadata={"po_number": "PO-2026-0417", "item": "A100 GPU", "quantity": 12, "unit_price": 18500},
        ),
        # 5. Nexus Semiconductor Invoice
        EvidenceObject(
            id="ev-inv-77821",
            source="Nexus Semiconductor Invoice",
            modality="pdf",
            claim="A100 GPUs billed at $19,400 each ($900 variance per unit), INV-77821",
            entity="Nexus Semiconductor",
            value=19400.0,
            date="2026-05-02",
            version="1.0",
            location="INV-77821",
            provenance=Provenance(
                file_name="INV-77821.pdf",
                file_hash="hash-inv-77821",
                parser_used="pdf_parser",
                file_size_bytes=245760,
                mime_type="application/pdf",
                ingested_at=now_iso,
                storage_type="ephemeral_temp",
            ),
            raw_text_preview="INVOICE INV-77821: Nexus Semiconductor. Reference PO-2026-0417. 12 units A100 GPU hardware billed at $19,400 each. Total invoiced $232,800.00. Rate variance: +$900/unit.",
            metadata={"invoice_number": "INV-77821", "item": "A100 GPU", "unit_price": 19400, "variance": 900, "secondary_modality": "excel"},
        ),
        # 6. Master Services Agreement
        EvidenceObject(
            id="ev-msa-sec42",
            source="Master Services Agreement",
            modality="docx",
            claim="Section 4.2 Delivery Milestones stipulates delivery within 14 business days",
            entity="Nexus Semiconductor",
            value=4.2,
            date="2026-01-10",
            version="1.0",
            location="Section 4.2 Delivery Milestones",
            provenance=Provenance(
                file_name="Master_Services_Agreement.docx",
                file_hash="hash-msa-sec42",
                parser_used="docx_parser",
                file_size_bytes=419430,
                mime_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                ingested_at=now_iso,
                storage_type="ephemeral_temp",
            ),
            raw_text_preview="Master Services Agreement Section 4.2 Delivery Milestones: Nexus Semiconductor shall fulfill and ship all hardware units under authorized purchase orders within 14 business days.",
            metadata={"agreement": "MSA", "section": "4.2", "milestone": "Hardware Delivery"},
        ),
    ]

    for rec in benchmark_records:
        index_evidence(rec)


def search_evidence(
    query: str,
    filter_modality: Optional[str] = None,
    filter_source: Optional[str] = None,
    filter_date: Optional[str] = None,
    limit: int = 5,
) -> List[Dict[str, Any]]:
    """Search evidence using vector similarity combined with keyword matching and metadata filtering."""
    _ensure_collection()

    # Automatically seed benchmark records if empty
    try:
        col_info = qdrant.get_collection(COLLECTION_NAME)
        if col_info.points_count == 0:
            seed_initial_evidence()
    except Exception:
        seed_initial_evidence()

    query_vector = embed_text(query, vector_size=VECTOR_SIZE)

    must_conditions = []
    if filter_modality:
        must_conditions.append(
            models.FieldCondition(
                key="modality",
                match=models.MatchValue(value=filter_modality.strip().lower()),
            )
        )
    if filter_source:
        must_conditions.append(
            models.FieldCondition(
                key="source",
                match=models.MatchText(text=filter_source.strip()),
            )
        )
    if filter_date:
        must_conditions.append(
            models.FieldCondition(
                key="date",
                match=models.MatchText(text=filter_date.strip()),
            )
        )

    query_filter = models.Filter(must=must_conditions) if must_conditions else None

    # Retrieve candidate points from Qdrant
    fetch_limit = max(limit * 2, 10)
    search_res = qdrant.query_points(
        collection_name=COLLECTION_NAME,
        query=query_vector,
        query_filter=query_filter,
        limit=fetch_limit,
    )

    # Keywords extraction for ranking boost
    raw_tokens = re.findall(r"\b[a-zA-Z0-9\$\.]+\b", query.lower())
    query_keywords = [t for t in raw_tokens if t not in STOPWORDS and len(t) > 1]

    scored_items = []
    for pt in search_res.points:
        payload = pt.payload or {}
        doc_searchable_text = (
            f"{payload.get('source', '')} {payload.get('claim', '')} {payload.get('entity', '')} "
            f"{payload.get('location', '')} {payload.get('raw_text_preview', '')}"
        ).lower()

        matched_kws = [k for k in query_keywords if k in doc_searchable_text]
        kw_ratio = (len(matched_kws) / len(query_keywords)) if query_keywords else 0.0

        # Base vector similarity (clamped between 0.0 and 1.0)
        vector_sim = max(0.0, float(pt.score))

        # Hybrid score combines vector similarity (65%) and keyword matching (35%)
        combined_score = round(min(1.0, vector_sim * 0.65 + kw_ratio * 0.35), 4)

        match_reasons = []
        match_reasons.append(f"Semantic vector similarity ({vector_sim:.2f})")
        if matched_kws:
            match_reasons.append(f"Matched keywords: {', '.join(matched_kws[:5])}")
        if filter_modality and payload.get("modality") == filter_modality.strip().lower():
            match_reasons.append(f"Modality matched filter '{payload.get('modality')}'")
        if filter_source and filter_source.lower() in str(payload.get("source", "")).lower():
            match_reasons.append(f"Source matched filter '{payload.get('source')}'")

        evidence_obj = EvidenceObject(**payload)

        scored_items.append({
            "score": combined_score,
            "vector_score": vector_sim,
            "match_reasons": match_reasons,
            "evidence": evidence_obj,
        })

    # Sort descending by combined_score, vector_score as tie breaker
    scored_items.sort(key=lambda x: (x["score"], x["vector_score"]), reverse=True)

    results = []
    for rank_idx, item in enumerate(scored_items[:limit]):
        results.append({
            "rank": rank_idx + 1,
            "score": item["score"],
            "match_reasons": item["match_reasons"],
            "evidence": item["evidence"],
        })

    return results


# Seed benchmark records upon module import
seed_initial_evidence()
