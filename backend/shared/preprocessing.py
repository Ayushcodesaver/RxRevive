"""Text preprocessing shared by both NLP pipelines.

Uses a built-in stop word list (no external downloads needed).
"""

import re

STOP_WORDS = {
    "a", "an", "and", "are", "as", "at", "be", "by", "for", "from", "has",
    "have", "he", "her", "his", "if", "in", "is", "it", "its", "of", "on",
    "or", "our", "she", "that", "the", "their", "them", "they", "this",
    "to", "was", "we", "were", "will", "with", "you", "your", "i", "me",
    "my", "would", "should", "could", "can", "may", "might", "must", "shall",
    "also", "than", "then", "there", "these", "those", "who", "whom", "which",
    "what", "when", "where", "why", "how", "all", "any", "both", "each",
    "few", "more", "most", "other", "some", "such", "no", "nor", "not",
    "only", "own", "same", "so", "too", "very", "just", "about", "into",
    "over", "under", "again", "once", "here", "being", "been", "do", "does",
    "did", "doing", "have", "having", "am", "s", "t",
}


def normalize(text):
    """Lowercase and normalise unicode punctuation variants."""
    text = text.replace("\u2019", "'").replace("\u2018", "'")
    text = text.replace("\u201c", '"').replace("\u201d", '"')
    text = text.replace("\u2013", "-").replace("\u2014", "-")
    return text.lower()


def remove_symbols(text):
    """Keep letters, digits, + # . - and whitespace (skills like c++, c#, .net)."""
    return re.sub(r"[^a-z0-9+#\.\-\s]", " ", text)


def tokenize(text):
    """Split into word tokens (letters, digits and skill symbols kept together)."""
    return re.findall(r"[a-z0-9+#\.][a-z0-9+#\.\-]*", text)


def remove_stop_words(tokens):
    return [t for t in tokens if t not in STOP_WORDS]


def preprocess(text):
    """Full pipeline: normalise -> symbol removal -> tokens -> stop word removal."""
    return remove_stop_words(tokenize(remove_symbols(normalize(text))))


def clean_for_vectorizer(text):
    """Return cleaned text (single-spaced, normalised) for TF-IDF."""
    cleaned = remove_symbols(normalize(text))
    return re.sub(r"\s+", " ", cleaned).strip()
