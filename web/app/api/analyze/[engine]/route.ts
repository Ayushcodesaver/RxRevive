import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { callPython, pythonError } from "@/lib/api/server";
import { config } from "@/lib/config";

const ENGINES = new Set(["traditional", "transformer", "compare"]);

/** POST /api/analyze/[engine]
 *
 * Clerk authenticates the caller (when configured); the pending analysis is
 * recorded in Convex when configured; the AI computation always happens in
 * Python; the result is stored and returned. Every unavailable integration is
 * reported in the response metadata instead of being papered over.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ engine: string }> }) {
  const { engine } = await params;
  if (!ENGINES.has(engine)) {
    return NextResponse.json({ success: false, error: "Unknown engine." }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  if (!body?.resume_text || !body?.job_description) {
    return NextResponse.json(
      { success: false, error: "Both a resume and a job description are required." },
      { status: 422 },
    );
  }

  let userId: string | null = null;
  if (config.clerkConfigured) {
    const { userId: clerkId } = await auth();
    if (!clerkId && isProtectedEngine()) {
      return NextResponse.json({ success: false, error: "Sign in to run analyses." }, { status: 401 });
    }
    userId = clerkId ?? null;
  }

  const started = Date.now();
  const result = await callPython<Record<string, unknown>>(`/analyze/${engine}`, {
    json: {
      resume_text: body.resume_text,
      job_description: body.job_description,
      job_title: body.job_title || null,
      company: body.company || null,
    },
    userId,
  });

  if (!result.ok) {
    const message = pythonError(result.body, "The AI service could not complete the analysis.");
    return NextResponse.json({ success: false, error: message }, { status: result.status });
  }

  // unwrap the Python envelope: the client expects the analysis payload directly
  const pythonEnvelope = result.body as { data?: Record<string, unknown>; metadata?: Record<string, unknown> };
  const analysisPayload = (pythonEnvelope.data ?? {}) as Record<string, unknown>;

  // Persistence: Convex stores the analysis when configured. Without it the
  // result is returned unpersisted and the metadata says so honestly.
  let persisted = false;
  let persistError: string | null = null;
  if (config.convexConfigured && userId) {
    try {
      const { persistAnalysis } = await import("@/lib/convex/persist");
      persisted = await persistAnalysis({
        userId,
        engine: engine as "traditional" | "transformer" | "compare",
        input: {
          resume_text: body.resume_text,
          job_description: body.job_description,
          job_title: body.job_title || null,
          company: body.company || null,
        },
        payload: analysisPayload,
      });
    } catch (error) {
      persistError = error instanceof Error ? error.message : String(error);
      console.error("convex persistence failed:", persistError);
    }
  }
  return NextResponse.json({
    success: true,
    data: analysisPayload,
    metadata: {
      processing_time_ms: Date.now() - started,
      model_name: pythonEnvelope.metadata?.model_name ?? null,
      persisted,
      identity_method: userId ? "clerk" : config.clerkConfigured ? "anonymous" : "auth_not_configured",
      persist_error: persistError,
    },
  });
}

function isProtectedEngine() {
  // Guests may analyse too (matching the Flask app's behaviour); sign-in is
  // only enforced for pages that read persisted history.
  return false;
}

// currentUser import kept for parity with future per-user quotas.
void currentUser;
