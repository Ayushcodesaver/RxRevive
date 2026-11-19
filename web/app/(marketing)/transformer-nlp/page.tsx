import type { Metadata } from "next";
import { Brain, Check, Cog } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Analyzer } from "@/components/analysis/analyzer";
import { ModelStatusBadge } from "@/components/analysis/model-status";

export const metadata: Metadata = { title: "Transformer NLP: Sentence-BERT Semantic Matching" };

export default function TransformerNlpPage() {
  return (
    <>
      <PageHeader
        title="Transformer NLP: Sentence-BERT Semantic Matching"
        subtitle="This module uses transformer-based semantic embeddings to understand contextual relationships between resume content and job requirements."
      />
      <section className="section">
        <div className="container">
          <div className="section-head">
            <h2>How the Transformer engine works</h2>
            <p>The semantic one: it reads meaning, and costs more compute.</p>
          </div>
          <div className="two-col">
            <article className="well">
              <h3 className="card-title"><Brain size={20} aria-hidden="true" /> The pipeline</h3>
              <ol className="numbered-list">
                <li>Preprocess both documents.</li>
                <li>Encode with <strong>all-MiniLM-L6-v2</strong>, 384 dimensions.</li>
                <li>Take the semantic cosine.</li>
                <li>Extract taxonomy skills, word boundaries.</li>
                <li>Score: similarity 60, coverage 40.</li>
              </ol>
              <div className="chip-row">
                {["Sentence-BERT", "PyTorch", "Cosine similarity"].map((chip) => (
                  <span className="tech-chip" key={chip}>{chip}</span>
                ))}
              </div>
            </article>
            <article className="well">
              <h3 className="card-title"><Cog size={20} aria-hidden="true" /> Model status &amp; loading</h3>
              <ModelStatusBadge />
              <h3 className="card-title"><Check size={20} aria-hidden="true" /> What it measures well</h3>
              <ul className="check-list">
                <li><Check size={18} aria-hidden="true" /> Meaning-level similarity across different wording</li>
                <li><Check size={18} aria-hidden="true" /> Paraphrase-tolerant matching</li>
              </ul>
            </article>
          </div>
        </div>
      </section>
      <section className="section section-alt">
        <div className="container">
          <div className="section-head">
            <h2>Run the Transformer engine</h2>
            <p>Results are computed live by the real Sentence-BERT model, with no fabricated values.</p>
          </div>
          <Analyzer defaultModel="transformer" />
        </div>
      </section>
    </>
  );
}
