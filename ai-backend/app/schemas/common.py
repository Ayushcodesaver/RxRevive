"""Pydantic schemas: shared envelope, analysis requests/responses."""

from typing import Any, Literal

from pydantic import BaseModel, Field


class Metadata(BaseModel):
    processing_time_ms: int | None = None
    model_name: str | None = None
    model_version: str | None = None
    identity_method: str | None = None
    persisted: bool | None = None


class Envelope(BaseModel):
    success: bool = True
    data: Any = None
    metadata: Metadata | None = None
    error: str | None = None


class AnalysisRequest(BaseModel):
    resume_text: str = Field(min_length=1)
    job_description: str = Field(min_length=1)
    job_title: str | None = None
    company: str | None = None


class ExtractionResponse(BaseModel):
    filename: str
    text: str
    preview: str
    chars: int
    looks_scanned: bool


class EngineResult(BaseModel):
    engine: str
    model_key: str
    match_percentage: float
    suitability: dict
    cosine_label: str
    cosine_percentage: float
    skill_percentage: float
    matched_skills: list[str]
    missing_skills: list[str]
    matched_by_category: dict[str, list[str]]
    strengths: list[str]
    recommendations: list[str]
    shared_terms: list[str]
    experience_alignment: dict
    education_alignment: dict
    technical_skills_resume: list[str]
    processing_time: float
    details: list[str]
    disclaimer: str


class CompareResponse(BaseModel):
    traditional: EngineResult | None = None
    transformer: EngineResult | None = None
    difference_points: int | None = None
    error_note: str | None = None


class ModelStatus(BaseModel):
    status: Literal["ready", "unavailable", "not-loaded"]
    message: str
    model_name: str
