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

const API_BASE = "https://localhost:7241";
const REPORT_API = `${API_BASE}/api/Report`;

const TRANSACTION_SUMMARY_URL = `${REPORT_API}/transaction-summary-report`;
const TOTAL_REVENUE_PER_CLIENT_URL = `${REPORT_API}/total-revenue-per-client`;
const TOTAL_SUCCESSFUL_TRANSACTION_AMOUNT_URL =
  `${REPORT_API}/total-successful-transaction-amount`;

const transactionTableBody = document.getElementById("transactionTableBody");
const clientRevenueTableBody = document.getElementById("clientRevenueTableBody");

const transactionSearch = document.getElementById("transactionSearch");
const clientRevenueSearch = document.getElementById("clientRevenueSearch");

const totalTransactionsEl = document.getElementById("totalTransactions");
const successfulTransactionsEl = document.getElementById("successfulTransactions");
const totalSuccessfulPaymentAmountEl =
  document.getElementById("totalSuccessfulPaymentAmount");
const totalClientRevenueEl = document.getElementById("totalClientRevenue");
const topClientEl = document.getElementById("topClient");

let transactions = [];
let clientRevenue = [];

document.addEventListener("DOMContentLoaded", async () => {
  setAdminProfile();
  setupLogout();

  await loadReports();

  if (transactionSearch) {
    transactionSearch.addEventListener("input", filterTransactions);
  }

  if (clientRevenueSearch) {
    clientRevenueSearch.addEventListener("input", filterClientRevenue);
  }
});

async function loadReports() {
  await Promise.all([
    loadTransactionSummary(),
    loadTotalRevenuePerClient(),
    loadTotalSuccessfulPaymentAmount()
  ]);

  updateCards();
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

async function loadTransactionSummary() {
  try {
    const data = await fetchJson(TRANSACTION_SUMMARY_URL);
    transactions = Array.isArray(data) ? data : [];
    renderTransactionTable(transactions);
  } catch (error) {
    console.error("Transaction summary error:", error);

    if (transactionTableBody) {
      transactionTableBody.innerHTML = `
        <tr>
          <td colspan="5" class="empty-state">Failed to load transactions.</td>
        </tr>
      `;
    }
  }
}

async function loadTotalRevenuePerClient() {
  try {
    const data = await fetchJson(TOTAL_REVENUE_PER_CLIENT_URL);
    clientRevenue = Array.isArray(data) ? data : [];

    clientRevenue.sort((a, b) => {
      const amountA = Number(getValue(a, "total_spent", "totalSpent") || 0);
      const amountB = Number(getValue(b, "total_spent", "totalSpent") || 0);
      return amountB - amountA;
    });

    renderClientRevenueTable(clientRevenue);
  } catch (error) {
    console.error("Total revenue per client error:", error);

    if (clientRevenueTableBody) {
      clientRevenueTableBody.innerHTML = `
        <tr>
          <td colspan="2" class="empty-state">Failed to load client revenue.</td>
        </tr>
      `;
    }
  }
}

async function loadTotalSuccessfulPaymentAmount() {
  try {
    const data = await fetchJson(TOTAL_SUCCESSFUL_TRANSACTION_AMOUNT_URL);

    const amount =
      data.total_successful_payments ??
      data.totalSuccessfulPayments ??
      data.TotalSuccessfulPayments ??
      0;

    if (totalSuccessfulPaymentAmountEl) {
      totalSuccessfulPaymentAmountEl.textContent = formatCurrency(amount);
    }

  } catch (error) {
    console.error("Total successful payment amount error:", error);

    if (totalSuccessfulPaymentAmountEl) {
      totalSuccessfulPaymentAmountEl.textContent = "₱0.00";
    }
  }
}

function renderTransactionTable(data) {
  if (!transactionTableBody) return;

  if (!data || data.length === 0) {
    transactionTableBody.innerHTML = `
      <tr>
        <td colspan="5" class="empty-state">No transaction records found.</td>
      </tr>
    `;
    return;
  }

  transactionTableBody.innerHTML = data.map(item => {
    const person = getValue(item, "person", "person");
    const paymentMethod = getValue(item, "payment_method", "paymentMethod");
    const transactionStatus = getValue(item, "transaction_status", "transactionStatus");
    const paymentDate = getValue(item, "payment_date", "paymentDate");
    const description = getValue(item, "description", "description");

    return `
      <tr>
        <td>${escapeHTML(person)}</td>
        <td>${escapeHTML(paymentMethod)}</td>
        <td>
          <span class="badge ${getStatusClass(transactionStatus)}">
            ${escapeHTML(transactionStatus)}
          </span>
        </td>
        <td>${formatDateTime(paymentDate)}</td>
        <td title="${escapeHTML(description)}">${escapeHTML(description)}</td>
      </tr>
    `;
  }).join("");
}

function renderClientRevenueTable(data) {
  if (!clientRevenueTableBody) return;

  if (!data || data.length === 0) {
    clientRevenueTableBody.innerHTML = `
      <tr>
        <td colspan="2" class="empty-state">No client revenue records found.</td>
      </tr>
    `;
    return;
  }

  clientRevenueTableBody.innerHTML = data.map(item => {
    const fullName = getValue(item, "full_name", "fullName");
    const totalSpent = getValue(item, "total_spent", "totalSpent");

    return `
      <tr>
        <td>${escapeHTML(fullName)}</td>
        <td class="amount">${formatCurrency(totalSpent)}</td>
      </tr>
    `;
  }).join("");
}

function filterTransactions() {
  if (!transactionSearch) return;

  const keyword = transactionSearch.value.toLowerCase().trim();

  const filtered = transactions.filter(item => {
    const person = getValue(item, "person", "person").toLowerCase();
    const paymentMethod = getValue(item, "payment_method", "paymentMethod").toLowerCase();
    const transactionStatus = getValue(item, "transaction_status", "transactionStatus").toLowerCase();
    const description = getValue(item, "description", "description").toLowerCase();

    return (
      person.includes(keyword) ||
      paymentMethod.includes(keyword) ||
      transactionStatus.includes(keyword) ||
      description.includes(keyword)
    );
  });

  renderTransactionTable(filtered);
}

function filterClientRevenue() {
  if (!clientRevenueSearch) return;

  const keyword = clientRevenueSearch.value.toLowerCase().trim();

  const filtered = clientRevenue.filter(item => {
    const fullName = getValue(item, "full_name", "fullName").toLowerCase();
    return fullName.includes(keyword);
  });

  renderClientRevenueTable(filtered);
}

function updateCards() {
  const totalTransactions = transactions.length;

  const successfulTransactions = transactions.filter(item => {
    const status = getValue(item, "transaction_status", "transactionStatus");
    const normalized = String(status).toLowerCase();

    return (
      normalized.includes("success") ||
      normalized.includes("paid") ||
      normalized.includes("complete") ||
      normalized.includes("approved")
    );
  }).length;

  const totalRevenue = clientRevenue.reduce((sum, item) => {
    return sum + Number(getValue(item, "total_spent", "totalSpent") || 0);
  }, 0);

  const topClient = clientRevenue.length > 0
    ? getValue(clientRevenue[0], "full_name", "fullName")
    : "None";

  if (totalTransactionsEl) {
    totalTransactionsEl.textContent = totalTransactions;
  }

  if (successfulTransactionsEl) {
    successfulTransactionsEl.textContent = successfulTransactions;
  }

  if (totalClientRevenueEl) {
    totalClientRevenueEl.textContent = formatCurrency(totalRevenue);
  }

  if (topClientEl) {
    topClientEl.textContent = topClient || "None";
  }
}

function getValue(item, snakeKey, camelKey) {
  return item?.[snakeKey] ?? item?.[camelKey] ?? "";
}

function getStatusClass(status) {
  const value = String(status).toLowerCase();

  if (
    value.includes("success") ||
    value.includes("paid") ||
    value.includes("complete") ||
    value.includes("approved")
  ) {
    return "success";
  }

  if (value.includes("pending")) {
    return "pending";
  }

  if (value.includes("cancel") || value.includes("failed")) {
    return "failed";
  }

  return "";
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

function escapeHTML(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}