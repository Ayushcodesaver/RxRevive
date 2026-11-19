/* Dashboard: real stats from /api/dashboard/stats */
(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", function () {
    if (typeof RxCharts !== "undefined") {} // charts loaded below

    Rx.api("/api/dashboard/stats")
      .then(function (stats) { render(stats); })
      .catch(function (err) { Rx.toast(err.message, "error"); });
  });

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

  function render(stats) {
    setText("stat-total", stats.total_analyses);
    var avg = null;
    var avgs = [stats.avg_traditional_score, stats.avg_transformer_score].filter(function (v) { return v !== null; });
    if (avgs.length) {
      avg = Math.round(avgs.reduce(function (a, b) { return a + b; }, 0) / avgs.length * 10) / 10;
    }
    setText("stat-avg", avg === null ? "Not yet" : avg + "%");
    setText("stat-trad", stats.traditional_usage);
    setText("stat-trans", stats.transformer_usage);

    if (typeof RxCharts !== "undefined") {
      if (stats.traditional_usage || stats.transformer_usage) {
        RxCharts.doughnut("usage-doughnut", ["Traditional runs", "Transformer runs"],
          [stats.traditional_usage, stats.transformer_usage], ["oklch(44% 0 0)", "oklch(50% 0.095 188)"]);
      } else {
        emptyChart("usage-doughnut", "No analyses yet; engine usage appears after your first run.");
      }

      var hist = stats.history || [];
      var labels = hist.map(function (a, i) { return "#" + (i + 1); });
      var trad = hist.map(function (a) { return a.traditional_score; });
      var trans = hist.map(function (a) { return a.transformer_score; });
      if (hist.length) {
        RxCharts.line("performance-chart", labels, [
          { label: "Traditional NLP", data: trad, borderColor: "oklch(44% 0 0)", backgroundColor: "oklch(44% 0 0)", spanGaps: true },
          { label: "Transformer NLP", data: trans, borderColor: "oklch(50% 0.095 188)", backgroundColor: "oklch(50% 0.095 188)", spanGaps: true }
        ]);
      } else {
        emptyChart("performance-chart", "Scores appear here as analyses accumulate.");
      }

      var dist = stats.score_distribution || {};
      if (Object.keys(dist).length) {
        RxCharts.bars("distribution-chart", {
          labels: Object.keys(dist),
          datasets: [{ label: "Scores", data: Object.values(dist), backgroundColor: "oklch(50% 0.095 188)" }]
        }, { suggestedMax: undefined });
      } else {
        emptyChart("distribution-chart", "The distribution fills in as scores are stored.");
      }
    }

    var tbody = document.getElementById("recent-rows");
    var noneEl = document.getElementById("no-recent");
    var recent = stats.recent_analyses || [];
    if (!recent.length) {
      if (tbody) tbody.innerHTML = "";
      if (noneEl) noneEl.hidden = false;
      return;
    }
    if (tbody) {
      tbody.innerHTML = recent.map(function (a) {
        var scores = [];
        if (a.traditional_score !== null && a.traditional_score !== undefined) {
          scores.push('<span class="score-chip ' + Rx.scoreClass(a.traditional_score) + '">' + Math.round(a.traditional_score) + '%</span>');
        }
        if (a.transformer_score !== null && a.transformer_score !== undefined) {
          scores.push('<span class="score-chip ' + Rx.scoreClass(a.transformer_score) + '">' + Math.round(a.transformer_score) + '%</span>');
        }
        var label = a.job_title || a.resume_filename || "Resume analysis";
        return "<tr><td>" + Rx.escapeHtml(Rx.fmtDate(a.created_at)) + "</td>" +
          "<td><strong>" + Rx.escapeHtml(label) + "</strong></td>" +
          "<td>" + Rx.escapeHtml(a.company || "—") + "</td>" +
          "<td>" + Rx.escapeHtml(Rx.modelLabel(a.model)) + "</td>" +
          "<td>" + (scores.join(" ") || "—") + "</td>" +
          '<td class="actions"><a class="icon-btn" href="/results/' + a.id + '" title="View results">' +
          '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></a>' +
          '<a class="icon-btn" href="/reports/' + a.id + '/download" title="Download PDF">' +
          '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg></a>' +
          "</td></tr>";
      }).join("");
    }
  }

  function setText(id, value) {
    var el = document.getElementById(id);
    if (el) el.textContent = value;
  }
})();
