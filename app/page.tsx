import type { Metadata } from "next";
import BlogPreview from "@/components/BlogPreview";
import Calculator from "@/components/Calculator";
import CityDirectory from "@/components/CityDirectory";
import FAQ, { FAQS } from "@/components/FAQ";
import HeroSnow from "@/components/HeroSnow";
import { ChanceGuide, DeepDive, HowItWorks, SnowDayReady } from "@/components/HomeContent";
import { Clock, Shield, Zap } from "@/components/Icons";
import JsonLd from "@/components/JsonLd";
import RegionalGuide from "@/components/RegionalGuide";
import SnowMap from "@/components/SnowMap";
import TrendingCities from "@/components/TrendingCities";
import { SITE_NAME, SITE_URL, currentSeason } from "@/lib/site";

// Trending cities, the map and the blog list are cached and rebuilt once an hour.
export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const season = currentSeason();
  const title = `Snow Day Calculator ${season}: Will School Close Tomorrow?`;
  const description =
    `Free snow day calculator for ${season} for the USA and Canada. Enter your ZIP or postal code to see your school closure chance from live hour by hour forecasts, black ice checks and regional school habits.`;
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: "/" },
    openGraph: { title, description, url: "/" },
    twitter: { title, description },
  };
}

export default function HomePage() {
  const season = currentSeason();

  const softwareApp = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: SITE_NAME,
    applicationCategory: "UtilitiesApplication",
    applicationSubCategory: "Weather",
    operatingSystem: "Any (web browser)",
    url: SITE_URL,
    description:
      "Predicts the chance of a school snow day in the United States and Canada using hourly forecasts, pre-dawn snow timing, black ice detection and regional resilience.",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    areaServed: [
      { "@type": "Country", name: "United States" },
      { "@type": "Country", name: "Canada" },
    ],
    featureList: [
      "ZIP code and Canadian postal code lookup",
      "Pre-dawn 3 AM to 7 AM snowfall analysis",
      "Black ice and freezing rain detection",
      "Blizzard wind detection",
      "Regional resilience scaling by state and province",
      "Live snow day map",
    ],
  };

  const faqPage = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a.join(" ") },
    })),
  };

  return (
    <>
      <JsonLd data={softwareApp} />
      <JsonLd data={faqPage} />

      <section className="hero" aria-labelledby="hero-title">
        <HeroSnow />
        <div className="container">
          <div className="hero-copy">
            <span className="pill"><span className="live-dot" /> Live forecasts for the {season} school year</span>
            <h1 id="hero-title">
              Will You Get a <span className="gradient-text">Snow Day</span> Tomorrow?
            </h1>
            <p className="hero-sub">
              Type your ZIP or postal code. We check every hour of the forecast from 3 AM to 7 AM, look for black ice
              and adjust for how your area handles snow. One tap. No sliders.
            </p>
          </div>

          <Calculator />

          <div className="trust-row">
            <span><Zap /> Answers in about a second</span>
            <span><Clock /> Hourly forecast, updated all night</span>
            <span><Shield /> NOAA and Environment Canada weather models</span>
          </div>
        </div>
      </section>

      <TrendingCities />
      <SnowMap />
      <HowItWorks />
      <ChanceGuide />
      <RegionalGuide />
      <DeepDive />
      <SnowDayReady />
      <FAQ />
      <BlogPreview />
      <CityDirectory />
    </>
  );
}
