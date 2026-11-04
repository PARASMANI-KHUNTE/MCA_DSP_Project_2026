import { useState } from "react";
import {
  Check,
  Coins,
  HeartPulse,
  Info,
  RotateCcw,
  ShieldAlert,
  Sliders,
  TrendingUp,
  Wind
} from "lucide-react";
import { PRESETS } from "../data/methodologyData";
import { SCORE_GRADIENT_CSS } from "../services/scoringService";

const FACTORS = [
  {
    key: "air", label: "Air Quality", source: "Local PM2.5 observations · source unverified", icon: Wind, color: "#0284c7", max: 100,
    colorMeaning: "Higher score indicates cleaner ambient air with lower annual PM2.5 concentration."
  },
  {
    key: "safety", label: "Public Safety", source: "No active observations", icon: ShieldAlert, color: "#e11d48", max: 100,
    colorMeaning: "Higher score indicates lower recorded cognizable crime rates per capita."
  },
  {
    key: "health", label: "Healthcare", source: "NFHS-5 state composite · local extraction unverified", icon: HeartPulse, color: "#16a34a", max: 100,
    colorMeaning: "Higher score indicates stronger maternal and child health on the NFHS-5 composite index."
  },
  {
    key: "economy", label: "Economy & Jobs", source: "No active observations", icon: TrendingUp, color: "#d97706", max: 100,
    colorMeaning: "Higher score combines higher per-capita net state domestic product and employment rates."
  },
  {
    key: "col", label: "Cost of Living", source: "Longitudinal city estimates · source unverified", icon: Coins, color: "#9333ea", max: 100,
    colorMeaning: "Higher score indicates higher affordability (lower relative rent). Applies to 26 matched cities."
  }
];

const COLOR_MODES = [
  { id: "overall", label: "Overall" },
  { id: "factor", label: "Factor" },
  { id: "tier", label: "Bands" }
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
  selectedPresetId,
  availableFactors = [],
  compositeAvailable = false
}) {
  const [openInfoId, setOpenInfoId] = useState(null);
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
      {/* Header */}
      <div className="flex items-center justify-between gap-2 border-b border-[#E5E5E5] pb-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-[#E5E5E5] bg-[#FAFAF8] text-[#111111]">
            <Sliders size={15} />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="rounded bg-[#FAFAF8] border border-[#E5E5E5] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#B51F3B]">
                Step 1
              </span>
              <h2 className="truncate text-sm font-bold text-[#111111]">Set Priorities</h2>
            </div>
            <p className="text-[10px] text-[#666666]">Select preset or adjust weights</p>
          </div>
        </div>
        <button
          onClick={onReset}
          className="flex min-h-8 shrink-0 items-center gap-1 rounded-lg border border-[#E5E5E5] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#555555] transition-colors hover:border-[#D4D4D4] hover:text-[#111111]"
          title="Reset to balanced default"
        >
          <RotateCcw size={11} />
          Reset
        </button>
      </div>

      {/* Persona Presets */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="eyebrow text-[#888888]">Evaluation Presets</span>
          <span className="text-[10px] text-[#888888]">1-Click Scenarios</span>
        </div>
        {!compositeAvailable ? (
          <div className="grid grid-cols-1 gap-1.5">
            {FACTORS.filter(factor => availableFactors.includes(factor.key)).map(factor => {
              const id = `${factor.key}_only`;
              const selected = selectedPresetId === id;
              const Icon = factor.icon;
              return (
                <button
                  key={id}
                  onClick={() => onSelectPreset({ id, weights: { air: 0, safety: 0, health: 0, economy: 0, col: 0, [factor.key]: 100 } })}
                  aria-pressed={selected}
                  className={`flex items-start gap-2.5 rounded-xl border px-3 py-2 text-left transition-all ${selected ? "border-[#B51F3B] bg-white ring-1 ring-[#B51F3B]/30" : "border-[#E5E5E5] bg-[#FAFAF8] hover:bg-white"}`}
                >
                  <Icon size={14} className="mt-0.5 shrink-0" style={{ color: factor.color }} />
                  <span className="min-w-0">
                    <span className="block text-xs font-semibold text-[#111111]">Rank by {factor.label.toLowerCase()}</span>
                    <span className="mt-0.5 block text-[10px] leading-relaxed text-[#666666]">{factor.source}</span>
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-1.5">
            {PRESETS.map(preset => {
              const selected = selectedPresetId === preset.id;
              return (
                <button
                  key={preset.id}
                  onClick={() => compositeAvailable && onSelectPreset(preset)}
                  disabled={!compositeAvailable}
                  aria-pressed={selected}
                  className={`group relative flex items-start gap-2.5 rounded-xl border px-3 py-2 text-left transition-all ${
                    selected
                      ? "border-[#B51F3B] bg-white shadow-sm ring-1 ring-[#B51F3B]/30"
                      : "border-[#E5E5E5] bg-[#FAFAF8] hover:border-[#D4D4D4] hover:bg-white"
                  }`}
                >
                  <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center">
                    {selected ? (
                      <Check size={12} className="text-[#B51F3B]" />
                    ) : (
                      <span className="h-1.5 w-1.5 rounded-full bg-[#CCCCCC] group-hover:bg-[#888888]" />
                    )}
                  </span>
                  <span className="min-w-0">
                    <span className={`block text-xs font-semibold ${selected ? "text-[#111111]" : "text-[#333333]"}`}>
                      {preset.name}
                    </span>
                    <span className="mt-0.5 block truncate text-[10px] text-[#666666]">
                      {preset.desc}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Factor Sliders */}
      <div className="border-t border-[#E5E5E5] pt-3">
        <div className="mb-3 flex items-center justify-between">
          <span className="eyebrow text-[#888888]">Custom Pillar Weights</span>
          <span className={`rounded-full px-2 py-0.5 font-mono text-[10px] font-bold ${
            totalWeight === 0
              ? "bg-rose-50 text-rose-700 border border-rose-200"
              : "bg-[#FAFAF8] text-[#555555] border border-[#E5E5E5]"
          }`}>
            Σ {totalWeight}
          </span>
        </div>

        <div className="flex flex-col gap-3.5">
          {FACTORS.map(factor => {
            const Icon = factor.icon;
            const value = Number(weights[factor.key] || 0);
            const isAvail = availableFactors.includes(factor.key);

            return (
              <div key={factor.key} className="flex flex-col gap-1">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="flex min-w-0 items-center gap-1.5 font-medium text-[#222222]">
                    <Icon size={13} style={{ color: factor.color }} className="shrink-0" />
                    <span className="truncate">{factor.label}</span>
                    {!isAvail && <span className="text-[9px] text-amber-600 font-normal">Unavailable</span>}
                    <button
                      type="button"
                      aria-label={`Explain ${factor.label}`}
                      aria-expanded={openInfoId === factor.key}
                      onClick={() => setOpenInfoId(curr => curr === factor.key ? null : factor.key)}
                      className="ml-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[#999999] hover:bg-[#E5E5E5] hover:text-[#111111]"
                    >
                      <Info size={11} />
                    </button>
                  </span>
                  <span className="shrink-0 font-mono text-xs font-bold text-[#111111]">
                    {normalizedPct(value)}%
                  </span>
                </div>

                <input
                  type="range"
                  min="0"
                  max={factor.max}
                  step="5"
                  value={value}
                  disabled={!isAvail}
                  onChange={event => onChangeWeight(factor.key, Number(event.target.value))}
                  aria-label={`${factor.label} weight`}
                  className="my-1"
                  style={{ "--slider-accent": "#111111", "--slider-track": SCORE_GRADIENT_CSS }}
                />

                {openInfoId === factor.key && (
                  <p className="rounded-lg border border-[#E5E5E5] bg-[#FAFAF8] px-2.5 py-1.5 text-[10px] leading-relaxed text-[#555555]">
                    {factor.colorMeaning}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {totalWeight === 0 && (
          <div className="mt-3 flex items-start gap-1.5 rounded-lg border border-rose-200 bg-rose-50 p-2 text-[10px] text-rose-800">
            <Info size={12} className="mt-0.5 shrink-0" />
            All weights are set to 0. Adjust at least one slider to calculate scores.
          </div>
        )}
      </div>

      {/* Color Mode & Legend */}
      <div className="border-t border-[#E5E5E5] pt-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="eyebrow text-[#888888]">Spatial Color Mode</span>
          <span className="text-[10px] text-[#777777]">0 to 100</span>
        </div>

        <div className="grid grid-cols-3 gap-1 rounded-xl border border-[#E5E5E5] bg-[#FAFAF8] p-1">
          {COLOR_MODES.map(mode => {
            const enabled = mode.id === "factor" || compositeAvailable;
            const active = colorMode === mode.id;
            return (
              <button
                key={mode.id}
                onClick={() => enabled && onChangeColorMode(mode.id)}
                disabled={!enabled}
                aria-pressed={active}
                className={`min-h-8 rounded-lg px-2 py-1 text-xs font-semibold transition-all ${
                  active
                    ? "bg-[#111111] text-white shadow-sm"
                    : enabled
                    ? "text-[#666666] hover:bg-white hover:text-[#111111]"
                    : "cursor-not-allowed text-[#CCCCCC]"
                }`}
              >
                {mode.label}
              </button>
            );
          })}
        </div>

        {colorMode === "factor" && (
          <label className="mt-2.5 flex items-center justify-between gap-2 text-xs text-[#555555]">
            <span className="font-medium">Selected Factor:</span>
            <select
              value={activeFactor}
              onChange={event => onChangeActiveFactor(event.target.value)}
              aria-label="Select map color factor"
              className="rounded-lg border border-[#E5E5E5] bg-white px-2 py-1 text-xs font-semibold text-[#111111] focus:outline-none"
            >
              {MAP_FACTORS.map(factor => (
                <option key={factor.id} value={factor.id} disabled={!availableFactors.includes(factor.id)}>
                  {factor.label}{!availableFactors.includes(factor.id) ? " (unavailable)" : ""}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
    </div>
  );
}
