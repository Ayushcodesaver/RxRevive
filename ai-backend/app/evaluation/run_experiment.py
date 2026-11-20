"""Run the labelled evaluation experiment and write a full report.

Usage: python app/evaluation/run_experiment.py [--sample 150] [--mpnet]
Loads datasets/raw/resume_job_fit_sample.csv (real labelled data from the
HF Resume-Job Fit dataset), dedupes against leakage, evaluates BOTH engines
with BOTH scoring variants on identical splits, optionally compares
all-MiniLM-L6-v2 vs all-mpnet-base-v2, and writes the report to
datasets/experiments/experiment_report.json.
"""

import argparse
import json
from collections import Counter
import pathlib
import sys
from collections import Counter

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[2]))

from app.evaluation.dataset_loader import load_csv  # noqa: E402
from app.evaluation.evaluate import compare_engines, evaluate_dataset  # noqa: E402

ROOT = pathlib.Path(__file__).resolve().parents[3]
SAMPLE = ROOT / "datasets" / "raw" / "resume_job_fit_sample.csv"


def dedupe_against_leakage(records: list[dict]) -> tuple[list[dict], int]:
    """Drop records whose resume prefix already appeared (train/test leakage)."""
    seen_resumes: set[str] = set()
    seen_pairs: set[tuple] = set()
    kept, dropped = [], 0
    for record in records:
        resume_key = record["resume"][:300]
        pair_key = (record["resume"][:300], record["job_description"][:300])
        if pair_key in seen_pairs:
            dropped += 1
            continue
        if resume_key in seen_resumes:
            dropped += 1
            continue
        seen_resumes.add(resume_key)
        seen_pairs.add(pair_key)
        kept.append(record)
    return kept, dropped


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--sample", type=int, default=120, help="rows per class for the SBERT run")
    parser.add_argument("--mpnet", action="store_true", help="also evaluate all-mpnet-base-v2")
    args = parser.parse_args()

    import pandas as pd

    frame = pd.read_csv(SAMPLE)
    records = [
        {"resume": str(r["resume_text"]), "job_description": str(r["job_description_text"]), "label": str(r["label"])}
        for _, r in frame.iterrows()
    ]
    print(f"loaded {len(records)} labelled records: {Counter(r['label'] for r in records)}")

    # stratified downsample keeps every class represented for the SBERT run
    by_class: dict[str, list[dict]] = {}
    for record in records:
        by_class.setdefault(record["label"], []).append(record)
    downsampled = []
    for label, rows in sorted(by_class.items()):
        downsampled.extend(rows[: args.sample])
    print(f"downsampled to {len(downsampled)} rows for the SBERT run")

    # leakage dedupe: identical resumes must not appear in both splits
    downsampled, dropped = dedupe_against_leakage(downsampled)
    print(f"leakage dedupe dropped {dropped} rows -> {len(downsampled)} evaluated")

    print("\n=== TF-IDF (both scoring variants) ===")
    tfidf = evaluate_dataset(downsampled, "traditional", seed=42, split_ratio=0.7)
    for variant, block in tfidf["results"].items():
        m = block["metrics"]
        print(f"[{variant}] accuracy={m['accuracy']:.3f} precision={m['precision_macro']:.3f} "
              f"recall={m['recall_macro']:.3f} F1={m['f1_macro']:.3f} weightedF1={m['f1_weighted']:.3f}")
        print(f"    confusion: {m['confusion_matrix']['labels']} -> {m['confusion_matrix']['matrix']}")

    print("\n=== Sentence-BERT all-MiniLM-L6-v2 (both scoring variants) ===")
    minilm = evaluate_dataset(downsampled, "transformer", seed=42, split_ratio=0.7)
    for variant, block in minilm["results"].items():
        m = block["metrics"]
        print(f"[{variant}] accuracy={m['accuracy']:.3f} precision={m['precision_macro']:.3f} "
              f"recall={m['recall_macro']:.3f} F1={m['f1_macro']:.3f} weightedF1={m['f1_weighted']:.3f}")
        print(f"    confusion: {m['confusion_matrix']['labels']} -> {m['confusion_matrix']['matrix']}")

    report = {
        "dataset": {
            "source": "https://huggingface.co/datasets/cnamuangtoun/resume-job-description-fit",
            "sample_rows": len(downsampled),
            "label_distribution": dict(Counter(r["label"] for r in downsampled)),
        },
        "traditional": tfidf,
        "transformer": minilm,
    }

    if args.mpnet:
        print("\n=== Sentence-BERT all-mpnet-base-v2 (both scoring variants) ===")
        from app.core.config import get_settings
        from app.transformer_nlp.model_manager import reset_model

        get_settings().sbert_model_name = "sentence-transformers/all-mpnet-base-v2"
        reset_model()
        try:
            mpnet = evaluate_dataset(downsampled, "transformer", seed=42, split_ratio=0.7)
        finally:
            reset_model()
            get_settings().sbert_model_name = "sentence-transformers/all-MiniLM-L6-v2"
            reset_model()
        for variant, block in mpnet["results"].items():
            m = block["metrics"]
            print(f"[{variant}] accuracy={m['accuracy']:.3f} precision={m['precision_macro']:.3f} "
                  f"recall={m['recall_macro']:.3f} F1={m['f1_macro']:.3f}")
        report["transformer_mpnet"] = mpnet

    out_dir = ROOT / "datasets" / "experiments"
    out_dir.mkdir(parents=True, exist_ok=True)
    out = out_dir / "experiment_report.json"
    out.write_text(json.dumps(report, indent=2, default=str), encoding="utf-8")
    print(f"\nreport written: {out}")


if __name__ == "__main__":
    main()
