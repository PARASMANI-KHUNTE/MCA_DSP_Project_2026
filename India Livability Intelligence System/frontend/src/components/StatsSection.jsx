import { DATA_COVERAGE } from "../services/scoringService";

const STATS = [
  {
    value: DATA_COVERAGE.counts.places,
    label: "Places in register",
    detail: `${DATA_COVERAGE.counts.states} states/UTs · ${DATA_COVERAGE.counts.cities} cities; coverage varies by factor`
  },
  {
    value: DATA_COVERAGE.counts.factorRows,
    label: "Active factor rows",
    detail: "Air, safety, health, economic and rent observations; inherited city rows are counted"
  },
  {
    value: DATA_COVERAGE.availableFactors.length,
    label: "Available factors",
    detail: DATA_COVERAGE.availableFactors.map(key => key === "air" ? "Air quality" : key === "col" ? "Rent snapshot" : key).join(" · ")
  },
  {
    value: DATA_COVERAGE.compositeAvailable ? "Available" : "Unavailable",
    label: "Composite index",
    detail: DATA_COVERAGE.compositeAvailable
      ? "Weighted across observed factors; places missing a weighted factor stay unscored"
      : "One or more weighted factors lack usable observations"
  }
];

export default function StatsSection() {
  return (
    <div className="border-b border-[#E5E5E5] py-6 sm:py-8">
      <div className="grid grid-cols-2 gap-4 divide-y divide-[#E5E5E5] sm:divide-y-0 sm:gap-6 md:grid-cols-4 md:divide-x md:divide-[#E5E5E5]">
        {STATS.map((stat, index) => (
          <div
            key={stat.label}
            className={`flex flex-col ${index > 0 ? "pt-4 sm:pt-0 md:pl-6" : ""}`}
          >
            <span className="font-mono text-3xl font-extrabold tracking-tight text-[#B51F3B] sm:text-4xl">
              {stat.value}
            </span>
            <span className="mt-1 text-xs font-semibold text-[#111111] sm:text-sm">
              {stat.label}
            </span>
            <span className="mt-0.5 text-[11px] text-[#777777]">
              {stat.detail}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
