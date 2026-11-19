import type { Metadata } from "next";
import Link from "next/link";
import { Brain, Gauge, ScanSearch, FileText } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { dashboardGate } from "@/components/dashboard/gate";
import { getDashboardStats } from "@/lib/convex/server-data";
import { scoreClass, modelLabel } from "@/lib/api/client";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const gate = await dashboardGate();
  if (!gate.ok) {
    return <section className="section"><div className="container">{gate.node}</div></section>;
  }
  const stats = await getDashboardStats(gate.userId);

  return (
    <>
      <PageHeader
        title="User Dashboard"
        subtitle="Your analysis history, performance trends and quick actions. Metrics come from your real stored analyses."
      />
      <section className="section">
        <div className="container" style={{ display: "grid", gap: "var(--space-xl)" }}>
          <div className="stats-cards">
            <div className="well stat-card"><span className="stat-value num">{stats?.total ?? 0}</span><span className="stat-label">Total resume analyses</span></div>
            <div className="well stat-card"><span className="stat-value num">{stats?.averageScore != null ? `${Math.round(stats.averageScore)}%` : "Not yet"}</span><span className="stat-label">Average matching score</span></div>
            <div className="well stat-card"><span className="stat-value num">{stats?.traditionalRuns ?? 0}</span><span className="stat-label">Traditional NLP usage</span></div>
            <div className="well stat-card"><span className="stat-value num">{stats?.transformerRuns ?? 0}</span><span className="stat-label">Transformer NLP usage</span></div>
          </div>

          <div className="well">
            <h3 className="card-title">Quick actions</h3>
            <div className="quick-actions">
              <Link className="btn" href="/resume-analysis"><Gauge size={18} aria-hidden="true" /> Analyze New Resume</Link>
              <Link className="btn quiet" href="/traditional-nlp"><ScanSearch size={18} aria-hidden="true" /> Traditional NLP</Link>
              <Link className="btn quiet" href="/transformer-nlp"><Brain size={18} aria-hidden="true" /> Transformer NLP</Link>
              <Link className="btn quiet" href="/model-comparison">Compare Models</Link>
              <Link className="btn quiet" href="/reports"><FileText size={18} aria-hidden="true" /> View Reports</Link>
            </div>
          </div>

          <div className="well">
            <h3 className="card-title">Recent analyses</h3>
            {stats && stats.recent.length > 0 ? (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr><th>Date</th><th>Job title</th><th>Company</th><th>Model</th><th>Score(s)</th><th /></tr>
                  </thead>
                  <tbody>
                    {stats.recent.map((row: { _id: string; createdAt: number; jobTitle?: string; company?: string; engine: string; traditionalScore?: number | null; transformerScore?: number | null }) => (
                      <tr key={row._id}>
                        <td>{new Date(row.createdAt).toLocaleDateString()}</td>
                        <td>{row.jobTitle || "-"}</td>
                        <td>{row.company || "-"}</td>
                        <td>{modelLabel(row.engine)}</td>
                        <td>
                          <span className={`score-chip ${scoreClass(row.traditionalScore)}`}>{row.traditionalScore != null ? Math.round(row.traditionalScore) : "-"}%</span>{" "}
                          <span className={`score-chip ${scoreClass(row.transformerScore)}`}>{row.transformerScore != null ? Math.round(row.transformerScore) : "-"}%</span>
                        </td>
                        <td className="actions">
                          <Link className="inline-link" href={`/analysis-results/${row._id}`}>View</Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="muted small">No analyses yet. Start with the <Link className="inline-link" href="/resume-analysis">analyze page</Link>.</p>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
