"use client";

/** The analyzer: model picker, dropzone, resume + JD inputs, live results.
 * All computation happens in the Python service via the Next API routes;
 * nothing here is mocked and every state (loading, error, empty) is honest.
 */

import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Brain,
  Check,
  Clock,
  FileText,
  Download,
  Gauge,
  Lock,
  Scale,
  ScanSearch,
  Settings,
  Sparkles,
  Upload,
  X,
} from "lucide-react";
import { analyzeSchema, type AnalyzeInput } from "@/lib/validation/schemas";
import { extractResume, runAnalysis, scoreClass, type AnalysisPayload, type EngineResult } from "@/lib/api/client";
import { ScoreRing } from "./score-ring";
import { MatchList } from "./match-list";

export function Analyzer({ defaultModel }: { defaultModel?: "traditional" | "transformer" | "compare" }) {
  const [model, setModel] = useState<AnalyzeInput["model"]>(defaultModel ?? "traditional");
  const [fileName, setFileName] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<AnalysisPayload | null>(null);
  const [status, setStatus] = useState<{ text: string; kind: "error" | "ok" | "" }>({ text: "", kind: "" });
  const fileInput = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
    watch,
  } = useForm<AnalyzeInput>({
    resolver: zodResolver(analyzeSchema),
    defaultValues: { resume_text: "", job_description: "", job_title: "", company: "", model: model },
  });

  const resumeText = watch("resume_text");

  async function onFile(file: File | undefined) {
    if (!file) return;
    setStatus({ text: `Extracting ${file.name}…`, kind: "" });
    try {
      const response = await extractResume(file);
      setValue("resume_text", response.data.text, { shouldValidate: true });
      setFileName(response.data.filename);
      setStatus({
        text: response.data.looks_scanned
          ? "Warning: this PDF looks scanned; little text was found and extraction may be incomplete."
          : `Extracted ${response.data.chars.toLocaleString()} characters.`,
        kind: response.data.looks_scanned ? "error" : "ok",
      });
    } catch (error) {
      setStatus({ text: error instanceof Error ? error.message : "Extraction failed.", kind: "error" });
    }
  }

  async function onSubmit(input: AnalyzeInput) {
    setBusy(true);
    setStatus({ text: "Running the analysis in the Python service…", kind: "" });
    setResult(null);
    try {
      const response = await runAnalysis(model, {
        resume_text: input.resume_text,
        job_description: input.job_description,
        job_title: input.job_title || undefined,
        company: input.company || undefined,
      });
      setResult(response.data);
      setStatus({
        text: response.metadata?.persisted
          ? "Analysis complete and saved to your history."
          : "Analysis complete. Sign in with history configured to keep results.",
        kind: "ok",
      });
    } catch (error) {
      setStatus({ text: error instanceof Error ? error.message : "The analysis failed.", kind: "error" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: "var(--space-xl)" }}>
      <div className="well analyzer-card">
        {!defaultModel ? (
          <div className="model-select" role="radiogroup" aria-label="NLP model selection">
            {[
              { value: "traditional" as const, icon: ScanSearch, label: "Traditional NLP", sub: "TF-IDF + cosine similarity" },
              { value: "transformer" as const, icon: Brain, label: "Transformer NLP", sub: "Sentence-BERT embeddings" },
              { value: "compare" as const, icon: Scale, label: "Compare Both", sub: "side-by-side results" },
            ].map((option) => (
              <label className="model-option" key={option.value}>
                <input
                  type="radio"
                  {...register("model")}
                  value={option.value}
                  checked={model === option.value}
                  onChange={() => setModel(option.value)}
                />
                <span className="model-option-body">
                  <option.icon size={20} aria-hidden="true" />
                  <strong>{option.label}</strong>
                  <em>{option.sub}</em>
                </span>
              </label>
            ))}
          </div>
        ) : null}

        <form onSubmit={handleSubmit(onSubmit)} style={{ display: "grid", gap: "var(--space-xl)" }}>
          <input type="hidden" {...register("model")} />
          <div className="analyzer-grid">
            <div className="analyzer-col">
              <label className="field-label" htmlFor="resume-file-input">
                <Upload size={16} aria-hidden="true" /> Resume <span className="muted">(PDF, DOCX or TXT)</span>
              </label>
              <div
                className="dropzone"
                role="button"
                tabIndex={0}
                data-dragover={dragOver}
                onClick={() => fileInput.current?.click()}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") fileInput.current?.click(); }}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => { e.preventDefault(); setDragOver(false); onFile(e.dataTransfer.files?.[0]); }}
                aria-label="Resume drop zone"
              >
                <input
                  id="resume-file-input"
                  type="file"
                  accept=".pdf,.docx,.txt,.md"
                  hidden
                  ref={fileInput}
                  onChange={(e) => onFile(e.target.files?.[0])}
                />
                <span className="dz-inner">
                  <FileText size={24} aria-hidden="true" />
                  <strong>{fileName ? fileName : "Drag & drop your resume here"}</strong>
                  <em>or click to browse</em>
                </span>
              </div>
              <p className="muted small">Files are processed in memory and never stored. Maximum 8 MB.</p>

              <label className="field-label" htmlFor="resume-text">
                <FileText size={16} aria-hidden="true" /> Or paste resume text
              </label>
              <textarea id="resume-text" rows={6} {...register("resume_text")} aria-invalid={Boolean(errors.resume_text)} placeholder="Paste your full resume text here…" />
              {errors.resume_text ? <p className="form-status error">{errors.resume_text.message}</p> : null}
            </div>

            <div className="analyzer-col">
              <div className="two-inputs">
                <div>
                  <label className="field-label" htmlFor="job-title">Job title</label>
                  <input type="text" id="job-title" maxLength={200} {...register("job_title")} placeholder="e.g. Data Scientist" />
                </div>
                <div>
                  <label className="field-label" htmlFor="company">Company <span className="muted">(optional)</span></label>
                  <input type="text" id="company" maxLength={200} {...register("company")} placeholder="e.g. HealthTrack" />
                </div>
              </div>
              <label className="field-label" htmlFor="jd-text">
                <FileText size={16} aria-hidden="true" /> Job description <span className="muted">(required)</span>
              </label>
              <textarea id="jd-text" rows={12} {...register("job_description")} aria-invalid={Boolean(errors.job_description)} placeholder="Paste the full job description here…" />
              {errors.job_description ? <p className="form-status error">{errors.job_description.message}</p> : null}

              <div className="form-actions">
                <button className="btn" type="submit" disabled={busy} style={{ minHeight: 52 }}>
                  <Gauge size={18} aria-hidden="true" /> {busy ? "Analyzing…" : "Analyze Match"}
                </button>
                <p className="form-status" role="status" aria-live="polite">{status.text}</p>
              </div>
              {busy ? (
                <div className="progress-track" role="progressbar" aria-label="Analysis running">
                  <div className="progress-fill" style={{ background: "var(--color-accent)", height: "100%", borderRadius: "inherit", animation: "rx-progress 1.6s cubic-bezier(0.65,0,0.35,1) infinite" }} />
                </div>
              ) : null}
              {resumeText && !fileName ? (
                <button className="btn quiet small" type="button" onClick={() => {
                  setValue("resume_text", PLACEHOLDER_RESUME);
                  setValue("job_description", PLACEHOLDER_JD);
                }}>
                  <Sparkles size={16} aria-hidden="true" /> Load sample data
                </button>
              ) : null}
            </div>
          </div>
        </form>
      </div>

      {result ? <AnalysisResults payload={result} /> : null}
    </div>
  );
}

export function AnalysisResults({ payload }: { payload: AnalysisPayload }) {
  const primary = payload.transformer || payload.traditional;
  if (!primary) return null;

  return (
    <div style={{ display: "grid", gap: "var(--space-lg)" }}>
      {payload.traditional && payload.transformer ? (
        <div className="score-duo">
          <ScorePanel label="Traditional NLP (TF-IDF)" result={payload.traditional} />
          <ScorePanel label="Transformer NLP (SBERT)" result={payload.transformer} />
          <div className="well diff-panel">
            <h3>Difference</h3>
            <p className="diff-value">
              {payload.transformer.match_percentage - payload.traditional.match_percentage >= 0 ? "+" : ""}
              {payload.transformer.match_percentage - payload.traditional.match_percentage} pts
            </p>
            <p className="muted small">Transformer minus Traditional on identical inputs. The scores are not calibrated probabilities.</p>
          </div>
        </div>
      ) : (
        <div className="well single-score" style={{ display: "flex", alignItems: "center", gap: "var(--space-2xl)" }}>
          <ScoreRing value={primary.match_percentage} label="Overall match" />
          <div>
            <span className={`score-chip ${scoreClass(primary.match_percentage)}`}>{primary.suitability.label}</span>
            <dl className="breakdown">
              <div className="breakdown-row"><dt>{primary.cosine_label}</dt><dd>{primary.cosine_percentage}%</dd></div>
              <div className="breakdown-row"><dt>Skill coverage</dt><dd>{primary.skill_percentage}%</dd></div>
              <div className="breakdown-row"><dt>Processing time</dt><dd>{primary.processing_time}s</dd></div>
            </dl>
          </div>
        </div>
      )}

      <div className="well shared-match">
        <h3 className="card-title"><Check size={20} aria-hidden="true" /> The match list</h3>
        <MatchList
          items={[
            ...primary.matched_skills.slice(0, 10).map((skill) => ({ skill, present: true })),
            ...primary.missing_skills.slice(0, 6).map((skill) => ({ skill, present: false })),
          ]}
        />
        <h4 className="sub-title"><Sparkles size={16} aria-hidden="true" /> Strengths and recommendations</h4>
        <ul className="point-list">{primary.strengths.map((s) => <li key={s}>{s}</li>)}</ul>
        <ul className="point-list">{primary.recommendations.map((s) => <li key={s}>{s}</li>)}</ul>
        <h4 className="sub-title"><Clock size={16} aria-hidden="true" /> Experience &amp; education alignment</h4>
        <ul className="point-list">
          <li>{primary.experience_alignment.message} <span className={`align-tag ${primary.experience_alignment.status === "match" ? "match" : "gap"}`}>{primary.experience_alignment.status}</span></li>
          <li>{primary.education_alignment.message} <span className={`align-tag ${primary.education_alignment.status === "match" ? "match" : "gap"}`}>{primary.education_alignment.status}</span></li>
        </ul>
      </div>

      <details className="engine-details well">
        <summary><Settings size={16} aria-hidden="true" /> Technical details: {primary.engine}</summary>
        <ul className="detail-list">{primary.details.map((d) => <li key={d}>{d}</li>)}</ul>
      </details>

      <div className="well disclaimer-card">
        <h2 className="card-title"><Lock size={20} aria-hidden="true" /> Important disclaimer</h2>
        <p>{primary.disclaimer}</p>
      </div>
    </div>
  );
}

function ScorePanel({ label, result }: { label: string; result: EngineResult }) {
  return (
    <div className="well score-panel">
      <h3>{label}</h3>
      <ScoreRing value={result.match_percentage} label={result.suitability.label} size={150} />
      <dl className="breakdown" style={{ width: "100%" }}>
        <div className="breakdown-row"><dt>{result.cosine_label}</dt><dd>{result.cosine_percentage}%</dd></div>
        <div className="breakdown-row"><dt>Skill coverage</dt><dd>{result.skill_percentage}%</dd></div>
        <div className="breakdown-row"><dt>Processing time</dt><dd>{result.processing_time}s</dd></div>
      </dl>
      <a className="btn quiet small" href="#match-list-anchor" onClick={(e) => { e.preventDefault(); document.getElementById("match-list-anchor")?.scrollIntoView({ behavior: "smooth" }); }}>
        <Download size={16} aria-hidden="true" /> Skill analysis
      </a>
      <span id="match-list-anchor" className="visually-hidden">Match list</span>
    </div>
  );
}

const PLACEHOLDER_RESUME = `PRIYA SHARMA
Data Scientist | Machine Learning | NLP
Bengaluru, India | priya.sharma@example.com

SUMMARY
Data scientist with 3 years of experience building machine learning and
natural language processing solutions for healthcare and e-commerce products.

EXPERIENCE
Data Scientist, MedAnalytics Pvt Ltd (2022 - Present)
- Built NLP models to classify clinical notes, improving triage speed by 30%
- Developed machine learning pipelines with scikit-learn and pandas
- Deployed models as REST APIs using Flask and Docker on AWS

SKILLS
Python, SQL, machine learning, deep learning, NLP, scikit-learn, pandas,
numpy, tensorflow, statistics, matplotlib, Power BI, Flask, Docker, AWS, Git

EDUCATION
B.Tech in Computer Science, VTU Bengaluru (2020)
`;

const PLACEHOLDER_JD = `Job Description: Data Scientist (NLP)

Company: HealthTrack Technologies
Location: Bengaluru (Hybrid)

We are looking for a data scientist to join our NLP team and build
intelligent text analytics for digital health products.

Requirements
- 2+ years of experience in data science or machine learning
- Strong Python skills with pandas, numpy and scikit-learn
- Hands-on experience with NLP: natural language processing, text
  classification, embeddings
- Experience with TensorFlow or Pytorch
- Familiarity with Docker, AWS and REST APIs
- Good communication and teamwork
`;
