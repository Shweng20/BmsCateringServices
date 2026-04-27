document.addEventListener("DOMContentLoaded", function () {
const API_BASE = "https://bmscatering-api.azurewebsites.net";
const RESERVATION_API = `${API_BASE}/Reservation`;
const MENU_API = `${API_BASE}/Menu`;
const DECORATION_API = `${API_BASE}/Decoration`;
const HOST_API = `${API_BASE}/Host`;
const SOUND_LIGHT_API = `${API_BASE}/SoundLight`;

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

  const pastaChoiceChip = document.getElementById("pastaChoiceChip");
  const dietPastaInput = document.getElementById("dietPasta");

  const menuList = document.getElementById("menuList");
  const menuEmptyState = document.getElementById("menuEmptyState");
  const selectedFoodList = document.getElementById("selectedFoodList");
  const selectedCountBadge = document.getElementById("selectedCountBadge");

  const menuChoiceInput = document.getElementById("menu_choice");
  const selectedSetPreview = document.getElementById("selectedSetPreview");
  const selectedSetBadge = document.getElementById("selectedSetBadge");
  const selectedSetList = document.getElementById("selectedSetList");

  const hostOptionInput = document.getElementById("host_option");
  const soundLightOptionInput = document.getElementById("sound_light_option");

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

  function getMenuChoiceGroup() {
    if (!menuChoiceInput) return null;

    return (
      menuChoiceInput.closest(".form-group") ||
      menuChoiceInput.closest(".form-control-group") ||
      menuChoiceInput.closest(".input-group") ||
      menuChoiceInput.parentElement
    );
  }

  function getSelectedPackageId() {
    const rawPackage = localStorage.getItem("selectedPackage");

    if (rawPackage) {
      try {
        const selectedPackage = JSON.parse(rawPackage);

        const packageId = Number(
          selectedPackage.package_id ||
          selectedPackage.packageId ||
          selectedPackage.id ||
          0
        );

        if (packageId > 0) return packageId;
      } catch (error) {
        console.error("Invalid selectedPackage while getting package_id:", error);
      }
    }

    const packageName = packageNameInput.value.trim().toLowerCase();

    if (packageName.includes("package 1")) return 9;
    if (packageName.includes("package 2")) return 10;
    if (packageName.includes("package 3")) return 11;

    return 0;
  }

  function isPackage3() {
    return packageNameInput.value.trim().toLowerCase().includes("package 3");
  }

  function isPackage1() {
    return packageNameInput.value.trim().toLowerCase().includes("package 1");
  }

  function isPackage2() {
    return packageNameInput.value.trim().toLowerCase().includes("package 2");
  }

  function updatePastaChoiceVisibility() {
    if (!pastaChoiceChip) return;

    if (isPackage2() && !isPackage3()) {
      pastaChoiceChip.classList.remove("hidden");
    } else {
      pastaChoiceChip.classList.add("hidden");

      if (dietPastaInput) {
        dietPastaInput.checked = false;
      }
    }
  }

  function isRiceOrDrink(item) {
    const foodName = String(item.food_name || "").toLowerCase();
    const category = String(item.category || "").toLowerCase();
    const description = String(item.description || "").toLowerCase();

    return (
      category.includes("rice") ||
      category.includes("drink") ||
      category.includes("beverage") ||
      description.includes("rice") ||
      description.includes("drink") ||
      description.includes("beverage") ||
      foodName.includes("rice") ||
      foodName.includes("pandan rice") ||
      foodName.includes("normal rice") ||
      foodName.includes("drink") ||
      foodName.includes("juice") ||
      foodName.includes("iced tea") ||
      foodName.includes("softdrink") ||
      foodName.includes("soft drink") ||
      foodName.includes("beverage")
    );
  }

  function isDessert(item) {
    const foodName = String(item.food_name || "").toLowerCase();
    const category = String(item.category || "").toLowerCase();
    const description = String(item.description || "").toLowerCase();

    return (
      category.includes("dessert") ||
      description.includes("dessert") ||
      foodName.includes("dessert") ||
      foodName.includes("cake") ||
      foodName.includes("salad") ||
      foodName.includes("crepe") ||
      foodName.includes("leche flan") ||
      foodName.includes("buko pandan") ||
      foodName.includes("jell-o") ||
      foodName.includes("jello") ||
      foodName.includes("mango") ||
      foodName.includes("fruit salad") ||
      foodName.includes("macapuno")
    );
  }

  function isPasta(item) {
    const foodName = String(item.food_name || "").toLowerCase();
    const category = String(item.category || "").toLowerCase();
    const description = String(item.description || "").toLowerCase();

    return (
      category.includes("pasta") ||
      description.includes("pasta") ||
      foodName.includes("pasta") ||
      foodName.includes("spaghetti") ||
      foodName.includes("carbonara")
    );
  }

  function getSelectedFoodMenus() {
    return [...selectedMenus.values()].filter(item => {
      if (isRiceOrDrink(item)) return false;

      if (isPackage1()) {
        return !isDessert(item);
      }

      if (isPackage2()) {
        return !isDessert(item) && !isPasta(item);
      }

      return true;
    });
  }

  function getSelectedDesserts() {
    return [...selectedMenus.values()].filter(item => isDessert(item));
  }

  function getSelectedPastas() {
    return [...selectedMenus.values()].filter(item => isPasta(item));
  }

  function getPackageFoodLimit() {
    if (isPackage1()) return 4;
    if (isPackage2()) return 5;
    return null;
  }

  function getPackageDessertLimit() {
    if (isPackage1()) return 1;
    if (isPackage2()) return 1;
    return null;
  }

  function getPackagePastaLimit() {
    if (isPackage2()) return 1;
    return null;
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

  function getSelectedHostPrice() {
    if (!hostOptionInput || !hostOptionInput.value) return 0;

    return Number(
      hostOptionInput.options[hostOptionInput.selectedIndex]?.dataset.price || 0
    );
  }

  function getSelectedHostName() {
    if (!hostOptionInput || !hostOptionInput.value) return "";

    return hostOptionInput.options[hostOptionInput.selectedIndex]?.dataset.name || "";
  }

  function getSelectedSoundLightPrice() {
    if (!soundLightOptionInput || !soundLightOptionInput.value) return 0;

    return Number(
      soundLightOptionInput.options[soundLightOptionInput.selectedIndex]?.dataset.price || 0
    );
  }

  function getSelectedSoundLightName() {
    if (!soundLightOptionInput || !soundLightOptionInput.value) return "";

    return soundLightOptionInput.options[soundLightOptionInput.selectedIndex]?.dataset.name || "";
  }

  function getMenusByBuffetSet(setCategory) {
    return menuCatalog
      .filter(item =>
        String(item.category || "").trim().toLowerCase() ===
        String(setCategory || "").trim().toLowerCase()
      )
      .map(item => ({
        menu_id: item.menu_id,
        food_name: item.food_name,
        category: item.category,
        description: item.description,
        quantity: 1
      }));
  }

  function handleMenuChoice() {
    if (!menuChoiceInput) return;

    const choice = menuChoiceInput.value;

    const menuChoiceGroup = getMenuChoiceGroup();
    const menuSection = document.querySelector(".menu-section");
    const selectionBox = document.querySelector(".selection-box:not(#selectedSetPreview)");
    const filterRow = document.querySelector(".filter-row");
    const clientRequestGroup = clientRequestInput?.closest(".form-group");

    selectedMenus.clear();

    if (isPackage3()) {
      if (menuChoiceGroup) menuChoiceGroup.classList.add("hidden");
      if (selectedSetPreview) selectedSetPreview.classList.add("hidden");
      if (menuSection) menuSection.classList.add("hidden");
      if (selectionBox) selectionBox.classList.add("hidden");
      if (filterRow) filterRow.classList.add("hidden");
      if (clientRequestGroup) clientRequestGroup.classList.add("hidden");

      menuChoiceInput.value = "";
      renderSelectedFood();
      return;
    }

    if (menuChoiceGroup) menuChoiceGroup.classList.remove("hidden");

    if (choice === "Customize") {
      if (selectedSetPreview) selectedSetPreview.classList.add("hidden");

      if (menuSection) menuSection.classList.remove("hidden");
      if (selectionBox) selectionBox.classList.remove("hidden");
      if (filterRow) filterRow.classList.remove("hidden");
      if (clientRequestGroup) clientRequestGroup.classList.remove("hidden");

      updatePastaChoiceVisibility();
      renderMenu();
      renderSelectedFood();
      return;
    }

    if (["Buffet A", "Buffet B", "Buffet C", "Buffet D"].includes(choice)) {
      const setMenus = getMenusByBuffetSet(choice);

      if (menuSection) menuSection.classList.add("hidden");
      if (selectionBox) selectionBox.classList.add("hidden");
      if (filterRow) filterRow.classList.add("hidden");
      if (clientRequestGroup) clientRequestGroup.classList.add("hidden");

      if (selectedSetPreview) selectedSetPreview.classList.remove("hidden");
      if (selectedSetBadge) selectedSetBadge.textContent = choice.replace("Buffet", "Set");

      if (selectedSetList) {
        if (setMenus.length === 0) {
          selectedSetList.className = "selected-food-list empty-state";
          selectedSetList.textContent = `No menu found for ${choice}. Check Menu.category in database.`;
        } else {
          selectedSetList.className = "selected-food-list";
          selectedSetList.innerHTML = setMenus.map(item => `
            <div class="selected-food-item">
              <div>
                <strong>${escapeHtml(item.food_name)}</strong>
                <span>${escapeHtml(item.category || item.description || "Menu")}</span>
              </div>
              <span class="count-badge">Included</span>
            </div>
          `).join("");
        }
      }

      renderSelectedFood();
      return;
    }

    if (selectedSetPreview) selectedSetPreview.classList.remove("hidden");
    if (selectedSetBadge) selectedSetBadge.textContent = "No set selected";

    if (selectedSetList) {
      selectedSetList.className = "selected-food-list empty-state";
      selectedSetList.textContent = "Please choose Set A, B, C, D, or Customize.";
    }

    if (menuSection) menuSection.classList.add("hidden");
    if (selectionBox) selectionBox.classList.add("hidden");
    if (filterRow) filterRow.classList.add("hidden");
    if (clientRequestGroup) clientRequestGroup.classList.add("hidden");

    renderSelectedFood();
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
      updatePastaChoiceVisibility();
    } catch (error) {
      console.error("Invalid selectedPackage:", error);
      localStorage.removeItem("selectedPackage");
      computePricing();
      updatePastaChoiceVisibility();
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
    const menuChoiceGroup = getMenuChoiceGroup();

    if (isPackage3()) {
      if (package3Options) package3Options.classList.remove("hidden");
      if (menuChoiceGroup) menuChoiceGroup.classList.add("hidden");
      if (selectedSetPreview) selectedSetPreview.classList.add("hidden");

      selectedMenus.clear();

      if (menuChoiceInput) {
        menuChoiceInput.value = "";
      }
    } else {
      if (package3Options) package3Options.classList.add("hidden");
      if (menuChoiceGroup) menuChoiceGroup.classList.remove("hidden");
    }

    updatePastaChoiceVisibility();
    updateTableCount();
    handleMenuChoice();
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

    const hostPrice = getSelectedHostPrice();
    const soundLightPrice = getSelectedSoundLightPrice();

    if (isPackage3()) {
      if (extraChargeLabel) {
        extraChargeLabel.textContent = "Table reservation charge (₱200/head)";
      }

      const paxForTable = expectedPax > 0 ? expectedPax : 40;
      const tableCount = Math.ceil(paxForTable / 8);

      tableReservationAmount = paxForTable * PACKAGE3_TABLE_RATE_PER_PAX;
      decorationPrice = getSelectedDecorationPrice();
      totalAmount = tableReservationAmount + decorationPrice + hostPrice + soundLightPrice;

      basePriceText.textContent = `${paxForTable} pax × ${formatCurrency(PACKAGE3_TABLE_RATE_PER_PAX)}`;
      additionalPaxText.textContent = `${tableCount} table(s)`;
      extraChargeText.textContent =
        `Table: ${formatCurrency(tableReservationAmount)} + Decoration: ${formatCurrency(decorationPrice)} + Host: ${formatCurrency(hostPrice)} + Sound: ${formatCurrency(soundLightPrice)}`;
    } else {
      if (extraChargeLabel) {
        extraChargeLabel.textContent = "Extra pax charge + add-ons";
      }

      extraCharge = additionalPax * EXTRA_PAX_RATE;
      totalAmount = basePrice + extraCharge + hostPrice + soundLightPrice;

      basePriceText.textContent = formatCurrency(basePrice);
      additionalPaxText.textContent = additionalPax;
      extraChargeText.textContent =
        `Extra Pax: ${formatCurrency(extraCharge)} + Host: ${formatCurrency(hostPrice)} + Sound: ${formatCurrency(soundLightPrice)}`;
    }

    totalAmountText.textContent = formatCurrency(totalAmount);

    return {
      basePrice,
      minimumPax,
      expectedPax,
      additionalPax,
      tableCount: isPackage3() ? Math.ceil((expectedPax || 40) / 8) : null,
      tableReservationAmount,
      decorationPrice,
      hostPrice,
      soundLightPrice,
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
    localStorage.removeItem("clientToken");
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

  async function fetchHosts() {
    if (!hostOptionInput) return;

    hostOptionInput.innerHTML = `<option value="">Loading hosts...</option>`;

    try {
      const response = await fetch(HOST_API, {
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

      const hosts = (Array.isArray(data) ? data : []).filter(item => {
        const isDeleted = item.is_deleted ?? item.isDeleted ?? false;
        const status = String(item.availability_status ?? item.availabilityStatus ?? "").toLowerCase();

        return !isDeleted && status !== "unavailable";
      });

      hostOptionInput.innerHTML = `<option value="">No host selected</option>`;

      hosts.forEach(item => {
        const hostId = item.host_id ?? item.hostId;

        const hostName =
          item.host_name ??
          item.hostName ??
          item.full_name ??
          item.fullName ??
          item.name ??
          "Host";

        const specialization =
          item.specialization ??
          item.host_specialization ??
          item.hostSpecialization ??
          item.host_type ??
          item.hostType ??
          item.specialty ??
          "";

        const price = Number(
          item.professional_fee ??
          item.professionalFee ??
          item.price ??
          item.rate ??
          item.host_price ??
          item.hostPrice ??
          0
        );

        const hostDisplayName = specialization
          ? `${hostName} - ${specialization}`
          : hostName;

        const option = document.createElement("option");
        option.value = hostId;
        option.textContent = price > 0
          ? `${hostDisplayName} (${formatCurrency(price)})`
          : hostDisplayName;

        option.dataset.name = hostDisplayName;
        option.dataset.price = price;

        hostOptionInput.appendChild(option);
      });

      hostOptionInput.addEventListener("change", computePricing);
      computePricing();

    } catch (error) {
      console.error("Host load failed:", error);
      hostOptionInput.innerHTML = `<option value="">Failed to load hosts</option>`;
      showToast("Failed to load hosts from backend.", "error", 4000);
    }
  }

  async function fetchSoundLights() {
    if (!soundLightOptionInput) return;

    soundLightOptionInput.innerHTML = `<option value="">Loading sound systems...</option>`;

    try {
      const response = await fetch(SOUND_LIGHT_API, {
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

      const soundLights = (Array.isArray(data) ? data : []).filter(item => {
        const isDeleted = item.is_deleted ?? item.isDeleted ?? false;
        const status = String(item.availability_status ?? item.availabilityStatus ?? "").toLowerCase();

        return !isDeleted && status !== "unavailable";
      });

      soundLightOptionInput.innerHTML = `<option value="">No sound system selected</option>`;

      soundLights.forEach(item => {
        const soundLightId =
          item.sound_light_id ??
          item.soundLightId ??
          item.soundlight_id ??
          item.soundlightId;

        const serviceName =
          item.service_name ??
          item.serviceName ??
          item.sound_light_name ??
          item.soundLightName ??
          item.soundlight_name ??
          item.soundlightName ??
          item.name ??
          item.package_name ??
          item.packageName ??
          "Sound System";

        const price = Number(
          item.price ??
          item.rate ??
          item.sound_light_price ??
          item.soundLightPrice ??
          item.soundlight_price ??
          item.soundlightPrice ??
          0
        );

        const option = document.createElement("option");
        option.value = soundLightId;
        option.textContent = price > 0
          ? `${serviceName} (${formatCurrency(price)})`
          : serviceName;

        option.dataset.name = serviceName;
        option.dataset.price = price;

        soundLightOptionInput.appendChild(option);
      });

      soundLightOptionInput.addEventListener("change", computePricing);
      computePricing();

    } catch (error) {
      console.error("Sound system load failed:", error);
      soundLightOptionInput.innerHTML = `<option value="">Failed to load sound systems</option>`;
      showToast("Failed to load sound systems from backend.", "error", 4000);
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

      console.log("Loaded menuCatalog:", menuCatalog);

    } catch (error) {
      console.error("Menu catalog load failed:", error);
      menuCatalog = [];
      showToast("Failed to load menu from backend.", "error", 4000);
    }

    renderMenu();
    handleMenuChoice();
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
              <span class="menu-badge">${escapeHtml(item.category || item.description || "Menu")}</span>
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

        const foodLimit = getPackageFoodLimit();
        const dessertLimit = getPackageDessertLimit();
        const pastaLimit = getPackagePastaLimit();

        const isFreeGivenItem = isRiceOrDrink(item);
        const isDessertItem = isDessert(item);
        const isPastaItem = isPasta(item);

        const selectedFoodMenus = getSelectedFoodMenus();
        const selectedDesserts = getSelectedDesserts();
        const selectedPastas = getSelectedPastas();

        if (
          foodLimit !== null &&
          !isFreeGivenItem &&
          !isDessertItem &&
          !isPastaItem &&
          selectedFoodMenus.length >= foodLimit
        ) {
          showToast(
            `${isPackage2() ? "Package 2" : "Package 1"} allows up to ${foodLimit} food menu choices only.`,
            "warning",
            4000
          );
          return;
        }

        if (
          dessertLimit !== null &&
          isDessertItem &&
          selectedDesserts.length >= dessertLimit
        ) {
          showToast(
            `${isPackage2() ? "Package 2" : "Package 1"} allows up to ${dessertLimit} dessert only.`,
            "warning",
            4000
          );
          return;
        }

        if (
          pastaLimit !== null &&
          isPastaItem &&
          selectedPastas.length >= pastaLimit
        ) {
          showToast(
            `Package 2 allows only 1 pasta choice. Choose either Spaghetti or Carbonara.`,
            "warning",
            4000
          );
          return;
        }

        selectedMenus.set(menuId, {
          menu_id: item.menu_id,
          food_name: item.food_name,
          category: item.category,
          description: item.description,
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

    const foodLimit = getPackageFoodLimit();
    const dessertLimit = getPackageDessertLimit();
    const pastaLimit = getPackagePastaLimit();

    const selectedFoodMenus = getSelectedFoodMenus();
    const selectedDesserts = getSelectedDesserts();
    const selectedPastas = getSelectedPastas();

    if (isPackage1()) {
      selectedCountBadge.textContent =
        `${selectedFoodMenus.length}/${foodLimit} food • ${selectedDesserts.length}/${dessertLimit} dessert`;
    } else if (isPackage2()) {
      selectedCountBadge.textContent =
        `${selectedFoodMenus.length}/${foodLimit} food • ${selectedPastas.length}/${pastaLimit} pasta • ${selectedDesserts.length}/${dessertLimit} dessert`;
    } else {
      selectedCountBadge.textContent = `${items.length} item(s)`;
    }

    if (!items.length) {
      selectedFoodList.className = "selected-food-list empty-state";
      selectedFoodList.textContent = isPackage3()
        ? "No menu selection needed for Package 3."
        : "No food selected yet.";
      return;
    }

    selectedFoodList.className = "selected-food-list";
    selectedFoodList.innerHTML = items.map(item => `
      <div class="selected-food-item">
        <div>
          <strong>${escapeHtml(item.food_name)}</strong>
          <span>
            ${escapeHtml(item.description || item.category || "Menu")}
            ${
              isRiceOrDrink(item)
                ? " • Included / not counted"
                : isDessert(item)
                  ? ` • Dessert • Quantity: ${item.quantity}`
                  : isPasta(item)
                    ? ` • Pasta • Quantity: ${item.quantity}`
                    : ` • Food Menu • Quantity: ${item.quantity}`
            }
          </span>
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

    validRange: function () {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      return {
        start: today
      };
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
          .filter(item => {
            const isDeleted = item.is_deleted ?? item.isDeleted ?? false;
            const status = String(item.reservation_status ?? item.reservationStatus ?? "").toLowerCase();
            const eventDate = item.event_date ?? item.eventDate;

            return !isDeleted && eventDate && status !== "cancelled";
          })
          .map(item => ({
            id: item.reservation_id ?? item.reservationId,
            title: "Reserved",
            start: item.event_date ?? item.eventDate,
            allDay: true,
            backgroundColor: "#ef4444",
            borderColor: "#ef4444",
            textColor: "#ffffff"
          }));

        successCallback(events);
      } catch (error) {
        console.error("Calendar load error:", error);
        showToast("Unable to load reservation calendar.", "error", 4000);
        failureCallback(error);
      }
    },

    dateClick: function (info) {
      const clickedDate = new Date(info.dateStr + "T00:00:00");
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (clickedDate < today) {
        showToast("You cannot book a past date.", "warning", 3500);
        return;
      }

      const isAlreadyReserved = calendar.getEvents().some(event => {
        return event.startStr.substring(0, 10) === info.dateStr;
      });

      if (isAlreadyReserved) {
        showToast("This date is already reserved. Please choose another date.", "warning", 4000);
        return;
      }

      eventDateInput.value = info.dateStr;

      if (selectedDateCell) {
        selectedDateCell.classList.remove("fc-day-selected");
      }

      info.dayEl.classList.add("fc-day-selected");
      selectedDateCell = info.dayEl;
    },

    eventClick: function () {
      showToast("This date is already reserved. Please choose another date.", "warning", 4000);
    },

    dayCellDidMount: function (info) {
      const cellDate = new Date(info.date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (cellDate < today) {
        info.el.classList.add("calendar-past-date");
      }
    }
  });

  calendar.render();

  fetchMenuCatalog();
  fetchDecorations();
  fetchHosts();
  fetchSoundLights();

  renderSelectedFood();
  loadSelectedPackage();
  computePricing();
  handlePackageUI();

  packageNameInput.addEventListener("input", function () {
    applyPackagePrice();
    handlePackageUI();
  });

  packageNameInput.addEventListener("change", function () {
    applyPackagePrice();
    handlePackageUI();
  });

  [packagePriceInput, minimumPaxInput, expectedPaxInput].forEach(input => {
    input.addEventListener("input", computePricing);
  });

  [clientRequestInput, menuSearchInput, eventTypeInput].forEach(input => {
    input.addEventListener("input", renderMenu);
  });

  if (menuChoiceInput) {
    menuChoiceInput.addEventListener("change", handleMenuChoice);
  }

  document.querySelectorAll('input[name="diet"]').forEach(input => {
    input.addEventListener("change", renderMenu);
  });

  form.addEventListener("submit", async function (e) {
    e.preventDefault();

    if (!form.event_date.value) {
      showToast("Please select a date from the calendar.", "warning");
      return;
    }

    const selectedEventDate = new Date(form.event_date.value + "T00:00:00");
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);

    if (selectedEventDate < todayDate) {
      showToast("You cannot book a past date.", "warning", 4000);
      return;
    }

    const alreadyReserved = calendar.getEvents().some(event => {
      return event.startStr.substring(0, 10) === form.event_date.value;
    });

    if (alreadyReserved) {
      showToast("This date is already reserved. Please choose another date.", "warning", 4000);
      return;
    }

    const pricing = computePricing();
    const isPackageThree = isPackage3();

    if (pricing.minimumPax <= 0 || pricing.expectedPax <= 0) {
      showToast("Minimum pax and expected pax must be greater than zero.", "warning");
      return;
    }

    if (!isPackageThree && !menuChoiceInput.value) {
      showToast("Please choose Set A, Set B, Set C, Set D, or Customize Menu.", "warning");
      return;
    }

    if (!isPackageThree && menuChoiceInput.value === "Customize") {
      const selectedFoodCount = getSelectedFoodMenus().length;
      const selectedDessertCount = getSelectedDesserts().length;
      const selectedPastaCount = getSelectedPastas().length;

      if (isPackage1()) {
        if (selectedFoodCount < 4 || selectedDessertCount < 1) {
          showToast(
            "Package 1 requires 4 food choices and 1 dessert.",
            "warning",
            4000
          );
          return;
        }
      } else if (isPackage2()) {
        if (selectedFoodCount < 5 || selectedPastaCount < 1 || selectedDessertCount < 1) {
          showToast(
            "Package 2 requires 5 food choices, 1 pasta, and 1 dessert.",
            "warning",
            4000
          );
          return;
        }
      } else {
        if (selectedMenus.size === 0) {
          showToast("Please select at least one food item.", "warning");
          return;
        }
      }
    }

    if (
      !isPackageThree &&
      menuChoiceInput.value !== "Customize" &&
      getMenusByBuffetSet(menuChoiceInput.value).length === 0
    ) {
      showToast(`No menu found for ${menuChoiceInput.value}. Please check your Menu table.`, "warning", 4000);
      return;
    }

    const foodLimit = getPackageFoodLimit();
    const dessertLimit = getPackageDessertLimit();
    const pastaLimit = getPackagePastaLimit();

    if (
      !isPackageThree &&
      menuChoiceInput.value === "Customize" &&
      foodLimit !== null &&
      getSelectedFoodMenus().length > foodLimit
    ) {
      showToast(
        `${isPackage2() ? "Package 2" : "Package 1"} allows up to ${foodLimit} food menu choices only.`,
        "warning",
        4000
      );
      return;
    }

    if (
      !isPackageThree &&
      menuChoiceInput.value === "Customize" &&
      dessertLimit !== null &&
      getSelectedDesserts().length > dessertLimit
    ) {
      showToast(
        `${isPackage2() ? "Package 2" : "Package 1"} allows up to ${dessertLimit} dessert only.`,
        "warning",
        4000
      );
      return;
    }

    if (
      !isPackageThree &&
      menuChoiceInput.value === "Customize" &&
      pastaLimit !== null &&
      getSelectedPastas().length > pastaLimit
    ) {
      showToast(
        "Package 2 allows only 1 pasta choice. Choose either Spaghetti or Carbonara.",
        "warning",
        4000
      );
      return;
    }

    const decorationOption = document.getElementById("decoration_option");

    if (isPackageThree && decorationOption && !decorationOption.value) {
      showToast("Please select a decoration option.", "warning");
      return;
    }

    const rawTime = form.event_time.value;
    const safeTime = rawTime ? `${rawTime}:00` : "";

    const selectedPackageId = getSelectedPackageId();

    if (selectedPackageId <= 0) {
      showToast("Package ID is missing. Please go back to the packages page and select a package again.", "warning", 5000);
      return;
    }

    const selectedHostId =
      hostOptionInput && hostOptionInput.value
        ? Number(hostOptionInput.value)
        : null;

    const selectedSoundLightId =
      soundLightOptionInput && soundLightOptionInput.value
        ? Number(soundLightOptionInput.value)
        : null;

    const selectedDecorationId =
      decorationOption && decorationOption.value
        ? Number(decorationOption.value)
        : null;

    const selectedMenuPayload = isPackageThree
      ? []
      : menuChoiceInput.value === "Customize"
        ? [...selectedMenus.values()]
        : getMenusByBuffetSet(menuChoiceInput.value);

    const payload = {
      client_id: Number(clientId),
      package_id: selectedPackageId,

      host_id: selectedHostId,
      sound_light_id: selectedSoundLightId,
      decoration_id: selectedDecorationId,

      event_type: form.event_type.value.trim(),
      event_date: form.event_date.value,
      event_time: safeTime,
      venue: form.venue.value.trim(),

      package_name: form.package_name.value.trim(),
      package_price: pricing.basePrice,

      minimum_pax: pricing.minimumPax,
      expected_pax: pricing.expectedPax,
      additional_pax: pricing.additionalPax,

      extra_pax_charge: isPackageThree
        ? pricing.tableReservationAmount
        : pricing.extraCharge,

      total_amount: pricing.totalAmount,

      client_request:
        isPackageThree || menuChoiceInput.value !== "Customize"
          ? ""
          : form.client_request.value.trim(),

      menu_choice: isPackageThree ? null : menuChoiceInput.value,

      selected_menus: selectedMenuPayload,
      selected_menus_json: JSON.stringify(selectedMenuPayload),

      host_option: getSelectedHostName(),
      host_price: pricing.hostPrice || 0,

      sound_light_option: getSelectedSoundLightName(),
      sound_light_price: pricing.soundLightPrice || 0,

      table_count: isPackageThree ? pricing.tableCount : null,

      decoration_option: selectedDecorationId ? getSelectedDecorationName() : null,
      decoration_price: selectedDecorationId ? pricing.decorationPrice : 0
    };

    console.log("Reservation payload:", payload);

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
        showToast(
          result.message || "Booking request sent successfully! Redirecting to payment...",
          "success"
        );

        console.log("Reservation API result:", result);

        const newReservationId =
          result.reservation_id ||
          result.reservationId ||
          result.ReservationId ||
          result.id ||
          result.ID ||
          result.data?.reservation_id ||
          result.data?.reservationId ||
          result.data?.ReservationId ||
          null;

        if (!newReservationId) {
          console.error("Reservation was created but backend did not return reservation_id.", result);
          showToast(
            "Reservation created, but reservation ID was not returned. Please fix backend response.",
            "error",
            5000
          );
          return;
        }

        const paymentData = {
          reservation_id: newReservationId,

          client_id: Number(clientId),
          package_id: selectedPackageId,
          client_name: fullName,

          event_type: form.event_type.value.trim(),
          event_date: form.event_date.value,
          event_time: safeTime,
          venue: form.venue.value.trim(),

          package_name: form.package_name.value.trim(),
          package_price: pricing.basePrice,

          minimum_pax: pricing.minimumPax,
          expected_pax: pricing.expectedPax,
          additional_pax: pricing.additionalPax,

          extra_pax_charge: isPackageThree
            ? pricing.tableReservationAmount
            : pricing.extraCharge,

          host_id: selectedHostId,
          host_option: getSelectedHostName(),
          host_price: pricing.hostPrice || 0,

          sound_light_id: selectedSoundLightId,
          sound_light_option: getSelectedSoundLightName(),
          sound_light_price: pricing.soundLightPrice || 0,

          decoration_id: selectedDecorationId,
          decoration_option: selectedDecorationId ? getSelectedDecorationName() : null,
          decoration_price: selectedDecorationId ? pricing.decorationPrice : 0,

          selected_menus: selectedMenuPayload,

          total_amount: pricing.totalAmount
        };

        console.log("Saved pendingPayment:", paymentData);

        localStorage.setItem("pendingPayment", JSON.stringify(paymentData));

        setTimeout(() => {
          window.location.href = "./payment.html";
        }, 1200);
      } else {
        showToast(
          result.message || `Failed to submit booking. HTTP ${response.status}`,
          "error",
          4000
        );
      }
    } catch (error) {
      console.error("Submit error:", error);
      showToast("Server connection error.", "error", 4000);
    }
  });
});