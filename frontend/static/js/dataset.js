/* Dataset upload page */
(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", function () {
    var btn = document.getElementById("dataset-upload-btn");
    var fileInput = document.getElementById("dataset-file");
    var status = document.getElementById("dataset-status");
    var resultBox = document.getElementById("dataset-result");
    var resultText = document.getElementById("dataset-result-text");
    if (!btn) return;

    btn.addEventListener("click", function () {
      if (!fileInput.files.length) {
        set("Choose a CSV file first.", true);
        return;
      }
      var file = fileInput.files[0];
      if (!file.name.toLowerCase().endsWith(".csv")) {
        set("Only .csv files are accepted for dataset experiments.", true);
        return;
      }
      btn.disabled = true;
      set("Validating and storing dataset…", false);

      var data = new FormData();
      data.append("dataset_file", file);
      Rx.api("/api/dataset/upload", { method: "POST", body: data })
        .then(function (body) {
          set(body.message, false);
          resultBox.hidden = false;
          resultText.textContent =
            "Rows: " + body.rows + "\nColumns: " + body.columns.join(", ") + "\n\n" + body.note;
          Rx.toast("Dataset stored.", "success");
        })
        .catch(function (err) { set(err.message, true); })
        .finally(function () { btn.disabled = false; });
    });
  });

  function set(message, isError) {
    var el = document.getElementById("dataset-status");
    if (el) {
      el.textContent = message;
      el.className = isError ? "form-status error" : "form-status";
    }
  }
})();
