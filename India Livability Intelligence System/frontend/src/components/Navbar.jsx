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
  onOpenTour
}) {
  const isProjected = selectedYear > BASELINE_YEAR;
  const backendOnline = backendStatus === "ok" || backendStatus === "data_unverified";
  const dataUnverified = backendStatus === "data_unverified";
  const backendLabel = dataUnverified ? "API Data Unverified" : backendOnline ? "API Live" : "Local Engine";
  const backendDescription = dataUnverified
    ? "FastAPI is reachable, but source data is unverified and score endpoints are disabled. Click to re-check."
    : backendOnline
      ? "FastAPI backend connected. Click to re-check."
      : "Running on the embedded scoring engine. Click to retry the API.";

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-slate-800/70 bg-slate-950/80 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-[1720px] items-center justify-between gap-2 px-3 py-2.5 sm:gap-4 sm:px-5 sm:py-3 lg:px-6">
          <button
            onClick={() => onSelectTab("map")}
            className="group flex min-w-0 items-center gap-2.5 text-left"
            aria-label="Go to explorer"
          >
            <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-400 via-cyan-400 to-blue-400 text-slate-950 shadow-lg shadow-emerald-500/25 transition-all group-hover:scale-110 group-hover:shadow-emerald-400/40">
              <Compass size={20} className="animate-pulse-slow" />
              <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-emerald-300 shadow-[0_0_0_4px_rgba(52,211,153,0.12)]" />
            </span>
            <span className="min-w-0">
              <span className="flex items-center gap-2">
                <span className="truncate text-[13px] font-black tracking-tight text-white sm:text-base">
                  India Livability Intelligence
                </span>
                <span className="hidden shrink-0 rounded-full border border-emerald-400/40 bg-gradient-to-r from-emerald-500/15 to-cyan-500/15 px-2 py-0.5 text-[9px] font-black tracking-[0.18em] text-emerald-200 sm:inline-flex">
                  DSP 2026
                </span>
              </span>
              <span className="hidden text-[10px] text-slate-400 md:block">
                Data-driven index • Live map • Trend projections
              </span>
            </span>
          </button>

          <nav className="hidden items-center gap-1 rounded-2xl border border-slate-700/80 bg-slate-900/80 p-1 shadow-lg shadow-black/20 lg:flex">
            {TABS.map(tab => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => onSelectTab(tab.id)}
                  aria-current={active ? "page" : undefined}
                  className={`group flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
                    active
                      ? "bg-gradient-to-r from-emerald-500 to-green-600 text-slate-950 shadow-md shadow-emerald-500/25"
                      : "text-slate-400 hover:bg-slate-800/80 hover:text-white"
                  }`}
                >
                  <Icon size={14} className={active ? "" : "group-hover:scale-110 transition-transform"} />
                  {tab.label}
                </button>
              );
            })}
          </nav>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <label className="flex min-h-9 items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900/70 px-2 py-1.5 sm:px-2.5">
              <CalendarRange size={13} className={isProjected ? "text-amber-300" : "text-slate-500"} />
              <span className="hidden text-[10px] font-semibold text-slate-500 sm:inline">Year</span>
              <select
                value={selectedYear}
                onChange={event => onChangeYear(Number(event.target.value))}
                aria-label="Select analysis year"
                className={`cursor-pointer bg-transparent text-base font-bold focus:outline-none sm:text-xs ${
                  isProjected ? "text-amber-300" : "text-slate-200"
                }`}
              >
                {YEARS.map(year => (
                  <option key={year} value={year} className="bg-slate-900 text-slate-200">
                    {year}{year > BASELINE_YEAR ? " (proj.)" : ""}
                  </option>
                ))}
              </select>
            </label>

            <button
              onClick={onOpenTour}
              className="group flex min-h-9 items-center gap-1.5 rounded-xl border border-emerald-400/40 bg-gradient-to-r from-emerald-500/15 to-green-500/15 px-2.5 py-1.5 text-xs font-bold text-emerald-200 shadow-sm shadow-emerald-500/15 transition-all hover:scale-[1.02] hover:border-emerald-300/60 hover:from-emerald-500/25 hover:to-green-500/25 hover:text-white"
              title="Learn how to use the system"
              aria-label="How to use the system"
            >
              <HelpCircle size={14} className="text-emerald-300 transition-transform group-hover:rotate-12" />
              <span className="hidden sm:inline">How It Works</span>
            </button>

            <button
              onClick={onRetryBackend}
              className={`flex items-center gap-1.5 rounded-xl border px-2 py-1.5 text-[10px] font-semibold transition-colors sm:px-2.5 ${
                dataUnverified
                  ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
                  : backendOnline
                  ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                  : "border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-700 hover:text-slate-200"
              }`}
              title={backendDescription}
              aria-label={backendDescription}
            >
              <Radio
                size={12}
                className={dataUnverified ? "text-amber-300" : backendOnline ? "animate-pulse text-emerald-400" : "text-slate-500"}
              />
              <span className="hidden md:inline">{backendLabel}</span>
              <RefreshCw size={10} className="hidden text-slate-500 md:inline" />
            </button>
          </div>
        </div>
      </header>

      <nav
        className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-800/80 bg-slate-950/95 backdrop-blur-xl lg:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        aria-label="Primary"
      >
        <div className="mx-auto grid max-w-lg grid-cols-3 px-2">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onSelectTab(tab.id)}
                aria-current={active ? "page" : undefined}
                className={`relative flex min-h-14 flex-col items-center justify-center gap-1 px-2 py-2.5 text-[11px] font-semibold transition-colors ${
                  active ? "text-emerald-300" : "text-slate-500 hover:text-slate-300"
                }`}
              >
                <span className={`absolute top-0 h-0.5 w-8 rounded-full transition-all ${active ? "bg-emerald-400" : "bg-transparent"}`} />
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
