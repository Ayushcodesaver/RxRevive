/* RxRevive chart helpers: Chart.js with the Ink theme, used by several pages. */
(function () {
  "use strict";

  if (typeof Chart === "undefined") return;

  Chart.defaults.color = "oklch(28% 0 0)";
  Chart.defaults.borderColor = "oklch(89% 0.004 100)";
  Chart.defaults.font.family = '"Epilogue", "Segoe UI", system-ui, sans-serif';
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
            backgroundColor: colors || ["oklch(50% 0.095 188)", "oklch(70% 0 0)"],
            borderColor: "oklch(99.5% 0.003 100)",
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
