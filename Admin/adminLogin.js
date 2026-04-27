const API_BASE_URL = "https://bmscatering-api.azurewebsites.net/api";

async function parseJsonSafe(response) {
  const rawText = await response.text();

  if (!rawText) {
    return {
      success: false,
      message: "Empty server response."
    };
  }

  try {
    return JSON.parse(rawText);
  } catch {
    return {
      success: false,
      message: rawText || "Unexpected server response."
    };
  }
}

document.addEventListener("DOMContentLoaded", function () {
  const adminLoginForm = document.getElementById("adminLoginForm");
  const usernameInput = document.getElementById("adminUsername");
  const passwordInput = document.getElementById("adminPassword");
  const messageEl = document.getElementById("adminLoginMessage");

  if (!adminLoginForm) {
    console.error("adminLoginForm was not found.");
    return;
  }

  adminLoginForm.addEventListener("submit", async function (e) {
    e.preventDefault();

    const username = usernameInput?.value.trim();
    const password = passwordInput?.value.trim();

    if (messageEl) {
      messageEl.textContent = "Logging in...";
      messageEl.className = "login-message";
    }

    if (!username || !password) {
      if (messageEl) {
        messageEl.textContent = "Please enter admin username and password.";
        messageEl.className = "login-message error";
      }
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/Admin/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({
          username: username,
          password: password
        })
      });

      const result = await parseJsonSafe(response);

      if (!response.ok) {
        if (messageEl) {
          messageEl.textContent = result.message || "Invalid admin credentials.";
          messageEl.className = "login-message error";
        }

        console.error("Admin login failed:", result);
        return;
      }

      if (result.success === false) {
        if (messageEl) {
          messageEl.textContent = result.message || "Invalid admin credentials.";
          messageEl.className = "login-message error";
        }
        return;
      }

      const adminData =
        result.user ||
        result.admin ||
        result.data ||
        result;

      if (!adminData || Object.keys(adminData).length === 0) {
        if (messageEl) {
          messageEl.textContent = "Admin login succeeded, but no admin data was returned.";
          messageEl.className = "login-message error";
        }
        return;
      }

      localStorage.setItem("adminUser", JSON.stringify(adminData));

      if (result.token) {
        localStorage.setItem("adminToken", result.token);
      }

      if (messageEl) {
        messageEl.textContent = result.message || "Admin login successful.";
        messageEl.className = "login-message success";
      }

      setTimeout(() => {
        window.location.href = "admin-dashboard.html";
      }, 500);

    } catch (error) {
      console.error("Admin login error:", error);

      if (messageEl) {
        messageEl.textContent = "Cannot connect to Admin API.";
        messageEl.className = "login-message error";
      }
    }
  });
});