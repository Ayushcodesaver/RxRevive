"""Curated skill taxonomy and word-boundary skill identification.

Shared by both engines so skill lists stay directly comparable.
"""

import re

SKILL_TAXONOMY = {
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
        "hadoop", "power bi", "tableau", "excel",
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


def _build_pattern(skill):
    escaped = re.escape(skill).replace(r"\ ", r"\s+")
    return re.compile(r"(?<![a-z0-9+.#])" + escaped + r"(?![a-z0-9+.#])", re.IGNORECASE)


_SKILL_PATTERNS = {
    skill: _build_pattern(skill)
    for skills in SKILL_TAXONOMY.values()
    for skill in skills
}


def identify_skills(text):
    """Return {'skills': set, 'by_category': {category: sorted list}, 'technical': sorted list, 'soft': sorted list}."""
    found = set()
    for skill, pattern in _SKILL_PATTERNS.items():
        if pattern.search(text):
            found.add(skill)

    by_category = {}
    for category, skills in SKILL_TAXONOMY.items():
        hits = sorted(found & set(skills))
        if hits:
            by_category[category] = hits

    soft = sorted(found & SOFT_SKILLS)
    technical = sorted(found - SOFT_SKILLS)
    return {"skills": found, "by_category": by_category, "technical": technical, "soft": soft}


def skill_category(skill):
    for category, skills in SKILL_TAXONOMY.items():
        if skill in skills:
            return category
    return "Other"
