import { useState } from "react";
import {
  ArrowRight,
  ArrowLeft,
  Check,
  Compass,
  Layers,
  Sliders,
  TrendingUp
} from "lucide-react";
import Modal from "./Modal";
import { DATA_COVERAGE } from "../services/scoringService";

const TOUR_STEPS = [
  {
    title: "India Livability Intelligence System",
    subtitle: "Evidence-based urban & regional decision analytics",
    icon: Compass,
    description:
      "This system synthesizes official multi-source data across Clean Air (CPCB), Public Safety (NCRB), Healthcare access (NFHS-5), Economy & Employment (RBI/MoSPI), Cost of Living, and Surface Water Quality (CPCB).",
    takeaway: "Explore composite rankings, adjust weight allocations in real time, and inspect ground-truth metrics for any state or city.",
    highlights: [
      `${DATA_COVERAGE.counts.states} states/UTs and ${DATA_COVERAGE.counts.cities} cities monitored across India`,
      "Strict zero-imputation policy with transparent partial scoring",
      "Dynamic real-time reweighting and interactive spatial cartography"
    ]
  },
  {
    title: "Step 1: Tune Your Personal Priorities",
    subtitle: "Custom weight sliders & evaluation presets",
    icon: Sliders,
    description:
      "Select a pre-configured persona preset (e.g. Balanced, Environmental, Family, Career, Student) or manually adjust individual pillar weights with interactive sliders.",
    takeaway: "The real-time portfolio breakdown bar displays your exact percentage allocation across all pillars.",
    highlights: [
      "Dynamic pillar-colored sliders with instant visual feedback",
      "Automatic normalization ensures equitable scoring",
      "One-click scenario testing and quick reset capabilities"
    ]
  },
  {
    title: "Step 2: Read the Interactive Map",
    subtitle: "Spatial analysis across states and cities",
    icon: Layers,
    description:
      "Pan, zoom, and explore geographical patterns across India. Toggle between overall composite scores, individual pillar dimensions, or livability score tiers.",
    takeaway: "Hover over any place for an instant diagnostic preview; click to open the complete deep-dive profile.",
    highlights: [
      "Perceptually uniform color bands from low to high livability",
      "City markers and state polygon choropleth layers",
      "Toggleable city name labels and smooth zoom/reset controls"
    ]
  },
  {
    title: "Step 3: Benchmarking & Comparison",
    subtitle: "Inspect historical records and compare places side-by-side",
    icon: TrendingUp,
    description:
      "Dive into detailed radar breakdowns, observation timelines, and ground-truth source citations. Add up to 3 places to the comparison tray for head-to-head analysis.",
    takeaway: "Use the Comparison tray to benchmark leaders, spot trade-offs, and make informed relocation or policy decisions.",
    highlights: [
      "Ground-truth observation year explicitly listed for every pillar",
      "Historical score tracking and OLS trend rate calculations",
      "Side-by-side comparison modal with category winner highlights"
    ]
  }
];

export default function OnboardingTourModal({ isOpen, onClose }) {
  const [currentStep, setCurrentStep] = useState(0);

  if (!isOpen) return null;

  const step = TOUR_STEPS[currentStep];
  const Icon = step.icon;
  const isFirst = currentStep === 0;
  const isLast = currentStep === TOUR_STEPS.length - 1;

  const handleNext = () => {
    if (isLast) {
      onClose();
    } else {
      setCurrentStep(value => value + 1);
    }
  };

  const handlePrev = () => {
    if (!isFirst) setCurrentStep(value => value - 1);
  };

  return (
    <Modal onClose={onClose} label="System Guide" className="max-w-2xl">
      <div className="flex flex-col gap-6 p-6 sm:p-8">
        {/* Step Indicator Progress */}
        <div className="flex items-center gap-2">
          {TOUR_STEPS.map((item, index) => (
            <button
              key={item.title}
              onClick={() => setCurrentStep(index)}
              className={`h-1.5 flex-1 rounded-full transition-all ${
                index === currentStep
                  ? "bg-[#B51F3B]"
                  : index < currentStep
                  ? "bg-[#111111]"
                  : "bg-[#E5E5E5]"
              }`}
              title={`Go to step ${index + 1}`}
              aria-label={`Step ${index + 1}`}
            />
          ))}
        </div>

        {/* Header */}
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[#E5E5E5] bg-[#FAFAF8] text-[#B51F3B]">
            <Icon size={22} />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#B51F3B]">
              Step {currentStep + 1} of {TOUR_STEPS.length}
            </span>
            <h3 className="text-xl font-extrabold text-[#111111]">{step.title}</h3>
            <p className="mt-0.5 text-xs text-[#666666]">{step.subtitle}</p>
          </div>
        </div>

        {/* Card Body */}
        <div className="rounded-2xl border border-[#E5E5E5] bg-[#FAFAF8] p-5">
          <p className="text-xs sm:text-sm leading-relaxed text-[#444444]">{step.description}</p>

          <div className="my-4 space-y-2">
            {step.highlights.map(highlight => (
              <div key={highlight} className="flex items-start gap-2.5 text-xs font-medium text-[#222222]">
                <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-white border border-[#E5E5E5] text-[#B51F3B]">
                  <Check size={10} />
                </span>
                <span>{highlight}</span>
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-[#E5E5E5] bg-white p-3 text-xs leading-relaxed text-[#555555]">
            <strong className="font-bold text-[#111111]">Key Takeaway:</strong> {step.takeaway}
          </div>
        </div>

        {/* Footer Navigation */}
        <div className="flex items-center justify-between gap-3 pt-1">
          <button
            onClick={onClose}
            className="text-xs font-semibold text-[#888888] hover:text-[#111111] transition-colors"
          >
            Skip Guide
          </button>

          <div className="flex items-center gap-2">
            {!isFirst && (
              <button
                onClick={handlePrev}
                className="flex items-center gap-1.5 rounded-xl border border-[#E5E5E5] bg-white px-4 py-2 text-xs font-semibold text-[#111111] hover:bg-[#FAFAF8] transition-colors"
              >
                <ArrowLeft size={13} /> Back
              </button>
            )}

            <button
              onClick={handleNext}
              className="flex items-center gap-1.5 rounded-xl bg-[#111111] px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#B51F3B] transition-colors"
            >
              <span>{isLast ? "Start Exploring Now" : "Next Step"}</span>
              <ArrowRight size={13} />
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
