import { ArrowRight, Scale, Trash2, X } from "lucide-react";
import { getScoreColor } from "../services/scoringService";

export default function CompareBar({ places, onRemove, onClear, onOpen }) {
  if (!places.length) return null;

  const canCompare = places.length >= 2;

  return (
    <div className="fixed inset-x-0 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-50 flex justify-center px-3 lg:bottom-5">
      <div className="surface flex w-full max-w-3xl items-center gap-2 rounded-2xl p-2 pl-3 shadow-2xl animate-slide-up">
        <div className="hidden items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 sm:flex">
          <Scale size={14} className="text-emerald-400" />
          Compare
        </div>

        <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto no-scrollbar">
          {places.map(place => (
            <span
              key={place.id}
              className="flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-700/70 bg-slate-900/80 py-1 pl-2 pr-1 text-[11px] font-semibold text-slate-200"
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: getScoreColor(place.overallScore) }}
              />
              {place.name}
              <button
                onClick={() => onRemove(place)}
                className="rounded p-0.5 text-slate-500 transition-colors hover:bg-slate-800 hover:text-rose-300"
                aria-label={`Remove ${place.name} from comparison`}
              >
                <X size={11} />
              </button>
            </span>
          ))}
          {places.length < 3 && (
            <span className="hidden shrink-0 text-[11px] text-slate-500 sm:inline">
              + {3 - places.length} slot{3 - places.length === 1 ? "" : "s"} left
            </span>
          )}
        </div>

        <button
          onClick={onClear}
          className="icon-btn hidden h-8 w-8 shrink-0 sm:inline-flex"
          title="Clear comparison tray"
          aria-label="Clear comparison tray"
        >
          <Trash2 size={14} />
        </button>

        <button
          onClick={onOpen}
          disabled={!canCompare}
          className={`flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-3 text-xs font-bold transition-all ${
            canCompare
              ? "bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20 hover:bg-emerald-400"
              : "cursor-not-allowed bg-slate-800 text-slate-500"
          }`}
          title={canCompare ? "Open comparison" : "Add one more place to compare"}
        >
          Compare
          <ArrowRight size={13} />
        </button>
      </div>
    </div>
  );
}
