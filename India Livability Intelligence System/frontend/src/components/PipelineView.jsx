import React, { useState } from "react";
import { ChevronRight, Download, ExternalLink, FileText, Search, AlertCircle } from "lucide-react";

const PIPELINE_STEPS = [
  {
    id: "00_coverage_check",
    label: "Coverage Check",
    description: "Validates air quality data coverage across cities. Identifies which cities meet the ≥75% day coverage threshold across required years.",
    filename: "00_coverage_check.html",
    icon: Search,
    color: "blue",
    keyOutputs: ["City inclusion flags", "Year coverage matrix", "CPCB/Kaggle source summary"]
  },
  {
    id: "01_data_profiling",
    label: "Data Profiling",
    description: "Generates descriptive statistics, distributions, and quality assessments for each raw data source before cleaning.",
    filename: "01_data_profiling.html",
    icon: FileText,
    color: "purple",
    keyOutputs: ["Per-factor statistics", "Missingness reports", "Outlier detection", "Source-level summaries"]
  },
  {
    id: "02_cleaning_merging",
    label: "Cleaning & Merging",
    description: "Standardizes place names, merges multi-source data, handles missing values, and produces the unified tidy dataset.",
    filename: "02_cleaning_merging.html",
    icon: ChevronRight,
    color: "green",
    keyOutputs: ["factors_tidy.parquet", "places.csv", "Name alias register", "Merge lineage logs"]
  },
  {
    id: "03_statistics_eda",
    label: "Statistics & EDA",
    description: "Runs inferential statistics, hypothesis tests, and exploratory visualizations on the cleaned data.",
    filename: "03_statistics_eda.html",
    icon: FileText,
    color: "orange",
    keyOutputs: ["Correlation matrices", "Regional ANOVA", "PM2.5 distribution fits", "Key findings (findings.md)"]
  },
  {
    id: "04_scoring",
    label: "Scoring Engine",
    description: "Computes 0–100 livability scores using configurable weights, normalization bounds, and partial-data reweighting.",
    filename: "04_scoring.html",
    icon: ChevronRight,
    color: "red",
    keyOutputs: ["scores_wide.csv", "Factor score breakdowns", "Preset comparisons", "Sensitivity analysis (1000 Dirichlet draws)"]
  },
  {
    id: "05_ml_trend_clustering",
    label: "ML, Trends & Clustering",
    description: "Fits linear trends with prediction intervals, runs k-means clustering, and generates tier labels for places.",
    filename: "05_ml_trend_clustering.html",
    icon: AlertCircle,
    color: "indigo",
    keyOutputs: ["trends.csv", "clusters.csv", "Projection intervals", "Tier assignments"]
  }
];

export default function PipelineView() {
  const [expandedStep, setExpandedStep] = useState(null);

  const toggleStep = (id) => {
    setExpandedStep(expandedStep === id ? null : id);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-[#111111]">Data Pipeline Transparency</h1>
        <p className="mt-1 text-[#666666]">
          Each step below shows the complete executed notebook — code, outputs, tables, and visualizations.
          Click any step to expand and view the full report, or open in a new tab.
        </p>
      </div>

      {/* Pipeline Flow Indicator */}
      <div className="relative hidden sm:flex items-center justify-between mb-6">
        {PIPELINE_STEPS.map((step, idx) => (
          <React.Fragment key={step.id}>
            <div className="flex flex-col items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold transition-all ${
                  idx <= expandedStep ? "ring-2 ring-[#B51F3B]" : "opacity-50"
                }`}
                style={{ backgroundColor: `var(--color-${step.color})` }}
              >
                <step.icon size={16} />
              </div>
              <span className="mt-1 text-xs text-center text-[#666666] max-w-[80px]">
                {step.label}
              </span>
            </div>
            {idx < PIPELINE_STEPS.length - 1 && (
              <div className="flex-1 h-1 mx-2 bg-[#E5E5E5]" />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Step Cards */}
      <div className="space-y-4">
        {PIPELINE_STEPS.map((step, idx) => (
          <PipelineStepCard
            key={step.id}
            step={step}
            index={idx}
            isExpanded={expandedStep === step.id}
            onToggle={() => toggleStep(step.id)}
          />
        ))}
      </div>

      {/* Legend */}
      <div className="mt-8 p-4 rounded-xl border border-[#E5E5E5] bg-[#FAFAF8]">
        <h3 className="text-sm font-semibold text-[#111111] mb-2">How to Read This</h3>
        <ul className="text-xs text-[#666666] space-y-1">
          <li>• Each notebook runs end-to-end with the current dataset — what you see is exactly what executed.</li>
          <li>• Tables are interactive (sortable, searchable) in the full HTML view.</li>
          <li>• Figures are embedded as high-resolution PNGs; right-click to save.</li>
          <li>• "Open in New Tab" gives you the full scrollable notebook with all cell outputs.</li>
          <li>• Data freshness: Last pipeline run dates are shown in each notebook's first cell output.</li>
        </ul>
      </div>
    </div>
  );
}

function PipelineStepCard({ step, index, isExpanded, onToggle }) {
  const Icon = step.icon;
  const colorClasses = {
    blue: "bg-blue-100 text-blue-700 border-blue-200",
    purple: "bg-purple-100 text-purple-700 border-purple-200",
    green: "bg-green-100 text-green-700 border-green-200",
    orange: "bg-orange-100 text-orange-700 border-orange-200",
    red: "bg-red-100 text-red-700 border-red-200",
    indigo: "bg-indigo-100 text-indigo-700 border-indigo-200"
  };

  return (
    <div className="rounded-xl border border-[#E5E5E5] bg-white overflow-hidden transition-shadow hover:shadow-md">
      {/* Collapsed Header */}
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-[#FAFAF8] transition-colors"
        aria-expanded={isExpanded}
      >
        <div
          className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${colorClasses[step.color]}`}
        >
          <Icon size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-[#999999]">{String(index + 1).padStart(2, "0")}</span>
            <h3 className="font-semibold text-[#111111] truncate">{step.label}</h3>
          </div>
          <p className="text-sm text-[#666666] truncate">{step.description}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-medium px-2 py-1 rounded-full ${colorClasses[step.color]}`}>
            {step.keyOutputs.length} outputs
          </span>
          <ChevronRight
            size={18}
            className={`text-[#999999] transition-transform ${isExpanded ? "rotate-90" : ""}`}
          />
        </div>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-[#E5E5E5] p-4 bg-[#FAFAF8] animate-slide-down">
          <div className="flex flex-wrap gap-2 mb-3">
            <a
              href={`/pipeline/${step.filename}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-[#111111] rounded-lg hover:bg-[#333333] transition-colors"
            >
              <ExternalLink size={12} />
              Open in New Tab
            </a>
            <a
              href={`/pipeline/${step.filename}`}
              download
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#111111] border border-[#E5E5E5] rounded-lg hover:bg-white transition-colors"
            >
              <Download size={12} />
              Download HTML
            </a>
            <iframe
              src={`/pipeline/${step.filename}`}
              className="flex-1 min-w-[300px] h-[600px] border border-[#E5E5E5] rounded-lg bg-white"
              title={`${step.label} Notebook Output`}
              sandbox="allow-scripts allow-same-origin allow-forms"
            />
          </div>

          {/* Key Outputs */}
          <div className="mt-4">
            <h4 className="text-sm font-semibold text-[#111111] mb-2">Key Outputs</h4>
            <ul className="flex flex-wrap gap-2">
              {step.keyOutputs.map((output, i) => (
                <li key={i} className="text-xs px-2.5 py-1 bg-white border border-[#E5E5E5] rounded text-[#666666]">
                  {output}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}