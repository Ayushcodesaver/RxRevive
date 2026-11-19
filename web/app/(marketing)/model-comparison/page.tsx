import type { Metadata } from "next";
import Link from "next/link";
import { Brain, Check, Lock, Scale, ScanSearch } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { dashboardGate } from "@/components/dashboard/gate";
import { listAnalyses } from "@/lib/convex/server-data";
import { scoreClass } from "@/lib/api/client";

export const metadata: Metadata = { title: "Model Comparison" };

export default async function ModelComparisonPage() {
  const gate = await dashboardGate();
  const comparisons = gate.ok ? (((await listAnalyses(gate.userId)) ?? []) as Array<{ _id: string; createdAt: number; jobTitle?: string; engine: string; traditionalScore: number | null; transformerScore: number | null }>).filter((a) => a.engine === "compare") : [];
  return (
    <>
      <PageHeader
        title="Model Comparison"
        subtitle="Traditional NLP and Transformer NLP, side by side on identical inputs. The live experiment history lives in your dashboard."
      />
      <section className="section">
        <div className="container">
          <div className="two-col">
            <article className="well">
              <h3 className="card-title"><ScanSearch size={20} aria-hidden="true" /> Traditional NLP</h3>
              <ul className="check-list">
                <li><Check size={18} aria-hidden="true" /> TF-IDF vectorization (keyword-based)</li>
                <li><Check size={18} aria-hidden="true" /> Cosine similarity on term vectors</li>
                <li><Check size={18} aria-hidden="true" /> Fast, deterministic, explainable</li>
              </ul>
            </article>
            <article className="well">
              <h3 className="card-title"><Brain size={20} aria-hidden="true" /> Transformer NLP</h3>
              <ul className="check-list">
                <li><Check size={18} aria-hidden="true" /> Sentence-BERT embeddings (contextual)</li>
                <li><Check size={18} aria-hidden="true" /> Semantic cosine similarity</li>
                <li><Check size={18} aria-hidden="true" /> Understands meaning beyond keywords</li>
              </ul>
            </article>
          </div>
          <div className="well" style={{ marginTop: "var(--space-xl)" }}>
            <h2 className="card-title"><Scale size={20} aria-hidden="true" /> Run the real comparison</h2>
            <p className="muted" style={{ marginBottom: "var(--space-md)" }}>
              Pick “Compare Both” in the analyzer: both engines receive the exact same resume and job
              description text, the same skill taxonomy and the same 60/40 weights, so the two scores are
              directly comparable.
            </p>
            <Link className="btn" href="/resume-analysis"><Scale size={18} aria-hidden="true" /> Run a comparison</Link>
          </div>
        </div>
      </section>
      {gate.ok ? (
        <section className="section">
          <div className="container">
            <div className="section-head">
              <h2>Your comparison experiments</h2>
              <p>From your own stored runs; sign in to build this history.</p>
            </div>
            {comparisons.length > 0 ? (
              <div className="well">
                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr><th>Date</th><th>Job title</th><th>Traditional</th><th>Transformer</th><th>Difference</th></tr>
                    </thead>
                    <tbody>
                      {comparisons.map((row: { _id: string; createdAt: number; jobTitle?: string; traditionalScore: number | null; transformerScore: number | null }) => {
                        const diff = (row.transformerScore ?? 0) - (row.traditionalScore ?? 0);
                        return (
                          <tr key={row._id}>
                            <td>{new Date(row.createdAt).toLocaleString()}</td>
                            <td>{row.jobTitle || "-"}</td>
                            <td><span className={`score-chip ${scoreClass(row.traditionalScore)}`}>{row.traditionalScore != null ? Math.round(row.traditionalScore) : "-"}%</span></td>
                            <td><span className={`score-chip ${scoreClass(row.transformerScore)}`}>{row.transformerScore != null ? Math.round(row.transformerScore) : "-"}%</span></td>
                            <td><span className={`score-chip ${diff > 0 ? "mid" : diff < 0 ? "low" : "high"}`}>{diff >= 0 ? "+" : ""}{Math.round(diff)}</span></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="well">
                <p className="muted">No comparison experiments yet. Run one with “Compare Both” above.</p>
              </div>
            )}
          </div>
        </section>
      ) : null}
      <section className="section section-alt">
        <div className="container">
          <div className="well">
            <h2 className="card-title"><Lock size={20} aria-hidden="true" /> How to interpret the scores</h2>
            <p className="muted">
              The two scores are <strong>not calibrated probabilities</strong> and are not directly interchangeable.
              TF-IDF measures lexical overlap, SBERT measures semantic proximity, and both are combined with skill
              coverage using the same 60/40 weighting. A 10-point difference means the engines weighted your
              evidence differently, not that one candidate is “10% more employable”. For predictive quality, use a
              labelled dataset: the{" "}
              <Link className="inline-link" href="/evaluation">evaluation page</Link> computes accuracy, precision,
              recall and F1 from real predictions.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
