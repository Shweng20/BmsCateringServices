const API_BASE = "https://localhost:7241";
const DASHBOARD_ENDPOINT = `${API_BASE}/api/AdminDashboard`;

let reservations = [];
let refreshTimer = null;
let apiOnline = false;

const totalReservationsEl = document.getElementById("totalReservations");
const pendingReservationsEl = document.getElementById("pendingReservations");
const approvedReservationsEl = document.getElementById("approvedReservations");
const cancelledReservationsEl = document.getElementById("cancelledReservations");
const totalRevenueEl = document.getElementById("totalRevenue");

const logoutBtn = document.getElementById("logoutBtn");

let revenueChart, statusChart, bookingsChart;

document.addEventListener("DOMContentLoaded", async () => {
  bindEvents();
  await initialLoad();
});

async function initialLoad() {
  const success = await loadAnalytics(true);

  if (success) {
    startAutoRefresh();
  }
}

function bindEvents() {
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      localStorage.removeItem("adminUser");
      alert("Logged out successfully.");
      window.location.href = "admin-login.html";
    });
  }
}

async function loadAnalytics(showLoading = true) {
  try {
    const response = await fetch(DASHBOARD_ENDPOINT, {
      method: "GET",
      headers: {
        "Content-Type": "application/json"
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to load dashboard data. Status: ${response.status}. ${errorText}`);
    }

    const data = await response.json();

    reservations = Array.isArray(data)
      ? data.map(normalizeReservation)
      : [];

    apiOnline = true;
    renderStats(reservations);
    renderCharts(reservations);

    return true;
  } catch (error) {
    console.error("loadAnalytics error:", error);

    apiOnline = false;
    reservations = [];

    renderStats([]);
    renderCharts([]);

    return false;
  }
}

function startAutoRefresh() {
  stopAutoRefresh();

  refreshTimer = setInterval(async () => {
    await loadAnalytics(false);
  }, 5000);
}

function stopAutoRefresh() {
  if (refreshTimer) {
    clearInterval(refreshTimer);
    refreshTimer = null;
  }
}

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

  const value = String(status).trim().toLowerCase();

  if (value === "approved") return "Approved";
  if (value === "cancelled" || value === "canceled") return "Cancelled";
  return "Pending";
}

function renderStats(data) {
  const total = data.length;
  const pending = data.filter(item => item.reservation_status === "Pending").length;
  const approved = data.filter(item => item.reservation_status === "Approved").length;
  const cancelled = data.filter(item => item.reservation_status === "Cancelled").length;

  const revenue = data
    .filter(item => item.reservation_status === "Approved")
    .reduce((sum, item) => sum + Number(item.total_amount || 0), 0);

  if (totalReservationsEl) totalReservationsEl.textContent = total;
  if (pendingReservationsEl) pendingReservationsEl.textContent = pending;
  if (approvedReservationsEl) approvedReservationsEl.textContent = approved;
  if (cancelledReservationsEl) cancelledReservationsEl.textContent = cancelled;
  if (totalRevenueEl) totalRevenueEl.textContent = formatCurrency(revenue);
}

function renderCharts(data) {
  const monthlyData = getMonthlyData(data);

  // Revenue Trend (Line Chart)
  const revenueCtx = document.getElementById('revenueChart').getContext('2d');
  if (revenueChart) revenueChart.destroy();
  revenueChart = new Chart(revenueCtx, {
    type: 'line',
    data: {
      labels: monthlyData.labels,
      datasets: [{
        label: 'Revenue (₱)',
        data: monthlyData.revenue,
        borderColor: '#1aa39a',
        backgroundColor: 'rgba(26, 163, 154, 0.1)',
        tension: 0.4,
        fill: true
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function(value) {
              return '₱' + value.toLocaleString();
            }
          }
        }
      }
    }
  });

  // Reservation Status (Pie Chart)
  const statusCounts = {
    Pending: data.filter(item => item.reservation_status === "Pending").length,
    Approved: data.filter(item => item.reservation_status === "Approved").length,
    Cancelled: data.filter(item => item.reservation_status === "Cancelled").length
  };

  const statusCtx = document.getElementById('statusChart').getContext('2d');
  if (statusChart) statusChart.destroy();
  statusChart = new Chart(statusCtx, {
    type: 'pie',
    data: {
      labels: Object.keys(statusCounts),
      datasets: [{
        data: Object.values(statusCounts),
        backgroundColor: ['#fbbf24', '#10b981', '#ef4444'],
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'bottom' }
      }
    }
  });

  // Monthly Bookings (Bar Chart)
  const bookingsCtx = document.getElementById('bookingsChart').getContext('2d');
  if (bookingsChart) bookingsChart.destroy();
  bookingsChart = new Chart(bookingsCtx, {
    type: 'bar',
    data: {
      labels: monthlyData.labels,
      datasets: [{
        label: 'Bookings',
        data: monthlyData.bookings,
        backgroundColor: '#0f3d3e',
        borderRadius: 4
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { stepSize: 1 }
        }
      }
    }
  });
}

function getMonthlyData(data) {
  const now = new Date();
  const months = [];
  const revenue = [];
  const bookings = [];

  // Get last 12 months
  for (let i = 11; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const monthLabel = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

    months.push(monthLabel);

    const monthRevenue = data
      .filter(item => item.reservation_status === "Approved" && item.event_date.startsWith(monthKey))
      .reduce((sum, item) => sum + item.total_amount, 0);

    const monthBookings = data
      .filter(item => item.event_date.startsWith(monthKey))
      .length;

    revenue.push(monthRevenue);
    bookings.push(monthBookings);
  }

  return { labels: months, revenue, bookings };
}

function formatCurrency(amount) {
  return `₱${Number(amount).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatDate(dateStr) {
  if (!dateStr) return "N/A";
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return dateStr;
  }
}