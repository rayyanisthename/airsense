<div align="center">
  <h1 align="center">
    🌍 AirSense – Real-Time Air Quality & Intelligence Platform
  </h1>
  <p align="center">
    A comprehensive, interactive web application for monitoring air quality, viewing environmental data, and engaging with a community of environmentally-conscious users.
  </p>
</div>

---

AirSense provides a feature-rich dashboard that goes beyond simple AQI numbers. It integrates real-time data from multiple sources to deliver actionable insights through an intuitive, modern interface. Users can check local pollution levels, receive health alerts, analyze trends, interact with an AI assistant, and even participate in community-driven environmental initiatives.

## ✨ Core Features

### Real-Time Data & Mapping

- **Interactive Leaflet Map**: Smooth, responsive map interface to visualize environmental data.
- **Geolocation**: Automatically detects user location via GPS (with IP-based fallback) to provide instant local data.
- **City Search**: Find air quality information for any city worldwide with auto-suggestions.
- **AQI Station View**: Display individual monitoring stations on the map, each with its real-time AQI value. Click any station for a detailed data breakdown.
- **Zone Shading Overlay**: A conceptual feature to visualize pollution intensity zones across the map.

### Health & Safety

- **Personalized Health Advice**: Get clear, actionable health recommendations based on the current AQI.
- **Configurable Alerts**: Receive on-page toast notifications for significant changes in air quality.
- **Browser Push Notifications**: Opt-in to get system-level notifications about poor air quality, even when the app is in the background.
- **Detailed Health Info Page**: An interactive section explaining the effects of different pollutants on cardiovascular, respiratory, and neurological health.

### Analytics & Forecasting

- **Complete Weather Metrics**: View current temperature, humidity, wind speed, and atmospheric pressure.
- **12-Hour AQI Forecast**: A predictive chart showing the estimated AQI for the next 12 hours.
- **7-Day Historical AQI**: A bar chart displaying the average AQI for the past week, helping users identify trends.
- **Detailed Pollutant Breakdown**: See specific concentration values for major pollutants like PM2.5, PM10, O₃, NO₂, SO₂, and CO.

### Interactive Tools

- **AI Chat Assistant**: Powered by the Groq API, the assistant answers questions about air quality, providing context-aware responses based on the user's current data.
- **Modern, Glassmorphic UI**: A beautiful and responsive interface with light and dark modes that adapts to system preferences.

### Community Engagement (Powered by Firebase)

- **User Authentication**: Secure user registration and login.
- **Community Feed**: Users can post photos and captions of their environmental initiatives (e.g., planting a tree, carpooling).
- **Points & Leaderboard**: Earn points for posting and climb the leaderboard, gamifying positive environmental action.
- **Likes**: Engage with other users' posts by liking them.

## 🛠️ Technology Stack

- **Frontend**:
  - HTML5, CSS3, Vanilla JavaScript (ES6 Modules)
  - **Styling**: Tailwind CSS for a utility-first workflow.
  - **Mapping**: Leaflet.js with OpenStreetMap tiles.
  - **Charts**: Chart.js for all data visualizations.
- **Backend & Database**:
  - **Firebase**: Used for Authentication and Firestore (NoSQL Database) to manage users, posts, and points.
- **APIs**:
  - **AQICN API**: For real-time Air Quality Index (AQI) data.
  - **OpenWeatherMap API**: For detailed, real-time weather data.
  - **Groq API**: Powers the AI Chat Assistant.
  - **ipapi.co**: For IP-based geolocation as a fallback.

## 🚀 Getting Started

To run this project locally, follow these steps (The project already includes all these) :

1.  **Clone the repository:**

    ```bash
    git clone https://github.com/your-username/airsense.git
    cd airsense
    ```

2.  **Configure API Keys:** (Already in the project)

    Open `script.js` and replace the placeholder API keys with your own:

    ```javascript
    const TOKEN = "YOUR_AQICN_API_TOKEN";
    const OPENWEATHER_API_KEY = "YOUR_OPENWEATHERMAP_API_KEY";
    const GROQ_API_KEY = "YOUR_GROQ_API_KEY";
    ```

4.  **Set up Firebase:** (Already in the project)

    - Create a new project on the Firebase Console.
    - Enable **Authentication** (with Email/Password provider) and **Firestore Database**.
    - In your Firebase project settings, find your web app's configuration object.
    - Open `index.html` and replace the existing `firebaseConfig` object with yours:

    ```html
    <script type="module">
      // ...
      const firebaseConfig = {
        apiKey: "YOUR_API_KEY",
        authDomain: "YOUR_AUTH_DOMAIN",
        projectId: "YOUR_PROJECT_ID",
        storageBucket: "YOUR_STORAGE_BUCKET",
        messagingSenderId: "YOUR_SENDER_ID",
        appId: "YOUR_APP_ID",
        measurementId: "YOUR_MEASUREMENT_ID",
      };
      // ...
    </script>
    ```

5.  **Run the application:**
    Since the project uses ES6 modules, you need to serve the files from a local web server. You can use the Live Server extension in VS Code or a simple command-line server.

    ```bash
    # If you have Python 3
    python -m http.server

    # Or if you have Node.js and serve installed
    npm install -g serve
    serve .

    # Or just run html with vs code live server extension
    ```

    Then, open your browser and navigate to `http://localhost:8000` (or the port provided by your server).

## 🧑‍💻 Author

Made by **Team JF09**.

-> Rayyan Siddiqui 10C

-> Paarth Shekhar 10D

-> Yashita Yadav 10F

-> Mitanshi Rai 10F

