const TOKEN = "78ad5047b37a2438465bf25d5a2f922136fc384f";
const DEFAULT_CITY = "Lucknow";
const DEFAULT_CENTER = [26.8467, 80.9462];

let map = L.map("map").setView(DEFAULT_CENTER, 12);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "&copy; OpenStreetMap contributors",
}).addTo(map);

let markers = [];
let heatLayer = null;

const cityInput = document.getElementById("cityInput");
const refreshBtn = document.getElementById("refreshBtn");
const aqiBadge = document.getElementById("aqiBadge");
const statusText = document.getElementById("statusText");
const adviceText = document.getElementById("adviceText");
const stationText = document.getElementById("stationText");
const timeText = document.getElementById("timeText");
const heatToggle = document.getElementById("heatToggle");

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

function aqiCategory(aqi) {
  if (!aqi && aqi !== 0)
    return { label: "Unknown", color: "#9ca3af", advice: "No data" };
  if (aqi <= 50)
    return { label: "Good", color: "#16a34a", advice: "Safe to go outside." };
  if (aqi <= 100)
    return {
      label: "Moderate",
      color: "#eab308",
      advice: "Sensitive groups limit outdoor activity.",
    };
  if (aqi <= 150)
    return {
      label: "Unhealthy (SG)",
      color: "#f97316",
      advice: "Sensitive groups wear a mask.",
    };
  if (aqi <= 200)
    return {
      label: "Unhealthy",
      color: "#ef4444",
      advice: "Avoid outdoor exercise.",
    };
  if (aqi <= 300)
    return {
      label: "Very Unhealthy",
      color: "#7e22ce",
      advice: "Stay indoors.",
    };
  return {
    label: "Hazardous",
    color: "#000000",
    advice: "Health emergency. Remain indoors.",
  };
}

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
function updateForecastChart(aqi) {
  const { labels, values } = buildForecastSeries(aqi);
  forecastChart.data.labels = labels;
  forecastChart.data.datasets[0].data = values;
  forecastChart.update();
}

function updateHeatmap(stations, on) {
  if (heatLayer) {
    map.removeLayer(heatLayer);
    heatLayer = null;
  }
  if (!on) return;
  const pts = stations.map((s) => [
    s.lat,
    s.lon,
    Math.max(0.1, Math.min(1, (parseInt(s.aqi) || 0) / 300)),
  ]);
  heatLayer = L.heatLayer(pts, { radius: 25, blur: 15, maxZoom: 17 });
  heatLayer.addTo(map);
}

async function fetchStations(city) {
  const geoRes = await fetch(
    `https://nominatim.openstreetmap.org/search?city=${encodeURIComponent(
      city
    )}&format=json&limit=1`
  );
  const geoData = await geoRes.json();
  if (!geoData.length) throw new Error("City not found");
  const lat = parseFloat(geoData[0].lat),
    lon = parseFloat(geoData[0].lon);
  const bounds = [lat - 0.3, lon - 0.3, lat + 0.3, lon + 0.3];
  const url = `https://api.waqi.info/map/bounds/?token=${TOKEN}&latlng=${bounds.join(
    ","
  )}`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.status !== "ok")
    throw new Error("AQICN error: " + (data.data?.message || data.status));

  const stations = data.data.map((s) => ({
    name: s.station?.name || s.uid || "station",
    aqi: s.aqi,
    lat: s.lat,
    lon: s.lon,
  }));
  return { lat, lon, stations };
}

async function refresh() {
  const city = (cityInput.value || DEFAULT_CITY).trim();
  aqiBadge.textContent = "…";
  statusText.textContent = "Fetching data…";
  adviceText.textContent = "—";
  stationText.textContent = "—";
  timeText.textContent = "—";

  try {
    const { lat, lon, stations } = await fetchStations(city);

    if (!stations.length) throw new Error("No stations found");

    markers.forEach((m) => map.removeLayer(m));
    markers = [];

    stations.forEach((s) => {
      const popup = `<b>${s.name}</b><br>AQI: ${s.aqi}`;
      const m = L.marker([s.lat, s.lon]).addTo(map).bindPopup(popup);
      markers.push(m);
    });

    map.setView([lat, lon], 12);

    const valid = stations
      .filter((s) => s.aqi !== "-" && !isNaN(s.aqi))
      .map((s) => parseInt(s.aqi));
    const avg = valid.length
      ? Math.round(valid.reduce((a, b) => a + b, 0) / valid.length)
      : null;

    const cat = aqiCategory(avg);
    aqiBadge.textContent = avg === null ? "--" : avg;
    aqiBadge.style.color = cat.color;
    statusText.textContent = cat.label;
    adviceText.textContent = cat.advice;
    stationText.textContent = `${stations.length} stations`;
    timeText.textContent = `Updated: ${new Date().toLocaleTimeString()}`;

    updateForecastChart(avg);
    updateHeatmap(stations, heatToggle.checked);
  } catch (e) {
    console.error(e);
    statusText.textContent = "⚠ Error fetching data: " + e.message;
  }
}

refreshBtn.addEventListener("click", refresh);
heatToggle.addEventListener("change", () => {
  if (markers.length) {
    const pts = markers.map((m) => ({
      lat: m.getLatLng().lat,
      lon: m.getLatLng().lng,
      aqi: 100,
    }));
    updateHeatmap(pts, heatToggle.checked);
  }
});

//run on loading
refresh();
