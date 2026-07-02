const GEOCODE_URL = "https://geocoding-api.open-meteo.com/v1/search";
const REVERSE_GEOCODE_URL = "https://api.bigdatacloud.net/data/reverse-geocode-client";
const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";

// ---- DOM references -------------------------------------------------
const els = {
  form: document.getElementById("search-form"),
  input: document.getElementById("city-input"),
  searchBtn: document.getElementById("search-btn"),
  locateBtn: document.getElementById("locate-btn"),
  retryBtn: document.getElementById("retry-btn"),

  stateIdle: document.getElementById("state-idle"),
  stateLoading: document.getElementById("state-loading"),
  stateError: document.getElementById("state-error"),
  stateResult: document.getElementById("state-result"),
  idleMessage: document.getElementById("idle-message"),
  loadingMessage: document.getElementById("loading-message"),

  errorTitle: document.getElementById("error-title"),
  errorMessage: document.getElementById("error-message"),

  locationName: document.getElementById("location-name"),
  locationCoords: document.getElementById("location-coords"),
  conditionIcon: document.getElementById("condition-icon"),
  tempValue: document.getElementById("temp-value"),
  conditionDesc: document.getElementById("condition-desc"),
  feelsLikeValue: document.getElementById("feels-like-value"),
  localTime: document.getElementById("local-time"),

  humidityValue: document.getElementById("humidity-value"),
  humidityBar: document.getElementById("humidity-bar"),
  windValue: document.getElementById("wind-value"),
  windBar: document.getElementById("wind-bar"),
  windDirValue: document.getElementById("wind-dir-value"),
  windCompass: document.getElementById("wind-compass"),
  pressureValue: document.getElementById("pressure-value"),

  trendChart: document.getElementById("trend-chart"),
  trendLabels: document.getElementById("trend-labels"),
  forecastList: document.getElementById("forecast-list"),
};

let lastAction = { type: "geo" };

// ---- WMO weather code lookup -----------------------------------------
// Open-Meteo returns a numeric "weather_code" per the WMO table.
// We map ranges/codes to a human description and a small icon renderer.
const WEATHER_CODES = {
  0: { desc: "Clear sky", icon: "sun" },
  1: { desc: "Mostly clear", icon: "sun-cloud" },
  2: { desc: "Partly cloudy", icon: "sun-cloud" },
  3: { desc: "Overcast", icon: "cloud" },
  45: { desc: "Fog", icon: "fog" },
  48: { desc: "Depositing rime fog", icon: "fog" },
  51: { desc: "Light drizzle", icon: "drizzle" },
  53: { desc: "Moderate drizzle", icon: "drizzle" },
  55: { desc: "Dense drizzle", icon: "drizzle" },
  56: { desc: "Freezing drizzle", icon: "drizzle" },
  57: { desc: "Dense freezing drizzle", icon: "drizzle" },
  61: { desc: "Slight rain", icon: "rain" },
  63: { desc: "Moderate rain", icon: "rain" },
  65: { desc: "Heavy rain", icon: "rain" },
  66: { desc: "Freezing rain", icon: "rain" },
  67: { desc: "Heavy freezing rain", icon: "rain" },
  71: { desc: "Slight snowfall", icon: "snow" },
  73: { desc: "Moderate snowfall", icon: "snow" },
  75: { desc: "Heavy snowfall", icon: "snow" },
  77: { desc: "Snow grains", icon: "snow" },
  80: { desc: "Slight rain showers", icon: "rain" },
  81: { desc: "Moderate rain showers", icon: "rain" },
  82: { desc: "Violent rain showers", icon: "rain" },
  85: { desc: "Slight snow showers", icon: "snow" },
  86: { desc: "Heavy snow showers", icon: "snow" },
  95: { desc: "Thunderstorm", icon: "storm" },
  96: { desc: "Thunderstorm with hail", icon: "storm" },
  99: { desc: "Severe thunderstorm with hail", icon: "storm" },
};

function describeWeatherCode(code) {
  return WEATHER_CODES[code] || { desc: "Unknown conditions", icon: "cloud" };
}

const ICONS = {
  sun: `<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="4.2" stroke="currentColor" stroke-width="1.5"/><path d="M12 2.5v2.4M12 19.1v2.4M4.2 4.2l1.7 1.7M18.1 18.1l1.7 1.7M2.5 12h2.4M19.1 12h2.4M4.2 19.8l1.7-1.7M18.1 5.9l1.7-1.7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`,
  "sun-cloud": `<svg viewBox="0 0 24 24" fill="none"><circle cx="8.5" cy="8.5" r="3.4" stroke="currentColor" stroke-width="1.4"/><path d="M8.5 2.3v1.8M13.5 8.5h1.8M3.4 4.6l1.3 1.3M2.5 8.5h1.8" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/><path d="M6.5 20h11a3.8 3.8 0 0 0 .6-7.55A5 5 0 0 0 8.7 13.9 3.5 3.5 0 0 0 6.5 20z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>`,
  cloud: `<svg viewBox="0 0 24 24" fill="none"><path d="M6 19h12a4 4 0 0 0 .6-7.95A5.5 5.5 0 0 0 8.1 10 3.8 3.8 0 0 0 6 19z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>`,
  fog: `<svg viewBox="0 0 24 24" fill="none"><path d="M6 15h12M4 18h16M6 12h9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M8 9.2a4 4 0 0 1 7.6-1.7 4.3 4.3 0 0 1 3.9 3" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>`,
  drizzle: `<svg viewBox="0 0 24 24" fill="none"><path d="M6 13h11a3.6 3.6 0 0 0 .5-7.16A5 5 0 0 0 8 6.9 3.5 3.5 0 0 0 6 13z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M8 17.5l-1 2M13 17.5l-1 2M18 17.5l-1 2" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>`,
  rain: `<svg viewBox="0 0 24 24" fill="none"><path d="M6 12h11a3.6 3.6 0 0 0 .5-7.16A5 5 0 0 0 8 5.9 3.5 3.5 0 0 0 6 12z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M7.5 16.5l-1.3 2.6M12.5 16.5l-1.3 2.6M17.5 16.5l-1.3 2.6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`,
  snow: `<svg viewBox="0 0 24 24" fill="none"><path d="M6 11h11a3.6 3.6 0 0 0 .5-7.16A5 5 0 0 0 8 4.9 3.5 3.5 0 0 0 6 11z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M8 15v6M6 17l4 2M6 19l4-2M16 15v6M14 17l4 2M14 19l4-2" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>`,
  storm: `<svg viewBox="0 0 24 24" fill="none"><path d="M6 11h11a3.6 3.6 0 0 0 .5-7.16A5 5 0 0 0 8 4.9 3.5 3.5 0 0 0 6 11z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M13 14l-3 5h3l-2 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
};

function iconMarkup(name) {
  return ICONS[name] || ICONS.cloud;
}

// ---- Compass helper ----------------------------------------------------
const COMPASS_POINTS = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];

function degreesToCompass(deg) {
  const index = Math.round(deg / 22.5) % 16;
  return COMPASS_POINTS[index];
}

// ---- UI state machine ---------------------------------------------------
function showState(state) {
  els.stateIdle.classList.add("is-hidden");
  els.stateLoading.classList.add("is-hidden");
  els.stateError.classList.add("is-hidden");
  els.stateResult.classList.add("is-hidden");

  const map = {
    idle: els.stateIdle,
    loading: els.stateLoading,
    error: els.stateError,
    result: els.stateResult,
  };
  map[state].classList.remove("is-hidden");
}

function setLoading(isLoading) {
  els.searchBtn.disabled = isLoading;
  els.searchBtn.style.opacity = isLoading ? "0.6" : "1";
}

// ---- Custom error type so we can distinguish failure reasons -----------
class WeatherError extends Error {
  constructor(message, kind) {
    super(message);
    this.kind = kind; // "not-found" | "network" | "http" | "parse"
  }
}

// ---- Async fetch: geocode a city name to coordinates --------------------
async function geocodeCity(cityName) {
  const url = `${GEOCODE_URL}?name=${encodeURIComponent(cityName)}&count=1&language=en&format=json`;

  let response;
  try {
    response = await fetch(url);
  } catch (networkErr) {
    throw new WeatherError(
      "Could not reach the geocoding service. Check your connection and try again.",
      "network"
    );
  }

  if (!response.ok) {
    throw new WeatherError(
      `Geocoding service responded with an error (HTTP ${response.status}).`,
      "http"
    );
  }

  let data;
  try {
    data = await response.json();
  } catch (parseErr) {
    throw new WeatherError("Received an unreadable response from the geocoding service.", "parse");
  }

  // Nested JSON: { results: [ { name, latitude, longitude, country, admin1, timezone }, ... ] }
  if (!data.results || data.results.length === 0) {
    throw new WeatherError(`No location found for "${cityName}". Check the spelling and try again.`, "not-found");
  }

  const place = data.results[0];
  return {
    name: place.name,
    country: place.country,
    admin1: place.admin1,
    latitude: place.latitude,
    longitude: place.longitude,
    timezone: place.timezone,
  };
}

// ---- Browser geolocation: ask the device for live coordinates -----------
function getCurrentCoords() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new WeatherError("Your browser doesn't support live location. Search for a city instead.", "geo"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({ latitude: position.coords.latitude, longitude: position.coords.longitude });
      },
      (geoErr) => {
        let message = "Couldn't get your location. Search for a city instead.";
        if (geoErr.code === geoErr.PERMISSION_DENIED) {
          message = "Location access was denied. Search for a city instead.";
        } else if (geoErr.code === geoErr.POSITION_UNAVAILABLE) {
          message = "Your location is unavailable right now. Search for a city instead.";
        } else if (geoErr.code === geoErr.TIMEOUT) {
          message = "Location request timed out. Search for a city instead.";
        }
        reject(new WeatherError(message, "geo"));
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    );
  });
}

// ---- Async fetch: turn coordinates back into a place name ----------------
// Uses BigDataCloud's free client-side reverse geocoding endpoint (no key, CORS-enabled).
async function reverseGeocode(latitude, longitude) {
  const url = `${REVERSE_GEOCODE_URL}?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`;

  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const data = await response.json();
    const name = data.city || data.locality || data.principalSubdivision || "Your location";
    const admin1 = data.principalSubdivision;
    const country = data.countryName;
    return { name, admin1: admin1 && admin1 !== name ? admin1 : "", country };
  } catch (err) {
    return null; // Reverse geocoding is a nicety — fall back to plain coordinates if it fails.
  }
}

// ---- Async fetch: pull current + hourly + daily weather ------------------
async function fetchWeather(latitude, longitude, timezone) {
  const params = new URLSearchParams({
    latitude,
    longitude,
    timezone: timezone || "auto",
    current: [
      "temperature_2m",
      "relative_humidity_2m",
      "apparent_temperature",
      "weather_code",
      "wind_speed_10m",
      "wind_direction_10m",
      "surface_pressure",
    ].join(","),
    hourly: "temperature_2m,weather_code",
    daily: "weather_code,temperature_2m_max,temperature_2m_min",
    forecast_days: "7",
  });

  const url = `${FORECAST_URL}?${params.toString()}`;

  let response;
  try {
    response = await fetch(url);
  } catch (networkErr) {
    throw new WeatherError(
      "Could not reach the forecast service. Check your connection and try again.",
      "network"
    );
  }

  if (!response.ok) {
    throw new WeatherError(`Forecast service responded with an error (HTTP ${response.status}).`, "http");
  }

  let data;
  try {
    data = await response.json();
  } catch (parseErr) {
    throw new WeatherError("Received an unreadable response from the forecast service.", "parse");
  }

  if (!data.current || !data.hourly || !data.daily) {
    throw new WeatherError("The forecast response was missing expected data.", "parse");
  }

  return data;
}

// ---- Orchestrator: geocode then fetch weather, then render ---------------
async function loadWeatherForCity(cityName) {
  lastAction = { type: "city", value: cityName };
  els.loadingMessage.textContent = "Calibrating instrument…";
  showState("loading");
  setLoading(true);

  try {
    const place = await geocodeCity(cityName);
    const weather = await fetchWeather(place.latitude, place.longitude, place.timezone);
    renderDashboard(place, weather);
    showState("result");
  } catch (err) {
    renderError(err);
    showState("error");
  } finally {
    setLoading(false);
  }
}

// ---- Orchestrator: take a live reading from the device's own coordinates -
async function loadWeatherForCurrentLocation({ silent } = {}) {
  lastAction = { type: "geo" };

  if (!silent) {
    els.loadingMessage.textContent = "Finding your location…";
    showState("loading");
  }
  setLoading(true);
  if (els.locateBtn) els.locateBtn.classList.add("is-locating");

  try {
    const coords = await getCurrentCoords();
    els.loadingMessage.textContent = "Calibrating instrument…";
    if (silent) showState("loading");

    const [place, weather] = await Promise.all([
      reverseGeocode(coords.latitude, coords.longitude),
      fetchWeather(coords.latitude, coords.longitude, "auto"),
    ]);

    const resolvedPlace = {
      name: (place && place.name) || "Your location",
      admin1: place ? place.admin1 : "",
      country: place ? place.country : "",
      latitude: coords.latitude,
      longitude: coords.longitude,
    };

    renderDashboard(resolvedPlace, weather);
    showState("result");
  } catch (err) {
    // On a silent (page-load) attempt, a failure just quietly falls back to idle —
    // no need to alarm the user before they've even asked for anything.
    if (silent) {
      els.idleMessage.textContent = "Enter a city above, or tap the target icon to use your location.";
      showState("idle");
    } else {
      renderError(err);
      showState("error");
    }
  } finally {
    setLoading(false);
    if (els.locateBtn) els.locateBtn.classList.remove("is-locating");
  }
}

function renderError(err) {
  const isWeatherError = err instanceof WeatherError;
  const titleMap = {
    "not-found": "City not found",
    network: "Connection lost",
    http: "Service unavailable",
    parse: "Unreadable signal",
    geo: "Location unavailable",
  };

  els.errorTitle.textContent = isWeatherError ? titleMap[err.kind] || "Reading failed" : "Reading failed";
  els.errorMessage.textContent = isWeatherError
    ? err.message
    : "An unexpected error interrupted the reading. Please try again.";
}

// ---- Render: fill the dashboard from parsed nested JSON -------------------
function renderDashboard(place, weather) {
  const current = weather.current;
  const hourly = weather.hourly;
  const daily = weather.daily;

  // --- Location header ---
  const region = [place.admin1, place.country].filter(Boolean).join(", ");
  els.locationName.textContent = region ? `${place.name} — ${region}` : place.name;
  els.locationCoords.textContent = `${place.latitude.toFixed(2)}°, ${place.longitude.toFixed(2)}°`;

  // --- Primary reading ---
  const conditions = describeWeatherCode(current.weather_code);
  els.conditionIcon.innerHTML = iconMarkup(conditions.icon);
  els.tempValue.textContent = Math.round(current.temperature_2m);
  els.conditionDesc.textContent = conditions.desc;
  els.feelsLikeValue.textContent = Math.round(current.apparent_temperature);

  const localTime = new Date();
  els.localTime.textContent = localTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  // --- Metrics ---
  const humidity = current.relative_humidity_2m;
  els.humidityValue.textContent = Math.round(humidity);
  els.humidityBar.style.width = `${Math.min(100, humidity)}%`;

  const wind = current.wind_speed_10m;
  els.windValue.textContent = Math.round(wind);
  els.windBar.style.width = `${Math.min(100, (wind / 60) * 100)}%`;

  els.windDirValue.textContent = `${degreesToCompass(current.wind_direction_10m)} · ${Math.round(current.wind_direction_10m)}°`;
  els.windCompass.style.transform = `rotate(${current.wind_direction_10m}deg)`;

  els.pressureValue.textContent = Math.round(current.surface_pressure);

  // --- Hourly trend (next 12 hours) ---
  renderTrend(hourly);

  // --- Seven day forecast ---
  renderForecast(daily);
}

// ---- Trend chart: draw a simple SVG line from hourly nested arrays --------
function renderTrend(hourly) {
  const now = new Date();
  let startIndex = hourly.time.findIndex((t) => new Date(t) >= now);
  if (startIndex === -1) startIndex = 0;

  const temps = hourly.temperature_2m.slice(startIndex, startIndex + 12);
  const times = hourly.time.slice(startIndex, startIndex + 12);

  if (temps.length === 0) {
    els.trendChart.innerHTML = "";
    els.trendLabels.innerHTML = "";
    return;
  }

  const width = 320;
  const height = 90;
  const padTop = 12;
  const padBottom = 8;

  const min = Math.min(...temps);
  const max = Math.max(...temps);
  const range = max - min || 1;

  const points = temps.map((t, i) => {
    const x = (i / (temps.length - 1 || 1)) * width;
    const y = padTop + (1 - (t - min) / range) * (height - padTop - padBottom);
    return [x, y];
  });

  const pathD = points
    .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`)
    .join(" ");

  const areaD = `${pathD} L${width},${height} L0,${height} Z`;

  const dots = points
    .map(([x, y], i) => `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${i === 0 ? 3.2 : 2}" fill="${i === 0 ? "var(--brass)" : "var(--cyan)"}" />`)
    .join("");

  els.trendChart.innerHTML = `
    <defs>
      <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="var(--cyan)" stop-opacity="0.28" />
        <stop offset="100%" stop-color="var(--cyan)" stop-opacity="0" />
      </linearGradient>
    </defs>
    <path d="${areaD}" fill="url(#trendFill)" stroke="none"></path>
    <path d="${pathD}" fill="none" stroke="var(--cyan)" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"></path>
    ${dots}
  `;

  const labelStep = Math.ceil(times.length / 6);
  els.trendLabels.innerHTML = times
    .filter((_, i) => i % labelStep === 0)
    .map((t) => `<span>${new Date(t).toLocaleTimeString([], { hour: "numeric" })}</span>`)
    .join("");
}

// ---- Seven-day forecast list from nested daily arrays ----------------------
function renderForecast(daily) {
  const rows = daily.time.map((dateStr, i) => {
    const conditions = describeWeatherCode(daily.weather_code[i]);
    const day = new Date(dateStr).toLocaleDateString([], { weekday: "short" });
    return `
      <li>
        <span class="forecast-day">${day}</span>
        <span class="forecast-icon">${iconMarkup(conditions.icon)}</span>
        <span class="forecast-desc">${conditions.desc}</span>
        <span class="forecast-range"><span class="max">${Math.round(daily.temperature_2m_max[i])}°</span> / <span class="min">${Math.round(daily.temperature_2m_min[i])}°</span></span>
      </li>
    `;
  });

  els.forecastList.innerHTML = rows.join("");
}

// ---- Event wiring -----------------------------------------------------
els.form.addEventListener("submit", (e) => {
  e.preventDefault();
  const value = els.input.value.trim();
  if (!value) return;
  loadWeatherForCity(value);
});

if (els.locateBtn) {
  els.locateBtn.addEventListener("click", () => {
    loadWeatherForCurrentLocation();
  });
}

els.retryBtn.addEventListener("click", () => {
  if (lastAction.type === "geo") {
    loadWeatherForCurrentLocation();
  } else if (lastAction.value) {
    loadWeatherForCity(lastAction.value);
  }
});

// Start by quietly trying to take a live reading from the device's location.
// If permission is denied or unavailable, it falls back to the idle state
// with the search box ready — no error shown for an attempt the user didn't make.
loadWeatherForCurrentLocation({ silent: true });

