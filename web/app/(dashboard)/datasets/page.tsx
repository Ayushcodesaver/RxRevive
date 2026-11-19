import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/page-header";
import { dashboardGate } from "@/components/dashboard/gate";
import { listDatasets } from "@/lib/convex/server-data";
import { DatasetUploader } from "@/components/dashboard/dataset-uploader";

export const metadata: Metadata = { title: "Dataset Management" };

export default async function DatasetsPage() {
  const gate = await dashboardGate();
  if (!gate.ok) {
    return <section className="section"><div className="container">{gate.node}</div></section>;
  }
  const datasets = await listDatasets(gate.userId);

  return (
    <>
      <PageHeader
        title="Dataset Management"
        subtitle="Upload labelled CSVs, validate them honestly and run evaluations in the Python service."
      />
      <section className="section">
        <div className="container" style={{ display: "grid", gap: "var(--space-xl)" }}>
          <DatasetUploader />
          {datasets && datasets.length > 0 ? (
            <div className="well">
              <h3 className="card-title">Stored datasets</h3>
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr><th>Name</th><th>Records</th><th>Valid</th><th>Labels</th><th>Status</th></tr>
                  </thead>
                  <tbody>
                    {datasets.map((dataset: { _id: string; datasetName: string; totalRecords: number; validRecords: number; labelDistribution?: Record<string, number>; status: string }) => (
                      <tr key={dataset._id}>
                        <td>{dataset.datasetName}</td>
                        <td className="num">{dataset.totalRecords}</td>
                        <td className="num">{dataset.validRecords}</td>
                        <td>{dataset.labelDistribution ? Object.entries(dataset.labelDistribution).map(([l, c]) => `${l}: ${c}`).join(", ") : "-"}</td>
                        <td><span className="status-badge ok">{dataset.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </div>
      </section>
    </>
  );
}
