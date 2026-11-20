"""API endpoint tests through the FastAPI TestClient (auth disabled mode)."""

import io

import pytest


def test_health(client):
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    assert body["data"]["engines"]["traditional"] == "ready"


def test_skills_endpoint(client):
    response = client.get("/api/v1/skills")
    body = response.json()
    assert body["data"]["total"] >= 150
    assert "Programming Languages" in body["data"]["categories"]


def test_analyze_traditional(client, sample_texts):
    response = client.post("/api/v1/analyze/traditional", json={
        "resume_text": sample_texts["resume"],
        "job_description": sample_texts["jd"],
        "job_title": "Data Scientist",
    })
    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    assert body["data"]["traditional"]["match_percentage"] >= 0
    assert body["metadata"]["processing_time_ms"] is not None


def test_analyze_rejects_short_input(client):
    response = client.post("/api/v1/analyze/traditional", json={"resume_text": "hi", "job_description": "there"})
    assert response.status_code == 422


def test_analyze_compare(client, sample_texts):
    response = client.post("/api/v1/analyze/compare", json={
        "resume_text": sample_texts["resume"], "job_description": sample_texts["jd"],
    })
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["traditional"] and data["transformer"]
    assert data["difference_points"] is not None


def test_resume_extract_txt(client):
    content = ("Priya Sharma\nData scientist with five years of experience in machine "
               "learning and natural language processing pipelines.\n")
    response = client.post("/api/v1/resumes/extract", files={
        "resume_file": ("resume.txt", io.BytesIO(content.encode()), "text/plain"),
    })
    assert response.status_code == 200
    assert response.json()["data"]["chars"] >= 40


def test_resume_extract_rejects_bad_type(client):
    response = client.post("/api/v1/resumes/extract", files={
        "resume_file": ("virus.exe", io.BytesIO(b"MZ"), "application/octet-stream"),
    })
    assert response.status_code == 422


def test_report_generate_and_download(client, sample_texts):
    analyze = client.post("/api/v1/analyze/traditional", json={
        "resume_text": sample_texts["resume"], "job_description": sample_texts["jd"],
    }).json()["data"]
    payload = {"traditional": analyze["traditional"]}
    response = client.post("/api/v1/reports/generate", json={
        "analysis_id": "test-run-001", "model_key": "traditional",
        "job_title": "Data Scientist", "company": "HealthTrack", "payload": payload,
    })
    assert response.status_code == 200
    filename = response.json()["data"]["filename"]
    download = client.get(f"/api/v1/reports/download/{filename}")
    assert download.status_code == 200
    assert download.content.startswith(b"%PDF")


def test_report_download_blocks_traversal(client):
    response = client.get("/api/v1/reports/download/..%2F..%2Fapp%2Fmain.py")
    assert response.status_code in (404, 400)


def test_evaluation_run_tfidf(client):
    rows = ["resume,job_description,label"]
    for i in range(5):
        rows.append(f"python machine learning engineer {i} with scikit-learn pandas numpy tensorflow docker aws experience,data scientist position requiring python machine learning scikit-learn pandas docker and aws deployment {i},Good Fit")
    for i in range(5):
        rows.append(f"photographer building a branding illustration portfolio with photoshop figma typography {i},nurse practitioner position in the cardiac ward with patient care and scheduling duties {i},No Fit")
    response = client.post("/api/v1/evaluation/run", json={"dataset_content": "\n".join(rows), "engines": ["traditional"]})
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["results"]["traditional"]["results"]["similarity"]["metrics"]["accuracy"] >= 0.5
    assert data["queued"] is False
