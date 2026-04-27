const API_BASE_URL = "https://bmscatering-api.azurewebsites.net/api";

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
      success: false,
      message: rawText || "Unexpected server response.",
      raw: rawText
    };
  }
}

document.addEventListener("DOMContentLoaded", function () {
  const loginForm = document.getElementById("clientLoginForm");
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");
  const loginMessage = document.getElementById("loginMessage");

  const forgotPasswordModal = document.getElementById("forgotPasswordModal");
  const openForgotModalBtn = document.getElementById("openForgotModalBtn");
  const closeForgotModalBtn = document.getElementById("closeForgotModalBtn");

  const forgotPasswordForm = document.getElementById("forgotPasswordForm");
  const forgotEmailInput = document.getElementById("forgot_email");
  const forgotMessage = document.getElementById("forgotMessage");

  const resetPasswordForm = document.getElementById("resetPasswordForm");
  const resetEmailInput = document.getElementById("reset_email");
  const resetCodeInput = document.getElementById("reset_code");
  const newPasswordInput = document.getElementById("new_password");
  const confirmNewPasswordInput = document.getElementById("confirm_new_password");
  const resetMessage = document.getElementById("resetMessage");

  function showMessage(element, message, isSuccess = false) {
    if (!element) return;
    element.textContent = message;
    element.style.color = isSuccess ? "green" : "red";
  }

  document.querySelectorAll(".toggle-password").forEach(button => {
    button.addEventListener("click", function () {
      const targetId = this.getAttribute("data-target");
      const targetInput = document.getElementById(targetId);

      if (!targetInput) return;

      if (targetInput.type === "password") {
        targetInput.type = "text";
        this.textContent = "Hide";
      } else {
        targetInput.type = "password";
        this.textContent = "Show";
      }
    });
  });

  if (loginForm) {
    loginForm.addEventListener("submit", async function (e) {
      e.preventDefault();

      const email = emailInput?.value.trim();
      const password = passwordInput?.value.trim();

      showMessage(loginMessage, "");

      if (!email || !password) {
        showMessage(loginMessage, "Please enter your email and password.");
        return;
      }

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

        if (!response.ok) {
          showMessage(loginMessage, result.message || "Login failed.");
          console.error("Login failed:", result);
          return;
        }

        if (!result.success) {
          if (result.requiresVerification) {
            showMessage(loginMessage, result.message || "Account requires verification.");
            return;
          }

          showMessage(loginMessage, result.message || "Login failed.");
          return;
        }

        if (result.client) {
          localStorage.setItem("clientUser", JSON.stringify(result.client));
          localStorage.setItem("clientId", result.client.client_id);
        }

        showMessage(loginMessage, result.message || "Login successful.", true);

        setTimeout(() => {
          window.location.href = "../index.html";
        }, 1000);

      } catch (error) {
        console.error("Fetch/Login error:", error);
        showMessage(loginMessage, "Unable to connect to the server.");
      }
    });
  }

  if (openForgotModalBtn && forgotPasswordModal) {
    openForgotModalBtn.addEventListener("click", function () {
      forgotPasswordModal.classList.add("show");
    });
  }

  if (closeForgotModalBtn && forgotPasswordModal) {
    closeForgotModalBtn.addEventListener("click", function () {
      forgotPasswordModal.classList.remove("show");
    });
  }

  window.addEventListener("click", function (e) {
    if (e.target === forgotPasswordModal) {
      forgotPasswordModal.classList.remove("show");
    }
  });

  if (forgotPasswordForm) {
    forgotPasswordForm.addEventListener("submit", async function (e) {
      e.preventDefault();

      const email = forgotEmailInput?.value.trim();
      showMessage(forgotMessage, "");

      if (!email) {
        showMessage(forgotMessage, "Please enter your email.");
        return;
      }

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

        if (!response.ok) {
          showMessage(forgotMessage, result.message || "Failed to send verification code.");
          return;
        }

        showMessage(forgotMessage, result.message || "Verification code sent.", true);

        if (resetEmailInput) {
          resetEmailInput.value = email;
        }
      } catch (error) {
        console.error("Forgot password error:", error);
        showMessage(forgotMessage, "Unable to connect to the server.");
      }
    });
  }

  if (resetPasswordForm) {
    resetPasswordForm.addEventListener("submit", async function (e) {
      e.preventDefault();

      const email = resetEmailInput?.value.trim();
      const code = resetCodeInput?.value.trim();
      const newPassword = newPasswordInput?.value.trim();
      const confirmPassword = confirmNewPasswordInput?.value.trim();

      showMessage(resetMessage, "");

      if (!email || !code || !newPassword || !confirmPassword) {
        showMessage(resetMessage, "Please fill in all fields.");
        return;
      }

      if (newPassword !== confirmPassword) {
        showMessage(resetMessage, "Passwords do not match.");
        return;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/Client/reset-password`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            email: email,
            code: code,
            newPassword: newPassword
          })
        });

        const result = await parseJsonSafe(response);

        if (!response.ok) {
          showMessage(resetMessage, result.message || "Password reset failed.");
          return;
        }

        if (!result.success) {
          showMessage(resetMessage, result.message || "Password reset failed.");
          return;
        }

        showMessage(resetMessage, result.message || "Password reset successful.", true);

        setTimeout(() => {
          if (forgotPasswordModal) {
            forgotPasswordModal.classList.remove("show");
          }

          resetPasswordForm.reset();

          if (forgotPasswordForm) {
            forgotPasswordForm.reset();
          }
        }, 1200);

      } catch (error) {
        console.error("Reset password error:", error);
        showMessage(resetMessage, "Unable to connect to the server.");
      }
    });
  }
});