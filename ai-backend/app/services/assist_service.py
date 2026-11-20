"""Gemini resume-assist service: AI-drafted descriptions for the resume.

Given the analysis context (resume excerpt, job description excerpt, matched
and missing skills, scores), Gemini drafts:

- a rewritten professional summary tailored to THIS job description
- concrete bullet-point suggestions for the missing skills, grounded in the
  resume's own content
- keyword placement advice

Honesty rules, enforced by prompt and by the UI that renders the result:

- The model may only restate facts present in the resume; anything else must
  be written as an explicit placeholder ("[ADD: ...]").
- The output is labelled AI-drafted everywhere it renders; the user verifies
  every line before using it.
- Without GEMINI_API_KEY the endpoint answers "not configured" and nothing
  is faked.
"""

import json
import time
from datetime import datetime, timezone

import httpx

from ..core.config import get_settings


class AssistUnavailableError(Exception):
    """Raised when Gemini is not configured or the API call fails."""


MAX_CONTEXT_CHARS = 6000


def _clip(text: str, limit: int = MAX_CONTEXT_CHARS) -> str:
    return (text or "").strip()[:limit]


def build_prompt(resume_text: str, job_description: str, matched: list[str],
                 missing: list[str], match_score: float, similarity_pct: float,
                 skill_pct: float) -> str:
    """Build the coaching prompt. The honesty constraints live here."""
    return f"""You are a precise, honest resume coach. Draft improvements for the resume below,
targeting the job description. Work ONLY from facts present in the resume:

- Never invent employers, job titles, dates, degrees, certifications or numbers.
- If a bullet would need a fact the resume does not contain, write it with an
  explicit placeholder like [ADD: employer or project name].
- Keep the candidate's own wording and domain; do not change their field.

Analysis context (from a real NLP comparison run):
- Overall match score: {match_score}%  (document similarity {similarity_pct}%, skill coverage {skill_pct}%)
- Skills already in the resume: {", ".join(matched[:20]) or "(none matched)"}
- Skills the job wants that are missing: {", ".join(missing[:15]) or "(none)"}

Draft, in English, for this exact resume:

RESUME:
{_clip(resume_text)}

JOB DESCRIPTION:
{_clip(job_description)}

Return ONLY valid JSON with this exact shape:
{{
  "summary": "a 3-4 sentence professional summary tailored to this job description",
  "bullets": [
    {{"missing_skill": "one missing skill", "suggestion": "one resume bullet the candidate could truthfully adapt", "grounding": "which resume section/experience it builds on"}}
  ],
  "keywords": ["missing skills or phrases worth placing naturally in the resume"],
  "cautions": "one short paragraph: what the candidate must verify or fill in before using this"
}}

Rules: 3 to 6 bullets, only for missing skills, each grounded in real resume
content or marked with a placeholder. The summary must not claim experience the
resume does not show."""


# Demand concentrates on the headline model; these alternates usually have
# capacity. Each is tried in order until one answers.
FALLBACK_MODELS = ["gemini-3.8-flash", "gemini-3-flash-preview", "gemini-flash-latest"]


def _generate(model: str, prompt: str) -> httpx.Response:
    """One generation attempt against one model."""
    url = (
        f"https://generativelanguage.googleapis.com/v1beta/models/"
        f"{model}:generateContent"
    )
    body = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"responseMimeType": "application/json", "temperature": 0.4},
    }
    # the key travels in the header (required for the new AQ. key format,
    # and keeps it out of URLs and access logs)
    headers = {"x-goog-api-key": get_settings().gemini_api_key}
    return httpx.post(url, json=body, headers=headers, timeout=get_settings().gemini_timeout_s)


def call_gemini(prompt: str) -> dict:
    """Call the Gemini REST API (Google AI Studio key) and return parsed JSON.

    Tries the configured model first, then the fallback list, retrying
    transient timeouts and 503s (high-demand spikes) along the way."""
    settings = get_settings()
    if not settings.gemini_api_key:
        raise AssistUnavailableError(
            "GEMINI_API_KEY is not configured. Get a key at https://aistudio.google.com/apikey "
            "and set it in the AI backend environment."
        )

    # the configured model first, then fallbacks; ONE attempt each (90 s cap)
    # so the worst case stays ~5 minutes instead of spiralling
    models = [settings.gemini_model] + [m for m in FALLBACK_MODELS if m != settings.gemini_model]
    last_problem = "no response"
    for model in models:
        try:
            response = _generate(model, prompt)
        except httpx.HTTPError as exc:
            last_problem = f"{model}: connection issue ({exc})"
            continue
        if response.status_code == 404:
            last_problem = f"{model}: not available (404)"
            continue
        if response.status_code == 503:
            last_problem = f"{model}: high demand (503)"
            continue
        if response.status_code == 429:
            last_problem = f"{model}: quota exceeded (429)"
            continue
        if response.status_code >= 400:
            last_problem = f"{model}: status {response.status_code}"
            continue
        try:
            payload = response.json()
            text = payload["candidates"][0]["content"]["parts"][0]["text"]
            return json.loads(text)
        except (KeyError, IndexError, json.JSONDecodeError) as exc:
            raise AssistUnavailableError("Gemini returned an unexpected response shape.") from exc

    raise AssistUnavailableError(
        f"Gemini is under heavy demand right now ({last_problem}). Try again in a minute."
    )
    if response.status_code == 400 and "API key not valid" in response.text:
        raise AssistUnavailableError("The Gemini API key was rejected. Check GEMINI_API_KEY.")
    if response.status_code == 429:
        raise AssistUnavailableError(
            "Gemini quota exceeded (free tier allows a limited number of requests per minute/day). Try again shortly."
        )
    if response.status_code >= 400:
        raise AssistUnavailableError(f"Gemini API error {response.status_code}: {response.text[:200]}")

    try:
        payload = response.json()
        text = payload["candidates"][0]["content"]["parts"][0]["text"]
        return json.loads(text)
    except (KeyError, IndexError, json.JSONDecodeError) as exc:
        raise AssistUnavailableError("Gemini returned an unexpected response shape.") from exc


def draft_suggestions(resume_text: str, job_description: str, matched: list[str],
                      missing: list[str], match_score: float, similarity_pct: float,
                      skill_pct: float) -> dict:
    """Validate Gemini's output and wrap it with honest metadata."""
    prompt = build_prompt(resume_text, job_description, matched, missing,
                          match_score, similarity_pct, skill_pct)
    started = time.perf_counter()
    raw = call_gemini(prompt)
    elapsed = round(time.perf_counter() - started, 2)

    summary = str(raw.get("summary") or "").strip()
    bullets_raw = raw.get("bullets") if isinstance(raw.get("bullets"), list) else []
    bullets = []
    for item in bullets_raw[:6]:
        if not isinstance(item, dict):
            continue
        bullets.append({
            "missing_skill": str(item.get("missing_skill") or "").strip(),
            "suggestion": str(item.get("suggestion") or "").strip(),
            "grounding": str(item.get("grounding") or "").strip(),
        })
    bullets = [b for b in bullets if b["suggestion"]]
    keywords = [str(k).strip() for k in (raw.get("keywords") or []) if str(k).strip()][:10]
    cautions = str(raw.get("cautions") or "").strip()

    if not summary and not bullets:
        raise AssistUnavailableError("Gemini returned no usable suggestions; try again.")

    settings = get_settings()
    return {
        "summary": summary,
        "bullets": bullets,
        "keywords": keywords,
        "cautions": cautions or "Every line is AI-drafted from your own resume content. Verify each claim is true before using it.",
        "model": settings.gemini_model,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "processing_time": elapsed,
        "disclaimer": (
            "These drafts were generated by Gemini from your own resume content and the job "
            "description. They are suggestions, not facts: confirm every statement is true "
            "before sending this resume anywhere."
        ),
    }
