"use client";

/** Dataset upload + validation + evaluation, driven by the Python service.
 * Validation always runs (no credentials needed). Persistence and saved
 * evaluations require Convex; the state is reported honestly.
 */

import { useState } from "react";
import { Upload } from "lucide-react";
import { config } from "@/lib/config";
import { SetupCard } from "@/components/setup/setup-card";
import { MetricsBlock } from "./metrics-block";

interface ValidationReport {
  columns: string[];
  total_rows: number;
  valid_records: number;
  invalid_records: number;
  duplicates_removed: number;
  label_distribution: Record<string, number>;
  missing_values: Record<string, number>;
  issues: string[];
  dropped: Record<string, number>;
  suggested_class_order: string[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface EvaluationResult {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  results: Record<string, any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  validation: Record<string, any>;
  execution: string;
}

export function DatasetUploader() {
  const [datasetContent, setDatasetContent] = useState<string | null>(null);
  const [datasetName, setDatasetName] = useState("");
  const [validation, setValidation] = useState<ValidationReport | null>(null);
  const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null);
  const [busy, setBusy] = useState<"validating" | "evaluating" | null>(null);
  const [status, setStatus] = useState<{ text: string; kind: "" | "error" | "ok" }>({ text: "", kind: "" });
  const [engines, setEngines] = useState<"traditional" | "both">("traditional");

  const signedIn = config.clerkConfigured; // deepened client-side by useUser in providers
  const persistenceReady = signedIn && config.convexConfigured;

  async function readFile(file: File | undefined) {
    if (!file) return;
    setDatasetName(file.name);
    const text = await file.text();
    setDatasetContent(text);
    setValidation(null);
    setEvaluation(null);
    setStatus({ text: `Loaded ${file.name}. Validate it next.`, kind: "" });
  }

  async function validate() {
    if (!datasetContent) return;
    setBusy("validating");
    setStatus({ text: "Validating the CSV…", kind: "" });
    try {
      const response = await fetch("/api/datasets/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataset_content: datasetContent, filename: datasetName }),
      });
      const body = await response.json();
      if (!body.success) throw new Error(body.error);
      setValidation(body.data);
      setStatus({ text: `Validation complete: ${body.data.valid_records} usable records.`, kind: "ok" });
    } catch (error) {
      setStatus({ text: error instanceof Error ? error.message : "Validation failed.", kind: "error" });
    } finally {
      setBusy(null);
    }
  }

  async function runEvaluation() {
    if (!datasetContent || !validation) return;
    setBusy("evaluating");
    setStatus({ text: "Running the evaluation in Python (real inference; may take a while)…", kind: "" });
    try {
      const response = await fetch("/api/evaluation/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dataset_content: datasetContent,
          engines: engines === "both" ? ["traditional", "transformer"] : ["traditional"],
        }),
      });
      const body = await response.json();
      if (!body.success) throw new Error(body.error);
      setEvaluation(body.data);
      setStatus({ text: "Evaluation complete.", kind: "ok" });
    } catch (error) {
      setStatus({ text: error instanceof Error ? error.message : "Evaluation failed.", kind: "error" });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div style={{ display: "grid", gap: "var(--space-lg)" }}>
      <div className="well">
        <div className="upload-row" style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-md)", alignItems: "center" }}>
          <input type="file" accept=".csv" onChange={(e) => readFile(e.target.files?.[0])} aria-label="Dataset CSV file" style={{ maxWidth: 320 }} />
          <button className="btn" type="button" onClick={validate} disabled={!datasetContent || busy !== null}>
            <Upload size={16} aria-hidden="true" /> Validate dataset
          </button>
          <button className="btn quiet" type="button" onClick={runEvaluation} disabled={!validation || busy !== null}>
            {busy === "evaluating" ? "Evaluating…" : "Run evaluation"}
          </button>
          {validation ? (
            <label className="field-label" style={{ margin: 0 }}>
              <input type="checkbox" checked={engines === "both"} onChange={(e) => setEngines(e.target.checked ? "both" : "traditional")} style={{ width: "auto", minHeight: 0 }} />
              <span style={{ fontWeight: 600 }}>Include the Transformer engine (slower: real inference)</span>
            </label>
          ) : null}
        </div>
        <p className="form-status" role="status" aria-live="polite">{status.text}</p>
        <p className="form-status">{persistenceReady ? "Signed in: datasets and evaluations persist to Convex." : "Not persisting: sign in with Clerk and configure Convex to keep datasets and evaluations."}</p>
      </div>

      {validation ? (
        <div className="well">
          <h3 className="card-title">Validation report</h3>
          <div className="stats-cards" style={{ gridTemplateColumns: "repeat(4, minmax(0,1fr))" }}>
            <div className="stat-card"><span className="stat-value num">{validation.total_rows}</span><span className="stat-label">Total rows</span></div>
            <div className="stat-card"><span className="stat-value num">{validation.valid_records}</span><span className="stat-label">Valid records</span></div>
            <div className="stat-card"><span className="stat-value num">{validation.invalid_records}</span><span className="stat-label">Invalid / duplicates</span></div>
            <div className="stat-card">
              <span className="stat-label" style={{ fontWeight: 600 }}>Label distribution</span>
              {Object.entries(validation.label_distribution).map(([label, count]) => (
                <span className="stat-label" key={label}>{label}: {count}</span>
              ))}
            </div>
          </div>
          {validation.issues.length ? (
            <p className="muted small" style={{ marginTop: "var(--space-md)" }}>{validation.issues.join(" · ")}</p>
          ) : null}
        </div>
      ) : null}

      {evaluation ? <MetricsBlock results={evaluation.results} execution={evaluation.execution} /> : null}

      {!config.clerkConfigured || !config.convexConfigured ? (
        <SetupCard
          service="Convex database"
          icon="db"
          steps={[
            { label: "Create a Convex project and run", command: "npx convex dev" },
            { label: "Set NEXT_PUBLIC_CONVEX_URL in web/.env.local", command: "" },
            { label: "Sign in with Clerk so records have an owner", command: "" },
          ]}
        />
      ) : null}
    </div>
  );
}
