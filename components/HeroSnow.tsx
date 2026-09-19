/** Pure CSS falling snow. Positions are fixed so server and client HTML match. */
const FLAKES = Array.from({ length: 28 }, (_, i) => {
  const r = (n: number) => ((i * 9301 + n * 49297) % 233280) / 233280;
  return {
    left: `${Math.round(r(1) * 100)}%`,
    size: 3 + Math.round(r(2) * 5),
    duration: 9 + Math.round(r(3) * 12),
    delay: -Math.round(r(4) * 20),
    drift: Math.round(r(5) * 60) - 30,
  };
});

export default function HeroSnow() {
  return (
    <div className="hero-snow" aria-hidden="true">
      {FLAKES.map((f, i) => (
        <i
          key={i}
          style={{
            left: f.left,
            width: f.size,
            height: f.size,
            animationDuration: `${f.duration}s`,
            animationDelay: `${f.delay}s`,
            ["--drift" as string]: `${f.drift}px`,
          }}
        />
      ))}
    </div>
  );
}
