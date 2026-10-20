import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildSimulatedForecast,
  getChanceBand,
  getResilience,
  predictSnowDay,
  type ForecastData,
} from "./algorithm.ts";

// Wednesday 2027-01-13 at 8 PM Eastern (01:00 UTC on the 14th) so "tomorrow"
// is a Thursday and the day multiplier is 1.0.
const EST = -5 * 3600;
const WED_EVENING = Date.parse("2027-01-14T01:00:00Z");

test("Atlanta scores much higher than Buffalo for the same 3 cm pre-dawn storm", () => {
  const storm = buildSimulatedForecast(3, EST, "America/New_York", WED_EVENING);
  const atlanta = predictSnowDay(storm, { country: "US", region: "GA" }, WED_EVENING);
  const buffalo = predictSnowDay(storm, { country: "US", region: "NY" }, WED_EVENING);

  // Base: >2cm (+20) + pre-dawn >=2cm (+25) + low below 0°C (+10) = 55
  assert.equal(atlanta.baseScore, 55);
  assert.equal(buffalo.baseScore, 55);
  assert.equal(atlanta.chance, Math.round(55 * 1.35)); // 74
  assert.equal(buffalo.chance, Math.round(55 * 0.75)); // 41
  assert.ok(atlanta.chance - buffalo.chance >= 30);
  assert.deepEqual(atlanta.badges, ["predawn"]);
  assert.equal(atlanta.weekday, "Thursday");
});

test("regional multipliers", () => {
  assert.equal(getResilience({ country: "US", region: "TX" }).multiplier, 1.35);
  assert.equal(getResilience({ country: "US", region: "MN" }).multiplier, 0.75);
  assert.equal(getResilience({ country: "US", region: "OH" }).multiplier, 1.0);
  assert.equal(getResilience({ country: "CA", region: "QC" }).multiplier, 0.75);
  assert.equal(getResilience({ country: "CA", region: "BC" }).multiplier, 0.85);
});

function blankForecast(): ForecastData {
  const f = buildSimulatedForecast(0, EST, "America/New_York", WED_EVENING);
  f.daily.tMin = [5, 5];
  f.daily.tMax = [10, 10];
  f.hourly.temperature = f.hourly.temperature.map(() => 5);
  f.hourly.weatherCode = f.hourly.weatherCode.map(() => 3);
  return f;
}

test("black ice before dawn adds 30 points and the ice badge", () => {
  const f = blankForecast();
  const idx = f.hourly.time.indexOf("2027-01-14T05:00");
  f.hourly.weatherCode[idx] = 66;
  const p = predictSnowDay(f, { country: "US", region: "OH" }, WED_EVENING);
  assert.equal(p.baseScore, 30);
  assert.deepEqual(p.badges, ["ice"]);
});

test("blizzard synergy needs pre-dawn snow and 35 km/h wind", () => {
  const f = buildSimulatedForecast(6, EST, "America/New_York", WED_EVENING);
  f.hourly.windSpeed = f.hourly.windSpeed.map(() => 45);
  f.daily.windMax = [45, 45];
  const p = predictSnowDay(f, { country: "US", region: "OH" }, WED_EVENING);
  // 35 heavy + 25 pre-dawn + 10 cold + 15 wind + 25 blizzard = 110, capped at 99
  assert.equal(p.baseScore, 110);
  assert.equal(p.chance, 99);
  assert.deepEqual(p.badges, ["blizzard", "predawn"]);
});

test("Friday bias multiplies by 1.1", () => {
  const thursdayEvening = Date.parse("2027-01-15T01:00:00Z");
  const f = buildSimulatedForecast(3, EST, "America/New_York", thursdayEvening);
  const p = predictSnowDay(f, { country: "US", region: "OH" }, thursdayEvening);
  assert.equal(p.weekday, "Friday");
  assert.equal(p.chance, Math.round(55 * 1.1));
});

test("checking at 2 AM scores this morning instead of tomorrow", () => {
  const twoAm = Date.parse("2027-01-14T07:00:00Z"); // 2 AM Eastern Thursday
  const f = buildSimulatedForecast(3, EST, "America/New_York", twoAm);
  const p = predictSnowDay(f, { country: "US", region: "OH" }, twoAm);
  assert.equal(p.targetLabel, "this morning");
  assert.equal(p.targetDate, "2027-01-14");
});

test("chance bands", () => {
  assert.equal(getChanceBand(81).key, "blue");
  assert.equal(getChanceBand(61).key, "orange");
  assert.equal(getChanceBand(41).key, "yellow");
  assert.equal(getChanceBand(21).key, "green");
  assert.equal(getChanceBand(20).key, "gray");
});
