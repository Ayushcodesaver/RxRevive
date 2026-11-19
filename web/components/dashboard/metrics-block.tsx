/** Confusion matrix and metric block for an evaluation result. */

interface EngineEvaluation {
  engine_name: string;
  // loose: the payload comes over the wire and is rendered defensively
  metrics: Record<string, any>;
  threshold_config: Record<string, unknown>;
  computation_seconds: number;
}

export function MetricsBlock({ results, execution }: { results: Record<string, EngineEvaluation>; execution: string }) {
  const engines = Object.entries(results);
  return (
    <div style={{ display: "grid", gap: "var(--space-lg)" }}>
      {engines.map(([key, evaluation]) => (
        <div className="well" key={key}>
          <h3 className="card-title">{evaluation.engine_name}</h3>
          <div className="eval-status">
            <div className="eval-metric"><strong className="num">{(evaluation.metrics.accuracy * 100).toFixed(1)}%</strong><span>Accuracy</span></div>
            <div className="eval-metric"><strong className="num">{evaluation.metrics.precision_macro.toFixed(3)}</strong><span>Precision (macro)</span></div>
            <div className="eval-metric"><strong className="num">{evaluation.metrics.recall_macro.toFixed(3)}</strong><span>Recall (macro)</span></div>
            <div className="eval-metric"><strong className="num">{evaluation.metrics.f1_macro.toFixed(3)}</strong><span>F1 (macro)</span></div>
            {evaluation.metrics.roc_auc != null ? (
              <div className="eval-metric"><strong className="num">{evaluation.metrics.roc_auc.toFixed(3)}</strong><span>ROC-AUC</span></div>
            ) : null}
            <div className="eval-metric"><strong className="num">{evaluation.metrics.evaluated_records}</strong><span>Test records</span></div>
          </div>

          <div style={{ marginTop: "var(--space-lg)", overflowX: "auto" }} className="table-wrap">
            <table className="data-table">
              <caption className="visually-hidden">Confusion matrix</caption>
              <thead>
                <tr>
                  <th>Actual \\ Predicted</th>
                  {evaluation.metrics.confusion_matrix.labels.map((label: string) => <th key={label}>{label}</th>)}
                </tr>
              </thead>
              <tbody>
                {(evaluation.metrics.confusion_matrix.matrix as number[][]).map((row: number[], i: number) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 600 }}>{evaluation.metrics.confusion_matrix.labels[i]}</td>
                    {row.map((count: number, j: number) => (
                      <td key={j} className="num" style={i === j ? { fontWeight: 700, color: "var(--color-ink)" } : undefined}>{count}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="muted small" style={{ marginTop: "var(--space-md)" }}>
            Thresholds: {JSON.stringify(evaluation.threshold_config)} · computed in {evaluation.computation_seconds}s · {execution}
          </p>
        </div>
      ))}
      <p className="muted small">
        These are classification metrics on a labelled dataset, computed from real predictions with
        thresholds calibrated on the training split. They are different from, and should never be confused
        with, the similarity scores shown elsewhere.
      </p>
    </div>
  );
}
