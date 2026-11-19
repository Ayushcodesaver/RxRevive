import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Check, Clock, Lock, Sparkles, X } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { dashboardGate } from "@/components/dashboard/gate";
import { getAnalysis } from "@/lib/convex/server-data";
import { scoreClass, modelLabel } from "@/lib/api/client";
import { ScoreRing } from "@/components/analysis/score-ring";
import { MatchList } from "@/components/analysis/match-list";

export const metadata: Metadata = { title: "Analysis Results" };

export default async function AnalysisResultsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const gate = await dashboardGate();
  if (!gate.ok) {
    return <section className="section"><div className="container">{gate.node}</div></section>;
  }
  const record = await getAnalysis(gate.userId, id);
  if (!record) notFound();

  interface EngineLite {
    match_percentage: number; suitability: { label: string }; cosine_label: string; cosine_percentage: number;
    skill_percentage: number; processing_time: number; matched_skills: string[]; missing_skills: string[];
    strengths: string[]; recommendations: string[]; details: string[]; disclaimer: string;
    experience_alignment: { status: string; message: string }; education_alignment: { status: string; message: string };
  }
  const payload = record.results as { traditional?: EngineLite; transformer?: EngineLite };
  const primary = payload?.transformer || payload?.traditional;
  if (!primary) notFound();

  return (
    <>
      <PageHeader
        title="Analysis Results"
        subtitle={`${record.jobTitle || "Untitled role"}${record.company ? `, ${record.company}` : ""}. Analyzed ${new Date(record.createdAt).toLocaleString()} with ${modelLabel(record.engine)}.`}
      />
      <section className="section">
        <div className="container" style={{ display: "grid", gap: "var(--space-xl)" }}>
          {record.traditionalScore != null && record.transformerScore != null ? (
            <div className="score-duo">
              <div className="well score-panel">
                <h3>Traditional NLP (TF-IDF)</h3>
                <ScoreRing value={record.traditionalScore} size={150} />
              </div>
              <div className="well score-panel">
                <h3>Transformer NLP (SBERT)</h3>
                <ScoreRing value={record.transformerScore} size={150} />
              </div>
              <div className="well diff-panel">
                <h3>Difference</h3>
                <p className="diff-value">{record.transformerScore - record.traditionalScore >= 0 ? "+" : ""}{Math.round(record.transformerScore - record.traditionalScore)} pts</p>
                <p className="muted small">Transformer minus Traditional on identical inputs.</p>
              </div>
            </div>
          ) : (
            <div className="well single-score" style={{ display: "flex", alignItems: "center", gap: "var(--space-2xl)" }}>
              <ScoreRing value={primary.match_percentage} label={primary.suitability.label} />
              <span className={`score-chip ${scoreClass(primary.match_percentage)}`}>{primary.suitability.label}</span>
            </div>
          )}

          <div className="well">
            <h3 className="card-title"><Check size={20} aria-hidden="true" /> The match list</h3>
            <MatchList
              items={[
                ...primary.matched_skills.map((skill) => ({ skill, present: true })),
                ...primary.missing_skills.map((skill) => ({ skill, present: false })),
              ]}
            />
            <h4 className="sub-title"><Sparkles size={16} aria-hidden="true" /> Strengths and recommendations</h4>
            <ul className="point-list">{primary.strengths.map((s) => <li key={s}>{s}</li>)}</ul>
            <ul className="point-list">{primary.recommendations.map((s) => <li key={s}>{s}</li>)}</ul>
            <h4 className="sub-title"><Clock size={16} aria-hidden="true" /> Experience &amp; education alignment</h4>
            <ul className="point-list">
              <li>{primary.experience_alignment.message} <span className={`align-tag ${primary.experience_alignment.status === "match" ? "match" : "gap"}`}>{primary.experience_alignment.status}</span></li>
              <li>{primary.education_alignment.message} <span className={`align-tag ${primary.education_alignment.status === "match" ? "match" : "gap"}`}>{primary.education_alignment.status}</span></li>
            </ul>
          </div>

          <div className="well disclaimer-card">
            <h2 className="card-title"><Lock size={20} aria-hidden="true" /> Important disclaimer</h2>
            <p>{primary.disclaimer}</p>
          </div>
        </div>
      </section>
    </>
  );
}
