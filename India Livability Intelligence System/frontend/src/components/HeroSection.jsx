import { useState } from "react";
import { ArrowRight, Check, Code2, Copy, ExternalLink } from "lucide-react";

const CODE_SNIPPET = `# src/scoring/scoring.py
def normalize_value(x, lo, hi, direction):
    if hi == lo:
        return 50.0

    x_clipped = float(np.clip(x, lo, hi))
    if direction == "higher_is_better":
        return 100.0 * (x_clipped - lo) / (hi - lo)
    if direction == "lower_is_better":
        return 100.0 * (hi - x_clipped) / (hi - lo)
    raise ValueError(f"Unknown direction: {direction!r}")`;

export default function HeroSection({ onExplore, onOpenMethodology }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(CODE_SNIPPET);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section className="relative border-b border-[#E5E5E5] pb-8 pt-2 sm:pb-12 sm:pt-4">
      <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-12 lg:gap-12">
        {/* Left Column: Developer Profile & Statement */}
        <div className="flex flex-col lg:col-span-6 xl:col-span-7">
          {/* Eyebrow badge */}
          <div className="mb-4 inline-flex items-center gap-2 self-start rounded-full border border-[#E5E5E5] bg-[#FAFAF8] px-3 py-1 text-[11px] font-medium text-[#666666]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#B51F3B]" />
            <span>MCA Data Science Project · 2026</span>
          </div>

          {/* Heading */}
          <h1 className="text-3xl font-extrabold tracking-tight text-[#111111] sm:text-4xl lg:text-5xl">
            Parasmani Khunte
            <span className="mt-1 block text-lg font-normal tracking-normal text-[#666666] sm:text-xl lg:text-2xl">
              MCA Data Science Project
            </span>
          </h1>

          {/* Editorial Philosophy / Intro */}
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-[#555555] sm:text-base">
            Building a data pipeline and interactive map to explore the local PM2.5 observations and rent snapshot available in this project. Scores are limited to supported factors, and current files are not source-verified.
          </p>

          {/* CTAs */}
          <div className="mt-6 flex flex-wrap items-center gap-3 sm:gap-4">
            <button
              onClick={onExplore}
              className="group inline-flex items-center gap-2 rounded-xl bg-[#111111] px-5 py-2.5 text-xs font-semibold text-white shadow-sm transition-all hover:bg-[#B51F3B] hover:shadow-md"
            >
              <span>Explore Decision System</span>
              <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
            </button>

            <button
              onClick={onOpenMethodology}
              className="inline-flex items-center gap-2 rounded-xl border border-[#E5E5E5] bg-white px-4 py-2.5 text-xs font-semibold text-[#111111] transition-colors hover:border-[#D4D4D4] hover:bg-[#FAFAF8]"
            >
              <span>Methodology & Bounds</span>
            </button>

            <a
              href="https://github.com/PARASMANI-KHUNTE/MCA_DSP_Project_2026"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[#666666] transition-colors hover:text-[#111111]"
            >
              <Code2 size={14} />
              <span>Source Repository</span>
              <ExternalLink size={12} className="text-[#999999]" />
            </a>
          </div>
        </div>

        {/* Right Column: Realistic Code Editor Panel */}
        <div className="lg:col-span-6 xl:col-span-5">
          <div className="overflow-hidden rounded-2xl border border-[#E5E5E5] bg-[#18181B] text-neutral-100 shadow-[0_12px_36px_-12px_rgba(0,0,0,0.15)]">
            {/* Window Top Bar */}
            <div className="flex items-center justify-between border-b border-neutral-800 bg-[#121214] px-4 py-2.5">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-[#EF4444]/80 inline-block" />
                <span className="h-3 w-3 rounded-full bg-[#F59E0B]/80 inline-block" />
                <span className="h-3 w-3 rounded-full bg-[#10B981]/80 inline-block" />
                <span className="ml-2 font-mono text-[11px] text-neutral-400">src/scoring/scoring.py</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded bg-neutral-800/80 px-2 py-0.5 font-mono text-[10px] text-neutral-400">
                  Python
                </span>
                <button
                  onClick={handleCopy}
                  className="rounded p-1 text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-white"
                  title="Copy code snippet"
                  aria-label="Copy code"
                >
                  {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                </button>
              </div>
            </div>

            {/* Code Content */}
            <div className="custom-scrollbar overflow-x-auto p-4 font-mono text-[11.5px] leading-relaxed text-neutral-300">
              <pre className="selection:bg-[#B51F3B]/30 whitespace-pre"><code>{CODE_SNIPPET}</code></pre>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
