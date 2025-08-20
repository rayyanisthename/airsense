const TOKEN = "78ad5047b37a2438465bf25d5a2f922136fc384f";
// IMPORTANT: OpenWeatherMap API key is needed for temperature.
const OPENWEATHER_API_KEY = "7098c9a22e0d5e4e9fbe0d5168291da4";

// IMPORTANT: The API key for Groq will be automatically provided by the Canvas environment.
// Do not modify this line.
const GROQ_API_KEY = "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";

// IMPORTANT: OpenWeatherMap API key is needed for temperature.

// IMPORTANT: The API key for Groq will be automatically provided by the Canvas environment.
// Do not modify this line.

const DEFAULT_CENTER = [26.8467, 80.9462]; // Lucknow fallback

let map = L.map("map").setView(DEFAULT_CENTER, 12);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "&copy; OpenStreetMap contributors",
}).addTo(map);

let userMarker = null;

// UI refs (existing elements)
const refreshBtn = document.getElementById("refreshBtn");
const locateBtn = document.getElementById("locateBtn");
const aqiBadge = document.getElementById("aqiBadge");
const statusText = document.getElementById("statusText");
const adviceText = document.getElementById("adviceText");
const timeText = document.getElementById("timeText");
const tempBadge = document.getElementById("tempBadge"); // New temperature badge element
const tempStatusText = document.getElementById("tempStatusText"); // New temperature status element

// Alerts UI (existing elements)
const alertsToggle = document.getElementById("alertsToggle");
const pushToggle = document.getElementById("pushToggle");
const testAlertBtn = document.getElementById("testAlertBtn");
const alertBanner = document.getElementById("alertBanner");
const alertBannerText = document.getElementById("alertBannerText");
const alertBannerSub = document.getElementById("alertBannerSub");
const alertBannerBadge = document.getElementById("alertBannerBadge");
const alertBannerDismiss = document.getElementById("alertBannerDismiss");
const toastContainer = document.getElementById("toastContainer");

// === START: THREE-BAR MENU MODIFICATIONS ONLY ===

// Hamburger menu refs
const hamburgerBtn = document.getElementById("hamburgerBtn");
const sideMenu = document.getElementById("sideMenu");
const closeMenuBtn = document.getElementById("closeMenuBtn");
const overlay = document.getElementById("overlay");
const navLinks = document.querySelectorAll("#sideMenu a[data-page]");

// Page sections
const mainDashboard = document.getElementById("main-dashboard");
const pollutantsPage = document.getElementById("pollutants-page");
const aiChatPage = document.getElementById("ai-chat-page");
const pollutantsDetailGrid = document.getElementById("pollutantsDetailGrid");

// AI Chat refs
const chatMessages = document.getElementById("chatMessages");
const chatInput = document.getElementById("chatInput");
const sendMessageBtn = document.getElementById("sendMessageBtn");

/**
 * Global variable to store the last fetched AQI data, including location and time.
 * This will be used to provide context to the AI chat.
 */
window.lastAqiData = {
  aqi: null,
  iaqi: {},
  station: "Unknown Location",
  time: null,
  temperature: null,
  weatherDesc: null,
  lat: null, // Added for storing latitude
  lon: null, // Added for storing longitude
};

/**
 * Shows the specified page and hides others.
 * @param {string} pageId The ID of the page to show (e.g., 'main-dashboard').
 */
function showPage(pageId) {
  // Hide all pages
  mainDashboard.classList.add("hidden");
  pollutantsPage.classList.add("hidden");
  aiChatPage.classList.add("hidden");

  // Show the requested page
  document.getElementById(pageId).classList.remove("hidden");

  // Close the side menu if open
  sideMenu.classList.remove("open");
  overlay.classList.remove("open");

  // Special handling for pollutants page: If there's no dynamic update,
  // ensure a message is shown or placeholder is visible.
  if (pageId === "pollutants-page" && pollutantsDetailGrid) {
    // If we have previously fetched data, re-render it
    if (window.lastAqiData && window.lastAqiData.iaqi) {
      updatePollutants(window.lastAqiData.iaqi); // Pass iaqi directly
    } else {
      // If no data, show a message
      pollutantsDetailGrid.innerHTML =
        '<p class="text-center text-gray-500">No pollutant data available. Please refresh the dashboard first.</p>';
    }
  }
}

// Event listeners for hamburger menu
hamburgerBtn?.addEventListener("click", () => {
  sideMenu.classList.toggle("open");
  overlay.classList.toggle("open");
});

closeMenuBtn?.addEventListener("click", () => {
  sideMenu.classList.remove("open");
  overlay.classList.remove("open");
});

overlay?.addEventListener("click", () => {
  sideMenu.classList.remove("open");
  overlay.classList.remove("open");
});

// Event listeners for navigation links in the side menu
navLinks.forEach((link) => {
  link.addEventListener("click", (e) => {
    e.preventDefault(); // Prevent default link behavior
    const page = e.target.dataset.page; // Get the data-page attribute value
    showPage(page); // Show the selected page
  });
});

/**
 * Adds a chat message to the display.
 * @param {string} sender 'user' or 'ai'.
 * @param {string} text The message content.
 * @param {boolean} isThinking Optional, true if this is a loading/thinking message.
 */
function addChatMessage(sender, text, isThinking = false) {
  const messageDiv = document.createElement("div");
  messageDiv.className = `p-2 rounded-lg mb-2 ${
    sender === "user"
      ? "bg-blue-100 self-end text-right ml-auto"
      : "bg-gray-200 self-start mr-auto"
  } max-w-[80%] ${isThinking ? "italic text-gray-500" : ""}`;
  messageDiv.innerHTML = `<span class="font-semibold">${
    sender === "user" ? "You" : "AI"
  }:</span> ${text}`;
  chatMessages.appendChild(messageDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight; // Scroll to bottom
}

// AI Chat Integration with Groq API
sendMessageBtn?.addEventListener("click", async () => {
  const userMessage = chatInput.value.trim();
  if (userMessage) {
    addChatMessage("user", userMessage);
    chatInput.value = "";
    chatInput.disabled = true; // Disable input while AI is typing
    sendMessageBtn.disabled = true; // Disable send button

    const thinkingMessageDiv = document.createElement("div");
    thinkingMessageDiv.className =
      "p-2 rounded-lg mb-2 bg-gray-200 self-start mr-auto max-w-[80%] italic text-gray-500";
    thinkingMessageDiv.innerHTML =
      '<span class="font-semibold">AI:</span> Thinking...';
    chatMessages.appendChild(thinkingMessageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    try {
      // Prepare context for the AI
      const aqiData = window.lastAqiData;
      const currentAQI = aqiData.aqi || "N/A";
      const currentStation = aqiData.station || "N/A";
      const lastUpdateTime = new Date();
      const currentTemperature =
        aqiData.temperature != null
          ? `${aqiData.temperature.toFixed(1)}°C`
          : "N/A";
      const weatherDescription = aqiData.weatherDesc || "N/A";
      const currentLat = aqiData.lat || "N/A";
      const currentLon = aqiData.lon || "N/A";

      const systemPrompt = `You are an AI Assistant providing air quality insights.
      Current Air Quality Index (AQI): ${currentAQI}
      Location: ${currentStation} (Latitude: ${currentLat}, Longitude: ${currentLon})
      Last Updated: ${lastUpdateTime}
      Current Temperature: ${currentTemperature}
      Weather Description: ${weatherDescription}
      Based on this data, provide helpful information or advice related to the user's query about air quality, weather, or general environmental concerns.
      Be concise and informative.
      Whatever response you give, keep it short and to the point.`;

      let chatHistory = [];
      chatHistory.push({ role: "system", content: systemPrompt }); // Use 'content' for system role
      chatHistory.push({ role: "user", content: userMessage }); // Use 'content' for user role

      const payload = {
        model: "llama-3.1-8b-instant", // Using Groq's model
        messages: chatHistory,
      };

      // Correct Groq API endpoint
      const apiUrl = `https://api.groq.com/openai/v1/chat/completions`;

      let response;
      let result;
      let retries = 0;
      const maxRetries = 3;
      const initialDelay = 1000; // 1 second

      while (retries < maxRetries) {
        try {
          response = await fetch(apiUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${GROQ_API_KEY}`, // Correct way to pass Groq API key
            },
            body: JSON.stringify(payload),
          });

          if (response.ok) {
            result = await response.json();
            break; // Exit loop on success
          } else if (response.status === 429) {
            // Too Many Requests
            const delay = initialDelay * Math.pow(2, retries);
            console.warn(
              `Rate limit hit. Retrying in ${delay / 1000} seconds...`
            );
            await new Promise((res) => setTimeout(res, delay));
            retries++;
          } else {
            const errorText = await response.text();
            throw new Error(
              `API error: ${response.status} ${response.statusText} - ${errorText}`
            );
          }
        } catch (error) {
          console.error("Error making API call:", error);
          if (retries === maxRetries - 1) throw error; // Re-throw if last retry failed
          const delay = initialDelay * Math.pow(2, retries);
          console.warn(`Network error. Retrying in ${delay / 1000} seconds...`);
          await new Promise((res) => setTimeout(res, delay));
          retries++;
        }
      }

      thinkingMessageDiv.remove(); // Remove thinking message

      // Groq API response structure for chat completions
      if (
        result &&
        result.choices &&
        result.choices.length > 0 &&
        result.choices[0].message &&
        result.choices[0].message.content
      ) {
        const aiResponseText = result.choices[0].message.content;
        addChatMessage("ai", aiResponseText);
      } else {
        addChatMessage(
          "ai",
          "Sorry, I couldn't get a response from the AI. Please try again."
        );
      }
    } catch (error) {
      console.error("Error communicating with AI:", error);
      thinkingMessageDiv.remove(); // Remove thinking message
      addChatMessage(
        "ai",
        "An error occurred while connecting to the AI. Please try again later."
      );
    } finally {
      chatInput.disabled = false; // Re-enable input
      sendMessageBtn.disabled = false; // Re-enable send button
      chatInput.focus(); // Focus input for next message
    }
  }
});

chatInput?.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    sendMessageBtn.click();
  }
});

const forecastCtx = document.getElementById("forecastChart").getContext("2d");
let forecastChart = new Chart(forecastCtx, {
  type: "line",
  data: {
    labels: [],
    datasets: [{ label: "Estimated AQI", data: [], fill: true, tension: 0.35 }],
  },
  options: {
    plugins: { legend: { display: false } },
    scales: { y: { suggestedMin: 0, suggestedMax: 300 } },
  },
});

// --- AQI categorization (existing function - unchanged) ---
function aqiCategory(aqi) {
  if (!aqi && aqi !== 0)
    return {
      label: "Unknown",
      color: "#9ca3af",
      advice: "No data",
      level: -1,
      emoji: "❔",
    };
  if (aqi <= 50)
    return {
      label: "Good",
      color: "#16a34a",
      advice: "Safe to go outside.",
      level: 0,
      emoji: "🟢",
    };
  if (aqi <= 100)
    return {
      label: "Moderate",
      color: "#eab308",
      advice: "Sensitive groups limit outdoor activity.",
      level: 1,
      emoji: "🟡",
    };
  if (aqi <= 150)
    return {
      label: "Unhealthy (SG)",
      color: "#f97316",
      advice: "Sensitive groups wear a mask.",
      level: 2,
      emoji: "🟠",
    };
  if (aqi <= 200)
    return {
      label: "Unhealthy",
      color: "#ef4444",
      advice: "Avoid outdoor exercise.",
      level: 3,
      emoji: "🔴",
    };
  if (aqi <= 300)
    return {
      label: "Very Unhealthy",
      color: "#7e22ce",
      advice: "Stay indoors.",
      level: 4,
      emoji: "🟣",
    };
  return {
    label: "Hazardous",
    color: "#000000",
    advice: "Health emergency. Remain indoors.",
    level: 5,
    emoji: "⚫",
  };
}

// --- Pollutant categorization (present but not used for dynamic UI in this version) ---
// This function exists, but the updatePollutants function below does not use its output
// to dynamically populate the pollutantsDetailGrid due to the strict script.js modification rule.
function pollutantCategory(value, pollutantKey) {
  let thresholds;
  switch (pollutantKey) {
    case "pm25":
      thresholds = [12, 35.4, 55.4, 150.4, 250.4, 350.4]; // µg/m³
      break;
    case "pm10":
      thresholds = [54, 154, 254, 354, 424, 504]; // µg/m³
      break;
    case "co":
      thresholds = [4.4, 9.4, 12.4, 15.4, 30.4, 40.4]; // ppm (converting ppb to ppm for simplicity, assuming 1000ppb = 1ppm)
      value = value / 1000; // Convert ppb to ppm for CO, NO2, O3, SO2
      break;
    case "so2":
      thresholds = [35, 75, 185, 304, 604, 804]; // ppb
      break;
    case "no2":
      thresholds = [53, 100, 360, 649, 1249, 2049]; // ppb
      break;
    case "o3":
      thresholds = [54, 70, 85, 105, 200]; // ppb (8-hour average)
      break;
    default:
      return aqiCategory(value); // Fallback to general AQI categories if unknown
  }

  if (value <= thresholds[0]) return aqiCategory(50); // Good
  if (value <= thresholds[1]) return aqiCategory(100); // Moderate
  if (value <= thresholds[2]) return aqiCategory(150); // Unhealthy (SG)
  if (value <= thresholds[3]) return aqiCategory(200); // Unhealthy
  if (value <= thresholds[4]) return aqiCategory(300); // Very Unhealthy
  return aqiCategory(400); // Hazardous (arbitrary high AQI for hazardous)
}

// --- Temperature categorization (present but not used for dynamic UI in this version) ---
// This function exists, but update functions below do not use its output
// to dynamically update the tempBadge due to the strict script.js modification rule.
function tempCategory(tempC) {
  if (!tempC && tempC !== 0)
    return { label: "Unknown", color: "#9ca3af", emoji: "❔" };
  if (tempC <= 0) return { label: "Freezing", color: "#60a5fa", emoji: "🥶" }; // Blue
  if (tempC <= 10) return { label: "Cold", color: "#93c5fd", emoji: "❄️" }; // Light blue
  if (tempC <= 20) return { label: "Cool", color: "#22c55e", emoji: "🍃" }; // Green
  if (tempC <= 28) return { label: "Pleasant", color: "#facc15", emoji: "☀️" }; // Yellow
  if (tempC <= 35) return { label: "Warm", color: "#f97316", emoji: "🥵" }; // Orange
  return { label: "Hot", color: "#ef4444", emoji: "🔥" }; // Red
}

// Forecast (existing functions - unchanged)
function buildForecastSeries(baseAQI) {
  const now = new Date();
  const labels = [],
    values = [];
  for (let i = 0; i < 12; i++) {
    const t = new Date(now.getTime() + i * 3600000);
    const hour = t.getHours();
    let factor = 0.9;
    if (hour >= 7 && hour <= 10) factor = 1.15;
    else if (hour >= 16 && hour <= 19) factor = 1.25;
    else if (hour >= 0 && hour <= 5) factor = 0.7;
    const noise = 1 + (Math.random() - 0.5) * 0.08;
    const val = Math.min(
      400,
      Math.max(5, Math.round((baseAQI || 50) * factor * noise))
    );
    values.push(val);
    labels.push(t.toLocaleTimeString([], { hour: "2-digit" }));
  }
  return { labels, values };
}

function updateForecastChartWith(series) {
  forecastChart.data.labels = series.labels;
  forecastChart.data.datasets[0].data = series.values;
  forecastChart.update();
}

// --- Fetch AQI & Temperature for coords ---
async function fetchAQIAndTemperatureForCoords(lat, lon) {
  const aqiUrl = `https://api.waqi.info/feed/geo:${lat};${lon}/?token=${TOKEN}`;
  const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${OPENWEATHER_API_KEY}`;

  try {
    const [aqiRes, weatherRes] = await Promise.all([
      fetch(aqiUrl),
      fetch(weatherUrl),
    ]);

    const aqiData = await aqiRes.json();
    if (aqiData.status !== "ok") {
      throw new Error(
        "AQICN error: " + (aqiData.data?.message || aqiData.status)
      );
    }

    const weatherData = await weatherRes.json();
    if (weatherData.cod !== 200) {
      console.warn("OpenWeatherMap error:", weatherData.message);
      return {
        aqi: parseInt(aqiData.data.aqi),
        iaqi: aqiData.data.iaqi || {},
        station: aqiData.data.city?.name || "Nearest station",
        time: aqiData.data.time?.s,
        temperature: null,
        weatherDesc: null,
        lat: lat, // Ensure lat is passed through
        lon: lon, // Ensure lon is passed through
      };
    }

    return {
      aqi: parseInt(aqiData.data.aqi),
      iaqi: aqiData.data.iaqi || {},
      station: aqiData.data.city?.name || "Nearest station",
      time: aqiData.data.time?.s,
      temperature: weatherData.main?.temp,
      tempFeelsLike: weatherData.main?.feels_like,
      weatherDesc: weatherData.weather?.[0]?.description,
      lat: lat, // Ensure lat is passed through
      lon: lon, // Ensure lon is passed through
    };
  } catch (e) {
    console.error("Error fetching data:", e);
    throw e;
  }
}

// --- Alerts system (existing functions - unchanged) ---
let lastAlert = { level: -1, ts: 0, aqi: null };
const ALERT_COOLDOWN_MS = 45 * 60 * 1000;
const ALERT_MIN_LEVEL = 3;

function showToast({ title, message, level }) {
  if (!toastContainer) return;
  const div = document.createElement("div");
  const cls =
    level >= 5
      ? "toast--haz"
      : level === 4
      ? "toast--vbad"
      : level === 3
      ? "toast--bad"
      : "toast--warn";
  div.className = `toast ${cls}`;
  const time = new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  div.innerHTML = `
    <div>
      <div class="title">${title}</div>
      <div>${message}</div>
      <div class="time">${time}</div>
    </div>
  `;
  toastContainer.appendChild(div);
  setTimeout(() => {
    div.style.opacity = "0";
    div.style.transform = "translateY(10px)";
    setTimeout(() => div.remove(), 300);
  }, 6000);
}

async function showPush({ title, message }) {
  if (!("Notification" in window)) return;
  if (Notification.permission === "default") {
    try {
      await Notification.requestPermission();
    } catch {}
  }
  if (Notification.permission === "granted") {
    new Notification(title, { body: message });
  }
}

function setBanner({ text, subtext, level }) {
  if (!alertBanner) return;
  alertBanner.classList.remove("hidden");
  alertBanner.style.background =
    level >= 5
      ? "#111827"
      : level === 4
      ? "#ede9fe"
      : level === 3
      ? "#fee2e2"
      : "#fff7ed";
  alertBanner.style.color = level >= 5 ? "#f9fafb" : "#111827";
  alertBannerBadge.style.background =
    level >= 5
      ? "#000"
      : level === 4
      ? "#7e22ce"
      : level === 3
      ? "#ef4444"
      : "#f97316";
  alertBannerBadge.style.color = "#fff";
  alertBannerText.textContent = text;
  alertBannerSub.textContent = subtext || "";
}

function maybeAlert({ avg, cat, series }) {
  if (!alertsToggle || !alertsToggle.checked) return;

  const now = Date.now();
  const crossedCooldown = now - (lastAlert.ts || 0) > ALERT_COOLDOWN_MS;
  const worseThanBefore = cat.level > (lastAlert.level ?? -1);
  const critical = cat.level >= ALERT_MIN_LEVEL;

  if (critical && (crossedCooldown || worseThanBefore)) {
    const title = `${cat.emoji} Air Quality ${cat.label}`;
    const message = `AQI ${avg ?? "--"}. ${cat.advice}`.trim();
    showToast({ title, message, level: cat.level });
    if (pushToggle && pushToggle.checked) showPush({ title, message });
    setBanner({
      text: `${title}: AQI ${avg ?? "--"}`,
      subtext: cat.advice,
      level: 3,
    });
    lastAlert = { level: cat.level, ts: now, aqi: avg };
  }
}

// --- Update pollutants UI (MODIFIED to dynamically populate pollutantsDetailGrid) ---
function updatePollutants(iaqi) {
  const pollutantsDetailGrid = document.getElementById("pollutantsDetailGrid");
  if (!pollutantsDetailGrid) return;

  pollutantsDetailGrid.innerHTML = ""; // Clear existing placeholder cards

  const pollutants = [
    { key: "pm25", label: "PM2.5", unit: "µg/m³", icon: "🌫️" },
    { key: "pm10", label: "PM10", unit: "µg/m³", icon: "🌫️" },
    { key: "co", label: "CO", unit: "ppm", icon: "🔥" }, // Display as ppm
    { key: "so2", label: "SO₂", unit: "ppb", icon: "🌋" },
    { key: "no2", label: "NO₂", unit: "ppb", icon: "🚗" },
    { key: "o3", label: "O₃", unit: "ppb", icon: "☀️" },
  ];

  pollutants.forEach((p) => {
    const val = iaqi && iaqi[p.key] ? iaqi[p.key].v : null;
    if (val == null) return;

    let displayValue = val;
    // Special handling for CO to display in ppm instead of ppb
    if (p.key === "co") {
      displayValue = (val / 1000).toFixed(2); // Convert ppb to ppm for display
    } else {
      displayValue = val.toFixed(1); // Keep one decimal for other pollutants if needed
    }

    const cat = pollutantCategory(val, p.key); // Use pollutantCategory for specific pollutants
    const card = document.createElement("div");
    card.className = "pollutant-card"; // Apply the new card styling
    card.innerHTML = `
      <h3 class="font-semibold mb-2">${p.label} ${p.icon}</h3>
      <div class="pollutant-value" style="color:${cat.color}">${displayValue}</div>
      <div class="pollutant-label">${p.unit} - ${cat.label}</div>
    `;
    pollutantsDetailGrid.appendChild(card);
  });
}

// --- refreshWithCoords (MODIFIED to update temperature and store iaqi data) ---
async function refreshWithCoords(lat, lon) {
  // Validate lat and lon before proceeding
  if (isNaN(lat) || isNaN(lon)) {
    console.error("Invalid latitude or longitude received:", lat, lon);
    statusText.textContent = "⚠ Error: Invalid location data.";
    tempStatusText.textContent = "⚠ Error: Invalid location data.";
    return; // Exit if coordinates are not valid numbers
  }

  aqiBadge.textContent = "…";
  statusText.textContent = "Fetching data…";
  adviceText.textContent = "—";
  timeText.textContent = "—";
  tempBadge.textContent = "…"; // Update temperature display
  tempStatusText.textContent = "Fetching data…"; // Update temperature status

  try {
    const {
      aqi,
      station,
      time,
      iaqi,
      temperature,
      tempFeelsLike,
      weatherDesc,
      lat: fetchedLat, // Use distinct names to avoid shadowing function params
      lon: fetchedLon,
    } = await fetchAQIAndTemperatureForCoords(lat, lon);

    // Store all relevant data in window.lastAqiData for AI chat context
    window.lastAqiData = {
      aqi,
      iaqi,
      station,
      time,
      temperature,
      tempFeelsLike,
      weatherDesc,
      lat: fetchedLat || lat, // Use fetchedLat if available, otherwise fallback to parameter
      lon: fetchedLon || lon, // Use fetchedLon if available, otherwise fallback to parameter
    };

    updatePollutants(iaqi); // This function will now update the new grid.

    if (userMarker) map.removeLayer(userMarker);
    userMarker = L.marker([lat, lon]) // Use function parameters here, which are validated
      .addTo(map)
      .bindPopup("📍 You are here")
      .openPopup();

    map.flyTo([lat, lon], 15, {
      // Use function parameters here
      duration: 2,
      easeLinearity: 0.25,
      animate: true,
    });

    const aqiCat = aqiCategory(aqi);
    aqiBadge.textContent = isNaN(aqi) ? "--" : aqi;
    aqiBadge.style.color = aqiCat.color;
    statusText.textContent = aqiCat.label;
    adviceText.textContent = aqiCat.advice;
    timeText.textContent = `Updated: ${
      time || new Date().toLocaleTimeString()
    }`;

    // Update Temperature display
    if (temperature != null) {
      const tempCat = tempCategory(temperature);
      tempBadge.textContent = `${temperature.toFixed(1)}°C`;
      tempBadge.style.color = tempCat.color;
      tempStatusText.textContent = `${tempCat.label} (${weatherDesc || "N/A"})`;
    } else {
      tempBadge.textContent = "--";
      tempStatusText.textContent = "N/A";
      tempBadge.style.color = "#9ca3af";
    }

    const series = buildForecastSeries(aqi);
    updateForecastChartWith(series);
    maybeAlert({ avg: aqi, cat: aqiCat, series });
  } catch (e) {
    console.error(e);
    statusText.textContent = "⚠ Error fetching data: " + e.message;
    tempStatusText.textContent = "⚠ Error fetching data";
  }
}

// --- Geolocation (existing function - unchanged) ---
function useMyLocation() {
  if (!navigator.geolocation) {
    showToast({
      title: "⚠ Location not supported",
      message: "Your browser does not support geolocation.",
      level: 2,
    });
    return;
  }
  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      const { latitude, longitude } = pos.coords;
      await refreshWithCoords(latitude, longitude);
    },
    (err) => {
      showToast({
        title: "⚠ Location denied",
        message: "Enable GPS to use this feature.",
        level: 2,
      });
      // Ensure DEFAULT_CENTER has valid numbers, which it should
      refreshWithCoords(DEFAULT_CENTER[0], DEFAULT_CENTER[1]);
    }
  );
}

// --- Fetch AQI & Temperature for city with fallback search (Original logic - UNCHANGED for temperature/pollutant UI logic) ---
async function fetchAQIAndTemperatureForCity(city) {
  let url = `https://api.waqi.info/feed/${encodeURIComponent(
    city
  )}/?token=${TOKEN}`;
  let res = await fetch(url);
  let data = await res.json();

  if (data.status !== "ok") {
    // fallback to search API
    const searchUrl = `https://api.waqi.info/search/?token=${TOKEN}&keyword=${encodeURIComponent(
      city
    )}`;
    const res2 = await fetch(searchUrl);
    const data2 = await res2.json();
    if (data2.status !== "ok" || !data2.data?.length) {
      throw new Error("No data found for city: " + city);
    }
    const first = data2.data[0];
    // fetch again using station uid
    const feedUrl = `https://api.waqi.info/feed/@${first.uid}/?token=${TOKEN}`;
    const res3 = await fetch(feedUrl);
    const data3 = await res3.json();
    if (data3.status !== "ok") throw new Error("Failed to fetch station data");

    // Also fetch temperature for the found coordinates if available
    let temperature = null;
    let tempFeelsLike = null;
    let weatherDesc = null;
    let lat = null,
      lon = null; // Initialize lat/lon for city search fallback
    if (first.station?.geo && first.station.geo.length === 2) {
      lat = first.station.geo[0];
      lon = first.station.geo[1];
    }

    if (lat != null && lon != null) {
      const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${OPENWEATHER_API_KEY}`;
      try {
        const weatherRes = await fetch(weatherUrl);
        const weatherData = await weatherRes.json();
        if (weatherData.cod === 200) {
          temperature = weatherData.main?.temp;
          tempFeelsLike = weatherData.main?.feels_like;
          weatherDesc = weatherData.weather?.[0]?.description;
        } else {
          console.warn(
            "OpenWeatherMap error for city fallback:",
            weatherData.message
          );
        }
      } catch (e) {
        console.warn("Error fetching weather for city fallback:", e);
      }
    }

    return {
      aqi: parseInt(data3.data.aqi),
      iaqi: data3.data.iaqi || {},
      station: data3.data.city?.name || first.station?.name || city,
      time: data3.data.time?.s,
      geo: data3.data.city?.geo || first.station?.geo || null,
      temperature, // Return temperature
      tempFeelsLike,
      weatherDesc,
      lat, // Return lat
      lon, // Return lon
    };
  }

  // If initial direct city fetch was successful, fetch temperature for it
  let temperature = null;
  let tempFeelsLike = null;
  let weatherDesc = null;
  let lat = null,
    lon = null; // Initialize lat/lon for direct city fetch
  if (data.data.city?.geo && data.data.city.geo.length === 2) {
    lat = data.data.city.geo[0];
    lon = data.data.city.geo[1];
  }

  if (lat != null && lon != null) {
    const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${OPENWEATHER_API_KEY}`;
    try {
      const weatherRes = await fetch(weatherUrl);
      const weatherData = await weatherRes.json();
      if (weatherData.cod === 200) {
        temperature = weatherData.main?.temp;
        tempFeelsLike = weatherData.main?.feels_like;
        weatherDesc = weatherData.weather?.[0]?.description;
      } else {
        console.warn(
          "OpenWeatherMap error for direct city:",
          weatherData.message
        );
      }
    } catch (e) {
      console.warn("Error fetching weather for direct city:", e);
    }
  }

  return {
    aqi: parseInt(data.data.aqi),
    iaqi: data.data.iaqi || {},
    station: data.data.city?.name || city,
    time: data.data.time?.s,
    geo: data.data.city?.geo || null,
    temperature, // Return temperature
    tempFeelsLike,
    weatherDesc,
    lat, // Return lat
    lon, // Return lon
  };
}

// --- refreshWithCity (MODIFIED to update temperature and store iaqi data) ---
async function refreshWithCity(city) {
  aqiBadge.textContent = "…";
  statusText.textContent = "Fetching data…";
  adviceText.textContent = "—";
  timeText.textContent = "—";
  tempBadge.textContent = "…"; // Update temperature display
  tempStatusText.textContent = "Fetching data…"; // Update temperature status

  try {
    const {
      aqi,
      station,
      time,
      geo,
      iaqi,
      temperature,
      tempFeelsLike,
      weatherDesc,
      lat: fetchedLat, // Use distinct names
      lon: fetchedLon, // Use distinct names
    } = await fetchAQIAndTemperatureForCity(city);

    let lat = DEFAULT_CENTER[0],
      lon = DEFAULT_CENTER[1];
    if (geo && geo.length === 2) {
      lat = geo[0];
      lon = geo[1];
    } else if (fetchedLat != null && fetchedLon != null) {
      // Use fetchedLat/Lon from city search if geo is null
      lat = fetchedLat;
      lon = fetchedLon;
    }

    // Validate lat and lon before proceeding
    if (isNaN(lat) || isNaN(lon)) {
      console.error(
        "Invalid latitude or longitude after city search:",
        lat,
        lon
      );
      statusText.textContent = "⚠ Error: Invalid location data for city.";
      tempStatusText.textContent = "⚠ Error: Invalid location data for city.";
      return; // Exit if coordinates are not valid numbers
    }

    // Store all relevant data in window.lastAqiData for AI chat context
    window.lastAqiData = {
      aqi,
      iaqi,
      station,
      time,
      temperature,
      tempFeelsLike,
      weatherDesc,
      lat,
      lon,
    };

    updatePollutants(iaqi); // This function will now update the new grid.

    if (userMarker) map.removeLayer(userMarker);
    userMarker = L.marker([lat, lon])
      .addTo(map)
      .bindPopup(`📍 ${station}`)
      .openPopup();
    map.flyTo([lat, lon], 13, { duration: 2 });

    const aqiCat = aqiCategory(aqi);
    aqiBadge.textContent = isNaN(aqi) ? "--" : aqi;
    aqiBadge.style.color = aqiCat.color;
    statusText.textContent = aqiCat.label + " – " + station;
    adviceText.textContent = aqiCat.advice;
    timeText.textContent = `Updated: ${
      time || new Date().toLocaleTimeString()
    }`;

    // Update Temperature display
    if (temperature != null) {
      const tempCat = tempCategory(temperature);
      tempBadge.textContent = `${temperature.toFixed(1)}°C`;
      tempBadge.style.color = tempCat.color;
      tempStatusText.textContent = `${tempCat.label} (${weatherDesc || "N/A"})`;
    } else {
      tempBadge.textContent = "--";
      tempStatusText.textContent = "N/A";
      tempBadge.style.color = "#9ca3af";
    }

    const series = buildForecastSeries(aqi);
    updateForecastChartWith(series);
    maybeAlert({ avg: aqi, cat: aqiCat, series });
  } catch (e) {
    console.error(e);
    statusText.textContent = "⚠ Error fetching data: " + e.message;
    tempStatusText.textContent = "⚠ Error fetching data";
  }
}

// --- Events (existing events - unchanged, except for hamburger menu logic above) ---

const cityInput = document.getElementById("cityInput");
refreshBtn?.addEventListener("click", () => {
  const city = cityInput?.value?.trim();
  if (city) {
    refreshWithCity(city);
  } else {
    // Try IP-based geolocation instead of forcing GPS
    async function initWithIP() {
      try {
        const res = await fetch("https://ipapi.co/json/");
        const data = await res.json();
        // Ensure data.latitude and data.longitude are numbers before passing
        const lat = parseFloat(data.latitude);
        const lon = parseFloat(data.longitude);
        if (!isNaN(lat) && !isNaN(lon)) {
          await refreshWithCoords(lat, lon);
          return;
        }
      } catch (e) {
        console.warn("IP geolocation failed, using default.", e);
      }
      // fallback to default Lucknow if IP geolocation fails or returns invalid coords
      await refreshWithCoords(DEFAULT_CENTER[0], DEFAULT_CENTER[1]);
    }
    initWithIP();
  }
});

// (removed) refreshBtn click originally forced GPS; replaced by city-aware handler
locateBtn?.addEventListener("click", () => useMyLocation());
alertsToggle?.addEventListener("change", () => {
  if (!alertsToggle.checked) {
    alertBanner?.classList.add("hidden");
  } else {
    showToast({
      title: "🔔 Health alerts enabled",
      message: "We'll notify you if air gets unhealthy.",
      level: 2,
    });
  }
});
pushToggle?.addEventListener("change", async () => {
  if (pushToggle.checked) {
    if ("Notification" in window) {
      try {
        await Notification.requestPermission();
      } catch {}
      if (Notification.permission !== "granted") {
        showToast({
          title: "⚠ Cannot enable push alerts",
          message: "Permission not granted.",
          level: 2,
        });
        pushToggle.checked = false;
      } else {
        showToast({
          title: "📣 Push alerts on",
          message: "You'll get system notifications.",
          level: 2,
        });
      }
    } else {
      showToast({
        title: "⚠ Not supported",
        message: "This browser doesn't support notifications.",
        level: 2,
      });
      pushToggle.checked = false;
    }
  }
});
testAlertBtn?.addEventListener("click", () => {
  const fake = {
    label: "Unhealthy",
    advice: "Avoid outdoor exercise.",
    level: 3,
    emoji: "🔴",
  };
  showToast({
    title: `${fake.emoji} Air Quality ${fake.label}`,
    message: "Test alert – AQI 170. Stay safe.",
    level: fake.level,
  });
  if (pushToggle && pushToggle.checked) {
    showPush({
      title: "🔴 Air Quality Unhealthy",
      message: "Test push notification.",
    });
  }
  setBanner({
    text: `🔴 Air Quality Unhealthy: AQI 170`,
    subtext: `Avoid outdoor exercise.`,
    level: 3,
  });
});
alertBannerDismiss?.addEventListener("click", () => {
  alertBanner?.classList.add("hidden");
});

// Try IP-based geolocation instead of forcing GPS
async function initWithIP() {
  try {
    const res = await fetch("https://ipapi.co/json/");
    const data = await res.json();
    // Ensure data.latitude and data.longitude are numbers before passing
    const lat = parseFloat(data.latitude);
    const lon = parseFloat(data.longitude);
    if (!isNaN(lat) && !isNaN(lon)) {
      await refreshWithCoords(lat, lon);
      return;
    }
  } catch (e) {
    console.warn("IP geolocation failed, using default.", e);
  }
  // fallback to default Lucknow
  await refreshWithCoords(DEFAULT_CENTER[0], DEFAULT_CENTER[1]);
}
// Removed the direct call to initWithIP() here as it should be part of initApp()

// === Init with GPS on load (high accuracy) ===
async function initApp() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        await refreshWithCoords(latitude, longitude);
      },
      async () => {
        // If GPS fails, try IP-based geolocation
        await initWithIP();
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  } else {
    // If no geolocation support, fall back to IP or default
    await initWithIP();
  }
  // Initially show the main dashboard when app loads
  showPage("main-dashboard");
}
window.addEventListener("load", initApp);

// --- Zone Shading Layer ---
let zoneLayer = null;

function getZoneColor(fixedSeed, i, j) {
  // deterministic pseudo-random (so colors don’t change every refresh)
  const hash = Math.abs(Math.sin(fixedSeed + i * 1000 + j) * 10000);
  if (hash % 100 < 30) return "rgba(255,0,0,0.3)"; // 20% red
  if (hash % 100 < 90) return "rgba(255,255,0,0.3)"; // 40% yellow
  return "rgba(0,255,0,0.3)"; // 40% green
}

function generateZoneShading() {
  if (zoneLayer) {
    map.removeLayer(zoneLayer);
    zoneLayer = null;
  }

  const bounds = map.getBounds();
  const cellSize = 0.05; // degrees ~ 25km, adjust for smaller/bigger
  const layers = [];

  const fixedSeed = 42; // ensures stable colors each time

  const south = Math.floor(bounds.getSouth() / cellSize) * cellSize;
  const north = Math.ceil(bounds.getNorth() / cellSize) * cellSize;
  const west = Math.floor(bounds.getWest() / cellSize) * cellSize;
  const east = Math.ceil(bounds.getEast() / cellSize) * cellSize;

  for (let lat = south; lat < north; lat += cellSize) {
    for (let lng = west; lng < east; lng += cellSize) {
      const i = Math.round(lat / cellSize);
      const j = Math.round(lng / cellSize);
      const color = getZoneColor(fixedSeed, i, j);

      const rect = L.rectangle(
        [
          [lat, lng],
          [lat + cellSize, lng + cellSize],
        ],
        { color, weight: 0, fillOpacity: 0.4 }
      );
      layers.push(rect);
    }
  }

  zoneLayer = L.layerGroup(layers).addTo(map);
}

const zoneLegend = L.control({ position: "bottomright" });

zoneLegend.onAdd = function (map) {
  const div = L.DomUtil.create("div", "zone-legend");
  div.innerHTML = `
        <div style="background: white; padding: 10px; border-radius: 5px; box-shadow: 0 1px 5px rgba(0,0,0,0.4);">
            <h4 style="margin: 0 0 5px 0;">Pollution Zones</h4>
            <div style="margin: 5px 0;">
                <span style="background: rgba(255,0,0,0.3); padding: 3px 10px; margin-right: 5px;">■</span>
                Most Polluted
            </div>
            <div style="margin: 5px 0;">
                <span style="background: rgba(255,255,0,0.3); padding: 3px 10px; margin-right: 5px;">■</span>
                Polluted
            </div>
            <div style="margin: 5px 0;">
                <span style="background: rgba(0,255,0,0.3); padding: 3px 10px; margin-right: 5px;">■</span>
                Least Polluted
            </div>
        </div>
    `;
  return div;
};

// Toggle button
document.getElementById("zoneToggle").addEventListener("change", (e) => {
  if (e.target.checked) {
    generateZoneShading();
    map.on("moveend", generateZoneShading);
    zoneLegend.addTo(map); // Add legend when zones are enabled
  } else {
    if (zoneLayer) map.removeLayer(zoneLayer);
    map.off("moveend", generateZoneShading);
    map.removeControl(zoneLegend); // Remove legend when zones are disabled
  }
});
