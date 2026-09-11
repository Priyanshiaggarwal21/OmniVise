import json
import logging
import os
import re
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

STOPWORDS = {
    "a", "about", "above", "after", "again", "against", "all", "am", "an", "and",
    "any", "are", "aren't", "as", "at", "be", "because", "been", "before", "being",
    "below", "between", "both", "but", "by", "can", "cannot", "could", "couldn't",
    "did", "didn't", "do", "does", "doesn't", "doing", "don't", "down", "during",
    "each", "few", "for", "from", "further", "had", "hadn't", "has", "hasn't",
    "have", "haven't", "having", "he", "he'd", "he'll", "he's", "her", "here",
    "here's", "hers", "herself", "him", "himself", "his", "how", "how's", "i",
    "i'd", "i'll", "i'm", "i've", "if", "in", "into", "is", "isn't", "it", "it's",
    "its", "itself", "let's", "me", "more", "most", "mustn't", "my", "myself",
    "no", "nor", "not", "of", "off", "on", "once", "only", "or", "other", "ought",
    "our", "ours", "ourselves", "out", "over", "own", "same", "shan't", "she",
    "she'd", "she'll", "she's", "should", "shouldn't", "so", "some", "such",
    "than", "that", "that's", "the", "their", "theirs", "them", "themselves",
    "then", "there", "there's", "these", "they", "they'd", "they'll", "they're",
    "they've", "this", "those", "through", "to", "too", "under", "until", "up",
    "very", "was", "wasn't", "we", "we'd", "we'll", "we're", "we've", "were",
    "weren't", "what", "what's", "when", "when's", "where", "where's", "which",
    "while", "who", "who's", "whom", "why", "why's", "with", "won't", "would",
    "wouldn't", "you", "you'd", "you'll", "you're", "you've", "your", "yours",
    "yourself", "yourselves", "show", "give", "tell", "find", "get", "list"
}

KNOWN_ENTITIES = [
    "Nexus Semiconductor",
    "Nexus",
    "SEC",
    "Vendor Ledger",
    "Enterprise Services",
    "Alphabet Inc",
    "Microsoft Corp",
    "Tesla Inc",
    "Acme Corp",
]

KNOWN_METRICS = [
    "guided revenue",
    "reported revenue",
    "revenue",
    "net bookings",
    "bookings",
    "gross margin",
    "operating margin",
    "margin",
    "purchase order",
    "po unit price",
    "unit price",
    "invoice",
    "billed amount",
    "delivery milestones",
    "variance",
    "discrepancy",
    "net income",
]


def _normalize_decomposition_dict(data: Dict[str, Any], query: str, engine_name: str) -> Dict[str, Any]:
    """Ensure all required keys exist with appropriate types."""
    core_question = data.get("core_question") or query.strip().rstrip("?").strip()
    intent = data.get("intent") or "evidence_retrieval"

    evidence_types = data.get("relevant_evidence_types")
    if not isinstance(evidence_types, list) or not evidence_types:
        evidence_types = ["pdf", "excel", "audio"]
    else:
        evidence_types = [str(t).lower().strip() for t in evidence_types if t]

    key_entities = data.get("key_entities")
    if not isinstance(key_entities, list):
        key_entities = []

    target_metrics = data.get("target_metrics")
    if not isinstance(target_metrics, list):
        target_metrics = []

    temporal_scope = data.get("temporal_scope")
    if temporal_scope and not isinstance(temporal_scope, str):
        temporal_scope = str(temporal_scope)

    search_keywords = data.get("search_keywords")
    if not isinstance(search_keywords, list) or not search_keywords:
        tokens = re.findall(r"\b[a-zA-Z0-9\-\$\.]+\b", query)
        search_keywords = [t for t in tokens if t.lower() not in STOPWORDS and len(t) > 1]

    reasoning = data.get("reasoning") or f"Query decomposed via {engine_name}"

    return {
        "core_question": str(core_question),
        "intent": str(intent),
        "relevant_evidence_types": evidence_types,
        "key_entities": [str(e) for e in key_entities],
        "target_metrics": [str(m) for m in target_metrics],
        "temporal_scope": temporal_scope if temporal_scope else None,
        "search_keywords": [str(k) for k in search_keywords],
        "reasoning": str(reasoning),
        "engine": engine_name,
    }


def _heuristic_decompose(query: str) -> Dict[str, Any]:
    """Offline rule-based decomposition analyzing financial terms, entities, dates, and modalities."""
    q_lower = query.lower()

    # Intent detection
    if any(term in q_lower for term in ["variance", "discrepanc", "mismatch", "differ", "reconcil", "compare"]):
        intent = "reconcile_variance"
    elif any(term in q_lower for term in ["guid", "forecast", "outlook"]) and any(term in q_lower for term in ["revenue", "earning", "target"]):
        intent = "cross_check_guidance"
    elif any(term in q_lower for term in ["audit", "verif", "validat", "check", "confirm"]):
        intent = "audit_verification"
    elif any(term in q_lower for term in ["milestone", "sla", "deliver", "contract", "clause"]):
        intent = "milestone_tracking"
    else:
        intent = "evidence_retrieval"

    # Modality detection
    modalities: List[str] = []
    if any(term in q_lower for term in ["10-q", "10q", "sec", "filing", "pdf", "po", "purchase order", "invoice", "inv-", "report"]):
        modalities.append("pdf")
    if any(term in q_lower for term in ["excel", "sheet", "spreadsheet", "ledger", "reconciliation", "table", "csv", "bookings", "cell"]):
        modalities.append("excel")
    if any(term in q_lower for term in ["audio", "call", "transcript", "recording", "spoke", "listen", "meeting", "guid", "cfo", "earnings"]):
        modalities.append("audio")
    if any(term in q_lower for term in ["msa", "contract", "agreement", "milestone", "docx", "word", "clause", "terms"]):
        modalities.append("docx")
    if not modalities:
        modalities = ["pdf", "excel", "audio"]

    # Temporal Scope extraction
    temp_match = re.search(r"\b(Q[1-4](?:\s+|-)?(?:20\d\d|FY\d\d)?|FY(?:20)?\d\d|20\d\d)\b", query, re.IGNORECASE)
    temporal_scope = temp_match.group(0).strip() if temp_match else None

    # Key Entities extraction
    key_entities: List[str] = []
    for ent in KNOWN_ENTITIES:
        if re.search(rf"\b{re.escape(ent)}\b", query, re.IGNORECASE):
            # Avoid duplicate if substring already covered
            if not any(ent in existing for existing in key_entities):
                key_entities.append(ent)

    # If no known entity found, extract capitalized proper nouns/phrases
    if not key_entities:
        candidates = re.findall(r"\b[A-Z][a-zA-Z0-9]+(?:\s+[A-Z][a-zA-Z0-9]+)*\b", query)
        for c in candidates:
            if re.match(r"^Q[1-4]$", c, re.IGNORECASE):
                continue
            if c.lower() not in STOPWORDS and c not in ["What", "Are", "How", "Why", "Where", "When", "Is", "Can", "Could", "Which"]:
                if c not in key_entities:
                    key_entities.append(c)

    # Metrics extraction
    target_metrics: List[str] = []
    for met in KNOWN_METRICS:
        if met in q_lower and met not in target_metrics:
            target_metrics.append(met)
    # Check for PO keyword specifically
    if re.search(r"\bpo\b", q_lower) and "purchase order" not in target_metrics:
        target_metrics.append("purchase order")
    if re.search(r"\binvoice\b", q_lower) and "invoice" not in target_metrics:
        target_metrics.append("invoice")

    # Search Keywords
    tokens = re.findall(r"\b[a-zA-Z0-9\-\$\.]+\b", query)
    search_keywords: List[str] = []
    for tok in tokens:
        if tok.lower() not in STOPWORDS and len(tok) > 1 and tok not in search_keywords:
            search_keywords.append(tok)

    core_question = query.strip().rstrip("?").strip()
    reasoning = f"Heuristically extracted intent '{intent}' targeting evidence modalities {modalities} and keywords {search_keywords[:4]}"

    return {
        "core_question": core_question,
        "intent": intent,
        "relevant_evidence_types": modalities,
        "key_entities": key_entities,
        "target_metrics": target_metrics,
        "temporal_scope": temporal_scope,
        "search_keywords": search_keywords,
        "reasoning": reasoning,
        "engine": "Heuristic Rule Engine",
    }


def decompose_query(query: str) -> Dict[str, Any]:
    """Decompose user query into structured audit retrieval parameters.

    Tries Groq LLM first, then Gemini LLM, and gracefully falls back to
    the robust offline heuristic rule engine.
    """
    if not query or not query.strip():
        query = ""

    groq_api_key = os.environ.get("GROQ_API_KEY")
    gemini_api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")

    prompt = f"""You are an audit and financial intelligence query decomposition engine for OmniVise.
Decompose the following user query into structured JSON with these exact fields:
- "core_question": clean summary string of the core question being asked
- "intent": user intent (e.g., "reconcile_variance", "audit_verification", "evidence_retrieval", "cross_check_guidance")
- "relevant_evidence_types": list of relevant document modalities, chosen from ["pdf", "excel", "audio", "docx"]
- "key_entities": list of key entities, organizations, or vendors mentioned (e.g. ["Nexus Semiconductor", "SEC"])
- "target_metrics": list of financial metrics, line items, or targets mentioned (e.g. ["revenue", "net bookings", "PO unit price"])
- "temporal_scope": specific quarter, year, or time period if present (e.g. "Q3 2024", "2026") or null
- "search_keywords": list of high-value search keywords for retrieval
- "reasoning": brief explanation of why these modalities and keywords were chosen

User Query: "{query}"

Respond with ONLY a valid JSON object matching the specification above.
"""

    # 1. Try Groq
    if groq_api_key:
        try:
            from groq import Groq

            client = Groq(api_key=groq_api_key)
            completion = client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[
                    {
                        "role": "system",
                        "content": "You are a specialized financial audit query decomposition system. Return pure JSON without markdown code fences.",
                    },
                    {"role": "user", "content": prompt},
                ],
                response_format={"type": "json_object"},
                temperature=0.1,
                max_tokens=600,
            )
            raw_content = completion.choices[0].message.content or "{}"
            parsed = json.loads(raw_content)
            return _normalize_decomposition_dict(parsed, query, "Groq Llama-3.3-70b")
        except Exception as e:
            logger.warning(f"Groq query decomposition failed: {e}. Trying Gemini or fallback...")

    # 2. Try Gemini
    if gemini_api_key:
        try:
            import google.generativeai as genai

            genai.configure(api_key=gemini_api_key)
            model = genai.GenerativeModel("gemini-1.5-flash")
            response = model.generate_content(
                f"You are a specialized financial audit query decomposition system. Return pure JSON without markdown code fences.\n{prompt}"
            )
            raw_text = response.text.strip()
            if raw_text.startswith("```"):
                raw_text = re.sub(r"^```(?:json)?", "", raw_text)
                raw_text = re.sub(r"```$", "", raw_text).strip()
            parsed = json.loads(raw_text)
            return _normalize_decomposition_dict(parsed, query, "Gemini")
        except Exception as e:
            logger.warning(f"Gemini query decomposition failed: {e}. Using heuristic fallback...")

    # 3. Robust Offline Heuristic Fallback
    return _heuristic_decompose(query)
