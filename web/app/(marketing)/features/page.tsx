import type { Metadata } from "next";
import Link from "next/link";
import { Check, FileText, Gauge, Scale, Sparkles, Target, Upload, X } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";

export const metadata: Metadata = { title: "Features" };

const FEATURES = [
  { icon: Upload, title: "Resume upload", text: "PDF or DOCX, content-sniffed, 8 MB, parsed in memory." },
  { icon: FileText, title: "Text in, job in", text: "Clean extraction; short postings rejected clearly." },
  { icon: Target, title: "Skill extraction", text: "150+ taxonomy skills, word-boundary matched." },
  { icon: Gauge, title: "The score", text: "Similarity 60, coverage 40, fully explained." },
  { icon: Check, title: "The match list", text: "Matched and missing skills, category by category." },
  { icon: Sparkles, title: "Verdict and report", text: "A suitability label, recommendations, a ReportLab PDF." },
];

export default function FeaturesPage() {
  return (
    <>
      <PageHeader
        title="Features"
        subtitle="Everything the platform does. Each feature is a real, working implementation, not a mockup."
      />
      <section className="section">
        <div className="container">
          <div className="feature-grid">
            {FEATURES.map((feature) => (
              <article className="feature-card" key={feature.title}>
                <h3><feature.icon size={16} aria-hidden="true" /> {feature.title}</h3>
                <p>{feature.text}</p>
              </article>
            ))}
          </div>
          <div className="well" style={{ marginTop: "var(--space-xl)" }}>
            <h3 className="card-title"><X size={20} aria-hidden="true" /> What it does not do</h3>
            <p className="muted small">
              It does not invent metrics. Precision, recall and F1 appear only after a labelled dataset
              evaluation has been run. Scores are similarity suggestions, never hiring decisions.
            </p>
          </div>
        </div>
      </section>
      <section className="section section-alt">
        <div className="container" style={{ display: "grid", justifyItems: "center", textAlign: "center" }}>
          <h2>Experience them live</h2>
          <div className="hero-actions" style={{ marginTop: "var(--space-lg)" }}>
            <Link className="btn" href="/resume-analysis">Analyze a Resume</Link>
            <Link className="btn quiet" href="/model-comparison"><Scale size={18} aria-hidden="true" /> Compare Models</Link>
          </div>
        </div>
      </section>
    </>
  );
}
