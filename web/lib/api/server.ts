/** Server-only bridge to the Python FastAPI service.
 *
 * Uses PYTHON_API_SECRET over the internal network (never exposed to the
 * browser). When the secret is absent (local dev) the call goes out unsigned
 * and the backend's AUTH_DISABLED mode applies; the response metadata reports
 * which channel was used.
 */

import "server-only";
import { config } from "@/lib/config";

const SECRET = process.env.PYTHON_API_SECRET;

export async function callPython<T>(
  path: string,
  options: { method?: string; json?: unknown; form?: FormData; userId?: string | null } = {},
): Promise<{ ok: boolean; status: number; body: T | { error: string | { message?: string } | null } }> {
  const headers: Record<string, string> = {};
  if (SECRET) {
    headers["X-API-Secret"] = SECRET;
    if (options.userId) headers["X-User-Id"] = options.userId;
  }
  let body: BodyInit | undefined;
  if (options.form) {
    body = options.form;
  } else if (options.json !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(options.json);
  }
  const response = await fetch(`${config.apiUrl}/api/v1${path}`, {
    method: options.method || (body ? "POST" : "GET"),
    headers,
    body,
    cache: "no-store",
  });
  const parsed = await response.json().catch(() => null);
  return { ok: response.ok, status: response.status, body: parsed };
}

export function pythonError(detail: unknown, fallback: string): string {
  if (typeof detail === "string") return detail;
  if (detail && typeof detail === "object") {
    const record = detail as Record<string, unknown>;
    if (typeof record.error === "string") return record.error;
    if (record.error && typeof record.error === "object") {
      const nested = record.error as { message?: string };
      if (nested.message) return nested.message;
    }
    if (typeof record.detail === "string") return record.detail;
  }
  return fallback;
}
