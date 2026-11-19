"""Cosine similarity helper shared by the traditional engine and evaluation."""

import numpy as np
from sklearn.metrics.pairwise import cosine_similarity


def cosine(a, b) -> float:
    """Cosine similarity between two vectors (or two 1-row matrices)."""
    value = float(cosine_similarity(np.asarray(a).reshape(1, -1), np.asarray(b).reshape(1, -1))[0][0])
    return max(0.0, min(1.0, value))
