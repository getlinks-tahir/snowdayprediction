"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getPrediction, resolveCoordinates, resolveLocation, type PredictionPayload } from "@/app/actions";
import type { Place } from "@/lib/geocode";
import { Crosshair, Search } from "./Icons";
import ResultCard from "./ResultCard";

type Status = "idle" | "locating" | "forecasting" | "done" | "error";

const EXAMPLES = ["14201", "Atlanta, GA", "M5V 3L9", "Denver, CO", "Montreal"];

export default function Calculator() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ place: Place; payload: PredictionPayload } | null>(null);
  const simulate = useRef<number | null>(null);
  const busy = status === "locating" || status === "forecasting";

  const runForPlace = useCallback(async (place: Place) => {
    setStatus("forecasting");
    const res = await getPrediction(place, simulate.current ?? undefined);
    if (!res.ok) {
      setStatus("error");
      setError(res.error);
      return;
    }
    setResult({ place, payload: res.data });
    setStatus("done");
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("q", place.label);
      window.history.replaceState(null, "", url.toString());
    } catch {
      /* ignore */
    }
  }, []);

  const run = useCallback(
    async (raw: string) => {
      const q = raw.trim();
      if (!q) {
        setStatus("error");
        setError("Please type a ZIP code, postal code or city.");
        return;
      }
      setError(null);
      setStatus("locating");
      try {
        // Step 1: geocode (Zippopotam first, Open-Meteo fallback)
        const loc = await resolveLocation(q);
        if (!loc.ok) {
          setStatus("error");
          setError(loc.error);
          return;
        }
        // Step 2: hourly forecast + scoring
        await runForPlace(loc.data);
      } catch {
        setStatus("error");
        setError("Unable to retrieve weather data. Please try again.");
      }
    },
    [runForPlace],
  );

  const handleGps = () => {
    if (!("geolocation" in navigator)) {
      setStatus("error");
      setError("Your browser cannot share its location. Please type your ZIP or city.");
      return;
    }
    setError(null);
    setStatus("locating");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const loc = await resolveCoordinates(pos.coords.latitude, pos.coords.longitude);
          if (!loc.ok) {
            setStatus("error");
            setError(loc.error);
            return;
          }
          setQuery(loc.data.label);
          await runForPlace(loc.data);
        } catch {
          setStatus("error");
          setError("Unable to retrieve weather data. Please try again.");
        }
      },
      () => {
        setStatus("error");
        setError("We could not get your location. Please type your ZIP code or city instead.");
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 },
    );
  };

  // Support shared links (?q=Buffalo, NY) and test storms (?simulate=3)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sim = Number(params.get("simulate"));
    if (sim > 0 && sim <= 100) simulate.current = sim;
    const q = params.get("q");
    if (q) {
      setQuery(q);
      void run(q);
    }
  }, [run]);

  return (
    <div className="calculator-card" id="calculator">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void run(query);
        }}
        noValidate
      >
        <label htmlFor="location" className="calc-label">
          Enter your ZIP code, postal code or city
        </label>
        <div className="location-input-row">
          <div className="input-wrap">
            <Search />
            <input
              id="location"
              name="location"
              className="location-input"
              type="text"
              inputMode="text"
              autoComplete="postal-code"
              placeholder="e.g. 14201, M5V 3L9 or Buffalo, NY"
              value={query}
              maxLength={80}
              onChange={(e) => setQuery(e.target.value)}
              aria-describedby="calc-help"
            />
          </div>
          <button type="button" className="btn btn-ghost btn-gps" onClick={handleGps} disabled={busy} aria-label="Use my current location" title="Use my location">
            <Crosshair />
          </button>
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? <span className="spinner" aria-hidden="true" /> : null}
            {busy ? "Checking..." : "Check My Chances"}
          </button>
        </div>
      </form>

      <div className="calc-meta" id="calc-help">
        <span>Try:</span>
        {EXAMPLES.map((ex) => (
          <button
            key={ex}
            type="button"
            className="chip"
            disabled={busy}
            onClick={() => {
              setQuery(ex);
              void run(ex);
            }}
          >
            {ex}
          </button>
        ))}
      </div>

      <div aria-live="polite" aria-busy={busy}>
        {status === "locating" && (
          <p className="calc-status"><span className="spinner" aria-hidden="true" />Finding your location...</p>
        )}
        {status === "forecasting" && (
          <p className="calc-status"><span className="spinner" aria-hidden="true" />Reading the hour by hour forecast for 3 AM to 7 AM...</p>
        )}
        {status === "error" && error && (
          <div className="error-box" role="alert"><span aria-hidden="true">⚠️</span><span>{error}</span></div>
        )}
        {result && status !== "locating" && status !== "forecasting" && (
          <ResultCard key={`${result.place.label}-${result.payload.updatedAt}`} place={result.place} payload={result.payload} />
        )}
      </div>
    </div>
  );
}
