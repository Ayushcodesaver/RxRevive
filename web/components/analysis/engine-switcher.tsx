"use client";

/** Engine switcher: two real engine states behind a segmented control.
 * First state renders server-side without script; arrow keys move between tabs.
 */

import { useState } from "react";

export interface EngineState {
  id: string;
  tab: string;
  figure: string;
  badge: string;
  badgeIn: boolean;
  facts: [string, string][];
  copy: string;
  link?: { href: string; label: string };
  image?: { src: string; width: number; height: number; alt: string };
}

export function EngineSwitcher({ states }: { states: EngineState[] }) {
  const [active, setActive] = useState(0);

  return (
    <div data-switch="">
      <div className="seg" role="tablist" aria-label="Engine results">
        {states.map((state, i) => (
          <button
            key={state.id}
            type="button"
            role="tab"
            id={`tab-${state.id}`}
            aria-selected={i === active}
            aria-controls={`panel-${state.id}`}
            tabIndex={i === active ? 0 : -1}
            onClick={() => setActive(i)}
            onKeyDown={(e) => {
              if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
              e.preventDefault();
              const next = (i + (e.key === "ArrowRight" ? 1 : states.length - 1)) % states.length;
              setActive(next);
              document.getElementById(`tab-${states[next].id}`)?.focus();
            }}
          >
            {state.tab}
          </button>
        ))}
      </div>
      <div className="switch-panels">
        {states.map((state, i) => (
          <section
            key={state.id}
            className="switch-panel"
            role="tabpanel"
            id={`panel-${state.id}`}
            aria-labelledby={`tab-${state.id}`}
            hidden={i !== active}
          >
            <div className="split-row">
              <div className="split-copy">
                <span className="engine-figure">{state.figure}</span>
                <p>
                  {state.badgeIn ? <span className="tag-in">{state.badge}</span> : <span className="tag-out">{state.badge}</span>}
                </p>
                <dl className="engine-facts">
                  {state.facts.map(([dt, dd]) => (
                    <div key={dt}><dt>{dt}</dt><dd>{dd}</dd></div>
                  ))}
                </dl>
                <p>
                  {state.copy}
                  {state.link ? (
                    <>
                      {" "}
                      <a className="inline-link" href={state.link.href}>{state.link.label}</a>
                    </>
                  ) : null}
                </p>
              </div>
              {state.image ? (
                <figure className="showcase-frame" style={{ margin: 0, aspectRatio: `${state.image.width} / ${state.image.height}`, overflow: "hidden" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={state.image.src}
                    width={state.image.width}
                    height={state.image.height}
                    alt={state.image.alt}
                    loading="lazy"
                    style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }}
                  />
                </figure>
              ) : null}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
