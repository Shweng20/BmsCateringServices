const API_BASE = "https://localhost:7241";
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
const mostBookedPackageEl = document.getElementById("mostBookedPackage");
const mostBookedCountEl = document.getElementById("mostBookedCount");
const hostAvailableEl = document.getElementById("hostAvailable");
const availedHostEl = document.getElementById("availedHost");

document.addEventListener("DOMContentLoaded", async () => {
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
      "Accept": "application/json"
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
      getValue(r, "reservation_status", "reservationStatus") === "Pending"
    ).length;

    const approved = reservations.filter(r =>
      getValue(r, "reservation_status", "reservationStatus") === "Approved"
    ).length;

    const cancelled = reservations.filter(r =>
      getValue(r, "reservation_status", "reservationStatus") === "Cancelled"
    ).length;

    const revenue = reservations
      .filter(r => getValue(r, "reservation_status", "reservationStatus") === "Approved")
      .reduce((sum, r) => {
        return sum + Number(getValue(r, "total_amount", "totalAmount") || 0);
      }, 0);

    totalReservationsEl.textContent = total;
    pendingReservationsEl.textContent = pending;
    approvedReservationsEl.textContent = approved;
    cancelledReservationsEl.textContent = cancelled;
    totalRevenueEl.textContent = formatCurrency(revenue);

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
      mostBooked,
      hostAvailability
    ] = await Promise.all([
      fetchJson(`${REPORT_API}/total-revenue-all-reservations`),
      fetchJson(`${REPORT_API}/total-expense`),
      fetchJson(`${REPORT_API}/most-booked-package`),
      fetchJson(`${REPORT_API}/host-availability`)
    ]);

    const totalRevenueValue =
      getValue(totalRevenue, "total_revenue", "totalRevenue");

    const totalExpenseValue =
      getValue(totalExpense, "total_expenses", "totalExpenses");

    totalRevenueEl.textContent = formatCurrency(totalRevenueValue);

    if (totalExpenseEl) {
      totalExpenseEl.textContent = formatCurrency(totalExpenseValue);
    }

    if (Array.isArray(mostBooked) && mostBooked.length > 0) {
      const packageName = getValue(mostBooked[0], "package_name", "packageName");
      const reservationCount = getValue(mostBooked[0], "reservation_count", "reservationCount");

      if (mostBookedPackageEl) {
        mostBookedPackageEl.textContent = packageName || "No package";
      }

      if (mostBookedCountEl) {
        mostBookedCountEl.textContent = `${reservationCount || 0} bookings`;
      }
    }

    if (hostAvailability) {
      const available =
        getValue(hostAvailability, "host_available", "hostAvailable");

      const availed =
        getValue(hostAvailability, "availed_host", "availedHost");

      if (hostAvailableEl) {
        hostAvailableEl.textContent = available || 0;
      }

      if (availedHostEl) {
        availedHostEl.textContent = availed || 0;
      }
    }

  } catch (error) {
    console.error("Reports error:", error);
  }
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

  if (revenueChart) {
    revenueChart.destroy();
  }

  revenueChart = new Chart(canvas, {
    type: "line",
    data: {
      labels: labels,
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
    getValue(r, "reservation_status", "reservationStatus") === "Pending"
  ).length;

  const approved = data.filter(r =>
    getValue(r, "reservation_status", "reservationStatus") === "Approved"
  ).length;

  const cancelled = data.filter(r =>
    getValue(r, "reservation_status", "reservationStatus") === "Cancelled"
  ).length;

  if (statusChart) {
    statusChart.destroy();
  }

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

  if (monthlyBookingsChart) {
    monthlyBookingsChart.destroy();
  }

  monthlyBookingsChart = new Chart(canvas, {
    type: "bar",
    data: {
      labels: labels,
      datasets: [{
        label: "Bookings",
        data: values
      }]
    },
    options: {
      responsive: true,
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
    const status = getValue(item, "reservation_status", "reservationStatus");
    const dateValue = getValue(item, "event_date", "eventDate");
    const amount = Number(getValue(item, "total_amount", "totalAmount") || 0);

    if (status !== "Approved") return;
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
  return item[snakeKey] ?? item[camelKey] ?? "";
}

function formatCurrency(value) {
  const numberValue = Number(value);

  if (isNaN(numberValue)) {
    return "₱0.00";
  }

  return numberValue.toLocaleString("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2
  });
}