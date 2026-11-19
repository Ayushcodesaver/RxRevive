"""Semantic similarity: chunked embedding, aggregation and cosine math.

Long documents are split into overlapping sentence chunks so nothing
important is silently truncated, then chunk-level similarities are aggregated
with a mean (documented, deterministic).
"""

import re

import numpy as np

MAX_CHUNK_CHARS = 1200
_OVERLAP_SENTENCES = 1


def split_chunks(text: str, max_chars: int = MAX_CHUNK_CHARS) -> list[str]:
    """Split a document into sentence chunks of at most max_chars characters."""
    text = re.sub(r"\s+", " ", text).strip()
    if not text:
        return []
    sentences = re.split(r"(?<=[.!?])\s+", text)
    chunks: list[str] = []
    current: list[str] = []
    length = 0
    for sentence in sentences:
        sentence = sentence.strip()
        if not sentence:
            continue
        sentence_length = len(sentence)
        if sentence_length > max_chars:
            # Hard-split oversized sentences; nothing is dropped.
            if current:
                chunks.append(" ".join(current))
                current, length = [], 0
            for i in range(0, sentence_length, max_chars):
                chunks.append(sentence[i:i + max_chars])
            continue
        if length + sentence_length + 1 > max_chars and current:
            chunks.append(" ".join(current))
            # keep a small overlap for continuity
            if _OVERLAP_SENTENCES and current:
                current = current[-_OVERLAP_SENTENCES:]
                length = sum(len(s) + 1 for s in current)
            else:
                current, length = [], 0
        current.append(sentence)
        length += sentence_length + 1
    if current:
        chunks.append(" ".join(current))
    return chunks or [text[:max_chars]]


def aggregate_similarity(resume_emb: np.ndarray, jd_emb: np.ndarray) -> float:
    """Mean pairwise cosine over embedding rows (documents may be single-row)."""
    from sklearn.metrics.pairwise import cosine_similarity

    a = np.atleast_2d(resume_emb)
    b = np.atleast_2d(jd_emb)
    matrix = cosine_similarity(a, b)
    value = float(matrix.mean())
    return max(0.0, min(1.0, value))
