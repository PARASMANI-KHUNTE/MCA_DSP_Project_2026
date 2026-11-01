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
    <div className="relative mb-3 overflow-hidden rounded-2xl border border-emerald-400/30 bg-gradient-to-r from-emerald-500/15 via-slate-900/80 to-cyan-500/15 p-3 shadow-lg shadow-emerald-500/10 sm:mb-4 sm:p-4">
      <div className="pointer-events-none absolute -right-10 -top-12 h-32 w-32 rounded-full bg-emerald-400/15 blur-3xl" />
      <div className="pointer-events-none absolute -left-8 -bottom-12 h-28 w-28 rounded-full bg-cyan-400/10 blur-3xl" />
      <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-2.5">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-400 to-cyan-400 text-slate-950 shadow-md shadow-emerald-400/30">
            <Sparkles size={16} />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-bold text-white sm:text-sm">Start exploring with real data</p>
            <p className="mt-0.5 text-[10px] leading-relaxed text-slate-300 sm:text-[11px]">
              61 places · Observed 2015–2024 · OLS projections to 2034. Missing data stays explicitly visible.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={onOpenTour}
            className="group flex min-h-9 items-center gap-1.5 rounded-lg border border-emerald-400/40 bg-emerald-500/15 px-3 py-1.5 text-[10px] font-bold text-emerald-200 transition-all hover:scale-[1.02] hover:border-emerald-300/60 hover:bg-emerald-500/25 hover:text-white"
          >
            <Compass size={12} className="transition-transform group-hover:rotate-12" />
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
                className="min-h-9 rounded-lg border border-slate-700/80 bg-slate-950/70 px-3 py-1.5 text-[10px] font-semibold text-slate-300 transition-all hover:scale-[1.02] hover:border-emerald-500/40 hover:text-emerald-200"
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
