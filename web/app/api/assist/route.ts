import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { callPython, pythonError } from "@/lib/api/server";

/** POST /api/assist — Gemini resume-assist proxy.
 * The GEMINI_API_KEY lives only in the Python service; this route attaches
 * the verified identity (when Clerk is configured) and forwards the context. */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body?.resume_text || !body?.job_description) {
    return NextResponse.json({ success: false, error: "The resume and job description are required." }, { status: 422 });
  }

  let userId: string | null = null;
  if (process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    userId = (await auth()).userId ?? null;
  }

  const result = await callPython("/assist/suggestions", { json: body, userId });
  if (!result.ok) {
    const message = pythonError(result.body, "The AI assist could not complete.");
    return NextResponse.json({ success: false, error: message }, { status: result.status });
  }
  const pythonEnvelope = result.body as { data?: Record<string, unknown>; metadata?: Record<string, unknown> };
  return NextResponse.json({
    success: true,
    data: pythonEnvelope.data ?? {},
    metadata: { model_name: pythonEnvelope.metadata?.model_name ?? null },
  });
}
