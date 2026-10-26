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

const FACTORS = [
  { key: "air", label: "Air Quality", source: "CPCB · PM2.5", icon: Wind, color: "#22d3ee", max: 100 },
  { key: "safety", label: "Public Safety", source: "NCRB", icon: ShieldAlert, color: "#fb7185", max: 100 },
  { key: "health", label: "Healthcare", source: "SRS · IMR", icon: HeartPulse, color: "#34d399", max: 100 },
  { key: "economy", label: "Economy & Jobs", source: "RBI · NSDP", icon: TrendingUp, color: "#fbbf24", max: 100 },
  { key: "col", label: "Cost of Living", source: "6 metros · rent", icon: Coins, color: "#c084fc", max: 50 }
];

const COLOR_MODES = [
  { id: "overall", label: "Composite" },
  { id: "factor", label: "Pillar" },
  { id: "tier", label: "Tier" }
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
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
            <Sliders size={16} />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-emerald-300">Step 1</span>
              <h2 className="truncate text-sm font-bold tracking-wide text-slate-100">Set Priorities</h2>
            </div>
            <p className="text-[10px] text-slate-500">Pick a preset or drag sliders</p>
          </div>
        </div>
        <button
          onClick={onReset}
          className="flex min-h-8 shrink-0 items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-slate-400 transition-colors hover:bg-slate-800/70 hover:text-emerald-300"
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
                    ? "border-emerald-500/50 bg-emerald-500/10 shadow-sm shadow-emerald-500/10"
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
                  <span className={`block text-xs font-semibold ${selected ? "text-emerald-200" : "text-slate-200"}`}>
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

        <div className="flex flex-col gap-3.5">
          {FACTORS.map(factor => {
            const Icon = factor.icon;
            const value = Number(weights[factor.key] || 0);
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
                  <span className="shrink-0 font-mono text-[11px] font-bold" style={{ color: factor.color }}>
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
                  style={{ "--slider-accent": factor.color }}
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
          <span className="eyebrow">Map color by</span>
          <span className="text-[9px] text-slate-500">Choropleth + pins</span>
        </div>
        <div className="grid grid-cols-3 gap-1 rounded-xl border border-slate-800 bg-slate-950/70 p-1">
          {COLOR_MODES.map(mode => (
            <button
              key={mode.id}
              onClick={() => {
                onChangeColorMode(mode.id);
                if (mode.id === "factor" && activeFactor === "overall") onChangeActiveFactor("air");
              }}
              aria-pressed={colorMode === mode.id}
              className={`min-h-9 rounded-lg px-1 py-2 text-[11px] font-semibold transition-all ${
                colorMode === mode.id
                  ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20"
                  : "text-slate-400 hover:bg-slate-800/70 hover:text-white"
              }`}
            >
              {mode.label}
            </button>
          ))}
        </div>

        {colorMode === "factor" && (
          <div className="mt-2 grid grid-cols-5 gap-1">
            {MAP_FACTORS.map(factor => (
              <button
                key={factor.id}
                onClick={() => onChangeActiveFactor(factor.id)}
                aria-pressed={activeFactor === factor.id}
                className={`min-h-8 rounded-md border px-0.5 py-1.5 text-[10px] font-semibold transition-colors ${
                  activeFactor === factor.id
                    ? "border-cyan-400/60 bg-cyan-500/15 text-cyan-200"
                    : "border-slate-800 text-slate-500 hover:border-slate-700 hover:text-slate-300"
                }`}
              >
                {factor.label}
              </button>
            ))}
          </div>
        )}

        {colorMode === "tier" && (
          <p className="mt-2 text-[10px] leading-relaxed text-slate-500">
            Tier view groups live composite scores into three score bands; it is not a K-Means cluster assignment.
          </p>
        )}
      </div>
    </div>
  );
}
