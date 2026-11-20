"""Pydantic schemas for the Gemini resume-assist endpoint."""

from pydantic import BaseModel, Field


class AssistRequest(BaseModel):
    resume_text: str = Field(min_length=80)
    job_description: str = Field(min_length=80)
    matched_skills: list[str] = []
    missing_skills: list[str] = []
    match_score: float = 0
    similarity_pct: float = 0
    skill_pct: float = 0


class AssistBullet(BaseModel):
    missing_skill: str
    suggestion: str
    grounding: str


class AssistResponse(BaseModel):
    summary: str
    bullets: list[AssistBullet]
    keywords: list[str]
    cautions: str
    model: str
    generated_at: str
    processing_time: float
    disclaimer: str
