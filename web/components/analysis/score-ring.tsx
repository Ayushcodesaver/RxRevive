"use client";

/** Score ring: ink stroke on a hairline track, tabular figure in the centre. */

export function ScoreRing({ value, label, size = 190 }: { value: number; label?: string; size?: number }) {
  const circumference = 326.7; // r=52
  return (
    <div className="score-ring" style={{ width: size }} role="img" aria-label={`${value}% overall match`}>
      <svg viewBox="0 0 120 120" className="ring-svg" aria-hidden="true">
        <circle cx="60" cy="60" r="52" className="ring-bg" />
        <circle
          cx="60" cy="60" r="52"
          className="ring-fg animate"
          style={{ "--target": value } as React.CSSProperties}
          strokeDashoffset={circumference - (circumference * value) / 100}
        />
      </svg>
      <div className="ring-center">
        <span className="ring-value">{Math.round(value)}%</span>
        {label ? <span className="ring-label">{label}</span> : null}
      </div>
    </div>
  );
}
