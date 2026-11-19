"use client";

import { useEffect, useState } from "react";
import { fetchModelStatus } from "@/lib/api/client";

/** Live model status from the Python service; honest about every state. */

export function ModelStatusBadge() {
  const [status, setStatus] = useState<{ status: string; message: string } | null>(null);
  const [unreachable, setUnreachable] = useState(false);

  useEffect(() => {
    fetchModelStatus()
      .then((response) => setStatus({
        status: response.data.engines.transformer,
        message: response.data.transformer_message,
      }))
      .catch(() => setUnreachable(true));
  }, []);

  if (unreachable) {
    return (
      <p>
        <span className="status-badge error">AI service unreachable</span>{" "}
        <span className="muted small">Start it with: uvicorn app.main:app --port 8000 (see BUILD_STATUS.md).</span>
      </p>
    );
  }
  if (!status) {
    return <p className="muted small">Checking the model status…</p>;
  }
  const badge =
    status.status === "ready" ? "ok" : status.status === "unavailable" ? "error" : "info";
  return (
    <p>
      <span className={`status-badge ${badge}`}>
        {status.status === "ready" ? "Model loaded and ready" : status.status === "unavailable" ? "Model unavailable" : "Model loads on first use"}
      </span>{" "}
      <span className="muted small">{status.message}</span>
    </p>
  );
}
