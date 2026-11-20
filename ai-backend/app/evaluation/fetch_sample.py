"""Fetch a stratified sample from the public Resume-Job Fit dataset (HF).

Source: cnamuangtoun/resume-job-description-fit (Hugging Face, public).
Only real rows are used — labels are never invented. The script records the
source, the fetch strategy and the quality audit next to the data.
"""

import csv
import json
import pathlib
import random
import urllib.request
from collections import Counter

DATASET = "cnamuangtoun/resume-job-description-fit"
TARGET_PER_CLASS = 150
OUT = pathlib.Path(__file__).resolve().parents[3] / "datasets" / "raw" / "resume_job_fit_sample.csv"

LABELS = ["Good Fit", "Potential Fit", "No Fit"]
PAGES = [0, 100, 300, 500]  # offsets within each label's filtered rows


def fetch_page(offset: int, length: int = 100, label: str | None = None) -> list[dict]:
    """Fetch rows, optionally filtered by label (datasets-server /filter)."""
    url = (
        "https://datasets-server.huggingface.co/rows"
        f"?dataset={DATASET.replace('/', '%2F')}&config=default&split=train"
        f"&offset={offset}&length={length}"
    )
    request = urllib.request.Request(url)
    with urllib.request.urlopen(request, timeout=60) as response:
        payload = json.load(response)
    return [row["row"] for row in payload.get("rows", [])]


def main() -> None:
    rng = random.Random(42)
    collected: list[dict] = []
    seen_keys: set[tuple] = set()
    duplicates = 0

    # paginate the whole train split; stop early once every class is full
    offset = 0
    label_counts: Counter = Counter()
    while offset < 6300 and all(label_counts[l] >= TARGET_PER_CLASS for l in LABELS) is False:
        try:
            rows = fetch_page(offset)
        except Exception as exc:  # noqa: BLE001 - report and continue with what we have
            print(f"page {offset} failed: {exc}")
            offset += 100
            continue
        for row in rows:
            resume = (row.get("resume_text") or "").strip()
            jd = (row.get("job_description_text") or "").strip()
            label = (row.get("label") or "").strip()
            key = (resume[:300], jd[:300])
            if key in seen_keys:
                duplicates += 1
                continue
            seen_keys.add(key)
            collected.append({"resume_text": resume, "job_description_text": jd, "label": label})
            if label in LABELS:
                label_counts[label] += 1
        offset += 100
        print(f"offset {offset}: scanned {len(collected)}, {dict(label_counts)}")

    # quality filter: both texts present and substantial
    usable = [r for r in collected if len(r["resume_text"]) >= 60 and len(r["job_description_text"]) >= 60]
    dropped_short = len(collected) - len(usable)

    # stratified sample
    by_label: dict[str, list[dict]] = {}
    for row in usable:
        by_label.setdefault(row["label"], []).append(row)
    sample = []
    for label, rows in sorted(by_label.items()):
        rng.shuffle(rows)
        take = rows[:TARGET_PER_CLASS]
        sample.extend(take)

    rng.shuffle(sample)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    with open(OUT, "w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=["resume_text", "job_description_text", "label"])
        writer.writeheader()
        writer.writerows(sample)

    # ---- audit ----
    print("== dataset audit ==")
    print(f"source: {DATASET} (train split, {PAGES} pages sampled)")
    print(f"rows scanned: {len(collected)} | duplicates skipped: {duplicates} | too-short dropped: {dropped_short}")
    print(f"sample written: {len(sample)} rows -> {OUT}")
    print("label distribution:", dict(Counter(r['label'] for r in sample)))
    lens = sorted(len(r["resume_text"]) for r in sample)
    print(f"resume chars: min {lens[0]}, median {lens[len(lens)//2]}, max {lens[-1]}")
    # label consistency probe: identical JD text carrying different labels?
    jd_labels: dict[str, set] = {}
    for row in usable:
        jd_labels.setdefault(row["job_description_text"][:300], set()).add(row["label"])
    conflicts = sum(1 for labels in jd_labels.values() if len(labels) > 1)
    print(f"unique JDs: {len(jd_labels)} | JDs with conflicting labels: {conflicts}")
    # leakage probe: identical resume text appearing twice in the sample
    resume_counts = Counter(r["resume_text"][:300] for r in sample)
    leaked = sum(1 for c in resume_counts.values() if c > 1)
    print(f"sample-internal duplicate resumes: {leaked}")
    meta = {
        "source": f"https://huggingface.co/datasets/{DATASET}",
        "license": "see dataset card",
        "rows_scanned": len(collected),
        "duplicates_skipped": duplicates,
        "sample_size": len(sample),
        "label_distribution": dict(Counter(r["label"] for r in sample)),
        "seed": 42,
    }
    with open(str(OUT).replace(".csv", ".meta.json"), "w", encoding="utf-8") as handle:
        json.dump(meta, handle, indent=2)
    print("meta written")


if __name__ == "__main__":
    main()
