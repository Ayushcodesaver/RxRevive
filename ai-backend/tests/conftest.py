"""Shared pytest fixtures: FastAPI TestClient and sample documents."""

import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import pytest
from fastapi.testclient import TestClient

from app.main import create_app

SAMPLE_RESUME = """PRIYA SHARMA
Data Scientist | Machine Learning | NLP
Bengaluru, India | priya.sharma@example.com

SUMMARY
Data scientist with 3 years of experience building machine learning and
natural language processing solutions for healthcare and e-commerce products.

EXPERIENCE
Data Scientist, MedAnalytics Pvt Ltd (2022 - Present)
- Built NLP models to classify clinical notes, improving triage speed by 30%
- Developed machine learning pipelines with scikit-learn and pandas
- Deployed models as REST APIs using Flask and Docker on AWS

SKILLS
Python, SQL, machine learning, deep learning, NLP, scikit-learn, pandas,
numpy, tensorflow, statistics, matplotlib, Power BI, Flask, Docker, AWS, Git

EDUCATION
B.Tech in Computer Science, VTU Bengaluru (2020)
"""

SAMPLE_JD = """Job Description: Data Scientist (NLP)

Company: HealthTrack Technologies
Location: Bengaluru (Hybrid)

We are looking for a data scientist to join our NLP team and build
intelligent text analytics for digital health products.

Requirements
- 2+ years of experience in data science or machine learning
- Strong Python skills with pandas, numpy and scikit-learn
- Hands-on experience with NLP: natural language processing, text
  classification, embeddings
- Experience with TensorFlow or Pytorch
- Familiarity with Docker, AWS and REST APIs
- Good communication and teamwork
"""


@pytest.fixture(scope="session")
def client():
    # auth disabled for the test run (default in the absence of Clerk config)
    os.environ.setdefault("AUTH_DISABLED", "true")
    app = create_app()
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture(scope="session")
def sample_texts():
    return {"resume": SAMPLE_RESUME, "jd": SAMPLE_JD}
