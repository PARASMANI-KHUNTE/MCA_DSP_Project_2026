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

const TOUR_STEPS = [
  {
    title: "Welcome to India Livability Intelligence",
    subtitle: "A transparent spatial decision system built from published Indian statistics",
    icon: Compass,
    accent: "from-emerald-500 to-cyan-500",
    description:
      "The interface turns official CPCB air monitoring, NCRB crime records, SRS health bulletins, RBI state accounts, MoSPI labour data and a six-city rent snapshot into a comparable livability index. It does not invent values when a source is missing.",
    takeaway: "You choose the priorities. The ranking recalculates immediately from the processed source tables.",
    highlights: [
      "61 places: 32 states and union territories plus 29 major cities",
      "Observed factor data spans 2015–2024, with each factor's latest source year shown",
      "OLS projections run to 2034 and are hidden when fewer than five observations exist"
    ]
  },
  {
    title: "Step 1: Tune Your Personal Priorities",
    subtitle: "Use the left panel sliders or choose a ready-made persona preset",
    icon: Sliders,
    accent: "from-cyan-500 to-blue-500",
    description:
      "A young family may prioritize healthcare and safety, while a remote worker may care most about clean air and cost. Adjust the five factor weights or pick a preset. Every weight set is normalized before scoring.",
    takeaway: "The weights normalize to 100%. A zero-weight factor is excluded instead of being replaced with a neutral value.",
    highlights: [
      "Clean Air: city PM2.5 observations from CPCB and the urban monitor series",
      "Public Safety: state IPC crime rate per lakh population",
      "Healthcare: state infant mortality rate per 1,000 live births",
      "Economy & Jobs: state NSDP per capita plus unemployment",
      "Cost of Living: 2022 rent affordability for six metros only"
    ]
  },
  {
    title: "Step 2: Read the Interactive Map",
    subtitle: "Watch the map recolor instantly as priorities and years change",
    icon: Layers,
    accent: "from-amber-500 to-emerald-500",
    description:
      "The central map shows state boundaries and city pins. Pan and zoom, then switch between composite scores, individual factors, or score-band tiers. Pin sizes are fixed because population is not part of the processed dataset.",
    takeaway: "Hover for a summary; click to open the place file with source years and available factors.",
    highlights: [
      "Color modes: Composite score, individual pillars, or score-band tiers",
      "Tier colors use live score bands, not the inconsistent stored cluster assignments",
      "City factors inherited from the surrounding state are labelled in the detail view"
    ]
  },
  {
    title: "Step 3: Inspect Projections and Compare",
    subtitle: "Open any place to see observed history, source years and the OLS outlook",
    icon: TrendingUp,
    accent: "from-purple-500 to-pink-500",
    description:
      "Scores for 2015–2024 use the latest real observation at or before each year. Future values are linear OLS projections anchored at the 2024 observed composite, with approximate 95% intervals. Places without enough yearly points show an insufficient-data state.",
    takeaway: "Check the compare box to stage up to three places for head-to-head comparison.",
    highlights: [
      "Observed history plus OLS projection where at least five yearly points exist",
      "Latest-source-year labels for safety, health, economy and cost",
      "Side-by-side radar charts and metric deltas in the comparison tray"
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
    <Modal isOpen={isOpen} onClose={onClose} title="How to Use the System" maxWidth="max-w-2xl">
      <div className="flex flex-col gap-6 p-1">
        <div className="flex items-center gap-2">
          {TOUR_STEPS.map((item, index) => (
            <button
              key={item.title}
              onClick={() => setCurrentStep(index)}
              className={`h-1.5 flex-1 rounded-full transition-all ${
                index === currentStep
                  ? "bg-gradient-to-r from-emerald-400 to-cyan-400 shadow-sm shadow-emerald-500/30"
                  : index < currentStep
                  ? "bg-emerald-500/50"
                  : "bg-slate-800"
              }`}
              title={`Go to step ${index + 1}`}
              aria-label={`Step ${index + 1}`}
            />
          ))}
        </div>

        <div className="flex items-start gap-4">
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${step.accent} text-slate-950 shadow-lg shadow-emerald-500/20`}
          >
            <Icon size={24} />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
              Step {currentStep + 1} of {TOUR_STEPS.length}
            </span>
            <h3 className="text-lg font-black tracking-tight text-white sm:text-xl">{step.title}</h3>
            <p className="text-xs font-medium text-slate-400">{step.subtitle}</p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4 sm:p-5">
          <p className="text-sm leading-relaxed text-slate-300">{step.description}</p>

          <div className="my-4 space-y-2">
            {step.highlights.map(highlight => (
              <div key={highlight} className="flex items-start gap-2 text-xs font-semibold text-slate-200">
                <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-300">
                  <Check size={10} />
                </span>
                <span>{highlight}</span>
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-xs font-medium text-emerald-300">
            <strong className="font-semibold text-white">Pro tip:</strong> {step.takeaway}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 pt-2">
          <button
            onClick={onClose}
            className="text-xs font-semibold text-slate-500 transition-colors hover:text-slate-300"
          >
            Skip walkthrough
          </button>

          <div className="flex items-center gap-2">
            {!isFirst && (
              <button
                onClick={handlePrev}
                className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900/80 px-4 py-2.5 text-xs font-bold text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
              >
                <ArrowLeft size={14} /> Back
              </button>
            )}

            <button
              onClick={handleNext}
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 px-5 py-2.5 text-xs font-bold text-slate-950 shadow-lg shadow-emerald-500/20 transition-transform hover:scale-[1.02] active:scale-[0.98]"
            >
              {isLast ? "Start Exploring Now" : "Next Step"}
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
