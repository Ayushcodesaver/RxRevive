import { NextRequest, NextResponse } from "next/server";
import { callPython, pythonError } from "@/lib/api/server";

/** POST /api/contact
 *
 * Message validation and duplicate-moderate storage live in Convex
 * (convex/contacts.ts). Until Convex is configured this route returns an
 * honest setup error; nothing is silently dropped.
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body?.name || !body?.email || !body?.message) {
    return NextResponse.json({ success: false, error: "Name, email and message are required." }, { status: 422 });
  }

  if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
    return NextResponse.json(
      {
        success: false,
        error:
          "Message storage is not configured yet (Convex). Set NEXT_PUBLIC_CONVEX_URL and run npx convex dev; see BUILD_STATUS.md.",
      },
      { status: 503 },
    );
  }

  try {
    const { persistContact } = await import("@/lib/convex/persist");
    await persistContact(body);
    return NextResponse.json({ success: true, data: { message: "Thank you; your message has been received by the RxRevive team." } });
  } catch (error) {
    console.error("contact persistence failed:", error);
    return NextResponse.json({ success: false, error: "The message could not be stored. Try again shortly." }, { status: 503 });
  }
}

void callPython; void pythonError;
