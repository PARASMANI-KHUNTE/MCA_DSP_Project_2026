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
    <div className="mb-3 flex flex-col gap-2 rounded-xl border border-[#E5E5E5] bg-white px-3.5 py-2.5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2.5">
        <label htmlFor="analysis-year-select" className="flex items-center gap-1.5 text-xs font-bold text-[#111111]">
          <CalendarDays size={14} className="text-[#B51F3B]" aria-hidden="true" />
          <span>Analysis Year</span>
        </label>
        <select
          id="analysis-year-select"
          value={year}
          onChange={event => onChange(Number(event.target.value))}
          aria-label="Analysis year"
          className="rounded-lg border border-[#D4D4D4] bg-[#FAFAF8] px-2.5 py-1 text-xs font-bold text-[#111111] transition-colors hover:border-[#111111] focus:border-[#B51F3B] focus:outline-none focus:ring-1 focus:ring-[#B51F3B]"
        >
          {years.map(option => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-[#666666]">
        <span className="hidden text-[11px] font-medium text-[#777777] md:inline">Latest observations:</span>
        <div className="flex flex-wrap items-center gap-1">
          {observed.map(([label, observedYear]) => (
            <span
              key={label}
              className="inline-flex items-center gap-1 rounded-md border border-[#EBEBE8] bg-[#FAFAF8] px-1.5 py-0.5 text-[10px] font-medium text-[#444444]"
            >
              <span className="capitalize font-semibold text-[#222222]">{label}</span>
              <span className="text-[#777777]">{observedYear}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
