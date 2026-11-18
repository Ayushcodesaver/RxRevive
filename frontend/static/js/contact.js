/* Contact form */
(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", function () {
    var form = document.getElementById("contact-form");
    if (!form) return;
    form.addEventListener("submit", function (e) {
      e.preventDefault();

      var name = value("contact-name");
      var email = value("contact-email");
      var subject = value("contact-subject");
      var message = value("contact-message");
      var status = document.getElementById("contact-status");
      var btn = document.getElementById("contact-btn");

      if (name.length < 2) return set("Please enter your name.", true);
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(email)) return set("Please enter a valid email address.", true);
      if (message.length < 10) return set("Please write a message of at least 10 characters.", true);

      btn.disabled = true;
      set("Sending your message…", false);

      Rx.api("/api/contact", {
        method: "POST",
        json: { name: name, email: email, subject: subject, message: message }
      })
        .then(function (data) {
          set(data.message, false);
          form.reset();
          Rx.toast("Message sent. Thank you!", "success");
        })
        .catch(function (err) { set(err.message, true); })
        .finally(function () { btn.disabled = false; });
    });
  });

  function value(id) {
    var el = document.getElementById(id);
    return el ? el.value.trim() : "";
  }

  function set(message, isError) {
    var el = document.getElementById("contact-status");
    if (el) {
      el.textContent = message;
      el.className = isError ? "form-status error" : "form-status";
    }
  }
})();
