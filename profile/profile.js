const API_BASE_URL = "https://localhost:7241/api";
const LOGIN_PAGE = "../UserLogin/login.html";

let currentClient = null;

function getStoredClient() {
  const raw = localStorage.getItem("clientUser");
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    localStorage.removeItem("clientUser");
    return null;
  }
}

function setAvatar(name) {
  const avatar = document.getElementById("profileAvatar");
  if (!avatar) return;

  avatar.textContent = name && name.trim()
    ? name.trim().charAt(0).toUpperCase()
    : "U";
}

async function parseJsonSafe(response) {
  const rawText = await response.text();

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
  if (!client) return;

  document.getElementById("clientIdText").textContent = client.client_id ?? client.clientId ?? "—";
  document.getElementById("full_name").value = client.full_name ?? client.fullName ?? "";
  document.getElementById("email").value = client.email ?? "";
  document.getElementById("contact_number").value = client.contact_number ?? client.contactNumber ?? "";
  document.getElementById("address").value = client.address ?? "";

  setAvatar(client.full_name ?? client.fullName ?? "U");
}

async function loadProfile() {
  const messageEl = document.getElementById("profileMessage");
  const storedClient = getStoredClient();

  const clientId = storedClient?.client_id ?? storedClient?.clientId;

  if (!storedClient || !clientId) {
    window.location.href = LOGIN_PAGE;
    return;
  }

  messageEl.textContent = "Loading profile...";
  messageEl.className = "profile-message";

  try {
    const response = await fetch(`${API_BASE_URL}/Client/${clientId}`);
    const result = await parseJsonSafe(response);

    if (response.ok && result.client) {
      currentClient = result.client;
      fillForm(result.client);
      localStorage.setItem("clientUser", JSON.stringify(result.client));

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

const refreshBtn = document.getElementById("refreshBtn");
if (refreshBtn) {
  refreshBtn.addEventListener("click", loadProfile);
}

const logoutBtn = document.getElementById("logoutBtn");
if (logoutBtn) {
  logoutBtn.addEventListener("click", function () {
    localStorage.removeItem("clientUser");
    localStorage.removeItem("clientToken");
    window.location.href = LOGIN_PAGE;
  });
}

const profileForm = document.getElementById("profileForm");
if (profileForm) {
  profileForm.addEventListener("submit", async function (e) {
    e.preventDefault();

    const messageEl = document.getElementById("profileMessage");
    const storedClient = getStoredClient();

    const clientId = storedClient?.client_id ?? storedClient?.clientId;

    if (!storedClient || !clientId) {
      window.location.href = LOGIN_PAGE;
      return;
    }

    const payload = {
      fullName: document.getElementById("full_name").value.trim(),
      email: document.getElementById("email").value.trim(),
      contactNumber: document.getElementById("contact_number").value.trim(),
      address: document.getElementById("address").value.trim()
    };

    messageEl.textContent = "Saving changes...";
    messageEl.className = "profile-message";

    try {
      const response = await fetch(`${API_BASE_URL}/Client/${clientId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const result = await parseJsonSafe(response);

      if (response.ok && result.client) {
        currentClient = result.client;
        localStorage.setItem("clientUser", JSON.stringify(result.client));
        fillForm(result.client);

        messageEl.textContent = result.message || "Profile updated successfully.";
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
}

const requestPasswordChangeForm = document.getElementById("requestPasswordChangeForm");
if (requestPasswordChangeForm) {
  requestPasswordChangeForm.addEventListener("submit", async function (e) {
    e.preventDefault();

    const storedClient = getStoredClient();
    const messageEl = document.getElementById("passwordRequestMessage");

    const clientId = storedClient?.client_id ?? storedClient?.clientId;

    if (!storedClient || !clientId) {
      window.location.href = LOGIN_PAGE;
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
          client_id: clientId,
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
}

const confirmPasswordChangeForm = document.getElementById("confirmPasswordChangeForm");
if (confirmPasswordChangeForm) {
  confirmPasswordChangeForm.addEventListener("submit", async function (e) {
    e.preventDefault();

    const storedClient = getStoredClient();
    const messageEl = document.getElementById("passwordConfirmMessage");

    const clientId = storedClient?.client_id ?? storedClient?.clientId;

    if (!storedClient || !clientId) {
      window.location.href = LOGIN_PAGE;
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
          client_id: clientId,
          code: code
        })
      });

      const result = await parseJsonSafe(response);

      if (response.ok) {
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
}

loadProfile();