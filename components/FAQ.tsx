export const FAQS: { q: string; a: string[] }[] = [
  {
    q: "How accurate is the Snow Day Calculator?",
    a: [
      "Our number is only as good as the weather forecast behind it. We use the same weather models that NOAA and Environment Canada run, served through Open-Meteo. Forecasts for the next 12 to 24 hours are usually very good.",
      "Still, no one can read a superintendent's mind. Bus driver shortages, a broken boiler or a last minute storm shift can change the call. Treat our percentage as a smart guess, not a promise.",
    ],
  },
  {
    q: "When is the best time to check?",
    a: [
      "Check between 8 PM and 10 PM the night before. That is when the forecast for the next morning is the most reliable. Check once more around 5 AM if the storm is close. Most districts announce their decision between 5 AM and 6:30 AM.",
    ],
  },
  {
    q: "Why does my friend in another state get a different number for the same storm?",
    a: [
      "Because where you live changes how schools react. We multiply the score by 1.35 in places like Georgia and Texas where snow is rare. We multiply by 0.75 in places like New York, Minnesota, Ontario and Quebec where schools are built for winter. Everywhere else in the US stays at 1.0. The rest of Canada uses 0.85.",
    ],
  },
  {
    q: "Does it work with Canadian postal codes?",
    a: [
      "Yes. Type your full postal code (like M5V 3L9) or just the first three characters. You can also type a city with its province, like \"Halifax, NS\" or \"Calgary Alberta\".",
    ],
  },
  {
    q: "What does the Pre-Dawn Peak badge mean?",
    a: [
      "It means at least 2 cm (about 0.8 inches) of snow is forecast to fall between 3 AM and 7 AM. This is the worst time for snow. Bus drivers are starting their routes and plows have not caught up yet. It adds 25 points to the score.",
    ],
  },
  {
    q: "What does the Black Ice Alert mean?",
    a: [
      "The hourly forecast shows freezing rain or freezing drizzle before sunrise. That can coat roads in thin ice that is hard to see. It adds 30 points because ice is the number one cause of school closures.",
    ],
  },
  {
    q: "What does Blizzard Synergy mean?",
    a: [
      "It shows up when pre-dawn snow and strong wind (35 km/h or about 22 mph and up) happen at the same time. Wind blows fresh snow into drifts and makes it hard to see. Together they are much worse than either one alone so we add 25 extra points.",
    ],
  },
  {
    q: "Can very cold weather close schools with no snow?",
    a: [
      "Yes. In the northern states and much of Canada, districts cancel buses or school when the wind chill gets dangerous. We add 20 points when the low drops below -15°C (5°F) because frostbite becomes a real risk for kids at bus stops.",
    ],
  },
  {
    q: "What is the difference between a snow day and a two hour delay?",
    a: [
      "A snow day means no school at all. A two hour delay means school starts later so roads have time to improve. If your chance is between about 20% and 50%, a delay is quite possible even if a full closure is not.",
    ],
  },
  {
    q: "Why is the top score 99% and not 100%?",
    a: [
      "Because nothing is certain until your district makes the call. Even in a huge storm some schools switch to remote learning or stay open. 99% means \"about as sure as a forecast can get.\"",
    ],
  },
  {
    q: "Why are there no sliders to adjust the weather?",
    a: [
      "Other calculators ask you to guess the snow total and the temperature. That only works if you already know the forecast. We read the real hour by hour forecast for you so you get an honest answer in one tap.",
    ],
  },
  {
    q: "Does the calculator work on weekends?",
    a: [
      "It still shows how strong the storm is. It also tells you clearly that there is no school that day. On a Sunday night it looks ahead to Monday morning.",
    ],
  },
  {
    q: "Is it free? Do you save my location?",
    a: [
      "It is 100% free with no sign up. We use your ZIP, postal code or city only to look up the forecast. We do not save it to an account or sell it.",
    ],
  },
];

export default function FAQ() {
  return (
    <section className="section" id="faq" aria-labelledby="faq-title">
      <div className="container">
        <div className="section-head">
          <span className="eyebrow">FAQ</span>
          <h2 id="faq-title">Snow Day Questions, Answered</h2>
          <p>Short answers to the things parents, students and teachers ask us most.</p>
        </div>
        <div className="faq-list">
          {FAQS.map((f, i) => (
            <details key={f.q} className="faq-item" open={i === 0}>
              <summary>{f.q}</summary>
              <div className="faq-answer">
                {f.a.map((p) => (
                  <p key={p.slice(0, 24)}>{p}</p>
                ))}
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
