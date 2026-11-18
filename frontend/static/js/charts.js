/* RxRevive chart helpers — Chart.js with the dark theme, used by several pages. */
(function () {
  "use strict";

  if (typeof Chart === "undefined") return;

  Chart.defaults.color = "#9aa7b4";
  Chart.defaults.borderColor = "rgba(255,255,255,0.09)";
  Chart.defaults.font.family = '"Inter", "Segoe UI", system-ui, sans-serif';
  Chart.defaults.plugins.legend.labels.boxWidth = 12;

  window.RxCharts = {
    doughnut: function (canvasId, labels, data, colors) {
      var el = document.getElementById(canvasId);
      if (!el) return;
      new Chart(el, {
        type: "doughnut",
        data: {
          labels: labels,
          datasets: [{
            data: data,
            backgroundColor: colors || ["#14b8a6", "#f59e0b"],
            borderColor: "rgba(11,15,20,0.9)",
            borderWidth: 2
          }]
        },
        options: {
          responsive: true,
          cutout: "62%",
          plugins: { legend: { position: "bottom" } }
        }
      });
    },

    bars: function (canvasId, data, opts) {
      var el = document.getElementById(canvasId);
      if (!el) return;
      opts = opts || {};
      new Chart(el, {
        type: "bar",
        data: data,
        options: {
          responsive: true,
          indexAxis: opts.indexAxis || "x",
          scales: { y: { beginAtZero: true, suggestedMax: opts.suggestedMax || 100 } },
          plugins: { legend: { display: data.datasets.length > 1 } }
        }
      });
    },

    line: function (canvasId, labels, datasets) {
      var el = document.getElementById(canvasId);
      if (!el) return;
      new Chart(el, {
        type: "line",
        data: { labels: labels, datasets: datasets },
        options: {
          responsive: true,
          scales: { y: { beginAtZero: true, suggestedMax: 100 } },
          plugins: { legend: { position: "bottom" } },
          tension: 0.3
        }
      });
    }
  };
})();
