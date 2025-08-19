const TOKEN = "78ad5047b37a2438465bf25d5a2f922136fc384f";
const DEFAULT_CENTER = [26.8467, 80.9462]; // Lucknow fallback

let map = L.map("map").setView(DEFAULT_CENTER, 12);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "&copy; OpenStreetMap contributors",
}).addTo(map);

let userMarker = null;

// UI refs
const refreshBtn = document.getElementById("refreshBtn");
const locateBtn = document.getElementById("locateBtn");
const aqiBadge = document.getElementById("aqiBadge");
const statusText = document.getElementById("statusText");
const adviceText = document.getElementById("adviceText");
const timeText = document.getElementById("timeText");

// Alerts UI
const alertsToggle = document.getElementById("alertsToggle");
const pushToggle = document.getElementById("pushToggle");
const testAlertBtn = document.getElementById("testAlertBtn");
const alertBanner = document.getElementById("alertBanner");
const alertBannerText = document.getElementById("alertBannerText");
const alertBannerSub = document.getElementById("alertBannerSub");
const alertBannerBadge = document.getElementById("alertBannerBadge");
const alertBannerDismiss = document.getElementById("alertBannerDismiss");
const toastContainer = document.getElementById("toastContainer");

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

// --- AQI categorization ---
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

// Forecast
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

// --- Fetch AQI for coords ---
async function fetchAQIForCoords(lat, lon) {
  const url = `https://api.waqi.info/feed/geo:${lat};${lon}/?token=${TOKEN}`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.status !== "ok")
    throw new Error("AQICN error: " + (data.data?.message || data.status));

  return {
    aqi: parseInt(data.data.aqi),
    iaqi: data.data.iaqi || {},
    station: data.data.city?.name || "Nearest station",
    time: data.data.time?.s,
  };
}

// --- Alerts system ---
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
      level: cat.level,
    });
    lastAlert = { level: cat.level, ts: now, aqi: avg };
  }
}


// --- Update pollutants UI ---
function updatePollutants(iaqi) {
  const list = document.getElementById("pollutantsList");
  if (!list) return;
  list.innerHTML = "";

  const pollutants = [
    { key: "pm25", label: "PM2.5", unit: "µg/m³", icon: "🌫️" },
    { key: "pm10", label: "PM10", unit: "µg/m³", icon: "🌫️" },
    { key: "co", label: "CO", unit: "ppb", icon: "🔥" },
    { key: "so2", label: "SO₂", unit: "ppb", icon: "🌋" },
    { key: "no2", label: "NO₂", unit: "ppb", icon: "🚗" },
    { key: "o3", label: "O₃", unit: "ppb", icon: "☀️" },
  ];

  pollutants.forEach(p => {
    const val = iaqi && iaqi[p.key] ? iaqi[p.key].v : null;
    if (val == null) return;
    const cat = aqiCategory(val);
    const row = document.createElement("div");
    row.className = "flex items-center justify-between border-b last:border-0 pb-1";
    row.innerHTML = `
      <span>${p.icon} ${p.label}</span>
      <span class="font-semibold" style="color:${cat.color}">${val} ${p.unit}</span>
    `;
    list.appendChild(row);
  });
}

async function refreshWithCoords(lat, lon) {
  aqiBadge.textContent = "…";
  statusText.textContent = "Fetching data…";
  adviceText.textContent = "—";
  timeText.textContent = "—";

  try {
    const { aqi, station, time, iaqi } = await fetchAQIForCoords(lat, lon);
    updatePollutants(iaqi);

    if (userMarker) map.removeLayer(userMarker);
    userMarker = L.marker([lat, lon])
      .addTo(map)
      .bindPopup("📍 You are here")
      .openPopup();

    map.flyTo([lat, lon], 15, {
      duration: 2,
      easeLinearity: 0.25,
      animate: true,
    });

    const cat = aqiCategory(aqi);
    aqiBadge.textContent = isNaN(aqi) ? "--" : aqi;
    aqiBadge.style.color = cat.color;
    statusText.textContent = cat.label;
    adviceText.textContent = cat.advice;
    timeText.textContent = `Updated: ${
      time || new Date().toLocaleTimeString()
    }`;

    const series = buildForecastSeries(aqi);
    updateForecastChartWith(series);
    maybeAlert({ avg: aqi, cat, series });
  } catch (e) {
    console.error(e);
    statusText.textContent = "⚠ Error fetching data: " + e.message;
  }
}

// --- Geolocation ---
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
      refreshWithCoords(DEFAULT_CENTER[0], DEFAULT_CENTER[1]);
    }
  );
}

// --- Events ---

// --- City search event ---
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
    if (data && data.latitude && data.longitude) {
      await refreshWithCoords(data.latitude, data.longitude);
      return;
    }
  } catch (e) {
    console.warn("IP geolocation failed, using default.", e);
  }
  // fallback to default Lucknow
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

const headerStyle = document.createElement("style");
headerStyle.textContent = `
  .header {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 9999;
    background: white;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  }
  .leaflet-container {
    z-index: 1;
  }
  #map {
    margin-top: 60px;
    z-index: 1;
    position: relative;
  }
`;
document.head.appendChild(headerStyle);



// --- Fetch AQI for city with fallback search ---
async function fetchAQIForCity(city) {
  let url = `https://api.waqi.info/feed/${encodeURIComponent(city)}/?token=${TOKEN}`;
  let res = await fetch(url);
  let data = await res.json();

  if (data.status !== "ok") {
    // fallback to search API
    const searchUrl = `https://api.waqi.info/search/?token=${TOKEN}&keyword=${encodeURIComponent(city)}`;
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
    return {
      aqi: parseInt(data3.data.aqi),
      iaqi: data3.data.iaqi || {},
      station: data3.data.city?.name || first.station?.name || city,
      time: data3.data.time?.s,
      geo: data3.data.city?.geo || first.station?.geo || null,
    };
  }

  return {
    aqi: parseInt(data.data.aqi),
    iaqi: data.data.iaqi || {},
    station: data.data.city?.name || city,
    time: data.data.time?.s,
    geo: data.data.city?.geo || null,
  };
}
async function refreshWithCity(city) {
  aqiBadge.textContent = "…";
  statusText.textContent = "Fetching data…";
  adviceText.textContent = "—";
  timeText.textContent = "—";

  try {
    const { aqi, station, time, geo, iaqi } = await fetchAQIForCity(city);
    updatePollutants(iaqi);
    let lat = DEFAULT_CENTER[0], lon = DEFAULT_CENTER[1];
    if (geo && geo.length === 2) {
      lat = geo[0]; lon = geo[1];
    }

    if (userMarker) map.removeLayer(userMarker);
    userMarker = L.marker([lat, lon]).addTo(map).bindPopup(`📍 ${station}`).openPopup();
    map.flyTo([lat, lon], 13, { duration: 2 });

    const cat = aqiCategory(aqi);
    aqiBadge.textContent = isNaN(aqi) ? "--" : aqi;
    aqiBadge.style.color = cat.color;
    statusText.textContent = cat.label + " – " + station;
    adviceText.textContent = cat.advice;
    timeText.textContent = `Updated: ${time || new Date().toLocaleTimeString()}`;

    const series = buildForecastSeries(aqi);
    updateForecastChartWith(series);
    maybeAlert({ avg: aqi, cat, series });
  } catch (e) {
    console.error(e);
    statusText.textContent = "⚠ Error fetching data: " + e.message;
  }
}

// Try IP-based geolocation instead of forcing GPS
async function initWithIP() {
  try {
    const res = await fetch("https://ipapi.co/json/");
    const data = await res.json();
    if (data && data.latitude && data.longitude) {
      await refreshWithCoords(data.latitude, data.longitude);
      return;
    }
  } catch (e) {
    console.warn("IP geolocation failed, using default.", e);
  }
  // fallback to default Lucknow
  await refreshWithCoords(DEFAULT_CENTER[0], DEFAULT_CENTER[1]);
}
initWithIP();



// === Init with GPS on load (high accuracy) ===
async function initApp() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        LAST_KNOWN = { lat: latitude, lon: longitude };
        await refreshWithCoords(latitude, longitude);
      },
      async () => {
        try {
          const res = await fetch("https://ipapi.co/json/");
          const data = await res.json();
          if (data && data.latitude && data.longitude) {
            LAST_KNOWN = { lat: data.latitude, lon: data.longitude };
            await refreshWithCoords(data.latitude, data.longitude);
            return;
          }
        } catch(e) {}
        LAST_KNOWN = { lat: DEFAULT_CENTER[0], lon: DEFAULT_CENTER[1] };
        await refreshWithCoords(LAST_KNOWN.lat, LAST_KNOWN.lon);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  } else {
    await refreshWithCoords(DEFAULT_CENTER[0], DEFAULT_CENTER[1]);
  }
}
window.addEventListener("load", initApp);

