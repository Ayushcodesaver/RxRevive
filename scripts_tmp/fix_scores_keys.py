import pathlib

p = pathlib.Path(r"C:\Users\sharm\Downloads\NLPPROJECT\ai-backend\app\evaluation\evaluate.py")
s = p.read_text(encoding="utf-8")

old = '''    scores = {"similarity_train": [], "similarity_test": [],
              "final_train": [], "final_test": []}
    for split_name, split in (("train", train), ("test", test)):
        for record in split:
            resume_skills = identify_skills(record["resume"])["skills"]
            jd_skills = identify_skills(record["job_description"])["skills"]
            computed = _documents_score(record["resume"], record["job_description"],
                                        resume_skills, jd_skills, engine)
            scores[f"{split_name}_similarity"].append(computed["similarity"])
            scores[f"{split_name}_final"].append(computed["final"])'''

new = '''    scores = {"similarity": {"train": [], "test": []}, "final": {"train": [], "test": []}}
    for split_name, split in (("train", train), ("test", test)):
        for record in split:
            resume_skills = identify_skills(record["resume"])["skills"]
            jd_skills = identify_skills(record["job_description"])["skills"]
            computed = _documents_score(record["resume"], record["job_description"],
                                        resume_skills, jd_skills, engine)
            scores["similarity"][split_name].append(computed["similarity"])
            scores["final"][split_name].append(computed["final"])'''

assert old in s, "scores init block not found"
s = s.replace(old, new)

old2 = '''        all_scores = scores[f"{variant}_train"] + scores[f"{variant}_test"]
        preds, threshold_config = _predict_classes(
            scores[f"{variant}_train"], train_labels,
            scores[f"{variant}_test"], class_order,
        )'''

new2 = '''        all_scores = scores[variant]["train"] + scores[variant]["test"]
        preds, threshold_config = _predict_classes(
            scores[variant]["train"], train_labels,
            scores[variant]["test"], class_order,
        )'''

assert old2 in s, "variant usage block not found"
s = s.replace(old2, new2)

p.write_text(s, encoding="utf-8")
print("score keys fixed")
