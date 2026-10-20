# Snow Day Calculator (USA + Canada)

A fast, server-rendered snow day predictor built with Next.js (App Router), TypeScript (strict) and plain CSS variables.

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # algorithm unit tests (node --test)
npm run build      # production build
npm start
```

Copy `.env.example` to `.env.local` and set `NEXT_PUBLIC_SITE_URL` to your real domain before deploying.
It is used for canonical URLs, the sitemap, JSON-LD and the User-Agent that weather.gov asks for.

## Deploy (Vercel)

Import the folder in Vercel, add `NEXT_PUBLIC_SITE_URL` and deploy. No API keys are needed.

## Data sources (all free, no keys)

| Purpose | Service |
| --- | --- |
| US ZIP and Canadian postal codes | `api.zippopotam.us` (Canada uses the first 3 characters) |
| City names (fallback) | Open-Meteo Geocoding, filtered to US and CA |
| Forecast (the engine) | Open-Meteo forecast API: NOAA HRRR/GFS for the US and Environment Canada GEM for Canada, picked per location |
| Active winter alerts (US only, display only) | `api.weather.gov` |
| "Use my location" button | OpenStreetMap Nominatim reverse lookup |
| Map | Drawn on the server from Natural Earth (`world-atlas`) and US Census (`us-atlas`) shapes. No tile service. |

## The algorithm (`lib/algorithm.ts`)

Implemented exactly as briefed, as a pure function with unit tests:

- Snow: >5 cm +35, >2 cm +20, >0.5 cm +10
- Pre-dawn (3 AM to 7 AM local) snow >= 2 cm: +25
- Low < -15°C +20, < 0°C +10
- Freezing rain or drizzle codes 56, 57, 66, 67 in the pre-dawn window: +30
- Daily max wind > 40 km/h: +15
- Blizzard synergy (pre-dawn snow >= 2 cm and pre-dawn wind >= 35 km/h): +25
- Regional multiplier: low resilience 1.35, high resilience 0.75, Canada default 0.85, USA default 1.0
- Day multiplier: Friday 1.1, Monday 1.05
- `final = min(99, round(base * region * day))`

Small, documented additions:

- "Snowfall" is the larger of the day's total and the overnight total (6 PM the night before to 7 AM), so snow that falls tonight still counts.
- If you check before 5 AM local time, it scores *this morning* (the call has not been made yet).
- On weekends the result says there is no school but still shows how strong the storm is.

### Testing a storm in the off season

Add `?simulate=<cm>` to the URL to run a pretend storm (all snow between 3 AM and 7 AM, low of -3°C):

- `/?simulate=3&q=Atlanta, GA` gives 74%
- `/?simulate=3&q=Buffalo, NY` gives 41%

## Content

Homepage copy, FAQ, city notes and blog posts follow the house style: simple words, no em dashes and no comma before "and" or "or".
Blog posts live in `content/posts.ts` and are read through `getPublishedPosts()`.
