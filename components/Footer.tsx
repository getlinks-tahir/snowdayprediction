import Link from "next/link";
import { CITIES } from "@/lib/cities";
import { SITE_NAME } from "@/lib/site";
import { Snowflake } from "./Icons";

export default function Footer() {
  const us = CITIES.filter((c) => c.country === "US").slice(0, 6);
  const ca = CITIES.filter((c) => c.country === "CA").slice(0, 6);

  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-grid">
          <div>
            <Link href="/" className="brand" style={{ marginBottom: 14 }}>
              <span className="brand-mark"><Snowflake /></span>
              <span>Snow Day <b>Calculator</b></span>
            </Link>
            <p style={{ fontSize: "0.94rem", maxWidth: 340 }}>
              Free snow day predictions for every ZIP code in the United States and every postal code in Canada.
              Built on live hourly forecasts that update all night long.
            </p>
          </div>
          <div>
            <h4>US Cities</h4>
            <ul>
              {us.map((c) => (
                <li key={c.slug}><Link href={`/snow-day-calculator/${c.slug}`}>{c.name}, {c.region}</Link></li>
              ))}
            </ul>
          </div>
          <div>
            <h4>Canadian Cities</h4>
            <ul>
              {ca.map((c) => (
                <li key={c.slug}><Link href={`/snow-day-calculator/${c.slug}`}>{c.name}, {c.region}</Link></li>
              ))}
            </ul>
          </div>
          <div>
            <h4>Site</h4>
            <ul>
              <li><Link href="/#calculator">Calculator</Link></li>
              <li><Link href="/#snow-map">Live Snow Map</Link></li>
              <li><Link href="/blog">Blog</Link></li>
              <li><Link href="/about">About</Link></li>
              <li><Link href="/privacy">Privacy</Link></li>
              <li><Link href="/disclaimer">Disclaimer</Link></li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} {SITE_NAME}. Forecast data by Open-Meteo. Alerts by the US National Weather Service.</span>
          <span>This is a prediction. Always check your school&apos;s official announcement.</span>
        </div>
      </div>
    </footer>
  );
}
