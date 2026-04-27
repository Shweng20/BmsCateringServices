const adminUser = getAdminUser();

if (!adminUser) {
  window.location.href = "admin-login.html";
}

function getAdminUser() {
  const raw = localStorage.getItem("adminUser");

  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    localStorage.removeItem("adminUser");
    return null;
  }
}

function setAdminProfile() {
  const admin = getAdminUser();
  if (!admin) return;

  const fullName =
    admin.full_name ||
    admin.fullName ||
    admin.name ||
    admin.username ||
    admin.Username ||
    "Administrator";

  const email =
    admin.email ||
    admin.Email ||
    "BM's Catering";

  document.querySelectorAll(".admin-info strong").forEach(el => {
    el.textContent = fullName;
  });

  document.querySelectorAll(".admin-info span").forEach(el => {
    el.textContent = email;
  });

  document.querySelectorAll(".avatar").forEach(el => {
    el.textContent = fullName.charAt(0).toUpperCase();
  });
}

function setupLogout() {
  const logoutBtn =
    document.querySelector(".logout-btn") ||
    document.getElementById("logoutBtn");

  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      localStorage.removeItem("adminUser");
      localStorage.removeItem("adminToken");
      window.location.href = "admin-login.html";
    });
  }
}

/* AZURE BACKEND URL */
const API_BASE = "https://bmscatering-api.azurewebsites.net";
const API_URL = `${API_BASE}/api/Report/user-reservation-dashboard`;

const tableBody = document.getElementById("clientTableBody");
const searchInput = document.getElementById("clientSearch");

let clientData = [];

document.addEventListener("DOMContentLoaded", () => {
  setAdminProfile();
  setupLogout();
  loadClientDashboard();

  if (searchInput) {
    searchInput.addEventListener("input", () => {
      const searchValue = searchInput.value.toLowerCase().trim();

      const filteredData = clientData.filter(item => {
        const fullName = getValue(item, "full_name", "fullName");
        const email = getValue(item, "email", "Email");

        return (
          String(fullName).toLowerCase().includes(searchValue) ||
          String(email).toLowerCase().includes(searchValue)
        );
      });

      renderTable(filteredData);
    });
  }
});

async function loadClientDashboard() {
  try {
    if (!tableBody) {
      console.error("Table body with ID 'clientTableBody' was not found.");
      return;
    }

    tableBody.innerHTML = `
      <tr>
        <td colspan="8" class="empty-state">Loading client records...</td>
      </tr>
    `;

    const response = await fetch(API_URL, {
      method: "GET",
      headers: {
        "Accept": "application/json"
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status}`);
    }

    const result = await response.json();

    /*
      Supports both response formats:
      1. Direct array:
         [ { ... }, { ... } ]

      2. Wrapped response:
         { success: true, data: [ ... ] }
    */
    if (Array.isArray(result)) {
      clientData = result;
    } else if (Array.isArray(result.data)) {
      clientData = result.data;
    } else {
      clientData = [];
    }

    renderTable(clientData);

  } catch (error) {
    console.error("Failed to load client dashboard:", error);

    if (tableBody) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="8" class="empty-state">
            Failed to load data. Check if API is running or CORS is enabled.
          </td>
        </tr>
      `;
    }
  }
}

function renderTable(data) {
  if (!tableBody) return;

  if (!data || data.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="8" class="empty-state">No client records found.</td>
      </tr>
    `;
    return;
  }

  tableBody.innerHTML = data.map(item => {
    const clientId = getValue(item, "client_id", "clientId", "ClientId", "ClientID");
    const fullName = getValue(item, "full_name", "fullName", "FullName", "name", "Name");
    const email = getValue(item, "email", "Email");
    const registrationDate = getValue(item, "registration_date", "registrationDate", "RegistrationDate");
    const totalReservations = getValue(item, "total_reservations", "totalReservations", "TotalReservations");
    const totalSpent = getValue(item, "total_spent", "totalSpent", "TotalSpent");
    const avgSpending = getValue(item, "avg_spending", "avgSpending", "AvgSpending");
    const latestEvent = getValue(item, "latest_event", "latestEvent", "LatestEvent");

    return `
      <tr>
        <td>${escapeHTML(clientId)}</td>
        <td>${escapeHTML(fullName)}</td>
        <td>${escapeHTML(email)}</td>
        <td>${formatDateTime(registrationDate)}</td>
        <td>${escapeHTML(totalReservations)}</td>
        <td>${formatCurrency(totalSpent)}</td>
        <td>${formatCurrency(avgSpending)}</td>
        <td>${formatDateTime(latestEvent)}</td>
      </tr>
    `;
  }).join("");
}

function getValue(item, ...keys) {
  for (const key of keys) {
    if (item && item[key] !== undefined && item[key] !== null) {
      return item[key];
    }
  }

  return "";
}

function formatDateTime(value) {
  if (!value) return "";

  const date = new Date(value);

  if (isNaN(date.getTime())) {
    return escapeHTML(value);
  }

  return date.toLocaleString("en-PH", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function formatCurrency(value) {
  const num = Number(value);

  if (isNaN(num)) {
    return "₱0.00";
  }

  return num.toLocaleString("en-PH", {
    style: "currency",
    currency: "PHP"
  });
}

function escapeHTML(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}