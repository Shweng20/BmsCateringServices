const API_BASE = "https://localhost:7241";
const DASHBOARD_ENDPOINT = `${API_BASE}/api/AdminDashboard`;
const REPORT_API = `${API_BASE}/api/Report`;

let reservations = [];
let refreshTimer = null;

const totalReservationsEl = document.getElementById("totalReservations");
const pendingReservationsEl = document.getElementById("pendingReservations");
const approvedReservationsEl = document.getElementById("approvedReservations");
const cancelledReservationsEl = document.getElementById("cancelledReservations");
const totalRevenueEl = document.getElementById("totalRevenue");

const totalExpenseEl = document.getElementById("totalExpense");
const mostBookedPackageEl = document.getElementById("mostBookedPackage");
const mostBookedCountEl = document.getElementById("mostBookedCount");
const hostAvailableEl = document.getElementById("hostAvailable");
const availedHostEl = document.getElementById("availedHost");

document.addEventListener("DOMContentLoaded", async () => {
  await loadAll();
  startAutoRefresh();
});

async function loadAll() {
  await Promise.all([
    loadAnalytics(),
    loadReports()
  ]);
}

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json();
}

async function loadAnalytics() {
  try {
    const data = await fetchJson(DASHBOARD_ENDPOINT);

    reservations = Array.isArray(data) ? data : [];

    const total = reservations.length;
    const pending = reservations.filter(r => r.reservation_status === "Pending").length;
    const approved = reservations.filter(r => r.reservation_status === "Approved").length;
    const cancelled = reservations.filter(r => r.reservation_status === "Cancelled").length;

    const revenue = reservations
      .filter(r => r.reservation_status === "Approved")
      .reduce((sum, r) => sum + Number(r.total_amount || 0), 0);

    totalReservationsEl.textContent = total;
    pendingReservationsEl.textContent = pending;
    approvedReservationsEl.textContent = approved;
    cancelledReservationsEl.textContent = cancelled;
    totalRevenueEl.textContent = formatCurrency(revenue);

  } catch (err) {
    console.error("Analytics error:", err);
  }
}

async function loadReports() {
  try {
    const [
      totalRevenue,
      totalExpense,
      mostBooked,
      hostAvailability
    ] = await Promise.all([
      fetchJson(`${REPORT_API}/total-revenue-all-reservations`),
      fetchJson(`${REPORT_API}/total-expense`),
      fetchJson(`${REPORT_API}/most-booked-package`),
      fetchJson(`${REPORT_API}/host-availability`)
    ]);

    totalRevenueEl.textContent = formatCurrency(totalRevenue.total_revenue);
    totalExpenseEl.textContent = formatCurrency(totalExpense.total_expenses);

    if (mostBooked.length > 0) {
      mostBookedPackageEl.textContent = mostBooked[0].package_name;
      mostBookedCountEl.textContent = `${mostBooked[0].reservation_count} bookings`;
    }

    hostAvailableEl.textContent = hostAvailability.host_available;
    availedHostEl.textContent = hostAvailability.availed_host;

  } catch (err) {
    console.error("Reports error:", err);
  }
}

function startAutoRefresh() {
  setInterval(loadAll, 5000);
}

function formatCurrency(val) {
  return `₱${Number(val || 0).toLocaleString("en-PH", {
    minimumFractionDigits: 2
  })}`;
}