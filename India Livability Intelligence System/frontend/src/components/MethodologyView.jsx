import {
  AlertTriangle,
  BookOpen,
  Database,
  GitBranch,
  Info,
  Layers,
  Scale,
  ShieldCheck
} from "lucide-react";
import { DATA_GAPS, METHODOLOGY_DETAILS, PRESETS } from "../data/methodologyData";
import { DATA_COVERAGE } from "../services/scoringService";

const PIPELINE = [
  {
    title: "Ingest",
    body: "Published state and city tables are loaded into one comparable schema with explicit source IDs and years."
  },
  {
    title: "Normalize",
    body: "Each indicator is rescaled to 0–100 with direction-aware min-max bounds so higher always means better."
  },
  {
    title: "Weight",
    body: "User or preset weights combine four to five pillars; zero-weight pillars drop out and all-zero weights leave places unranked."
  },
  {
    title: "Project",
    body: "A composite OLS slope is fitted to 2015–2024 as-of scores. Future years are shown only when at least five yearly points exist."
  }
];

const LIMITATIONS = [
  {
    title: "Ecological fallacy",
    body: "State-level safety, health and income are inherited by cities. A city score can hide wide ward-level inequality."
  },
  {
    title: "Linear projections",
    body: "Historical slopes assume continuity. Structural breaks, policy shocks or new data series can invalidate any projection."
  },
  {
    title: "Bound subjectivity",
    body: "Min-max anchors are defensible but not neutral. Changing a bound rescales every score without changing the underlying place."
  },
  {
    title: "Partial cost data",
    body: "Rent affordability exists for six metros only. Comparisons that include cost of living are not exhaustive."
  },
  {
    title: "Mixed source years",
    body: "Air has 2023–24 observations while state safety, health and economy end in 2022. Scores use the latest real value at or before each year and display that source year."
  },
  {
    title: "Ranks are ordinal",
    body: "A two-point gap is rarely meaningful. Use bands and confidence intervals rather than treating rank as precise."
  },
  {
    title: "Tier colors are score bands",
    body: "High, Moderate and Developing map colors are fixed composite-score thresholds, not K-Means cluster assignments."
  }
];

export default function MethodologyView() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 pb-4 sm:gap-5">
      <div className="surface overflow-hidden">
        <div className="border-b border-slate-800/70 bg-gradient-to-r from-cyan-500/10 via-transparent to-purple-500/10 p-5 sm:p-7">
          <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-cyan-400">
            <BookOpen size={14} />
            Modules M5 & M11 documentation
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
            Methodology, Normalization & Ethics
          </h1>
          <p className="mt-2 max-w-2xl text-xs leading-relaxed text-slate-400 sm:text-sm">
            Full algorithmic transparency: formulas, calibration bounds, source registries and an honest
            appraisal of what this index can and cannot tell you.
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {[
              `${DATA_COVERAGE.counts.places} places`,
              `${DATA_COVERAGE.counts.factorRows} factor rows`,
              "0–100 normalization",
              "latest-as-of years",
              "OLS projection"
            ].map(chip => (
              <span
                key={chip}
                className="rounded-full border border-slate-700/80 bg-slate-950/50 px-2 py-0.5 text-[9px] font-semibold text-slate-400"
              >
                {chip}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="surface p-4 sm:p-5">
        <div className="mb-3 flex items-center gap-2">
          <Scale className="text-emerald-400" size={17} />
          <h2 className="text-sm font-bold text-white">Mathematical formulations</h2>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-slate-800/80 bg-slate-950/50 p-3.5">
            <span className="eyebrow">Composite livability</span>
            <div className="mt-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 font-mono text-xs font-bold text-emerald-300">
              S = Σ (wᵢ × Scoreᵢ) / Σ wᵢ
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-slate-400">
              Weighted factors are bounded in [0, 100]. If every weight is zero, no composite is produced and
              places stay unranked until at least one positive weight is set.
            </p>
          </div>

          <div className="rounded-xl border border-slate-800/80 bg-slate-950/50 p-3.5">
            <span className="eyebrow">Directional min-max</span>
            <div className="mt-1.5 space-y-1 rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-3 font-mono text-[10px] font-bold text-cyan-300">
              <div>Lower is better: (U − x) / (U − L) × 100</div>
              <div>Higher is better: (x − L) / (U − L) × 100</div>
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-slate-400">
              Undesirable indicators such as PM2.5, crime and infant mortality scale inversely so 100 always
              represents the optimal end of the observed range.
            </p>
          </div>

          <div className="rounded-xl border border-slate-800/80 bg-slate-950/50 p-3.5">
            <span className="eyebrow">Temporal projection</span>
            <div className="mt-1.5 rounded-lg border border-purple-500/20 bg-purple-500/5 p-3 font-mono text-xs font-bold text-purple-300">
              Sᵧ = clip(S₂₀₂₄ + β × (y − 2024), 0, 100)
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-slate-400">
              One OLS slope is estimated from the place&apos;s 2015–2024 composite under the current weights.
              The 2024 observed score is the projection anchor, and the underlying source values are never altered.
            </p>
          </div>

          <div className="rounded-xl border border-slate-800/80 bg-slate-950/50 p-3.5">
            <span className="eyebrow">Uncertainty band</span>
            <div className="mt-1.5 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 font-mono text-xs font-bold text-amber-300">
              CI₉₅ = Sᵧ ± 1.96 × SE × √(1 + h)
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-slate-400">
              The approximate band widens with horizon and residual variance. Places with fewer than five
              yearly points receive no projection instead of an invented confidence interval.
            </p>
          </div>
        </div>
      </div>

      <div className="surface p-4 sm:p-5">
        <div className="mb-3 flex items-center gap-2">
          <GitBranch size={17} className="text-purple-400" />
          <h2 className="text-sm font-bold text-white">Scoring pipeline</h2>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {PIPELINE.map((step, index) => (
            <div key={step.title} className="rounded-xl border border-slate-800/80 bg-slate-950/40 p-3">
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/15 font-mono text-[9px] font-bold text-emerald-300">
                  {index + 1}
                </span>
                <span className="text-xs font-bold text-white">{step.title}</span>
              </div>
              <p className="mt-1.5 text-[10px] leading-relaxed text-slate-400">{step.body}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="surface p-4 sm:p-5">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Database className="text-amber-400" size={17} />
            <h2 className="text-sm font-bold text-white">Indicator bounds & calibration</h2>
          </div>
          <span className="text-[9px] text-slate-500">M5.1</span>
        </div>

        <div className="custom-scrollbar overflow-x-auto">
          <table className="w-full min-w-[540px] border-collapse text-left text-[11px]">
            <thead>
              <tr className="border-b border-slate-800 text-[9px] font-bold uppercase tracking-wider text-slate-500">
                <th className="px-2 py-2">Pillar</th>
                <th className="px-2 py-2">Observed range</th>
                <th className="px-2 py-2">Direction</th>
                <th className="px-2 py-2">Source authority</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {METHODOLOGY_DETAILS.bounds.map(item => (
                <tr key={item.factor} className="transition-colors hover:bg-slate-800/25">
                  <td className="px-2 py-2.5 font-semibold text-white">{item.factor}</td>
                  <td className="px-2 py-2.5 font-mono text-cyan-300">{item.bounds}</td>
                  <td className="px-2 py-2.5 text-slate-300">{item.direction}</td>
                  <td className="px-2 py-2.5 text-slate-400">{item.source}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-3 flex items-start gap-1.5 rounded-lg border border-slate-800/80 bg-slate-950/40 p-2.5 text-[10px] leading-relaxed text-slate-400">
          <Info size={12} className="mt-0.5 shrink-0 text-cyan-400" />
          Bounds are fixed at design time. Scores are composable and reproducible, but they are relative to
          these anchors rather than absolute physical thresholds.
        </div>
      </div>

      <div className="surface border-cyan-500/20 p-4 sm:p-5">
        <div className="mb-3 flex items-center gap-2">
          <Database size={17} className="text-cyan-400" />
          <div>
            <h2 className="text-sm font-bold text-white">Known data gaps</h2>
            <p className="text-[10px] text-slate-500">
              {DATA_COVERAGE.counts.factorRows} factor rows · {DATA_COVERAGE.counts.inheritedRows} inherited city rows
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          {DATA_GAPS.map(gap => (
            <div
              key={gap}
              className="flex items-start gap-2 rounded-xl border border-slate-800/80 bg-slate-950/40 p-3 text-[10px] leading-relaxed text-slate-400"
            >
              <Info size={12} className="mt-0.5 shrink-0 text-cyan-400" />
              {gap}
            </div>
          ))}
        </div>
      </div>

      <div className="surface p-4 sm:p-5">
        <div className="mb-3 flex items-center gap-2">
          <Layers size={17} className="text-cyan-400" />
          <h2 className="text-sm font-bold text-white">Preset weight distributions</h2>
        </div>

        <div className="custom-scrollbar overflow-x-auto">
          <table className="w-full min-w-[500px] border-collapse text-left text-[11px]">
            <thead>
              <tr className="border-b border-slate-800 text-[9px] font-bold uppercase tracking-wider text-slate-500">
                <th className="px-2 py-2">Preset</th>
                <th className="px-2 py-2 text-center">Air</th>
                <th className="px-2 py-2 text-center">Safety</th>
                <th className="px-2 py-2 text-center">Health</th>
                <th className="px-2 py-2 text-center">Economy</th>
                <th className="px-2 py-2 text-center">Cost</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {PRESETS.map(preset => (
                <tr key={preset.id} className="transition-colors hover:bg-slate-800/25">
                  <td className="px-2 py-2.5 font-semibold text-white">{preset.name}</td>
                  {["air", "safety", "health", "economy", "col"].map(factor => (
                    <td key={factor} className="px-2 py-2.5 text-center font-mono text-slate-300">
                      {preset.weights[factor]}%
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="surface p-4 sm:p-5">
        <div className="mb-3 flex items-center gap-2">
          <ShieldCheck className="text-emerald-400" size={17} />
          <h2 className="text-sm font-bold text-white">Ethical framework</h2>
        </div>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          {METHODOLOGY_DETAILS.ethics.map((ethic, index) => (
            <div
              key={ethic}
              className="flex items-start gap-2 rounded-xl border border-slate-800/80 bg-slate-950/40 p-3 text-[11px] leading-relaxed text-slate-300"
            >
              <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 font-mono text-[8px] font-bold text-emerald-300">
                {index + 1}
              </span>
              {ethic}
            </div>
          ))}
        </div>
      </div>

      <div className="surface border-amber-500/20 p-4 sm:p-5">
        <div className="mb-3 flex items-center gap-2">
          <AlertTriangle className="text-amber-400" size={17} />
          <h2 className="text-sm font-bold text-white">Critical limitations</h2>
        </div>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
          {LIMITATIONS.map(item => (
            <div key={item.title} className="rounded-xl border border-slate-800/80 bg-slate-950/40 p-3">
              <div className="text-[11px] font-bold text-amber-200">{item.title}</div>
              <p className="mt-1 text-[10px] leading-relaxed text-slate-400">{item.body}</p>
            </div>
          ))}
        </div>
      </div>

      <p className="pb-2 text-center text-[10px] text-slate-600">
        Decision support only. Do not use this index for individual property, lending or relocation decisions
        without independent verification.
      </p>
    </div>
  );
}
