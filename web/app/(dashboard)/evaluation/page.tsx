import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { dashboardGate } from "@/components/dashboard/gate";
import { listEvaluations } from "@/lib/convex/server-data";

export const metadata: Metadata = { title: "Model Evaluation" };

export default async function EvaluationPage() {
  const gate = await dashboardGate();
  if (!gate.ok) {
    return <section className="section"><div className="container">{gate.node}</div></section>;
  }
  const evaluations = await listEvaluations(gate.userId);

  return (
    <>
      <PageHeader
        title="Model Evaluation"
        subtitle="Accuracy, precision, recall and F1 computed from real predictions on labelled data. Similarity scores and classification metrics are different things, reported separately."
      />
      <section className="section">
        <div className="container" style={{ display: "grid", gap: "var(--space-xl)" }}>
          {evaluations && evaluations.length > 0 ? (
            evaluations.map((evaluation: { _id: string; engineName: string; createdAt: number; accuracy?: number | null; precision?: number | null; recall?: number | null; f1Score?: number | null; evaluatedRecords: number; results: Record<string, unknown> }) => (
              <div className="well" key={evaluation._id}>
                <h3 className="card-title">{evaluation.engineName} · {new Date(evaluation.createdAt).toLocaleString()}</h3>
                <div className="eval-status">
                  <div className="eval-metric"><strong className="num">{evaluation.accuracy != null ? `${(evaluation.accuracy * 100).toFixed(1)}%` : "—"}</strong><span>Accuracy</span></div>
                  <div className="eval-metric"><strong className="num">{evaluation.precision != null ? evaluation.precision.toFixed(3) : "—"}</strong><span>Precision</span></div>
                  <div className="eval-metric"><strong className="num">{evaluation.recall != null ? evaluation.recall.toFixed(3) : "—"}</strong><span>Recall</span></div>
                  <div className="eval-metric"><strong className="num">{evaluation.f1Score != null ? evaluation.f1Score.toFixed(3) : "—"}</strong><span>F1</span></div>
                  <div className="eval-metric"><strong className="num">{evaluation.evaluatedRecords}</strong><span>Records</span></div>
                </div>
                <p className="muted small" style={{ marginTop: "var(--space-md)" }}>
                  Full metrics, confusion matrices and the threshold configuration are stored in the evaluation record.
                </p>
              </div>
            ))
          ) : (
            <div className="well">
              <p className="muted">
                Not evaluated yet: upload a labelled dataset to calculate performance metrics.{" "}
                <Link className="inline-link" href="/research">Go to the dataset uploader</Link>.
              </p>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
