const API_BASE = "https://localhost:7241";
const DASHBOARD_ENDPOINT = `${API_BASE}/api/AdminDashboard`;

let reservations = [];
let filteredReservations = [];
let refreshTimer = null;
let apiOnline = false;

const totalReservationsEl = document.getElementById("totalReservations");
const pendingReservationsEl = document.getElementById("pendingReservations");
const approvedReservationsEl = document.getElementById("approvedReservations");
const cancelledReservationsEl = document.getElementById("cancelledReservations");
const totalRevenueEl = document.getElementById("totalRevenue");

const reservationTableBody = document.getElementById("reservationTableBody");
const searchInput = document.getElementById("searchInput");
const statusFilter = document.getElementById("statusFilter");

const detailsModal = document.getElementById("detailsModal");
const modalBody = document.getElementById("modalBody");
const closeModalBtn = document.getElementById("closeModalBtn");
const logoutBtn = document.getElementById("logoutBtn");

document.addEventListener("DOMContentLoaded", async () => {
  bindEvents();
  await initialLoad();
});

async function initialLoad() {
  const success = await loadReservations(true);

  if (success) {
    startAutoRefresh();
  }
}

function bindEvents() {
  if (searchInput) {
    searchInput.addEventListener("input", applyFilters);
  }

  if (statusFilter) {
    statusFilter.addEventListener("change", applyFilters);
  }

  if (closeModalBtn) {
    closeModalBtn.addEventListener("click", closeModal);
  }

  if (detailsModal) {
    detailsModal.addEventListener("click", (event) => {
      if (event.target === detailsModal) {
        closeModal();
      }
    });
  }

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && detailsModal && !detailsModal.classList.contains("hidden")) {
      closeModal();
    }
  });

  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      localStorage.removeItem("adminUser");
      alert("Logged out successfully.");
      window.location.href = "admin-login.html";
    });
  }
}

async function loadReservations(showLoading = true) {
  try {
    if (showLoading) {
      setTableLoading();
    }

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
    applyFilters();
    renderStats(reservations);

    return true;
  } catch (error) {
    console.error("loadReservations error:", error);

    apiOnline = false;
    reservations = [];
    filteredReservations = [];

    renderStats([]);
    renderTableError("Cannot connect to backend. Make sure the API is running.");

    return false;
  }
}

function startAutoRefresh() {
  stopAutoRefresh();

  refreshTimer = setInterval(async () => {
    await loadReservations(false);
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

function applyFilters() {
  const searchValue = (searchInput?.value || "").trim().toLowerCase();
  const selectedStatus = statusFilter?.value || "all";

  filteredReservations = reservations.filter((item) => {
    const matchesSearch =
      item.full_name.toLowerCase().includes(searchValue) ||
      item.event_type.toLowerCase().includes(searchValue) ||
      item.venue.toLowerCase().includes(searchValue) ||
      String(item.reservation_id).includes(searchValue);

    const matchesStatus =
      selectedStatus === "all" || item.reservation_status === selectedStatus;

    return matchesSearch && matchesStatus;
  });

  renderTable(filteredReservations);
}

function renderTable(data) {
  if (!reservationTableBody) return;

  if (!data.length) {
    reservationTableBody.innerHTML = `
      <tr>
        <td colspan="8" class="empty-state">No reservations found.</td>
      </tr>
    `;
    return;
  }

  reservationTableBody.innerHTML = data.map((item) => {
    const statusClass = item.reservation_status.toLowerCase();

    return `
      <tr>
        <td>#${item.reservation_id}</td>
        <td>${escapeHtml(item.full_name)}</td>
        <td>${escapeHtml(item.event_type)}</td>
        <td>${formatDate(item.event_date)}</td>
        <td>${escapeHtml(item.venue)}</td>
        <td>${formatCurrency(item.total_amount)}</td>
        <td>
          <span class="status ${statusClass}">
            ${escapeHtml(item.reservation_status)}
          </span>
        </td>
        <td>
          <div class="actions">
            <button class="btn btn-view" type="button" data-id="${item.reservation_id}">
              View
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join("");

  bindTableActions();
}

function bindTableActions() {
  if (!reservationTableBody) return;

  const viewButtons = reservationTableBody.querySelectorAll(".btn-view");

  viewButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const id = Number(button.dataset.id);
      if (!id) return;

      viewDetails(id);
    });
  });
}

function viewDetails(id) {
  const reservation = reservations.find((item) => item.reservation_id === id);

  if (!reservation) {
    alert("Reservation not found.");
    return;
  }

  if (!modalBody || !detailsModal) return;

  modalBody.innerHTML = `
    <div class="detail-grid">
      <div class="detail-item">
        <span>Reservation ID</span>
        <strong>#${reservation.reservation_id}</strong>
      </div>

      <div class="detail-item">
        <span>Client Name</span>
        <strong>${escapeHtml(reservation.full_name)}</strong>
      </div>

      <div class="detail-item">
        <span>Event Type</span>
        <strong>${escapeHtml(reservation.event_type)}</strong>
      </div>

      <div class="detail-item">
        <span>Event Date</span>
        <strong>${formatDate(reservation.event_date)}</strong>
      </div>

      <div class="detail-item">
        <span>Venue</span>
        <strong>${escapeHtml(reservation.venue)}</strong>
      </div>

      <div class="detail-item">
        <span>Status</span>
        <strong>${escapeHtml(reservation.reservation_status)}</strong>
      </div>

      <div class="detail-item span-full">
        <span>Total Amount</span>
        <strong>${formatCurrency(reservation.total_amount)}</strong>
      </div>
    </div>
  `;

  detailsModal.classList.remove("hidden");
}

function closeModal() {
  if (detailsModal) {
    detailsModal.classList.add("hidden");
  }
}

function setTableLoading() {
  if (!reservationTableBody) return;

  reservationTableBody.innerHTML = `
    <tr>
      <td colspan="8" class="empty-state">Loading reservations...</td>
    </tr>
  `;
}

function renderTableError(message) {
  if (!reservationTableBody) return;

  reservationTableBody.innerHTML = `
    <tr>
      <td colspan="8" class="empty-state">${escapeHtml(message)}</td>
    </tr>
  `;
}

function formatCurrency(amount) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP"
  }).format(Number(amount || 0));
}

function formatDate(dateString) {
  if (!dateString) return "N/A";

  const date = new Date(dateString);
  if (isNaN(date.getTime())) return escapeHtml(String(dateString));

  return date.toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}