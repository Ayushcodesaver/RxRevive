import type { Metadata } from "next";
import { Brain, Check, FileText, Layers, Sparkles, Target, X } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";

export const metadata: Metadata = { title: "About the Project" };

export default function AboutPage() {
  return (
    <>
      <PageHeader
        title="About the Project"
        subtitle="An academic study of two NLP paradigms solving one recruitment problem, built by Team RxRevive for final-year evaluation."
      />
      <section className="section">
        <div className="container">
          <div className="section-head">
            <h2>The study</h2>
            <p>One recruitment problem, two independent NLP implementations, compared fairly.</p>
          </div>
          <div className="about-grid" style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "var(--space-lg)", alignItems: "start" }}>
            <article className="well">
              <h3 className="card-title"><Sparkles size={20} aria-hidden="true" /> Project overview</h3>
              <p>
                A web system that reads a resume and a job description, finds the relevant skills, scores the
                compatibility and writes a suitability report, through <strong>two independent NLP implementations</strong>{" "}
                of the same problem.
              </p>
            </article>
            <article className="well">
              <h3 className="card-title"><FileText size={20} aria-hidden="true" /> The problem statement</h3>
              <p className="quote" style={{ padding: "var(--space-lg)", borderLeft: "3px solid var(--color-ink)", fontSize: "var(--text-md)", color: "var(--color-ink-2)", lineHeight: 1.6 }}>
                “Analyze resumes and job descriptions with NLP: skills, compatibility, scores, reports.”
              </p>
            </article>
            <article className="well">
              <h3 className="card-title"><X size={20} aria-hidden="true" /> Existing system limitations</h3>
              <ul className="cross-list">
                <li><X size={18} aria-hidden="true" /> Manual screening is slow and inconsistent</li>
                <li><X size={18} aria-hidden="true" /> Keyword filters miss different wording</li>
                <li><X size={18} aria-hidden="true" /> Candidates never learn <em>why</em> they didn’t match</li>
              </ul>
            </article>
            <article className="well">
              <h3 className="card-title"><Layers size={20} aria-hidden="true" /> Proposed system</h3>
              <p>Two documents, two engines: TF-IDF and Sentence-BERT, one taxonomy.</p>
            </article>
            <article className="well">
              <h3 className="card-title"><Target size={20} aria-hidden="true" /> What it must do</h3>
              <ol className="numbered-list">
                <li>Score compatibility, explainably</li>
                <li>Contrast lexical and semantic NLP</li>
                <li>Report matched and missing skills</li>
              </ol>
            </article>
            <article className="well">
              <h3 className="card-title"><Brain size={20} aria-hidden="true" /> Research motivation</h3>
              <p>
                Resume matching is a natural testbed for the lexical-versus-semantic question. TF-IDF is the
                vector-space tradition: interpretable and cheap. Sentence-BERT is the transformer answer:
                contextual and heavier. One problem, both engines, and the difference is quantified.
              </p>
            </article>
            <article className="well">
              <h3 className="card-title"><Layers size={20} aria-hidden="true" /> Architecture, summarised</h3>
              <p>
                A Next.js frontend, Clerk authentication, a Convex database and a Python FastAPI AI service
                running both engines. The full diagram is on the{" "}
                <a className="inline-link" href="/architecture">architecture page</a>.
              </p>
            </article>
            <article className="well">
              <h3 className="card-title"><Check size={20} aria-hidden="true" /> Expected outcomes</h3>
              <ul className="check-list">
                <li><Check size={18} aria-hidden="true" /> A demonstrable semantic advantage on paraphrased content</li>
                <li><Check size={18} aria-hidden="true" /> Quantified score differences on identical inputs</li>
                <li><Check size={18} aria-hidden="true" /> A reusable evaluation pipeline for the labelled dataset</li>
              </ul>
            </article>
          </div>
        </div>
      </section>
      <section className="section section-alt">
        <div className="container">
          <div className="section-head">
            <h2>RxRevive Team</h2>
            <p>Roles within the team.</p>
          </div>
          <div className="feature-grid cols-4">
            {[
              { icon: Brain, title: "NLP Research", text: "Engines, taxonomy, evaluation." },
              { icon: Layers, title: "Backend Engineering", text: "FastAPI, Convex, security." },
              { icon: Sparkles, title: "Frontend & UX", text: "Design system, dashboards." },
              { icon: FileText, title: "Documentation", text: "Report, viva prep, dataset docs." },
            ].map((role) => (
              <article className="feature-card" key={role.title}>
                <h3><role.icon size={16} aria-hidden="true" /> {role.title}</h3>
                <p>{role.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
