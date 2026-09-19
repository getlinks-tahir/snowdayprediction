import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Disclaimer",
  description: "Our snow day chances are predictions for planning and fun. Always follow your school's official announcement.",
  alternates: { canonical: "/disclaimer" },
};

export default function DisclaimerPage() {
  return (
    <section className="section">
      <div className="container prose">
        <h1 style={{ fontSize: "clamp(2rem, 4.5vw, 3rem)" }}>Disclaimer</h1>
        <p>
          The Snow Day Calculator gives a prediction based on weather forecasts and general patterns in how schools react to
          winter weather. It is meant for planning and for fun.
        </p>
        <p>
          We are not connected to any school district, school board, government or weather agency. Forecasts can change
          quickly. Schools also think about things we cannot see, like staff shortages or building problems.
        </p>
        <p>
          <strong>Always follow the official announcement from your school.</strong> Never make a safety decision based only
          on this website. If roads look dangerous, stay home and stay safe.
        </p>
      </div>
    </section>
  );
}
