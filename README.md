# RxRevive — Intelligent Resume and Job Description Matching System

A complete full-stack web application that analyzes candidate resumes and job
descriptions using Natural Language Processing, with **two independent engines**
solving the same problem for a fair comparison:

| | Traditional NLP | Transformer NLP |
|---|---|---|
| Technique | TF-IDF vectorization | Sentence-BERT (`all-MiniLM-L6-v2`) |
| Similarity | Cosine similarity on term vectors | Cosine similarity on 384-dim semantic embeddings |
| Understands synonyms | No (lexical) | Yes (semantic) |
| Speed | Milliseconds | Slower (model inference) |

Both engines share the same skill taxonomy (150+ skills, 8 categories), the same
weighting (60% similarity + 40% skill coverage) and the same result schema — so
running "Compare Both Models" on identical inputs produces directly comparable
scores, timings and skill analyses.

## Quick start

```bash
cd RxRevive
pip install -r requirements.txt
python run.py
# → http://127.0.0.1:5000
```

The Transformer engine needs `sentence-transformers` + `torch` (in
requirements.txt). The first analysis downloads the model (~90 MB, internet
required once); afterwards it is cached and the app works offline. The app
degrades gracefully — every Transformer feature shows an honest, informative
message if the model is unavailable.

## Pages (15, fully connected)

Home · About · Features · How It Works · Traditional NLP · Transformer NLP ·
Dataset & Research · Model Comparison · Dashboard · Resume Analysis · Analysis
Results · Reports · Contact · Login/Register/Forgot Password · Architecture.

## API endpoints

```
GET    /api/health                     service + engine status
POST   /api/resume/upload              extract resume text (PDF/DOCX/TXT)
POST   /api/analyze/traditional        run the TF-IDF engine
POST   /api/analyze/transformer        run the SBERT engine
POST   /api/analyze/compare            run both on identical inputs
GET    /api/reports                    history (search + model/score filters)
GET    /api/reports/<id>               single analysis detail
DELETE /api/reports/<id>               delete an owned analysis + its PDF
GET    /reports/<id>/download          generate/download the PDF report
GET    /api/dashboard/stats            real dashboard metrics
GET    /api/comparison/data            real compare-mode experiment history
POST   /api/auth/register|login|logout|forgot-password
POST   /api/contact                    store a contact message
POST   /api/dataset/upload             store a labelled CSV for research
```

All endpoints validate input, return structured JSON errors and never fabricate
data. Metrics that need a labelled dataset (precision/recall/F1) display
"Not evaluated yet" until Phase-6 evaluation is configured.

## Architecture

```
RxRevive/
├── run.py                  ← python run.py
├── backend/
│   ├── app.py              ← application factory, blueprints, error handlers
│   ├── config.py           ← secrets, paths, upload policy
│   ├── shared/             ← text_extraction · preprocessing · skill_extractor · analysis_helpers
│   ├── traditional_nlp/    ← tfidf_model.py (TF-IDF + cosine)
│   ├── transformer_nlp/    ← sentence_bert.py (SBERT, cached singleton)
│   ├── reports/            ← report_generator.py (ReportLab PDF)
│   ├── database/           ← SQLAlchemy models: User · Analysis · ReportFile · ContactMessage
│   └── routes/             ← main · analysis · reports · authentication · dashboard
├── frontend/
│   ├── templates/          ← 17 Jinja2 templates (dark premium design system)
│   └── static/             ← css · js (+ vendored Chart.js — works offline)
├── datasets/               ← labelled CSV datasets for research experiments
├── generated_reports/      ← generated PDFs
└── uploads/                ← temp area (files are parsed in memory, never stored)
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
