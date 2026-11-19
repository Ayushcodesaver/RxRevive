/** Public runtime configuration flags.
 *
 * Everything reads public env vars only; secrets never reach this module.
 * The flags drive the honest "not configured yet" states across the app.
 */

export const config = {
  clerkConfigured: Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY),
  convexConfigured: Boolean(process.env.NEXT_PUBLIC_CONVEX_URL),
  apiUrl: process.env.NEXT_PUBLIC_PYTHON_API_URL || "http://127.0.0.1:8000",
  appName: "RxRevive",
  tagline: "Two NLP engines, one problem, honestly compared.",
};

export type Config = typeof config;
