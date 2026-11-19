import type { Metadata } from "next";
import Link from "next/link";
import { Brain, ChartColumn, Clock, Cog, FileText, Download, Gauge, Layers, ScanSearch, Target, Upload } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";

export const metadata: Metadata = { title: "How It Works" };

const STEPS = [
  { icon: Upload, title: "Upload Resume", text: "Whitelisted, sniffed, 8 MB, sanitised name." },
  { icon: ScanSearch, title: "Extract Resume Text", text: "In memory only, cleaned, length-guarded." },
  { icon: FileText, title: "Enter Job Description", text: "Paste the posting; short inputs are rejected." },
  { icon: Cog, title: "Preprocess Text", text: "Symbols filtered, tokens kept, stop words removed." },
  { icon: Target, title: "Extract Skills", text: "Word-boundary matching over the JD set." },
  { icon: Brain, title: "Run the NLP Model", text: "TF-IDF vectors, or MiniLM embeddings, or both." },
  { icon: Gauge, title: "Calculate Matching Score", text: "0.6 × similarity + 0.4 × coverage." },
  { icon: Layers, title: "Compare Requirements", text: "Experience, education, strengths and gaps." },
  { icon: ChartColumn, title: "Generate Results", text: "Rings and bars from your real analysis." },
  { icon: Download, title: "Download Analysis Report", text: "One click, ReportLab, stored in history." },
];

export default function HowItWorksPage() {
  return (
    <>
      <PageHeader
        title="How It Works"
        subtitle="The complete ten-step pipeline from upload to downloadable report, the same flow for both engines."
      />
      <section className="section">
        <div className="container">
          <ol className="workflow">
            {STEPS.map((step) => (
              <li className="workflow-step" key={step.title}>
                <span className="wf-icon"><step.icon size={20} aria-hidden="true" /></span>
                <div>
                  <h3>{step.title}</h3>
                </div>
                <p>{step.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>
      <section className="section section-alt">
        <div className="container" style={{ display: "grid", justifyItems: "center", textAlign: "center" }}>
          <h2>Try the full pipeline now</h2>
          <div className="hero-actions" style={{ marginTop: "var(--space-lg)" }}>
            <Link className="btn" href="/resume-analysis">Start an Analysis</Link>
            <Link className="btn quiet" href="/architecture">See the Architecture</Link>
          </div>
        </div>
      </section>
    </>
  );
}
