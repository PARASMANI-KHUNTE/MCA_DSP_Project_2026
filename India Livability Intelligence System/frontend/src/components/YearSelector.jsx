import { CalendarDays } from "lucide-react";
import { DATA_COVERAGE } from "../services/scoringService";

const FACTOR_LABELS = {
  air: "air",
  safety: "safety",
  health: "health",
  economy: "economy",
  col: "cost",
  water: "water"
};

/**
 * Visible analysis-year control. The dashboard carries each factor forward from
 * its latest observation, so this strip also lists those observation years to
 * keep the mixed-year basis explicit.
 */
export default function YearSelector({ year, years, onChange }) {
  const lastYears = DATA_COVERAGE.lastYearByFactor || {};
  const observed = Object.entries(FACTOR_LABELS)
    .map(([key, label]) => [label, lastYears[key]])
    .filter(([, value]) => Number.isFinite(value))
    .sort((a, b) => b[1] - a[1]);

  return (
    <div className="mb-3 flex flex-col gap-2 rounded-xl border border-[#E5E5E5] bg-white px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
      <label className="flex items-center gap-2 text-xs font-semibold text-[#111111]">
        <CalendarDays size={13} className="text-[#B51F3B]" aria-hidden="true" />
        <span>Analysis year</span>
        <select
          value={year}
          onChange={event => onChange(Number(event.target.value))}
          aria-label="Analysis year"
          className="rounded-lg border border-[#E5E5E5] bg-[#FAFAF8] px-2 py-1 text-xs font-semibold text-[#111111] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#B51F3B]/40"
        >
          {years.map(option => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>
      <p className="text-[11px] leading-snug text-[#666666]">
        Each factor uses its latest observation on or before {year}. Latest
        observations:{" "}
        <span className="font-medium text-[#444444]">
          {observed.map(([label, observedYear]) => `${label} ${observedYear}`).join(" · ")}
        </span>
        .
      </p>
    </div>
  );
}
