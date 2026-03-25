document.addEventListener("DOMContentLoaded", function () {
      const API_BASE = "https://localhost:7241";
      const RESERVATION_API = `${API_BASE}/Reservation`;

      const toastContainer = document.getElementById("toastContainer");

      function showToast(message, type = "info", duration = 3000) {
        const toast = document.createElement("div");
        toast.className = `toast toast--${type}`;
        toast.textContent = message;

        toastContainer.appendChild(toast);

        setTimeout(() => {
          toast.classList.add("hide");
          setTimeout(() => {
            toast.remove();
          }, 250);
        }, duration);
      }

      function redirectWithToast(message, type, url, delay = 1300) {
        showToast(message, type, delay);
        setTimeout(() => {
          window.location.href = url;
        }, delay);
      }

      const clientData = localStorage.getItem("clientUser");

      if (!clientData) {
        redirectWithToast("Please login first.", "warning", "login.html");
        return;
      }

      let client;

      try {
        client = JSON.parse(clientData);
      } catch (error) {
        localStorage.removeItem("clientUser");
        redirectWithToast("Invalid session. Please login again.", "error", "login.html");
        return;
      }

      if (!client.client_id) {
        localStorage.removeItem("clientUser");
        redirectWithToast("Client session is missing. Please login again.", "error", "login.html");
        return;
      }

      const fullName = client.full_name || "User";
      document.getElementById("navAvatar").textContent = fullName.charAt(0).toUpperCase();
      document.getElementById("navUserName").textContent = fullName.split(" ")[0];
      document.getElementById("dropdownUserName").textContent = fullName;

      const toggleBtn = document.getElementById("profileToggleBtn");
      const dropdown = document.getElementById("profileDropdown");
      const logoutBtn = document.getElementById("logoutBtn");

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

      logoutBtn.addEventListener("click", function () {
        localStorage.removeItem("clientUser");
        window.location.href = "login.html";
      });

      const eventDateInput = document.getElementById("event_date");
      const calendarEl = document.getElementById("calendar");
      let selectedDateCell = null;

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
              console.error("Calendar GET failed:", rawText);
              throw new Error(`Failed to load reservations. HTTP ${response.status}`);
            }

            const events = (data || [])
              .filter(item => !item.is_deleted && item.event_date)
              .map(item => ({
                id: item.reservation_id,
                title: item.event_type ? `${item.event_type} Reserved` : "Reserved",
                start: item.event_date,
                allDay: true
              }));

            successCallback(events);
          } catch (error) {
            console.error("Calendar load error:", error);
            showToast("Unable to load reservation calendar.", "error", 4000);
            failureCallback(error);
          }
        },

        dayCellDidMount: function (info) {
          info.el.title = "Click to select this date";
        },

        eventDidMount: function (info) {
          info.el.title = info.event.title;
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

      const form = document.getElementById("resForm");

      form.addEventListener("submit", async function (e) {
        e.preventDefault();

        if (!form.event_date.value) {
          showToast("Please select a date from the calendar.", "warning");
          return;
        }

        const rawTime = form.event_time.value;
        const safeTime = rawTime ? `${rawTime}:00` : "";

        const payload = {
          client_id: Number(client.client_id),
          event_type: form.event_type.value.trim(),
          event_date: form.event_date.value,
          event_time: safeTime,
          venue: form.venue.value.trim(),
          total_amount: 0
        };

        console.log("Submitting payload:", payload);

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

            if (selectedDateCell) {
              selectedDateCell.classList.remove("fc-day-selected");
              selectedDateCell = null;
            }

            calendar.refetchEvents();
          } else {
            console.error("POST error object:", result);
            console.log("POST error JSON:", JSON.stringify(result, null, 2));

            if (result.errors) {
              showToast("Validation failed. Please check your inputs.", "error", 4000);
            } else {
              showToast(result.message || `Failed to submit booking. HTTP ${response.status}`, "error", 4000);
            }
          }
        } catch (error) {
          console.error("Submit error:", error);
          showToast("Server connection error.", "error", 4000);
        }
      });
    });