import { useState } from "react";
import { Compass, Sparkles, X } from "lucide-react";
import { PRESETS } from "../data/methodologyData";

const QUICK_PRESETS = ["environmental", "family", "career", "student"];

export default function QuickStartBanner({ onOpenTour, onSelectPreset }) {
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
    <div className="relative mb-3 overflow-hidden rounded-2xl border border-emerald-500/20 bg-gradient-to-r from-emerald-500/10 via-slate-900/70 to-cyan-500/10 p-3 sm:mb-4 sm:p-4">
      <div className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-emerald-500/10 blur-2xl" />
      <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-2.5">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-300">
            <Sparkles size={15} />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-bold text-white sm:text-sm">Start with a real-data preset</p>
            <p className="mt-0.5 text-[10px] leading-relaxed text-slate-400 sm:text-[11px]">
              61 places · observed 2015–2024 · OLS projections to 2034. Missing data stays visible.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={onOpenTour}
            className="flex min-h-8 items-center gap-1.5 rounded-lg border border-slate-700/80 bg-slate-900/70 px-2.5 py-1.5 text-[10px] font-bold text-slate-200 transition-colors hover:border-emerald-500/40 hover:text-white"
          >
            <Compass size={12} />
            Guided tour
          </button>
          {QUICK_PRESETS.map(id => {
            const preset = PRESETS.find(item => item.id === id);
            if (!preset) return null;
            return (
              <button
                key={id}
                onClick={() => onSelectPreset(preset)}
                title={preset.desc}
                className="min-h-8 rounded-lg border border-slate-800 bg-slate-950/60 px-2.5 py-1.5 text-[10px] font-semibold text-slate-300 transition-colors hover:border-emerald-500/40 hover:text-emerald-200"
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
        className="absolute right-2 top-2 rounded-md p-1 text-slate-500 transition-colors hover:bg-slate-800/80 hover:text-slate-200"
      >
        <X size={12} />
      </button>
    </div>
  );
}
