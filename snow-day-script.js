/* ═══════════════════════════════════════════════════
   snow-day-script.js — All logic & UI
   APIs used (all free, no key, CORS-friendly):
     • https://api.zippopotam.us/          (ZIP/postal)
     • https://geocoding-api.open-meteo.com (city names)
     • https://api.open-meteo.com/v1/forecast (weather)
═══════════════════════════════════════════════════ */

/* ════════════════════════
   WMO WEATHER CODE LABELS
════════════════════════ */
const WEATHER_LABELS = {
  0:"Clear sky", 1:"Mainly clear", 2:"Partly cloudy", 3:"Overcast",
  45:"Fog", 48:"Rime fog",
  51:"Light drizzle", 53:"Drizzle", 55:"Heavy drizzle",
  56:"Light freezing drizzle", 57:"Freezing drizzle",
  61:"Light rain", 63:"Rain", 65:"Heavy rain",
  66:"Light freezing rain", 67:"Freezing rain",
  71:"Light snow", 73:"Snow", 75:"Heavy snow",
  77:"Snow grains",
  80:"Rain showers", 81:"Heavy showers", 82:"Violent showers",
  85:"Snow showers", 86:"Heavy snow showers",
  95:"Thunderstorm", 96:"Thunderstorm w/ hail", 99:"Severe thunderstorm",
};

const HEAVY_SNOW_CODES = new Set([71, 73, 75, 77, 85, 86]);
const ICE_CODES        = new Set([56, 57, 66, 67]);

/* ════════════════════════
   FAQ DATA
════════════════════════ */
const FAQS = [
  {
    q: "How accurate is this snow day prediction?",
    a: "The calculator uses live forecast data from Open-Meteo, which is comparable in accuracy to most major weather services for next-day forecasts. The probability model is a simplification — real school closure decisions involve local road conditions, district policy, bus fleet capability, and administrator judgment that no weather-based model can fully replicate. Use this tool as a helpful estimate, not a guarantee."
  },
  {
    q: "Why does my result show 0% when it's clearly going to snow?",
    a: "This can happen for a few reasons: the snowfall forecast may be less than 0.5 cm (a trace amount that rarely causes closures), the location may not have been geocoded accurately, or temperatures may remain above freezing so precipitation falls as rain rather than snow. Try using your ZIP code instead of a city name for more precise coordinates."
  },
  {
    q: "Does this work for Canadian schools?",
    a: "Yes. Enter your full or partial postal code (for example, M5V or M5V 3L9) and the tool will resolve it to your region. Canadian schools do close for snow days, especially in Ontario, Quebec, and the Prairie provinces where heavy snowfall events are common through winter."
  },
  {
    q: "What time does school call a snow day?",
    a: "Most North American school districts make the decision between 4:00 AM and 6:00 AM the morning of the event, based on overnight snowfall totals and road conditions reports from the department of transportation. Some districts announce the night before if forecasts are sufficiently confident. Sign up for your district's alert system to receive the notification the moment it is issued."
  },
  {
    q: "Can ice cause a snow day even without much snowfall?",
    a: "Absolutely. Freezing rain and ice pellets are frequently more dangerous than several inches of snow because they coat roads and sidewalks in a nearly invisible layer of ice that standard snowplows cannot remove. Even a small amount of freezing precipitation can trigger a school closure. The calculator adds extra weight to weather codes associated with ice for this reason."
  },
  {
    q: "My ZIP code isn't working — what should I do?",
    a: "The calculator uses zippopotam.us for ZIP and postal code lookups. Try entering your city and state instead (for example, \"Buffalo NY\" or \"Toronto Ontario\"). If that also fails, double-check the spelling or try a nearby major city. Coverage is strongest for the United States and Canada."
  },
  {
    q: "Does wind speed affect the snow day probability?",
    a: "Yes. Winds above 32 km/h (20 mph) add 10 points to the probability score. High winds cause dangerous blowing and drifting snow that can reduce visibility to near zero even after snowfall has stopped. Districts with long rural bus routes are particularly sensitive to wind conditions because open highways experience much worse conditions than sheltered urban streets."
  },
];

/* ════════════════════════
   THEME TOGGLE
════════════════════════ */
let isDark = false;

function initTheme() {
  const stored = localStorage.getItem('sdc-theme');
  if (stored) {
    isDark = stored === 'dark';
  } else {
    isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
  applyTheme();
}

function applyTheme() {
  document.body.classList.toggle('dark', isDark);
  document.getElementById('themeIcon').textContent  = isDark ? '☀️' : '🌙';
  document.getElementById('themeLabel').textContent = isDark ? 'Light' : 'Dark';
  localStorage.setItem('sdc-theme', isDark ? 'dark' : 'light');
}

document.getElementById('themeBtn').addEventListener('click', function () {
  isDark = !isDark;
  applyTheme();
});

/* ════════════════════════
   GEOCODING
════════════════════════ */
async function geocode(input) {
  const q = input.trim();
  if (!q) return null;

  const isUSZip  = /^\d{5}$/.test(q);
  const isCAPost = /^[A-Za-z]\d[A-Za-z]( ?\d[A-Za-z]\d)?$/.test(q);

  if (isUSZip || isCAPost) {
    const country = isUSZip ? 'us' : 'ca';
    const code    = isUSZip ? q : q.replace(/\s+/, '').slice(0, 3).toUpperCase();
    try {
      const res = await fetch(`https://api.zippopotam.us/${country}/${code}`);
      if (res.ok) {
        const j = await res.json();
        const p = j.places?.[0];
        if (p) return {
          name:      `${p['place name']}, ${p.state || p['state abbreviation'] || ''}`.replace(/, $/, ''),
          country:   j.country || (isUSZip ? 'USA' : 'Canada'),
          latitude:  Number(p.latitude),
          longitude: Number(p.longitude),
        };
      }
    } catch { /* fall through to Open-Meteo geocoder */ }
  }

  // Open-Meteo geocoding API — works for city names and as fallback
  const url = `https://geocoding-api.open-meteo.com/v1/search?count=1&language=en&format=json&name=${encodeURIComponent(q)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Location lookup failed. Please try again.');
  const j = await res.json();
  const p = j.results?.[0];
  if (!p) throw new Error('Location not found. Try a ZIP code, postal code, or city name.');
  return {
    name:      p.admin1 ? `${p.name}, ${p.admin1}` : p.name,
    country:   p.country,
    latitude:  p.latitude,
    longitude: p.longitude,
  };
}

/* ════════════════════════
   WEATHER FETCH
════════════════════════ */
async function fetchWeather(lat, lon) {
  const tomorrow = new Date();
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  const date = tomorrow.toISOString().slice(0, 10);

  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.searchParams.set('latitude',  String(lat));
  url.searchParams.set('longitude', String(lon));
  url.searchParams.set('daily',     'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,snowfall_sum,wind_speed_10m_max');
  url.searchParams.set('timezone',  'auto');
  url.searchParams.set('start_date', date);
  url.searchParams.set('end_date',   date);
  url.searchParams.set('wind_speed_unit', 'kmh');

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error('Unable to retrieve weather data. Please try again later.');
  const j = await res.json();
  const d = j.daily;
  if (!d || !d.weather_code?.length) throw new Error('No forecast data available for this location.');

  return {
    date,
    snowfallCm:   d.snowfall_sum[0] ?? 0,
    tempMaxC:     d.temperature_2m_max[0] ?? 0,
    tempMinC:     d.temperature_2m_min[0] ?? 0,
    windKmh:      d.wind_speed_10m_max[0] ?? 0,
    precipProb:   d.precipitation_probability_max[0] ?? 0,
    weatherCode:  d.weather_code[0] ?? 0,
  };
}

/* ════════════════════════
   PROBABILITY CALCULATION
   (mirrors weather.functions.ts)
════════════════════════ */
function calcProbability(w) {
  let score = 0;
  if (w.snowfallCm > 5)   score += 40;
  else if (w.snowfallCm > 2)   score += 25;
  else if (w.snowfallCm > 0.5) score += 10;
  if (w.tempMinC < 0)          score += 20;
  if (w.windKmh > 32)          score += 10;
  if (HEAVY_SNOW_CODES.has(w.weatherCode)) score += 20;
  if (ICE_CODES.has(w.weatherCode))        score += 10;
  return Math.max(0, Math.min(100, score));
}

function probabilityLabel(p) {
  if (p >= 81) return 'Very High Chance';
  if (p >= 61) return 'High Chance';
  if (p >= 41) return 'Moderate Chance';
  if (p >= 21) return 'Low Chance';
  return 'Very Low Chance';
}

function probabilityColor(p) {
  if (p >= 81) return '#3b82f6'; // blue
  if (p >= 61) return '#f97316'; // orange
  if (p >= 41) return '#eab308'; // yellow
  if (p >= 21) return '#22c55e'; // green
  return '#9ca3af';               // gray
}

function buildExplanation(w, probability) {
  const parts = [];
  if (w.snowfallCm >= 5)      parts.push(`heavy snowfall (${w.snowfallCm.toFixed(1)} cm)`);
  else if (w.snowfallCm > 0)  parts.push(`light snowfall (${w.snowfallCm.toFixed(1)} cm)`);
  if (w.tempMinC < 0)         parts.push(`freezing temperatures (${Math.round(w.tempMinC)}°C)`);
  if (w.windKmh >= 32)        parts.push(`strong winds (${Math.round(w.windKmh)} km/h)`);
  if (ICE_CODES.has(w.weatherCode)) parts.push('ice risk');

  if (parts.length === 0) return 'Conditions look mild — school closures are unlikely.';

  const joined = parts.length === 1
    ? parts[0]
    : parts.slice(0, -1).join(', ') + ' and ' + parts[parts.length - 1];

  const tail = probability >= 60
    ? 'make school closures likely tomorrow.'
    : probability >= 30
    ? 'could lead to a delayed opening tomorrow.'
    : 'give a small chance of a snow day tomorrow.';

  return `${joined.charAt(0).toUpperCase()}${joined.slice(1)} ${tail}`;
}

/* ════════════════════════
   TEMPERATURE HELPERS
════════════════════════ */
function fmtTemp(c) {
  return `${Math.round(c)}°C / ${Math.round(c * 9/5 + 32)}°F`;
}
function fmtSnow(cm) {
  const inches = (cm / 2.54).toFixed(1);
  return `${cm.toFixed(1)} cm (${inches} in)`;
}
function fmtWind(kmh) {
  const mph = Math.round(kmh * 0.621371);
  return `${Math.round(kmh)} km/h (${mph} mph)`;
}

/* ════════════════════════
   UI HELPERS
════════════════════════ */
function showError(msg) {
  const el = document.getElementById('errorMsg');
  el.textContent = msg;
  el.classList.remove('hidden');
}
function clearError() {
  const el = document.getElementById('errorMsg');
  el.textContent = '';
  el.classList.add('hidden');
}

function setResultArea(html) {
  document.getElementById('resultArea').innerHTML = html;
}

function showLoading() {
  setResultArea(`
    <div class="card state-box" style="margin-top:2rem;">
      <div class="spinner"></div>
      <div class="state-text">Analyzing weather forecast…</div>
      <div class="state-sub">Fetching live data from Open-Meteo</div>
    </div>`);
}

/* ════════════════════════
   RENDER RESULT
════════════════════════ */
function renderResult(loc, w, probability) {
  const color      = probabilityColor(probability);
  const label      = probabilityLabel(probability);
  const explanation = buildExplanation(w, probability);
  const weatherLabel = WEATHER_LABELS[w.weatherCode] ?? 'Unknown';

  // Build date label
  const dateObj = new Date(w.date + 'T12:00:00');
  const dateLabel = dateObj.toLocaleDateString(undefined, {
    weekday: 'long', month: 'long', day: 'numeric',
  });

  // Conic gradient for donut
  const deg = probability * 3.6;
  const gradient = `conic-gradient(${color} ${deg}deg, var(--muted) 0deg)`;

  setResultArea(`
    <div class="card" id="result-card" style="margin-top:2rem;">

      <!-- Donut -->
      <div class="donut-wrap">
        <div class="donut-label">Snow Day Chance</div>
        <div class="donut-ring" style="background:${gradient};">
          <div style="
            position:absolute;
            inset:24px;
            border-radius:50%;
            background:var(--card);
            display:flex;
            flex-direction:column;
            align-items:center;
            justify-content:center;
          ">
            <span class="donut-pct" style="color:${color};">${probability}%</span>
          </div>
        </div>
        <div class="prob-label" style="color:${color};">${label}</div>
        <div class="date-label">Prediction for <strong>${dateLabel}</strong></div>
        <div class="loc-label">${loc.name}, ${loc.country}</div>
      </div>

      <!-- Explanation -->
      <p class="explanation">${explanation}</p>

      <!-- Stats -->
      <div class="stats-grid">
        <div class="stat-item">
          <div class="stat-label">Expected snowfall</div>
          <div class="stat-value">${fmtSnow(w.snowfallCm)}</div>
        </div>
        <div class="stat-item">
          <div class="stat-label">Temperature (low / high)</div>
          <div class="stat-value">${fmtTemp(w.tempMinC)} / ${fmtTemp(w.tempMaxC)}</div>
        </div>
        <div class="stat-item">
          <div class="stat-label">Wind speed</div>
          <div class="stat-value">${fmtWind(w.windKmh)}</div>
        </div>
        <div class="stat-item">
          <div class="stat-label">Precipitation chance</div>
          <div class="stat-value">${Math.round(w.precipProb)}%</div>
        </div>
        <div class="stat-item full">
          <div class="stat-label">Weather condition</div>
          <div class="stat-value">${weatherLabel}</div>
        </div>
      </div>

    </div>`);

  // Scroll into view smoothly
  setTimeout(() => {
    document.getElementById('result-card').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 100);
}

/* ════════════════════════
   MAIN HANDLER
════════════════════════ */
async function handleCalculate() {
  const input = document.getElementById('locInput').value.trim();
  clearError();

  if (input.length < 2) {
    showError('Please enter a ZIP code, postal code, or city name.');
    return;
  }

  const btn = document.getElementById('submitBtn');
  btn.disabled = true;
  btn.textContent = 'Analyzing…';
  showLoading();

  try {
    const loc     = await geocode(input);
    if (!loc) throw new Error('Location not found. Try a different format.');
    const weather = await fetchWeather(loc.latitude, loc.longitude);
    const prob    = calcProbability(weather);
    renderResult(loc, weather, prob);
  } catch (err) {
    showError(err.message || 'Something went wrong. Please try again.');
    setResultArea(`
      <div class="card state-box" style="margin-top:2rem;border-style:dashed;">
        <div class="state-icon">📮</div>
        <div class="state-text">Enter your location and hit Calculate to see the forecast.</div>
      </div>`);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Calculate';
  }
}

/* ════════════════════════
   ENTER KEY SUPPORT
════════════════════════ */
document.getElementById('locInput').addEventListener('keydown', function (e) {
  if (e.key === 'Enter') handleCalculate();
});

/* ════════════════════════
   FAQ ACCORDION
════════════════════════ */
function buildFaq() {
  const container = document.getElementById('faqList');
  FAQS.forEach(faq => {
    const item = document.createElement('div');
    item.className = 'faq-item';
    item.innerHTML = `
      <button class="faq-btn" onclick="toggleFaq(this)">
        <span>${faq.q}</span>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
      </button>
      <div class="faq-answer hidden">${faq.a}</div>`;
    container.appendChild(item);
  });
}

function toggleFaq(btn) {
  const answer = btn.nextElementSibling;
  const isOpen = !answer.classList.contains('hidden');
  btn.classList.toggle('open', !isOpen);
  answer.classList.toggle('hidden', isOpen);
}

/* ════════════════════════
   INIT
════════════════════════ */
initTheme();
buildFaq();
