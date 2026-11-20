"use client";

/** AI-drafted resume improvements (Gemini via the Python service).
 * Everything renders with an explicit AI-drafted label and the model's own
 * cautions; honesty is the point of this panel, not an afterthought.
 */

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { requestAssist, type AssistPayload } from "@/lib/api/client";

export function AiSuggestions({
  resumeText,
  jobDescription,
  matchedSkills,
  missingSkills,
  matchScore,
  similarityPct,
  skillPct,
}: {
  resumeText: string;
  jobDescription: string;
  matchedSkills: string[];
  missingSkills: string[];
  matchScore: number;
  similarityPct: number;
  skillPct: number;
}) {
  const [payload, setPayload] = useState<AssistPayload | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ text: string; kind: "" | "error" }>({ text: "", kind: "" });

  async function draft() {
    setBusy(true);
    setStatus({ text: "Gemini is drafting from your own resume content… this can take up to a couple of minutes when demand is high.", kind: "" });
    try {
      const response = await requestAssist({
        resume_text: resumeText,
        job_description: jobDescription,
        matched_skills: matchedSkills,
        missing_skills: missingSkills,
        match_score: matchScore,
        similarity_pct: similarityPct,
        skill_pct: skillPct,
      });
      setPayload(response.data);
      setStatus({ text: "", kind: "" });
    } catch (error) {
      setStatus({ text: error instanceof Error ? error.message : "The AI assist failed.", kind: "error" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="well ai-assist">
      <h3 className="card-title"><Sparkles size={20} aria-hidden="true" /> AI-drafted resume improvements</h3>
      {!payload ? (
        <>
          <p className="muted small" style={{ marginBottom: "var(--space-md)" }}>
            Gemini drafts a tailored summary, bullets for the missing skills and keyword placement
            advice, working only from your own resume content. Every line is labelled as a draft;
            nothing here is a fact until you verify it.
          </p>
          <div className="form-actions" style={{ marginTop: 0 }}>
            <button className="btn quiet" type="button" onClick={draft} disabled={busy}>
              <Sparkles size={16} aria-hidden="true" /> {busy ? "Drafting…" : "Draft suggestions with Gemini"}
            </button>
            <p className="form-status" role="status" aria-live="polite">{status.text}</p>
          </div>
        </>
      ) : (
        <div style={{ display: "grid", gap: "var(--space-lg)" }}>
          <span className="status-badge info">AI-drafted by {payload.model} · verify before use</span>

          <div>
            <h4 className="sub-title" style={{ marginTop: 0 }}>Tailored professional summary</h4>
            <p style={{ color: "var(--color-ink-2)" }}>{payload.summary}</p>
          </div>

          {payload.bullets.length ? (
            <div>
              <h4 className="sub-title">Bullet suggestions for missing skills</h4>
              <ul className="point-list">
                {payload.bullets.map((bullet) => (
                  <li key={bullet.missing_skill + bullet.suggestion}>
                    <span>
                      <span className="chip missing" style={{ marginRight: "var(--space-2xs)" }}>{bullet.missing_skill}</span>
                      {bullet.suggestion}
                      {bullet.grounding ? <span className="muted small"> (builds on: {bullet.grounding})</span> : null}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {payload.keywords.length ? (
            <div>
              <h4 className="sub-title">Worth placing naturally</h4>
              <div className="chip-row">{payload.keywords.map((keyword) => <span className="tech-chip" key={keyword}>{keyword}</span>)}</div>
            </div>
          ) : null}

          <div className="note-mini">
            <p><strong>Before you use this:</strong> {payload.cautions}</p>
            <p style={{ marginTop: "var(--space-2xs)" }}>{payload.disclaimer}</p>
          </div>

          <div>
            <button className="btn quiet small" type="button" onClick={draft} disabled={busy}>
              <Sparkles size={16} aria-hidden="true" /> Draft again
            </button>
            <p className="form-status" role="status" aria-live="polite">{status.text}</p>
          </div>
        </div>
      )}
    </div>
  );
}
