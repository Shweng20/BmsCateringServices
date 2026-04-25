document.addEventListener("DOMContentLoaded", function () {
  const API_BASE = "https://localhost:7241";
  const RESERVATION_API = `${API_BASE}/Reservation`;
  const MENU_API = `${API_BASE}/Menu`;
  const DECORATION_API = `${API_BASE}/Decoration`;
  const EXTRA_PAX_RATE = 400;
  const PACKAGE3_TABLE_RATE_PER_PAX = 200;

  const toastContainer = document.getElementById("toastContainer");
  const eventDateInput = document.getElementById("event_date");
  const calendarEl = document.getElementById("calendar");
  const form = document.getElementById("resForm");

  const packageNameInput = document.getElementById("package_name");
  const packagePriceInput = document.getElementById("package_price");
  const minimumPaxInput = document.getElementById("minimum_pax");
  const expectedPaxInput = document.getElementById("expected_pax");

  const clientRequestInput = document.getElementById("client_request");
  const menuSearchInput = document.getElementById("menuSearch");
  const eventTypeInput = document.getElementById("event_type");

  const menuList = document.getElementById("menuList");
  const menuEmptyState = document.getElementById("menuEmptyState");
  const selectedFoodList = document.getElementById("selectedFoodList");
  const selectedCountBadge = document.getElementById("selectedCountBadge");

  const basePriceText = document.getElementById("basePriceText");
  const additionalPaxText = document.getElementById("additionalPaxText");
  const extraChargeText = document.getElementById("extraChargeText");
  const extraChargeLabel = document.getElementById("extraChargeLabel");
  const totalAmountText = document.getElementById("totalAmountText");

  let selectedDateCell = null;
  let menuCatalog = [];
  let selectedMenus = new Map();

  const PACKAGE_PRICES = {
    package1: 16000,
    "package 1": 16000,
    package2: 20000,
    "package 2": 20000
  };

  minimumPaxInput.value = 40;
  minimumPaxInput.readOnly = true;

  function showToast(message, type = "info", duration = 3000) {
    if (!toastContainer) {
      alert(message);
      return;
    }

    const toast = document.createElement("div");
    toast.className = `toast toast--${type}`;
    toast.textContent = message;
    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.classList.add("hide");
      setTimeout(() => toast.remove(), 250);
    }, duration);
  }

  function redirectWithToast(message, type, url, delay = 1300) {
    showToast(message, type, delay);
    setTimeout(() => {
      window.location.href = url;
    }, delay);
  }

  function formatCurrency(value) {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 2
    }).format(Number(value || 0));
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function getValue(item, snakeKey, camelKey) {
    return item?.[snakeKey] ?? item?.[camelKey] ?? "";
  }

  function isPackage3() {
    return packageNameInput.value.trim().toLowerCase().includes("package 3");
  }

  function getCheckedTags() {
    return [...document.querySelectorAll('input[name="diet"]:checked')]
      .map(x => x.value.trim().toLowerCase());
  }

  function getSelectedDecorationPrice() {
    const decorationSelect = document.getElementById("decoration_option");
    if (!decorationSelect) return 0;

    return Number(
      decorationSelect.options[decorationSelect.selectedIndex]?.dataset.price || 0
    );
  }

  function getSelectedDecorationName() {
    const decorationSelect = document.getElementById("decoration_option");
    if (!decorationSelect) return "";

    return decorationSelect.options[decorationSelect.selectedIndex]?.dataset.name || "";
  }

  function applyPackagePrice() {
    const packageName = packageNameInput.value.trim().toLowerCase();

    if (PACKAGE_PRICES[packageName]) {
      packagePriceInput.value = PACKAGE_PRICES[packageName];
    }

    if (packageName.includes("package 3")) {
      packagePriceInput.value = 0;
    }

    minimumPaxInput.value = 40;
    minimumPaxInput.readOnly = true;
    computePricing();
  }

  function loadSelectedPackage() {
    const rawPackage = localStorage.getItem("selectedPackage");

    if (!rawPackage) {
      computePricing();
      return;
    }

    try {
      const selectedPackage = JSON.parse(rawPackage);

      const packageName =
        selectedPackage.package_name ||
        selectedPackage.packageName ||
        "";

      const packagePrice =
        selectedPackage.price ||
        selectedPackage.package_price ||
        selectedPackage.packagePrice ||
        0;

      packageNameInput.value = packageName;
      packagePriceInput.value = packageName.toLowerCase().includes("package 3")
        ? 0
        : packagePrice;

      minimumPaxInput.value = 40;
      minimumPaxInput.readOnly = true;

      computePricing();
    } catch (error) {
      console.error("Invalid selectedPackage:", error);
      localStorage.removeItem("selectedPackage");
      computePricing();
    }
  }

  function updateTableCount() {
    const tableCountInput = document.getElementById("table_count");
    if (!tableCountInput) return;

    if (isPackage3()) {
      const expectedPax = Number(expectedPaxInput.value || 40);
      const tableCount = Math.ceil(expectedPax / 8);
      tableCountInput.value = `${tableCount} table(s) for ${expectedPax} pax`;
    } else {
      tableCountInput.value = "";
    }
  }

  function handlePackageUI() {
    const package3Options = document.getElementById("package3Options");
    const menuSection = document.querySelector(".menu-section");
    const selectionBox = document.querySelector(".selection-box");
    const filterRow = document.querySelector(".filter-row");
    const clientRequestGroup = clientRequestInput?.closest(".form-group");

    if (!package3Options) return;

    if (isPackage3()) {
      package3Options.classList.remove("hidden");

      if (menuSection) menuSection.classList.add("hidden");
      if (selectionBox) selectionBox.classList.add("hidden");
      if (filterRow) filterRow.classList.add("hidden");
      if (clientRequestGroup) clientRequestGroup.classList.add("hidden");

      selectedMenus.clear();
      renderSelectedFood();
    } else {
      package3Options.classList.add("hidden");

      if (menuSection) menuSection.classList.remove("hidden");
      if (selectionBox) selectionBox.classList.remove("hidden");
      if (filterRow) filterRow.classList.remove("hidden");
      if (clientRequestGroup) clientRequestGroup.classList.remove("hidden");
    }

    updateTableCount();
  }

  function computePricing() {
  const basePrice = Number(packagePriceInput.value || 0);
  const minimumPax = Number(minimumPaxInput.value || 40);
  const expectedPax = Number(expectedPaxInput.value || 0);
  const additionalPax = Math.max(expectedPax - minimumPax, 0);

  let extraCharge = 0;
  let totalAmount = basePrice;
  let tableReservationAmount = 0;
  let decorationPrice = 0;

  if (isPackage3()) {
    if (extraChargeLabel) {
      extraChargeLabel.textContent = "Table reservation charge (₱200/head)";
    }

    const paxForTable = expectedPax > 0 ? expectedPax : 40;
    const tableCount = Math.ceil(paxForTable / 8);

    tableReservationAmount = paxForTable * PACKAGE3_TABLE_RATE_PER_PAX;
    decorationPrice = getSelectedDecorationPrice();
    totalAmount = tableReservationAmount + decorationPrice;

    basePriceText.textContent = `${paxForTable} pax × ${formatCurrency(PACKAGE3_TABLE_RATE_PER_PAX)}`;
    additionalPaxText.textContent = `${tableCount} table(s)`;
    extraChargeText.textContent =
      `Table: ${formatCurrency(tableReservationAmount)} + Decoration: ${formatCurrency(decorationPrice)}`;
  } else {
    if (extraChargeLabel) {
      extraChargeLabel.textContent = "Extra pax charge (₱400/head)";
    }

    extraCharge = additionalPax * EXTRA_PAX_RATE;
    totalAmount = basePrice + extraCharge;

    basePriceText.textContent = formatCurrency(basePrice);
    additionalPaxText.textContent = additionalPax;
    extraChargeText.textContent = formatCurrency(extraCharge);
  }

  totalAmountText.textContent = formatCurrency(totalAmount);
  handlePackageUI();

  return {
    basePrice,
    minimumPax,
    expectedPax,
    additionalPax,
    tableCount: isPackage3() ? Math.ceil((expectedPax || 40) / 8) : null,
    tableReservationAmount,
    decorationPrice,
    extraCharge,
    totalAmount
  };
}

  const clientData = localStorage.getItem("clientUser");

  if (!clientData) {
    redirectWithToast("Please login first.", "warning", "../UserLogin/login.html");
    return;
  }

  let client;

  try {
    client = JSON.parse(clientData);
  } catch {
    localStorage.removeItem("clientUser");
    redirectWithToast("Invalid session. Please login again.", "error", "../UserLogin/login.html");
    return;
  }

  const clientId = client.client_id ?? client.clientId;

  if (!clientId) {
    localStorage.removeItem("clientUser");
    redirectWithToast("Client session is missing. Please login again.", "error", "../UserLogin/login.html");
    return;
  }

  const fullName = client.full_name || client.fullName || "User";

  const navAvatar = document.getElementById("navAvatar");
  const navUserName = document.getElementById("navUserName");
  const dropdownUserName = document.getElementById("dropdownUserName");
  const toggleBtn = document.getElementById("profileToggleBtn");
  const dropdown = document.getElementById("profileDropdown");
  const logoutBtn = document.getElementById("logoutBtn");

  if (navAvatar) navAvatar.textContent = fullName.charAt(0).toUpperCase();
  if (navUserName) navUserName.textContent = fullName.split(" ")[0];
  if (dropdownUserName) dropdownUserName.textContent = fullName;

  if (toggleBtn && dropdown) {
    toggleBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      dropdown.classList.toggle("show");
    });

    document.addEventListener("click", function () {
      dropdown.classList.remove("show");
    });

    dropdown.addEventListener("click", function (e) {
      e.stopPropagation();
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener("click", function () {
      localStorage.removeItem("clientUser");
      localStorage.removeItem("clientToken");
      window.location.href = "../UserLogin/login.html";
    });
  }

  async function fetchDecorations() {
    const decorationSelect = document.getElementById("decoration_option");
    if (!decorationSelect) return;

    decorationSelect.innerHTML = `<option value="">Loading decorations...</option>`;

    try {
      const response = await fetch(DECORATION_API, {
        method: "GET",
        headers: {
          Accept: "application/json"
        }
      });

      const raw = await response.text();
      const data = raw ? JSON.parse(raw) : [];

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const decorations = (Array.isArray(data) ? data : []).filter(item => {
        const isDeleted = item.is_deleted ?? item.isDeleted ?? false;
        const status = String(item.availability_status ?? item.availabilityStatus ?? "").toLowerCase();

        return !isDeleted && status !== "unavailable";
      });

      decorationSelect.innerHTML = `<option value="">Select decoration</option>`;

      decorations.forEach(item => {
        const decorationId = item.decoration_id ?? item.decorationId;
        const decorationType = item.decoration_type ?? item.decorationType ?? "Decoration";
        const theme = item.theme ?? "";
        const price = Number(item.price || 0);

        const option = document.createElement("option");
        option.value = decorationId;
        option.textContent = `${decorationType}${theme ? ` - ${theme}` : ""} (${formatCurrency(price)})`;
        option.dataset.price = price;
        option.dataset.name = decorationType;

        decorationSelect.appendChild(option);
      });

      decorationSelect.addEventListener("change", computePricing);
      computePricing();

    } catch (error) {
      console.error("Decoration load failed:", error);
      decorationSelect.innerHTML = `<option value="">Failed to load decorations</option>`;
      showToast("Failed to load decorations from backend.", "error", 4000);
    }
  }

  async function fetchMenuCatalog() {
    try {
      if (menuList) {
        menuList.innerHTML = `<div class="empty-state">Loading menu...</div>`;
      }

      const response = await fetch(MENU_API, {
        method: "GET",
        headers: {
          Accept: "application/json"
        }
      });

      const raw = await response.text();
      const data = raw ? JSON.parse(raw) : [];

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      menuCatalog = (Array.isArray(data) ? data : [])
        .filter(item => {
          const isDeleted = getValue(item, "is_deleted", "isDeleted");
          const status = String(getValue(item, "availability_status", "availabilityStatus")).toLowerCase();

          return !isDeleted && status !== "unavailable";
        })
        .map(item => ({
          menu_id: Number(getValue(item, "menu_id", "menuId")),
          food_name: getValue(item, "food_name", "foodName"),
          category: getValue(item, "category", "category"),
          description: getValue(item, "description", "description"),
          availability_status: getValue(item, "availability_status", "availabilityStatus")
        }));
    } catch (error) {
      console.error("Menu catalog load failed:", error);
      menuCatalog = [];
      showToast("Failed to load menu from backend.", "error", 4000);
    }

    renderMenu();
  }

  function getMenuScore(item) {
    const requestText = (clientRequestInput.value || "").toLowerCase();
    const searchText = (menuSearchInput.value || "").toLowerCase();
    const eventTypeText = (eventTypeInput.value || "").toLowerCase();
    const tags = getCheckedTags();

    const bag = `${item.food_name} ${item.category} ${item.description}`.toLowerCase();
    let score = 0;

    if (requestText) {
      const words = requestText.split(/[\s,]+/).filter(Boolean);
      for (const word of words) {
        if (bag.includes(word)) score += 3;
      }
    }

    if (searchText) {
      if (bag.includes(searchText)) score += 5;
      else return -9999;
    }

    if (tags.length > 0) {
      const tagMatched = tags.some(tag => bag.includes(tag));
      if (!tagMatched) return -9999;
      score += 4;
    }

    if (eventTypeText) {
      if (eventTypeText.includes("birthday") && bag.includes("dessert")) score += 2;
      if (eventTypeText.includes("wedding") && (bag.includes("beef") || bag.includes("seafood"))) score += 2;
      if (eventTypeText.includes("debut") && (bag.includes("pasta") || bag.includes("dessert"))) score += 2;
      if (eventTypeText.includes("corporate") && (bag.includes("chicken") || bag.includes("beef"))) score += 2;
    }

    return score;
  }

  function getFilteredMenu() {
    return [...menuCatalog]
      .map(item => ({ ...item, _score: getMenuScore(item) }))
      .filter(item => item._score > -9999)
      .sort((a, b) => {
        if (b._score !== a._score) return b._score - a._score;
        return a.food_name.localeCompare(b.food_name);
      });
  }

  function renderMenu() {
    if (!menuList || !menuEmptyState) return;

    if (isPackage3()) {
      menuList.innerHTML = "";
      menuEmptyState.classList.add("hidden");
      return;
    }

    const items = getFilteredMenu();
    menuList.innerHTML = "";

    if (!items.length) {
      menuEmptyState.classList.remove("hidden");
      return;
    }

    menuEmptyState.classList.add("hidden");

    items.forEach(item => {
      const selected = selectedMenus.get(item.menu_id);
      const qty = selected?.quantity || 1;

      const card = document.createElement("div");
      card.className = "menu-card";

      card.innerHTML = `
        <div class="menu-card__top">
          <div>
            <h4>${escapeHtml(item.food_name)}</h4>
            <div class="menu-meta">
              <span class="menu-badge">${escapeHtml(item.category || "Menu")}</span>
              ${item._score > 0 ? `<span class="menu-badge">Recommended</span>` : ""}
            </div>
          </div>
        </div>

        <p class="menu-desc">${escapeHtml(item.description || "No description available.")}</p>

        <div class="menu-card__actions">
          <input
            type="number"
            class="form-control qty-control"
            min="1"
            value="${qty}"
            data-qty-id="${item.menu_id}"
          />

          ${
            selected
              ? `<button type="button" class="small-btn small-btn--remove" data-remove-id="${item.menu_id}">Remove</button>`
              : `<button type="button" class="small-btn small-btn--add" data-add-id="${item.menu_id}">Add Food</button>`
          }
        </div>
      `;

      menuList.appendChild(card);
    });

    menuList.querySelectorAll("[data-add-id]").forEach(btn => {
      btn.addEventListener("click", function () {
        const menuId = Number(this.dataset.addId);
        const item = menuCatalog.find(x => x.menu_id === menuId);
        const qtyInput = menuList.querySelector(`[data-qty-id="${menuId}"]`);
        const quantity = Math.max(Number(qtyInput?.value || 1), 1);

        if (!item) return;

        selectedMenus.set(menuId, {
          menu_id: item.menu_id,
          food_name: item.food_name,
          category: item.category,
          quantity
        });

        renderMenu();
        renderSelectedFood();
      });
    });

    menuList.querySelectorAll("[data-remove-id]").forEach(btn => {
      btn.addEventListener("click", function () {
        const menuId = Number(this.dataset.removeId);
        selectedMenus.delete(menuId);
        renderMenu();
        renderSelectedFood();
      });
    });

    menuList.querySelectorAll("[data-qty-id]").forEach(input => {
      input.addEventListener("change", function () {
        const menuId = Number(this.dataset.qtyId);
        const quantity = Math.max(Number(this.value || 1), 1);
        this.value = quantity;

        if (selectedMenus.has(menuId)) {
          const selectedItem = selectedMenus.get(menuId);
          selectedItem.quantity = quantity;
          selectedMenus.set(menuId, selectedItem);
          renderSelectedFood();
        }
      });
    });
  }

  function renderSelectedFood() {
    if (!selectedFoodList || !selectedCountBadge) return;

    const items = [...selectedMenus.values()];
    selectedCountBadge.textContent = `${items.length} item(s)`;

    if (!items.length) {
      selectedFoodList.className = "selected-food-list empty-state";
      selectedFoodList.textContent = "No food selected yet.";
      return;
    }

    selectedFoodList.className = "selected-food-list";
    selectedFoodList.innerHTML = items.map(item => `
      <div class="selected-food-item">
        <div>
          <strong>${escapeHtml(item.food_name)}</strong>
          <span>${escapeHtml(item.category)} • Quantity: ${item.quantity}</span>
        </div>
        <span class="count-badge">x${item.quantity}</span>
      </div>
    `).join("");
  }

  const calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: "dayGridMonth",
    headerToolbar: {
      left: "prev,next today",
      center: "title",
      right: "dayGridMonth"
    },

    events: async function (fetchInfo, successCallback, failureCallback) {
      try {
        const url = `${RESERVATION_API}?start=${encodeURIComponent(fetchInfo.startStr)}&end=${encodeURIComponent(fetchInfo.endStr)}`;
        const response = await fetch(url);
        const rawText = await response.text();

        let data = [];

        try {
          data = rawText ? JSON.parse(rawText) : [];
        } catch {
          data = [];
        }

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const events = (data || [])
          .filter(item => !(item.is_deleted ?? item.isDeleted) && (item.event_date || item.eventDate))
          .map(item => ({
            id: item.reservation_id ?? item.reservationId,
            title: "Reserved",
            start: item.event_date ?? item.eventDate,
            allDay: true
          }));

        successCallback(events);
      } catch (error) {
        console.error("Calendar load error:", error);
        showToast("Unable to load reservation calendar.", "error", 4000);
        failureCallback(error);
      }
    },

    dateClick: function (info) {
      eventDateInput.value = info.dateStr;

      if (selectedDateCell) {
        selectedDateCell.classList.remove("fc-day-selected");
      }

      info.dayEl.classList.add("fc-day-selected");
      selectedDateCell = info.dayEl;
    }
  });

  calendar.render();
  fetchMenuCatalog();
  fetchDecorations();
  renderSelectedFood();
  loadSelectedPackage();
  computePricing();

  packageNameInput.addEventListener("input", applyPackagePrice);
  packageNameInput.addEventListener("change", applyPackagePrice);

  [packagePriceInput, minimumPaxInput, expectedPaxInput].forEach(input => {
    input.addEventListener("input", computePricing);
  });

  [clientRequestInput, menuSearchInput, eventTypeInput].forEach(input => {
    input.addEventListener("input", renderMenu);
  });

  document.querySelectorAll('input[name="diet"]').forEach(input => {
    input.addEventListener("change", renderMenu);
  });

  form.addEventListener("submit", async function (e) {
    e.preventDefault();

    if (!form.event_date.value) {
      showToast("Please select a date from the calendar.", "warning");
      return;
    }

    const pricing = computePricing();
    const isPackageThree = isPackage3();

    if (pricing.minimumPax <= 0 || pricing.expectedPax <= 0) {
      showToast("Minimum pax and expected pax must be greater than zero.", "warning");
      return;
    }

    if (!isPackageThree && selectedMenus.size === 0) {
      showToast("Please select at least one food item.", "warning");
      return;
    }

    const decorationOption = document.getElementById("decoration_option");

    if (isPackageThree && decorationOption && !decorationOption.value) {
      showToast("Please select a decoration option.", "warning");
      return;
    }

    const rawTime = form.event_time.value;
    const safeTime = rawTime ? `${rawTime}:00` : "";

    const payload = {
      client_id: Number(clientId),
      event_type: form.event_type.value.trim(),
      event_date: form.event_date.value,
      event_time: safeTime,
      venue: form.venue.value.trim(),
      package_name: form.package_name.value.trim(),
      package_price: pricing.basePrice,
      minimum_pax: pricing.minimumPax,
      expected_pax: pricing.expectedPax,
      additional_pax: pricing.additionalPax,
      extra_pax_charge: isPackageThree ? pricing.tableReservationAmount : pricing.extraCharge,
      total_amount: pricing.totalAmount,
      client_request: isPackageThree ? "" : form.client_request.value.trim(),
      selected_menus: isPackageThree ? [] : [...selectedMenus.values()],
      table_count: isPackageThree ? pricing.tableCount : null,
      decoration_id: isPackageThree && decorationOption ? Number(decorationOption.value) : null,
      decoration_option: isPackageThree ? getSelectedDecorationName() : null,
      decoration_price: isPackageThree ? pricing.decorationPrice : 0
    };

    try {
      const response = await fetch(RESERVATION_API, {
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

      if (response.ok) {
        showToast(result.message || "Booking request sent successfully!", "success");

        form.reset();
        eventDateInput.value = "";
        minimumPaxInput.value = 40;
        selectedMenus.clear();
        renderSelectedFood();
        computePricing();
        renderMenu();

        if (selectedDateCell) {
          selectedDateCell.classList.remove("fc-day-selected");
          selectedDateCell = null;
        }

        calendar.refetchEvents();
      } else {
        showToast(result.message || `Failed to submit booking. HTTP ${response.status}`, "error", 4000);
      }
    } catch (error) {
      console.error("Submit error:", error);
      showToast("Server connection error.", "error", 4000);
    }
  });
});