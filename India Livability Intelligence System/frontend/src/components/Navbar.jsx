import { Activity, BookOpen, CalendarRange, Compass, HelpCircle, Map, Radio, RefreshCw } from "lucide-react";
import { BASELINE_YEAR, OBSERVED_YEARS, PROJECTION_END_YEAR } from "../services/scoringService";

const TABS = [
  { id: "map", label: "Explorer", icon: Map },
  { id: "insights", label: "Insights", icon: Activity },
  { id: "methodology", label: "Method", icon: BookOpen }
];

const FIRST_YEAR = OBSERVED_YEARS[0];
const YEARS = Array.from(
  { length: PROJECTION_END_YEAR - FIRST_YEAR + 1 },
  (_, index) => FIRST_YEAR + index
);

export default function Navbar({
  activeTab,
  onSelectTab,
  selectedYear,
  onChangeYear,
  backendStatus,
  onRetryBackend,
  onOpenTour,
  dataAvailable
}) {
  const isProjected = selectedYear > BASELINE_YEAR;
  const backendOnline = backendStatus === "ok";
  const backendLabel = backendOnline ? "API Live" : "Local Engine";
  const backendDescription = backendOnline
      ? "FastAPI backend connected. Click to re-check."
      : "Running on the embedded scoring engine. Click to retry the API.";

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-neutral-800 bg-neutral-950/95 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-[1720px] items-center justify-between gap-2 px-3 py-2.5 sm:gap-4 sm:px-5 sm:py-3 lg:px-6">
          <button
            onClick={() => onSelectTab("map")}
            className="group flex min-w-0 items-center gap-2.5 text-left"
            aria-label="Go to explorer"
          >
            <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-neutral-700 bg-neutral-900 text-neutral-100 transition-colors group-hover:bg-neutral-800">
              <Compass size={19} />
            </span>
            <span className="min-w-0">
              <span className="flex items-center gap-2">
                <span className="truncate text-[13px] font-semibold tracking-tight text-white sm:text-base">
                  India Livability Intelligence
                </span>
                <span className="hidden shrink-0 rounded-full border border-neutral-700 bg-neutral-900 px-2 py-0.5 text-[9px] font-semibold tracking-[0.12em] text-neutral-300 sm:inline-flex">
                  DSP 2026
                </span>
              </span>
              <span className="hidden text-[10px] text-neutral-400 md:block">
                {dataAvailable ? "Data science pipeline • Place comparisons • Trends" : "Preparing local data"}
              </span>
            </span>
          </button>

          <nav className="hidden items-center gap-1 rounded-xl border border-neutral-800 bg-neutral-900 p-1 lg:flex" aria-label="Primary">
            {TABS.map(tab => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => onSelectTab(tab.id)}
                  aria-current={active ? "page" : undefined}
                    className={`group flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-medium transition-colors ${
                    active
                      ? "bg-neutral-700 text-white"
                      : "text-neutral-400 hover:bg-neutral-800 hover:text-white"
                  }`}
                >
                  <Icon size={14} className={active ? "" : "group-hover:scale-110 transition-transform"} />
                  {tab.label}
                </button>
              );
            })}
          </nav>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            {dataAvailable && <label className="flex min-h-9 items-center gap-1.5 rounded-lg border border-neutral-800 bg-neutral-900 px-2 py-1.5 sm:px-2.5">
              <CalendarRange size={13} className={isProjected ? "text-amber-300" : "text-slate-500"} />
              <span className="hidden text-[10px] font-semibold text-slate-500 sm:inline">Year</span>
              <select
                value={selectedYear}
                onChange={event => onChangeYear(Number(event.target.value))}
                aria-label="Select analysis year"
                className={`cursor-pointer bg-transparent text-base font-semibold focus:outline-none sm:text-xs ${
                  isProjected ? "text-amber-300" : "text-neutral-200"
                }`}
              >
                {YEARS.map(year => (
                  <option key={year} value={year} className="bg-neutral-900 text-neutral-200">
                    {year}{year > BASELINE_YEAR ? " (proj.)" : ""}
                  </option>
                ))}
              </select>
            </label>}

            {dataAvailable && <button
              onClick={onOpenTour}
              className="group flex min-h-9 items-center gap-1.5 rounded-xl border border-emerald-400/40 bg-gradient-to-r from-emerald-500/15 to-green-500/15 px-2.5 py-1.5 text-xs font-bold text-emerald-200 shadow-sm shadow-emerald-500/15 transition-all hover:scale-[1.02] hover:border-emerald-300/60 hover:from-emerald-500/25 hover:to-green-500/25 hover:text-white"
              title="Learn how to use the system"
              aria-label="How to use the system"
            >
              <HelpCircle size={14} className="text-emerald-300 transition-transform group-hover:rotate-12" />
              <span className="hidden sm:inline">How It Works</span>
            </button>}

            {dataAvailable && <button
              onClick={onRetryBackend}
              data-api-state={backendStatus}
              className={`flex items-center gap-1.5 rounded-xl border px-2 py-1.5 text-[10px] font-semibold transition-colors sm:px-2.5 ${
                backendOnline
                  ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                  : "border-neutral-800 bg-neutral-900 text-neutral-400 hover:border-neutral-700 hover:text-neutral-200"
              }`}
              title={backendDescription}
              aria-label={backendDescription}
            >
              <Radio
                size={12}
                className={backendOnline ? "animate-pulse text-emerald-400" : "text-slate-500"}
              />
              <span className="hidden md:inline">{backendLabel}</span>
              <RefreshCw size={10} className="hidden text-slate-500 md:inline" />
            </button>}
          </div>
        </div>
      </header>

      <nav
        className="fixed inset-x-0 bottom-0 z-50 border-t border-neutral-800 bg-neutral-950/98 backdrop-blur-xl lg:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        aria-label="Primary"
      >
        <div className={`mx-auto grid max-w-lg px-2 ${dataAvailable ? "grid-cols-3" : "grid-cols-2"}`}>
          {TABS.map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onSelectTab(tab.id)}
                aria-current={active ? "page" : undefined}
                className={`relative flex min-h-14 flex-col items-center justify-center gap-1 px-2 py-2.5 text-[11px] font-semibold transition-colors ${
                  active ? "text-white" : "text-neutral-500 hover:text-neutral-300"
                }`}
              >
                <span className={`absolute top-0 h-0.5 w-8 rounded-full transition-all ${active ? "bg-neutral-200" : "bg-transparent"}`} />
                <Icon size={18} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}
