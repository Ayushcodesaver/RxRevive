import Image from "next/image";
import Link from "next/link";
import { EngineSwitcher } from "@/components/analysis/engine-switcher";
import { MatchList } from "@/components/analysis/match-list";

/** Home: Poster hero, the analyzer showcase, the engine switcher, the match
 * list, what it works with, and the ink band close (Split Studio shape). */

export default function HomePage() {
  return (
    <>
      {/* ============ HERO · Poster ============ */}
      <section className="hero">
        <div className="hero-slot">
          <Image
            src="/images/fountain-pen-writing-literacy-1920.jpg"
            alt="A pen writing on paper, close up"
            fill priority sizes="100vw"
            style={{ objectPosition: "62% 45%" }}
          />
        </div>
        <div className="hero-scrim" aria-hidden="true" />
        <div className="container hero-content">
          <div className="hero-grid">
            <div className="hero-copy">
              <h1>One resume, read two ways.</h1>
              <p className="hero-lead">Two NLP engines score it against the same job description.</p>
              <div className="hero-actions-row">
                <Link className="btn paper" href="/resume-analysis">Analyze My Resume</Link>
                <Link className="btn quiet" href="/model-comparison">Compare the models</Link>
              </div>
            </div>
            <aside className="hero-card" aria-label="Sample skill match from a stored comparison run">
              <div className="hero-card-head">
                <strong>The match list</strong>
                <span>from a stored run</span>
              </div>
              <MatchList
                compact
                items={[
                  { skill: "Natural language processing", present: true },
                  { skill: "Machine learning", present: true },
                  { skill: "Python", present: true },
                  { skill: "TensorFlow", present: true },
                  { skill: "PyTorch", present: false },
                  { skill: "Kubernetes", present: false },
                ]}
              />
              <p className="hero-card-foot">From one stored run: TF-IDF 42%, Sentence-BERT 75%, 15 skills in, 6 out.</p>
            </aside>
          </div>
        </div>
      </section>

      {/* ============ THE ANALYZER · Showcase ============ */}
      <section className="section">
        <div className="container showcase">
          <div className="section-head">
            <h2>The analyzer</h2>
            <p>
              Upload a resume, paste the posting, pick an engine. The panel below is the running app,
              and the full wiring is on the <Link className="inline-link" href="/architecture">architecture page</Link>.
            </p>
          </div>
          <figure className="showcase-frame" style={{ margin: 0 }}>
            <Image
              src="/images/screens/panel-analyzer.png"
              alt="The analyzer panel: model picker, resume drop zone and job description fields"
              width={2624} height={1544} loading="lazy"
            />
          </figure>
          <div className="showcase-pair">
            <figure style={{ margin: 0 }}>
              <div className="showcase-frame" style={{ aspectRatio: "1312 / 377", overflow: "hidden" }}>
                <Image
                  src="/images/screens/panel-dashcharts.png"
                  alt="The dashboard charts: engine usage, performance over time, score distribution"
                  width={2624} height={754} loading="lazy"
                  style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }}
                />
              </div>
              <figcaption className="caption">Every figure on the dashboard comes from your own stored analyses.</figcaption>
            </figure>
            <figure style={{ margin: 0 }}>
              <div className="showcase-frame" style={{ aspectRatio: "1440 / 384", overflow: "hidden" }}>
                <Image
                  src="/images/screens/panel-reports.png"
                  alt="The reports page: filter bar and the stored analysis table"
                  width={2880} height={768} loading="lazy"
                  style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }}
                />
              </div>
              <figcaption className="caption">The report history: searchable, filterable, downloadable.</figcaption>
            </figure>
          </div>
        </div>
      </section>

      {/* ============ THE SAME RESUME, SCORED TWICE · Switcher ============ */}
      <section className="section section-alt">
        <div className="container">
          <div className="section-head">
            <h2>The same resume, scored twice</h2>
            <p>From a real comparison run stored in this app: identical inputs, identical weights, two engines.</p>
          </div>
          <EngineSwitcher
            states={[
              {
                id: "trad", tab: "TF-IDF", figure: "42%", badge: "Partial Fit", badgeIn: false,
                facts: [["Document similarity", "22.9%"], ["Skill coverage", "71.4%"], ["Processing time", "0.8 seconds"]],
                copy: "TF-IDF matches words, not meaning. The resume says “built NLP models”; the posting asks for “develops natural language processing systems”, and the vectors barely overlap.",
                link: { href: "/traditional-nlp", label: "Open the TF-IDF engine" },
                image: { src: "/images/screens/panel-traditional.png", width: 2624, height: 706, alt: "The traditional engine panel: a 42 percent score and its breakdown" },
              },
              {
                id: "sbert", tab: "Sentence-BERT", figure: "75%", badge: "Strong Fit", badgeIn: true,
                facts: [["Document similarity", "77.5%"], ["Skill coverage", "71.4%"], ["Processing time", "37.2 seconds"]],
                copy: "Sentence-BERT encodes meaning, so the paraphrase reads as the same requirement. Same resume, same posting, same 60/40 weights, a very different verdict.",
                link: { href: "/transformer-nlp", label: "Open the Transformer engine" },
                image: { src: "/images/screens/panel-transformer.png", width: 2624, height: 706, alt: "The transformer engine panel: a 75 percent score and its breakdown" },
              },
            ]}
          />
        </div>
      </section>

      {/* ============ WHAT THE ENGINES FOUND · the match list ============ */}
      <section className="section">
        <div className="container">
          <div className="section-head">
            <h2>What the engines found</h2>
            <p>From the stored run: fifteen skills in, six out.</p>
          </div>
          <MatchList
            items={[
              { skill: "Docker", present: true },
              { skill: "pandas", present: true },
              { skill: "Power BI", present: true },
              { skill: "Healthcare", present: true },
              { skill: "Spark", present: false },
              { skill: "Tableau", present: false },
              { skill: "Clinical trials", present: false },
            ]}
          />
          <p className="caption">A taxonomy of 150+ skills serves both engines, so coverage always agrees.</p>
        </div>
      </section>

      {/* ============ WHAT IT WORKS WITH · Rows ============ */}
      <section className="section section-alt">
        <div className="container">
          <div className="section-head">
            <h2>What it works with</h2>
            <p>One pipeline, no hidden steps.</p>
          </div>
          <ul className="needs-list">
            <li><strong>Formats</strong><span>PDF, DOCX or TXT, parsed in memory, never written to disk.</span></li>
            <li><strong>Engines</strong><span>TF-IDF vectors or Sentence-BERT embeddings. Compare mode runs both.</span></li>
            <li><strong>Skills</strong><span>150+ skills in 8 categories, matched on word boundaries.</span></li>
            <li><strong>Score</strong><span>0.6 × similarity + 0.4 × skill coverage, identical in both engines.</span></li>
            <li><strong>Report</strong><span>A ReportLab PDF, kept in your history.</span></li>
            <li><strong>Account</strong><span>Optional: guests work in their session, an account keeps history.</span></li>
          </ul>
        </div>
      </section>

      {/* ============ PASTE IT IN · Split ============ */}
      <section className="section">
        <div className="container split-rows">
          <div className="split-row mirror">
            <div className="split-copy">
              <h2>Paste it in, take the report out.</h2>
              <p>Every run is stored with its scores, this match list, and a one-click PDF.</p>
              <div className="hero-actions">
                <Link className="btn" href="/reports">Open the report history</Link>
              </div>
            </div>
            <figure className="showcase-frame" style={{ margin: 0, aspectRatio: "1312 / 916", overflow: "hidden", position: "relative" }}>
              <Image
                src="/images/screens/panel-matchlist.png"
                alt="The stored match list: fifteen matched skills and the missing six"
                fill loading="lazy"
                style={{ objectFit: "cover", objectPosition: "top" }}
              />
            </figure>
          </div>
        </div>
      </section>

      {/* ============ CLOSE · Band ============ */}
      <section className="band-close">
        <div className="container">
          <div>
            <h2>Run your own comparison.</h2>
            <p>Two scores you can argue with.</p>
            <div className="hero-actions">
              <Link className="btn paper" href="/resume-analysis">Analyze My Resume</Link>
              <Link className="btn quiet" href="/how-it-works">Read the ten-step pipeline</Link>
            </div>
          </div>
          <figure className="showcase-frame" style={{ margin: 0, aspectRatio: "1312 / 533", overflow: "hidden", position: "relative" }}>
            <Image
              src="/images/screens/panel-scoreduo.png"
              alt="Both engine score panels with the 33 point difference"
              fill loading="lazy"
              style={{ objectFit: "cover", objectPosition: "top" }}
            />
          </figure>
        </div>
      </section>
    </>
  );
}
