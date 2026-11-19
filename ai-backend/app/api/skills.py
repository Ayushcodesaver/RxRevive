"""Skill taxonomy endpoint: the full list both engines share."""

from fastapi import APIRouter

from ..schemas.common import Envelope
from ..shared.skill_taxonomy import SKILL_TAXONOMY, all_skills

router = APIRouter(tags=["skills"])


@router.get("/skills")
def skills() -> Envelope:
    return Envelope(success=True, data={
        "total": len(all_skills()),
        "categories": {category: sorted(skills) for category, skills in SKILL_TAXONOMY.items()},
    })
