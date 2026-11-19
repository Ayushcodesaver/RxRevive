import type { Metadata } from "next";
import { SignUp } from "@clerk/nextjs";
import { config } from "@/lib/config";
import { SetupCard } from "@/components/setup/setup-card";

export const metadata: Metadata = { title: "Create account" };

export default function SignUpPage() {
  if (!config.clerkConfigured) {
    return (
      <section className="auth-section">
        <div className="container auth-wrap">
          <SetupCard
            service="Clerk authentication"
            icon="auth"
            steps={[
              { label: "Create an application at dashboard.clerk.com" },
              { label: "Copy the keys into web/.env.local", command: "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=...\nCLERK_SECRET_KEY=..." },
              { label: "Restart the dev server", command: "npm run dev" },
            ]}
          />
        </div>
      </section>
    );
  }
  return (
    <section className="auth-section">
      <div className="container auth-wrap" style={{ justifyItems: "center" }}>
        <SignUp signInUrl="/sign-in" />
      </div>
    </section>
  );
}
