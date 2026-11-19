import { NextRequest, NextResponse } from "next/server";
import { callPython, pythonError } from "@/lib/api/server";

/** POST /api/resumes/extract — proxy to the Python service (server-side secret). */
export async function POST(request: NextRequest) {
  const form = await request.formData();
  const file = form.get("resume_file");
  if (!(file instanceof File)) {
    return NextResponse.json({ success: false, error: "Choose a resume file (PDF, DOCX or TXT)." }, { status: 422 });
  }

  const upstream = new FormData();
  upstream.append("resume_file", file, file.name);
  const result = await callPython("/resumes/extract", { form: upstream });
  if (!result.ok) {
    const message = pythonError(result.body, "The file could not be extracted.");
    return NextResponse.json({ success: false, error: message }, { status: result.status });
  }
  return NextResponse.json(result.body);
}
