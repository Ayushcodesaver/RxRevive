/* Analyzer logic — shared by analyze.html, traditional.html and transformer.html. */
(function () {
  "use strict";

  var dropzone = document.getElementById("dropzone");
  var fileInput = document.getElementById("resume-file");
  var resumeText = document.getElementById("resume-text");
  var jdText = document.getElementById("jd-text");
  var jobTitle = document.getElementById("job-title");
  var company = document.getElementById("company");
  var loadSampleBtn = document.getElementById("load-sample");
  var analyzeBtn = document.getElementById("analyze-btn");
  var formStatus = document.getElementById("form-status");
  var progressTrack = document.getElementById("progress-track");
  var previewBox = document.getElementById("extraction-preview");
  var previewText = document.getElementById("preview-text");
  var previewMeta = document.getElementById("preview-meta");

  var extracted = null; // {filename, text} once a file has been parsed

  function selectedModel() {
    var checked = document.querySelector('input[name="model"]:checked');
    return checked ? checked.value : (document.querySelector('input[name="model"][type="hidden"]') || {}).value || "traditional";
  }

  /* ---------- dropzone / file input ---------- */
  if (dropzone && fileInput) {
    dropzone.addEventListener("click", function () { fileInput.click(); });
    dropzone.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fileInput.click(); }
    });
    ["dragenter", "dragover"].forEach(function (evt) {
      dropzone.addEventListener(evt, function (e) { e.preventDefault(); dropzone.classList.add("dragover"); });
    });
    ["dragleave", "drop"].forEach(function (evt) {
      dropzone.addEventListener(evt, function (e) { e.preventDefault(); dropzone.classList.remove("dragover"); });
    });
    dropzone.addEventListener("drop", function (e) {
      if (e.dataTransfer.files.length) {
        fileInput.files = e.dataTransfer.files;
        handleFile(fileInput.files[0]);
      }
    });
    fileInput.addEventListener("change", function () {
      if (fileInput.files.length) handleFile(fileInput.files[0]);
    });
  }

  function handleFile(file) {
    var allowed = [".pdf", ".docx", ".txt"];
    var dot = file.name.lastIndexOf(".");
    var ext = dot >= 0 ? file.name.slice(dot).toLowerCase() : "";
    if (allowed.indexOf(ext) === -1) {
      setStatus("Unsupported file type “" + ext + "”. Please upload a PDF, DOCX or TXT file.", true);
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setStatus("File too large (maximum 8 MB).", true);
      return;
    }
    setStatus("Extracting text from " + file.name + "…");
    var data = new FormData();
    data.append("resume_file", file);
    Rx.api("/api/resume/upload", { method: "POST", body: data })
      .then(function (body) {
        extracted = { filename: body.filename, text: body.text };
        resumeText.value = body.text;
        previewBox.hidden = false;
        previewText.textContent = body.preview;
        previewMeta.textContent = "(" + body.filename + ", " + body.chars + " characters)";
        setStatus("Resume text extracted successfully. Add the job description and analyze.", false);
      })
      .catch(function (err) {
        extracted = null;
        setStatus(err.message, true);
      });
  }

  /* ---------- sample loader ---------- */
  if (loadSampleBtn) {
    loadSampleBtn.addEventListener("click", function () {
      setStatus("Loading sample resume and job description…");
      Rx.api("/api/sample")
        .then(function (data) {
          resumeText.value = data.resume;
          jdText.value = data.jd;
          if (jobTitle) jobTitle.value = data.job_title || "";
          if (company) company.value = data.company || "";
          extracted = { filename: "sample_resume.txt", text: data.resume };
          previewBox.hidden = false;
          previewText.textContent = data.resume.slice(0, 1500);
          previewMeta.textContent = "(sample, " + data.resume.length + " characters)";
          setStatus("Sample data loaded — press Analyze Match.");
        })
        .catch(function (err) { setStatus(err.message, true); });
    });
  }

  /* ---------- analyze ---------- */
  if (analyzeBtn) {
    analyzeBtn.addEventListener("click", function () {
      var text = resumeText.value.trim();
      var jd = jdText.value.trim();
      if (text.length < 80) {
        setStatus("Please upload a resume file or paste the resume text (at least 80 characters).", true);
        return;
      }
      if (jd.length < 80) {
        setStatus("Please paste the full job description (at least 80 characters).", true);
        return;
      }

      var model = selectedModel();
      analyzeBtn.disabled = true;
      progressTrack.hidden = false;
      setStatus(model === "compare"
        ? "Running both engines on identical inputs…"
        : "Running the " + Rx.modelLabel(model) + " engine…");

      var data = new FormData();
      if (fileInput && fileInput.files.length) {
        // Prefer the original file: the backend re-extracts it server-side.
        data.append("resume_file", fileInput.files[0]);
      } else {
        data.append("resume_text", text);
      }
      data.append("jd_text", jd);
      if (jobTitle) data.append("job_title", jobTitle.value.trim());
      if (company) data.append("company", company.value.trim());
      data.append("model", model);

      Rx.api("/api/analyze/" + model, { method: "POST", body: data })
        .then(function (body) {
          setStatus("Analysis complete — opening results…");
          window.location.href = "/results/" + body.id;
        })
        .catch(function (err) {
          progressTrack.hidden = true;
          analyzeBtn.disabled = false;
          setStatus(err.message, true);
        });
    });
  }

  function setStatus(message, isError) {
    if (!formStatus) return;
    formStatus.textContent = message;
    formStatus.className = isError ? "form-status error" : "form-status";
  }
})();
