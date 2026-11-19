"use client";

/** Gated Clerk + Convex providers.
 *
 * Both integrations are fully wired; they only mount when their public keys
 * exist. Without them the app still runs and every data page shows an honest
 * setup card instead of crashing on a missing provider.
 */

import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ConvexReactClient } from "convex/react";
import { ClerkProvider, useAuth } from "@clerk/nextjs";
import type { ReactNode } from "react";
import { config } from "@/lib/config";

export function Providers({ children }: { children: ReactNode }) {
  if (!config.clerkConfigured) {
    // No Clerk publishable key: render ungated with an explicit auth-off state.
    return <>{children}</>;
  }
  return (
    <ClerkProvider>
      <ConvexGate>{children}</ConvexGate>
    </ClerkProvider>
  );
}

function ConvexGate({ children }: { children: ReactNode }) {
  const { isSignedIn } = useAuth();
  if (config.convexConfigured && isSignedIn) {
    return (
      <ConvexProviderWithClerk client={new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!)} useAuth={useAuth}>
        {children}
      </ConvexProviderWithClerk>
    );
  }
  return <>{children}</>;
}
