import {
  Activity,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Compass,
  Map,
  X
} from "lucide-react";

const TABS = [
  { id: "map", label: "Explorer", icon: Map },
  { id: "insights", label: "Insights", icon: Activity },
  { id: "pipeline", label: "Pipeline", icon: BookOpen }
];

export default function Sidebar({
  activeTab,
  onSelectTab,
  compositeAvailable,
  isOpen = false,
  onClose = () => {},
  isCollapsed = false,
  onToggleCollapse = () => {}
}) {
  return (
    <>
      {/* Mobile drawer overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs transition-opacity md:hidden"
          aria-hidden="true"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 flex w-64 max-w-[85vw] flex-col border-r border-[#E5E5E5] bg-white
          transition-all duration-300 ease-out
          md:sticky md:top-0 md:z-30 md:h-[100dvh] md:shrink-0 md:translate-x-0 md:shadow-none
          ${isOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"}
          ${isCollapsed ? "md:w-16" : "md:w-64"}
        `}
        aria-label="Main navigation"
      >
        {/* Header / Brand */}
        <div
          className={`flex h-14 items-center px-3 border-b border-[#E5E5E5] transition-all duration-300 ${
            isCollapsed ? "justify-center" : "justify-between"
          }`}
        >
          <button
            onClick={() => {
              onSelectTab("map");
              onClose();
            }}
            className="group flex items-center gap-2.5 min-w-0 transition-opacity hover:opacity-90"
            aria-label="Go to explorer"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#E5E5E5] bg-[#FAFAF8] text-[#111111] transition-colors group-hover:border-[#D4D4D4]">
              <Compass size={17} className="text-[#B51F3B]" />
            </div>
            {!isCollapsed && (
              <span className="text-sm font-extrabold tracking-tight text-[#111111] truncate">
                Spatial Explorer
              </span>
            )}
          </button>

          {/* Desktop Collapse Toggle */}
          <button
            onClick={onToggleCollapse}
            className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#666666] transition-all hover:bg-[#F5F5F2] hover:text-[#111111] md:flex"
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>

          {/* Mobile Close Button */}
          <button
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#666666] transition-all hover:bg-[#F5F5F2] hover:text-[#111111] md:hidden"
            aria-label="Close sidebar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-2 py-3 space-y-1 overflow-y-auto" aria-label="Primary navigation">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  onSelectTab(tab.id);
                  onClose();
                }}
                aria-current={active ? "page" : undefined}
                className={`w-full flex items-center gap-3 px-2.5 py-2 text-sm font-medium rounded-lg transition-all ${
                  active
                    ? "bg-[#B51F3B]/10 text-[#B51F3B] font-semibold"
                    : "text-[#666666] hover:bg-[#F5F5F2] hover:text-[#111111]"
                } ${isCollapsed ? "justify-center" : ""}`}
                title={isCollapsed ? tab.label : undefined}
              >
                <Icon
                  size={20}
                  className={active ? "text-[#B51F3B] flex-shrink-0" : "text-[#888888] flex-shrink-0"}
                  aria-hidden="true"
                />
                {!isCollapsed && (
                  <span className="truncate">{tab.label}</span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer: Data Status */}
        <div className="p-3 border-t border-[#E5E5E5] transition-all duration-300">
          {isCollapsed ? (
            <div className="flex justify-center" title="Local Engine: All scores are computed locally in your browser.">
              <Compass size={16} className="text-[#999999]" />
            </div>
          ) : (
            <div
              className="flex items-center gap-2 rounded-xl border border-[#E5E5E5] bg-[#FAFAF8] px-2.5 py-2 text-xs font-semibold text-[#666666]"
              title="All scores are computed locally in your browser from the embedded dataset."
            >
              <Compass size={12} className="text-[#999999] flex-shrink-0" />
              <div className="flex flex-col gap-0.5 min-w-0">
                <span className="truncate">Local Engine</span>
                <span className="text-[10px] text-[#888888] truncate">
                  {compositeAvailable ? "Composite scores active" : "Factor-specific view"}
                </span>
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
