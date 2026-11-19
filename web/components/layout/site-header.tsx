"use client";

/** Ink chrome: edge-aligned bar with the three dropdown groups.
 *
 * Clerk components render only when the publishable key exists (they sit
 * inside ClerkProvider in that case); otherwise plain links to the setup
 * states keep the chrome honest.
 */

import Link from "next/link";
import { Menu } from "lucide-react";
import { SignedIn, UserButton } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { config } from "@/lib/config";

const GROUPS = [
  {
    label: "Product",
    items: [
      { href: "/features", label: "Features" },
      { href: "/how-it-works", label: "How It Works" },
      { href: "/architecture", label: "Architecture" },
      { href: "/dashboard", label: "Dashboard" },
    ],
  },
  {
    label: "Engines",
    items: [
      { href: "/traditional-nlp", label: "Traditional NLP (TF-IDF)" },
      { href: "/transformer-nlp", label: "Transformer (Sentence-BERT)" },
      { href: "/model-comparison", label: "Model Comparison" },
    ],
  },
  {
    label: "Resources",
    items: [
      { href: "/research", label: "Dataset & Research" },
      { href: "/reports", label: "My Reports" },
      { href: "/about", label: "About Project" },
      { href: "/contact", label: "Contact" },
    ],
  },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  // Clerk auth components cannot render during static prerender (Core 3);
  // gate them on hydration and keep plain links for guests in the meantime.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <header className="site-header">
      <div className="container header-row">
        <Link className="brand" href="/" aria-label="RxRevive home">
          <span className="brand-mark" aria-hidden="true">R</span>
          <span className="brand-text">RxRevive<span className="brand-sub">Match</span></span>
        </Link>

        <button
          className="nav-toggle"
          aria-expanded={open}
          aria-controls="site-nav"
          aria-label="Toggle navigation"
          onClick={() => setOpen((v) => !v)}
        >
          <Menu className="icon" aria-hidden="true" />
        </button>

        <nav className="site-nav" id="site-nav" data-open={open} aria-label="Main navigation">
          {GROUPS.map((group) => (
            <div className="nav-group" key={group.label} data-open={openGroup === group.label}>
              <button
                className="nav-link drop-btn"
                type="button"
                aria-expanded={openGroup === group.label}
                onClick={() => setOpenGroup((g) => (g === group.label ? null : group.label))}
              >
                {group.label}
              </button>
              <div className="dropdown">
                {group.items.map((item) => (
                  <Link key={item.href} href={item.href} onClick={() => { setOpen(false); setOpenGroup(null); }}>
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}

          <div className="nav-auth">
            {config.clerkConfigured && mounted ? (
              <SignedIn>
                <UserButton />
              </SignedIn>
            ) : (
              <>
                <Link className="nav-link" href="/sign-in" onClick={() => setOpen(false)}>
                  Log in
                </Link>
                <Link className="btn quiet small" href="/sign-up" onClick={() => setOpen(false)}>
                  Sign up
                </Link>
              </>
            )}
          </div>
        </nav>

        <Link className="btn nav-cta" href="/resume-analysis">
          Analyze My Resume
        </Link>
      </div>
    </header>
  );
}
