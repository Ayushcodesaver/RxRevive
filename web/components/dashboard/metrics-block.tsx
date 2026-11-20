/** Confusion matrix and metric block for an evaluation result.
 *
 * The payload nests per-engine: { engine_name, results: { similarity: {metrics}, final: {metrics} } }.
 * Both scoring variants render: raw similarity (baseline) and the hybrid final score.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Loose = Record<string, any>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type VariantBlock = { variant: string } & Record<string, any>;

export function MetricsBlock({ results, execution }: {
  results: Record<string, {
    engine_name: string;
    results?: Record<string, VariantBlock>;
    metrics?: Loose;
    threshold_config?: Loose;
    computation_seconds?: number;
  }>;
  execution: string;
}) {
  const engines = Object.entries(results);
  return (
    <div style={{ display: "grid", gap: "var(--space-lg)" }}>
      {engines.map(([key, evaluation]) => {
        // support both the nested {results: {similarity, final}} shape and a flat {metrics}
        const variants: VariantBlock[] = evaluation.results
          ? Object.entries(evaluation.results).map(([name, block]) => ({ ...block, variant: name }))
          : [{ variant: "similarity", metrics: evaluation.metrics ?? {}, threshold_config: evaluation.threshold_config ?? {} }];
        return (
          <div className="well" key={key}>
            <h3 className="card-title">{evaluation.engine_name}</h3>
            {variants.map((variant) => {
              const m = variant.metrics as Loose;
              return (
                <div key={variant.variant} style={{ marginBottom: "var(--space-lg)" }}>
                  <p className="skill-category" style={{ marginTop: 0 }}>
                    {variant.variant === "final" ? "Hybrid final score (0.6 similarity + 0.4 skill coverage)" : "Raw document similarity (baseline)"}
                  </p>
                  <div className="eval-status">
                    <div className="eval-metric"><strong className="num">{(Number(m.accuracy) * 100).toFixed(1)}%</strong><span>Accuracy</span></div>
                    <div className="eval-metric"><strong className="num">{Number(m.precision_macro).toFixed(3)}</strong><span>Precision (macro)</span></div>
                    <div className="eval-metric"><strong className="num">{Number(m.recall_macro).toFixed(3)}</strong><span>Recall (macro)</span></div>
                    <div className="eval-metric"><strong className="num">{Number(m.f1_macro).toFixed(3)}</strong><span>F1 (macro)</span></div>
                    {m.roc_auc != null ? (
                      <div className="eval-metric"><strong className="num">{Number(m.roc_auc).toFixed(3)}</strong><span>ROC-AUC</span></div>
                    ) : null}
                    <div className="eval-metric"><strong className="num">{String(m.evaluated_records)}</strong><span>Test records</span></div>
                  </div>

                  <div style={{ marginTop: "var(--space-lg)", overflowX: "auto" }} className="table-wrap">
                    <table className="data-table">
                      <caption className="visually-hidden">Confusion matrix ({variant.variant})</caption>
                      <thead>
                        <tr>
                          <th>Actual \ Predicted</th>
                          {(m.confusion_matrix?.labels ?? []).map((label: string) => <th key={label}>{label}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {((m.confusion_matrix?.matrix ?? []) as number[][]).map((row: number[], i: number) => (
                          <tr key={i}>
                            <td style={{ fontWeight: 600 }}>{m.confusion_matrix.labels[i]}</td>
                            {row.map((count: number, j: number) => (
                              <td key={j} className="num" style={i === j ? { fontWeight: 700, color: "var(--color-ink)" } : undefined}>{count}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="muted small" style={{ marginTop: "var(--space-sm)" }}>
                    Thresholds: {JSON.stringify(variant.threshold_config ?? {})}
                  </p>
                </div>
              );
            })}
            <p className="muted small">
              computed in {evaluation.computation_seconds ?? ""}s · {execution}
            </p>
          </div>
        );
      })}
      <p className="muted small">
        These are classification metrics on a labelled dataset, computed from real predictions with
        thresholds calibrated on the training split. They are different from, and should never be confused
        with, the similarity scores shown elsewhere.
      </p>
    </div>
  );
}
