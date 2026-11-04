import { AlertTriangle, BookOpen, Database, GitBranch, Scale } from "lucide-react";
import { DATA_GAPS, METHODOLOGY_DETAILS } from "../data/methodologyData";
import { DATA_COVERAGE } from "../services/scoringService";

const PIPELINE = [
  {
    title: "Ingest",
    body: "The pipeline loads local historic and enriched air data, longitudinal city cost-of-living estimates, NCRB safety, NFHS-5 health, RBI NSDP, PLFS economy and CPCB water-quality inputs, standardizes place names, and retains missing observations. Their upstream values and licenses remain unverified."
  },
  {
    title: "Normalize",
    body: "Each indicator is rescaled to 0–100 with direction-aware min-max bounds so higher always means better."
  },
  {
    title: "Weight",
    body: "Weights combine only factors with observations. The baseline view supports a five-factor composite when all selected factors are available; earlier years expose each factor at its latest observation at or before that year."
  },
  {
    title: "Project",
    body: "Projections appear only when every weighted factor has at least five directly observed years. Mixed pillar coverage currently disables composite projections; air-only views can still project. Cost of living and water quality are never projected."
  }
];

const LIMITATIONS = [
  {
    title: "Ecological fallacy",
    body: "City-sample means do not describe every neighborhood or monitoring location in a state."
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
    body: "Cost of living exists for 26 matched cities only. Comparisons that include it are not exhaustive."
  },
  {
    title: "Mixed source years",
    body: "Air has historic 2015–2019 and sparse 2025–2026 coverage; safety ends in 2022, health and water quality are 2021 snapshots, and the economy indicators are 2023. City scores inherit the latest state observations."
  },
  {
    title: "Ranks are ordinal",
    body: "A two-point gap is rarely meaningful. Use bands and confidence intervals rather than treating rank as precise."
  },
  {
    title: "Tier colors are score bands",
    body: "The map colors by the live weighted score. Places missing a weighted factor remain unscored rather than receiving a synthetic value."
  }
];

export default function MethodologyView() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 py-4 animate-fade-in sm:py-6">
      {/* Header Banner */}
      <div className="rounded-2xl border border-[#E5E5E5] bg-[#FAFAF8] p-6 sm:p-8">
        <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#B51F3B]">
          <BookOpen size={14} />
          <span>Evaluation Architecture & Rigor</span>
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight text-[#111111] sm:text-3xl">
          Methodology, Normalization & Limitations
        </h1>
        <p className="mt-2 max-w-2xl text-xs leading-relaxed text-[#555555] sm:text-sm">
          Full algorithmic transparency: mathematical equations, calibration thresholds,
          source registries, and limitations behind the livability index.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {[
            `${DATA_COVERAGE.counts.places} places`,
            `${DATA_COVERAGE.counts.factorRows} observations`,
            "0–100 Direction-aware scaling",
            "OLS trend extrapolation",
            "Zero synthetic imputation"
          ].map(chip => (
            <span
              key={chip}
              className="rounded-full border border-[#E5E5E5] bg-white px-2.5 py-0.5 text-xs font-medium text-[#444444]"
            >
              {chip}
            </span>
          ))}
        </div>
      </div>

      {/* Formulations */}
      <div className="rounded-2xl border border-[#E5E5E5] bg-white p-5 sm:p-6">
        <div className="mb-4 flex items-center gap-2">
          <Scale className="text-[#B51F3B]" size={17} />
          <h2 className="text-sm font-bold text-[#111111]">Mathematical Formulations</h2>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-[#E5E5E5] bg-[#FAFAF8] p-4">
            <span className="eyebrow text-[#888888]">Composite Synthesis</span>
            <div className="mt-2 rounded-lg border border-[#E5E5E5] bg-white p-3 font-mono text-xs font-bold text-[#111111]">
              S = Σ (wᵢ × Scoreᵢ) / Σ wᵢ
            </div>
            <p className="mt-2 text-xs leading-relaxed text-[#666666]">
              Weighted factors are bounded in [0, 100]. If all weights are set to 0, no composite is evaluated.
            </p>
          </div>

          <div className="rounded-xl border border-[#E5E5E5] bg-[#FAFAF8] p-4">
            <span className="eyebrow text-[#888888]">Directional Min-Max</span>
            <div className="mt-2 space-y-1 rounded-lg border border-[#E5E5E5] bg-white p-3 font-mono text-xs font-bold text-[#111111]">
              <div>Lower is better: (U − x) / (U − L) × 100</div>
              <div>Higher is better: (x − L) / (U − L) × 100</div>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-[#666666]">
              Pollution, crime, and mortality scale inversely so 100 always denotes optimal livability.
            </p>
          </div>

          <div className="rounded-xl border border-[#E5E5E5] bg-[#FAFAF8] p-4">
            <span className="eyebrow text-[#888888]">Temporal OLS Projection</span>
            <div className="mt-2 rounded-lg border border-[#E5E5E5] bg-white p-3 font-mono text-xs font-bold text-[#111111]">
              Sᵧ = clip(Sₗₐₛₜ + β × (y − yₗₐₛₜ), 0, 100)
            </div>
            <p className="mt-2 text-xs leading-relaxed text-[#666666]">
              Ordinary Least Squares is fitted to eligible active air observations only when a place has at least five points.
            </p>
          </div>

          <div className="rounded-xl border border-[#E5E5E5] bg-[#FAFAF8] p-4">
            <span className="eyebrow text-[#888888]">Uncertainty Horizon</span>
            <div className="mt-2 rounded-lg border border-[#E5E5E5] bg-white p-3 font-mono text-xs font-bold text-[#111111]">
              CI₉₅ = Sᵧ ± t_crit × SE × √(1 + 1/n + (y − ȳ)² / SS_yy)
            </div>
            <p className="mt-2 text-xs leading-relaxed text-[#666666]">
              Standard prediction interval widens with future projection distance and residual variance.
            </p>
          </div>
        </div>
      </div>

      {/* Pipeline Steps */}
      <div className="rounded-2xl border border-[#E5E5E5] bg-white p-5 sm:p-6">
        <div className="mb-4 flex items-center gap-2">
          <GitBranch size={17} className="text-[#B51F3B]" />
          <h2 className="text-sm font-bold text-[#111111]">Pipeline Execution Stages</h2>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {PIPELINE.map((step, index) => (
            <div key={step.title} className="rounded-xl border border-[#E5E5E5] bg-[#FAFAF8] p-3.5">
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#111111] font-mono text-[10px] font-bold text-white">
                  {index + 1}
                </span>
                <span className="text-xs font-bold text-[#111111]">{step.title}</span>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-[#666666]">{step.body}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Calibration Bounds Table */}
      <div className="rounded-2xl border border-[#E5E5E5] bg-white p-5 sm:p-6">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Database className="text-[#B51F3B]" size={17} />
            <h2 className="text-sm font-bold text-[#111111]">Indicator Calibration & Scoring Bounds</h2>
          </div>
          <span className="text-[10px] text-[#888888]">Module M5.1</span>
        </div>

        <div className="custom-scrollbar overflow-x-auto">
          <table className="w-full min-w-[700px] border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-[#E5E5E5] text-[10px] font-bold uppercase tracking-wider text-[#888888]">
                <th className="px-3 py-2.5">Pillar</th>
                <th className="px-3 py-2.5">Calibration Bounds</th>
                <th className="px-3 py-2.5">Direction</th>
                <th className="px-3 py-2.5">Source Authority</th>
                <th className="px-3 py-2.5">Attribution</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E5E5]">
              {METHODOLOGY_DETAILS.bounds.map(item => (
                <tr key={item.factor} className="transition-colors hover:bg-[#FAFAF8]">
                  <td className="px-3 py-2.5 font-bold text-[#111111]">{item.factor}</td>
                  <td className="px-3 py-2.5 font-mono font-semibold text-[#B51F3B]">{item.bounds}</td>
                  <td className="px-3 py-2.5 text-[#555555]">{item.direction}</td>
                  <td className="px-3 py-2.5 text-[#555555]">{item.source}</td>
                  <td className="px-3 py-2.5 text-xs text-[#777777]">{item.license}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Limitations */}
      <div className="rounded-2xl border border-[#E5E5E5] bg-white p-5 sm:p-6">
        <div className="mb-4 flex items-center gap-2">
          <AlertTriangle className="text-amber-600" size={17} />
          <h2 className="text-sm font-bold text-[#111111]">Methodological Constraints & Open Disclosures</h2>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {[
            ...LIMITATIONS,
            ...DATA_GAPS.map((body, index) => ({ title: `Current data gap ${index + 1}`, body }))
          ].map(item => (
            <div key={item.title} className="rounded-xl border border-[#E5E5E5] bg-[#FAFAF8] p-3.5">
              <div className="text-xs font-bold text-[#111111]">{item.title}</div>
              <p className="mt-1.5 text-xs leading-relaxed text-[#666666]">{item.body}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
