document.addEventListener("DOMContentLoaded", async () => {
  const PACKAGE_API = "https://localhost:7241/Package";

  const loadingState = document.getElementById("loadingState");
  const errorState = document.getElementById("errorState");
  const emptyState = document.getElementById("emptyState");
  const packageGrid = document.getElementById("packageGrid");

  function getPackageImage(packageName) {
    const name = (packageName || "").toLowerCase();

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

  function formatPrice(price) {
    if (price === null || price === undefined || price === "") {
      return "Custom Pricing Available";
    }

    const value = Number(price);

    if (Number.isNaN(value)) {
      return "Custom Pricing Available";
    }

    return `Starts at ₱${value.toLocaleString("en-PH")} / pax`;
  }

  function getBadge(status) {
    const raw = (status || "Unavailable").trim().toLowerCase();

    if (raw.includes("available")) {
      return '<span class="badge badge--available">Available</span>';
    }

    if (raw.includes("limited")) {
      return '<span class="badge badge--limited">Limited</span>';
    }

    return '<span class="badge badge--unavailable">Unavailable</span>';
  }

  function getButtonText(status) {
    const clean = (status || "").toLowerCase();

    if (clean.includes("available") || clean.includes("limited")) {
      return "Choose Package";
    }

    return "Inquire Now";
  }

  function createPackageCard(pkg) {
    const card = document.createElement("article");
    card.className = "package-card";

    const imageUrl = getPackageImage(pkg.package_name);
    const paxValue = pkg.pax ?? 40;

    card.innerHTML = `
      <div class="package-card__image-wrap">
        <img
          src="${imageUrl}"
          alt="${pkg.package_name || "Package"}"
          class="package-card__image"
        />
      </div>

      <div class="package-card__body">
        <div class="package-card__top">
          <h3 class="package-card__title">${pkg.package_name || "Unnamed Package"}</h3>
          ${getBadge(pkg.availability_status)}
        </div>

        <p class="package-card__description">
          ${pkg.description || "No description available for this package yet."}
        </p>

        <div class="package-meta">
          <div class="package-meta__row">
            <span>Minimum: ${paxValue} pax</span>
            <span>No maximum limit</span>
          </div>
        </div>

        <div class="package-price">${formatPrice(pkg.price)}</div>

        <button class="package-btn" type="button">
          ${getButtonText(pkg.availability_status)}
        </button>
      </div>
    `;

    const button = card.querySelector(".package-btn");
    button.addEventListener("click", () => {
      localStorage.setItem("selectedPackage", JSON.stringify(pkg));
      window.location.href = "../reservation/reservation.html";
    });

    return card;
  }

  try {
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
    const packages = (Array.isArray(data) ? data : []).filter(pkg => !pkg.is_deleted);

    loadingState.classList.add("hidden");

    if (packages.length === 0) {
      emptyState.classList.remove("hidden");
      return;
    }

    packageGrid.innerHTML = "";

    packages.forEach(pkg => {
      packageGrid.appendChild(createPackageCard(pkg));
    });

    packageGrid.classList.remove("hidden");
  } catch (error) {
    console.error("Package load error:", error);
    loadingState.classList.add("hidden");
    errorState.classList.remove("hidden");
  }
});