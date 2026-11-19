import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { dashboardGate } from "@/components/dashboard/gate";
import { listExperiments } from "@/lib/convex/server-data";

export const metadata: Metadata = { title: "Experiment History" };

export default async function ExperimentsPage() {
  const gate = await dashboardGate();
  if (!gate.ok) {
    return <section className="section"><div className="container">{gate.node}</div></section>;
  }
  const experiments = await listExperiments(gate.userId);

  return (
    <>
      <PageHeader
        title="Experiment History"
        subtitle="Reproducible research runs: every experiment records its seed, split, model version and results."
      />
      <section className="section">
        <div className="container">
          {experiments && experiments.length > 0 ? (
            <div className="well">
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr><th>Created</th><th>Name</th><th>Model version</th><th>Configuration</th></tr>
                  </thead>
                  <tbody>
                    {experiments.map((experiment: { _id: string; createdAt: number; name: string; modelVersion?: string; configuration?: Record<string, unknown> }) => (
                      <tr key={experiment._id}>
                        <td>{new Date(experiment.createdAt).toLocaleString()}</td>
                        <td>{experiment.name}</td>
                        <td>{experiment.modelVersion || "-"}</td>
                        <td className="muted small">{experiment.configuration ? JSON.stringify(experiment.configuration).slice(0, 120) : "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="well">
              <p className="muted">
                No experiments yet. Evaluation runs you record become experiments; start from the{" "}
                <Link className="inline-link" href="/datasets">datasets page</Link>.
              </p>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
