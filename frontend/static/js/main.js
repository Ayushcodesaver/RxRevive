/* RxRevive core: navigation, toast, API helpers. Loaded on every page. */
(function () {
  "use strict";

  window.Rx = {
    /* structured fetch helper */
    api: function (url, options) {
      options = options || {};
      if (options.json) {
        options.headers = Object.assign({ "Content-Type": "application/json" }, options.headers);
        options.body = JSON.stringify(options.json);
        delete options.json;
      }
      return fetch(url, options).then(function (res) {
        return res.json().then(function (body) {
          if (!res.ok) {
            var err = new Error(body.error || "Request failed (" + res.status + ")");
            err.status = res.status;
            throw err;
          }
          return body;
        });
      });
    },

    toast: function (message, kind) {
      var el = document.getElementById("toast");
      if (!el) return;
      el.textContent = message;
      el.className = "toast " + (kind || "");
      el.hidden = false;
      clearTimeout(el._t);
      el._t = setTimeout(function () { el.hidden = true; }, 4000);
    },

    escapeHtml: function (text) {
      var div = document.createElement("div");
      div.textContent = text == null ? "" : String(text);
      return div.innerHTML;
    },

    scoreClass: function (score) {
      if (score == null) return "";
      if (score >= 75) return "high";
      if (score >= 50) return "mid";
      return "low";
    },

    fmtDate: function (iso) {
      try {
        return new Date(iso).toLocaleString(undefined, {
          day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"
        });
      } catch (e) { return iso; }
    },

    modelLabel: function (key) {
      return { traditional: "Traditional NLP", transformer: "Transformer NLP", compare: "Comparison" }[key] || key;
    }
  };

  /* ----- mobile navigation ----- */
  var toggle = document.getElementById("nav-toggle");
  var nav = document.getElementById("site-nav");
  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
  }

  /* ----- dropdowns (click on mobile, hover on desktop via CSS) ----- */
  document.querySelectorAll(".drop-btn").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var group = btn.closest(".nav-group");
      var isOpen = group.classList.toggle("open");
      btn.setAttribute("aria-expanded", isOpen ? "true" : "false");
    });
  });
  document.addEventListener("click", function (event) {
    document.querySelectorAll(".nav-group.open").forEach(function (group) {
      if (!group.contains(event.target)) {
        group.classList.remove("open");
        var btn = group.querySelector(".drop-btn");
        if (btn) btn.setAttribute("aria-expanded", "false");
      }
    });
  });

  /* ----- logout ----- */
  var logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", function () {
      Rx.api("/api/auth/logout", { method: "POST" })
        .then(function () { window.location.href = "/"; })
        .catch(function (err) { Rx.toast(err.message, "error"); });
    });
  }

  /* ----- scroll reveal ----- */
  if ("IntersectionObserver" in window) {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("in");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08 });
    document.querySelectorAll(".section-head, .feature-card, .glass-card, .step-card")
      .forEach(function (el) { el.classList.add("reveal"); observer.observe(el); });
  }
})();
