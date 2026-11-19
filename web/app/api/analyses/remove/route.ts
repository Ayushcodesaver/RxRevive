import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { config } from "@/lib/config";
import { ConvexHttpClient } from "convex/browser";

/** POST /api/analyses/remove — deletes an owned analysis (Convex re-checks ownership). */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body?.id) {
    return NextResponse.json({ success: false, error: "The analysis id is required." }, { status: 422 });
  }
  if (!config.clerkConfigured || !config.convexConfigured) {
    return NextResponse.json({ success: false, error: "Persistence is not configured; nothing to delete." }, { status: 503 });
  }
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ success: false, error: "Sign in first." }, { status: 401 });
  }
  const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
  try {
    const { api } = await import("@/lib/convex/generated");
    await convex.mutation(api.analyses.removeOwned, { clerkUserId: userId, id: body.id });
    return NextResponse.json({ success: true, data: { deleted: body.id } });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Delete failed." },
      { status: 400 },
    );
  }
}
