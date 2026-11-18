"""Shared analysis helpers: experience/education alignment, suitability, narratives.

Used by BOTH engines so that the two implementations differ only in how they
compute the similarity component of the final score.
"""

import re

WEIGHT_SIMILARITY = 0.6
WEIGHT_SKILLS = 0.4


def suitability_label(score):
    if score >= 75:
        return "Strong Fit"
    if score >= 50:
        return "Moderate Fit"
    if score >= 30:
        return "Partial Fit"
    return "Weak Fit"


DEGREE_LEVELS = [
    ("phd", 4), ("doctorate", 4), ("doctoral", 4),
    ("m.tech", 3), ("mtech", 3), ("master", 3), ("m.sc", 3), ("msc", 3), ("mba", 3), ("mca", 3),
    ("b.tech", 2), ("btech", 2), ("bachelor", 2), ("b.e", 2), ("b.sc", 2), ("bsc", 2),
    ("bca", 2), ("diploma", 1), ("associate", 1),
]


def extract_experience_years(text):
    """Extract the stated years of experience from a resume or JD."""
    text = text.lower()
    # "3+ years", "three years", "5-7 years", "at least 2 years"
    word_numbers = {"one": 1, "two": 2, "three": 3, "four": 4, "five": 5,
                    "six": 6, "seven": 7, "eight": 8, "nine": 9, "ten": 10}
    match = re.search(r"(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s*(?:to|-|–)?\s*(\d+)?\s*\+?\s*years", text)
    if not match:
        return None
    def to_num(part):
        if part is None:
            return None
        return int(part) if part.isdigit() else word_numbers.get(part)
    first = to_num(match.group(1))
    second = to_num(match.group(2))
    return first if first is not None else second


def extract_degree_level(text):
    """Return the highest education level mentioned (0 = none detected)."""
    text = text.lower()
    best = 0
    for degree, level in DEGREE_LEVELS:
        if re.search(r"(?<![a-z])" + re.escape(degree) + r"(?![a-z])", text):
            best = max(best, level)
    return best


DEGREE_NAMES = {0: "not stated", 1: "Diploma / Associate", 2: "Bachelor's", 3: "Master's", 4: "Doctorate"}


def education_alignment(resume_text, jd_text):
    """Compare the highest education level in resume vs JD requirement."""
    r = extract_degree_level(resume_text)
    j = extract_degree_level(jd_text)
    if j == 0:
        return {"status": "info", "message": "The job description does not state an education requirement."}
    if r == 0:
        return {"status": "gap", "message": f"The job asks for a {DEGREE_NAMES[j]} — no degree was detected in the resume."}
    if r >= j:
        return {"status": "match", "message": f"Resume education ({DEGREE_NAMES[r]}) meets the job requirement ({DEGREE_NAMES[j]})."}
    return {"status": "gap", "message": f"Job requires {DEGREE_NAMES[j]}; resume shows {DEGREE_NAMES[r]}."}


def experience_alignment(resume_text, jd_text):
    """Compare stated years of experience in resume vs JD requirement."""
    r = extract_experience_years(resume_text)
    j = extract_experience_years(jd_text)
    if j is None:
        return {"status": "info", "message": "The job description does not state a required experience level."}
    if r is None:
        return {"status": "gap", "message": f"The job asks for {j}+ years of experience — state your years of experience clearly in the resume."}
    if r >= j:
        return {"status": "match", "message": f"Resume experience ({r} years) meets the requirement ({j}+ years)."}
    return {"status": "gap", "message": f"Job requires {j}+ years; resume states {r} years."}


def build_narrative(matched, missing, cosine_pct, skill_pct, shared_terms=None):
    """Strengths and recommendations shared by both engines."""
    strengths, recommendations = [], []

    if matched:
        top = ", ".join(matched[:6])
        strengths.append(
            f"The resume covers {len(matched)} of the skills identified in the job description, including {top}."
        )
    if skill_pct >= 70:
        strengths.append("Skill coverage is high — the resume aligns well with the job requirements.")
    if cosine_pct >= 60:
        strengths.append(f"Strong document similarity ({cosine_pct}%) between the resume and the job description.")
    if shared_terms:
        strengths.append("Shared key terms: " + ", ".join(shared_terms[:8]) + ".")

    if missing:
        recommendations.append(
            "Add evidence of these missing skills: " + ", ".join(missing[:8])
            + " (projects, coursework or certifications count)."
        )
    if skill_pct < 50:
        recommendations.append(
            "Low skill coverage — tailor the resume toward the exact terms used in the job description."
        )
    if cosine_pct < 40:
        recommendations.append(
            "The wording differs strongly from the job description; mirror its vocabulary where truthful."
        )
    if not recommendations:
        recommendations.append(
            "The resume aligns well with this job description — quantify achievements to strengthen it further."
        )
    if not strengths:
        strengths.append("Limited overlap detected — see recommendations below.")
    return strengths, recommendations
