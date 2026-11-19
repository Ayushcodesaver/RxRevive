import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check, ScanSearch, Target, X } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Analyzer } from "@/components/analysis/analyzer";

export const metadata: Metadata = { title: "Traditional NLP: TF-IDF Resume Matching" };

export default function TraditionalNlpPage() {
  return (
    <>
      <PageHeader
        title="Traditional NLP: TF-IDF Resume Matching"
        subtitle="Resume to job similarity with TF-IDF vectorization and cosine similarity."
      />
      <section className="section">
        <div className="container">
          <div className="section-head">
            <h2>How the TF-IDF engine works</h2>
            <p>The transparent one: it matches words, and shows every weight.</p>
          </div>
          <div className="two-col">
            <article className="well">
              <h3 className="card-title"><ScanSearch size={20} aria-hidden="true" /> The pipeline</h3>
              <ol className="numbered-list">
                <li>Clean and preprocess both documents.</li>
                <li>Build weighted TF-IDF vectors.</li>
                <li>Take the cosine of the two vectors.</li>
                <li>Extract taxonomy skills, word boundaries.</li>
                <li>Score: similarity 60, coverage 40.</li>
              </ol>
              <div className="chip-row">
                {["TF-IDF", "Cosine similarity", "scikit-learn"].map((chip) => (
                  <span className="tech-chip" key={chip}>{chip}</span>
                ))}
              </div>
            </article>
            <article className="well">
              <h3 className="card-title"><Target size={20} aria-hidden="true" /> What it measures well</h3>
              <ul className="check-list">
                <li><Check size={18} aria-hidden="true" /> Exact keyword alignment between documents</li>
                <li><Check size={18} aria-hidden="true" /> Term importance via inverse document frequency</li>
                <li><Check size={18} aria-hidden="true" /> Deterministic, explainable scores</li>
              </ul>
              <h3 className="card-title"><X size={20} aria-hidden="true" /> Known limitation</h3>
              <p className="muted">
                “Built deep learning models” gets no credit against “developed neural network solutions”.
                Zero shared terms; the Transformer engine covers this gap.
              </p>
              <Link className="text-link" href="/transformer-nlp">
                The Transformer engine <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </article>
          </div>
        </div>
      </section>
      <section className="section section-alt">
        <div className="container">
          <div className="section-head">
            <h2>Run the TF-IDF engine</h2>
            <p>This panel uses the actual Python backend. Results are computed live, never hardcoded.</p>
          </div>
          <Analyzer defaultModel="traditional" />
        </div>
      </section>
    </>
  );
}
