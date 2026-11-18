"""RxRevive — Intelligent Resume and Job Description Matching System.

Run the full application with:  python run.py
"""
from backend.app import create_app

app = create_app()

if __name__ == "__main__":
    print("\n  RxRevive · Intelligent Resume and Job Description Matching System")
    print("  Running at http://127.0.0.1:5000\n")
    app.run(debug=True, port=5000)
