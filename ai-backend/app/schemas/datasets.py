"""Pydantic schemas for dataset upload, validation and evaluation."""

from typing import Literal

from pydantic import BaseModel, Field


class DatasetValidateRequest(BaseModel):
    filename: str
    column_map: dict[str, str] | None = None


class DatasetValidateResponse(BaseModel):
    columns: list[str]
    total_rows: int
    valid_records: int
    invalid_records: int
    duplicates_removed: int
    label_distribution: dict[str, int]
    missing_values: dict[str, int]
    issues: list[str]
    dropped: dict[str, int]
    suggested_class_order: list[str]


class EvaluationRunRequest(BaseModel):
    dataset_content: str = Field(description="Raw CSV content")
    column_map: dict[str, str] | None = None
    engines: list[Literal["traditional", "transformer"]] = ["traditional", "transformer"]
    split_ratio: float = Field(default=0.7, ge=0.5, le=0.9)
    seed: int = 42
    class_order: list[str] | None = None
