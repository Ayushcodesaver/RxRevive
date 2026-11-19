"""Skill taxonomy tests: boundaries, symbols, synonyms, categories."""

from app.shared.skill_taxonomy import all_skills, identify_skills, skill_category


def test_word_boundaries():
    skills = identify_skills("I use Java and JavaScript daily")["skills"]
    assert "java" in skills and "javascript" in skills


def test_technical_symbols():
    skills = identify_skills("Wrote C++ and C# services on .NET")["skills"]
    assert {"c++", "c#", ".net"} <= skills


def test_synonym_mapping():
    skills = identify_skills("Built models with sklearn and deployed on k8s")["skills"]
    assert "scikit-learn" in skills and "kubernetes" in skills


def test_categories_grouping():
    result = identify_skills("Python, pandas, docker, leadership")
    assert "python" in result["by_category"]["Programming Languages"]
    assert "docker" in result["by_category"]["Cloud & DevOps"]
    assert "leadership" in result["soft"]


def test_no_false_positive_inside_words():
    skills = identify_skills("The majestic goander bird")["skills"]
    assert "go" not in skills


def test_taxonomy_size():
    assert len(all_skills()) >= 150


def test_category_lookup():
    assert skill_category("python") == "Programming Languages"
    assert skill_category("nonexistent-skill") == "Other"
