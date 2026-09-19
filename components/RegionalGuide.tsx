import { buildSimulatedForecast, getChanceBand, predictSnowDay, type Country } from "@/lib/algorithm";
import ChanceRing from "./ChanceRing";

const ROWS = [
  { area: "Deep South", places: "GA, AL, TX, FL, MS, LA, TN, the Carolinas", snow: "1 to 2 in (3 to 5 cm)", trigger: "Any ice, even a thin glaze", tier: "low" },
  { area: "Mid-Atlantic and South Central", places: "VA, MD, DC, KY, MO, KS", snow: "2 to 4 in (5 to 10 cm)", trigger: "Ice on hills and bridges", tier: "std" },
  { area: "Ohio Valley and Plains", places: "OH, IN, IL, IA, NE, CO", snow: "4 to 6 in (10 to 15 cm)", trigger: "Snow at bus time or blowing snow", tier: "std" },
  { area: "Great Lakes and Northeast", places: "NY, MA, MI, WI, MN, VT, NH, ME", snow: "6 to 12 in (15 to 30 cm)", trigger: "Wind chill or lake-effect bands", tier: "high" },
  { area: "Ontario and Quebec", places: "Toronto, Ottawa, Montreal, Québec City", snow: "15 cm or more", trigger: "Freezing rain (buses cancelled first)", tier: "high" },
  { area: "The Prairies", places: "AB, SK, MB", snow: "Rarely closes for snow", trigger: "Extreme cold and ground blizzards", tier: "high" },
  { area: "Atlantic Canada", places: "NS, NB, PE, NL", snow: "10 to 20 cm", trigger: "Messy mix of snow, ice pellets and rain", tier: "std" },
  { area: "Pacific Coast", places: "WA, OR, coastal BC", snow: "1 to 3 in (3 to 8 cm)", trigger: "Hills plus few winter tires", tier: "std" },
] as const;

const TAG = {
  low: <span className="tag tag-low">Closes easily</span>,
  std: <span className="tag tag-std">Middle</span>,
  high: <span className="tag tag-high">Very tough</span>,
};

const COMPARE: { name: string; region: string; country: Country }[] = [
  { name: "Atlanta, GA", region: "GA", country: "US" },
  { name: "Denver, CO", region: "CO", country: "US" },
  { name: "Vancouver, BC", region: "BC", country: "CA" },
  { name: "Buffalo, NY", region: "NY", country: "US" },
];

// A fixed Wednesday evening so the day of week bias stays at 1.0 for the demo.
const DEMO_NOW = Date.parse("2027-01-14T01:00:00Z");

export default function RegionalGuide() {
  const storm = buildSimulatedForecast(3, -5 * 3600, "America/New_York", DEMO_NOW);
  const demo = COMPARE.map((c) => ({
    ...c,
    chance: predictSnowDay(storm, { country: c.country, region: c.region }, DEMO_NOW).chance,
  }));

  return (
    <section className="section" id="regions" aria-labelledby="regions-title">
      <div className="container">
        <div className="section-head">
          <span className="eyebrow">Regional resilience</span>
          <h2 id="regions-title">Why 2 Inches Closes Atlanta but Not Buffalo</h2>
          <p>
            Same snow, different answer. A town that gets snow all winter has more plows, more salt and more practice.
            Our calculator knows where you live and adjusts the chance for you. No sliders needed.
          </p>
        </div>

        <div className="table-wrap">
          <table className="data-table">
            <caption className="sr-only">Typical snow needed to close schools by region in the United States and Canada</caption>
            <thead>
              <tr>
                <th scope="col">Region</th>
                <th scope="col">Typical snow to close</th>
                <th scope="col">Biggest trigger</th>
                <th scope="col">How tough</th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((r) => (
                <tr key={r.area}>
                  <td>{r.area}<br /><span style={{ fontWeight: 400, fontSize: "0.84rem", color: "var(--muted)" }}>{r.places}</span></td>
                  <td>{r.snow}</td>
                  <td>{r.trigger}</td>
                  <td>{TAG[r.tier]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="small-print" style={{ textAlign: "center" }}>
          These are common patterns, not official rules. Every district sets its own limits.
        </p>

        <h3 style={{ textAlign: "center", marginTop: 44 }}>Same 3 cm pre-dawn storm, four different cities</h3>
        <p style={{ textAlign: "center", color: "var(--muted)", maxWidth: 640, margin: "0 auto" }}>
          We ran one pretend storm through our real scoring engine. Only the location changed.
        </p>
        <div className="compare">
          {demo.map((d) => (
            <div key={d.name} className="glass compare-item">
              <ChanceRing value={d.chance} size="sm" />
              <div>
                <h3>{d.name}</h3>
                <p>{getChanceBand(d.chance).short}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
