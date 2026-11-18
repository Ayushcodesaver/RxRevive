"""PDF suitability report generation with ReportLab."""

import json
import os

from reportlab.lib import colors
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

ACCENT = colors.HexColor("#0E7A5F")
INK = colors.HexColor("#1F2421")
MUTED = colors.HexColor("#5B615B")
LINE = colors.HexColor("#D9D4C8")
SOFT = colors.HexColor("#E9F2EE")


def _styles():
    base = getSampleStyleSheet()
    return {
        "title": ParagraphStyle("title", parent=base["Title"], fontSize=17, textColor=ACCENT, spaceAfter=2),
        "subtitle": ParagraphStyle("subtitle", parent=base["Normal"], fontSize=9, textColor=MUTED, spaceAfter=10),
        "h2": ParagraphStyle("h2", fontSize=12, textColor=INK, spaceBefore=12, spaceAfter=6, fontName="Helvetica-Bold"),
        "body": ParagraphStyle("body", parent=base["Normal"], fontSize=9.5, leading=14, textColor=INK),
        "item": ParagraphStyle("item", parent=base["Normal"], fontSize=9.5, leading=14, textColor=INK, leftIndent=10, spaceAfter=2),
        "small": ParagraphStyle("small", parent=base["Normal"], fontSize=8, leading=11, textColor=MUTED),
    }


def _bullets(items, style):
    return [Paragraph(f"• {item}", style) for item in items]


def generate_pdf(analysis, out_path):
    """Render the analysis record (SQLAlchemy Analysis) into a styled PDF."""
    payload = json.loads(analysis.results) if analysis.results else {}
    doc = SimpleDocTemplate(
        out_path, pagesize=A4,
        leftMargin=18 * mm, rightMargin=18 * mm, topMargin=16 * mm, bottomMargin=16 * mm,
        title="RxRevive Resume Match Report",
    )
    st = _styles()
    story = []

    story.append(Paragraph("RxRevive · Resume–Job Description Match Report", st["title"]))
    story.append(Paragraph("Intelligent Resume and Job Description Matching System — Team RxRevive", st["subtitle"]))
    story.append(HRFlowable(width="100%", thickness=1, color=ACCENT))

    # Header facts table
    rows = [
        ["Report ID", analysis.id],
        ["Generated", analysis.created_at.strftime("%d %b %Y, %H:%M UTC")],
        ["Model", analysis.model_name.replace("compare", "Comparison (Traditional + Transformer)").title()],
        ["Job title", analysis.job_title or "—"],
        ["Company", analysis.company or "—"],
        ["Resume file", analysis.resume_filename or "Pasted text"],
    ]
    table = Table(rows, colWidths=[35 * mm, 120 * mm])
    table.setStyle(TableStyle([
        ("FONT", (0, 0), (0, -1), "Helvetica-Bold", 9),
        ("FONT", (1, 0), (1, -1), "Helvetica", 9),
        ("TEXTCOLOR", (0, 0), (-1, -1), INK),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("LINEBELOW", (0, 0), (-1, -2), 0.4, LINE),
    ]))
    story.append(table)

    # Scores
    story.append(Paragraph("Match Summary", st["h2"]))
    score_rows = [["Metric", "Value"]]
    if analysis.traditional_score is not None:
        score_rows.append(["Traditional NLP (TF-IDF) score", f"{analysis.traditional_score:.0f}%"])
    if analysis.transformer_score is not None:
        score_rows.append(["Transformer NLP (SBERT) score", f"{analysis.transformer_score:.0f}%"])
    if analysis.traditional_score is not None and analysis.transformer_score is not None:
        score_rows.append(["Difference (Transformer − Traditional)",
                           f"{analysis.transformer_score - analysis.traditional_score:+.0f} pts"])
    score_rows.append(["Matched skills", str(len(json.loads(analysis.matched_skills or "[]")))])
    score_rows.append(["Missing skills", str(len(json.loads(analysis.missing_skills or "[]")))])
    if payload:
        for key in ("traditional", "transformer"):
            res = payload.get(key)
            if res:
                score_rows.append([f"{res['cosine_label']}", f"{res['cosine_percentage']}%"])

    t = Table(score_rows, colWidths=[95 * mm, 60 * mm])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), ACCENT),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONT", (0, 0), (-1, 0), "Helvetica-Bold", 9),
        ("FONT", (0, 1), (-1, -1), "Helvetica", 9),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, SOFT]),
        ("GRID", (0, 0), (-1, -1), 0.4, LINE),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    story.append(t)

    # Suitability
    if payload:
        first = payload.get("transformer") or payload.get("traditional") or {}
        if first:
            story.append(Paragraph(f"Suitability: {first.get('suitability', {}).get('label', '—')}", st["h2"]))

    # Skills
    story.append(Paragraph("Matched Skills", st["h2"]))
    matched = json.loads(analysis.matched_skills or "[]")
    story.append(Paragraph(", ".join(matched) if matched else "(none identified)", st["body"]))

    story.append(Paragraph("Missing Skills", st["h2"]))
    missing = json.loads(analysis.missing_skills or "[]")
    story.append(Paragraph(", ".join(missing) if missing else "(none — the resume covers every identified JD skill)", st["body"]))

    # Strengths / recommendations per model
    for key, label in (("traditional", "Traditional NLP"), ("transformer", "Transformer NLP")):
        res = payload.get(key)
        if not res:
            continue
        story.append(Paragraph(f"{label} — Strengths", st["h2"]))
        story.extend(_bullets(res.get("strengths", []), st["item"]))
        story.append(Paragraph(f"{label} — Improvement Recommendations", st["h2"]))
        story.extend(_bullets(res.get("recommendations", []), st["item"]))
        story.append(Paragraph(f"{label} — Technical Notes", st["h2"]))
        story.extend(_bullets(res.get("details", []), st["item"]))

    story.append(Spacer(1, 10))
    story.append(HRFlowable(width="100%", thickness=0.8, color=LINE))
    story.append(Paragraph("Disclaimer", st["h2"]))
    story.append(Paragraph(
        "This report is generated automatically for educational purposes. Matching scores measure "
        "textual/semantic and skill overlap only — they are suggestions, not probabilities of employment "
        "and not objective hiring decisions.",
        st["small"],
    ))

    doc.build(story)
    return out_path


def ensure_report(analysis, generated_dir):
    """Generate the PDF once per analysis; reuse it afterwards. Returns filename."""
    filename = f"resume_match_report_{analysis.id}.pdf"
    out_path = os.path.join(generated_dir, filename)
    if not os.path.exists(out_path):
        generate_pdf(analysis, out_path)
    return filename
