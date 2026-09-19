export function HowItWorks() {
  const steps = [
    {
      icon: "📍",
      title: "Geocode",
      text: "Type a ZIP code, postal code or city. We find the exact spot on the map plus your state or province. ZIP and postal codes load almost instantly.",
    },
    {
      icon: "🕒",
      title: "Pre-Dawn Analysis",
      text: "We pull the hour by hour forecast and zoom in on 3 AM to 7 AM. That is when buses warm up and plows fall behind. We check for snow, freezing rain, wind and deep cold.",
    },
    {
      icon: "🗺️",
      title: "Regional Scaling",
      text: "Last we adjust for where you live. Schools in Georgia close with less snow than schools in Minnesota. We also add a small bump for Mondays and Fridays.",
    },
  ];
  return (
    <section className="section" id="how-it-works" aria-labelledby="how-title">
      <div className="container">
        <div className="section-head">
          <span className="eyebrow">How it works</span>
          <h2 id="how-title">Three Steps. Zero Guesswork.</h2>
          <p>Other calculators make you move sliders and guess the weather. Ours reads the real forecast for you in about a second.</p>
        </div>
        <div className="grid-3">
          {steps.map((s, i) => (
            <div key={s.title} className="glass card">
              <div className="card-icon" aria-hidden="true">{s.icon}</div>
              <span className="step-num">STEP 0{i + 1}</span>
              <h3>{s.title}</h3>
              <p>{s.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function ChanceGuide() {
  const bands = [
    { band: "gray", range: "0 to 20%", name: "Very unlikely", text: "Normal school day. Pack your backpack." },
    { band: "green", range: "21 to 40%", name: "Unlikely", text: "Small chance. A late start is more likely than a day off." },
    { band: "yellow", range: "41 to 60%", name: "Possible", text: "Coin flip. Have a backup plan for the morning." },
    { band: "orange", range: "61 to 80%", name: "Likely", text: "Good odds. Watch for the call early in the morning." },
    { band: "blue", range: "81 to 99%", name: "Very likely", text: "Big storm. Many schools will close or go remote." },
  ];
  return (
    <section className="section-tight" aria-labelledby="bands-title">
      <div className="container">
        <div className="section-head">
          <span className="eyebrow">Reading your result</span>
          <h2 id="bands-title">What Your Percentage Really Means</h2>
          <p>The ring color tells you the story at a glance. Here is what each color means for your morning.</p>
        </div>
        <div className="bands">
          {bands.map((b) => (
            <div key={b.band} className="band-card" data-band={b.band}>
              <span>{b.name}</span>
              <b>{b.range}</b>
              <p>{b.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function DeepDive() {
  return (
    <section className="section" id="guide" aria-labelledby="guide-title">
      <div className="container prose">
        <span className="eyebrow">The complete guide</span>
        <h2 id="guide-title" style={{ marginTop: 0 }}>Snow Day Calculator: How School Closures Really Work</h2>
        <p>
          A snow day calculator answers one big question: <strong>will school be closed tomorrow?</strong> A normal
          weather app tells you how much snow will fall. It does not tell you what your school will do about it. Our
          tool connects the two. It reads the forecast the same way a school leader does and turns it into one simple
          number.
        </p>

        <h3>Why the hours between 3 AM and 7 AM matter most</h3>
        <p>
          Most school buses leave the lot between 6 AM and 7 AM. Drivers start checking roads even earlier. If snow
          stops at midnight, plows have all night to clean up. If snow is falling hard at 5 AM, roads are at their worst
          right when kids need to travel. That is why we look at every single hour in that window instead of just the
          daily total.
        </p>

        <h3>What happens the night before a snow day</h3>
        <p>Here is a normal timeline for a school district when a storm is coming:</p>
        <ol>
          <li><strong>Afternoon:</strong> Leaders watch the forecast. Some districts announce an early closing for very big storms.</li>
          <li><strong>Evening:</strong> Road crews spread salt or brine on main roads before the snow starts.</li>
          <li><strong>3 AM to 4:30 AM:</strong> Transportation staff drive bus routes to see the real road conditions.</li>
          <li><strong>4:30 AM to 5:30 AM:</strong> The superintendent talks with road crews and nearby districts. Then they make the call.</li>
          <li><strong>5:30 AM to 6:30 AM:</strong> Families get a text, email or phone call. Local TV and radio post the list.</li>
        </ol>

        <h3>Lake-effect snow: the surprise storm</h3>
        <p>
          If you live near the Great Lakes, you know this one. Cold air blows across warmer lake water. The air picks up
          moisture and dumps it as snow on land downwind. These snow bands can be very narrow. One side of town can get a
          foot of snow while the other side gets a dusting. Buffalo, Syracuse, Cleveland, Erie and parts of Ontario see
          this a lot. Our forecast uses high resolution weather models that can pick up many of these bands. For the
          most exact number, search your own ZIP or postal code instead of the nearest big city.
        </p>

        <h3>Weather alerts in plain words</h3>
        <p>In the United States, the National Weather Service uses three main levels for winter storms:</p>
        <ul>
          <li><strong>Winter Weather Advisory:</strong> Snow or ice will make travel annoying and a bit risky. Delays are common.</li>
          <li><strong>Winter Storm Watch:</strong> A big storm might hit in the next day or two. Stay tuned.</li>
          <li><strong>Winter Storm Warning or Blizzard Warning:</strong> A dangerous storm is coming or already here. Closures are very likely.</li>
        </ul>
        <p>
          When one of these is active for a US location, we show it right in your result. In Canada, Environment Canada
          posts its own warnings for snowfall, freezing rain, blizzards and extreme cold on its weather website.
        </p>

        <h3>Snow day or remote day?</h3>
        <p>
          Many districts can now switch to online classes instead of closing. If your school does this, a high chance on
          our calculator may mean a laptop day at home. In Ontario and other parts of Canada, boards often cancel school
          buses but keep buildings open for kids who can walk. Check your district&apos;s winter weather policy so you know
          which one to expect.
        </p>

        <div className="callout">
          <p>
            <strong>Good to know:</strong> our percentage predicts what school leaders are likely to do. The official
            decision always comes from your district or board. Sign up for their text alerts before winter starts.
          </p>
        </div>
      </div>
    </section>
  );
}

export function SnowDayReady() {
  return (
    <section className="section-tight" aria-labelledby="ready-title">
      <div className="container">
        <div className="section-head">
          <span className="eyebrow">Be ready</span>
          <h2 id="ready-title">Your Snow Day Game Plan</h2>
          <p>A high chance tonight? Here is how to be ready whether school closes or not.</p>
        </div>
        <div className="grid-2">
          <div className="glass card">
            <div className="card-icon" aria-hidden="true">👨‍👩‍👧</div>
            <h3>For parents</h3>
            <ul className="check-list">
              <li>Sign up for your district&apos;s text or email alerts today.</li>
              <li>Line up a backup sitter or a work from home plan the night before.</li>
              <li>Charge phones and laptops in case school goes remote.</li>
              <li>Set out warm layers, boots, hats and gloves by the door.</li>
              <li>Plan a few extra minutes for the drive if school stays open.</li>
            </ul>
          </div>
          <div className="glass card">
            <div className="card-icon" aria-hidden="true">🧒</div>
            <h3>For kids</h3>
            <ul className="check-list">
              <li>Finish your homework anyway. A snow day is never a sure thing.</li>
              <li>Pack your bag so you are ready either way.</li>
              <li>Dress in layers when you go out to play in the snow.</li>
              <li>Come inside if your fingers or toes start to go numb.</li>
              <li>Stay away from roads where plows are working.</li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
