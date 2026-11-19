import "server-only";

import { ConvexHttpClient } from "convex/browser";
import { api } from "./generated";
import { config } from "@/lib/config";

/** Server-side Convex reads, gated on configuration. Every function returns
 * null when Convex is not configured (or the deployment has not had its
 * functions pushed yet); pages render the honest setup state instead. */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function client(): any {
  if (!config.convexConfigured) return null;
  return new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function safe<T>(run: (convex: any) => Promise<T>): Promise<T | null> {
  const convex = client();
  if (!convex) return null;
  try {
    return await run(convex);
  } catch (error) {
    // a fresh deployment without pushed functions lands here; the pages show
    // their empty/setup states instead of crashing
    console.error("convex query failed (is the schema pushed? npx convex dev):", error);
    return null;
  }
}

export async function getDashboardStats(clerkUserId: string): Promise<any | null> {
  return safe((convex) => convex.query(api.analyses.statsForUser, { clerkUserId }));
}

export async function listAnalyses(clerkUserId: string): Promise<any[] | null> {
  return safe((convex) => convex.query(api.analyses.listForUser, { clerkUserId, limit: 100 }));
}

export async function getAnalysis(clerkUserId: string, id: string): Promise<any | null> {
  return safe(async (convex) => {
    const record = await convex.query(api.analyses.getOwned, { clerkUserId, id });
    if (!record || record.clerkUserId !== clerkUserId) return null;
    return record;
  });
}

export async function listDatasets(clerkUserId: string): Promise<any[] | null> {
  return safe((convex) => convex.query(api.datasets.listForUser, { clerkUserId }));
}

export async function listEvaluations(clerkUserId: string): Promise<any[] | null> {
  return safe((convex) => convex.query(api.evaluations.listForUser, { clerkUserId }));
}

export async function listExperiments(clerkUserId: string): Promise<any[] | null> {
  return safe((convex) => convex.query(api.experiments.listForUser, { clerkUserId }));
}
