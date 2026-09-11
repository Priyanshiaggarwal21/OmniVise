"""
PDF report generator for Decision Snapshots.
Uses reportlab to produce a clean, structured PDF report.
"""
from __future__ import annotations

import io
from datetime import datetime
from typing import TYPE_CHECKING

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    HRFlowable,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

if TYPE_CHECKING:
    from app.models.decision_snapshot import DecisionSnapshot

# ── Colour palette ────────────────────────────────────────────────────────────
TEAL = colors.HexColor("#0d6b58")
TEAL_LIGHT = colors.HexColor("#EBF5F3")
ROSE = colors.HexColor("#C93B2B")
AMBER = colors.HexColor("#B45309")
AMBER_LIGHT = colors.HexColor("#FEF9EF")
SLATE = colors.HexColor("#374151")
SLATE_LIGHT = colors.HexColor("#F3F4F6")
WHITE = colors.white
BLACK = colors.HexColor("#111827")
BORDER = colors.HexColor("#E5E7EB")

STATUS_COLOURS = {
    "PASS": colors.HexColor("#065F46"),
    "REVIEW": AMBER,
    "BLOCK": ROSE,
}
STATUS_BG = {
    "PASS": colors.HexColor("#D1FAE5"),
    "REVIEW": AMBER_LIGHT,
    "BLOCK": colors.HexColor("#FDF2F2"),
}

PAGE_W, PAGE_H = A4
MARGIN = 18 * mm


def _styles():
    base = getSampleStyleSheet()
    return {
        "title": ParagraphStyle(
            "title",
            fontName="Helvetica-Bold",
            fontSize=18,
            textColor=TEAL,
            spaceAfter=2,
        ),
        "subtitle": ParagraphStyle(
            "subtitle",
            fontName="Helvetica",
            fontSize=9,
            textColor=SLATE,
            spaceAfter=6,
        ),
        "section_header": ParagraphStyle(
            "section_header",
            fontName="Helvetica-Bold",
            fontSize=10,
            textColor=TEAL,
            spaceBefore=10,
            spaceAfter=4,
        ),
        "body": ParagraphStyle(
            "body",
            fontName="Helvetica",
            fontSize=9,
            textColor=BLACK,
            leading=14,
            spaceAfter=4,
        ),
        "body_small": ParagraphStyle(
            "body_small",
            fontName="Helvetica",
            fontSize=8,
            textColor=SLATE,
            leading=12,
            spaceAfter=2,
        ),
        "footer": ParagraphStyle(
            "footer",
            fontName="Helvetica",
            fontSize=7,
            textColor=SLATE,
            alignment=TA_CENTER,
        ),
        "mono": ParagraphStyle(
            "mono",
            fontName="Courier",
            fontSize=8,
            textColor=SLATE,
            leading=11,
            spaceAfter=2,
        ),
        "question": ParagraphStyle(
            "question",
            fontName="Helvetica-BoldOblique",
            fontSize=11,
            textColor=BLACK,
            leading=15,
            spaceAfter=4,
        ),
    }


def _hr(width=None):
    return HRFlowable(
        width=width or "100%",
        thickness=0.5,
        color=BORDER,
        spaceAfter=4,
        spaceBefore=4,
    )


def _status_table(status: str, confidence: str | None, created_at: datetime, styles):
    """Single-row coloured status band."""
    stat_col = STATUS_COLOURS.get(status, SLATE)
    stat_bg = STATUS_BG.get(status, SLATE_LIGHT)

    status_cell = Paragraph(
        f"<b>{status}</b>",
        ParagraphStyle("st", fontName="Helvetica-Bold", fontSize=10, textColor=stat_col),
    )
    conf_cell = Paragraph(
        confidence or "—",
        ParagraphStyle("cf", fontName="Helvetica", fontSize=9, textColor=SLATE),
    )
    date_cell = Paragraph(
        created_at.strftime("%d %b %Y, %H:%M UTC"),
        ParagraphStyle("dt", fontName="Helvetica", fontSize=9, textColor=SLATE, alignment=TA_RIGHT),
    )

    t = Table(
        [[status_cell, conf_cell, date_cell]],
        colWidths=[(PAGE_W - 2 * MARGIN) * 0.18,
                   (PAGE_W - 2 * MARGIN) * 0.52,
                   (PAGE_W - 2 * MARGIN) * 0.30],
        rowHeights=[18],
    )
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, 0), stat_bg),
        ("BACKGROUND", (1, 0), (2, 0), SLATE_LIGHT),
        ("BOX", (0, 0), (-1, -1), 0.5, BORDER),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, BORDER),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
    ]))
    return t


def _metrics_table(metrics: list, styles) -> Table | None:
    if not metrics:
        return None
    header = [
        Paragraph("<b>Metric</b>", ParagraphStyle("mh", fontName="Helvetica-Bold", fontSize=8, textColor=SLATE)),
        Paragraph("<b>Value</b>", ParagraphStyle("mh", fontName="Helvetica-Bold", fontSize=8, textColor=SLATE)),
        Paragraph("<b>Source</b>", ParagraphStyle("mh", fontName="Helvetica-Bold", fontSize=8, textColor=SLATE)),
    ]
    rows = [header]
    for m in metrics:
        rows.append([
            Paragraph(str(m.get("label", "")), styles["body_small"]),
            Paragraph(f"<b>{m.get('value', '')}</b>",
                      ParagraphStyle("mv", fontName="Helvetica-Bold", fontSize=8, textColor=BLACK)),
            Paragraph(str(m.get("badge", "")), styles["body_small"]),
        ])

    col_w = PAGE_W - 2 * MARGIN
    t = Table(rows, colWidths=[col_w * 0.42, col_w * 0.30, col_w * 0.28])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), TEAL_LIGHT),
        ("TEXTCOLOR", (0, 0), (-1, 0), TEAL),
        ("BOX", (0, 0), (-1, -1), 0.5, BORDER),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, BORDER),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [WHITE, SLATE_LIGHT]),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ("FONTSIZE", (0, 0), (-1, -1), 8),
    ]))
    return t


def _refs_table(refs: list, title: str, bg_color, styles) -> Table | None:
    if not refs:
        return None
    rows = []
    for i, r in enumerate(refs):
        if isinstance(r, dict):
            text = (
                r.get("source") or r.get("sourceDoc") or r.get("claim") or str(r)
            )
            loc = r.get("location") or r.get("page_or_timestamp") or ""
            rows.append([
                Paragraph(f"{i + 1}. {text}", styles["body_small"]),
                Paragraph(loc, styles["body_small"]),
            ])
        else:
            rows.append([Paragraph(f"{i + 1}. {r}", styles["body_small"]), Paragraph("", styles["body_small"])])

    col_w = PAGE_W - 2 * MARGIN
    t = Table(rows, colWidths=[col_w * 0.72, col_w * 0.28])
    t.setStyle(TableStyle([
        ("BOX", (0, 0), (-1, -1), 0.5, BORDER),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, BORDER),
        ("ROWBACKGROUNDS", (0, 0), (-1, -1), [WHITE, bg_color]),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
    ]))
    return t


def _robustness_bar(percentage: int | None, styles) -> list:
    if percentage is None:
        return [Paragraph("<i>Stress test not run.</i>", styles["body_small"])]

    filled = max(0, min(100, percentage))
    empty = 100 - filled

    col_w = PAGE_W - 2 * MARGIN
    bar_filled_w = col_w * filled / 100
    bar_empty_w = col_w * empty / 100 if empty > 0 else 0

    bar_colour = TEAL if filled >= 75 else (AMBER if filled >= 40 else ROSE)

    cells = [[Paragraph(f"<b>{filled}%</b>", ParagraphStyle("rb", fontName="Helvetica-Bold", fontSize=9, textColor=bar_colour)), ""]]
    widths = [bar_filled_w if bar_filled_w > 0 else 1, bar_empty_w if bar_empty_w > 0 else 1]
    t = Table(cells, colWidths=widths, rowHeights=[10])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, 0), bar_colour),
        ("BACKGROUND", (1, 0), (1, 0), SLATE_LIGHT),
        ("BOX", (0, 0), (-1, -1), 0.5, BORDER),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 3),
        ("TOPPADDING", (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
    ]))
    return [t]


def _footer_table(snapshot_id: str, styles) -> Table:
    left = Paragraph(f"Snapshot ID: {snapshot_id}", styles["footer"])
    right = Paragraph(
        f"Generated by OmniVise · {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}",
        ParagraphStyle("fr", fontName="Helvetica", fontSize=7, textColor=SLATE, alignment=TA_RIGHT),
    )
    col_w = PAGE_W - 2 * MARGIN
    t = Table([[left, right]], colWidths=[col_w * 0.5, col_w * 0.5])
    t.setStyle(TableStyle([
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ]))
    return t


def generate_decision_pdf(snapshot: "DecisionSnapshot") -> bytes:
    """Generate a clean PDF report for a DecisionSnapshot and return raw bytes."""
    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        leftMargin=MARGIN,
        rightMargin=MARGIN,
        topMargin=MARGIN,
        bottomMargin=MARGIN,
        title=f"Decision Snapshot — {snapshot.id}",
        author="OmniVise Audit Engine",
    )

    styles = _styles()
    story = []

    # ── Header ────────────────────────────────────────────────────────────────
    story.append(Paragraph("OmniVise Audit Engine", styles["title"]))
    story.append(Paragraph("Decision Snapshot Report", styles["subtitle"]))
    story.append(_hr())
    story.append(Spacer(1, 3))

    # ── Status / confidence / date band ──────────────────────────────────────
    story.append(
        _status_table(
            snapshot.status or "REVIEW",
            snapshot.confidence_badge,
            snapshot.created_at or datetime.utcnow(),
            styles,
        )
    )
    story.append(Spacer(1, 8))

    # ── Question ─────────────────────────────────────────────────────────────
    story.append(Paragraph("Audit Question", styles["section_header"]))
    story.append(Paragraph(snapshot.question or "—", styles["question"]))
    story.append(_hr())

    # ── Conclusion ───────────────────────────────────────────────────────────
    story.append(Paragraph("Conclusion", styles["section_header"]))
    story.append(Paragraph(snapshot.conclusion or "—", styles["body"]))
    story.append(Spacer(1, 4))

    # ── Reasoning ────────────────────────────────────────────────────────────
    if snapshot.reasoning:
        story.append(Paragraph("Reasoning", styles["section_header"]))
        story.append(Paragraph(snapshot.reasoning, styles["body"]))
        story.append(Spacer(1, 4))

    story.append(_hr())

    # ── Key Metrics Table ────────────────────────────────────────────────────
    metrics = snapshot.metrics or []
    if metrics:
        story.append(Paragraph("Key Metrics", styles["section_header"]))
        tbl = _metrics_table(metrics, styles)
        if tbl:
            story.append(tbl)
        story.append(Spacer(1, 6))

    # ── Supporting Evidence ──────────────────────────────────────────────────
    supporting = snapshot.supporting_refs or []
    if supporting:
        story.append(Paragraph("Supporting Evidence", styles["section_header"]))
        tbl = _refs_table(supporting, "Supporting Evidence", TEAL_LIGHT, styles)
        if tbl:
            story.append(tbl)
        story.append(Spacer(1, 6))

    # ── Conflicting Evidence ─────────────────────────────────────────────────
    conflicting = snapshot.conflicting_refs or []
    if conflicting:
        story.append(Paragraph("Conflicting Evidence", styles["section_header"]))
        tbl = _refs_table(conflicting, "Conflicting Evidence", colors.HexColor("#FDF2F2"), styles)
        if tbl:
            story.append(tbl)
        story.append(Spacer(1, 6))

    story.append(_hr())

    # ── Robustness ───────────────────────────────────────────────────────────
    story.append(Paragraph("Conclusion Robustness", styles["section_header"]))
    story.extend(_robustness_bar(snapshot.robustness_percentage, styles))
    story.append(Spacer(1, 4))

    # Critical evidence
    critical = snapshot.critical_evidence or []
    if critical:
        story.append(Paragraph("Critical Evidence (removal changes conclusion):", styles["body_small"]))
        for c in critical:
            src = c.get("source", "") if isinstance(c, dict) else str(c)
            mod = c.get("modality", "") if isinstance(c, dict) else ""
            impact = c.get("impact", "") if isinstance(c, dict) else ""
            story.append(Paragraph(f"• <b>{src}</b> [{mod}] — {impact}", styles["body_small"]))
        story.append(Spacer(1, 4))
    else:
        story.append(Paragraph("No single evidence piece is critical — conclusion is resilient.", styles["body_small"]))
        story.append(Spacer(1, 4))

    # ── Missing Evidence ─────────────────────────────────────────────────────
    missing = snapshot.missing_evidence_note
    if missing and isinstance(missing, dict):
        story.append(_hr())
        story.append(Paragraph("Missing Evidence Note", styles["section_header"]))
        desc = missing.get("description") or missing.get("desc") or ""
        impact = missing.get("impact") or ""
        docs = missing.get("missingDocuments") or missing.get("missing_documents") or []
        if desc:
            story.append(Paragraph(desc, styles["body"]))
        if impact:
            story.append(Paragraph(f"<b>Impact:</b> {impact}", styles["body_small"]))
        for doc_name in docs:
            story.append(Paragraph(f"• {doc_name}", styles["mono"]))
        story.append(Spacer(1, 4))

    # ── Footer ───────────────────────────────────────────────────────────────
    story.append(_hr())
    story.append(_footer_table(snapshot.id, styles))

    doc.build(story)
    return buf.getvalue()
