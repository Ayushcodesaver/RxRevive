import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { config } from "@/lib/config";
import { SetupCard } from "@/components/setup/setup-card";

/** Server gate for dashboard pages.
 * Renders the page only when Clerk + Convex are configured and the user is
 * signed in; otherwise an honest setup or sign-in state. Returns the
 * clerkUserId so pages can query Convex for their own records only.
 */

export async function dashboardGate(): Promise<
  { ok: true; userId: string } | { ok: false; reason: "auth" | "convex"; node: React.ReactNode }
> {
  if (!config.clerkConfigured) {
    return {
      ok: false,
      reason: "auth",
      node: (
        <SetupCard
          service="Clerk authentication"
          icon="auth"
          steps={[
            { label: "Create an application at dashboard.clerk.com" },
            { label: "Copy the keys into web/.env.local", command: "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=...\nCLERK_SECRET_KEY=..." },
            { label: "Restart the dev server", command: "npm run dev" },
          ]}
        />
      ),
    };
  }
  const { userId } = await auth();
  if (!userId) {
    return {
      ok: false,
      reason: "auth",
      node: (
        <div className="well setup-card" style={{ textAlign: "center" }}>
          <h2 className="card-title">Sign in to see your dashboard</h2>
          <p className="muted small" style={{ marginBottom: "var(--space-lg)" }}>
            Your analyses, reports and datasets are private to your account.
          </p>
          <Link className="btn" href="/sign-in">Log in</Link>
        </div>
      ),
    };
  }
  if (!config.convexConfigured) {
    return {
      ok: false,
      reason: "convex",
      node: (
        <SetupCard
          service="Convex database"
          icon="db"
          steps={[
            { label: "Create a Convex project and run", command: "npx convex dev" },
            { label: "Set NEXT_PUBLIC_CONVEX_URL in web/.env.local", command: "" },
            { label: "Restart the dev server", command: "npm run dev" },
          ]}
        />
      ),
    };
  }
  return { ok: true, userId };
}
