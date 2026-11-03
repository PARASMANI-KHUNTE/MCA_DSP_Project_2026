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
    subtitle: "A local data preview with clear coverage limits",
    icon: Compass,
    description:
      "The active files provide local air observations and a rent snapshot. Their exact publisher versions and reuse terms have not been independently confirmed. Safety, health, and economy tables were quarantined as generated placeholders.",
    takeaway: "Use the separate air or rent ranking as an exploratory view; the current data cannot support a composite livability index.",
    highlights: [
      `${DATA_COVERAGE.counts.states} states/UTs and ${DATA_COVERAGE.counts.cities} cities are listed; observations cover only a subset`,
      "Air observations cover 2015–2019 for matched cities and derived state means",
      "Rent is a six-city snapshot; it is not trended"
    ]
  },
  {
    title: "Step 1: Tune Your Personal Priorities",
    subtitle: "Choose an available factor ranking",
    icon: Sliders,
    description:
      "Select air quality or rent affordability. Factors without active observations are disabled. Combining factors with different years or populations can limit what places are comparable.",
    takeaway: "The current presets choose one observed factor at a time.",
    highlights: [
      "Air quality: locally supplied PM2.5 series · upstream source unverified",
      "Rent affordability: six-city local snapshot · upstream source unverified",
      "Safety, health, and economy: unavailable"
    ]
  },
  {
    title: "Step 2: Read the Interactive Map",
    subtitle: "View colors for the selected available factor",
    icon: Layers,
    description:
      "The map shows state shapes and city markers. Pan and zoom it, search places in Rankings, and select a factor in the map controls. Unobserved places stay unscored.",
    takeaway: "Hover over any place for an instant diagnostic preview; click to open the deep-dive profile.",
    highlights: [
      "Map colors are based on the selected factor score",
      "Lower PM2.5 and lower rent map to higher affordability/air scores under configured bounds",
      "The current app does not show composite-score or cluster colors"
    ]
  },
  {
    title: "Step 3: Inspect Projections and Compare",
    subtitle: "Open a place for its factor values and available history",
    icon: TrendingUp,
    description:
      "Air trends are fitted only where at least five eligible yearly observations exist. Their ten-year intervals are simple extrapolations from the local series, not predictions. Rent has no trend.",
    takeaway: "Add up to three places to the comparison tray to perform head-to-head benchmarking.",
    highlights: [
      "Source year is shown for each available factor value",
      "Trend chart appears only when enough eligible air years exist",
      "Comparison tray supports two or three places"
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
