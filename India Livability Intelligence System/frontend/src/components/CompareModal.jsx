import {
  ArrowRight,
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
  { key: "air", label: "Air quality", icon: Wind, color: "#22d3ee" },
  { key: "safety", label: "Safety index", icon: ShieldAlert, color: "#fb7185" },
  { key: "health", label: "Healthcare", icon: HeartPulse, color: "#34d399" },
  { key: "economy", label: "Economy & jobs", icon: TrendingUp, color: "#fbbf24" },
  { key: "col", label: "Cost of living", icon: Coins, color: "#c084fc" }
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

  const overallLeader = places.reduce((best, place) =>
    !best || place.overallScore > best.overallScore ? place : best
  , null);
  const runnerUp = places
    .filter(place => place.id !== overallLeader?.id)
    .sort((a, b) => b.overallScore - a.overallScore)[0];

  const columnsClass = places.length === 2 ? "sm:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-3";

  return (
    <Modal onClose={onClose} label="Compare places" className="max-w-4xl">
      <div className="flex items-start justify-between gap-3 border-b border-slate-800/80 bg-slate-950/40 p-4 sm:p-5">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
            <Scale size={18} />
          </span>
          <div>
            <h2 className="text-lg font-black tracking-tight text-white">Comparative Analysis</h2>
            <p className="text-[11px] text-slate-400">
              {places.length} place{places.length === 1 ? "" : "s"} side-by-side · live weights
            </p>
          </div>
        </div>
        <button onClick={onClose} className="icon-btn h-8 w-8" aria-label="Close comparison">
          <X size={17} />
        </button>
      </div>

      <div className="custom-scrollbar flex-1 overflow-y-auto p-4 sm:p-5">
        <div className="flex flex-col gap-5">
          {places.length < 2 && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-2.5 text-[11px] text-amber-200">
              <span>Add at least one more place to see a meaningful comparison.</span>
              <button
                onClick={onAddMore}
                className="flex items-center gap-1 rounded-lg bg-amber-400 px-2.5 py-1 text-[11px] font-bold text-slate-950 transition-colors hover:bg-amber-300"
              >
                <Plus size={12} /> Add place
              </button>
            </div>
          )}

          {overallLeader && places.length > 1 && (
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-3 py-2.5 text-[11px] text-emerald-200">
              <Trophy size={14} className="text-amber-400" />
              <span>
                <strong className="font-bold text-white">{overallLeader.name}</strong> leads the tray
                {runnerUp ? ` by ${(overallLeader.overallScore - runnerUp.overallScore).toFixed(1)} points` : ""}.
              </span>
            </div>
          )}

          <div className={`grid grid-cols-1 gap-3 ${columnsClass}`}>
            {places.map(place => {
              const scoreColor = getScoreColor(place.overallScore);
              const isLeader = overallLeader?.id === place.id;

              return (
                <article
                  key={place.id}
                  className={`relative flex flex-col justify-between rounded-2xl border p-4 ${
                    isLeader
                      ? "border-emerald-500/50 bg-emerald-950/20 shadow-lg shadow-emerald-500/5"
                      : "border-slate-800/90 bg-slate-950/50"
                  }`}
                >
                  <button
                    onClick={() => onRemovePlace(place)}
                    className="absolute right-2.5 top-2.5 rounded-lg p-1 text-slate-500 transition-colors hover:bg-slate-800 hover:text-rose-300"
                    title="Remove from comparison"
                    aria-label={`Remove ${place.name} from comparison`}
                  >
                    <X size={13} />
                  </button>

                  <div className="pr-7">
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                      <span>{place.type === "city" ? place.state : `${place.region} region`}</span>
                      <span className="text-slate-700">·</span>
                      <span>Rank #{place.rank}</span>
                    </div>
                    <h3 className="mt-0.5 truncate text-base font-bold text-white">{place.name}</h3>
                    <div className="mt-1 flex items-center gap-1.5">
                      <span
                        className="rounded-full px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide text-slate-900"
                        style={{ backgroundColor: getScoreColor(place.overallScore) }}
                      >
                        {place.outlook}
                      </span>
                      {isLeader && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/15 px-1.5 py-0.5 text-[8px] font-bold text-amber-300">
                          <Trophy size={9} /> Leader
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 flex items-end justify-between border-t border-slate-800/80 pt-3">
                    <div>
                      <span className="text-[9px] uppercase tracking-wider text-slate-500">Composite</span>
                      <div className="text-2xl font-black leading-none text-white">{place.overallScore}</div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: scoreColor }} />
                      <button
                        onClick={() => onSelectPlace(place)}
                        className="flex items-center gap-1 rounded-lg border border-slate-700 px-2 py-1 text-[10px] font-semibold text-slate-300 transition-colors hover:border-emerald-500/50 hover:text-emerald-300"
                      >
                        Details <ExternalLink size={10} />
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}

            {places.length < 3 && (
              <button
                onClick={onAddMore}
                className="flex min-h-[138px] flex-col items-center justify-center gap-1.5 rounded-2xl border border-dashed border-slate-700/80 bg-slate-950/30 p-4 text-slate-500 transition-colors hover:border-emerald-500/40 hover:bg-slate-900/40 hover:text-emerald-300"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-700">
                  <Plus size={15} />
                </span>
                <span className="text-[11px] font-semibold">Add another place</span>
                <span className="text-[9px] text-slate-600">
                  {3 - places.length} slot{3 - places.length === 1 ? "" : "s"} remaining
                </span>
              </button>
            )}
          </div>

          <div className="rounded-2xl border border-slate-800/80 bg-slate-950/40 p-4">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="eyebrow">Pillar-by-pillar</h3>
              <span className="text-[9px] text-slate-500">Gold badge = category leader</span>
            </div>

            <div className="flex flex-col gap-4">
              {factors.map(factor => {
                const Icon = factor.icon;
                return (
                  <div key={factor.key} className="flex flex-col gap-2">
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-200">
                      <Icon size={13} style={{ color: factor.color }} />
                      {factor.label}
                    </div>

                    <div className={`grid grid-cols-1 gap-2 ${columnsClass}`}>
                      {places.map(place => {
                        const value = place.factorScores?.[factor.key];
                        const hasValue = value !== null && value !== undefined;
                        const isLeader = leaders[factor.key] === place.id;

                        return (
                          <div
                            key={place.id}
                            className={`rounded-xl border p-2.5 ${
                              isLeader
                                ? "border-emerald-500/40 bg-emerald-950/20"
                                : "border-slate-800/80 bg-slate-900/40"
                            }`}
                          >
                            <div className="mb-1 flex items-center justify-between gap-1">
                              <span className="truncate text-[10px] text-slate-400">{place.name}</span>
                              {isLeader && (
                                <span className="flex shrink-0 items-center gap-1 rounded bg-amber-400/15 px-1 py-0.5 text-[8px] font-bold text-amber-300">
                                  <Trophy size={8} /> Best
                                </span>
                              )}
                            </div>
                            <div className="text-lg font-black text-white">{hasValue ? value : "—"}</div>
                            <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-slate-800">
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${hasValue ? value : 0}%`,
                                  backgroundColor: isLeader ? "#34d399" : factor.color
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

            {hasCostData && (
              <p className="mt-3 text-[9px] text-slate-500">
                Cost of living is a snapshot for six metro cities only and is never trended.
              </p>
            )}
          </div>

          <div className="flex items-center justify-between rounded-xl border border-slate-800/80 bg-slate-950/40 px-3 py-2 text-[10px] text-slate-500">
            <span>Comparison uses the same live pillar weights as the explorer.</span>
            <ArrowRight size={12} className="text-slate-600" />
          </div>
        </div>
      </div>
    </Modal>
  );
}
