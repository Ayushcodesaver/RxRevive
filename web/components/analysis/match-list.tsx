/** The match list: ruled skills with In / Out state pills (the signature). */

export function MatchList({ items, compact = false }: { items: { skill: string; present: boolean }[]; compact?: boolean }) {
  return (
    <ul className="match-list">
      {items.map((item) => (
        <li className="match-row" key={item.skill}>
          <span className="skill" style={compact ? { fontSize: "var(--text-sm)" } : undefined}>
            {item.skill}
          </span>
          {item.present ? <span className="tag-in">In</span> : <span className="tag-out">Out</span>}
        </li>
      ))}
    </ul>
  );
}

export function MatchListFromEngines({
  matched,
  missing,
  max = 12,
}: {
  matched: string[];
  missing: string[];
  max?: number;
}) {
  const items = [
    ...matched.slice(0, Math.ceil(max * 0.6)).map((skill) => ({ skill, present: true })),
    ...missing.slice(0, Math.floor(max * 0.4)).map((skill) => ({ skill, present: false })),
  ];
  return <MatchList items={items} />;
}
