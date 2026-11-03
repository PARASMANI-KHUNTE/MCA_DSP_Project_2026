import { useState } from "react";
import {
  Activity,
  BookOpen,
  CalendarRange,
  Compass,
  HelpCircle,
  Info,
  Map,
  Radio,
  RefreshCw,
  User
} from "lucide-react";
import { BASELINE_YEAR, DATA_COVERAGE, OBSERVED_YEARS, PROJECTION_END_YEAR } from "../services/scoringService";

const TABS = [
  { id: "portfolio", label: "Portfolio", icon: Compass },
  { id: "map", label: "Explorer", icon: Map },
  { id: "insights", label: "Insights", icon: Activity },
  { id: "methodology", label: "Methodology", icon: BookOpen },
  { id: "about", label: "About & Code", icon: User }
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
  const [showYearInfo, setShowYearInfo] = useState(false);
  const projectionInfo = PROJECTION_END_YEAR == null
    ? "No factor currently has enough observed years for a projection."
    : `${BASELINE_YEAR} is the latest year with multi-factor observations. Earlier years show each factor at its latest observation at or before that year. Future years are projected only when every weighted factor has at least five directly observed years, so mixed-coverage composite views remain observed-only. The ${DATA_COVERAGE.lastYearByFactor?.col ?? "rent"} rent snapshot is observed separately and is never projected.`;
  const backendOnline = backendStatus === "ok";
  const backendLabel = backendOnline ? "API Live" : "Local Engine";
  const backendDescription = backendOnline
    ? "FastAPI backend connected. Click to re-check."
    : "Running on embedded client engine. Click to probe API.";

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-[#E5E5E5] bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-[1600px] items-center justify-between gap-2 px-3 py-2.5 sm:px-6">
          {/* Left: Branding & Developer Name */}
          <button
            onClick={() => onSelectTab("portfolio")}
            className="group flex min-w-0 items-center gap-2.5 sm:gap-3 text-left transition-opacity hover:opacity-90"
            aria-label="Go to portfolio overview"
          >
            <div className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-xl border border-[#E5E5E5] bg-[#FAFAF8] text-[#111111] transition-colors group-hover:border-[#D4D4D4]">
              <Compass size={17} className="text-[#B51F3B]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="truncate text-xs font-bold tracking-tight text-[#111111] sm:text-base">
                  Parasmani Khunte
                </span>
                <span className="hidden rounded-full border border-[#E5E5E5] bg-[#FAFAF8] px-2 py-0.5 text-[10px] font-semibold text-[#666666] sm:inline-flex">
                  MCA 2026
                </span>
              </div>
              <p className="hidden text-[11px] text-[#777777] md:block truncate">
                India Livability Intelligence System
              </p>
            </div>
          </button>

          {/* Center: Navigation Links */}
          <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
            {TABS.map(tab => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => onSelectTab(tab.id)}
                  aria-current={active ? "page" : undefined}
                  className={`relative flex items-center gap-1.5 px-3 py-2 text-xs font-semibold transition-colors ${
                    active
                      ? "text-[#111111]"
                      : "text-[#666666] hover:text-[#111111]"
                  }`}
                >
                  <Icon size={14} className={active ? "text-[#B51F3B]" : "text-[#888888]"} />
                  <span>{tab.label}</span>
                  {active && (
                    <span className="absolute bottom-0 left-2.5 right-2.5 h-[2px] bg-[#B51F3B] rounded-full" />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Right: Year Selector & Controls */}
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            {dataAvailable && (
              <label className="flex min-h-8 sm:min-h-9 items-center gap-1 sm:gap-1.5 rounded-xl border border-[#E5E5E5] bg-[#FAFAF8] px-2 sm:px-2.5 py-1 text-xs">
                <CalendarRange size={12} className={isProjected ? "text-[#B51F3B]" : "text-[#777777]"} />
                <span className="hidden text-[11px] font-semibold text-[#888888] sm:inline">Year</span>
                <select
                  value={selectedYear}
                  onChange={event => onChangeYear(Number(event.target.value))}
                  aria-label="Select analysis year"
                  className={`cursor-pointer bg-transparent text-xs font-bold focus:outline-none ${
                    isProjected ? "text-[#B51F3B]" : "text-[#111111]"
                  }`}
                >
                  {YEARS.map(year => (
                    <option key={year} value={year} className="bg-white text-[#111111]">
                      {year > BASELINE_YEAR
                        ? `${year} (projection if eligible)`
                        : `${year} (observed)`}
                    </option>
                  ))}
                </select>
              </label>
            )}

            {dataAvailable && OBSERVED_YEARS.length > 1 && (
              <div className="relative flex items-center">
                <button
                  type="button"
                  onClick={() => setShowYearInfo(value => !value)}
                  onBlur={() => setShowYearInfo(false)}
                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#E5E5E5] bg-[#FAFAF8] text-[#777777] transition-colors hover:border-[#D4D4D4] hover:text-[#111111]"
                  title={projectionInfo}
                  aria-label={projectionInfo}
                  aria-expanded={showYearInfo}
                >
                  <Info size={12} />
                </button>
                {showYearInfo && (
                  <div
                    role="tooltip"
                    className="absolute right-0 top-full z-50 mt-2 w-64 rounded-xl border border-[#E5E5E5] bg-white p-3 text-[11px] leading-relaxed text-[#555555] shadow-lg animate-fade-in"
                  >
                    {projectionInfo}
                  </div>
                )}
              </div>
            )}

            {dataAvailable && (
              <button
                onClick={onOpenTour}
                className="hidden lg:inline-flex items-center gap-1.5 rounded-xl border border-[#E5E5E5] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#333333] transition-colors hover:border-[#D4D4D4] hover:bg-[#FAFAF8]"
                title="How the decision system works"
              >
                <HelpCircle size={13} className="text-[#B51F3B]" />
                <span>Guide</span>
              </button>
            )}

            {dataAvailable && (
              <button
                onClick={onRetryBackend}
                data-api-state={backendStatus}
                className={`flex items-center gap-1.5 rounded-xl border px-2 sm:px-2.5 py-1.5 text-[11px] font-semibold transition-colors ${
                  backendOnline
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                    : "border-[#E5E5E5] bg-[#FAFAF8] text-[#666666] hover:border-[#D4D4D4] hover:text-[#111111]"
                }`}
                title={backendDescription}
                aria-label={backendDescription}
              >
                <Radio
                  size={11}
                  className={backendOnline ? "animate-pulse text-emerald-600" : "text-[#999999]"}
                />
                <span className="hidden sm:inline">{backendLabel}</span>
                <RefreshCw size={10} className="text-[#999999]" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation */}
      <nav
        className="fixed inset-x-0 bottom-0 z-50 border-t border-[#E5E5E5] bg-white/98 backdrop-blur-md md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        aria-label="Mobile Navigation"
      >
        <div className="mx-auto grid grid-cols-5 px-1">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onSelectTab(tab.id)}
                aria-current={active ? "page" : undefined}
                className={`relative flex min-h-14 flex-col items-center justify-center gap-1 py-1.5 text-[9px] font-semibold transition-colors ${
                  active ? "text-[#B51F3B]" : "text-[#777777] hover:text-[#111111]"
                }`}
              >
                {active && (
                  <span className="absolute top-0 h-0.5 w-6 rounded-full bg-[#B51F3B]" />
                )}
                <Icon size={16} />
                <span className="truncate max-w-[62px]">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}
