import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { callPython, pythonError } from "@/lib/api/server";
import { config } from "@/lib/config";

/** POST /api/evaluation/run — labelled evaluation in the Python service.
 * When Clerk + Convex are configured, the run is persisted as an evaluation
 * record owned by the caller. */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body?.dataset_content) {
    return NextResponse.json({ success: false, error: "The dataset content is empty." }, { status: 422 });
  }

  let userId: string | null = null;
  if (config.clerkConfigured) {
    userId = (await auth()).userId ?? null;
  }

  const result = await callPython("/evaluation/run", {
    json: {
      dataset_content: body.dataset_content,
      column_map: body.column_map ?? null,
      engines: body.engines ?? ["traditional"],
      split_ratio: body.split_ratio ?? 0.7,
      seed: body.seed ?? 42,
      class_order: body.class_order ?? null,
    },
    userId,
  });
  if (!result.ok) {
    const message = pythonError(result.body, "The evaluation failed.");
    return NextResponse.json({ success: false, error: message }, { status: result.status });
  }

  let persisted = false;
  if (config.convexConfigured && userId) {
    try {
      const { persistEvaluation } = await import("@/lib/convex/persist");
      persisted = await persistEvaluation({ userId, payload: result.body as Record<string, unknown> });
    } catch (error) {
      console.error("evaluation persistence failed:", error);
    }
  }

  const pythonEnvelope = result.body as { data?: Record<string, unknown> };
  return NextResponse.json({ success: true, data: pythonEnvelope.data ?? {}, error: null });
}
