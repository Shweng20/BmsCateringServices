const API_BASE_URL = "https://localhost:7241/api";

async function parseJsonOrText(response) {
  const rawText = await response.text();
  console.log("Raw response:", rawText);

  try {
    return JSON.parse(rawText);
  } catch {
    return {
      message: "Unexpected server response.",
      raw: rawText
    };
  }
}

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

document.getElementById("signupForm").addEventListener("submit", async function (e) {
  e.preventDefault();

  const messageEl = document.getElementById("signupMessage");
  const emailValue = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();
  const confirmPassword = document.getElementById("confirm_password").value.trim();

  messageEl.className = "login-message";

  if (password !== confirmPassword) {
    messageEl.textContent = "Password and confirm password do not match.";
    messageEl.className = "login-message error";
    return;
  }

  messageEl.textContent = "Creating account...";

  try {
    const response = await fetch(`${API_BASE_URL}/Client/signup`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        full_name: document.getElementById("full_name").value.trim(),
        email: emailValue,
        password: password,
        contact_number: document.getElementById("contact_number").value.trim(),
        address: document.getElementById("address").value.trim()
      })
    });

    const result = await parseJsonOrText(response);

    if (response.ok) {
      messageEl.textContent = result.message || "Signup successful. Please check your email for the verification code.";
      messageEl.className = "login-message success";

      document.getElementById("verifyEmail").value = emailValue;
      document.getElementById("code").value = "";
    } else {
      messageEl.textContent = result.error
        ? `${result.message} (${result.error})`
        : (result.message || "Signup failed.");

      messageEl.className = "login-message error";
      document.getElementById("verifyEmail").value = emailValue;
    }
  } catch (error) {
    console.error("Signup fetch error:", error);
    messageEl.textContent = `Cannot connect to signup API: ${error.message}`;
    messageEl.className = "login-message error";
  }
});

document.getElementById("verifyForm").addEventListener("submit", async function (e) {
  e.preventDefault();

  const messageEl = document.getElementById("verifyMessage");
  const email = document.getElementById("verifyEmail").value.trim();
  const code = document.getElementById("code").value.trim();

  messageEl.textContent = "Verifying email...";
  messageEl.className = "login-message";

  if (!email || !code) {
    messageEl.textContent = "Email and verification code are required.";
    messageEl.className = "login-message error";
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/Client/verify-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email: email,
        code: code
      })
    });

    const result = await parseJsonOrText(response);

    if (response.ok) {
      messageEl.textContent = result.message || "Email verified successfully.";
      messageEl.className = "login-message success";

      setTimeout(() => {
        window.location.href = "login.html";
      }, 1500);
    } else {
      messageEl.textContent = result.error
        ? `${result.message} (${result.error})`
        : (result.message || "Verification failed.");

      messageEl.className = "login-message error";
    }
  } catch (error) {
    console.error("Verify fetch error:", error);
    messageEl.textContent = `Cannot connect to verification API: ${error.message}`;
    messageEl.className = "login-message error";
  }
});

document.getElementById("resendCodeBtn").addEventListener("click", async function () {
  const email = document.getElementById("verifyEmail").value.trim();
  const messageEl = document.getElementById("verifyMessage");

  if (!email) {
    messageEl.textContent = "Enter your email first.";
    messageEl.className = "login-message error";
    return;
  }

  messageEl.textContent = "Sending new code...";
  messageEl.className = "login-message";

  try {
    const response = await fetch(`${API_BASE_URL}/Client/resend-code`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email: email
      })
    });

    const result = await parseJsonOrText(response);

    if (response.ok) {
      messageEl.textContent = result.message || "A new verification code was sent to your email.";
      messageEl.className = "login-message success";
      document.getElementById("code").value = "";
    } else {
      messageEl.textContent = result.error
        ? `${result.message} (${result.error})`
        : (result.message || "Failed to resend code.");

      messageEl.className = "login-message error";
    }
  } catch (error) {
    console.error("Resend fetch error:", error);
    messageEl.textContent = `Cannot connect to resend API: ${error.message}`;
    messageEl.className = "login-message error";
  }
});