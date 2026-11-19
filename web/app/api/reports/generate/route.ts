import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { callPython, pythonError } from "@/lib/api/server";

/** POST /api/reports/generate — proxies to the Python ReportLab service. */
export async function POST(request: NextRequest) {
  if (process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ success: false, error: "Sign in to generate reports." }, { status: 401 });
    }
  }
  const body = await request.json().catch(() => null);
  if (!body?.analysis_id || !body?.payload) {
    return NextResponse.json({ success: false, error: "analysis_id and payload are required." }, { status: 422 });
  }
  const result = await callPython<{ data: { filename: string; download_url: string } }>("/reports/generate", {
    json: body,
    userId: null,
  });
  if (!result.ok) {
    const message = pythonError(result.body, "Report generation failed.");
    return NextResponse.json({ success: false, error: message }, { status: result.status });
  }
  const data = (result.body as { data?: { filename: string; download_url: string } }).data;
  return NextResponse.json({
    success: true,
    data: {
      filename: data?.filename,
      // the browser downloads through this Next route, not the internal Python URL
      download_url: `/api/reports/download/${data?.filename}`,
    },
  });
}
