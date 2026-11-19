# RxRevive Build Status

**Architecture**: Next.js 16 (web/) + Clerk + Convex (convex/) + Python FastAPI (ai-backend/)
**Design**: the Hallmark Ink system is preserved verbatim (white paper, hueless black, Epilogue, hairlines, one teal that means in). Tokens live in `web/app/globals.css` and `design.md`.
**Legacy**: the original Flask app (`backend/` + `frontend/`) is untouched and still runs with `python run.py`; it is the reference implementation.

---

## Completed modules

### Python FastAPI service (ai-backend/) — WORKING, TESTED, RUNNING
| Module | Status | Notes |
|---|---|---|
| Text extraction (PDF/DOCX/TXT) | ✅ complete | PyMuPDF with pypdf fallback; content sniffing; in-memory only |
| Preprocessing + stop words | ✅ complete | Built-in list; C++/C#/.NET preserved |
| Skill taxonomy (150+ skills, 10 categories) | ✅ complete | Word-boundary matching + synonym mapping, shared by both engines |
| TF-IDF engine (Branch A) | ✅ complete | sklearn TfidfVectorizer, cosine, explainable details |
| Sentence-BERT engine (Branch B) | ✅ complete | Real all-MiniLM-L6-v2 inference, 384-dim, chunked long documents |
| Comparison engine | ✅ complete | Identical inputs, difference score |
| Experience/education alignment | ✅ complete | Ported from the Flask implementation |
| Dataset loader + cleaner | ✅ complete | Column mapping, duplicates, missing values, honest reports |
| Labelled evaluation + metrics | ✅ complete | Accuracy/precision/recall/F1 (macro/weighted), confusion matrix, ROC-AUC (binary), per-class report; thresholds calibrated on the TRAIN split only |
| ReportLab PDF reports | ✅ complete | Bytes-based renderer, stored locally, traversal-safe download |
| Clerk JWT verification | ✅ implemented | JWKS fetch + signature/issuer/audience/expiry checks (activates with `CLERK_JWT_ISSUER_DOMAIN`) |
| Service-secret channel | ✅ implemented | `X-API-Secret` + `X-User-Id` from the Next.js server routes |
| Celery/Redis background tasks | ✅ implemented | Optional; queues evaluation runs when `REDIS_URL` is set, inline otherwise |
| Structured JSON envelope + request ids + logging | ✅ complete | Never logs resume bodies or secrets |
| Pytest suite | ✅ 42 tests passing | Includes real SBERT inference and an end-to-end TF-IDF evaluation |

### Next.js frontend (web/) — BUILDING, ALL 20 ROUTES SERVE
| Module | Status | Notes |
|---|---|---|
| Ink design system migration | ✅ complete | Tokens + components ported to `globals.css`; Epilogue + IBM Plex Mono self-hosted via next/font |
| Chrome (edge-aligned nav, dropdowns, mobile panel, mast footer) | ✅ complete | Dropdown/mobile behaviour via React state |
| Marketing pages (10) | ✅ complete | Home (Poster hero, switcher, match list), About, Features, How It Works, Traditional NLP, Transformer NLP, Research, Architecture, Contact, Model Comparison |
| Auth pages (2) | ✅ complete | Clerk `<SignIn>/<SignUp>` when configured; Ink setup cards otherwise |
| Analyzer (client) | ✅ complete | react-hook-form + zod, dropzone → extraction, live results, honest errors |
| Dashboard pages (10) | ✅ complete | dashboard, resume-analysis, analysis-results/[id], reports, datasets, evaluation, experiments, model-comparison, profile, settings |
| Next API routes | ✅ complete | analyze/[engine], resumes/extract, contact, datasets/validate, evaluation/run, reports/generate+download, analyses/remove — the Python secret never reaches the browser |
| Convex persistence | ✅ implemented | analyses, datasets, evaluations, contacts (server-side writes, ownership in every function) |
| Clerk session wiring | ✅ implemented | Providers gated on keys; middleware protects dashboard routes when configured |
| Vitest suite | ✅ 7 tests passing | score bands, labels, config flags, zod schemas |

### Convex (convex/)
| Module | Status |
|---|---|
| schema.ts (7 tables, indexes) | ✅ written |
| users.ts (sync on first sign-in; first user becomes admin) | ✅ written |
| analyses.ts (create/list/get/remove/stats — ownership-checked) | ✅ written |
| datasets.ts, evaluations.ts, experiments.ts, contacts.ts | ✅ written |
| `_generated/` | ⏳ build shim committed; `npx convex dev` replaces it with the real codegen |

### Deployment
| Item | Status |
|---|---|
| ai-backend Dockerfile (with model pre-download) | ✅ written |
| web Dockerfile (standalone output) | ✅ written |
| docker-compose.yml (backend + web, optional redis profile) | ✅ written |
| .env.example (all keys, no values) | ✅ written |

---

## Integration status (local environment)

| Integration | State | Remaining step |
|---|---|---|
| **Clerk** | ✅ CONFIGURED — dev keys in `web/.env.local`, issuer domain in `ai-backend/.env`; verified: `/dashboard` redirects guests to the Clerk sign-in | Production keys before a real deploy (`sk_test_` → `sk_live_`) |
| **Convex** | ✅ LIVE — deployment `polite-caiman-100` has the schema and all functions pushed (verified: a contact message persisted through the Next API route) | Nothing; future function changes just need another `npx convex dev` |
| **Object storage** | ❌ not configured | Fill the `OBJECT_STORAGE_*` variables; reports currently persist to `generated_reports/` |
| **Redis** | ❌ not configured (evaluations run inline) | Set `REDIS_URL` and run `celery -A app.tasks.celery_app worker` |

The web app calls Convex through `anyApi` function references (web/lib/convex/generated.ts), so no
generated code is needed inside web/ — after changing convex/ functions, just push with `npx convex dev`.

Every unconfigured integration renders an explicit setup state in the UI — nothing pretends to be connected.

## Test results (executed, not claimed)

```
ai-backend:  42 passed (pytest, incl. real Sentence-BERT inference)
web:          7 passed (vitest: score bands, labels, config flags, zod schemas)
live chain:   POST web:3000/api/analyze/compare -> FastAPI -> TF-IDF 37% / SBERT 52% (real inference)
routes:       20/20 serve 200 (/, 9 marketing, 2 auth, 8 dashboard), 404 for unknown
```

## Known limitations

- Guest analyses are sessionless: without Clerk/Convex nothing is persisted (reported in the response metadata as `persisted: false`).
- The Convex `_generated` directory is a build shim until the first `npx convex dev`.
- Contact messages require Convex; until then the route answers 503 with setup instructions.
- Admin dashboard (role-gated) is modelled in the schema (`users.role`) but no admin UI pages exist yet.
- Playwright browser E2E is not executed in this environment (no browser harness in CI); the end-to-end happy path was verified with live HTTP calls instead.

## Setup requirements

```bash
# 1. Python AI service
cd ai-backend
pip install -r requirements.txt
python -m pytest tests/          # 42 tests
uvicorn app.main:app --port 8000 # http://127.0.0.1:8000/docs

# 2. Web app
cd ../web
npm install
cp ../.env.example .env.local    # fill Clerk/Convex when ready
npm run dev                      # http://localhost:3000

# 3. Docker (both services)
docker compose up --build
```
