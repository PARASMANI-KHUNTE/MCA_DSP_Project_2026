import {
  Check,
  Coins,
  HeartPulse,
  Info,
  RotateCcw,
  ShieldAlert,
  Sliders,
  Sparkles,
  TrendingUp,
  Wind
} from "lucide-react";
import { PRESETS } from "../data/methodologyData";
import { getScoreColor, SCORE_GRADIENT_CSS } from "../services/scoringService";

const FACTORS = [
  { key: "air", label: "Air Quality", source: "CPCB · PM2.5", icon: Wind, color: "#22d3ee", max: 100 },
  { key: "safety", label: "Public Safety", source: "NCRB", icon: ShieldAlert, color: "#fb7185", max: 100 },
  { key: "health", label: "Healthcare", source: "SRS · IMR", icon: HeartPulse, color: "#34d399", max: 100 },
  { key: "economy", label: "Economy & Jobs", source: "RBI · NSDP", icon: TrendingUp, color: "#fbbf24", max: 100 },
  { key: "col", label: "Cost of Living", source: "6 metros · rent", icon: Coins, color: "#c084fc", max: 50 }
];

const COLOR_MODES = [
  { id: "overall", label: "Bad → Good" }
];

const MAP_FACTORS = [
  { id: "air", label: "Air" },
  { id: "safety", label: "Safety" },
  { id: "health", label: "Health" },
  { id: "economy", label: "Econ" },
  { id: "col", label: "Cost" }
];

export default function WeightControls({
  weights,
  onChangeWeight,
  onSelectPreset,
  onReset,
  colorMode,
  onChangeColorMode,
  activeFactor,
  onChangeActiveFactor,
  selectedPresetId
}) {
  const totalWeight =
    Number(weights.air || 0) +
    Number(weights.safety || 0) +
    Number(weights.health || 0) +
    Number(weights.economy || 0) +
    Number(weights.col || 0);

  const normalizedPct = value => {
    if (!totalWeight) return 0;
    return Math.round((Number(value || 0) / totalWeight) * 100);
  };

  return (
    <div className="surface flex w-full flex-col gap-5 p-4 sm:p-5">
      <div className="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-500/20 to-cyan-500/20 text-emerald-300 ring-1 ring-emerald-400/30">
            <Sliders size={17} />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="rounded bg-gradient-to-r from-emerald-500/30 to-cyan-500/30 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-emerald-200">Step 1</span>
              <h2 className="truncate text-sm font-bold tracking-wide text-slate-100">Set Priorities</h2>
            </div>
            <p className="text-[10px] text-slate-500">Pick a preset or fine-tune weights</p>
          </div>
        </div>
        <button
          onClick={onReset}
          className="flex min-h-8 shrink-0 items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-slate-400 transition-all hover:bg-slate-800/70 hover:text-emerald-300 hover:scale-[1.02]"
          title="Reset to balanced default"
        >
          <RotateCcw size={12} />
          Reset
        </button>
      </div>

      <div>
        <div className="mb-2 flex items-center gap-1.5">
          <Sparkles size={12} className="text-amber-400" />
          <span className="eyebrow">Persona presets</span>
        </div>
        <div className="grid grid-cols-1 gap-1.5">
          {PRESETS.map(preset => {
            const selected = selectedPresetId === preset.id;
            return (
              <button
                key={preset.id}
                onClick={() => onSelectPreset(preset)}
                aria-pressed={selected}
                className={`group relative flex items-start gap-2 rounded-xl border px-3 py-2.5 text-left transition-all ${
                  selected
                    ? "border-emerald-400/60 bg-gradient-to-r from-emerald-500/20 to-green-500/20 shadow-sm shadow-emerald-500/20"
                    : "border-slate-800/80 bg-slate-900/40 hover:border-slate-700 hover:bg-slate-800/60"
                }`}
              >
                <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center">
                  {selected ? (
                    <Check size={12} className="text-emerald-400" />
                  ) : (
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-600 group-hover:bg-slate-400" />
                  )}
                </span>
                <span className="min-w-0">
                  <span className={`block text-xs font-semibold ${selected ? "text-emerald-300" : "text-slate-200"}`}>
                    {preset.name}
                  </span>
                  <span className="mt-0.5 block truncate text-[10px] text-slate-500">{preset.desc}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="border-t border-slate-800/70 pt-3">
        <div className="mb-3 flex items-center justify-between">
          <span className="eyebrow">Custom weights</span>
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-mono font-bold ${
            totalWeight === 0
              ? "bg-rose-500/10 text-rose-300"
              : "bg-slate-800/80 text-slate-400"
          }`}>
            Σ {totalWeight}
          </span>
        </div>

        <div className="mb-3 flex items-center justify-between text-[9px] font-medium">
          <span className="text-red-400">Low ←</span>
          <span className="text-slate-500">slider range</span>
          <span className="text-emerald-400">→ High</span>
        </div>

        <div className="flex flex-col gap-3.5">
          {FACTORS.map(factor => {
            const Icon = factor.icon;
            const value = Number(weights[factor.key] || 0);
            const sliderPct = factor.max ? Math.round((value / factor.max) * 100) : 0;
            const sliderColor = getScoreColor(sliderPct);
            return (
              <div key={factor.key} className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="flex min-w-0 items-center gap-1.5 font-medium text-slate-200">
                    <Icon size={13} style={{ color: factor.color }} className="shrink-0" />
                    <span className="truncate">{factor.label}</span>
                    <span className="hidden truncate text-[9px] font-normal text-slate-500 sm:inline">
                      {factor.source}
                    </span>
                  </span>
                  <span
                    className="shrink-0 font-mono text-[11px] font-bold"
                    style={{ color: getScoreColor(normalizedPct(value)) }}
                  >
                    {normalizedPct(value)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max={factor.max}
                  step="5"
                  value={value}
                  onChange={event => onChangeWeight(factor.key, Number(event.target.value))}
                  aria-label={`${factor.label} weight`}
                  className="my-1"
                  style={{ "--slider-accent": sliderColor, "--slider-track": SCORE_GRADIENT_CSS }}
                />
              </div>
            );
          })}
        </div>

        {totalWeight === 0 && (
          <div className="mt-2 flex items-start gap-1.5 rounded-lg border border-rose-500/20 bg-rose-500/10 p-2 text-[10px] text-rose-200">
            <Info size={12} className="mt-0.5 shrink-0" />
            All weights are zero. Move at least one slider to rank places.
          </div>
        )}

        <p className="mt-2 flex items-start gap-1.5 text-[10px] leading-relaxed text-slate-500">
          <Info size={11} className="mt-0.5 shrink-0" />
          Percentages are normalized automatically. Cost of living applies to six metro cities only.
        </p>
      </div>

      <div className="border-t border-slate-800/70 pt-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="eyebrow">Map color</span>
          <span className="text-[9px] text-slate-500">Red = bad · Yellow = mid · Green = good</span>
        </div>
        <div className="mb-2 px-0.5">
          <div
            className="h-2.5 rounded-full ring-1 ring-inset ring-slate-950/60"
            style={{ background: SCORE_GRADIENT_CSS }}
            role="img"
            aria-label="Score color range from red (bad) through yellow (moderate) to green (good)"
          />
          <div className="mt-1 flex justify-between text-[9px] font-medium text-slate-500">
            <span className="text-red-400">Worse ← 0</span>
            <span>50</span>
            <span className="text-emerald-400">100 → Better</span>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-1 rounded-xl border border-slate-800 bg-slate-950/70 p-1">
          {COLOR_MODES.map(mode => (
            <button
              key={mode.id}
              onClick={() => onChangeColorMode(mode.id)}
              aria-pressed={colorMode === mode.id}
              className={`min-h-9 rounded-lg px-1 py-2 text-[11px] font-semibold transition-all ${
                colorMode === mode.id
                  ? "text-slate-950 shadow-md shadow-emerald-500/25"
                  : "text-slate-400 hover:bg-slate-800/70 hover:text-white"
              }`}
              style={colorMode === mode.id ? { backgroundImage: SCORE_GRADIENT_CSS } : undefined}
            >
              {mode.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
