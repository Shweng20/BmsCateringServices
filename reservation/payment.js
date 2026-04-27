document.addEventListener("DOMContentLoaded", function () {
  const API_BASE_URL = "https://bmscatering-api.azurewebsites.net";

  const UPLOAD_PROOF_API = `${API_BASE_URL}/TransactionLog/upload-proof`;
  const RESERVATION_API = `${API_BASE_URL}/Reservation`;

  const DOWNPAYMENT_RATE = 0.70;
  const BALANCE_RATE = 0.30;

  const pendingPaymentRaw = localStorage.getItem("pendingPayment");
  const clientRaw = localStorage.getItem("clientUser");

  const paymentForm = document.getElementById("paymentForm");
  const paymentMessage = document.getElementById("paymentMessage");
  const paymentTotal = document.getElementById("paymentTotal");
  const downpaymentAmount = document.getElementById("downpaymentAmount");
  const remainingBalance = document.getElementById("remainingBalance");

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
  let latestReservation = null;

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
    if (!element) return;

    element.textContent =
      value !== null && value !== undefined && value !== ""
        ? value
        : "—";
  }

  function getSelectedPaymentMethod() {
    const selected = document.querySelector('input[name="payment_method"]:checked');
    return selected ? selected.value : "";
  }

  function getReservationId() {
    return (
      pendingPayment?.reservation_id ||
      pendingPayment?.reservationId ||
      latestReservation?.reservation_id ||
      latestReservation?.reservationId ||
      null
    );
  }

  function getTotalAmount() {
    return Number(
      pendingPayment?.total_amount ||
      pendingPayment?.totalAmount ||
      latestReservation?.total_amount ||
      latestReservation?.totalAmount ||
      0
    );
  }

  function getDownpaymentAmount() {
    return getTotalAmount() * DOWNPAYMENT_RATE;
  }

  function getRemainingBalance() {
    return getTotalAmount() * BALANCE_RATE;
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
      proofInput.required = true;
    }
  }

  function disablePaymentForm(message) {
    showMessage(message, "error");

    if (paymentForm) {
      paymentForm.querySelectorAll("input, button").forEach(el => {
        el.disabled = true;
      });
    }
  }

  async function fetchReservationById(reservationId) {
    if (!reservationId || reservationId === "Pending") return null;

    try {
      const response = await fetch(`${RESERVATION_API}/${reservationId}`, {
        method: "GET",
        headers: {
          Accept: "application/json"
        }
      });

      const rawText = await response.text();

      let data = {};
      try {
        data = rawText ? JSON.parse(rawText) : {};
      } catch {
        data = {};
      }

      if (!response.ok) {
        console.warn(`Reservation fetch failed. HTTP ${response.status}`, data);
        return null;
      }

      return data;
    } catch (error) {
      console.warn("Reservation fetch error:", error);
      return null;
    }
  }

  function renderPaymentDetails() {
    const reservationId = getReservationId() || "Pending";

    const clientName =
      pendingPayment?.client_name ||
      pendingPayment?.clientName ||
      latestReservation?.client_name ||
      latestReservation?.clientName ||
      latestReservation?.full_name ||
      latestReservation?.fullName ||
      client?.full_name ||
      client?.fullName ||
      "Client";

    const eventType =
      pendingPayment?.event_type ||
      pendingPayment?.eventType ||
      latestReservation?.event_type ||
      latestReservation?.eventType;

    const eventDate =
      pendingPayment?.event_date ||
      pendingPayment?.eventDate ||
      latestReservation?.event_date ||
      latestReservation?.eventDate;

    const eventTime =
      pendingPayment?.event_time ||
      pendingPayment?.eventTime ||
      latestReservation?.event_time ||
      latestReservation?.eventTime;

    const venue =
      pendingPayment?.venue ||
      latestReservation?.venue;

    const packageName =
      pendingPayment?.package_name ||
      pendingPayment?.packageName ||
      latestReservation?.package_name ||
      latestReservation?.packageName;

    setText(reservationIdText, reservationId);
    setText(clientNameText, clientName);
    setText(eventTypeText, eventType);
    setText(eventDateText, eventDate);
    setText(eventTimeText, eventTime);
    setText(venueText, venue);
    setText(packageNameText, packageName);

    if (paymentTotal) {
      paymentTotal.textContent = formatCurrency(getTotalAmount());
    }

    if (downpaymentAmount) {
      downpaymentAmount.textContent = formatCurrency(getDownpaymentAmount());
    }

    if (remainingBalance) {
      remainingBalance.textContent = formatCurrency(getRemainingBalance());
    }
  }

  async function loadPaymentData() {
    if (!pendingPaymentRaw) {
      disablePaymentForm("No pending payment found. Please create a reservation first.");
      return;
    }

    try {
      pendingPayment = JSON.parse(pendingPaymentRaw);
    } catch (error) {
      console.error("Invalid pendingPayment:", error);
      localStorage.removeItem("pendingPayment");
      disablePaymentForm("Invalid payment data. Please create a reservation again.");
      return;
    }

    if (clientRaw) {
      try {
        client = JSON.parse(clientRaw);
      } catch {
        client = null;
      }
    }

    renderPaymentDetails();

    const reservationId =
      pendingPayment.reservation_id ||
      pendingPayment.reservationId;

    if (reservationId && reservationId !== "Pending") {
      latestReservation = await fetchReservationById(reservationId);
      renderPaymentDetails();
    }

    if (!getReservationId()) {
      showMessage("Reservation ID is missing. Please create the reservation again.", "error");
    }

    if (!getTotalAmount() || getTotalAmount() <= 0) {
      showMessage("Warning: total amount is missing or zero. Please check the reservation data.", "error");
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
        />
      `;
    };

    reader.readAsDataURL(file);
  }

  async function submitPayment(e) {
    e.preventDefault();

    if (!pendingPayment) {
      showMessage("No pending payment found.", "error");
      return;
    }

    const reservationId = getReservationId();

    if (!reservationId || reservationId === "Pending") {
      console.log("pendingPayment missing reservation_id:", pendingPayment);
      showMessage("Reservation ID is missing. Please create the reservation again.", "error");
      return;
    }

    const method = getSelectedPaymentMethod();
    const proofFile = proofInput?.files?.[0] || null;

    if (!method) {
      showMessage("Please select a payment method.", "error");
      return;
    }

    if (!proofFile) {
      showMessage("Please upload proof of 70% downpayment.", "error");
      return;
    }

    if (!proofFile.type.startsWith("image/")) {
      showMessage("Please upload image file only.", "error");
      return;
    }

    const submitButton = paymentForm.querySelector('button[type="submit"]');
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "Submitting...";
    }

    showMessage("Uploading proof of 70% downpayment...");

    try {
      const formData = new FormData();
      formData.append("reservation_id", Number(reservationId));
      formData.append("payment_method", method);
      formData.append("proof_of_payment", proofFile);

      const response = await fetch(UPLOAD_PROOF_API, {
        method: "POST",
        body: formData
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

        if (submitButton) {
          submitButton.disabled = false;
          submitButton.textContent = "Proceed Payment";
        }

        return;
      }

      showMessage(
        result.message ||
        `70% downpayment submitted successfully. Remaining 30% balance is ${formatCurrency(getRemainingBalance())}, payable on the event day.`,
        "success"
      );

      localStorage.removeItem("pendingPayment");

      setTimeout(() => {
        window.location.href = "../index.html";
      }, 1800);

    } catch (error) {
      console.error("Payment submit error:", error);
      showMessage(`Cannot upload proof: ${error.message}`, "error");

      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = "Proceed Payment";
      }
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