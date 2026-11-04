import { useMemo, useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  Check,
  Map,
  Minus,
  Scale,
  Search,
  Trophy,
  X
} from "lucide-react";
import { getScoreColor } from "../services/scoringService";

const FILTERS = [
  { id: "city", label: "Cities" },
  { id: "state", label: "States" },
  { id: "all", label: "All" }
];

function OutlookIcon({ outlook }) {
  if (outlook === "Improving") {
    return <ArrowUpRight size={12} className="text-emerald-700" title="Improving outlook" />;
  }
  if (outlook === "Declining") {
    return <ArrowDownRight size={12} className="text-[#B51F3B]" title="Declining outlook" />;
  }
  return (
    <Minus
      size={12}
      className="text-amber-600"
      title={outlook === "Insufficient data" ? "Insufficient data for a trend" : "Stable or uncertain"}
    />
  );
}

export default function Leaderboard({
  rankedPlaces,
  onSelectPlace,
  selectedPlaceId,
  compareIds,
  onToggleCompare,
  year,
  compositeAvailable = false
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("city");

  const filteredPlaces = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return rankedPlaces.filter(place => {
      const matchesSearch =
        !query ||
        place.name.toLowerCase().includes(query) ||
        place.state.toLowerCase().includes(query) ||
        place.region.toLowerCase().includes(query);
      return matchesSearch && (filterType === "all" || place.type === filterType);
    });
  }, [rankedPlaces, searchTerm, filterType]);

  const clearFilters = () => {
    setSearchTerm("");
    setFilterType("city");
  };

  return (
    <div className="surface flex h-full w-full flex-col overflow-hidden p-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 border-b border-[#E5E5E5] pb-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-[#E5E5E5] bg-[#FAFAF8] text-[#111111]">
            <Trophy size={15} />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="rounded bg-[#FAFAF8] border border-[#E5E5E5] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#B51F3B]">
                Step 3
              </span>
              <h2 className="truncate text-sm font-bold text-[#111111]">Rankings</h2>
            </div>
            <p className="truncate text-[10px] text-[#666666]">
              {compositeAvailable ? `${year} Livability Index` : `${year} · Single factor ranking`}
            </p>
          </div>
        </div>
        <span className="shrink-0 rounded-full border border-[#E5E5E5] bg-[#FAFAF8] px-2.5 py-0.5 text-[10px] font-semibold text-[#666666]">
          {filteredPlaces.length} places
        </span>
      </div>

      {/* Search & Filter */}
      <div className="my-3 flex flex-col gap-2">
        <div className="relative">
          <Search size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#888888]" />
          <input
            type="text"
            placeholder="Search city, state, or region..."
            value={searchTerm}
            onChange={event => setSearchTerm(event.target.value)}
            className="w-full rounded-xl border border-[#E5E5E5] bg-[#FAFAF8] py-2 pl-8 pr-8 text-xs text-[#111111] placeholder:text-[#999999] transition-all focus:border-[#111111] focus:bg-white focus:outline-none"
            aria-label="Search places"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-[#888888] hover:text-[#111111]"
              aria-label="Clear search"
            >
              <X size={12} />
            </button>
          )}
        </div>

        <div className="grid grid-cols-3 gap-1 rounded-xl border border-[#E5E5E5] bg-[#FAFAF8] p-1">
          {FILTERS.map(filter => (
            <button
              key={filter.id}
              onClick={() => setFilterType(filter.id)}
              aria-pressed={filterType === filter.id}
              className={`min-h-8 rounded-lg px-2 py-1 text-xs font-semibold transition-all ${
                filterType === filter.id
                  ? "bg-[#111111] text-white shadow-sm"
                  : "text-[#666666] hover:bg-white hover:text-[#111111]"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Place List */}
      <div className="custom-scrollbar -mr-1 flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto pr-1">
        {filteredPlaces.map(place => {
          const isSelected = selectedPlaceId === place.id;
          const isComparing = compareIds.includes(place.id);
          const hasScore = Number.isFinite(place.overallScore);
          const scoreColor = getScoreColor(place.overallScore);

          return (
            <div
              key={place.id}
              role="button"
              tabIndex={0}
              onClick={() => onSelectPlace(place)}
              onKeyDown={event => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSelectPlace(place);
                }
              }}
              aria-label={`Open details for ${place.name}, score ${hasScore ? place.overallScore : "unavailable"}`}
              className={`group relative flex flex-col gap-2 rounded-xl border p-2.5 transition-all ${
                isSelected
                  ? "border-[#B51F3B] bg-[#FAFAF8] shadow-sm ring-1 ring-[#B51F3B]/30"
                  : "border-[#E5E5E5] bg-white hover:border-[#D4D4D4] hover:bg-[#FAFAF8]"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    className={`flex h-5 min-w-5 shrink-0 items-center justify-center rounded-md px-1 text-[10px] font-bold ${
                      place.rank === 1
                        ? "bg-amber-100 text-amber-900 border border-amber-300"
                        : place.rank === 2
                        ? "bg-slate-100 text-slate-800 border border-slate-300"
                        : place.rank === 3
                        ? "bg-orange-100 text-orange-900 border border-orange-300"
                        : "bg-[#FAFAF8] text-[#777777] border border-[#E5E5E5]"
                    }`}
                  >
                    {place.rank ?? "—"}
                  </span>

                  <div className="flex min-w-0 flex-col">
                    <span className="flex items-center gap-1.5 text-xs font-bold text-[#111111] transition-colors group-hover:text-[#B51F3B]">
                      <span className="truncate">{place.name}</span>
                      <OutlookIcon outlook={place.outlook} />
                    </span>
                    <span className="flex items-center gap-1 truncate text-[10px] text-[#777777]">
                      {place.type === "city" ? <Map size={9} /> : <span className="h-1.5 w-1.5 rounded-full bg-[#CCCCCC]" />}
                      {place.type === "city" ? place.state : `${place.region} region`}
                      <span>·</span>
                      {place.type}
                      {place.partialData && (
                        <>
                          <span>·</span>
                          <span
                            className="rounded bg-amber-50 px-1 py-0.5 text-[9px] font-medium text-amber-800 border border-amber-200"
                            title={`Reweighted across available indicators (missing: ${place.missingFactors?.join(", ")})`}
                          >
                            partial
                          </span>
                        </>
                      )}
                    </span>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-1.5">
                  <button
                    title={isComparing ? "Remove from comparison" : "Add to comparison (max 3)"}
                    onClick={event => {
                      event.stopPropagation();
                      onToggleCompare(place);
                    }}
                    aria-label={isComparing ? `Remove ${place.name} from comparison` : `Add ${place.name} to comparison`}
                    className={`rounded-lg p-1.5 transition-colors ${
                      isComparing
                        ? "bg-[#B51F3B] text-white"
                        : "text-[#888888] hover:bg-[#E5E5E5] hover:text-[#111111]"
                    }`}
                  >
                    {isComparing ? <Check size={11} /> : <Scale size={11} />}
                  </button>

                  <span
                    className="min-w-[34px] rounded-lg px-1.5 py-0.5 text-center text-[11px] font-black shadow-xs"
                    style={{
                      backgroundColor: scoreColor,
                      color: "#FFFFFF"
                    }}
                  >
                    {hasScore ? place.overallScore : "—"}
                  </span>
                </div>
              </div>

              <div className="h-1 w-full overflow-hidden rounded-full bg-[#E5E5E5]">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{ width: `${hasScore ? place.overallScore : 0}%`, backgroundColor: scoreColor }}
                />
              </div>
            </div>
          );
        })}

        {filteredPlaces.length === 0 && (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 py-8 text-center">
            <Search size={20} className="text-[#CCCCCC]" />
            <p className="text-xs font-semibold text-[#666666]">No matching places</p>
            <p className="max-w-[180px] text-[10px] text-[#999999]">
              Try a different spelling or change the filter tab.
            </p>
            <button
              onClick={clearFilters}
              className="mt-1 rounded-lg border border-[#E5E5E5] bg-white px-2.5 py-1 text-xs font-medium text-[#111111] hover:bg-[#FAFAF8]"
            >
              Reset filters
            </button>
          </div>
        )}
      </div>

      <div className="mt-2 border-t border-[#E5E5E5] pt-2 text-[10px] text-[#777777]">
        Dynamically evaluated from active weights. Select a place to open deep dive modal.
      </div>
    </div>
  );
}
