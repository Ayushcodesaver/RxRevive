import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { config } from "@/lib/config";

const isProtected = createRouteMatcher([
  "/dashboard(.*)",
  "/analysis-results(.*)",
  "/reports(.*)",
  "/datasets(.*)",
  "/evaluation(.*)",
  "/experiments(.*)",
  "/profile(.*)",
  "/settings(.*)",
]);

/** Clerk middleware when configured; a passthrough that explains itself otherwise. */
export default config.clerkConfigured
  ? clerkMiddleware(async (auth, request: NextRequest) => {
      if (isProtected(request)) {
        await auth.protect();
      }
    })
  : function middleware(request: NextRequest) {
      // Clerk keys absent: let the request through; protected pages render the
      // honest setup card instead of pretending to be authenticated.
      return NextResponse.next();
    };

export const runtime = "nodejs";
