import { FlaskConical, KeyRound, Database } from "lucide-react";

/** The honest "integration not configured yet" card, Ink-styled.
 *
 * Shown wherever a page needs Clerk, Convex or the Python service and the
 * corresponding keys are absent. Never pretends to be connected.
 */

export interface SetupStep {
  label: string;
  command?: string;
}

export function SetupCard({
  service,
  icon,
  steps,
}: {
  service: "Clerk authentication" | "Convex database" | "Python AI service";
  icon: "auth" | "db" | "ai";
  steps: SetupStep[];
}) {
  const Icon = icon === "auth" ? KeyRound : icon === "db" ? Database : FlaskConical;
  return (
    <div className="well setup-card">
      <h2 className="card-title">
        <Icon aria-hidden="true" /> {service} is not configured yet
      </h2>
      <p className="muted small" style={{ marginBottom: "var(--space-lg)" }}>
        This page needs {service}. Nothing is faked here; complete the steps below and the
        page starts working as-is. See <code>.env.example</code> and <code>BUILD_STATUS.md</code> at
        the repository root for the full checklist.
      </p>
      <ol>
        {steps.map((step) => (
          <li key={step.label}>
            {step.label}
            {step.command ? (
              <>
                {" "}
                <code>{step.command}</code>
              </>
            ) : null}
          </li>
        ))}
      </ol>
    </div>
  );
}
