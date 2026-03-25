const API_BASE_URL = "https://localhost:7241/api";

    async function parseJsonSafe(response) {
      try {
        return await response.json();
      } catch {
        return { message: "Unexpected server response." };
      }
    }

    document.getElementById("adminLoginForm").addEventListener("submit", async function (e) {
      e.preventDefault();

      const username = document.getElementById("adminUsername").value.trim();
      const password = document.getElementById("adminPassword").value.trim();
      const messageEl = document.getElementById("adminLoginMessage");

      messageEl.textContent = "Logging in...";
      messageEl.className = "login-message";

      try {
        const response = await fetch(`${API_BASE_URL}/Admin/login`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            username: username,
            password: password
          })
        });

        const result = await parseJsonSafe(response);

        if (response.ok) {
          messageEl.textContent = result.message || "Admin login successful.";
          messageEl.className = "login-message success";

          if (result.token) {
            localStorage.setItem("adminToken", result.token);
          }

          if (result.user) {
            localStorage.setItem("adminUser", JSON.stringify(result.user));
          }

          setTimeout(() => {
            window.location.href = "index.html";
          }, 1000);
        } else {
          messageEl.textContent = result.message || "Invalid admin credentials.";
          messageEl.className = "login-message error";
        }
      } catch (error) {
        console.error(error);
        messageEl.textContent = "Cannot connect to Admin API.";
        messageEl.className = "login-message error";
      }
    });