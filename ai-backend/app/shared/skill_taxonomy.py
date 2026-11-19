"""Curated skill taxonomy: 150+ skills across 10 categories.

Both NLP engines use this exact taxonomy so skill lists stay directly
comparable. Word-boundary matching preserves technical terms (C++, C#, .NET).
"""

import re

SKILL_TAXONOMY: dict[str, list[str]] = {
    "Programming Languages": [
        "python", "java", "javascript", "typescript", "c++", "c#", "sql",
        "r", "go", "rust", "kotlin", "swift", "php", "ruby", "scala",
        "matlab", "bash", "powershell", "html", "css",
    ],
    "Web & Frameworks": [
        "react", "angular", "vue.js", "next.js", "node.js", "express",
        "django", "flask", "fastapi", "spring boot", ".net", "laravel",
        "bootstrap", "tailwind css", "rest api", "graphql", "jwt",
        "microservices", "web development",
    ],
    "Databases": [
        "mysql", "postgresql", "mongodb", "redis", "sqlite", "oracle",
        "sql server", "dynamodb", "elasticsearch", "firebase", "snowflake",
    ],
    "Data Science & Machine Learning": [
        "machine learning", "deep learning", "neural networks",
        "tensorflow", "pytorch", "keras", "scikit-learn", "pandas", "numpy",
        "matplotlib", "seaborn", "data analysis", "data visualization",
        "statistics", "statistical modeling", "regression", "classification",
        "clustering", "feature engineering", "model training",
        "model evaluation", "data cleaning", "exploratory data analysis",
        "computer vision", "nlp", "natural language processing",
        "data mining", "predictive modeling", "a/b testing", "spark",
        "hadoop", "power bi", "tableau", "excel", "bert", "sentence-bert",
        "transformers", "hugging face", "generative ai",
    ],
    "Cloud & DevOps": [
        "aws", "azure", "google cloud", "gcp", "docker", "kubernetes",
        "jenkins", "ci/cd", "git", "github", "gitlab", "terraform",
        "linux", "monitoring", "load balancing", "serverless",
    ],
    "Tools & Practices": [
        "agile", "scrum", "kanban", "jira", "unit testing", "debugging",
        "code review", "version control", "technical documentation",
        "project management", "product management", "stakeholder management",
        "requirements gathering", "user research", "figma", "ui/ux",
    ],
    "Domain Knowledge": [
        "healthcare", "pharma", "clinical trials", "pharmacovigilance",
        "fintech", "e-commerce", "edtech", "saas", "b2b", "b2c",
        "supply chain", "logistics", "salesforce", "crm", "erp",
        "data privacy", "hipaa", "gdpr",
    ],
    "Soft Skills": [
        "communication", "teamwork", "leadership", "problem solving",
        "critical thinking", "time management", "adaptability",
        "presentation skills", "mentoring", "collaboration", "creativity",
        "attention to detail",
    ],
}

SOFT_SKILLS = set(SKILL_TAXONOMY["Soft Skills"])

# Synonym mapping applied before matching so resume phrasings still map to
# the canonical taxonomy entry.
SKILL_SYNONYMS: dict[str, str] = {
    "ml": "machine learning",
    "dl": "deep learning",
    "artificial intelligence": "machine learning",
    "postgres": "postgresql",
    "reactjs": "react",
    "react.js": "react",
    "nodejs": "node.js",
    "vuejs": "vue.js",
    "nextjs": "next.js",
    "k8s": "kubernetes",
    "s3": "aws",
    "ec2": "aws",
    "lambda": "aws",
    "scikitlearn": "scikit-learn",
    "sklearn": "scikit-learn",
    "tf": "tensorflow",
    "js": "javascript",
    "ts": "typescript",
    "cpp": "c++",
    "csharp": "c#",
    "golang": "go",
    "elk": "elasticsearch",
    "powerbi": "power bi",
    "ms excel": "excel",
}


def apply_synonyms(text: str) -> str:
    """Replace known synonym phrases with canonical skill names."""
    lowered = text.lower()
    for synonym, canonical in SKILL_SYNONYMS.items():
        pattern = re.compile(r"(?<![a-z0-9+.#])" + re.escape(synonym) + r"(?![a-z0-9+.#])")
        lowered = pattern.sub(canonical, lowered)
    return lowered


def _build_pattern(skill: str) -> re.Pattern:
    escaped = re.escape(skill).replace(r"\ ", r"\s+")
    return re.compile(r"(?<![a-z0-9+.#])" + escaped + r"(?![a-z0-9+.#])", re.IGNORECASE)


_SKILL_PATTERNS = {
    skill: _build_pattern(skill)
    for skills in SKILL_TAXONOMY.values()
    for skill in skills
}


def identify_skills(text: str) -> dict:
    """Return skills found in text: set, per-category lists, technical/soft split."""
    from .preprocessing import normalize

    prepared = apply_synonyms(normalize(text))
    found = {skill for skill, pattern in _SKILL_PATTERNS.items() if pattern.search(prepared)}

    by_category: dict[str, list[str]] = {}
    for category, skills in SKILL_TAXONOMY.items():
        hits = sorted(found & set(skills))
        if hits:
            by_category[category] = hits

    soft = sorted(found & SOFT_SKILLS)
    technical = sorted(found - SOFT_SKILLS)
    return {"skills": found, "by_category": by_category, "technical": technical, "soft": soft}


def skill_category(skill: str) -> str:
    for category, skills in SKILL_TAXONOMY.items():
        if skill in skills:
            return category
    return "Other"


def all_skills() -> list[str]:
    """Flat sorted list of every skill in the taxonomy."""
    return sorted({s for skills in SKILL_TAXONOMY.values() for s in skills})
