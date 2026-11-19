import "server-only";

/** Server-side Convex persistence for analyses.
 *
 * Uses the HTTP actions API through the ConvexReactClient's HTTP endpoint
 * (NEXT_PUBLIC_CONVEX_URL). Ownership travels with the Clerk user id and is
 * re-checked in every Convex function (see convex/analyses.ts).
 */

import { ConvexHttpClient } from "convex/browser";
import { api } from "./generated";
import { Id } from "./generated";

let client: ConvexHttpClient | null = null;

function getClient(): ConvexHttpClient {
  if (!client) {
    client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
  }
  return client;
}

export async function persistAnalysis(input: {
  userId: string;
  engine: "traditional" | "transformer" | "compare";
  input: { resume_text: string; job_description: string; job_title: string | null; company: string | null };
  payload: Record<string, unknown>;
}): Promise<boolean> {
  const convex = getClient();
  const payload = input.payload as {
    traditional?: { match_percentage: number; cosine_percentage: number; skill_percentage: number; matched_skills: string[]; missing_skills: string[]; processing_time: number } | null;
    transformer?: { match_percentage: number; cosine_percentage: number; skill_percentage: number; matched_skills: string[]; missing_skills: string[]; processing_time: number } | null;
    primary_model_key?: string | null;
  };
  const primary = payload.transformer || payload.traditional;
  if (!primary) return false;

  await convex.mutation(api.analyses.create, {
    clerkUserId: input.userId,
    engine: input.engine,
    jobTitle: input.input.job_title,
    company: input.input.company,
    traditionalScore: payload.traditional?.match_percentage ?? null,
    transformerScore: payload.transformer?.match_percentage ?? null,
    similarity: primary.cosine_percentage,
    skillCoverage: primary.skill_percentage,
    matchedSkills: primary.matched_skills,
    missingSkills: primary.missing_skills,
    processingTime: primary.processing_time,
    modelName: input.engine,
    results: input.payload,
  } as never);
  return true;
}

export type AnalysisId = Id<"analyses">;

export async function persistContact(message: { name: string; email: string; subject?: string; message: string }) {
  const convex = getClient();
  await convex.mutation(api.contacts.create, {
    name: message.name,
    email: message.email,
    subject: message.subject || "",
    message: message.message,
  } as never);
}

export async function persistEvaluation(input: { userId: string; payload: Record<string, unknown> }): Promise<boolean> {
  const convex = getClient();
  const payload = input.payload as {
    results?: Record<string, Record<string, unknown>>;
    validation?: Record<string, unknown>;
  };
  const engines = payload.results ? Object.keys(payload.results) : [];
  if (!engines.length) return false;
  const evaluated = (payload.results?.[engines[0]]?.metrics as Record<string, number> | undefined)?.evaluated_records ?? 0;
  // a dataset record is required for the foreign key; create a lightweight one
  const datasetId = await convex.mutation(api.datasets.create, {
    clerkUserId: input.userId,
    datasetName: `evaluation-input-${Date.now()}`,
    totalRecords: Number(payload.validation?.total_rows ?? 0),
    validRecords: Number(payload.validation?.valid_records ?? 0),
    invalidRecords: Number(payload.validation?.invalid_records ?? 0),
    status: "ready",
    content: "",
  } as never);
  for (const engine of engines) {
    await convex.mutation(api.evaluations.create, {
      clerkUserId: input.userId,
      datasetId,
      engineName: payload.results?.[engine]?.engine_name || engine,
      results: payload,
      evaluatedRecords: Number(evaluated),
      splitConfiguration: (payload.results?.[engine]?.threshold_config as Record<string, unknown>) ?? {},
    } as never);
  }
  return true;
}
