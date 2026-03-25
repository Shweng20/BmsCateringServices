const API_BASE_URL = "https://localhost:7241/api";
    let currentClient = null;

    function getStoredClient() {
      const raw = localStorage.getItem("clientUser");
      if (!raw) return null;

      try {
        return JSON.parse(raw);
      } catch {
        return null;
      }
    }

    function setAvatar(name) {
      const avatar = document.getElementById("profileAvatar");
      avatar.textContent = name && name.trim() ? name.trim().charAt(0).toUpperCase() : "U";
    }

    async function parseJsonSafe(response) {
      const rawText = await response.text();
      console.log("Profile raw response:", rawText);

      if (!rawText) {
        return { message: "Empty server response." };
      }

      try {
        return JSON.parse(rawText);
      } catch {
        return { message: "Unexpected server response.", raw: rawText };
      }
    }

    function fillForm(client) {
      document.getElementById("clientIdText").textContent = client.client_id ?? "—";
      document.getElementById("full_name").value = client.full_name ?? "";
      document.getElementById("email").value = client.email ?? "";
      document.getElementById("contact_number").value = client.contact_number ?? "";
      document.getElementById("address").value = client.address ?? "";
      setAvatar(client.full_name ?? "U");
    }

    async function loadProfile() {
      const messageEl = document.getElementById("profileMessage");
      const storedClient = getStoredClient();

      if (!storedClient || !storedClient.client_id) {
        window.location.href = "login.html";
        return;
      }

      messageEl.textContent = "Loading profile...";
      messageEl.className = "profile-message";

      try {
        const response = await fetch(`${API_BASE_URL}/Client/${storedClient.client_id}`);
        const result = await parseJsonSafe(response);

        if (response.ok) {
          currentClient = result;
          fillForm(result);
          localStorage.setItem("clientUser", JSON.stringify(result));
          messageEl.textContent = "Profile loaded.";
          messageEl.className = "profile-message success";
        } else {
          messageEl.textContent = result.message || "Failed to load profile.";
          messageEl.className = "profile-message error";
        }
      } catch (error) {
        console.error(error);
        messageEl.textContent = `Cannot connect to profile API: ${error.message}`;
        messageEl.className = "profile-message error";
      }
    }

    document.querySelectorAll(".toggle-password").forEach(button => {
      button.addEventListener("click", function () {
        const targetId = this.getAttribute("data-target");
        const input = document.getElementById(targetId);

        if (input.type === "password") {
          input.type = "text";
          this.textContent = "Hide";
        } else {
          input.type = "password";
          this.textContent = "Show";
        }
      });
    });

    document.getElementById("refreshBtn").addEventListener("click", loadProfile);

    document.getElementById("logoutBtn").addEventListener("click", function () {
      localStorage.removeItem("clientUser");
      localStorage.removeItem("clientToken");
      window.location.href = "login.html";
    });

    document.getElementById("profileForm").addEventListener("submit", async function (e) {
      e.preventDefault();

      const messageEl = document.getElementById("profileMessage");
      const storedClient = getStoredClient();

      if (!storedClient || !storedClient.client_id) {
        window.location.href = "login.html";
        return;
      }

      const payload = {
        client_id: storedClient.client_id,
        full_name: document.getElementById("full_name").value.trim(),
        email: document.getElementById("email").value.trim(),
        password: currentClient?.password ?? "",
        contact_number: document.getElementById("contact_number").value.trim(),
        address: document.getElementById("address").value.trim(),
        registration_date: currentClient?.registration_date ?? null,
        is_deleted: currentClient?.is_deleted ?? false,
        email_verification_code: currentClient?.email_verification_code ?? null,
        is_email_verified: currentClient?.is_email_verified ?? true,
        password_change_code: currentClient?.password_change_code ?? null,
        pending_new_password: currentClient?.pending_new_password ?? null,
        password_change_requested_at: currentClient?.password_change_requested_at ?? null
      };

      messageEl.textContent = "Saving changes...";
      messageEl.className = "profile-message";

      try {
        const response = await fetch(`${API_BASE_URL}/Client`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(payload)
        });

        const result = await parseJsonSafe(response);

        if (response.ok) {
          currentClient = { ...currentClient, ...payload };
          localStorage.setItem("clientUser", JSON.stringify(currentClient));
          setAvatar(payload.full_name);
          messageEl.textContent =
            result.message === "Empty server response."
              ? "Profile updated successfully."
              : (result.message || "Profile updated successfully.");
          messageEl.className = "profile-message success";
        } else {
          messageEl.textContent = result.message || "Failed to update profile.";
          messageEl.className = "profile-message error";
        }
      } catch (error) {
        console.error(error);
        messageEl.textContent = `Cannot connect to update API: ${error.message}`;
        messageEl.className = "profile-message error";
      }
    });

    document.getElementById("requestPasswordChangeForm").addEventListener("submit", async function (e) {
      e.preventDefault();

      const storedClient = getStoredClient();
      const messageEl = document.getElementById("passwordRequestMessage");

      if (!storedClient || !storedClient.client_id) {
        window.location.href = "login.html";
        return;
      }

      const currentPassword = document.getElementById("current_password").value.trim();
      const newPassword = document.getElementById("new_password").value.trim();
      const confirmPassword = document.getElementById("confirm_new_password").value.trim();

      if (newPassword !== confirmPassword) {
        messageEl.textContent = "New password and confirm password do not match.";
        messageEl.className = "profile-message error";
        return;
      }

      messageEl.textContent = "Sending verification code...";
      messageEl.className = "profile-message";

      try {
        const response = await fetch(`${API_BASE_URL}/Client/request-change-password`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            client_id: storedClient.client_id,
            current_password: currentPassword,  
            new_password: newPassword,
            confirm_password: confirmPassword
          })
        });

        const result = await parseJsonSafe(response);

        if (response.ok) {
          messageEl.textContent = result.message || "Verification code sent to your email.";
          messageEl.className = "profile-message success";
        } else {
          messageEl.textContent = result.message || "Failed to send verification code.";
          messageEl.className = "profile-message error";
        }
      } catch (error) {
        console.error("Request password change error:", error);
        messageEl.textContent = `Cannot connect to password request API: ${error.message}`;
        messageEl.className = "profile-message error";
      }
    });

    document.getElementById("confirmPasswordChangeForm").addEventListener("submit", async function (e) {
      e.preventDefault();

      const storedClient = getStoredClient();
      const messageEl = document.getElementById("passwordConfirmMessage");

      if (!storedClient || !storedClient.client_id) {
        window.location.href = "login.html";
        return;
      }

      const code = document.getElementById("password_change_code").value.trim();

      messageEl.textContent = "Confirming password change...";
      messageEl.className = "profile-message";

      try {
        const response = await fetch(`${API_BASE_URL}/Client/confirm-change-password`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            client_id: storedClient.client_id,
            code: code
          })
        });

        const result = await parseJsonSafe(response);

        if (response.ok) {
          if (currentClient) {
            currentClient.password = document.getElementById("new_password").value.trim();
            currentClient.password_change_code = null;
            currentClient.pending_new_password = null;
            currentClient.password_change_requested_at = null;
            localStorage.setItem("clientUser", JSON.stringify(currentClient));
          }

          document.getElementById("current_password").value = "";
          document.getElementById("new_password").value = "";
          document.getElementById("confirm_new_password").value = "";
          document.getElementById("password_change_code").value = "";

          messageEl.textContent = result.message || "Password changed successfully.";
          messageEl.className = "profile-message success";
        } else {
          messageEl.textContent = result.message || "Failed to confirm password change.";
          messageEl.className = "profile-message error";
        }
      } catch (error) {
        console.error("Confirm password change error:", error);
        messageEl.textContent = `Cannot connect to password confirm API: ${error.message}`;
        messageEl.className = "profile-message error";
      }
    });

    loadProfile();