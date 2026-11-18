/* Reports page: list with search + filters, view, PDF download, delete */
(function () {
  "use strict";

  var rowsEl, noneEl;
  var state = { q: "", model: "", min: null, max: null };

  document.addEventListener("DOMContentLoaded", function () {
    rowsEl = document.getElementById("reports-rows");
    noneEl = document.getElementById("no-reports");

    var qEl = document.getElementById("filter-q");
    var modelEl = document.getElementById("filter-model");
    var minEl = document.getElementById("filter-min");
    var maxEl = document.getElementById("filter-max");

    var debounced = debounce(load, 300);
    qEl.addEventListener("input", function () { state.q = qEl.value.trim(); debounced(); });
    modelEl.addEventListener("change", function () { state.model = modelEl.value; load(); });
    minEl.addEventListener("input", function () { state.min = minEl.value === "" ? null : Number(minEl.value); debounced(); });
    maxEl.addEventListener("input", function () { state.max = maxEl.value === "" ? null : Number(maxEl.value); debounced(); });
    document.getElementById("filter-clear").addEventListener("click", function () {
      qEl.value = modelEl.value = minEl.value = maxEl.value = "";
      state = { q: "", model: "", min: null, max: null };
      load();
    });

    load();
  });

  function load() {
    var params = new URLSearchParams();
    if (state.q) params.set("q", state.q);
    if (state.model) params.set("model", state.model);
    if (state.min !== null) params.set("min_score", state.min);
    if (state.max !== null) params.set("max_score", state.max);
    rowsEl.innerHTML = '<tr><td colspan="7" class="muted">Loading…</td></tr>';

    Rx.api("/api/reports?" + params.toString())
      .then(function (data) { render(data.reports || []); })
      .catch(function (err) {
        rowsEl.innerHTML = '<tr><td colspan="7" class="muted">' + Rx.escapeHtml(err.message) + "</td></tr>";
      });
  }

  function render(reports) {
    if (!reports.length) {
      rowsEl.innerHTML = "";
      noneEl.hidden = false;
      return;
    }
    noneEl.hidden = true;
    rowsEl.innerHTML = reports.map(function (r) {
      var label = r.job_title || r.resume_filename || "Resume analysis";
      return "<tr>" +
        "<td>" + Rx.escapeHtml(Rx.fmtDate(r.created_at)) + "</td>" +
        "<td><strong>" + Rx.escapeHtml(label) + "</strong>" +
        (r.company ? '<br><span class="muted small">' + Rx.escapeHtml(r.company) + "</span>" : "") + "</td>" +
        "<td>" + Rx.escapeHtml(Rx.modelLabel(r.model)) + "</td>" +
        "<td>" + scoreChip(r.traditional_score) + "</td>" +
        "<td>" + scoreChip(r.transformer_score) + "</td>" +
        '<td><span class="chip matched">' + r.matched_count + "</span> " +
        '<span class="chip missing">' + r.missing_count + "</span></td>" +
        '<td class="actions">' +
        '<a class="icon-btn" href="/results/' + r.id + '" title="View detailed report">' +
        '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></a>' +
        '<a class="icon-btn" href="/reports/' + r.id + '/download" title="Download PDF">' +
        '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg></a>' +
        '<button class="icon-btn danger" data-delete="' + r.id + '" title="Delete report">' +
        '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>' +
        "</td></tr>";
    }).join("");

    rowsEl.querySelectorAll("[data-delete]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        if (!window.confirm("Delete this report permanently?")) return;
        Rx.api("/api/reports/" + btn.dataset.delete, { method: "DELETE" })
          .then(function () { Rx.toast("Report deleted.", "success"); load(); })
          .catch(function (err) { Rx.toast(err.message, "error"); });
      });
    });
  }

  function scoreChip(score) {
    if (score === null || score === undefined) return "—";
    return '<span class="score-chip ' + Rx.scoreClass(score) + '">' + Math.round(score) + "%</span>";
  }

  function debounce(fn, ms) {
    var t;
    return function () { clearTimeout(t); t = setTimeout(fn, ms); };
  }
})();
