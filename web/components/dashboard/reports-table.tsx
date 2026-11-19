"use client";

/** Reports table: generate a ReportLab PDF per analysis and download it.
 * The Python service renders the PDF; ownership is checked server-side. */

import { useState } from "react";
import { Download, Eye, Trash2 } from "lucide-react";

interface AnalysisRow {
  _id: string;
  createdAt: number;
  jobTitle?: string;
  company?: string;
  engine: string;
  traditionalScore?: number | null;
  transformerScore?: number | null;
  matchedSkills: string[];
  missingSkills: string[];
  results: Record<string, unknown>;
}

export function ReportsTable({ analyses }: { analyses: AnalysisRow[] }) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [status, setStatus] = useState<{ text: string; kind: "" | "error" | "ok" }>({ text: "", kind: "" });
  const [query, setQuery] = useState("");

  const filtered = analyses.filter((a) => {
    const haystack = `${a.jobTitle ?? ""} ${a.company ?? ""}`.toLowerCase();
    return haystack.includes(query.toLowerCase());
  });

  async function generate(row: AnalysisRow) {
    setBusyId(row._id);
    setStatus({ text: "Generating the PDF in the Python service…", kind: "" });
    try {
      const response = await fetch("/api/reports/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          analysis_id: row._id,
          model_key: row.engine,
          job_title: row.jobTitle,
          company: row.company,
          payload: row.results,
        }),
      });
      const body = await response.json();
      if (!body.success) throw new Error(body.error);
      window.open(body.data.download_url, "_blank");
      setStatus({ text: "Report generated.", kind: "ok" });
    } catch (error) {
      setStatus({ text: error instanceof Error ? error.message : "Report generation failed.", kind: "error" });
    } finally {
      setBusyId(null);
    }
  }

  async function remove(row: AnalysisRow) {
    setBusyId(row._id);
    try {
      const response = await fetch("/api/analyses/remove", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: row._id }),
      });
      const body = await response.json();
      if (!body.success) throw new Error(body.error);
      setStatus({ text: "Analysis deleted.", kind: "ok" });
      window.location.reload();
    } catch (error) {
      setStatus({ text: error instanceof Error ? error.message : "Delete failed.", kind: "error" });
      setBusyId(null);
    }
  }

  return (
    <div style={{ display: "grid", gap: "var(--space-lg)" }}>
      <div className="filter-bar">
        <div>
          <label className="field-label" htmlFor="filter-q">Search</label>
          <input type="search" id="filter-q" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Job title, company…" />
        </div>
      </div>
      <div className="well">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr><th>Timestamp</th><th>Job</th><th>Model</th><th>Traditional</th><th>Transformer</th><th>Skills</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr key={row._id}>
                  <td>{new Date(row.createdAt).toLocaleString()}</td>
                  <td>
                    {row.jobTitle || "-"}
                    {row.company ? <><br /><span className="muted small">{row.company}</span></> : null}
                  </td>
                  <td>{row.engine}</td>
                  <td>{row.traditionalScore != null ? <span className="score-chip mid">{Math.round(row.traditionalScore)}%</span> : "-"}</td>
                  <td>{row.transformerScore != null ? <span className="score-chip high">{Math.round(row.transformerScore)}%</span> : "-"}</td>
                  <td>
                    <span className="chip matched">{row.matchedSkills.length}</span>{" "}
                    <span className="chip missing">{row.missingSkills.length}</span>
                  </td>
                  <td className="actions">
                    <button className="icon-btn" title="Generate and download the PDF report" aria-label="Generate PDF" disabled={busyId === row._id} onClick={() => generate(row)}>
                      <Download className="icon" aria-hidden="true" />
                    </button>{" "}
                    <a className="icon-btn" href={`/analysis-results/${row._id}`} title="View detailed results" aria-label="View results">
                      <Eye className="icon" aria-hidden="true" />
                    </a>{" "}
                    <button className="icon-btn" title="Delete this analysis" aria-label="Delete" disabled={busyId === row._id} onClick={() => remove(row)}>
                      <Trash2 className="icon" aria-hidden="true" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="form-status" role="status" aria-live="polite">{status.text}</p>
      </div>
    </div>
  );
}
