import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";

export const metadata: Metadata = { title: "Project Architecture" };

export default function ArchitecturePage() {
  return (
    <>
      <PageHeader
        title="Project Architecture"
        subtitle="From user interface to database and PDF reports: the complete flow, with the NLP layer branching into both engines."
      />
      <section className="section">
        <div className="container">
          <ol className="arch-steps">
            <li><strong>Resume upload</strong><span>PDF, DOCX, TXT; validated</span></li>
            <li><strong>Text extraction</strong><span>In memory, cleaned, scans flagged</span></li>
            <li><strong>Preprocessing</strong><span>Normalise, tokenise, stop words</span></li>
            <li className="core"><strong>NLP processing layer</strong><span>One taxonomy, 150+ skills</span></li>
            <li><strong>Matching and skills</strong><span>0.6 × similarity + 0.4 × coverage</span></li>
            <li><strong>Results</strong><span>Rings and bars, the verdict</span></li>
            <li><strong>Database</strong><span>Convex records per user</span></li>
            <li><strong>PDF report</strong><span>ReportLab, on demand</span></li>
          </ol>
          <div className="arch-branch-rows">
            <div className="branch-row">
              <span className="tag-out">Branch A</span>
              <div>
                <strong>Traditional NLP</strong>
                <span>TF-IDF vectors, cosine similarity. Fast, deterministic, explainable.</span>
              </div>
            </div>
            <div className="branch-row">
              <span className="tag-in">Branch B</span>
              <div>
                <strong>Transformer NLP</strong>
                <span>Sentence-BERT embeddings, semantic cosine. Contextual, paraphrase-aware.</span>
              </div>
            </div>
          </div>
        </div>
      </section>
      <section className="section section-alt">
        <div className="container">
          <div className="section-head">
            <h2>The four services</h2>
            <p>Each one owns one job; none reaches into another's secrets.</p>
          </div>
          <ul className="needs-list">
            <li><strong>Next.js (web/)</strong><span>The Ink interface, pages and forms. Holds no secrets in the browser.</span></li>
            <li><strong>Clerk</strong><span>Authentication, sessions, profile. Issues the tokens FastAPI verifies.</span></li>
            <li><strong>Convex (convex/)</strong><span>Users, analyses, reports, datasets, evaluations, experiments. Every query checks ownership.</span></li>
            <li><strong>FastAPI (ai-backend/)</strong><span>All NLP: extraction, TF-IDF, Sentence-BERT, evaluation, ReportLab PDFs.</span></li>
          </ul>
        </div>
      </section>
      <section className="section">
        <div className="container">
          <div className="section-head">
            <h2>Codebase structure</h2>
            <p>Routes are thin, engines are swappable, shared logic lives once.</p>
          </div>
          <div className="arch-readout">
            <ul className="arch-facts">
              <li><strong>web/</strong><span>Next.js App Router, TypeScript</span></li>
              <li><strong>convex/</strong><span>Schema and functions</span></li>
              <li><strong>ai-backend/</strong><span>FastAPI, both engines</span></li>
              <li><strong>datasets/</strong><span>Labelled CSVs for evaluation</span></li>
              <li><strong>generated_reports/</strong><span>Generated PDFs</span></li>
            </ul>
            <figure className="code-fig" style={{ margin: 0 }}>
              <pre className="code-block">{`RxRevive/
├── web/                    (Next.js, Ink design)
│   ├── app/                (marketing, dashboard, api)
│   ├── components/         (chrome, analysis, ui)
│   └── lib/                (api, validation, convex)
├── convex/                 (schema + functions)
├── ai-backend/             (FastAPI service)
│   ├── app/api/            (routers)
│   ├── app/shared/         (extraction, taxonomy)
│   ├── app/traditional_nlp/ (Branch A)
│   ├── app/transformer_nlp/ (Branch B)
│   ├── app/evaluation/     (metrics, thresholds)
│   └── tests/              (pytest suite)
└── datasets/               (labelled CSVs)`}</pre>
            </figure>
          </div>
        </div>
      </section>
      <section className="band-close">
        <div className="container">
          <div>
            <h2>Trace one analysis yourself.</h2>
            <p>Follow a resume from upload to PDF report, engine by engine.</p>
            <div className="hero-actions">
              <Link className="btn paper" href="/resume-analysis">Run an analysis</Link>
              <Link className="btn quiet" href="/how-it-works">The ten steps</Link>
            </div>
          </div>
          <dl className="engine-facts">
            <div><dt>Input</dt><dd>One resume, one job description</dd></div>
            <div><dt>Path</dt><dd>Both engines, same weights</dd></div>
            <div><dt>Output</dt><dd>Two scores, a match list, a PDF</dd></div>
          </dl>
        </div>
      </section>
    </>
  );
}
