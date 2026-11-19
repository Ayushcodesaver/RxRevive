import { NextRequest, NextResponse } from "next/server";
import { callPython, pythonError } from "@/lib/api/server";
import { config } from "@/lib/config";

/** GET /api/reports/download/[filename] — streams the PDF from the Python service. */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ filename: string }> }) {
  const { filename } = await params;
  const response = await fetch(`${config.apiUrl}/api/v1/reports/download/${encodeURIComponent(filename)}`, {
    headers: process.env.PYTHON_API_SECRET ? { "X-API-Secret": process.env.PYTHON_API_SECRET } : {},
  });
  if (!response.ok) {
    const message = pythonError(await response.json().catch(() => null), "Report not found.");
    return NextResponse.json({ success: false, error: message }, { status: response.status });
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
