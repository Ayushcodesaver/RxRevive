import { NextRequest, NextResponse } from "next/server";
import { callPython, pythonError } from "@/lib/api/server";

/** POST /api/datasets/validate — honest CSV inspection via the Python service. */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body?.dataset_content) {
    return NextResponse.json({ success: false, error: "The dataset content is empty." }, { status: 422 });
  }
  const result = await callPython("/datasets/validate", {
    json: { dataset_content: body.dataset_content, column_map: body.column_map ?? null },
  });
  if (!result.ok) {
    const message = pythonError(result.body, "Validation failed.");
    return NextResponse.json({ success: false, error: message }, { status: result.status });
  }
  return NextResponse.json(result.body);
}
