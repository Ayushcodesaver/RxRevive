import type { Metadata } from "next";
import { Epilogue, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";

const epilogue = Epilogue({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-epilogue",
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-plex-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "RxRevive · Intelligent Resume and Job Description Matching System",
    template: "%s · RxRevive",
  },
  description:
    "Upload a resume, paste a job description and get a match score from two NLP engines: TF-IDF and Sentence-BERT, run side by side.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${epilogue.variable} ${plexMono.variable}`}>
      <body>
        <a className="skip-link" href="#main">Skip to content</a>
        <Providers>
          <SiteHeader />
          <main id="main">{children}</main>
          <SiteFooter />
        </Providers>
      </body>
    </html>
  );
}
