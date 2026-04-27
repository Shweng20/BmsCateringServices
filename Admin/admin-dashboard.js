const adminUser = getAdminUser();

if (!adminUser || Object.keys(adminUser).length === 0) {
  localStorage.removeItem("adminUser");
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

  document.querySelectorAll(".admin-chip strong").forEach(el => {
    el.textContent = fullName;
  });

  document.querySelectorAll(".admin-chip span").forEach(el => {
    el.textContent = email;
  });

  document.querySelectorAll(".avatar").forEach(el => {
    el.textContent = fullName.charAt(0).toUpperCase();
  });
}

function setupLogout() {
  const logoutBtn = document.querySelector(".logout-btn");

  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      localStorage.removeItem("adminUser");
      localStorage.removeItem("adminToken");
      window.location.href = "admin-login.html";
    });
  }
}

const API_BASE = "https://bmscatering-api.azurewebsites.net/swagger";
const DASHBOARD_ENDPOINT = `${API_BASE}/api/AdminDashboard`;
const REPORT_API = `${API_BASE}/api/Report`;

let reservations = [];

let revenueChart = null;
let statusChart = null;
let monthlyBookingsChart = null;

const totalReservationsEl = document.getElementById("totalReservations");
const pendingReservationsEl = document.getElementById("pendingReservations");
const approvedReservationsEl = document.getElementById("approvedReservations");
const cancelledReservationsEl = document.getElementById("cancelledReservations");
const totalRevenueEl = document.getElementById("totalRevenue");

const totalExpenseEl = document.getElementById("totalExpense");
const hostAvailableEl = document.getElementById("hostAvailable");
const availedHostEl = document.getElementById("availedHost");
const totalDecorationUsedEl = document.getElementById("totalDecorationUsed");

document.addEventListener("DOMContentLoaded", async () => {
  setAdminProfile();
  setupLogout();

  await loadAll();
  setInterval(loadAll, 5000);
});

async function loadAll() {
  await Promise.all([
    loadDashboardAnalytics(),
    loadReportCards()
  ]);
}

async function fetchJson(url) {
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json"
    }
  });

  if (!response.ok) {
    throw new Error(`HTTP Error: ${response.status}`);
  }

  return await response.json();
}

async function loadDashboardAnalytics() {
  try {
    const data = await fetchJson(DASHBOARD_ENDPOINT);
    reservations = Array.isArray(data) ? data : [];

    const total = reservations.length;

    const pending = reservations.filter(r =>
      normalizeStatus(getValue(r, "reservation_status", "reservationStatus")) === "pending"
    ).length;

    const approved = reservations.filter(r =>
      normalizeStatus(getValue(r, "reservation_status", "reservationStatus")) === "approved"
    ).length;

    const cancelled = reservations.filter(r =>
      normalizeStatus(getValue(r, "reservation_status", "reservationStatus")) === "cancelled"
    ).length;

    if (totalReservationsEl) totalReservationsEl.textContent = total;
    if (pendingReservationsEl) pendingReservationsEl.textContent = pending;
    if (approvedReservationsEl) approvedReservationsEl.textContent = approved;
    if (cancelledReservationsEl) cancelledReservationsEl.textContent = cancelled;

    renderCharts(reservations);

  } catch (error) {
    console.error("Dashboard analytics error:", error);
  }
}

async function loadReportCards() {
  try {
    const [
      totalRevenue,
      totalExpense,
      hostAvailability,
      totalDecorationUsed,
      serviceUsage
    ] = await Promise.all([
      fetchJson(`${REPORT_API}/total-revenue-all-reservations`),
      fetchJson(`${REPORT_API}/total-expense`),
      fetchJson(`${REPORT_API}/host-availability`),
      fetchJson(`${REPORT_API}/total-decoration-used`),
      fetchJson(`${REPORT_API}/service-usage-frequency`)
    ]);

    const totalRevenueValue =
      totalRevenue.total_revenue ??
      totalRevenue.totalRevenue ??
      totalRevenue.TotalRevenue ??
      totalRevenue.Total_Revenue ??
      0;

    const totalExpenseValue =
      totalExpense.total_expenses ??
      totalExpense.totalExpenses ??
      totalExpense.TotalExpenses ??
      totalExpense.Total_Expenses ??
      0;

    const hostAvailableValue =
      hostAvailability.host_available ??
      hostAvailability.hostAvailable ??
      hostAvailability.HostAvailable ??
      hostAvailability.Host_Available ??
      0;

    const availedHostValue =
      hostAvailability.availed_host ??
      hostAvailability.availedHost ??
      hostAvailability.AvailedHost ??
      hostAvailability.Availed_Host ??
      0;

    const decorationUsedValue =
      totalDecorationUsed.total_decorations_used ??
      totalDecorationUsed.totalDecorationsUsed ??
      totalDecorationUsed.TotalDecorationsUsed ??
      totalDecorationUsed.Total_Decorations_Used ??
      0;

    if (totalRevenueEl) totalRevenueEl.textContent = formatCurrency(totalRevenueValue);
    if (totalExpenseEl) totalExpenseEl.textContent = formatCurrency(totalExpenseValue);
    if (hostAvailableEl) hostAvailableEl.textContent = hostAvailableValue;
    if (availedHostEl) availedHostEl.textContent = availedHostValue;
    if (totalDecorationUsedEl) totalDecorationUsedEl.textContent = decorationUsedValue;

    renderServiceUsage(serviceUsage);

  } catch (error) {
    console.error("Reports error:", error);
  }
}

function renderServiceUsage(data) {
  const body = document.getElementById("serviceUsageBody");
  if (!body) return;

  console.log("SERVICE USAGE API RESULT:", data);

  const rows = Array.isArray(data)
    ? data
    : data?.data || data?.result || data?.serviceUsage || [];

  if (!rows || rows.length === 0) {
    body.innerHTML = `
      <tr>
        <td colspan="2" class="empty-state">No service usage records found.</td>
      </tr>
    `;
    return;
  }

  body.innerHTML = rows.map(item => {
    const serviceName = getFlexibleValue(item, [
      "service_name",
      "Service_Name",
      "serviceName",
      "ServiceName",
      "SERVICE_NAME",
      "service",
      "name"
    ]);

    const usageCount = getFlexibleValue(item, [
      "usage_count",
      "Usage_Count",
      "usageCount",
      "UsageCount",
      "USAGE_COUNT",
      "count"
    ]);

    return `
      <tr>
        <td>${escapeHTML(serviceName || "Unnamed Service")}</td>
        <td>${escapeHTML(usageCount ?? 0)}</td>
      </tr>
    `;
  }).join("");
}

function getFlexibleValue(obj, keys) {
  if (!obj) return "";

  for (const key of keys) {
    if (obj[key] !== undefined && obj[key] !== null) {
      return obj[key];
    }
  }

  const normalizedMap = {};

  Object.keys(obj).forEach(originalKey => {
    const normalizedKey = originalKey
      .toLowerCase()
      .replaceAll("_", "")
      .replaceAll(" ", "");

    normalizedMap[normalizedKey] = obj[originalKey];
  });
  

  for (const key of keys) {
    const normalizedKey = key
      .toLowerCase()
      .replaceAll("_", "")
      .replaceAll(" ", "");

    if (normalizedMap[normalizedKey] !== undefined && normalizedMap[normalizedKey] !== null) {
      return normalizedMap[normalizedKey];
    }
  }

  return "";
}

function renderCharts(data) {
  renderRevenueTrendChart(data);
  renderReservationStatusChart(data);
  renderMonthlyBookingsChart(data);
}

function renderRevenueTrendChart(data) {
  const canvas = document.getElementById("revenueChart");
  if (!canvas) return;

  const monthlyRevenue = getMonthlyRevenue(data);
  const labels = Object.keys(monthlyRevenue);
  const values = Object.values(monthlyRevenue);

  if (revenueChart) revenueChart.destroy();

  revenueChart = new Chart(canvas, {
    type: "line",
    data: {
      labels,
      datasets: [{
        label: "Revenue",
        data: values,
        borderWidth: 3,
        tension: 0.4,
        fill: false
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true
        }
      },
      scales: {
        y: {
          beginAtZero: true
        }
      }
    }
  });
}

function renderReservationStatusChart(data) {
  const canvas = document.getElementById("statusChart");
  if (!canvas) return;

  const pending = data.filter(r =>
    normalizeStatus(getValue(r, "reservation_status", "reservationStatus")) === "pending"
  ).length;

  const approved = data.filter(r =>
    normalizeStatus(getValue(r, "reservation_status", "reservationStatus")) === "approved"
  ).length;

  const cancelled = data.filter(r =>
    normalizeStatus(getValue(r, "reservation_status", "reservationStatus")) === "cancelled"
  ).length;

  if (statusChart) statusChart.destroy();

  statusChart = new Chart(canvas, {
    type: "doughnut",
    data: {
      labels: ["Pending", "Approved", "Cancelled"],
      datasets: [{
        data: [pending, approved, cancelled]
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "top"
        }
      }
    }
  });
}

function renderMonthlyBookingsChart(data) {
  const canvas = document.getElementById("monthlyBookingsChart");
  if (!canvas) return;

  const monthlyBookings = getMonthlyBookings(data);
  const labels = Object.keys(monthlyBookings);
  const values = Object.values(monthlyBookings);

  if (monthlyBookingsChart) monthlyBookingsChart.destroy();

  monthlyBookingsChart = new Chart(canvas, {
    type: "bar",
    data: {
      labels,
      datasets: [{
        label: "Bookings",
        data: values
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            precision: 0
          }
        }
      }
    }
  });
}

function getMonthlyRevenue(data) {
  const months = getDefaultMonths();

  data.forEach(item => {
    const status = normalizeStatus(getValue(item, "reservation_status", "reservationStatus"));
    const dateValue = getValue(item, "event_date", "eventDate");
    const amount = Number(getValue(item, "total_amount", "totalAmount") || 0);

    if (status !== "approved") return;
    if (!dateValue) return;

    const date = new Date(dateValue);
    if (isNaN(date.getTime())) return;

    const month = date.toLocaleString("en-PH", { month: "short" });

    if (months[month] !== undefined) {
      months[month] += amount;
    }
  });

  return months;
}

function getMonthlyBookings(data) {
  const months = getDefaultMonths();

  data.forEach(item => {
    const dateValue = getValue(item, "event_date", "eventDate");
    if (!dateValue) return;

    const date = new Date(dateValue);
    if (isNaN(date.getTime())) return;

    const month = date.toLocaleString("en-PH", { month: "short" });

    if (months[month] !== undefined) {
      months[month] += 1;
    }
  });

  return months;
}

function getDefaultMonths() {
  return {
    Jan: 0,
    Feb: 0,
    Mar: 0,
    Apr: 0,
    May: 0,
    Jun: 0,
    Jul: 0,
    Aug: 0,
    Sep: 0,
    Oct: 0,
    Nov: 0,
    Dec: 0
  };
}

function getValue(item, snakeKey, camelKey) {
  return item?.[snakeKey] ?? item?.[camelKey] ?? "";
}

function normalizeStatus(value) {
  return String(value || "").trim().toLowerCase();
}

function formatCurrency(value) {
  const numberValue = Number(value);

  if (isNaN(numberValue)) return "₱0.00";

  return numberValue.toLocaleString("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2
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