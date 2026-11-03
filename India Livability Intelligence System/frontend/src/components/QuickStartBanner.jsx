import { useState } from "react";
import { Compass, Sparkles, X } from "lucide-react";
import { PRESETS } from "../data/methodologyData";

const QUICK_PRESETS = ["environmental", "family", "career", "student"];

export default function QuickStartBanner({ onOpenTour, onSelectPreset, compositeAvailable, availableFactors = [] }) {
  const [visible, setVisible] = useState(() => {
    try {
      return window.localStorage.getItem("livability-quickstart-dismissed") !== "1";
    } catch {
      return true;
    }
  });

  if (!visible) return null;

  const dismiss = () => {
    setVisible(false);
    try {
      window.localStorage.setItem("livability-quickstart-dismissed", "1");
    } catch {
      // Storage can be unavailable in private or embedded contexts.
    }
  };

  return (
    <div className="relative mb-4 overflow-hidden rounded-2xl border border-[#E5E5E5] bg-[#FAFAF8] p-3.5 sm:p-4">
      <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-2.5">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-[#E5E5E5] bg-white text-[#B51F3B]">
            <Sparkles size={15} />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-bold text-[#111111] sm:text-sm">
              Explore available rankings
            </p>
            <p className="mt-0.5 text-[11px] leading-relaxed text-[#666666]">
              {compositeAvailable
                ? "Simulate alternative priorities across Clean Air, Public Safety, Health, and Economy."
                : `Choose an air ranking or rent snapshot ranking. No composite index is available from the active data.`}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 pr-6 sm:pr-0">
          <button
            onClick={onOpenTour}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#E5E5E5] bg-white px-3 py-1.5 text-xs font-semibold text-[#111111] transition-colors hover:border-[#D4D4D4] hover:bg-[#F5F5F2]"
          >
            <Compass size={12} className="text-[#B51F3B]" />
            <span>Tour</span>
          </button>

          {!compositeAvailable && availableFactors.map(factor => {
            const preset = {
              id: `${factor}_only`,
              weights: { air: 0, safety: 0, health: 0, economy: 0, col: 0, [factor]: 100 }
            };
            const label = factor === "air" ? "Air ranking" : factor === "col" ? "Rent snapshot" : factor;
            return <button key={factor} onClick={() => onSelectPreset(preset)} className="rounded-lg border border-[#E5E5E5] bg-white px-2.5 py-1.5 text-xs font-medium text-[#444444] hover:border-[#B51F3B] hover:text-[#B51F3B]">{label}</button>;
          })}

          {compositeAvailable &&
            QUICK_PRESETS.map(id => {
              const preset = PRESETS.find(item => item.id === id);
              if (!preset) return null;
              return (
                <button
                  key={id}
                  onClick={() => onSelectPreset(preset)}
                  title={preset.desc}
                  className="rounded-lg border border-[#E5E5E5] bg-white px-2.5 py-1.5 text-xs font-medium text-[#444444] transition-colors hover:border-[#B51F3B] hover:text-[#B51F3B]"
                >
                  {preset.name}
                </button>
              );
            })}
        </div>
      </div>

      <button
        onClick={dismiss}
        aria-label="Dismiss quick start banner"
        className="absolute right-2.5 top-2.5 rounded-lg p-1 text-[#888888] transition-colors hover:bg-[#E5E5E5] hover:text-[#111111]"
      >
        <X size={13} />
      </button>
    </div>
  );
}
