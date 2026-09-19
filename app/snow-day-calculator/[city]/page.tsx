import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { PredictionPayload } from "@/app/actions";
import Calculator from "@/components/Calculator";
import JsonLd from "@/components/JsonLd";
import ResultCard from "@/components/ResultCard";
import { getResilience, predictSnowDay } from "@/lib/algorithm";
import { CITIES, formatAvgSnow, getCity } from "@/lib/cities";
import type { Place } from "@/lib/geocode";
import { regionName } from "@/lib/regions";
import { SITE_URL, currentSeason } from "@/lib/site";
import { fetchForecast, fetchNwsAlerts } from "@/lib/weather";

export const revalidate = 3600;
export const dynamicParams = false;

export function generateStaticParams() {
  return CITIES.map((c) => ({ city: c.slug }));
}

type Props = { params: Promise<{ city: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const city = getCity((await params).city);
  if (!city) return {};
  const title = `${city.name} Snow Day Calculator ${currentSeason()}: Will ${city.name} Schools Close Tomorrow?`;
  const description = `Live snow day chance for ${city.name}, ${city.region}. See tomorrow's closure odds for ${city.district} from the hour by hour forecast plus local winter notes.`;
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: `/snow-day-calculator/${city.slug}` },
    openGraph: { title, description, url: `/snow-day-calculator/${city.slug}` },
  };
}

const TIER_NOTE = {
  low: "Schools in this area are quick to close because snow is rare and there are few plows.",
  standard: "Schools in this area sit in the middle. A few inches at the wrong time can close them.",
  high: "Schools in this area are built for winter. It takes a big storm, ice or dangerous cold to close them.",
  canada: "Schools in this province handle winter well. Bus cancellations are more common than full closures.",
} as const;

export default async function CityPage({ params }: Props) {
  const city = getCity((await params).city);
  if (!city) notFound();

  const place: Place = {
    name: city.name,
    region: city.region,
    regionName: regionName(city.region, city.country),
    country: city.country,
    lat: city.lat,
    lon: city.lon,
    label: `${city.name}, ${city.region}`,
    source: "open-meteo",
  };

  let payload: PredictionPayload | null = null;
  try {
    const [forecast, alerts] = await Promise.all([
      fetchForecast(city.lat, city.lon, 3600),
      city.country === "US" ? fetchNwsAlerts(city.lat, city.lon) : Promise.resolve([]),
    ]);
    payload = {
      prediction: predictSnowDay(forecast, { country: city.country, region: city.region }),
      alerts,
      simulated: null,
      timezone: forecast.timezone,
      updatedAt: new Date().toISOString(),
    };
  } catch {
    payload = null;
  }

  const tier = getResilience({ country: city.country, region: city.region }).tier;
  const nearby = CITIES.filter((c) => c.slug !== city.slug && c.country === city.country)
    .map((c) => ({ c, d: Math.hypot(c.lat - city.lat, c.lon - city.lon) }))
    .sort((a, b) => a.d - b.d)
    .slice(0, 4)
    .map((x) => x.c);

  const faqs = [
    {
      q: `Will ${city.name} have a snow day tomorrow?`,
      a: payload
        ? `Right now our forecast gives ${city.name} a ${payload.prediction.chance}% chance for ${payload.prediction.weekday}. This number updates every hour as new forecast data arrives.`
        : `Our live forecast is loading slowly right now. Please use the calculator on this page to try again.`,
    },
    {
      q: `How much snow does ${city.name} get in a normal winter?`,
      a: `${city.name} gets ${formatAvgSnow(city)} of snow in an average year. Some winters bring much more and some bring much less.`,
    },
    {
      q: `Who decides if ${city.district} closes?`,
      a: `The superintendent or director of education makes the call, usually between 4:30 AM and 6 AM. They look at road reports, bus routes and the forecast. Always check the official ${city.district} website or alerts for the final word.`,
    },
  ];

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
            { "@type": "ListItem", position: 2, name: `${city.name} Snow Day Calculator`, item: `${SITE_URL}/snow-day-calculator/${city.slug}` },
          ],
        }}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
        }}
      />

      <section className="hero" style={{ paddingBottom: 24 }}>
        <div className="container">
          <nav className="breadcrumbs" aria-label="Breadcrumb">
            <Link href="/">Home</Link> / <Link href="/#cities">Cities</Link> / {city.name}
          </nav>
          <div className="hero-copy" style={{ marginBottom: 24 }}>
            <span className="pill"><span className="live-dot" /> {place.regionName}, {city.country === "US" ? "United States" : "Canada"}</span>
            <h1>Will {city.name} Have a <span className="gradient-text">Snow Day</span> Tomorrow?</h1>
            <p className="hero-sub">Live closure chance for {city.district}, updated every hour from the local hour by hour forecast.</p>
          </div>
          <div style={{ maxWidth: 880, margin: "0 auto" }} aria-live="polite">
            {payload ? (
              <ResultCard place={place} payload={payload} showShare={false} />
            ) : (
              <div className="error-box" role="alert">Unable to retrieve weather data. Please try again.</div>
            )}
          </div>
        </div>
      </section>

      <section className="section-tight">
        <div className="container split">
          <div className="glass card">
            <h2 style={{ fontSize: "1.5rem" }}>Winter in {city.name}</h2>
            <p>{city.note}</p>
            <p>{TIER_NOTE[tier]}</p>
            <p style={{ marginBottom: 0 }}>
              <strong>Average snowfall:</strong> {formatAvgSnow(city)} per year.
            </p>
          </div>
          <div className="glass card">
            <h2 style={{ fontSize: "1.5rem" }}>{city.name} snow day FAQ</h2>
            {faqs.map((f) => (
              <details key={f.q} className="faq-item" style={{ marginBottom: 10 }}>
                <summary>{f.q}</summary>
                <div className="faq-answer"><p>{f.a}</p></div>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="section-tight">
        <div className="container">
          <div className="section-head" style={{ marginBottom: 24 }}>
            <h2>Check a Different Town</h2>
            <p>Live outside the city? Your own ZIP or postal code gives a more exact answer.</p>
          </div>
          <Calculator />
          {nearby.length > 0 && (
            <p style={{ textAlign: "center", marginTop: 24 }}>
              Nearby:{" "}
              {nearby.map((c, i) => (
                <span key={c.slug}>
                  {i > 0 && " · "}
                  <Link href={`/snow-day-calculator/${c.slug}`}>{c.name}</Link>
                </span>
              ))}
            </p>
          )}
        </div>
      </section>
    </>
  );
}
