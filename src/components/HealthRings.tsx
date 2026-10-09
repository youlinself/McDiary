import type { NutritionTotals } from "../utils/nutrition";

interface RingConfig {
  key: keyof NutritionTotals;
  label: string;
  unit: string;
  goal: number;
  color: string;
  track: string;
}

const RINGS: RingConfig[] = [
  { key: "energyKcal", label: "能量", unit: "kcal", goal: 2000, color: "#E4572E", track: "#F7E1D5" },
  { key: "protein", label: "蛋白质", unit: "g", goal: 60, color: "#E9A23B", track: "#F8E9CC" },
  { key: "fat", label: "脂肪", unit: "g", goal: 60, color: "#B5651D", track: "#EDDCC9" },
];

const SIZE = 240;
const STROKE = 18;
const GAP = 7;

interface HealthRingsProps {
  totals: NutritionTotals;
  dateLabel: string;
}

export function HealthRings({ totals, dateLabel }: HealthRingsProps) {
  const center = SIZE / 2;

  return (
    <div className="rings">
      <h3 className="rings__title">营养三环·{dateLabel}</h3>
      <div className="rings__graphic">
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} role="img" aria-label="营养三环">
          {RINGS.map((ring, index) => {
            const radius = center - STROKE / 2 - index * (STROKE + GAP);
            const circumference = 2 * Math.PI * radius;
            const ratio = Math.min(totals[ring.key] / ring.goal, 1);
            const dash = circumference * ratio;
            return (
              <g key={ring.key} transform={`rotate(-90 ${center} ${center})`}>
                <circle
                  cx={center}
                  cy={center}
                  r={radius}
                  fill="none"
                  stroke={ring.track}
                  strokeWidth={STROKE}
                />
                <circle
                  className="rings__arc"
                  cx={center}
                  cy={center}
                  r={radius}
                  fill="none"
                  stroke={ring.color}
                  strokeWidth={STROKE}
                  strokeLinecap="round"
                  strokeDasharray={`${dash} ${circumference - dash}`}
                />
              </g>
            );
          })}
        </svg>
        <div className="rings__center">
          <strong>{Math.round(totals.energyKcal)}</strong>
          <span>kcal</span>
        </div>
      </div>

      <ul className="rings__legend">
        {RINGS.map((ring) => {
          const value = totals[ring.key];
          const pct = ring.goal > 0 ? Math.round((value / ring.goal) * 100) : 0;
          return (
            <li key={ring.key} className={value > ring.goal ? "is-over" : undefined}>
              <span className="rings__dot" style={{ background: ring.color }} />
              <span className="rings__legend-label">{ring.label}</span>
              <span className="rings__legend-value">
                {Math.round(value)}
                <em>
                  /{ring.goal}
                  {ring.unit}
                </em>
              </span>
              <span className="rings__legend-pct">{pct}%</span>
            </li>
          );
        })}
      </ul>

      <div className="rings__extra">
        <span>碳水 {Math.round(totals.carbohydrate)} g</span>
        <span>钠 {Math.round(totals.sodium)} mg</span>
        <span>钙 {Math.round(totals.calcium)} mg</span>
      </div>
    </div>
  );
}
