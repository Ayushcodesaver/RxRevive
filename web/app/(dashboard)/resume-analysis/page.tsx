import type { Metadata } from "next";
import { Clock, Lock, Shield } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Analyzer } from "@/components/analysis/analyzer";

export const metadata: Metadata = { title: "Resume Analysis" };

export default function ResumeAnalysisPage() {
  return (
    <>
      <PageHeader
        title="Resume Analysis"
        subtitle="Upload a resume, paste the job description, pick an engine. Every score is computed live by the real NLP code."
      />
      <section className="section">
        <div className="container">
          <Analyzer />
          <div className="analyzer-notes">
            <article className="note-card">
              <Shield aria-hidden="true" />
              <div>
                <h3>Privacy</h3>
                <p>Resume files are parsed in memory and never saved to disk; only the extracted text is stored with your analysis history.</p>
              </div>
            </article>
            <article className="note-card">
              <Clock aria-hidden="true" />
              <div>
                <h3>First Transformer run</h3>
                <p>The Sentence-BERT model loads on first use, about 90 MB once, then cached and offline.</p>
              </div>
            </article>
            <article className="note-card">
              <Lock aria-hidden="true" />
              <div>
                <h3>Honest scores</h3>
                <p>Match scores are similarity suggestions for learning, never a probability of employment or an automated hiring decision.</p>
              </div>
            </article>
          </div>
        </div>
      </section>
    </>
  );
}
