/* Comparison dashboard: real experiment data from /api/comparison/data */
(function () {
  "use strict";

  function emptyChart(canvasId, message) {
    var el = document.getElementById(canvasId);
    if (!el) return;
    el.hidden = true;
    var p = document.createElement("p");
    p.className = "muted small";
    p.style.textAlign = "center";
    p.style.padding = "56px 0";
    p.textContent = message;
    el.parentNode.insertBefore(p, el.nextSibling);
  }


  document.addEventListener("DOMContentLoaded", function () {
    Rx.api("/api/comparison/data")
      .then(function (data) { render(data); })
      .catch(function (err) { Rx.toast(err.message, "error"); });
  });

  function render(data) {
    /* labelled evaluation — honest status */
    var ev = data.labelled_evaluation || {};
    var evalEl = document.getElementById("eval-status");
    if (evalEl) {
      if (ev.status === "not_evaluated") {
        evalEl.innerHTML =
          '<span class="status-badge warn">Not evaluated yet</span>' +
          '<p class="muted small" style="margin:0;flex:1;min-width:220px;">' + Rx.escapeHtml(ev.message || "") + "</p>" +
          '<div class="eval-metric"><strong>—</strong><span>Precision</span></div>' +
          '<div class="eval-metric"><strong>—</strong><span>Recall</span></div>' +
          '<div class="eval-metric"><strong>—</strong><span>F1-score</span></div>';
      }
    }

    var experiments = data.experiments || [];
    var countEl = document.getElementById("experiment-count");
    var rowsEl = document.getElementById("experiment-rows");
    var noneEl = document.getElementById("no-experiments");

    if (countEl) countEl.textContent = "(" + experiments.length + ")";
    if (!latest) { emptyChart("compare-bar-chart", "Run a comparison to see its bars here."); emptyChart("time-bar-chart", "Processing times appear after a comparison run."); }
    if (!experiments.length) {
      if (noneEl) noneEl.hidden = false;
      if (rowsEl) rowsEl.innerHTML = "";
      return;
    }

    /* charts: use the most recent experiment */
    var latest = experiments[0];
    if (typeof RxCharts !== "undefined" && latest) {
      RxCharts.bars("compare-bar-chart", {
        labels: ["Traditional NLP", "Transformer NLP"],
        datasets: [{
          label: "Match score (%)",
          data: [latest.traditional_score, latest.transformer_score],
          backgroundColor: ["oklch(44% 0 0)", "oklch(50% 0.095 188)"]
        }]
      });
      RxCharts.bars("time-bar-chart", {
        labels: ["Traditional NLP", "Transformer NLP"],
        datasets: [{
          label: "Processing time (s)",
          data: [latest.traditional_time, latest.transformer_time],
          backgroundColor: ["oklch(65% 0 0)", "oklch(50% 0.095 188)"]
        }]
      }, { suggestedMax: Math.max(latest.traditional_time, latest.transformer_time) * 1.4 || 5 });
    }

    if (rowsEl) {
      rowsEl.innerHTML = experiments.map(function (a) {
        var diff = a.difference;
        var diffText = diff === null || diff === undefined ? "—" :
          '<span class="score-chip ' + (diff > 0 ? "mid" : diff < 0 ? "low" : "high") + '">' +
          (diff > 0 ? "+" : "") + diff + "</span>";
        return "<tr><td>" + Rx.escapeHtml(Rx.fmtDate(a.created_at)) + "</td>" +
          "<td><strong>" + Rx.escapeHtml(a.job_title || "Resume analysis") + "</strong></td>" +
          "<td>" + scoreChip(a.traditional_score) + "</td>" +
          "<td>" + scoreChip(a.transformer_score) + "</td>" +
          "<td>" + diffText + "</td>" +
          "<td>" + (a.traditional_time !== null ? a.traditional_time + "s" : "—") + "</td>" +
          "<td>" + (a.transformer_time !== null ? a.transformer_time + "s" : "—") + "</td>" +
          '<td><a class="icon-btn" href="/results/' + a.id + '" title="View results">' +
          '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></a></td></tr>';
      }).join("");
    }
  }

  function scoreChip(score) {
    if (score === null || score === undefined) return "—";
    return '<span class="score-chip ' + Rx.scoreClass(score) + '">' + Math.round(score) + "%</span>";
  }
})();
