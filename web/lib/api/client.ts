/** Typed client for the Python FastAPI service.
 *
 * The browser talks to the FastAPI service through the Next.js API routes
 * (app/api/...) so the service secret never reaches the client. This module
 * wraps those routes and unwraps the response envelope.
 */

import { config } from "../config";

export interface Envelope<T> {
  success: boolean;
  data: T;
  metadata: {
    processing_time_ms: number | null;
    model_name: string | null;
    model_version: string | null;
    identity_method: string | null;
    persisted: boolean | null;
  } | null;
  error: string | null;
}

export interface EngineResult {
  engine: string;
  model_key: "traditional" | "transformer";
  match_percentage: number;
  suitability: { label: string };
  cosine_label: string;
  cosine_percentage: number;
  skill_percentage: number;
  matched_skills: string[];
  missing_skills: string[];
  matched_by_category: Record<string, string[]>;
  strengths: string[];
  recommendations: string[];
  shared_terms: string[];
  experience_alignment: { status: string; message: string };
  education_alignment: { status: string; message: string };
  technical_skills_resume: string[];
  processing_time: number;
  details: string[];
  disclaimer: string;
}

export interface AnalysisPayload {
  traditional?: EngineResult;
  transformer?: EngineResult;
  error_note?: string;
  primary_model_key?: "traditional" | "transformer" | null;
  difference_points?: number | null;
}

async function unwrap<T>(response: Response): Promise<Envelope<T>> {
  const body = (await response.json().catch(() => null)) as Envelope<T> | null;
  if (!body) {
    throw new Error(`The AI service returned an unreadable response (${response.status}).`);
  }
  if (!response.ok || !body.success) {
    throw new Error(body.error || `Request failed (${response.status}).`);
  }
  return body;
}

/** Run an analysis through the server route (Clerk-authenticated server-side). */
export async function runAnalysis(
  engine: "traditional" | "transformer" | "compare",
  input: { resume_text: string; job_description: string; job_title?: string; company?: string },
): Promise<Envelope<AnalysisPayload>> {
  const response = await fetch(`/api/analyze/${engine}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return unwrap<AnalysisPayload>(response);
}

export async function extractResume(file: File): Promise<Envelope<{ filename: string; text: string; preview: string; chars: number; looks_scanned: boolean }>> {
  const form = new FormData();
  form.append("resume_file", file);
  const response = await fetch("/api/resumes/extract", { method: "POST", body: form });
  return unwrap(response);
}

export async function sendContact(input: { name: string; email: string; subject?: string; message: string }) {
  const response = await fetch("/api/contact", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return unwrap<{ message: string }>(response);
}

export async function fetchModelStatus(): Promise<Envelope<{
  service: string; version: string;
  engines: { traditional: string; transformer: string };
  transformer_message: string; model_name: string;
  auth_mode: string; background_tasks: string;
}>> {
  // proxied through the Next API route: no cross-origin dependency on the AI host
  const response = await fetch("/api/models/status", { cache: "no-store" });
  return unwrap(response);
}

/** Score colour band used by score chips across the app. */
export function scoreClass(score: number | null | undefined): "high" | "mid" | "low" | "" {
  if (score == null) return "";
  if (score >= 75) return "high";
  if (score >= 50) return "mid";
  return "low";
}

export function modelLabel(key: string): string {
  return { traditional: "Traditional NLP", transformer: "Transformer NLP", compare: "Comparison" }[key] || key;
}
