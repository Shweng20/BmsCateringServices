document.addEventListener("DOMContentLoaded", async () => {
  setClientNavbar();

  const API_BASE = "https://bmscatering-api.azurewebsites.net";
  const PACKAGE_API = `${API_BASE}/Package`;
  const MOST_BOOKED_API = `${API_BASE}/api/Report/most-booked-package`;

  const loadingState = document.getElementById("loadingState");
  const errorState = document.getElementById("errorState");
  const emptyState = document.getElementById("emptyState");
  const packageGrid = document.getElementById("packageGrid");

  let mostBookedPackageName = "";

  function getStoredClient() {
    const raw = localStorage.getItem("clientUser");
    if (!raw) return null;

    try {
      return JSON.parse(raw);
    } catch {
      localStorage.removeItem("clientUser");
      return null;
    }
  }

  function setClientNavbar() {
    const client = getStoredClient();
    const loginBtn = document.querySelector(".login-btn");

    if (!loginBtn) return;

    if (!client) {
      loginBtn.textContent = "Client Login";
      loginBtn.href = "../UserLogin/login.html";
      return;
    }

    const fullName =
      client.full_name ||
      client.fullName ||
      client.name ||
      "Client";

    loginBtn.textContent = fullName;
    loginBtn.href = "../profile/profile.html";
  }

  function normalizeName(value) {
    return String(value || "").trim().toLowerCase();
  }

  function isMostBooked(packageName) {
    return normalizeName(packageName) === normalizeName(mostBookedPackageName);
  }

  async function loadMostBookedPackage() {
    try {
      const response = await fetch(MOST_BOOKED_API, {
        method: "GET",
        headers: {
          Accept: "application/json"
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      const first = Array.isArray(data) ? data[0] : data;

      mostBookedPackageName =
        first?.package_name ||
        first?.packageName ||
        first?.PackageName ||
        "";
    } catch (error) {
      console.error("Most booked package error:", error);
      mostBookedPackageName = "";
    }
  }

  function getPackageImage(packageName) {
    const name = normalizeName(packageName);

    if (name.includes("package 1") || name.includes("1")) {
      return "https://images.unsplash.com/photo-1544025162-d76694265947?q=80&w=1200&auto=format&fit=crop";
    }

    if (name.includes("package 2") || name.includes("2")) {
      return "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?q=80&w=1200&auto=format&fit=crop";
    }

    if (name.includes("package 3") || name.includes("3")) {
      return "https://images.unsplash.com/photo-1464306076886-da185f6a9d05?q=80&w=1200&auto=format&fit=crop";
    }

    return "https://images.unsplash.com/photo-1555244162-803834f70033?q=80&w=1200&auto=format&fit=crop";
  }

  function getPackagePrice(packageName, price) {
    const name = normalizeName(packageName);

    if (name.includes("package 1")) return 16000;
    if (name.includes("package 2")) return 20000;
    if (name.includes("package 3")) return Number(price || 0);

    return Number(price || 0);
  }

  function formatPrice(packageName, price) {
    const packagePrice = getPackagePrice(packageName, price);

    if (!packagePrice || packagePrice <= 0) {
      return "Custom Pricing Available";
    }

    return `Starts at ₱${packagePrice.toLocaleString("en-PH")}`;
  }

  function createPackageCard(pkg) {
    const packageName = pkg.package_name || pkg.packageName || "Unnamed Package";
    const description = pkg.description || "No description available for this package yet.";
    const packagePrice = getPackagePrice(packageName, pkg.price);
    const imageUrl = getPackageImage(packageName);
    const featured = isMostBooked(packageName);

    const card = document.createElement("article");
    card.className = featured
      ? "package-card package-card--featured"
      : "package-card";

    card.innerHTML = `
      <div class="package-card__image-wrap">
        ${featured ? `<span class="featured-badge">Most Booked</span>` : ""}
        <img src="${imageUrl}" alt="${packageName}" class="package-card__image" />
      </div>

      <div class="package-card__body">
        <div class="package-card__top">
          <h3 class="package-card__title">${packageName}</h3>
          <span class="badge badge--available">Available</span>
        </div>

        <p class="package-card__description">${description}</p>

        <div class="package-meta">
          <div class="package-meta__row">
            <span>Minimum: 40 pax</span>
            <span>No maximum limit</span>
          </div>
        </div>

        <div class="package-price">${formatPrice(packageName, pkg.price)}</div>

        <button class="package-btn" type="button">Choose Package</button>
      </div>
    `;

    const button = card.querySelector(".package-btn");

    button.addEventListener("click", () => {
      const selectedPackage = {
        package_id: pkg.package_id || pkg.packageId || null,
        package_name: packageName,
        packageName: packageName,
        price: packagePrice,
        pax: 40,
        availability_status: "Available"
      };

      localStorage.setItem("selectedPackage", JSON.stringify(selectedPackage));
      window.location.href = "../reservation/reservation.html";
    });

    return card;
  }

  try {
    await loadMostBookedPackage();

    const response = await fetch(PACKAGE_API, {
      method: "GET",
      headers: {
        Accept: "application/json"
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    let packages = (Array.isArray(data) ? data : []).filter(pkg => {
      return !(pkg.is_deleted ?? pkg.isDeleted ?? false);
    });

    packages.sort((a, b) => {
      const aName = a.package_name || a.packageName || "";
      const bName = b.package_name || b.packageName || "";

      if (isMostBooked(aName)) return -1;
      if (isMostBooked(bName)) return 1;
      return 0;
    });

    if (loadingState) loadingState.classList.add("hidden");

    if (packages.length === 0) {
      if (emptyState) emptyState.classList.remove("hidden");
      return;
    }

    if (packageGrid) {
      packageGrid.innerHTML = "";

      packages.forEach(pkg => {
        packageGrid.appendChild(createPackageCard(pkg));
      });

      packageGrid.classList.remove("hidden");
    }

  } catch (error) {
    console.error("Package load error:", error);

    if (loadingState) loadingState.classList.add("hidden");
    if (errorState) errorState.classList.remove("hidden");
  }
});