import type { Metadata } from "next";
import { Database } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { DatasetUploader } from "@/components/dashboard/dataset-uploader";

export const metadata: Metadata = { title: "Dataset & Research" };

const DATASETS = [
  { name: "Resume-Job Fit Dataset", tag: "Primary", size: "~93,733 examples", format: "CSV (Hugging Face)", features: "Text pairs, fit labels", splits: "Train and test provided" },
  { name: "Resume-JD Matching Dataset", tag: "Alternative", size: "~29,040 pairs, synthetic", format: "CSV", features: "Resume-JD pairs, match labels", splits: "Single split" },
  { name: "Resume and JD Matching Dataset", tag: "Supplementary", size: "~1,031 samples", format: "CSV", features: "Matched pairs, scores", splits: "Single split" },
  { name: "Role Radar Dataset", tag: "Regional", size: "~22,465 profile-job pairs, India", format: "CSV", features: "Postings, profiles, scores", splits: "Single split" },
];

export default function ResearchPage() {
  return (
    <>
      <PageHeader
        title="Dataset & Research"
        subtitle="Candidate datasets for supervised evaluation of both engines. Source links are added only after verification; none are invented here."
      />
      <section className="section">
        <div className="container">
          <div className="section-head">
            <h2>Candidate datasets</h2>
            <p>Primary recommendation: the <strong>Resume-Job Fit Dataset</strong>. Verify sizes on Hugging Face before citing.</p>
          </div>
          <div className="feature-grid" style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
            {DATASETS.map((dataset) => (
              <article className="well" key={dataset.name}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "var(--space-md)", marginBottom: "var(--space-lg)" }}>
                  <h3 className="card-title" style={{ marginBottom: 0 }}><Database size={18} aria-hidden="true" /> {dataset.name}</h3>
                  <span className="status-badge info">{dataset.tag}</span>
                </div>
                <dl className="dataset-meta" style={{ display: "grid" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "88px 1fr", gap: "var(--space-md)", paddingBlock: "var(--space-sm)", borderBottom: "1px solid var(--color-rule-2)", fontSize: "var(--text-sm)" }}>
                    <dt className="muted">Size</dt><dd style={{ margin: 0 }}>{dataset.size}</dd>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "88px 1fr", gap: "var(--space-md)", paddingBlock: "var(--space-sm)", borderBottom: "1px solid var(--color-rule-2)", fontSize: "var(--text-sm)" }}>
                    <dt className="muted">Format</dt><dd style={{ margin: 0 }}>{dataset.format}</dd>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "88px 1fr", gap: "var(--space-md)", paddingBlock: "var(--space-sm)", borderBottom: "1px solid var(--color-rule-2)", fontSize: "var(--text-sm)" }}>
                    <dt className="muted">Features</dt><dd style={{ margin: 0 }}>{dataset.features}</dd>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "88px 1fr", gap: "var(--space-md)", paddingBlock: "var(--space-sm)", borderBottom: "1px solid var(--color-rule-2)", fontSize: "var(--text-sm)" }}>
                    <dt className="muted">Splits</dt><dd style={{ margin: 0 }}>{dataset.splits}</dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
          <p className="muted small" style={{ marginTop: "var(--space-lg)" }}>Verified source links land once the team confirms them.</p>
        </div>
      </section>

      <section className="section section-alt">
        <div className="container">
          <div className="section-head">
            <h2>Preprocessing pipeline</h2>
            <p>Applied identically to both engines so any performance difference comes from the model, not the data handling.</p>
          </div>
          <ol className="arch-steps" style={{ gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }}>
            <li><strong>Normalisation</strong><span>Unicode punctuation folded, lowercased.</span></li>
            <li><strong>Symbol removal</strong><span>Noise stripped, C++ and C# kept.</span></li>
            <li><strong>Tokenisation</strong><span>Word tokens keep skill punctuation.</span></li>
            <li><strong>Stop words</strong><span>Built-in list, no downloads.</span></li>
            <li><strong>Cleaning</strong><span>Whitespace collapsed, length guarded.</span></li>
            <li><strong>Skills</strong><span>Word-boundary match over the taxonomy.</span></li>
            <li><strong>Features</strong><span>TF-IDF vectors or SBERT embeddings.</span></li>
            <li><strong>Splits</strong><span>One labelled split, shared by both.</span></li>
          </ol>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head">
            <h2>Upload a labelled dataset (CSV)</h2>
            <p>For authorized experiments. The CSV is validated, stored with your account and evaluated by the Python service.</p>
          </div>
          <DatasetUploader />
        </div>
      </section>
    </>
  );
}
