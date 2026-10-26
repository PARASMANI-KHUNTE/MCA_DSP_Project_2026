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
    return <ArrowUpRight size={12} className="text-emerald-400" title="Improving outlook" />;
  }
  if (outlook === "Declining") {
    return <ArrowDownRight size={12} className="text-rose-400" title="Declining outlook" />;
  }
  return (
    <Minus
      size={12}
      className="text-amber-400"
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
  year
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
      <div className="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400">
            <Trophy size={16} />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-amber-300">Step 3</span>
              <h2 className="truncate text-sm font-bold tracking-wide text-slate-100">Live Rankings</h2>
            </div>
            <p className="truncate text-[10px] text-slate-500">{year} weighted index · click for details</p>
          </div>
        </div>
        <span className="shrink-0 rounded-full bg-slate-800/80 px-2.5 py-1 text-[10px] font-semibold text-slate-400">
          {filteredPlaces.length} shown
        </span>
      </div>

      <div className="my-3 flex flex-col gap-2">
        <div className="relative">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search city, state or region..."
            value={searchTerm}
            onChange={event => setSearchTerm(event.target.value)}
            className="w-full rounded-xl border border-slate-800 bg-slate-950/70 py-2.5 pl-9 pr-9 text-base text-slate-200 placeholder:text-slate-600 transition-colors focus:border-emerald-500/60 focus:outline-none sm:text-xs"
            aria-label="Search places"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-slate-500 transition-colors hover:bg-slate-800 hover:text-slate-200"
              aria-label="Clear search"
            >
              <X size={13} />
            </button>
          )}
        </div>

        <div className="grid grid-cols-3 gap-1 rounded-xl border border-slate-800 bg-slate-950/70 p-1">
          {FILTERS.map(filter => (
            <button
              key={filter.id}
              onClick={() => setFilterType(filter.id)}
              aria-pressed={filterType === filter.id}
              className={`min-h-9 rounded-lg px-1 py-2 text-[11px] font-semibold transition-all ${
                filterType === filter.id
                  ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20"
                  : "text-slate-400 hover:bg-slate-800/70 hover:text-white"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

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
              className={`group relative flex flex-col gap-2 rounded-xl border p-3 transition-all ${
                isSelected
                  ? "border-emerald-500/60 bg-slate-800/90 shadow-md ring-1 ring-emerald-500/20"
                  : "border-slate-800/70 bg-slate-950/40 hover:border-slate-700 hover:bg-slate-800/50"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span
                    className={`flex h-6 min-w-6 shrink-0 items-center justify-center rounded-lg px-1 text-[10px] font-bold ${
                      place.rank === 1
                        ? "bg-amber-400 text-slate-950"
                        : place.rank === 2
                          ? "bg-slate-300 text-slate-950"
                          : place.rank === 3
                            ? "bg-amber-700 text-white"
                            : "bg-slate-800 text-slate-400"
                    }`}
                  >
                    {place.rank ?? "—"}
                  </span>

                  <div className="flex min-w-0 flex-col">
                    <span className="flex items-center gap-1.5 text-xs font-bold text-slate-200 transition-colors group-hover:text-emerald-300">
                      <span className="truncate">{place.name}</span>
                      <OutlookIcon outlook={place.outlook} />
                    </span>
                    <span className="flex items-center gap-1 truncate text-[10px] text-slate-500">
                      {place.type === "city" ? <Map size={9} /> : <span className="h-1.5 w-1.5 rounded-full bg-slate-600" />}
                      {place.type === "city" ? place.state : `${place.region} region`}
                      <span className="text-slate-700">·</span>
                      {place.type}
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
                    className={`rounded-md p-1.5 transition-colors ${
                      isComparing
                        ? "bg-emerald-500 text-slate-950"
                        : "text-slate-600 hover:bg-slate-800 hover:text-slate-200"
                    }`}
                  >
                    {isComparing ? <Check size={12} /> : <Scale size={12} />}
                  </button>

                  <span
                    className="min-w-[38px] rounded-lg px-2 py-1 text-center text-[11px] font-black text-slate-950 shadow-sm"
                    style={{ backgroundColor: scoreColor }}
                  >
                    {hasScore ? place.overallScore : "—"}
                  </span>
                </div>
              </div>

              <div className="h-0.5 w-full overflow-hidden rounded-full bg-slate-800/80">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{ width: `${hasScore ? place.overallScore : 0}%`, backgroundColor: scoreColor }}
                />
              </div>
            </div>
          );
        })}

        {filteredPlaces.length === 0 && (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 py-10 text-center">
            <Search size={22} className="text-slate-700" />
            <p className="text-xs font-semibold text-slate-400">No matching places</p>
            <p className="max-w-[180px] text-[10px] leading-relaxed text-slate-500">
              Try a different spelling, region or place type.
            </p>
            <button
              onClick={clearFilters}
              className="mt-1 rounded-lg border border-slate-700 px-3 py-1 text-[11px] font-semibold text-slate-300 transition-colors hover:border-emerald-500/50 hover:text-emerald-300"
            >
              Reset filters
            </button>
          </div>
        )}
      </div>

      <div className="mt-2 border-t border-slate-800/70 pt-2 text-[10px] text-slate-500">
        Ranked live from your current pillar weights. Select a place for full detail.
      </div>
    </div>
  );
}
