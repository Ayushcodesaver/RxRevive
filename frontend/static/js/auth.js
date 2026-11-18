/* Authentication pages: login, register, forgot password */
(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", function () {
    /* password visibility toggles */
    document.querySelectorAll(".pw-toggle").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var input = document.getElementById(btn.dataset.target);
        if (!input) return;
        input.type = input.type === "password" ? "text" : "password";
      });
    });

    var loginForm = document.getElementById("login-form");
    var registerForm = document.getElementById("register-form");
    var forgotForm = document.getElementById("forgot-form");

    if (loginForm) loginForm.addEventListener("submit", function (e) { e.preventDefault(); doLogin(); });
    if (registerForm) registerForm.addEventListener("submit", function (e) { e.preventDefault(); doRegister(); });
    if (forgotForm) forgotForm.addEventListener("submit", function (e) { e.preventDefault(); doForgot(); });
  });

  function doLogin() {
    var email = value("login-email");
    var password = value("login-password");
    if (!email) return setStatus("login-status", "Please enter your email.", true);
    if (!password) return setStatus("login-status", "Please enter your password.", true);

    busy("login-btn", "login-status", "Logging in…", true);
    Rx.api("/api/auth/login", { method: "POST", json: { email: email, password: password } })
      .then(function (data) {
        Rx.toast("Welcome back, " + data.user.name.split(" ")[0] + "!", "success");
        window.location.href = "/dashboard";
      })
      .catch(function (err) {
        busy("login-btn", "login-status", err.message, false);
        setStatus("login-status", err.message, true);
      });
  }

  function doRegister() {
    var name = value("reg-name");
    var email = value("reg-email");
    var password = value("reg-password");
    var password2 = value("reg-password2");

    if (name.length < 2) return setStatus("register-status", "Please enter your full name.", true);
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(email)) return setStatus("register-status", "Please enter a valid email address.", true);
    if (password.length < 8) return setStatus("register-status", "Password must be at least 8 characters long.", true);
    if (!/\d/.test(password) || !/[a-zA-Z]/.test(password)) return setStatus("register-status", "Password must contain both letters and numbers.", true);
    if (password !== password2) return setStatus("register-status", "Passwords do not match.", true);

    busy("register-btn", "register-status", "Creating account…", true);
    Rx.api("/api/auth/register", { method: "POST", json: { name: name, email: email, password: password } })
      .then(function (data) {
        Rx.toast("Account created. Welcome, " + data.user.name.split(" ")[0] + "!", "success");
        window.location.href = "/dashboard";
      })
      .catch(function (err) {
        busy("register-btn", "register-status", "", false);
        setStatus("register-status", err.message, true);
      });
  }

  function doForgot() {
    var email = value("forgot-email");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(email)) return setStatus("forgot-status", "Please enter a valid email address.", true);

    busy("forgot-btn", "forgot-status", "Sending request…", true);
    Rx.api("/api/auth/forgot-password", { method: "POST", json: { email: email } })
      .then(function (data) {
        busy("forgot-btn", "forgot-status", "", false);
        setStatus("forgot-status", data.message, false);
      })
      .catch(function (err) {
        busy("forgot-btn", "forgot-status", "", false);
        setStatus("forgot-status", err.message, true);
      });
  }

  function value(id) {
    var el = document.getElementById(id);
    return el ? el.value.trim() : "";
  }

  function setStatus(id, message, isError) {
    var el = document.getElementById(id);
    if (el) {
      el.textContent = message;
      el.className = isError ? "form-status error" : "form-status";
    }
  }

  function busy(btnId, statusId, message, isBusy) {
    var btn = document.getElementById(btnId);
    if (btn) btn.disabled = isBusy;
    if (statusId && message) setStatus(statusId, message, false);
  }
})();
