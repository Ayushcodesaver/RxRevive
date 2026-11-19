"""Text extraction tests: TXT, DOCX, malformed files, empty files."""

import io

import pytest

from app.shared.text_extraction import ExtractionError, extract_text


def test_txt_extraction():
    text = extract_text("resume.txt", "Experienced Python developer with 5 years of experience.".encode())
    assert "python developer" in text.lower()
    assert len(text) >= 40


def test_empty_file():
    with pytest.raises(ExtractionError):
        extract_text("resume.txt", b"")


def test_pdf_extension_but_text_content():
    with pytest.raises(ExtractionError):
        extract_text("resume.pdf", b"this is definitely not a real pdf")


def test_docx_extension_but_text_content():
    with pytest.raises(ExtractionError):
        extract_text("resume.docx", b"plain text pretending to be a docx")


def test_unsupported_extension():
    with pytest.raises(ExtractionError):
        extract_text("resume.exe", b"MZ fake binary")


def test_short_content_is_rejected():
    with pytest.raises(ExtractionError):
        extract_text("resume.txt", b"too short")


def test_docx_extraction_from_real_document():
    docx = pytest.importorskip("docx")
    document = docx.Document()
    document.add_paragraph("Experienced Python developer with five years of experience in data science.")
    buffer = io.BytesIO()
    document.save(buffer)
    text = extract_text("resume.docx", buffer.getvalue())
    assert "python developer" in text.lower()
