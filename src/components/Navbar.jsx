import {
  Activity,
  Compass,
  Map,
  Radio,
  RefreshCw
} from "lucide-react";
const TABS = [
  { id: "map", label: "Explorer", icon: Map },
  { id: "insights", label: "Insights", icon: Activity }
];

export default function Navbar({
  activeTab,
  onSelectTab,
  backendStatus,
  onRetryBackend,
  dataAvailable
}) {
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
            onClick={() => onSelectTab("map")}
            className="group flex min-w-0 items-center gap-2.5 sm:gap-3 text-left transition-opacity hover:opacity-90"
            aria-label="Go to explorer"
          >
            <div className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-xl border border-[#E5E5E5] bg-[#FAFAF8] text-[#111111] transition-colors group-hover:border-[#D4D4D4]">
              <Compass size={17} className="text-[#B51F3B]" />
            </div>
            <div className="min-w-0">
               <div className="mb-3 flex flex-col gap-1">
                 
                  <h1 className="text-xl font-extrabold tracking-tight text-[#111111] sm-base:text">
                    Spatial Explorer & Livability Rankings
                  </h1>
                  <p className="text-xs text-[#666666] sm:text-sm">
                    Rank places by available observations, inspect their coverage, and view eligible air trend projections.
                  </p>
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

          {/* Right: Backend status */}
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
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
        <div className="mx-auto grid grid-cols-2 px-1">
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
