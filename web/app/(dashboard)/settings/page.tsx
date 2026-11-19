import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/page-header";
import { dashboardGate } from "@/components/dashboard/gate";
import { listAnalyses, listDatasets, listEvaluations } from "@/lib/convex/server-data";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const gate = await dashboardGate();
  if (!gate.ok) {
    return <section className="section"><div className="container">{gate.node}</div></section>;
  }
  const [analyses, datasets, evaluations] = await Promise.all([
    listAnalyses(gate.userId),
    listDatasets(gate.userId),
    listEvaluations(gate.userId),
  ]);

  return (
    <>
      <PageHeader title="Settings" subtitle="Your data, and what happens to it." />
      <section className="section">
        <div className="container">
          <div className="well" style={{ maxWidth: 720 }}>
            <h3 className="card-title">Data retention</h3>
            <p className="muted small" style={{ marginBottom: "var(--space-lg)" }}>
              Analyses store the extracted resume text and job description so your history works. Delete an
              analysis from the Reports page and its record (and stored report files) are removed. Nothing is
              shared between accounts; every query checks ownership.
            </p>
            <dl className="breakdown">
              <div className="breakdown-row"><dt>Stored analyses</dt><dd className="num">{analyses?.length ?? 0}</dd></div>
              <div className="breakdown-row"><dt>Stored datasets</dt><dd className="num">{datasets?.length ?? 0}</dd></div>
              <div className="breakdown-row"><dt>Stored evaluations</dt><dd className="num">{evaluations?.length ?? 0}</dd></div>
            </dl>
            <p className="muted small" style={{ marginTop: "var(--space-lg)" }}>
              Account deletion (profile, sessions and data) runs through Clerk; the Convex records are removed with
              the data-retention job documented in BUILD_STATUS.md.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
