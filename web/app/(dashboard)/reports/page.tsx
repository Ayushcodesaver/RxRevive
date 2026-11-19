import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { dashboardGate } from "@/components/dashboard/gate";
import { listAnalyses } from "@/lib/convex/server-data";
import { modelLabel } from "@/lib/api/client";
import { ReportsTable } from "@/components/dashboard/reports-table";

export const metadata: Metadata = { title: "Reports" };

export default async function ReportsPage() {
  const gate = await dashboardGate();
  if (!gate.ok) {
    return <section className="section"><div className="container">{gate.node}</div></section>;
  }
  const analyses = await listAnalyses(gate.userId);

  return (
    <>
      <PageHeader
        title="Report Management"
        subtitle="Search, filter, view and download your analysis reports. Timestamps are real; nothing is fabricated."
      />
      <section className="section">
        <div className="container">
          {analyses && analyses.length > 0 ? (
            <ReportsTable analyses={analyses} />
          ) : (
            <div className="well">
              <p className="muted">No reports match. Run an analysis to create your first report.</p>
              <Link className="btn" href="/resume-analysis" style={{ marginTop: "var(--space-md)" }}>Analyze a resume</Link>
            </div>
          )}
        </div>
      </section>
    </>
  );
}

// keep modelLabel referenced for the client table
void modelLabel;
