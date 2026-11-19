import { NextResponse } from "next/server";
import { callPython } from "@/lib/api/server";

/** GET /api/models/status — proxied server-side so the browser never hits the
 * Python service cross-origin (and CORS stops mattering entirely). */
export async function GET() {
  const result = await callPython("/health");
  return NextResponse.json(result.body, { status: result.ok ? 200 : 503 });
}
