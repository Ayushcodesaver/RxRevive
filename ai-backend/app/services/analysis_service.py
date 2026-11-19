"""Analysis service: orchestrates skill extraction and both engines."""

from ..shared.skill_taxonomy import identify_skills
from ..shared.validators import check_document_pair
from ..transformer_nlp.model_manager import ModelUnavailableError


def run_analysis(resume_text: str, job_description: str, engine: str) -> dict:
    """Run one engine, or both for 'compare', over identical inputs."""
    if engine not in ("traditional", "transformer", "compare"):
        raise ValueError("engine must be 'traditional', 'transformer' or 'compare'")
    resume, jd = check_document_pair(resume_text, job_description)

    resume_skills = identify_skills(resume)["skills"]
    jd_skills = identify_skills(jd)["skills"]

    payload: dict = {}
    error_note = None
    traditional = transformer = None

    if engine in ("traditional", "compare"):
        from ..traditional_nlp.tfidf_model import analyze_traditional

        traditional = analyze_traditional(resume, jd, resume_skills, jd_skills)
        payload["traditional"] = traditional
    if engine in ("transformer", "compare"):
        try:
            from ..transformer_nlp.sentence_bert import analyze_transformer

            transformer = analyze_transformer(resume, jd, resume_skills, jd_skills)
            payload["transformer"] = transformer
        except ModelUnavailableError as exc:
            error_note = str(exc)
            if engine == "transformer":
                raise
    if error_note:
        payload["error_note"] = error_note

    primary = transformer or traditional
    payload["primary_model_key"] = primary["model_key"] if primary else None
    payload["difference_points"] = (
        round(transformer["match_percentage"] - traditional["match_percentage"])
        if transformer and traditional else None
    )
    return payload
