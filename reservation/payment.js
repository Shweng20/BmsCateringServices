document.addEventListener("DOMContentLoaded", function () {
  const API_BASE_URL = "https://localhost:7241";
  const PAYMENT_API = `${API_BASE_URL}/TransactionLog`;

  const pendingPaymentRaw = localStorage.getItem("pendingPayment");
  const clientRaw = localStorage.getItem("clientUser");

  const paymentForm = document.getElementById("paymentForm");
  const paymentMessage = document.getElementById("paymentMessage");
  const paymentTotal = document.getElementById("paymentTotal");

  const reservationIdText = document.getElementById("reservationIdText");
  const clientNameText = document.getElementById("clientNameText");
  const eventTypeText = document.getElementById("eventTypeText");
  const eventDateText = document.getElementById("eventDateText");
  const eventTimeText = document.getElementById("eventTimeText");
  const venueText = document.getElementById("venueText");
  const packageNameText = document.getElementById("packageNameText");

  const proofInput = document.getElementById("proofPayment");
  const proofPreview = document.getElementById("proofPreview");

  const closeBtn = document.getElementById("closePaymentModal");
  const gcashBox = document.getElementById("gcashBox");
  const bankBox = document.getElementById("bankBox");

  let pendingPayment = null;
  let client = null;

  function showMessage(message, type = "") {
    if (!paymentMessage) {
      alert(message);
      return;
    }

    paymentMessage.textContent = message;
    paymentMessage.className = type
      ? `payment-message ${type}`
      : "payment-message";
  }

  function formatCurrency(value) {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 2
    }).format(Number(value || 0));
  }

  function setText(element, value) {
    if (element) {
      element.textContent = value || "—";
    }
  }

  function getSelectedPaymentMethod() {
    const selected = document.querySelector('input[name="payment_method"]:checked');
    return selected ? selected.value : "";
  }

  function togglePaymentBoxes() {
    const method = getSelectedPaymentMethod();

    if (gcashBox) {
      gcashBox.style.display = method === "GCash" ? "block" : "none";
    }

    if (bankBox) {
      bankBox.style.display = method === "Bank Transfer" ? "block" : "none";
    }

    if (proofInput) {
      proofInput.required = method === "GCash" || method === "Bank Transfer";
    }
  }

  function loadPaymentData() {
    if (!pendingPaymentRaw) {
      showMessage("No pending payment found. Please create a reservation first.", "error");

      if (paymentForm) {
        paymentForm.querySelectorAll("input, button").forEach(el => {
          el.disabled = true;
        });
      }

      return;
    }

    try {
      pendingPayment = JSON.parse(pendingPaymentRaw);
    } catch (error) {
      console.error("Invalid pendingPayment:", error);
      localStorage.removeItem("pendingPayment");
      showMessage("Invalid payment data. Please create a reservation again.", "error");
      return;
    }

    if (clientRaw) {
      try {
        client = JSON.parse(clientRaw);
      } catch {
        client = null;
      }
    }

    const reservationId = pendingPayment.reservation_id || pendingPayment.reservationId || "Pending";
    const clientName = pendingPayment.client_name || pendingPayment.clientName || client?.full_name || client?.fullName || "Client";
    const totalAmount = pendingPayment.total_amount || pendingPayment.totalAmount || 0;

    setText(reservationIdText, reservationId);
    setText(clientNameText, clientName);
    setText(eventTypeText, pendingPayment.event_type || pendingPayment.eventType);
    setText(eventDateText, pendingPayment.event_date || pendingPayment.eventDate);
    setText(eventTimeText, pendingPayment.event_time || pendingPayment.eventTime);
    setText(venueText, pendingPayment.venue);
    setText(packageNameText, pendingPayment.package_name || pendingPayment.packageName);

    if (paymentTotal) {
      paymentTotal.textContent = formatCurrency(totalAmount);
    }
  }

  function previewProof() {
    if (!proofInput || !proofPreview) return;

    const file = proofInput.files?.[0];

    if (!file) {
      proofPreview.innerHTML = "";
      return;
    }

    if (!file.type.startsWith("image/")) {
      proofInput.value = "";
      proofPreview.innerHTML = "";
      showMessage("Please upload image file only.", "error");
      return;
    }

    const reader = new FileReader();

    reader.onload = function (e) {
      proofPreview.innerHTML = `
        <img 
          src="${e.target.result}" 
          alt="Proof of payment" 
          style="width:100%;max-width:260px;border-radius:14px;margin-top:12px;"
        >
      `;
    };

    reader.readAsDataURL(file);
  }

  function fileToBase64(file) {
    if (!file) return Promise.resolve(null);

    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;

      reader.readAsDataURL(file);
    });
  }

  async function submitPayment(e) {
    e.preventDefault();

    if (!pendingPayment) {
      showMessage("No pending payment found.", "error");
      return;
    }

    const method = getSelectedPaymentMethod();
    const proofFile = proofInput?.files?.[0] || null;

    if (!method) {
      showMessage("Please select a payment method.", "error");
      return;
    }

    if ((method === "GCash" || method === "Bank Transfer") && !proofFile) {
      showMessage("Please upload proof of payment.", "error");
      return;
    }

    showMessage("Submitting payment...");

    try {
      const proofBase64 = await fileToBase64(proofFile);

      const payload = {
        reservation_id: Number(pendingPayment.reservation_id || pendingPayment.reservationId || 0),
        payment_method: method,
        transaction_status: "Pending",
        payment_date: new Date().toISOString(),
        description: `Payment submitted for ${pendingPayment.package_name || pendingPayment.packageName || "reservation"}`,
        is_deleted: false,
        proof_payment: proofBase64,
        proof_payment_file_name: proofFile ? proofFile.name : null
      };

      const response = await fetch(PAYMENT_API, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const rawText = await response.text();

      let result = {};
      try {
        result = rawText ? JSON.parse(rawText) : {};
      } catch {
        result = { message: rawText };
      }

      if (!response.ok) {
        showMessage(result.message || `Payment failed. HTTP ${response.status}`, "error");
        return;
      }

      showMessage(result.message || "Payment submitted successfully.", "success");

      localStorage.removeItem("pendingPayment");

      setTimeout(() => {
        window.location.href = "../index.html";
      }, 1500);

    } catch (error) {
      console.error("Payment submit error:", error);
      showMessage(`Cannot connect to payment API: ${error.message}`, "error");
    }
  }

  document.querySelectorAll('input[name="payment_method"]').forEach(radio => {
    radio.addEventListener("change", togglePaymentBoxes);
  });

  if (proofInput) {
    proofInput.addEventListener("change", previewProof);
  }

  if (paymentForm) {
    paymentForm.addEventListener("submit", submitPayment);
  }

  if (closeBtn) {
    closeBtn.addEventListener("click", function () {
      window.location.href = "../index.html";
    });
  }

  loadPaymentData();
  togglePaymentBoxes();
});