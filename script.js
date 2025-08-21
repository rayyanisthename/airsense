const auth = window.firebaseAuth;
const db = window.firebaseDB;

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.7.2/firebase-auth.js";

import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  updateDoc,
  doc,
} from "https://www.gstatic.com/firebasejs/10.7.2/firebase-firestore.js";

const TOKEN = "78ad5047b37a2438465bf25d5a2f922136fc384f";
const OPENWEATHER_API_KEY = "7098c9a22e0d5e4e9fbe0d5168291da4";
const GROQ_API_KEY = "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";

const DEFAULT_CENTER = [26.8467, 80.9462];
const DEFAULT_BOUNDS = [
  [-10, 40],
  [75, 150],
];

let map = L.map("map").setView([20, 0], 2);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
}).addTo(map);

let userMarker = null;
let stationMarkersLayerGroup = L.layerGroup().addTo(map);
let lastQuery = null;
let isFlyingToStation = false;
let isDetailViewActive = false;

const locateBtn = document.getElementById("locateBtn");
const aqiBadge = document.getElementById("aqiBadge");
const cityInput = document.getElementById("cityInput");
const citySuggestions = document.getElementById("citySuggestions");
const statusText = document.getElementById("statusText");
const adviceText = document.getElementById("adviceText");
const timeText = document.getElementById("timeText");
const tempBadge = document.getElementById("tempBadge");
const tempStatusText = document.getElementById("tempStatusText");

const humidityText = document.getElementById("humidityText");
const windText = document.getElementById("windText");
const pressureText = document.getElementById("pressureText");

const alertsToggle = document.getElementById("alertsToggle");
const pushToggle = document.getElementById("pushToggle");
const testAlertBtn = document.getElementById("testAlertBtn");
const alertBanner = document.getElementById("alertBanner");
const alertBannerText = document.getElementById("alertBannerText");
const alertBannerSub = document.getElementById("alertBannerSub");
const alertBannerBadge = document.getElementById("alertBannerBadge");
const alertBannerDismiss = document.getElementById("alertBannerDismiss");
const toastContainer = document.getElementById("toastContainer");

const stationToggle = document.getElementById("stationToggle");

const hamburgerBtn = document.getElementById("hamburgerBtn");
const sideMenu = document.getElementById("sideMenu");
const closeMenuBtn = document.getElementById("closeMenuBtn");
const overlay = document.getElementById("overlay");
const navLinks = document.querySelectorAll("#sideMenu a[data-page]");

const mainDashboard = document.getElementById("main-dashboard");
const pollutantsPage = document.getElementById("pollutants-page");
const aiChatPage = document.getElementById("ai-chat-page");
const communityPage = document.getElementById("community-page");
const healthProblemsPage = document.getElementById("health-problems-page");
const pollutantsDetailGrid = document.getElementById("pollutantsDetailGrid");
const historicalAqiChartCanvas = document.getElementById("historicalAqiChart");

const chatMessages = document.getElementById("chatMessages");
const chatInput = document.getElementById("chatInput");
const sendMessageBtn = document.getElementById("sendMessageBtn");

const authWrapper = document.getElementById("authWrapper");
const communityApp = document.getElementById("communityApp");
const communityUserChip = document.getElementById("communityUserChip");

const regName = document.getElementById("regName");
const regEmail = document.getElementById("regEmail");
const regPass = document.getElementById("regPass");
const regBtn = document.getElementById("regBtn");

const loginName = document.getElementById("loginName");
const loginEmail = document.getElementById("loginEmail");
const loginPass = document.getElementById("loginPass");
const loginBtn = document.getElementById("loginBtn");

const logoutBtn = document.getElementById("logoutBtn");
const postImage = document.getElementById("postImage");
const postText = document.getElementById("postText");
const submitPostBtn = document.getElementById("submitPostBtn");
const feedGrid = document.getElementById("feedGrid");
const emptyFeed = document.getElementById("emptyFeed");
const leaderboardList = document.getElementById("leaderboardList");
const refreshFeedBtn = document.getElementById("refreshFeedBtn");

const healthFilterBtns = document.querySelectorAll(".health-filter-btn");
const healthInfoCard = document.getElementById("health-info-card");
const healthTitle = document.getElementById("health-title");
const healthDescription = document.getElementById("health-description");
const healthIconContainer =
  healthInfoCard?.querySelector("div > i").parentElement;

function debounce(func, delay) {
  let timeout;
  return function (...args) {
    const context = this;
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(context, args), delay);
  };
}

function showToast({ title, message, level = 2 }) {
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
    </div>`;
  toastContainer.appendChild(div);
  setTimeout(() => {
    div.style.opacity = "0";
    div.style.transform = "translateY(10px)";
    setTimeout(() => div.remove(), 300);
  }, 4500);
}

function saveLS(key, val) {
  localStorage.setItem(key, JSON.stringify(val));
}
function loadLS(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

async function getUsers() {
  const querySnapshot = await getDocs(collection(db, "users"));
  return querySnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
}

async function getPosts() {
  const q = query(collection(db, "posts"), orderBy("ts", "desc"));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
}

function initTheme() {
  const savedTheme = localStorage.getItem("theme");
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const theme = savedTheme || (prefersDark ? "dark" : "light");
  applyTheme(theme);
}

function applyTheme(theme) {
  if (historicalAqiChart) {
    if (theme === "dark") {
    } else {
    }
    historicalAqiChart.update();
  }
}

function updateDashboardUI(data) {
  const {
    aqi,
    station,
    time,
    temperature,
    weatherDesc,
    humidity,
    windSpeed,
    pressure,
    source,
    advice: customAdvice,
    forecast,
    iaqi,
  } = data;

  const aqiCat = aqiCategory(aqi);
  aqiBadge.style.color = aqiCat.color;
  aqiBadge.textContent = isNaN(aqi) ? "--" : aqi;

  let statusString = aqiCat.label;
  if (station) statusString += ` – ${station}`;
  if (source === "ip") statusString += " (approx.)";
  statusText.textContent = statusString;

  adviceText.textContent = customAdvice || aqiCat.advice;
  timeText.textContent = `Updated: ${time || new Date().toLocaleTimeString()}`;

  if (temperature != null) {
    const tempCat = tempCategory(temperature);
    tempBadge.style.color = tempCat.color;
    tempBadge.textContent = `${temperature.toFixed(1)}°C`;
    tempStatusText.textContent = `${tempCat.label} (${weatherDesc || "N/A"})`;
    humidityText.textContent = `${humidity}%`;
    windText.textContent = `${windSpeed.toFixed(1)} m/s`;
    pressureText.textContent = `${pressure} hPa`;
  } else {
    tempBadge.textContent = "--";
    tempBadge.style.color = "#9ca3af";
    tempStatusText.textContent = "N/A";
    humidityText.textContent = "--";
    windText.textContent = "--";
    pressureText.textContent = "--";
  }

  window.lastAqiData = { ...window.lastAqiData, ...data };
  updatePollutants(iaqi);
  updateForecastChartWith(buildForecastSeries(aqi));
  updateHistoricalChart(forecast?.daily);
  maybeAlert({ avg: aqi, cat: aqiCat });
}

function createAqiIcon(aqi) {
  const category = aqiCategory(aqi);
  const aqiValue = isNaN(aqi) ? "-" : aqi;
  return L.divIcon({
    html: `<div style="background-color: ${category.color};" class="w-6 h-6 rounded-full flex items-center justify-center text-white font-bold text-xs shadow-md">${aqiValue}</div>`,
    className: "",
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
}

async function displayStationsOnMap(stations) {
  stationMarkersLayerGroup.clearLayers();
  if (userMarker) {
    map.removeLayer(userMarker);
    userMarker = null;
  }

  stations.forEach((station) => {
    if (!station.lat || !station.lon || station.aqi === "-") return;

    const aqi = parseInt(station.aqi);
    if (isNaN(aqi)) return;

    const marker = L.marker([station.lat, station.lon], {
      icon: createAqiIcon(aqi),
    }).bindPopup(
      `<b>${station.station.name}</b><br>AQI: ${aqi}<br><small>Click for details</small>`
    );

    marker.on("click", () => {
      refreshWithStationId(station.uid);
    });

    stationMarkersLayerGroup.addLayer(marker);
  });

  const validStations = stations.filter((s) => !isNaN(parseInt(s.aqi)));
  const avgAqi =
    validStations.reduce((acc, s) => acc + parseInt(s.aqi), 0) /
    (validStations.length || 1);
  updateDashboardUI({
    aqi: Math.round(avgAqi),
    station: `${validStations.length} stations in view`,
    advice: "Click a station or search for a city for details.",
    temperature: null,
  });
}

async function refreshWithBounds(bounds) {
  lastQuery = { type: "bounds", value: bounds };
  const sw = bounds.getSouthWest();
  const ne = bounds.getNorthEast();
  const latlng = `${sw.lat},${sw.lng},${ne.lat},${ne.lng}`;
  const url = `https://api.waqi.info/v2/map/bounds?latlng=${latlng}&token=${TOKEN}`;

  statusText.textContent = "Fetching all stations in view...";
  try {
    const res = await fetch(url);
    const result = await res.json();
    if (result.status !== "ok") {
      throw new Error(result.data || "Failed to fetch stations");
    }
    await displayStationsOnMap(result.data);
    map.fitBounds(bounds);
  } catch (e) {
    console.error("Error fetching stations by bounds:", e);
    statusText.textContent = "⚠ Error fetching stations.";
    showToast({ title: "Error", message: e.message, level: 3 });
  }
}

async function refreshWithStationId(uid) {
  aqiBadge.textContent = "…";
  statusText.textContent = "Fetching station data…";
  try {
    const feedUrl = `https://api.waqi.info/feed/@${uid}/?token=${TOKEN}`;
    const res = await fetch(feedUrl);
    const data = await res.json();
    if (data.status !== "ok") throw new Error("Failed to fetch station data");

    const stationData = data.data;
    const { aqi, iaqi, time, forecast } = stationData;
    const { name, geo } = stationData.city;
    const lat = geo[0];
    const lon = geo[1];

    let weatherInfo = {};
    if (lat && lon) {
      const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${OPENWEATHER_API_KEY}`;
      try {
        const weatherRes = await fetch(weatherUrl);
        const weatherData = await weatherRes.json();
        if (weatherData.cod === 200) {
          weatherInfo = {
            temperature: weatherData.main?.temp,
            weatherDesc: weatherData.weather?.[0]?.description,
            humidity: weatherData.main?.humidity,
            windSpeed: weatherData.wind?.speed,
            pressure: weatherData.main?.pressure,
          };
        }
      } catch (e) {
        console.warn("Could not fetch weather for station", e);
      }
    }

    updateDashboardUI({
      aqi: parseInt(aqi),
      iaqi,
      station: name,
      time: time?.s,
      ...weatherInfo,
      lat,
      lon,
      forecast,
    });
    isDetailViewActive = true;
    isFlyingToStation = true;
    map.flyTo([lat, lon], 13);
  } catch (e) {
    console.error("Error fetching station details:", e);
    showToast({
      title: "Error",
      message: "Could not load station details.",
      level: 3,
    });
    statusText.textContent = "⚠ Error loading station.";
    isDetailViewActive = false;
  }
}

const RefreshControl = L.Control.extend({
  options: { position: "topright" },
  onAdd: function (map) {
    const container = L.DomUtil.create(
      "div",
      "leaflet-bar leaflet-control leaflet-control-refresh"
    );
    const link = L.DomUtil.create("a", "", container);
    link.href = "#";
    link.title = "Refresh Data";
    link.innerHTML = '<i class="fas fa-sync-alt"></i>';

    L.DomEvent.disableClickPropagation(container).on(link, "click", (ev) => {
      L.DomEvent.stop(ev);
      if (lastQuery) {
        if (lastQuery.type === "bounds") refreshWithBounds(lastQuery.value);
        else if (lastQuery.type === "coords")
          refreshWithCoords(lastQuery.value[0], lastQuery.value[1]);
        else if (lastQuery.type === "city") refreshWithCity(lastQuery.value);
      } else {
        fetchUserLocationAndData(); // Fallback to user's location if no context
      }
    });
    return container;
  },
});
new RefreshControl().addTo(map);

function renderAuthState() {
  const user = getSessionUser();
  if (user) {
    authWrapper.classList.add("hidden");
    communityApp.classList.remove("hidden");
    communityUserChip.innerHTML = `
      <span class="px-2 py-1 bg-gray-100 rounded-lg">Logged in as <b>${user}</b></span>`;
  } else {
    communityUserChip.innerHTML = "";
    authWrapper.classList.remove("hidden");
    communityApp.classList.add("hidden");
  }
}

async function renderLeaderboard() {
  try {
    const usersRef = collection(db, "users");
    const querySnapshot = await getDocs(
      query(usersRef, orderBy("points", "desc"))
    );

    const users = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    leaderboardList.innerHTML = "";

    if (users.length === 0) {
      leaderboardList.innerHTML =
        '<li class="text-gray-500">No users yet.</li>';
      return;
    }

    users.slice(0, 20).forEach((user, idx) => {
      const li = document.createElement("li");
      li.className = "py-1.5 flex items-center justify-between";
      li.innerHTML = `
        <span>
          <span class="font-semibold">${idx + 1}.</span> 
          ${user.name || "Anonymous"}
        </span>
        <span class="font-bold">${user.points || 0} pts</span>
      `;
      leaderboardList.appendChild(li);
    });
  } catch (error) {
    console.error("Leaderboard error:", error);
    leaderboardList.innerHTML =
      '<li class="text-red-500">Error loading leaderboard</li>';
  }
}

function postCardHTML(post, likedByMe) {
  const likeLabel = likedByMe ? "Unlike" : "Like";
  const likeIcon = likedByMe ? "❤️" : "🤍";
  const likeBtnClass = likedByMe ? "bg-red-50" : "bg-gray-50";
  const when = new Date(post.ts).toLocaleString();
  return `
    <article class="rounded-xl overflow-hidden border bg-white flex flex-col">
      <img src="${
        post.image
      }" alt="post image" class="w-full object-cover max-h-72" />
      <div class="p-3 flex-1 flex flex-col">
        <div class="text-sm text-gray-600 mb-1">by <span class="font-semibold">${
          post.user
        }</span> • <span title="${when}">${timeAgo(post.ts)}</span></div>
        <div class="text-sm mb-3">${escapeHTML(post.text)}</div>
        <div class="mt-auto flex items-center justify-between">
          <button class="likeBtn ${likeBtnClass} text-sm px-3 py-1 rounded-md border"
                  data-id="${post.id}">${likeIcon} ${likeLabel} • ${
    post.likes.length
  }</button>
          <div class="text-xs text-gray-500">#${post.id.slice(0, 6)}</div>
        </div>
      </div>
    </article>
  `;
}

function timeAgo(ts) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function escapeHTML(str) {
  return str.replace(/[&<>"']/g, function (m) {
    return {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    }[m];
  });
}

async function renderFeed() {
  try {
    const posts = await getPosts();
    const me = getSessionUser();
    feedGrid.innerHTML = "";

    if (!posts.length) {
      emptyFeed.classList.remove("hidden");
      return;
    }

    emptyFeed.classList.add("hidden");
    posts.forEach((p) => {
      const liked = me ? (p.likes || []).includes(me) : false;
      const card = document.createElement("div");
      card.innerHTML = postCardHTML(p, liked);
      feedGrid.appendChild(card.firstElementChild);
    });

    feedGrid.querySelectorAll(".likeBtn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-id");
        toggleLike(id);
      });
    });
  } catch (error) {
    feedGrid.innerHTML = '<div class="text-red-500">Error loading posts</div>';
  }
}

async function registerUser() {
  const name = (regName.value || "").trim();
  const email = (regEmail.value || "").trim();
  const pass = (regPass.value || "").trim();

  if (!name || !email || !pass) {
    showToast({
      title: "Missing details",
      message: "Enter name, email and password.",
      level: 2,
    });
    return;
  }

  try {
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      pass
    );

    await addDoc(collection(db, "users"), {
      uid: userCredential.user.uid,
      name: name,
      email: email,
      points: 0,
      createdAt: Date.now(),
    });

    showToast({
      title: "Registered 🎉",
      message: "Now login to continue.",
      level: 2,
    });
    loginEmail.value = email;
  } catch (error) {
    showToast({
      title: "Registration failed",
      message: error.message,
      level: 3,
    });
  }
}

async function loginUser() {
  const email = (loginEmail.value || "").trim();
  const pass = (loginPass.value || "").trim();

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, pass);

    const usersRef = collection(db, "users");
    const q = query(usersRef);
    const querySnapshot = await getDocs(q);
    const userDoc = querySnapshot.docs.find(
      (doc) => doc.data().email === email
    );

    if (userDoc) {
      const userData = userDoc.data();
      setSessionUser(userData.name);
      loginPass.value = "";
      renderAuthState();
      renderFeed();
      renderLeaderboard();
      showToast({
        title: "Welcome!",
        message: `Hi ${userData.name} — you're now logged in.`,
        level: 2,
      });
    }
  } catch (error) {
    showToast({ title: "Login failed", message: error.message, level: 3 });
  }
}

async function logoutUser() {
  try {
    await signOut(auth);
    setSessionUser(null);
    renderAuthState();
    showToast({ title: "Logged out", message: "See you soon!", level: 2 });
  } catch (error) {
    showToast({ title: "Logout failed", message: error.message, level: 3 });
  }
}

async function handlePostSubmit() {
  const me = getSessionUser();
  if (!me) {
    showToast({
      title: "Login required",
      message: "Please login first.",
      level: 2,
    });
    return;
  }

  const file = postImage.files?.[0];
  const text = postText.value?.trim();

  if (!file || !text) {
    showToast({
      title: "Missing details",
      message: "Please select an image and write a caption.",
      level: 2,
    });
    return;
  }

  submitPostBtn.disabled = true;
  submitPostBtn.textContent = "Posting...";

  try {
    const base64Image = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    const usersRef = collection(db, "users");
    const userQuery = query(usersRef, where("name", "==", me));
    const userSnapshot = await getDocs(userQuery);

    if (userSnapshot.empty) {
      throw new Error("User not found in database");
    }

    const userDoc = userSnapshot.docs[0];
    const userData = userDoc.data();

    const postRef = await addDoc(collection(db, "posts"), {
      user: me,
      userId: userDoc.id,
      text: text,
      image: base64Image,
      ts: Date.now(),
      likes: [],
    });

    const newPoints = (userData.points || 0) + 5;
    await updateDoc(userDoc.ref, {
      points: newPoints,
    });

    postImage.value = "";
    postText.value = "";

    showToast({
      title: "Posted Successfully! 🎉",
      message: `+5 points added! You now have ${newPoints} points`,
      level: 1,
    });

    await Promise.all([renderFeed(), renderLeaderboard()]);
  } catch (error) {
    console.error("Post error:", error);
    showToast({
      title: "Post failed",
      message: "Please try again later.",
      level: 3,
    });
  } finally {
    submitPostBtn.disabled = false;
    submitPostBtn.textContent = "Share Post";
  }
}

async function toggleLike(postId) {
  const me = getSessionUser();
  if (!me) {
    showToast({
      title: "Login required",
      message: "Please login to like posts.",
      level: 2,
    });
    return;
  }

  try {
    const postsRef = collection(db, "posts");
    const q = query(postsRef);
    const querySnapshot = await getDocs(q);
    const postDoc = querySnapshot.docs.find((doc) => doc.id === postId);

    if (postDoc) {
      const postRef = doc(db, "posts", postId);
      const post = postDoc.data();
      const likes = post.likes || [];
      const i = likes.indexOf(me);

      if (i >= 0) {
        likes.splice(i, 1);
      } else {
        likes.push(me);
      }

      await updateDoc(postRef, { likes });
      renderFeed();
    }
  } catch (error) {
    console.error("Like error:", error);
    showToast({ title: "Error", message: "Failed to update like", level: 3 });
  }
}

function onEnterCommunityPage() {
  renderAuthState();
  if (getSessionUser()) {
    renderFeed();
    renderLeaderboard();
  }
}

window.lastAqiData = {
  aqi: null,
  iaqi: {},
  station: "Unknown Location",
  time: null,
  temperature: null,
  weatherDesc: null,
  humidity: null,
  windSpeed: null,
  pressure: null,
  lat: null,
  lon: null,
};

function showPage(pageId) {
  mainDashboard.classList.add("hidden");
  pollutantsPage.classList.add("hidden");
  aiChatPage.classList.add("hidden");
  communityPage.classList.add("hidden");
  healthProblemsPage.classList.add("hidden");

  document.getElementById(pageId).classList.remove("hidden");

  sideMenu.classList.remove("open");
  overlay.classList.remove("open");

  if (pageId === "pollutants-page" && pollutantsDetailGrid) {
    if (window.lastAqiData && window.lastAqiData.iaqi) {
      updatePollutants(window.lastAqiData.iaqi);
    } else {
      pollutantsDetailGrid.innerHTML =
        '<p class="text-center text-gray-500">No pollutant data available. Please refresh the dashboard first.</p>';
    }
  }

  if (pageId === "community-page") {
    onEnterCommunityPage();
  }
}

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
navLinks.forEach((link) => {
  link.addEventListener("click", (e) => {
    e.preventDefault();
    const page = e.currentTarget.dataset.page;
    showPage(page);
  });
});

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
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

sendMessageBtn?.addEventListener("click", async () => {
  const userMessage = chatInput.value.trim();
  if (userMessage) {
    addChatMessage("user", userMessage);
    chatInput.value = "";
    chatInput.disabled = true;
    sendMessageBtn.disabled = true;

    const thinkingMessageDiv = document.createElement("div");
    thinkingMessageDiv.className =
      "p-2 rounded-lg mb-2 bg-gray-200 self-start mr-auto max-w-[80%] italic text-gray-500";
    thinkingMessageDiv.innerHTML =
      '<span class="font-semibold">AI:</span> Thinking...';
    chatMessages.appendChild(thinkingMessageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    try {
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
      const currentHumidity =
        aqiData.humidity != null ? `${aqiData.humidity}%` : "N/A";
      const currentWind =
        aqiData.windSpeed != null
          ? `${aqiData.windSpeed.toFixed(1)} m/s`
          : "N/A";
      const currentPressure =
        aqiData.pressure != null ? `${aqiData.pressure} hPa` : "N/A";

      const systemPrompt = `You are an AI Assistant providing air quality insights.
      Current Air Quality Index (AQI): ${currentAQI}
      Location: ${currentStation} (Latitude: ${currentLat}, Longitude: ${currentLon})
      Last Updated: ${lastUpdateTime}
      Current Temperature: ${currentTemperature}
      Humidity: ${currentHumidity}
      Wind Speed: ${currentWind}
      Pressure: ${currentPressure}
      Weather Description: ${weatherDescription}
      Based on this data, provide helpful information or advice related to the user's query about air quality, weather, or general environmental concerns.
      Be concise and informative.
      Whatever response you give, keep it short and to the point.`;

      let chatHistory = [];
      chatHistory.push({ role: "system", content: systemPrompt });
      chatHistory.push({ role: "user", content: userMessage });

      const payload = { model: "llama-3.1-8b-instant", messages: chatHistory };
      const apiUrl = `https://api.groq.com/openai/v1/chat/completions`;

      let response;
      let result;
      let retries = 0;
      const maxRetries = 3;
      const initialDelay = 1000;

      while (retries < maxRetries) {
        try {
          response = await fetch(apiUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${GROQ_API_KEY}`,
            },
            body: JSON.stringify(payload),
          });

          if (response.ok) {
            result = await response.json();
            break;
          } else if (response.status === 429) {
            const delay = initialDelay * Math.pow(2, retries);
            await new Promise((res) => setTimeout(res, delay));
            retries++;
          } else {
            const errorText = await response.text();
            throw new Error(
              `API error: ${response.status} ${response.statusText} - ${errorText}`
            );
          }
        } catch (error) {
          if (retries === maxRetries - 1) throw error;
          const delay = initialDelay * Math.pow(2, retries);
          await new Promise((res) => setTimeout(res, delay));
          retries++;
        }
      }

      thinkingMessageDiv.remove();

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
      thinkingMessageDiv.remove();
      addChatMessage(
        "ai",
        "An error occurred while connecting to the AI. Please try again later."
      );
    } finally {
      chatInput.disabled = false;
      sendMessageBtn.disabled = false;
      chatInput.focus();
    }
  }
});

chatInput?.addEventListener("keypress", (e) => {
  if (e.key === "Enter") sendMessageBtn.click();
});

const forecastCtx = document.getElementById("forecastChart").getContext("2d");
Chart.defaults.color = "#6b7280";
let forecastChart = new Chart(forecastCtx, {
  type: "line",
  data: {
    labels: [],
    datasets: [
      {
        label: "Estimated AQI",
        data: [],
        fill: true,
        tension: 0.35,
        borderColor: "#1d4ed8",
        backgroundColor: "rgba(30, 64, 175, 0.1)",
      },
    ],
  },
  options: {
    plugins: { legend: { display: false } },
    scales: {
      y: {
        suggestedMin: 0,
        suggestedMax: 300,
        grid: { color: "rgba(0, 0, 0, 0.1)" },
      },
      x: { grid: { color: "rgba(0, 0, 0, 0.1)" } },
    },
  },
});

let historicalAqiChart = new Chart(historicalAqiChartCanvas.getContext("2d"), {
  type: "bar",
  data: {
    labels: [],
    datasets: [
      {
        label: "Daily Average AQI",
        data: [],
        backgroundColor: [],
        borderColor: [],
        borderWidth: 1,
      },
    ],
  },
  options: {
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: "rgba(0, 0, 0, 0.1)" },
        ticks: { color: "#6b7280" },
      },
      x: {
        grid: { display: false },
        ticks: { color: "#6b7280" },
      },
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: function (context) {
            let label = context.dataset.label || "";
            if (label) {
              label += ": ";
            }
            if (context.parsed.y !== null) {
              label += context.parsed.y;
            }
            return label;
          },
        },
      },
    },
  },
});

function updateHistoricalChart(dailyForecast) {
  if (!historicalAqiChart || !dailyForecast || !dailyForecast.pm25) return;

  const pm25History = dailyForecast.pm25.slice(-7);

  const labels = pm25History.map((d) =>
    new Date(d.day).toLocaleDateString(undefined, { weekday: "short" })
  );
  const data = pm25History.map((d) => d.avg);
  const backgroundColors = data.map((aqi) => aqiCategory(aqi).color);

  historicalAqiChart.data.labels = labels;
  historicalAqiChart.data.datasets[0].data = data;
  historicalAqiChart.data.datasets[0].backgroundColor = backgroundColors;
  historicalAqiChart.update();
}

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

function pollutantCategory(value, pollutantKey) {
  let thresholds;
  switch (pollutantKey) {
    case "pm25":
      thresholds = [12, 35.4, 55.4, 150.4, 250.4, 350.4];
      break;
    case "pm10":
      thresholds = [54, 154, 254, 354, 424, 504];
      break;
    case "co":
      thresholds = [4.4, 9.4, 12.4, 15.4, 30.4, 40.4];
      value = value / 1000;
      break;
    case "so2":
      thresholds = [35, 75, 185, 304, 604, 804];
      break;
    case "no2":
      thresholds = [53, 100, 360, 649, 1249, 2049];
      break;
    case "o3":
      thresholds = [54, 70, 85, 105, 200];
      break;
    default:
      return aqiCategory(value);
  }
  if (value <= thresholds[0]) return aqiCategory(50);
  if (value <= thresholds[1]) return aqiCategory(100);
  if (value <= thresholds[2]) return aqiCategory(150);
  if (value <= thresholds[3]) return aqiCategory(200);
  if (value <= thresholds[4]) return aqiCategory(300);
  return aqiCategory(400);
}

function tempCategory(tempC) {
  if (!tempC && tempC !== 0)
    return { label: "Unknown", color: "#9ca3af", emoji: "❔" };
  if (tempC <= 0) return { label: "Freezing", color: "#60a5fa", emoji: "🥶" };
  if (tempC <= 10) return { label: "Cold", color: "#93c5fd", emoji: "❄️" };
  if (tempC <= 20) return { label: "Cool", color: "#22c55e", emoji: "🍃" };
  if (tempC <= 28) return { label: "Pleasant", color: "#facc15", emoji: "☀️" };
  if (tempC <= 35) return { label: "Warm", color: "#f97316", emoji: "🥵" };
  return { label: "Hot", color: "#ef4444", emoji: "🔥" };
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
function updateForecastChartWith(series) {
  forecastChart.data.labels = series.labels;
  forecastChart.data.datasets[0].data = series.values;
  forecastChart.update();
}

async function fetchAQIAndTemperatureForCoords(lat, lon) {
  const aqiUrl = `https://api.waqi.info/feed/geo:${lat};${lon}/?token=${TOKEN}`;
  const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${OPENWEATHER_API_KEY}`;
  try {
    const [aqiRes, weatherRes] = await Promise.all([
      fetch(aqiUrl),
      fetch(weatherUrl),
    ]);
    const aqiData = await aqiRes.json();
    if (aqiData.status !== "ok")
      throw new Error(
        "AQICN error: " + (aqiData.data?.message || aqiData.status)
      );
    const weatherData = await weatherRes.json();
    if (weatherData.cod !== 200) {
      return {
        aqi: parseInt(aqiData.data.aqi),
        iaqi: aqiData.data.iaqi || {},
        station: aqiData.data.city?.name || "Nearest station",
        time: aqiData.data.time?.s,
        temperature: null,
        weatherDesc: null,
        humidity: null,
        windSpeed: null,
        pressure: null,
        forecast: aqiData.data.forecast,
        lat,
        lon,
      };
    }
    return {
      aqi: parseInt(aqiData.data.aqi),
      iaqi: aqiData.data.iaqi || {},
      station: aqiData.data.city?.name || "Nearest station",
      time: aqiData.data.time?.s,
      temperature: weatherData.main?.temp,
      tempFeelsLike: weatherData.main?.feels_like,
      humidity: weatherData.main?.humidity,
      windSpeed: weatherData.wind?.speed,
      pressure: weatherData.main?.pressure,
      forecast: aqiData.data.forecast,
      weatherDesc: weatherData.weather?.[0]?.description,
      lat,
      lon,
    };
  } catch (e) {
    console.error("Error fetching data:", e);
    throw e;
  }
}

let lastAlert = { level: -1, ts: 0, aqi: null };
const ALERT_COOLDOWN_MS = 45 * 60 * 1000;
const ALERT_MIN_LEVEL = 3;

async function showPush({ title, message }) {
  if (!("Notification" in window)) return;
  if (Notification.permission === "default") {
    try {
      await Notification.requestPermission();
    } catch {}
  }
  if (Notification.permission === "granted")
    new Notification(title, { body: message });
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

function updatePollutants(iaqi) {
  const pollutantsDetailGrid = document.getElementById("pollutantsDetailGrid");
  if (!pollutantsDetailGrid) return;
  pollutantsDetailGrid.innerHTML = "";
  const pollutants = [
    { key: "pm25", label: "PM2.5", unit: "µg/m³", icon: "🌫️" },
    { key: "pm10", label: "PM10", unit: "µg/m³", icon: "🌫️" },
    { key: "co", label: "CO", unit: "ppm", icon: "🔥" },
    { key: "so2", label: "SO₂", unit: "ppb", icon: "🌋" },
    { key: "no2", label: "NO₂", unit: "ppb", icon: "🚗" },
    { key: "o3", label: "O₃", unit: "ppb", icon: "☀️" },
  ];
  pollutants.forEach((p) => {
    const val = iaqi && iaqi[p.key] ? iaqi[p.key].v : null;
    if (val == null) return;
    let displayValue = val;
    if (p.key === "co") displayValue = (val / 1000).toFixed(2);
    else displayValue = val.toFixed(1);
    const cat = pollutantCategory(val, p.key);
    const card = document.createElement("div");
    card.className = "pollutant-card";
    card.innerHTML = `
      <h3 class="font-semibold mb-2">${p.label} ${p.icon}</h3>
      <div class="pollutant-value" style="color:${cat.color}">${displayValue}</div>
      <div class="pollutant-label">${p.unit} - ${cat.label}</div>`;
    pollutantsDetailGrid.appendChild(card);
  });
}

async function refreshWithCoords(lat, lon, source = "unknown") {
  if (isNaN(lat) || isNaN(lon)) {
    statusText.textContent = "⚠ Error: Invalid location data.";
    tempStatusText.textContent = "⚠ Error: Invalid location data.";
    return;
  }
  isDetailViewActive = false; // Reset detail view when getting data for new coords
  stationMarkersLayerGroup.clearLayers(); // Clear station markers
  lastQuery = { type: "coords", value: [lat, lon] }; // Set last query
  aqiBadge.textContent = "…";
  statusText.textContent = "Fetching data…";
  adviceText.textContent = "—";
  timeText.textContent = "—";
  tempBadge.textContent = "…";
  tempStatusText.textContent = "Fetching data…";
  try {
    const {
      humidity,
      windSpeed,
      pressure,
      aqi,
      station,
      time,
      iaqi,
      temperature,
      tempFeelsLike,
      forecast,
      weatherDesc,
      lat: fetchedLat,
      lon: fetchedLon,
    } = await fetchAQIAndTemperatureForCoords(lat, lon);
    window.lastAqiData = {
      aqi,
      iaqi,
      station,
      time,
      temperature,
      tempFeelsLike,
      humidity,
      windSpeed,
      pressure,
      weatherDesc,
      forecast,
      lat: fetchedLat || lat,
      lon: fetchedLon || lon,
    };
    updateDashboardUI({ ...window.lastAqiData, source });
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
  } catch (e) {
    statusText.textContent = "⚠ Error fetching data: " + e.message;
    tempStatusText.textContent = "⚠ Error fetching data";
    humidityText.textContent = "--";
    windText.textContent = "--";
    pressureText.textContent = "--";
  }
}

function useMyLocation() {
  fetchUserLocationAndData();
}

async function fetchAQIAndTemperatureForCity(city) {
  let url = `https://api.waqi.info/feed/${encodeURIComponent(
    city
  )}/?token=${TOKEN}`;
  let res = await fetch(url);
  let data = await res.json();
  if (data.status !== "ok") {
    const searchUrl = `https://api.waqi.info/search/?token=${TOKEN}&keyword=${encodeURIComponent(
      city
    )}`;
    const res2 = await fetch(searchUrl);
    const data2 = await res2.json();
    if (data2.status !== "ok" || !data2.data?.length)
      throw new Error("No data found for city: " + city);
    const first = data2.data[0];
    const feedUrl = `https://api.waqi.info/feed/@${first.uid}/?token=${TOKEN}`;
    const res3 = await fetch(feedUrl);
    const data3 = await res3.json();
    if (data3.status !== "ok") throw new Error("Failed to fetch station data");
    let temperature = null,
      tempFeelsLike = null,
      weatherDesc = null,
      humidity = null,
      windSpeed = null,
      pressure = null,
      lat = null,
      lon = null;
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
          humidity = weatherData.main?.humidity;
          windSpeed = weatherData.wind?.speed;
          pressure = weatherData.main?.pressure;
        }
      } catch {}
    }
    return {
      aqi: parseInt(data3.data.aqi),
      iaqi: data3.data.iaqi || {},
      station: data3.data.city?.name || first.station?.name || city,
      time: data3.data.time?.s,
      geo: data3.data.city?.geo || first.station?.geo || null,
      temperature,
      tempFeelsLike,
      weatherDesc,
      humidity,
      windSpeed,
      pressure,
      forecast: data3.data.forecast,
      lat,
      lon,
    };
  }
  let temperature = null,
    tempFeelsLike = null,
    weatherDesc = null,
    humidity = null,
    windSpeed = null,
    pressure = null,
    lat = null,
    lon = null;
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
        humidity = weatherData.main?.humidity;
        windSpeed = weatherData.wind?.speed;
        pressure = weatherData.main?.pressure;
      }
    } catch {}
  }
  return {
    aqi: parseInt(data.data.aqi),
    iaqi: data.data.iaqi || {},
    station: data.data.city?.name || city,
    time: data.data.time?.s,
    geo: data.data.city?.geo || null,
    temperature,
    tempFeelsLike,
    weatherDesc,
    humidity,
    windSpeed,
    pressure,
    forecast: data.data.forecast,
    lat,
    lon,
  };
}

async function refreshWithCity(city) {
  isDetailViewActive = false; // Reset detail view when searching for a new city
  stationMarkersLayerGroup.clearLayers(); // Clear station markers
  lastQuery = { type: "city", value: city }; // Set last query
  aqiBadge.textContent = "…";
  statusText.textContent = "Fetching data…";
  adviceText.textContent = "—";
  timeText.textContent = "—";
  tempBadge.textContent = "…";
  tempStatusText.textContent = "Fetching data…";
  try {
    const {
      humidity,
      windSpeed,
      pressure,
      aqi,
      station,
      time,
      geo,
      iaqi,
      temperature,
      tempFeelsLike,
      weatherDesc,
      forecast,
      lat: fetchedLat,
      lon: fetchedLon,
    } = await fetchAQIAndTemperatureForCity(city);
    let lat = DEFAULT_CENTER[0],
      lon = DEFAULT_CENTER[1];
    if (geo && geo.length === 2) {
      lat = geo[0];
      lon = geo[1];
    } else if (fetchedLat != null && fetchedLon != null) {
      lat = fetchedLat;
      lon = fetchedLon;
    }
    if (isNaN(lat) || isNaN(lon)) {
      statusText.textContent = "⚠ Error: Invalid location data for city.";
      tempStatusText.textContent = "⚠ Error: Invalid location data for city.";
      return;
    }
    window.lastAqiData = {
      aqi,
      iaqi,
      station,
      time,
      temperature,
      tempFeelsLike,
      weatherDesc,
      humidity,
      windSpeed,
      pressure,
      forecast,
      lat,
      lon,
    };
    updateDashboardUI(window.lastAqiData);
    if (userMarker) map.removeLayer(userMarker);
    userMarker = L.marker([lat, lon])
      .addTo(map)
      .bindPopup(`📍 ${station}`)
      .openPopup();
    map.flyTo([lat, lon], 13, { duration: 2 });
  } catch (e) {
    statusText.textContent = "⚠ Error fetching data: " + e.message;
    tempStatusText.textContent = "⚠ Error fetching data";
    humidityText.textContent = "--";
    windText.textContent = "--";
    pressureText.textContent = "--";
  }
}

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
      } catch (err) {
        console.error("Error requesting notification permission:", err);
      }
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
  if (pushToggle && pushToggle.checked)
    showPush({
      title: "🔴 Air Quality Unhealthy",
      message: "Test push notification.",
    });
  setBanner({
    text: `🔴 Air Quality Unhealthy: AQI 170`,
    subtext: `Avoid outdoor exercise.`,
    level: 3,
  });
});
alertBannerDismiss?.addEventListener("click", () => {
  alertBanner?.classList.add("hidden");
});

const handleCitySearch = debounce(async (keyword) => {
  if (keyword.length < 2) {
    citySuggestions.innerHTML = "";
    citySuggestions.classList.add("hidden");
    return;
  }

  try {
    const searchUrl = `https://api.waqi.info/search/?token=${TOKEN}&keyword=${encodeURIComponent(
      keyword
    )}`;
    const res = await fetch(searchUrl);
    const result = await res.json();

    citySuggestions.innerHTML = "";
    if (result.status === "ok" && result.data.length > 0) {
      result.data.slice(0, 5).forEach((station) => {
        const item = document.createElement("div");
        item.className = "suggestion-item";
        item.textContent = station.station.name;
        item.addEventListener("click", () => {
          cityInput.value = station.station.name;
          citySuggestions.innerHTML = "";
          citySuggestions.classList.add("hidden");
          refreshWithCity(station.station.name);
        });
        citySuggestions.appendChild(item);
      });
      citySuggestions.classList.remove("hidden");
    } else {
      citySuggestions.classList.add("hidden");
    }
  } catch (error) {
    console.error("City search error:", error);
    citySuggestions.classList.add("hidden");
  }
}, 300);

cityInput.addEventListener("input", (e) => {
  handleCitySearch(e.target.value);
});

async function initWithIP() {
  try {
    const res = await fetch("https://ipapi.co/json/");
    const data = await res.json();
    const lat = parseFloat(data.latitude);
    const lon = parseFloat(data.longitude);
    if (!isNaN(lat) && !isNaN(lon)) {
      await refreshWithCoords(lat, lon, "ip");
      return;
    }
  } catch (e) {
    console.warn("IP-based location failed, falling back to default.", e);
  }
  showToast({
    title: "Location Failed",
    message: "Showing data for default location (Lucknow).",
    level: 3,
  });
  await refreshWithCoords(DEFAULT_CENTER[0], DEFAULT_CENTER[1]);
}

async function fetchUserLocationAndData() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        await refreshWithCoords(latitude, longitude, "gps");
      },
      async (err) => {
        showToast({
          title: "Location not available",
          message: "Could not get GPS location. Trying to locate by IP.",
          level: 2,
        });
        await initWithIP(); // IP fallback
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  } else {
    showToast({
      title: "Location not supported",
      message:
        "Your browser does not support geolocation. Trying to locate by IP.",
      level: 2,
    });
    await initWithIP(); // IP fallback
  }
}

async function initApp() {
  showPage("main-dashboard");
  await fetchUserLocationAndData();
}
window.addEventListener("load", initApp);

let zoneLayer = null;
function getZoneColor(fixedSeed, i, j) {
  const hash = Math.abs(Math.sin(fixedSeed + i * 1000 + j) * 10000);
  if (hash % 100 < 30) return "rgba(255,0,0,0.3)";
  if (hash % 100 < 90) return "rgba(255,255,0,0.3)";
  return "rgba(0,255,0,0.3)";
}
function generateZoneShading() {
  if (zoneLayer) {
    map.removeLayer(zoneLayer);
    zoneLayer = null;
  }
  const bounds = map.getBounds();
  const cellSize = 0.05;
  const layers = [];
  const fixedSeed = 42;
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

const debouncedGenerateZoneShading = debounce(generateZoneShading, 400);

const zoneLegend = L.control({ position: "bottomright" });
zoneLegend.onAdd = function (map) {
  const div = L.DomUtil.create("div", "zone-legend");
  div.innerHTML = `
    <div style="background: white; padding: 10px; border-radius: 5px; box-shadow: 0 1px 5px rgba(0,0,0,0.4);">
      <h4 style="margin: 0 0 5px 0;">Pollution Zones</h4>
      <div style="margin: 5px 0;">
        <span style="background: rgba(255,0,0,0.3); padding: 3px 10px; margin-right: 5px;">■</span> Most Polluted
      </div>
      <div style="margin: 5px 0;">
        <span style="background: rgba(255,255,0,0.3); padding: 3px 10px; margin-right: 5px;">■</span> Polluted
      </div>
      <div style="margin: 5px 0;">
        <span style="background: rgba(0,255,0,0.3); padding: 3px 10px; margin-right: 5px;">■</span> Least Polluted
      </div>
    </div>`;
  return div;
};
document.getElementById("zoneToggle").addEventListener("change", (e) => {
  if (e.target.checked) {
    generateZoneShading();
    map.on("moveend", debouncedGenerateZoneShading);
    zoneLegend.addTo(map);
  } else {
    if (zoneLayer) map.removeLayer(zoneLayer);
    map.off("moveend", debouncedGenerateZoneShading);
    map.removeControl(zoneLegend);
  }
});

const onMapMoveEndForStations = () => {
  if (isFlyingToStation) {
    isFlyingToStation = false; // Reset flag and skip this refresh
    return;
  }
  if (isDetailViewActive) {
    return;
  }
  refreshWithBounds(map.getBounds());
};

const debouncedOnMapMoveEndForStations = debounce(onMapMoveEndForStations, 400);

stationToggle?.addEventListener("change", (e) => {
  if (e.target.checked) {
    map.on("moveend", debouncedOnMapMoveEndForStations);
    isDetailViewActive = false;
    refreshWithBounds(map.getBounds());
  } else {
    map.off("moveend", debouncedOnMapMoveEndForStations);
    stationMarkersLayerGroup.clearLayers();
    isDetailViewActive = false;
  }
});

document.addEventListener("click", (e) => {
  if (!cityInput.contains(e.target) && !citySuggestions.contains(e.target)) {
    citySuggestions.classList.add("hidden");
  }
});

regBtn?.addEventListener("click", registerUser);
loginBtn?.addEventListener("click", loginUser);
logoutBtn?.addEventListener("click", logoutUser);
submitPostBtn?.addEventListener("click", handlePostSubmit);
refreshFeedBtn?.addEventListener("click", async () => {
  try {
    await Promise.all([renderFeed(), renderLeaderboard()]);
  } catch (error) {
    showToast({ title: "Refresh failed", message: error.message, level: 3 });
  }
});

[regName, regEmail, regPass].forEach((el) =>
  el?.addEventListener("keypress", (e) => {
    if (e.key === "Enter") registerUser();
  })
);
[loginEmail, loginPass].forEach((el) =>
  el?.addEventListener("keypress", (e) => {
    if (e.key === "Enter") loginUser();
  })
);

const healthData = {
  cardiovascular: {
    title: "Cardiovascular Diseases",
    description:
      "Fine particulate matter (PM2.5) can enter the bloodstream, leading to inflammation, increased blood pressure, and a higher risk of heart attacks and strokes.",
    icon: "fa-heartbeat",
    iconColor: "text-blue-600",
    bgColor: "bg-blue-100",
  },
  respiratory: {
    title: "Respiratory Issues & Asthma",
    description:
      "Ozone (O₃), nitrogen dioxide (NO₂), and sulfur dioxide (SO₂) can irritate the airways, trigger asthma attacks, and worsen conditions like bronchitis and COPD.",
    icon: "fa-lungs",
    iconColor: "text-green-600",
    bgColor: "bg-green-100",
  },
  allergies: {
    title: "Allergies",
    description:
      "Air pollutants can carry pollen and other allergens deeper into the lungs, intensifying allergic reactions and leading to more severe symptoms.",
    icon: "fa-allergies",
    iconColor: "text-yellow-600",
    bgColor: "bg-yellow-100",
  },
  neurological: {
    title: "Neurological Effects",
    description:
      "Emerging research suggests that long-term exposure to air pollution, particularly PM2.5, may contribute to cognitive decline, dementia, and other neurological disorders.",
    icon: "fa-brain",
    iconColor: "text-purple-600",
    bgColor: "bg-purple-100",
  },
  cancer: {
    title: "Cancer Risk",
    description:
      "Certain air pollutants, such as benzene and formaldehyde, are known carcinogens. Long-term exposure increases the risk of developing lung cancer and other forms of cancer.",
    icon: "fa-disease",
    iconColor: "text-red-600",
    bgColor: "bg-red-100",
  },
};

healthFilterBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    const problem = btn.dataset.healthProblem;
    const data = healthData[problem];

    if (data) {
      healthTitle.textContent = data.title;
      healthDescription.textContent = data.description;
      healthIconContainer.querySelector(
        "i"
      ).className = `fas ${data.icon} fa-2x`;
      healthIconContainer.className = `p-4 rounded-full mb-4 inline-flex flex-shrink-0 ${data.bgColor} ${data.iconColor}`;

      healthFilterBtns.forEach((b) => {
        b.classList.remove("bg-blue-600", "text-white");
        b.classList.add("bg-gray-200", "text-gray-800");
      });
      btn.classList.add("bg-blue-600", "text-white");
      btn.classList.remove("bg-gray-200", "text-gray-800");
    }
  });
});

function getSessionUser() {
  return localStorage.getItem("currentUser");
}

function setSessionUser(user) {
  if (user) {
    localStorage.setItem("currentUser", user);
  } else {
    localStorage.removeItem("currentUser");
  }
}
