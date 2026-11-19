# RxRevive — Intelligent Resume and Job Description Matching System

> **Stack:** Next.js 16 + TypeScript + Clerk + Convex + Python FastAPI (PyTorch, Sentence-BERT, scikit-learn). See [BUILD_STATUS.md](BUILD_STATUS.md) for the per-module state and setup steps.

Two independent NLP engines score a resume against a job description on identical inputs:

| | Traditional NLP | Transformer NLP |
|---|---|---|
| Technique | TF-IDF vectorization | Sentence-BERT (`all-MiniLM-L6-v2`) |
| Similarity | Cosine similarity on term vectors | Cosine similarity on 384-dim semantic embeddings |
| Understands synonyms | No (lexical) | Yes (semantic) |

Both engines share one skill taxonomy (150+ skills, 10 categories) and one weighting
(60% similarity + 40% skill coverage), so their results are directly comparable.

---

## Monorepo quick start

```bash
# 1. Python AI service (all NLP computation)
cd ai-backend
pip install -r requirements.txt
python -m pytest tests/               # 42 tests
uvicorn app.main:app --port 8000      # http://127.0.0.1:8000/docs

# 2. Web app (Next.js, the Ink design)
cd ../web
npm install
cp ../.env.example .env.local         # fill Clerk/Convex keys when ready
npm run dev                           # http://localhost:3000

# 3. Or everything in Docker
docker compose up --build
```

## Structure

```
web/          Next.js 16 App Router (TypeScript, Tailwind, the Ink design)
  app/(marketing)/   10 public pages
  app/(auth)/        Clerk sign-in / sign-up
  app/(dashboard)/   10 authenticated pages
  app/api/           server routes: analyze, extract, contact, datasets, evaluation, reports
convex/       schema + functions (users, analyses, datasets, evaluations, experiments, contacts)
ai-backend/   FastAPI service (both NLP engines, evaluation, metrics, ReportLab PDFs)
datasets/     labelled CSV datasets for research evaluation
generated_reports/   PDFs written by the FastAPI service
```




## Pages (15, fully connected)

Home · About · Features · How It Works · Traditional NLP · Transformer NLP ·
Dataset & Research · Model Comparison · Dashboard · Resume Analysis · Analysis
Results · Reports · Contact · Login/Register/Forgot Password · Architecture.

## API endpoints (FastAPI, /api/v1)

```
GET    /health                        service + engine status
GET    /skills                        the shared skill taxonomy
POST   /resumes/extract               extract resume text (PDF/DOCX/TXT)
POST   /analyze/traditional           run the TF-IDF engine
POST   /analyze/transformer           run the SBERT engine
POST   /analyze/compare               run both on identical inputs
POST   /datasets/validate             inspect and validate a labelled CSV
POST   /evaluation/run                labelled evaluation of both engines
POST   /reports/generate              render the ReportLab PDF
GET    /reports/download/<filename>   download a generated report
GET    /models/status                 model availability (via /health)
```

Authentication: a Clerk JWT (verified against JWKS) or the service secret for
server-to-server calls. All endpoints validate input, return a structured JSON
envelope with request ids, and never fabricate data. Classification metrics
appear only after a labelled dataset evaluation has actually been run.

## API surface (Next.js, /api)

```
POST   /api/analyze/<engine>          Clerk auth -> Convex record -> FastAPI
POST   /api/resumes/extract           upload proxy (secret stays server-side)
POST   /api/contact                   persists to Convex
POST   /api/datasets/validate         validation proxy
POST   /api/evaluation/run            evaluation proxy (+ persistence)
POST   /api/reports/generate          PDF proxy
GET    /api/reports/download/<file>   PDF streaming proxy
POST   /api/analyses/remove           owned-analysis delete
```

## Architecture

```
RxRevive/
├── web/                     ← Next.js 16 (Ink design, TypeScript, Tailwind)
│   ├── app/(marketing)/     ← 10 public pages
│   ├── app/(auth)/          ← Clerk sign-in / sign-up
│   ├── app/(dashboard)/     ← 10 authenticated pages
│   ├── app/api/             ← server routes proxying the AI service
│   ├── components/          ← chrome, analyzer, dashboard, ui
│   └── lib/                 ← api client, validation (zod), convex
├── convex/                  ← schema + functions (ownership checked)
├── ai-backend/              ← FastAPI: extraction, taxonomy, TF-IDF, SBERT,
│                              evaluation + metrics, ReportLab reports, tests
├── datasets/                ← labelled CSV datasets for research experiments
├── generated_reports/       ← PDFs written by the FastAPI service
└── uploads/                 ← temp area (files parsed in memory, never stored)
```

## Security

- Upload validation: extension whitelist **and** content sniffing (%PDF / PK zip
  magic bytes), 8 MB limit, `secure_filename`, in-memory parsing (resume files
  are never written to disk).
- Passwords hashed with Werkzeug scrypt; HTTP-only, SameSite session cookies.
- Persisted random secret key (`.secret_key`, generated on first run).
- Analyses are scoped to the visitor's session or logged-in user — report
  download/delete check ownership.
- No arbitrary file execution; datasets restricted to parsed CSV only.

## Matching logic (both engines)

1. Extract text from the uploaded resume (PDF/DOCX/TXT, in memory).
2. Preprocess: normalise → symbol handling (protects C++, C#, .NET) →
   tokenise → stop-word removal.
3. Extract skills from both documents with word-boundary regex over the
   curated taxonomy.
4. Engine similarity: TF-IDF cosine (Branch A) or SBERT embedding cosine
   (Branch B).
5. Final score = `0.6 × similarity + 0.4 × skill coverage` — identical weights
   in both engines.
6. Experience and education alignment, strengths, gaps, recommendations.
7. Results saved to SQLite; PDF report generated on demand with ReportLab.

## Honest boundaries (by design)

- Match scores are similarity suggestions — **not** probabilities of employment
  and **not** hiring decisions. Every results page and PDF carries a disclaimer.
- No hardcoded scores, no invented accuracy values, no fabricated dataset
  statistics or source URLs.
- Precision/recall/F1 appear only after a labelled dataset evaluation is
  configured (Phase 6).
