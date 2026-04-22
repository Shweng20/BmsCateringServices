const API_BASE = "https://localhost:7241";
const DASHBOARD_ENDPOINT = `${API_BASE}/api/AdminDashboard`;

let reservations = [];
let filteredReservations = [];
let refreshTimer = null;

// ===== ELEMENTS =====
const totalReservationsEl = document.getElementById("totalReservations");
const pendingReservationsEl = document.getElementById("pendingReservations");
const approvedReservationsEl = document.getElementById("approvedReservations");
const cancelledReservationsEl = document.getElementById("cancelledReservations");
const totalRevenueEl = document.getElementById("totalRevenue");

const logoutBtn = document.getElementById("logoutBtn");

const searchInput = document.getElementById("searchInput");
const statusFilter = document.getElementById("statusFilter");
const reservationTableBody = document.getElementById("reservationTableBody");

const modalBody = document.getElementById("modalBody");
const detailsModal = document.getElementById("detailsModal");

// ===== CHARTS =====
let revenueChart, statusChart, bookingsChart;

// ===== INIT =====
document.addEventListener("DOMContentLoaded", async () => {
  bindEvents();
  await initialLoad();
});

// ===== LOAD =====
async function initialLoad() {
  const success = await loadAnalytics(true);
  if (success) startAutoRefresh();
}

async function loadAnalytics() {
  try {
    const response = await fetch(DASHBOARD_ENDPOINT);

    if (!response.ok) throw new Error("API error");

    const data = await response.json();

    reservations = Array.isArray(data)
      ? data.map(normalizeReservation)
      : [];

    filteredReservations = [...reservations];

    renderStats(reservations);
    renderCharts(reservations);
    renderTable(filteredReservations);

    return true;
  } catch (error) {
    console.error(error);
    renderStats([]);
    renderCharts([]);
    renderTableError("Cannot connect to backend.");
    return false;
  }
}

// ===== AUTO REFRESH =====
function startAutoRefresh() {
  stopAutoRefresh();
  refreshTimer = setInterval(loadAnalytics, 5000);
}

function stopAutoRefresh() {
  if (refreshTimer) clearInterval(refreshTimer);
}

// ===== EVENTS =====
function bindEvents() {
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      localStorage.removeItem("adminUser");
      alert("Logged out successfully.");
      window.location.href = "admin-login.html";
    });
  }

  if (searchInput) searchInput.addEventListener("input", applyFilters);
  if (statusFilter) statusFilter.addEventListener("change", applyFilters);
}

// ===== NORMALIZE =====
function normalizeReservation(item) {
  return {
    reservation_id: item.reservation_id ?? 0,
    full_name: item.full_name || "N/A",
    event_type: item.event_type || "N/A",
    event_date: item.event_date || "",
    venue: item.venue || "N/A",
    total_amount: Number(item.total_amount || 0),
    reservation_status: normalizeStatus(item.reservation_status)
  };
}

function normalizeStatus(status) {
  if (!status) return "Pending";

  const value = status.toLowerCase();
  if (value === "approved") return "Approved";
  if (value === "cancelled" || value === "canceled") return "Cancelled";

  return "Pending";
}

// ===== STATS =====
function renderStats(data) {
  const total = data.length;
  const pending = data.filter(x => x.reservation_status === "Pending").length;
  const approved = data.filter(x => x.reservation_status === "Approved").length;
  const cancelled = data.filter(x => x.reservation_status === "Cancelled").length;

  const revenue = data
    .filter(x => x.reservation_status === "Approved")
    .reduce((sum, x) => sum + x.total_amount, 0);

  totalReservationsEl.textContent = total;
  pendingReservationsEl.textContent = pending;
  approvedReservationsEl.textContent = approved;
  cancelledReservationsEl.textContent = cancelled;
  totalRevenueEl.textContent = formatCurrency(revenue);
}

// ===== CHARTS =====
function renderCharts(data) {
  const monthlyData = getMonthlyData(data);

  // Revenue Chart
  if (revenueChart) revenueChart.destroy();
  revenueChart = new Chart(document.getElementById("revenueChart"), {
    type: "line",
    data: {
      labels: monthlyData.labels,
      datasets: [{
        data: monthlyData.revenue,
        borderColor: "#1aa39a",
        fill: true
      }]
    }
  });

  // Status Chart
  if (statusChart) statusChart.destroy();
  statusChart = new Chart(document.getElementById("statusChart"), {
    type: "pie",
    data: {
      labels: ["Pending", "Approved", "Cancelled"],
      datasets: [{
        data: [
          data.filter(x => x.reservation_status === "Pending").length,
          data.filter(x => x.reservation_status === "Approved").length,
          data.filter(x => x.reservation_status === "Cancelled").length
        ]
      }]
    }
  });

  // Bookings Chart
  if (bookingsChart) bookingsChart.destroy();
  bookingsChart = new Chart(document.getElementById("bookingsChart"), {
    type: "bar",
    data: {
      labels: monthlyData.labels,
      datasets: [{
        data: monthlyData.bookings
      }]
    }
  });
}

// ===== MONTHLY DATA =====
function getMonthlyData(data) {
  const now = new Date();
  const labels = [];
  const revenue = [];
  const bookings = [];

  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;

    labels.push(d.toLocaleDateString("en-US", { month: "short" }));

    revenue.push(
      data
        .filter(x => x.event_date.startsWith(key) && x.reservation_status === "Approved")
        .reduce((sum, x) => sum + x.total_amount, 0)
    );

    bookings.push(
      data.filter(x => x.event_date.startsWith(key)).length
    );
  }

  return { labels, revenue, bookings };
}

// ===== FILTER =====
function applyFilters() {
  const search = searchInput.value.toLowerCase();
  const status = statusFilter.value;

  filteredReservations = reservations.filter(r => {
    const matchSearch =
      r.full_name.toLowerCase().includes(search) ||
      r.event_type.toLowerCase().includes(search) ||
      r.venue.toLowerCase().includes(search);

    const matchStatus =
      status === "all" || r.reservation_status === status;

    return matchSearch && matchStatus;
  });

  renderTable(filteredReservations);
}

// ===== TABLE =====
function renderTable(data) {
  if (!data.length) {
    reservationTableBody.innerHTML =
      `<tr><td colspan="8">No data</td></tr>`;
    return;
  }

  reservationTableBody.innerHTML = data.map(r => `
    <tr>
      <td>#${r.reservation_id}</td>
      <td>${escapeHtml(r.full_name)}</td>
      <td>${escapeHtml(r.event_type)}</td>
      <td>${formatDate(r.event_date)}</td>
      <td>${escapeHtml(r.venue)}</td>
      <td>${formatCurrency(r.total_amount)}</td>
      <td>${r.reservation_status}</td>
      <td>
        <button onclick="viewDetails(${r.reservation_id})">View</button>
      </td>
    </tr>
  `).join("");
}

// ===== VIEW DETAILS =====
function viewDetails(id) {
  const r = reservations.find(x => x.reservation_id === id);
  if (!r) return alert("Not found");

  modalBody.innerHTML = `
    <p><b>Name:</b> ${r.full_name}</p>
    <p><b>Event:</b> ${r.event_type}</p>
    <p><b>Date:</b> ${formatDate(r.event_date)}</p>
    <p><b>Venue:</b> ${r.venue}</p>
    <p><b>Status:</b> ${r.reservation_status}</p>
    <p><b>Total:</b> ${formatCurrency(r.total_amount)}</p>
  `;

  detailsModal.classList.remove("hidden");
}

function closeModal() {
  detailsModal.classList.add("hidden");
}

// ===== UTIL =====
function formatCurrency(amount) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP"
  }).format(amount);
}

function formatDate(dateStr) {
  if (!dateStr) return "N/A";
  const d = new Date(dateStr);
  return isNaN(d) ? dateStr : d.toLocaleDateString();
}

function escapeHtml(text) {
  return text
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;");
}

function renderTableError(msg) {
  reservationTableBody.innerHTML =
    `<tr><td colspan="8">${msg}</td></tr>`;
}