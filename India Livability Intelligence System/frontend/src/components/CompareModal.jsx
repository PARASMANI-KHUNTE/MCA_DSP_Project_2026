import {
  Coins,
  ExternalLink,
  HeartPulse,
  Plus,
  Scale,
  ShieldAlert,
  TrendingUp,
  Trophy,
  Wind,
  X
} from "lucide-react";
import Modal from "./Modal";
import { getScoreColor } from "../services/scoringService";

const FACTORS = [
  { key: "air", label: "Air quality", icon: Wind, color: "#0284c7" },
  { key: "safety", label: "Safety index", icon: ShieldAlert, color: "#e11d48" },
  { key: "health", label: "Healthcare", icon: HeartPulse, color: "#16a34a" },
  { key: "economy", label: "Economy & jobs", icon: TrendingUp, color: "#d97706" },
  { key: "col", label: "Cost of living", icon: Coins, color: "#9333ea" }
];

export default function CompareModal({
  comparePlaces,
  onClose,
  onRemovePlace,
  onSelectPlace,
  onAddMore
}) {
  const places = comparePlaces || [];
  if (!places.length) return null;

  const hasCostData = places.some(place => place.factorScores?.col !== null && place.factorScores?.col !== undefined);
  const factors = FACTORS.filter(factor => factor.key !== "col" || hasCostData);

  const leaders = {};
  factors.forEach(factor => {
    let best = -1;
    let winnerId = null;
    places.forEach(place => {
      const value = place.factorScores?.[factor.key];
      if (value !== null && value !== undefined && value > best) {
        best = value;
        winnerId = place.id;
      }
    });
    leaders[factor.key] = winnerId;
  });

  const scoredPlaces = places
    .filter(place => Number.isFinite(place.overallScore))
    .sort((a, b) => b.overallScore - a.overallScore);
  const overallLeader = scoredPlaces[0] || null;
  const runnerUp = scoredPlaces[1] || null;

  const columnsClass = places.length === 2 ? "sm:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-3";

  return (
    <Modal onClose={onClose} label="Compare places" className="max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 border-b border-[#E5E5E5] bg-[#FAFAF8] p-4 sm:p-5">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#E5E5E5] bg-white text-[#B51F3B]">
            <Scale size={17} />
          </span>
          <div>
            <h2 className="text-lg font-black tracking-tight text-[#111111]">Comparative Analysis</h2>
            <p className="text-xs text-[#666666]">
              {places.length} place{places.length === 1 ? "" : "s"} side-by-side · Evaluated under current weights
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="rounded-lg p-1.5 text-[#888888] hover:bg-[#E5E5E5] hover:text-[#111111]"
          aria-label="Close comparison"
        >
          <X size={17} />
        </button>
      </div>

      <div className="custom-scrollbar flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="flex flex-col gap-6">
          {places.length < 2 && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs text-amber-900">
              <span>Select at least two places from rankings to compare them side-by-side.</span>
              <button
                onClick={onAddMore}
                className="flex items-center gap-1 rounded-lg bg-[#111111] px-3 py-1 text-xs font-bold text-white hover:bg-[#B51F3B]"
              >
                <Plus size={12} /> Add place
              </button>
            </div>
          )}

          {overallLeader && places.length > 1 && (
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[#E5E5E5] bg-[#FAFAF8] px-3.5 py-2.5 text-xs text-[#111111]">
              <Trophy size={14} className="text-[#B51F3B]" />
              <span>
                <strong className="font-bold">{overallLeader.name}</strong> leads the selected set
                {runnerUp ? ` by ${(overallLeader.overallScore - runnerUp.overallScore).toFixed(1)} points` : ""}.
              </span>
            </div>
          )}

          {/* Place Cards */}
          <div className={`grid grid-cols-1 gap-3 ${columnsClass}`}>
            {places.map(place => {
              const isLeader = overallLeader?.id === place.id;

              return (
                <article
                  key={place.id}
                  className={`relative flex flex-col justify-between rounded-2xl border p-4 ${
                    isLeader
                      ? "border-[#B51F3B] bg-white shadow-sm ring-1 ring-[#B51F3B]/20"
                      : "border-[#E5E5E5] bg-[#FAFAF8]"
                  }`}
                >
                  <button
                    onClick={() => onRemovePlace(place)}
                    className="absolute right-2.5 top-2.5 rounded-lg p-1 text-[#888888] hover:bg-[#E5E5E5] hover:text-[#B51F3B]"
                    title="Remove from comparison"
                    aria-label={`Remove ${place.name} from comparison`}
                  >
                    <X size={13} />
                  </button>

                  <div className="pr-6">
                    <div className="flex items-center gap-1.5 text-[11px] text-[#777777]">
                      <span>{place.type === "city" ? place.state : `${place.region} region`}</span>
                      <span>·</span>
                      <span>{place.rank ? `Rank #${place.rank}` : "Unranked"}</span>
                    </div>
                    <h3 className="mt-1 truncate text-base font-extrabold text-[#111111]">{place.name}</h3>
                    <div className="mt-1 flex items-center gap-1.5">
                      <span
                        className="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase text-white shadow-xs"
                        style={{ backgroundColor: getScoreColor(place.overallScore) }}
                      >
                        {place.outlook}
                      </span>
                      {isLeader && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 text-[9px] font-bold">
                          <Trophy size={9} /> Leader
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 flex items-end justify-between border-t border-[#E5E5E5] pt-3">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-[#888888]">Composite</span>
                      <div className="text-2xl font-black text-[#111111]">
                        {Number.isFinite(place.overallScore) ? place.overallScore : "—"}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onSelectPlace(place)}
                        className="flex items-center gap-1 rounded-lg border border-[#E5E5E5] bg-white px-2.5 py-1 text-xs font-semibold text-[#111111] hover:bg-[#FAFAF8]"
                      >
                        <span>Details</span>
                        <ExternalLink size={10} />
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}

            {places.length < 3 && (
              <button
                onClick={onAddMore}
                className="flex min-h-[140px] flex-col items-center justify-center gap-1.5 rounded-2xl border border-dashed border-[#E5E5E5] bg-[#FAFAF8] p-4 text-[#777777] hover:border-[#111111] hover:text-[#111111] transition-colors"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full border border-[#E5E5E5] bg-white">
                  <Plus size={14} />
                </span>
                <span className="text-xs font-semibold">Add another place</span>
                <span className="text-[10px] text-[#999999]">
                  {3 - places.length} slot{3 - places.length === 1 ? "" : "s"} remaining
                </span>
              </button>
            )}
          </div>

          {/* Pillar-by-Pillar Breakdown */}
          <div className="rounded-2xl border border-[#E5E5E5] bg-[#FAFAF8] p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="eyebrow text-[#888888]">Pillar-by-Pillar Comparison</h3>
              <span className="text-[10px] text-[#888888]">Category Leaders Highlighted</span>
            </div>

            <div className="flex flex-col gap-4">
              {factors.map(factor => {
                const Icon = factor.icon;
                return (
                  <div key={factor.key} className="flex flex-col gap-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-[#111111]">
                      <Icon size={13} style={{ color: factor.color }} />
                      <span>{factor.label}</span>
                    </div>

                    <div className={`grid grid-cols-1 gap-2 ${columnsClass}`}>
                      {places.map(place => {
                        const value = place.factorScores?.[factor.key];
                        const hasValue = value !== null && value !== undefined;
                        const isLeader = leaders[factor.key] === place.id;

                        return (
                          <div
                            key={place.id}
                            className={`rounded-xl border p-3 ${
                              isLeader
                                ? "border-[#B51F3B] bg-white ring-1 ring-[#B51F3B]/20 shadow-xs"
                                : "border-[#E5E5E5] bg-white"
                            }`}
                          >
                            <div className="mb-1 flex items-center justify-between gap-1">
                              <span className="truncate text-xs font-medium text-[#666666]">{place.name}</span>
                              {isLeader && (
                                <span className="flex shrink-0 items-center gap-1 rounded bg-amber-100 text-amber-900 border border-amber-300 px-1.5 py-0.5 text-[8px] font-bold">
                                  <Trophy size={8} /> Best
                                </span>
                              )}
                            </div>
                            <div className="text-lg font-black text-[#111111]">{hasValue ? value : "—"}</div>
                            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-[#E5E5E5]">
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${hasValue ? value : 0}%`,
                                  backgroundColor: isLeader ? "#B51F3B" : factor.color
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
