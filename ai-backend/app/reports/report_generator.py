"""PDF suitability report generation with ReportLab (bytes-based).

The report carries the analysis record plus the full engine payload and the
honest disclaimer. Rendering happens in memory; persistence is the caller's
decision (local data dir today, object storage when configured).
"""

import io
import time
from datetime import datetime, timezone

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import HRFlowable, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

INK = colors.HexColor("#1F2421")
MUTED = colors.HexColor("#5B615B")
RULE = colors.HexColor("#E2E2E0")
SOFT = colors.HexColor("#EDF4F2")
ACCENT = colors.HexColor("#17828C")


def _styles():
    base = getSampleStyleSheet()
    return {
        "title": ParagraphStyle("title", parent=base["Title"], fontSize=17, textColor=INK, spaceAfter=2),
        "subtitle": ParagraphStyle("subtitle", parent=base["Normal"], fontSize=9, textColor=MUTED, spaceAfter=10),
        "h2": ParagraphStyle("h2", fontSize=12, textColor=INK, spaceBefore=12, spaceAfter=6, fontName="Helvetica-Bold"),
        "body": ParagraphStyle("body", parent=base["Normal"], fontSize=9.5, leading=14, textColor=INK),
        "item": ParagraphStyle("item", parent=base["Normal"], fontSize=9.5, leading=14, textColor=INK, leftIndent=10, spaceAfter=2),
        "small": ParagraphStyle("small", parent=base["Normal"], fontSize=8, leading=11, textColor=MUTED),
    }


def _bullets(items, style):
    return [Paragraph(f"• {item}", style) for item in items]


def generate_pdf_bytes(analysis_id: str, model_key: str, job_title: str | None, company: str | None,
                       resume_filename: str | None, payload: dict) -> bytes:
    """Render the analysis into a styled PDF and return the bytes."""
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer, pagesize=A4,
        leftMargin=18 * mm, rightMargin=18 * mm, topMargin=16 * mm, bottomMargin=16 * mm,
        title="RxRevive Resume Match Report",
    )
    st = _styles()
    story = []

    now = datetime.now(timezone.utc)
    story.append(Paragraph("RxRevive · Resume and Job Description Match Report", st["title"]))
    story.append(Paragraph("Intelligent Resume and Job Description Matching System (Team RxRevive)", st["subtitle"]))
    story.append(HRFlowable(width="100%", thickness=1, color=ACCENT))

    rows = [
        ["Report ID", analysis_id],
        ["Generated", now.strftime("%d %b %Y, %H:%M UTC")],
        ["Model", {"traditional": "Traditional NLP (TF-IDF)", "transformer": "Transformer NLP (SBERT)",
                   "compare": "Comparison (both engines)"}.get(model_key, model_key)],
        ["Job title", job_title or "-"],
        ["Company", company or "-"],
        ["Resume file", resume_filename or "Pasted text"],
    ]
    table = Table(rows, colWidths=[35 * mm, 120 * mm])
    table.setStyle(TableStyle([
        ("FONT", (0, 0), (0, -1), "Helvetica-Bold", 9),
        ("FONT", (1, 0), (1, -1), "Helvetica", 9),
        ("TEXTCOLOR", (0, 0), (-1, -1), INK),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("LINEBELOW", (0, 0), (-1, -2), 0.4, RULE),
    ]))
    story.append(table)

    traditional = payload.get("traditional") or {}
    transformer = payload.get("transformer") or {}

    story.append(Paragraph("Match Summary", st["h2"]))
    score_rows = [["Metric", "Value"]]
    if traditional:
        score_rows.append(["Traditional NLP (TF-IDF) score", f"{traditional['match_percentage']:.0f}%"])
    if transformer:
        score_rows.append(["Transformer NLP (SBERT) score", f"{transformer['match_percentage']:.0f}%"])
    if traditional and transformer:
        score_rows.append(["Difference (Transformer minus Traditional)",
                           f"{transformer['match_percentage'] - traditional['match_percentage']:+.0f} pts"])
    primary = transformer or traditional
    if primary:
        score_rows.append(["Matched skills", str(len(primary.get("matched_skills", [])))])
        score_rows.append(["Missing skills", str(len(primary.get("missing_skills", [])))])
        for res in (traditional, transformer):
            if res:
                score_rows.append([res["cosine_label"], f"{res['cosine_percentage']}%"])

    t = Table(score_rows, colWidths=[95 * mm, 60 * mm])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), ACCENT),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONT", (0, 0), (-1, 0), "Helvetica-Bold", 9),
        ("FONT", (0, 1), (-1, -1), "Helvetica", 9),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, SOFT]),
        ("GRID", (0, 0), (-1, -1), 0.4, RULE),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    story.append(t)

    if primary:
        story.append(Paragraph(f"Suitability: {primary.get('suitability', {}).get('label', '-')}", st["h2"]))

    story.append(Paragraph("Matched Skills", st["h2"]))
    matched = primary.get("matched_skills", []) if primary else []
    story.append(Paragraph(", ".join(matched) if matched else "(none identified)", st["body"]))

    story.append(Paragraph("Missing Skills", st["h2"]))
    missing = primary.get("missing_skills", []) if primary else []
    story.append(Paragraph(", ".join(missing) if missing else "(none: the resume covers every identified JD skill)", st["body"]))

    for key, label in (("traditional", "Traditional NLP"), ("transformer", "Transformer NLP")):
        res = payload.get(key)
        if not res:
            continue
        story.append(Paragraph(f"{label}: Strengths", st["h2"]))
        story.extend(_bullets(res.get("strengths", []), st["item"]))
        story.append(Paragraph(f"{label}: Improvement Recommendations", st["h2"]))
        story.extend(_bullets(res.get("recommendations", []), st["item"]))
        story.append(Paragraph(f"{label}: Technical Notes", st["h2"]))
        story.extend(_bullets(res.get("details", []), st["item"]))

    story.append(Spacer(1, 10))
    story.append(HRFlowable(width="100%", thickness=0.8, color=RULE))
    story.append(Paragraph("Disclaimer", st["h2"]))
    story.append(Paragraph(
        "This report is generated automatically for educational purposes. Matching scores measure "
        "textual/semantic and skill overlap only; they are suggestions, not probabilities of employment "
        "and not objective hiring decisions.",
        st["small"],
    ))

    doc.build(story)
    return buffer.getvalue()


def report_filename(analysis_id: str) -> str:
    return f"resume_match_report_{analysis_id}_{int(time.time())}.pdf"
