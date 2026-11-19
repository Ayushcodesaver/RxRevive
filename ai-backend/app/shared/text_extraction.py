"""Resume / job-description text extraction (PDF, DOCX, plain text).

Files are processed entirely in memory; nothing is written to disk.
PDF extraction prefers PyMuPDF and falls back to pypdf when unavailable.
"""

import io
import re


class ExtractionError(Exception):
    """Raised when a file cannot be read or contains no usable text."""


MAX_CHARS = 60_000

_PDF_MAGIC = b"%PDF"
_ZIP_MAGIC = b"PK\x03\x04"


def _clean_whitespace(text: str) -> str:
    text = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f]", " ", text)
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def _extract_pdf_pymupdf(data: bytes) -> str:
    import pymupdf

    try:
        with pymupdf.open(stream=data, filetype="pdf") as document:
            if document.needs_pass:
                raise ExtractionError("The PDF is password protected; remove the password and try again.")
            return "\n".join(page.get_text() for page in document)
    except ExtractionError:
        raise
    except Exception as exc:
        raise ExtractionError(f"Could not read the PDF file with PyMuPDF: {exc}") from exc


def _extract_pdf_pypdf(data: bytes) -> str:
    from pypdf import PdfReader

    try:
        reader = PdfReader(io.BytesIO(data))
        return "\n".join((page.extract_text() or "") for page in reader.pages)
    except Exception as exc:
        raise ExtractionError(f"Could not read the PDF file; it may be corrupted or password protected: {exc}") from exc


def _extract_pdf(data: bytes) -> str:
    try:
        return _extract_pdf_pymupdf(data)
    except ImportError:
        return _extract_pdf_pypdf(data)


def _extract_docx(data: bytes) -> str:
    try:
        import docx
    except ImportError as exc:
        raise ExtractionError("python-docx is not installed") from exc
    try:
        document = docx.Document(io.BytesIO(data))
        parts = [p.text for p in document.paragraphs]
        parts += [cell.text for table in document.tables for row in table.rows for cell in row.cells]
    except Exception as exc:
        raise ExtractionError(f"Could not read the DOCX file: {exc}") from exc
    return "\n".join(parts)


def _sniff(data: bytes) -> str:
    """Lightweight content sniffing so renamed files cannot bypass validation."""
    if data.startswith(_PDF_MAGIC):
        return "pdf"
    if data.startswith(_ZIP_MAGIC):
        return "zip"
    return "text"


def extract_text(filename: str, data: bytes) -> str:
    """Extract clean text from raw file bytes.

    filename: original file name (extension hint; content sniffing still applies)
    data:     raw bytes
    """
    if not data:
        raise ExtractionError("The uploaded file is empty.")

    name = (filename or "").lower()
    kind = _sniff(data)

    if name.endswith(".pdf"):
        if kind != "pdf":
            raise ExtractionError("This file is not a valid PDF (its content does not match the PDF format).")
        text = _extract_pdf(data)
    elif name.endswith(".docx"):
        if kind != "zip":
            raise ExtractionError("This file is not a valid DOCX document (its content does not match the DOCX format).")
        text = _extract_docx(data)
    elif name.endswith((".txt", ".md")):
        if kind != "text":
            raise ExtractionError("This file is not a valid text file.")
        text = data.decode("utf-8", errors="replace")
    else:
        raise ExtractionError("Unsupported file type. Please upload a PDF, DOCX or TXT file.")

    text = _clean_whitespace(text)
    if len(text) < 40:
        raise ExtractionError(
            "Could not extract readable text from this file "
            "(scanned/image-based PDFs need OCR, which is not supported)."
        )
    return text[:MAX_CHARS]


def looks_like_scanned_pdf(data: bytes) -> bool:
    """Best-effort scan detection: many pages, almost no embedded text."""
    try:
        import pymupdf

        with pymupdf.open(stream=data, filetype="pdf") as document:
            pages = len(document)
            chars = sum(len(page.get_text()) for page in document)
            return pages >= 2 and chars < pages * 40
    except Exception:
        return False
