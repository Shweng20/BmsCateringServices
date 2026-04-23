// document.addEventListener("DOMContentLoaded", function () {
//   const API_BASE = "https://localhost:7241";
//   const RESERVATION_API = `${API_BASE}/Reservation`;
//   const MENU_API = `${RESERVATION_API}/menu-catalog`;
//   const EXTRA_PAX_RATE = 400;

//   const toastContainer = document.getElementById("toastContainer");
//   const eventDateInput = document.getElementById("event_date");
//   const calendarEl = document.getElementById("calendar");
//   const form = document.getElementById("resForm");

//   const packagePriceInput = document.getElementById("package_price");
//   const minimumPaxInput = document.getElementById("minimum_pax");
//   const expectedPaxInput = document.getElementById("expected_pax");

//   const clientRequestInput = document.getElementById("client_request");
//   const menuSearchInput = document.getElementById("menuSearch");
//   const eventTypeInput = document.getElementById("event_type");

//   const menuList = document.getElementById("menuList");
//   const menuEmptyState = document.getElementById("menuEmptyState");
//   const selectedFoodList = document.getElementById("selectedFoodList");
//   const selectedCountBadge = document.getElementById("selectedCountBadge");

//   const basePriceText = document.getElementById("basePriceText");
//   const additionalPaxText = document.getElementById("additionalPaxText");
//   const extraChargeText = document.getElementById("extraChargeText");
//   const totalAmountText = document.getElementById("totalAmountText");

//   let selectedDateCell = null;
//   let menuCatalog = [];
//   let selectedMenus = new Map();

//   function showToast(message, type = "info", duration = 3000) {
//     if (!toastContainer) {
//       console.log(`[${type.toUpperCase()}] ${message}`);
//       return;
//     }

//     const toast = document.createElement("div");
//     toast.className = `toast toast--${type}`;
//     toast.textContent = message;
//     toastContainer.appendChild(toast);

//     setTimeout(() => {
//       toast.classList.add("hide");
//       setTimeout(() => toast.remove(), 250);
//     }, duration);
//   }

//   function redirectWithToast(message, type, url, delay = 1300) {
//     showToast(message, type, delay);
//     setTimeout(() => {
//       window.location.href = url;
//     }, delay);
//   }

//   function formatCurrency(value) {
//     return new Intl.NumberFormat("en-PH", {
//       style: "currency",
//       currency: "PHP",
//       minimumFractionDigits: 2
//     }).format(Number(value || 0));
//   }

//   function escapeHtml(value) {
//     return String(value ?? "")
//       .replace(/&/g, "&amp;")
//       .replace(/</g, "&lt;")
//       .replace(/>/g, "&gt;")
//       .replace(/"/g, "&quot;")
//       .replace(/'/g, "&#39;");
//   }

//   function getCheckedTags() {
//     return [...document.querySelectorAll('input[name="diet"]:checked')].map(x =>
//       x.value.trim().toLowerCase()
//     );
//   }

//   function computePricing() {
//     const basePrice = Number(packagePriceInput.value || 0);
//     const minimumPax = Number(minimumPaxInput.value || 0);
//     const expectedPax = Number(expectedPaxInput.value || 0);

//     const additionalPax = Math.max(expectedPax - minimumPax, 0);
//     const extraCharge = additionalPax * EXTRA_PAX_RATE;
//     const totalAmount = basePrice + extraCharge;

//     basePriceText.textContent = formatCurrency(basePrice);
//     additionalPaxText.textContent = additionalPax;
//     extraChargeText.textContent = formatCurrency(extraCharge);
//     totalAmountText.textContent = formatCurrency(totalAmount);

//     return {
//       basePrice,
//       minimumPax,
//       expectedPax,
//       additionalPax,
//       extraCharge,
//       totalAmount
//     };
//   }

//   const clientData = localStorage.getItem("clientUser");

//   if (!clientData) {
//     redirectWithToast("Please login first.", "warning", "../UserLogin/login.html");
//     return;
//   }

//   let client;

//   try {
//     client = JSON.parse(clientData);
//   } catch (error) {
//     console.error("Invalid clientUser JSON:", error);
//     localStorage.removeItem("clientUser");
//     redirectWithToast("Invalid session. Please login again.", "error", "../UserLogin/login.html");
//     return;
//   }

//   if (!client.client_id) {
//     localStorage.removeItem("clientUser");
//     redirectWithToast("Client session is missing. Please login again.", "error", "../UserLogin/login.html");
//     return;
//   }

//   const fullName = client.full_name || "User";

//   const navAvatar = document.getElementById("navAvatar");
//   const navUserName = document.getElementById("navUserName");
//   const dropdownUserName = document.getElementById("dropdownUserName");
//   const toggleBtn = document.getElementById("profileToggleBtn");
//   const dropdown = document.getElementById("profileDropdown");
//   const logoutBtn = document.getElementById("logoutBtn");

//   if (navAvatar) navAvatar.textContent = fullName.charAt(0).toUpperCase();
//   if (navUserName) navUserName.textContent = fullName.split(" ")[0];
//   if (dropdownUserName) dropdownUserName.textContent = fullName;

//   if (toggleBtn && dropdown) {
//     toggleBtn.addEventListener("click", function (e) {
//       e.stopPropagation();
//       dropdown.classList.toggle("show");
//     });

//     document.addEventListener("click", function () {
//       dropdown.classList.remove("show");
//     });

//     dropdown.addEventListener("click", function (e) {
//       e.stopPropagation();
//     });
//   }

//   if (logoutBtn) {
//     logoutBtn.addEventListener("click", function () {
//       localStorage.removeItem("clientUser");
//       localStorage.removeItem("clientToken");
//       window.location.href = "../UserLogin/login.html";
//     });
//   }

//   async function fetchMenuCatalog() {
//     try {
//       const response = await fetch(MENU_API);
//       const raw = await response.text();
//       const data = raw ? JSON.parse(raw) : [];

//       if (!response.ok) {
//         throw new Error(`HTTP ${response.status}`);
//       }

//       menuCatalog = (data || []).map(item => ({
//         menu_id: Number(item.menu_id),
//         food_name: item.food_name || "",
//         category: item.category || "",
//         description: item.description || ""
//       }));
//     } catch (error) {
//       console.error("Menu catalog load failed:", error);

//       menuCatalog = [
//         { menu_id: 1, food_name: "Chicken Afritada", category: "Chicken", description: "Classic Filipino chicken stew." },
//         { menu_id: 2, food_name: "Beef Caldereta", category: "Beef", description: "Rich beef dish with tomato-based sauce." },
//         { menu_id: 3, food_name: "Buttered Garlic Shrimp", category: "Seafood", description: "Shrimp dish for seafood lovers." },
//         { menu_id: 4, food_name: "Pancit Canton", category: "Pasta", description: "Party favorite noodle dish." },
//         { menu_id: 5, food_name: "Fresh Lumpia", category: "Vegetable", description: "Light and fresh appetizer." },
//         { menu_id: 6, food_name: "Leche Flan", category: "Dessert", description: "Creamy Filipino dessert." }
//       ];
//     }

//     renderMenu();
//   }

//   function getMenuScore(item) {
//     const requestText = (clientRequestInput.value || "").toLowerCase();
//     const searchText = (menuSearchInput.value || "").toLowerCase();
//     const eventTypeText = (eventTypeInput.value || "").toLowerCase();
//     const tags = getCheckedTags();

//     const bag = `${item.food_name} ${item.category} ${item.description}`.toLowerCase();
//     let score = 0;

//     if (requestText) {
//       const words = requestText.split(/[\s,]+/).filter(Boolean);
//       for (const word of words) {
//         if (bag.includes(word)) score += 3;
//       }
//     }

//     if (searchText) {
//       if (bag.includes(searchText)) score += 5;
//       else return -9999;
//     }

//     if (tags.length > 0) {
//       const tagMatched = tags.some(tag => bag.includes(tag));
//       if (!tagMatched) return -9999;
//       score += 4;
//     }

//     if (eventTypeText) {
//       if (eventTypeText.includes("birthday") && bag.includes("dessert")) score += 2;
//       if (eventTypeText.includes("wedding") && (bag.includes("beef") || bag.includes("seafood"))) score += 2;
//       if (eventTypeText.includes("debut") && (bag.includes("pasta") || bag.includes("dessert"))) score += 2;
//       if (eventTypeText.includes("corporate") && (bag.includes("chicken") || bag.includes("beef"))) score += 2;
//     }

//     return score;
//   }

//   function getFilteredMenu() {
//     return [...menuCatalog]
//       .map(item => ({ ...item, _score: getMenuScore(item) }))
//       .filter(item => item._score > -9999)
//       .sort((a, b) => {
//         if (b._score !== a._score) return b._score - a._score;
//         return a.food_name.localeCompare(b.food_name);
//       });
//   }

//   function renderMenu() {
//     const items = getFilteredMenu();
//     menuList.innerHTML = "";

//     if (!items.length) {
//       menuEmptyState.classList.remove("hidden");
//       return;
//     }

//     menuEmptyState.classList.add("hidden");

//     items.forEach(item => {
//       const selected = selectedMenus.get(item.menu_id);
//       const qty = selected?.quantity || 1;

//       const card = document.createElement("div");
//       card.className = "menu-card";
//       card.innerHTML = `
//         <div class="menu-card__top">
//           <div>
//             <h4>${escapeHtml(item.food_name)}</h4>
//             <div class="menu-meta">
//               <span class="menu-badge">${escapeHtml(item.category)}</span>
//               ${item._score > 0 ? `<span class="menu-badge">Match score: ${item._score}</span>` : ""}
//             </div>
//           </div>
//         </div>

//         <p class="menu-desc">${escapeHtml(item.description || "No description available.")}</p>

//         <div class="menu-card__actions">
//           <input
//             type="number"
//             class="form-control qty-control"
//             min="1"
//             value="${qty}"
//             data-qty-id="${item.menu_id}"
//           />
//           ${
//             selected
//               ? `<button type="button" class="small-btn small-btn--remove" data-remove-id="${item.menu_id}">Remove</button>`
//               : `<button type="button" class="small-btn small-btn--add" data-add-id="${item.menu_id}">Add Food</button>`
//           }
//         </div>
//       `;

//       menuList.appendChild(card);
//     });

//     menuList.querySelectorAll("[data-add-id]").forEach(btn => {
//       btn.addEventListener("click", function () {
//         const menuId = Number(this.dataset.addId);
//         const item = menuCatalog.find(x => x.menu_id === menuId);
//         const qtyInput = menuList.querySelector(`[data-qty-id="${menuId}"]`);
//         const quantity = Math.max(Number(qtyInput?.value || 1), 1);

//         if (!item) return;

//         selectedMenus.set(menuId, {
//           menu_id: item.menu_id,
//           food_name: item.food_name,
//           category: item.category,
//           quantity
//         });

//         renderMenu();
//         renderSelectedFood();
//       });
//     });

//     menuList.querySelectorAll("[data-remove-id]").forEach(btn => {
//       btn.addEventListener("click", function () {
//         const menuId = Number(this.dataset.removeId);
//         selectedMenus.delete(menuId);
//         renderMenu();
//         renderSelectedFood();
//       });
//     });

//     menuList.querySelectorAll("[data-qty-id]").forEach(input => {
//       input.addEventListener("change", function () {
//         const menuId = Number(this.dataset.qtyId);
//         const quantity = Math.max(Number(this.value || 1), 1);
//         this.value = quantity;

//         if (selectedMenus.has(menuId)) {
//           const selectedItem = selectedMenus.get(menuId);
//           selectedItem.quantity = quantity;
//           selectedMenus.set(menuId, selectedItem);
//           renderSelectedFood();
//         }
//       });
//     });
//   }

//   function renderSelectedFood() {
//     const items = [...selectedMenus.values()];
//     selectedCountBadge.textContent = `${items.length} item(s)`;

//     if (!items.length) {
//       selectedFoodList.className = "selected-food-list empty-state";
//       selectedFoodList.textContent = "No food selected yet.";
//       return;
//     }

//     selectedFoodList.className = "selected-food-list";
//     selectedFoodList.innerHTML = items.map(item => `
//       <div class="selected-food-item">
//         <div>
//           <strong>${escapeHtml(item.food_name)}</strong>
//           <span>${escapeHtml(item.category)} • Quantity: ${item.quantity}</span>
//         </div>
//         <span class="count-badge">x${item.quantity}</span>
//       </div>
//     `).join("");
//   }

//   const calendar = new FullCalendar.Calendar(calendarEl, {
//     initialView: "dayGridMonth",
//     headerToolbar: {
//       left: "prev,next today",
//       center: "title",
//       right: "dayGridMonth"
//     },

//     events: async function (fetchInfo, successCallback, failureCallback) {
//       try {
//         const url = `${RESERVATION_API}?start=${encodeURIComponent(fetchInfo.startStr)}&end=${encodeURIComponent(fetchInfo.endStr)}`;
//         const response = await fetch(url);
//         const rawText = await response.text();

//         let data = [];
//         try {
//           data = rawText ? JSON.parse(rawText) : [];
//         } catch {
//           data = [];
//         }

//         if (!response.ok) {
//           throw new Error(`Failed to load reservations. HTTP ${response.status}`);
//         }

//         const events = (data || [])
//           .filter(item => !item.is_deleted && item.event_date)
//           .map(item => ({
//             id: item.reservation_id,
//             title: item.event_type ? `${item.event_type} Reserved` : "Reserved",
//             start: item.event_date,
//             allDay: true
//           }));

//         successCallback(events);
//       } catch (error) {
//         console.error("Calendar load error:", error);
//         showToast("Unable to load reservation calendar.", "error", 4000);
//         failureCallback(error);
//       }
//     },

//     dayCellDidMount: function (info) {
//       info.el.title = "Click to select this date";
//     },

//     eventDidMount: function (info) {
//       info.el.title = info.event.title;
//     },

//     dateClick: function (info) {
//       eventDateInput.value = info.dateStr;

//       if (selectedDateCell) {
//         selectedDateCell.classList.remove("fc-day-selected");
//       }

//       info.dayEl.classList.add("fc-day-selected");
//       selectedDateCell = info.dayEl;
//     }
//   });

//   calendar.render();
//   fetchMenuCatalog();
//   renderSelectedFood();
//   computePricing();

//   [packagePriceInput, minimumPaxInput, expectedPaxInput].forEach(input => {
//     input.addEventListener("input", computePricing);
//   });

//   [clientRequestInput, menuSearchInput, eventTypeInput].forEach(input => {
//     input.addEventListener("input", renderMenu);
//   });

//   document.querySelectorAll('input[name="diet"]').forEach(input => {
//     input.addEventListener("change", renderMenu);
//   });

//   form.addEventListener("submit", async function (e) {
//     e.preventDefault();

//     if (!form.event_date.value) {
//       showToast("Please select a date from the calendar.", "warning");
//       return;
//     }

//     const pricing = computePricing();

//     if (pricing.minimumPax <= 0 || pricing.expectedPax <= 0) {
//       showToast("Minimum pax and expected pax must be greater than zero.", "warning");
//       return;
//     }

//     if (selectedMenus.size === 0) {
//       showToast("Please select at least one food item.", "warning");
//       return;
//     }

//     const rawTime = form.event_time.value;
//     const safeTime = rawTime ? `${rawTime}:00` : "";

//     const payload = {
//       client_id: Number(client.client_id),
//       event_type: form.event_type.value.trim(),
//       event_date: form.event_date.value,
//       event_time: safeTime,
//       venue: form.venue.value.trim(),
//       package_name: form.package_name.value.trim(),
//       package_price: pricing.basePrice,
//       minimum_pax: pricing.minimumPax,
//       expected_pax: pricing.expectedPax,
//       additional_pax: pricing.additionalPax,
//       extra_pax_charge: pricing.extraCharge,
//       total_amount: pricing.totalAmount,
//       client_request: form.client_request.value.trim(),
//       selected_menus: [...selectedMenus.values()]
//     };

//     try {
//       const response = await fetch(RESERVATION_API, {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json"
//         },
//         body: JSON.stringify(payload)
//       });

//       const rawText = await response.text();
//       let result = {};

//       try {
//         result = rawText ? JSON.parse(rawText) : {};
//       } catch {
//         result = { message: rawText };
//       }

//       if (response.ok) {
//         showToast(result.message || "Booking request sent successfully!", "success");

//         form.reset();
//         eventDateInput.value = "";
//         selectedMenus.clear();
//         renderSelectedFood();
//         computePricing();
//         renderMenu();

//         if (selectedDateCell) {
//           selectedDateCell.classList.remove("fc-day-selected");
//           selectedDateCell = null;
//         }

//         calendar.refetchEvents();
//       } else {
//         console.error("POST error object:", result);
//         showToast(result.message || `Failed to submit booking. HTTP ${response.status}`, "error", 4000);
//       }
//     } catch (error) {
//       console.error("Submit error:", error);
//       showToast("Server connection error.", "error", 4000);
//     }
//   });
// });