const API_BASE_URL = "https://localhost:7241/api";

async function parseJsonSafe(response) {
  const rawText = await response.text();
  console.log("Raw response:", rawText);

  if (!rawText) {
    return { message: "Empty server response." };
  }

  try {
    return JSON.parse(rawText);
  } catch (error) {
    console.error("JSON parse error:", error);
    return {
      message: "Unexpected server response.",
      raw: rawText
    };
  }
}

document.addEventListener("DOMContentLoaded", function () {
  const forgotModal = document.getElementById("forgotPasswordModal");
  const openForgotModalBtn = document.getElementById("openForgotModalBtn");
  const closeForgotModalBtn = document.getElementById("closeForgotModalBtn");

  const clientLoginForm = document.getElementById("clientLoginForm");
  const forgotPasswordForm = document.getElementById("forgotPasswordForm");
  const resetPasswordForm = document.getElementById("resetPasswordForm");

  document.querySelectorAll(".toggle-password").forEach(button => {
    button.addEventListener("click", function () {
      const targetId = this.getAttribute("data-target");
      const input = document.getElementById(targetId);

      if (!input) return;

      if (input.type === "password") {
        input.type = "text";
        this.textContent = "Hide";
      } else {
        input.type = "password";
        this.textContent = "Show";
      }
    });
  });

  if (openForgotModalBtn && forgotModal) {
    openForgotModalBtn.addEventListener("click", function () {
      forgotModal.classList.add("show");
    });
  }

  if (closeForgotModalBtn && forgotModal) {
    closeForgotModalBtn.addEventListener("click", function () {
      forgotModal.classList.remove("show");
    });
  }

  if (forgotModal) {
    forgotModal.addEventListener("click", function (e) {
      if (e.target === forgotModal) {
        forgotModal.classList.remove("show");
      }
    });
  }

  if (clientLoginForm) {
    clientLoginForm.addEventListener("submit", async function (e) {
      e.preventDefault();

      const email = document.getElementById("email")?.value.trim() || "";
      const password = document.getElementById("password")?.value.trim() || "";
      const messageEl = document.getElementById("loginMessage");

      if (!messageEl) return;

      messageEl.textContent = "Logging in...";
      messageEl.className = "login-message";

      try {
        const response = await fetch(`${API_BASE_URL}/Client/login`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            email: email,
            password: password
          })
        });

        const result = await parseJsonSafe(response);

        if (response.ok) {
          messageEl.textContent = result.message || "Login successful.";
          messageEl.className = "login-message success";

          localStorage.setItem("clientUser", JSON.stringify(result));

          setTimeout(() => {
            window.location.href = "../index.html";
          }, 1000);
        } else {
          messageEl.textContent = result.message || "Login failed.";
          messageEl.className = "login-message error";
        }
      } catch (error) {
        console.error("Login fetch error:", error);
        messageEl.textContent = `Cannot connect to login API: ${error.message}`;
        messageEl.className = "login-message error";
      }
    });
  }

  if (forgotPasswordForm) {
    forgotPasswordForm.addEventListener("submit", async function (e) {
      e.preventDefault();

      const email = document.getElementById("forgot_email")?.value.trim() || "";
      const messageEl = document.getElementById("forgotMessage");

      if (!messageEl) return;

      messageEl.textContent = "Sending verification code...";
      messageEl.className = "login-message";

      try {
        const response = await fetch(`${API_BASE_URL}/Client/forgot-password`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            email: email
          })
        });

        const result = await parseJsonSafe(response);

        if (response.ok) {
          const resetEmail = document.getElementById("reset_email");
          if (resetEmail) resetEmail.value = email;

          messageEl.textContent = result.message || "Verification code sent.";
          messageEl.className = "login-message success";
        } else {
          messageEl.textContent = result.message || "Failed to send verification code.";
          messageEl.className = "login-message error";
        }
      } catch (error) {
        console.error("Forgot password error:", error);
        messageEl.textContent = `Cannot connect to forgot password API: ${error.message}`;
        messageEl.className = "login-message error";
      }
    });
  }

  if (resetPasswordForm) {
    resetPasswordForm.addEventListener("submit", async function (e) {
      e.preventDefault();

      const email = document.getElementById("reset_email")?.value.trim() || "";
      const code = document.getElementById("reset_code")?.value.trim() || "";
      const newPassword = document.getElementById("new_password")?.value.trim() || "";
      const confirmPassword = document.getElementById("confirm_new_password")?.value.trim() || "";
      const messageEl = document.getElementById("resetMessage");

      if (!messageEl) return;

      if (newPassword !== confirmPassword) {
        messageEl.textContent = "New password and confirm password do not match.";
        messageEl.className = "login-message error";
        return;
      }

      messageEl.textContent = "Resetting password...";
      messageEl.className = "login-message";

      try {
        const response = await fetch(`${API_BASE_URL}/Client/reset-password`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            email: email,
            code: code,
            new_password: newPassword,
            confirm_password: confirmPassword
          })
        });

        const result = await parseJsonSafe(response);

        if (response.ok) {
          messageEl.textContent = result.message || "Password reset successfully.";
          messageEl.className = "login-message success";

          const forgotEmail = document.getElementById("forgot_email");
          const resetEmail = document.getElementById("reset_email");
          const resetCode = document.getElementById("reset_code");
          const newPasswordInput = document.getElementById("new_password");
          const confirmNewPasswordInput = document.getElementById("confirm_new_password");

          if (forgotEmail) forgotEmail.value = "";
          if (resetEmail) resetEmail.value = "";
          if (resetCode) resetCode.value = "";
          if (newPasswordInput) newPasswordInput.value = "";
          if (confirmNewPasswordInput) confirmNewPasswordInput.value = "";

          setTimeout(() => {
            if (forgotModal) {
              forgotModal.classList.remove("show");
            }
          }, 1200);
        } else {
          messageEl.textContent = result.message || "Failed to reset password.";
          messageEl.className = "login-message error";
        }
      } catch (error) {
        console.error("Reset password error:", error);
        messageEl.textContent = `Cannot connect to reset password API: ${error.message}`;
        messageEl.className = "login-message error";
      }
    });
  }
});