const API_URL = "https://localhost:7241/api/Report/user-reservation-dashboard";

const tableBody = document.getElementById("clientTableBody");
const searchInput = document.getElementById("clientSearch");

let clientData = [];

document.addEventListener("DOMContentLoaded", () => {
  loadClientDashboard();

  searchInput.addEventListener("input", () => {
    const searchValue = searchInput.value.toLowerCase().trim();

    const filteredData = clientData.filter(item => {
      const fullName = getValue(item, "full_name", "fullName");
      const email = getValue(item, "email", "email");

      return (
        fullName.toLowerCase().includes(searchValue) ||
        email.toLowerCase().includes(searchValue)
      );
    });

    renderTable(filteredData);
  });
});

async function loadClientDashboard() {
  try {
    const response = await fetch(API_URL);

    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status}`);
    }

    clientData = await response.json();
    renderTable(clientData);

  } catch (error) {
    console.error("Failed to load client dashboard:", error);

    tableBody.innerHTML = `
      <tr>
        <td colspan="8" class="empty-state">
          Failed to load data. Check if API is running.
        </td>
      </tr>
    `;
  }
}

function renderTable(data) {
  if (!data || data.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="8" class="empty-state">No client records found.</td>
      </tr>
    `;
    return;
  }

  tableBody.innerHTML = data.map(item => {
    const clientId = getValue(item, "client_id", "clientId");
    const fullName = getValue(item, "full_name", "fullName");
    const email = getValue(item, "email", "email");
    const registrationDate = getValue(item, "registration_date", "registrationDate");
    const totalReservations = getValue(item, "total_reservations", "totalReservations");
    const totalSpent = getValue(item, "total_spent", "totalSpent");
    const avgSpending = getValue(item, "avg_spending", "avgSpending");
    const latestEvent = getValue(item, "latest_event", "latestEvent");

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

function getValue(item, snakeKey, camelKey) {
  return item[snakeKey] ?? item[camelKey] ?? "";
}

function formatDateTime(value) {
  if (!value) return "";

  const date = new Date(value);
  if (isNaN(date.getTime())) return escapeHTML(value);

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

  if (isNaN(num)) return "₱0.00";

  return num.toLocaleString("en-PH", {
    style: "currency",
    currency: "PHP"
  });
}

function escapeHTML(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}