from typing import Any, Dict, List, Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.v1.activity import log_activity
from app.contradiction import analyze_evidence_relationships
from app.core.database import get_db
from app.services import decomposer, vector_store
from app.services.cleanup import purge_session_data
from app.services.synthesizer import generate_grounded_answer, run_stress_test

router = APIRouter()


class StressTestRequest(BaseModel):
    query: Optional[str] = None
    baseline_conclusion: Optional[str] = None
    ranked_evidence: Optional[List[Dict[str, Any]]] = None
    filter_date: Optional[str] = None
    filter_source: Optional[str] = None
    filter_modality: Optional[str] = None
    limit: int = 5

    model_config = {"extra": "allow"}


class WorkspaceQueryRequest(BaseModel):
    query: Optional[str] = None
    filter_date: Optional[str] = None
    filter_source: Optional[str] = None
    filter_modality: Optional[str] = None
    limit: int = 5

    model_config = {"extra": "allow"}


def _evidence_to_dict(ev_obj: Any) -> dict:
    """Serialise EvidenceObject safely, handling nested Provenance."""
    if hasattr(ev_obj, "model_dump"):
        return ev_obj.model_dump(mode="json")
    if isinstance(ev_obj, dict):
        return ev_obj
    return {}


@router.post("/query")
async def workspace_query(
    request: Request,
    payload: Optional[WorkspaceQueryRequest] = None,
    db: Session = Depends(get_db),
):
    """
    Decompose the incoming natural-language question into sub-requirements using
    the decomposer service, then retrieve the top-ranked Evidence Objects from the
    vector store using vector similarity search combined with keyword and metadata filtering.
    """
    query: str = ""
    filter_date: Optional[str] = None
    filter_source: Optional[str] = None
    filter_modality: Optional[str] = None
    limit: int = 5

    # 1. Populate from parsed Pydantic model if available
    if payload is not None:
        if payload.query is not None:
            query = str(payload.query).strip()
        filter_date = payload.filter_date
        filter_source = payload.filter_source
        filter_modality = payload.filter_modality
        limit = payload.limit

    # 2. Also handle generic JSON body or raw payload if fields missing
    try:
        body = await request.json()
        if isinstance(body, dict):
            if not query and body.get("query") is not None:
                query = str(body.get("query")).strip()
            if filter_date is None and "filter_date" in body:
                filter_date = body.get("filter_date")
            if filter_source is None and "filter_source" in body:
                filter_source = body.get("filter_source")
            if filter_modality is None and "filter_modality" in body:
                filter_modality = body.get("filter_modality")
            if "limit" in body and body["limit"] is not None:
                try:
                    limit = int(body["limit"])
                except (TypeError, ValueError):
                    pass
    except Exception:
        # Fallback to form-data if present
        try:
            form = await request.form()
            if not query and form.get("query"):
                query = str(form.get("query")).strip()
            if filter_date is None and form.get("filter_date"):
                filter_date = str(form.get("filter_date"))
            if filter_source is None and form.get("filter_source"):
                filter_source = str(form.get("filter_source"))
            if filter_modality is None and form.get("filter_modality"):
                filter_modality = str(form.get("filter_modality"))
            if form.get("limit"):
                try:
                    limit = int(form.get("limit"))
                except (TypeError, ValueError):
                    pass
        except Exception:
            pass

    # Normalize empty filter strings to None
    if filter_date is not None:
        filter_date = str(filter_date).strip() or None
    if filter_source is not None:
        filter_source = str(filter_source).strip() or None
    if filter_modality is not None:
        filter_modality = str(filter_modality).strip() or None

    # Enforce limit boundaries
    limit = max(1, min(limit, 50))

    # Validate non-empty query
    if not query or not query.strip():
        raise HTTPException(
            status_code=400,
            detail="'query' must be a non-empty string.",
        )

    # Call decomposer to analyze user query
    try:
        decomposed = decomposer.decompose_query(query)
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Query decomposition failed: {exc}",
        )

    # Call vector_store search with filters
    try:
        raw_results = vector_store.search_evidence(
            query=query,
            filter_modality=filter_modality,
            filter_source=filter_source,
            filter_date=filter_date,
            limit=limit,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Evidence retrieval failed: {exc}",
        )

    # Format ranked evidence
    ranked_evidence = []
    for item in raw_results:
        ranked_evidence.append(
            {
                "rank": item["rank"],
                "score": item["score"],
                "match_reasons": item["match_reasons"],
                "evidence": _evidence_to_dict(item["evidence"]),
            }
        )

    # Cross-source reasoning and evidence relationships analysis
    evidence_relationships = analyze_evidence_relationships(raw_results)

    # Generate final grounded answer with conclusion, reasoning, and citations
    grounded_answer = generate_grounded_answer(
        query=query,
        decomposed_query=decomposed,
        ranked_evidence=raw_results,
        evidence_relationships=evidence_relationships,
    )

    # Build applied_filters map
    applied_filters: Dict[str, Any] = {}
    if filter_modality:
        applied_filters["modality"] = filter_modality
    if filter_source:
        applied_filters["source"] = filter_source
    if filter_date:
        applied_filters["date"] = filter_date

    # Log activity event
    try:
        query_target = (query[:120] + "...") if len(query) > 120 else query
        log_activity(
            db,
            action_type="query_run",
            target=query_target or "Workspace Query",
            details={"retrieved_count": len(ranked_evidence), "filters": applied_filters},
        )
    except Exception:
        pass

    return {
        "query": query,
        "decomposed_query": decomposed,
        "total_retrieved": len(ranked_evidence),
        "ranked_evidence": ranked_evidence,
        "evidence_relationships": evidence_relationships,
        "applied_filters": applied_filters,
        # Full Grounded Answer object
        "grounded_answer": grounded_answer,
        # Direct audit fields requested by specification
        "conclusion": grounded_answer.get("conclusion", ""),
        "reasoning": grounded_answer.get("reasoning", ""),
        "supporting_evidence_refs": grounded_answer.get("supporting_evidence_refs", []),
        "conflicting_evidence_refs": grounded_answer.get("conflicting_evidence_refs", []),
        "missing_evidence_note": grounded_answer.get("missing_evidence_note", {}),
        "exact_source_locations": grounded_answer.get("exact_source_locations", []),
        # Frontend D3 compatibility fields
        "supporting": grounded_answer.get("supporting", []),
        "conflicts": grounded_answer.get("conflicts", []),
        "missingEvidence": grounded_answer.get("missingEvidence", {}),
        "summaryNarrative": grounded_answer.get("summaryNarrative", ""),
        "confidenceBadge": grounded_answer.get("confidenceBadge", ""),
        "metrics": grounded_answer.get("metrics", []),
    }


@router.post("/stress-test")
async def workspace_stress_test(
    request: Request,
    payload: Optional[StressTestRequest] = None,
):
    """Stress test a generated conclusion by re-running the D4-D6 pipeline multiple times,

    each time removing one source/modality from the evidence set, and evaluating whether
    the conclusion changes. Returns critical evidence pieces and a robustness score.
    """
    query: str = ""
    baseline_conclusion: Optional[str] = None
    ranked_evidence: Optional[List[Dict[str, Any]]] = None
    limit: int = 5

    if payload is not None:
        if payload.query is not None:
            query = str(payload.query).strip()
        baseline_conclusion = payload.baseline_conclusion
        ranked_evidence = payload.ranked_evidence
        limit = payload.limit

    # Handle generic JSON body
    try:
        body = await request.json()
        if isinstance(body, dict):
            if not query and body.get("query") is not None:
                query = str(body.get("query")).strip()
            if baseline_conclusion is None and "baseline_conclusion" in body:
                baseline_conclusion = body.get("baseline_conclusion")
            if ranked_evidence is None and "ranked_evidence" in body:
                ranked_evidence = body.get("ranked_evidence")
            if "limit" in body and body["limit"] is not None:
                try:
                    limit = int(body["limit"])
                except (TypeError, ValueError):
                    pass
    except Exception:
        pass

    if not query and not ranked_evidence:
        raise HTTPException(
            status_code=400,
            detail="Either 'query' or 'ranked_evidence' must be provided for stress testing.",
        )

    try:
        result = run_stress_test(
            query=query,
            ranked_evidence=ranked_evidence,
            baseline_conclusion=baseline_conclusion,
            limit=limit,
        )
        return result
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Stress test execution failed: {exc}",
        )


@router.post("/purge-session")
def purge_session(
    request: Request,
    db: Session = Depends(get_db),
):
    """
    Purge Session Data endpoint.
    Deletes all temporary files, intermediate extraction artifacts, temp embeddings,
    and cached screen frames from the session, returning a detailed summary.
    """
    session_id = request.headers.get("X-Session-ID") or request.query_params.get("session_id")
    result = purge_session_data(session_id=session_id)

    try:
        log_activity(
            db,
            action_type="session_purged",
            target="Workspace session data and cache purged",
            details={
                "deleted_files": result.get("deleted_files_count"),
                "embeddings_purged": result.get("embeddings_purged"),
            },
        )
    except Exception:
        pass

    return result

