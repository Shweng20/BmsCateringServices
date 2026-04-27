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

const API_BASE = "https://bmscatering-api.azurewebsites.net";
const DASHBOARD_ENDPOINT = `${API_BASE}/api/AdminDashboard`;

let reservations = [];
let filteredReservations = [];
let refreshTimer = null;

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
const logoutBtn = document.getElementById("logoutBtn") || document.querySelector(".logout-btn");

document.addEventListener("DOMContentLoaded", async () => {
  setAdminProfile();
  setupLogout();
  bindEvents();

  const success = await loadReservations(true);

  if (success) {
    startAutoRefresh();
  }
});

function setupLogout() {
  if (!logoutBtn) return;

  logoutBtn.addEventListener("click", () => {
    localStorage.removeItem("adminUser");
    localStorage.removeItem("adminToken");
    window.location.href = "admin-login.html";
  });
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
    detailsModal.addEventListener("click", event => {
      if (event.target === detailsModal) {
        closeModal();
      }
    });
  }

  document.addEventListener("keydown", event => {
    if (
      event.key === "Escape" &&
      detailsModal &&
      !detailsModal.classList.contains("hidden")
    ) {
      closeModal();
    }
  });
}

async function loadReservations(showLoading = true) {
  try {
    if (showLoading) {
      setTableLoading();
    }

    const response = await fetch(DASHBOARD_ENDPOINT, {
      method: "GET",
      headers: {
        Accept: "application/json"
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();

    reservations = Array.isArray(data)
      ? data.map(normalizeReservation)
      : [];

    applyFilters();
    renderStats(reservations);

    return true;
  } catch (error) {
    console.error("loadReservations error:", error);

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
    reservation_id:
      item.reservation_id ??
      item.reservationId ??
      item.ReservationId ??
      0,

    client_id:
      item.client_id ??
      item.clientId ??
      item.ClientId ??
      "—",

    full_name:
      item.full_name ??
      item.fullName ??
      item.client_name ??
      item.clientName ??
      item.ClientName ??
      "N/A",

    event_type:
      item.event_type ??
      item.eventType ??
      item.EventType ??
      "N/A",

    event_date:
      item.event_date ??
      item.eventDate ??
      item.EventDate ??
      "",

    event_time:
      item.event_time ??
      item.eventTime ??
      item.EventTime ??
      "—",

    venue:
      item.venue ??
      item.Venue ??
      "N/A",

    reservation_status: normalizeStatus(
      item.reservation_status ??
      item.reservationStatus ??
      item.ReservationStatus
    ),

    reservation_date:
      item.reservation_date ??
      item.reservationDate ??
      item.ReservationDate ??
      "",

    total_amount: Number(
      item.total_amount ??
      item.totalAmount ??
      item.TotalAmount ??
      0
    ),

    package_name:
      item.package_name ??
      item.packageName ??
      item.PackageName ??
      "—",

    selected_food:
      item.selected_food ??
      item.selectedFood ??
      item.SelectedFood ??
      "—",

    sound_light_option:
      item.sound_light_option ??
      item.soundLightOption ??
      item.service_name ??
      item.serviceName ??
      "—",

    host_option:
      item.host_option ??
      item.hostOption ??
      item.host_name ??
      item.hostName ??
      "—",

    host_specialization:
      item.host_specialization ??
      item.hostSpecialization ??
      item.specialization ??
      "—",

    host_price: Number(
      item.host_price ??
      item.hostPrice ??
      item.professional_fee ??
      item.professionalFee ??
      0
    ),

    payment_method:
      item.payment_method ??
      item.paymentMethod ??
      item.PaymentMethod ??
      "—",

    transaction_status:
      item.transaction_status ??
      item.transactionStatus ??
      item.TransactionStatus ??
      "—",

    proof_of_payment:
      item.proof_of_payment ??
      item.proofOfPayment ??
      item.ProofOfPayment ??
      ""
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

  filteredReservations = reservations.filter(item => {
    const matchesSearch =
      String(item.full_name).toLowerCase().includes(searchValue) ||
      String(item.event_type).toLowerCase().includes(searchValue) ||
      String(item.venue).toLowerCase().includes(searchValue) ||
      String(item.selected_food).toLowerCase().includes(searchValue) ||
      String(item.reservation_id).includes(searchValue);

    const matchesStatus =
      selectedStatus === "all" || item.reservation_status === selectedStatus;

    return matchesSearch && matchesStatus;
  });

  renderTable(filteredReservations);
}

function renderTable(data) {
  if (!reservationTableBody) return;

  if (!data || data.length === 0) {
    reservationTableBody.innerHTML = `
      <tr>
        <td colspan="8" class="empty-state">No reservations found.</td>
      </tr>
    `;
    return;
  }

  reservationTableBody.innerHTML = data.map(item => {
    const statusClass = item.reservation_status.toLowerCase();

    return `
      <tr>
        <td>#${escapeHtml(item.reservation_id)}</td>
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

  viewButtons.forEach(button => {
    button.addEventListener("click", () => {
      const id = Number(button.dataset.id);
      if (!id) return;

      viewDetails(id);
    });
  });
}

function getHostDisplay(reservation) {
  if (!reservation.host_option || reservation.host_option === "—") {
    return "—";
  }

  if (
    reservation.host_specialization &&
    reservation.host_specialization !== "—"
  ) {
    return `${reservation.host_option} - ${reservation.host_specialization}`;
  }

  return reservation.host_option;
}

function viewDetails(id) {
  const reservation = reservations.find(item => item.reservation_id === id);

  if (!reservation) {
    alert("Reservation not found.");
    return;
  }

  if (!modalBody || !detailsModal) return;

  const downpayment = Number(reservation.total_amount || 0) * 0.7;
  const remainingBalance = Number(reservation.total_amount || 0) * 0.3;
  const hostDisplay = getHostDisplay(reservation);

  modalBody.innerHTML = `
    <div class="detail-grid">
      <div class="detail-item">
        <span>Reservation ID</span>
        <strong>#${escapeHtml(reservation.reservation_id)}</strong>
      </div>

      <div class="detail-item">
        <span>Client ID</span>
        <strong>${escapeHtml(reservation.client_id)}</strong>
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
        <span>Event Time</span>
        <strong>${escapeHtml(formatTime(reservation.event_time))}</strong>
      </div>

      <div class="detail-item">
        <span>Venue</span>
        <strong>${escapeHtml(reservation.venue)}</strong>
      </div>

      <div class="detail-item">
        <span>Status</span>
        <strong>${escapeHtml(reservation.reservation_status)}</strong>
      </div>

      <div class="detail-item">
        <span>Package</span>
        <strong>${escapeHtml(reservation.package_name)}</strong>
      </div>

      <div class="detail-item span-full">
        <span>Selected Food</span>
        <strong>${escapeHtml(reservation.selected_food)}</strong>
      </div>

      <div class="detail-item">
        <span>Sound & Light</span>
        <strong>${escapeHtml(reservation.sound_light_option)}</strong>
      </div>

      <div class="detail-item">
        <span>Host</span>
        <strong>${escapeHtml(hostDisplay)}</strong>
      </div>

      <div class="detail-item">
        <span>Host Fee</span>
        <strong>${reservation.host_price > 0 ? formatCurrency(reservation.host_price) : "—"}</strong>
      </div>

      <div class="detail-item">
        <span>Payment Method</span>
        <strong>${escapeHtml(reservation.payment_method)}</strong>
      </div>

      <div class="detail-item">
        <span>Payment Status</span>
        <strong>${escapeHtml(reservation.transaction_status)}</strong>
      </div>

      <div class="detail-item">
        <span>Reservation Date</span>
        <strong>${formatDate(reservation.reservation_date)}</strong>
      </div>

      <div class="detail-item span-full">
        <span>Total Amount</span>
        <strong>${formatCurrency(reservation.total_amount)}</strong>
      </div>

      <div class="detail-item">
        <span>70% Downpayment</span>
        <strong>${formatCurrency(downpayment)}</strong>
      </div>

      <div class="detail-item">
        <span>30% Balance</span>
        <strong>${formatCurrency(remainingBalance)}</strong>
      </div>

      ${
        reservation.proof_of_payment
          ? `
            <div class="detail-item span-full">
              <span>Proof of Payment</span>
              <strong>
                <a href="${API_BASE}${escapeHtml(reservation.proof_of_payment)}" target="_blank">
                  View uploaded proof
                </a>
              </strong>
            </div>
          `
          : `
            <div class="detail-item span-full">
              <span>Proof of Payment</span>
              <strong>No proof uploaded</strong>
            </div>
          `
      }
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
    currency: "PHP",
    minimumFractionDigits: 2
  }).format(Number(amount || 0));
}

function formatDate(dateString) {
  if (!dateString || dateString === "—") return "—";

  const date = new Date(dateString);

  if (isNaN(date.getTime())) {
    return escapeHtml(String(dateString));
  }

  return date.toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}

function formatTime(timeValue) {
  if (!timeValue || timeValue === "—") return "—";

  const raw = String(timeValue);

  if (/^\d{2}:\d{2}:\d{2}$/.test(raw)) {
    return raw;
  }

  if (/^\d{2}:\d{2}$/.test(raw)) {
    return `${raw}:00`;
  }

  return raw;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}