import Link from "next/link";

/** Ink mast footer: wordmark over the links, photo credit, honest legal line. */

const COLUMNS = [
  {
    title: "Product",
    links: [
      { href: "/resume-analysis", label: "Resume Analysis" },
      { href: "/dashboard", label: "Dashboard" },
      { href: "/reports", label: "Reports" },
      { href: "/features", label: "Features" },
    ],
  },
  {
    title: "Engines",
    links: [
      { href: "/traditional-nlp", label: "Traditional NLP" },
      { href: "/transformer-nlp", label: "Transformer NLP" },
      { href: "/model-comparison", label: "Comparison" },
      { href: "/architecture", label: "Architecture" },
    ],
  },
  {
    title: "Project",
    links: [
      { href: "/about", label: "About" },
      { href: "/research", label: "Dataset & Research" },
      { href: "/how-it-works", label: "How It Works" },
      { href: "/contact", label: "Contact" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container footer-mast">
        <div className="footer-grid">
          <div className="footer-brand">
            <Link className="brand" href="/" aria-label="RxRevive home">
              <span className="brand-mark" aria-hidden="true">R</span>
              <span className="brand-text">RxRevive<span className="brand-sub">Match</span></span>
            </Link>
            <p className="footer-tagline">
              Two NLP engines, one problem, honestly compared. An academic project by Team RxRevive.
            </p>
          </div>
          {COLUMNS.map((column) => (
            <div className="footer-col" key={column.title}>
              <h4>{column.title}</h4>
              {column.links.map((link) => (
                <Link key={link.href} href={link.href}>{link.label}</Link>
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="container footer-photos" data-credits>
        <p style={{ margin: 0 }}>
          Photographs:{" "}
          <a href="https://commons.wikimedia.org/wiki/File:Fountain_pen_writing_(literacy).jpg">
            Petar Milošević
          </a>{" "}
          (CC BY-SA 4.0, Wikimedia Commons)
        </p>
      </div>
      <div className="container footer-bottom">
        <p>Team RxRevive, an academic NLP project. For educational use only.</p>
        <p>Matching scores are similarity suggestions, never automated hiring decisions.</p>
      </div>
    </footer>
  );
}
