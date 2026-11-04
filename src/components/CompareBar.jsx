import { ArrowRight, Scale, Trash2, X } from "lucide-react";
import { getScoreColor } from "../services/scoringService";

export default function CompareBar({ places, onRemove, onClear, onOpen }) {
  if (!places.length) return null;

  const canCompare = places.length >= 2;

  return (
    <div className="fixed inset-x-0 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-50 flex justify-center px-3 lg:bottom-6">
      <div className="flex w-full max-w-3xl items-center gap-2 rounded-2xl border border-[#E5E5E5] bg-white p-2.5 pl-4 shadow-xl animate-slide-up">
        <div className="hidden items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#111111] sm:flex">
          <Scale size={14} className="text-[#B51F3B]" />
          <span>Compare</span>
        </div>

        <div className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto no-scrollbar">
          {places.map(place => (
            <span
              key={place.id}
              className="flex shrink-0 items-center gap-1.5 rounded-lg border border-[#E5E5E5] bg-[#FAFAF8] py-1 pl-2.5 pr-1.5 text-xs font-semibold text-[#111111]"
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: getScoreColor(place.overallScore) }}
              />
              <span>{place.name}</span>
              <button
                onClick={() => onRemove(place)}
                className="rounded p-0.5 text-[#888888] transition-colors hover:bg-[#E5E5E5] hover:text-[#B51F3B]"
                aria-label={`Remove ${place.name} from comparison`}
              >
                <X size={12} />
              </button>
            </span>
          ))}
          {places.length < 3 && (
            <span className="hidden shrink-0 text-xs text-[#888888] sm:inline">
              + {3 - places.length} slot{3 - places.length === 1 ? "" : "s"} left
            </span>
          )}
        </div>

        <button
          onClick={onClear}
          className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#888888] transition-colors hover:bg-[#FAFAF8] hover:text-[#111111] sm:inline-flex"
          title="Clear comparison tray"
          aria-label="Clear comparison tray"
        >
          <Trash2 size={14} />
        </button>

        <button
          onClick={onOpen}
          disabled={!canCompare}
          className={`flex h-8 shrink-0 items-center gap-1.5 rounded-xl px-4 text-xs font-bold transition-all ${
            canCompare
              ? "bg-[#111111] text-white shadow-sm hover:bg-[#B51F3B]"
              : "cursor-not-allowed border border-[#E5E5E5] bg-[#FAFAF8] text-[#AAAAAA]"
          }`}
          title={canCompare ? "Open comparison" : "Add one more place to compare"}
        >
          <span>Compare</span>
          <ArrowRight size={13} />
        </button>
      </div>
    </div>
  );
}
