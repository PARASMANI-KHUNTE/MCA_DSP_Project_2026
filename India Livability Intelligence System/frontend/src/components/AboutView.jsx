import {
  CheckCircle2,
  Code2,
  Cpu,
  Database,
  ExternalLink,
  FolderGit2,
  GraduationCap,
  Layers,
  MapPin,
} from "lucide-react";
import { DATA_COVERAGE } from "../services/scoringService";

export default function AboutView({ onOpenExplorer, onOpenMethodology }) {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-10 py-4 animate-fade-in sm:py-6">
      {/* Profile Header */}
      <div className="flex flex-col gap-6 rounded-2xl border border-[#E5E5E5] bg-[#FAFAF8] p-6 sm:p-8">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#E5E5E5] bg-white px-3 py-1 text-[11px] font-semibold text-[#666666]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#B51F3B]" />
              MCA 2026 · Data Science Project
            </div>
            <h2 className="mt-3 text-2xl font-extrabold text-[#111111] sm:text-3xl">
              Parasmani Khunte
            </h2>
            <p className="mt-1 text-sm font-medium text-[#666666]">
              MCA Data Science Project
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <a
              href="https://github.com/PARASMANI-KHUNTE/MCA_DSP_Project_2026"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-xl bg-[#111111] px-4 py-2 text-xs font-semibold text-white transition-all hover:bg-[#B51F3B]"
            >
              <FolderGit2 size={14} />
              <span>GitHub Repository</span>
              <ExternalLink size={12} className="text-neutral-400" />
            </a>
          </div>
        </div>

        <p className="text-sm leading-relaxed text-[#555555]">
          A data science project for the Master of Computer Applications curriculum. This build processes local air observations and a rent snapshot into factor-specific views; the source files have not been independently matched to their cited releases, and there is no complete multi-factor index.
        </p>

        <div className="grid grid-cols-1 gap-3 pt-2 sm:grid-cols-3">
          <div className="flex items-center gap-3 rounded-xl border border-[#E5E5E5] bg-white p-3">
            <GraduationCap className="h-5 w-5 shrink-0 text-[#B51F3B]" />
            <div className="min-w-0">
              <span className="block text-[11px] text-[#888888]">Program</span>
              <span className="truncate text-xs font-bold text-[#111111]">Master of Computer Applications</span>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-xl border border-[#E5E5E5] bg-white p-3">
            <MapPin className="h-5 w-5 shrink-0 text-[#B51F3B]" />
            <div className="min-w-0">
              <span className="block text-[11px] text-[#888888]">Spatial Domain</span>
              <span className="truncate text-xs font-bold text-[#111111]">{DATA_COVERAGE.counts.states} states/UTs · {DATA_COVERAGE.counts.cities} cities in place register</span>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-xl border border-[#E5E5E5] bg-white p-3">
            <Cpu className="h-5 w-5 shrink-0 text-[#B51F3B]" />
            <div className="min-w-0">
              <span className="block text-[11px] text-[#888888]">Engine Architecture</span>
              <span className="truncate text-xs font-bold text-[#111111]">Dual: FastAPI + Client Engine</span>
            </div>
          </div>
        </div>
      </div>

      {/* Project Deliverables & Modules */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-bold text-[#111111]">Core Project Architecture</h3>
          <span className="text-xs text-[#888888]">End-to-End Pipeline</span>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-xl border border-[#E5E5E5] bg-white p-5 transition-shadow hover:shadow-sm">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FAFAF8] text-[#B51F3B] border border-[#E5E5E5]">
              <Database size={16} />
            </div>
            <h4 className="mt-3 text-sm font-bold text-[#111111]">1. Ingestion & Harmonization</h4>
            <p className="mt-1.5 text-xs leading-relaxed text-[#666666]">
              Processes the active local PM2.5 and rent files. Safety, health, and economy placeholders were quarantined; remaining local inputs are not independently source-verified.
            </p>
          </div>

          <div className="rounded-xl border border-[#E5E5E5] bg-white p-5 transition-shadow hover:shadow-sm">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FAFAF8] text-[#B51F3B] border border-[#E5E5E5]">
              <Layers size={16} />
            </div>
            <h4 className="mt-3 text-sm font-bold text-[#111111]">2. Scoring & MCDA Modeling</h4>
            <p className="mt-1.5 text-xs leading-relaxed text-[#666666]">
              Direction-aware Min-Max normalization with fixed analyst-selected bounds. The current interface supports separate air and rent rankings, not a complete composite index.
            </p>
          </div>

          <div className="rounded-xl border border-[#E5E5E5] bg-white p-5 transition-shadow hover:shadow-sm">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FAFAF8] text-[#B51F3B] border border-[#E5E5E5]">
              <Code2 size={16} />
            </div>
            <h4 className="mt-3 text-sm font-bold text-[#111111]">3. OLS Projections & ML</h4>
            <p className="mt-1.5 text-xs leading-relaxed text-[#666666]">
              A ten-year air trend is shown only where at least five eligible observations exist. Snapshot rent is never projected; current cluster outputs are not used for findings.
            </p>
          </div>
        </div>
      </div>

      {/* Key Verification & Methodology Integrity */}
      <div className="rounded-2xl border border-[#E5E5E5] bg-white p-6 sm:p-8">
        <h3 className="text-base font-bold text-[#111111]">Methodological Rigor & Data Principles</h3>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#B51F3B]" />
            <div>
              <span className="text-xs font-bold text-[#111111]">Missing Data Stays Visible</span>
              <p className="mt-0.5 text-xs text-[#666666]">
                Places without an observation for a selected factor remain unscored instead of receiving an invented average.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#B51F3B]" />
            <div>
              <span className="text-xs font-bold text-[#111111]">Pipeline Checks</span>
              <p className="mt-0.5 text-xs text-[#666666]">
                Python unit and API checks cover the implemented logic. They do not verify the upstream authenticity of local input files.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#B51F3B]" />
            <div>
              <span className="text-xs font-bold text-[#111111]">Clear Ground-Truth Labeling</span>
              <p className="mt-0.5 text-xs text-[#666666]">
                Air values use their source observation years shown in place details. Forecasts are labeled separately and include a limitations notice.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#B51F3B]" />
            <div>
              <span className="text-xs font-bold text-[#111111]">Transparent Limitations</span>
              <p className="mt-0.5 text-xs text-[#666666]">
                Missing factors and source uncertainty are stated openly; absent observations are not filled with fabricated values.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-[#E5E5E5] pt-4">
          <button
            onClick={onOpenExplorer}
            className="inline-flex items-center gap-2 rounded-xl bg-[#111111] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#B51F3B]"
          >
            Launch Interactive Explorer
          </button>
          <button
            onClick={onOpenMethodology}
            className="inline-flex items-center gap-2 rounded-xl border border-[#E5E5E5] bg-[#FAFAF8] px-4 py-2 text-xs font-semibold text-[#111111] transition-colors hover:bg-white"
          >
            Read Mathematical Formulation
          </button>
        </div>
      </div>
    </div>
  );
}
