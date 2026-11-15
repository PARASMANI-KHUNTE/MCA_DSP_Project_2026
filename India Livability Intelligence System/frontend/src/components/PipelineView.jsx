import React, { useState, useRef } from "react";
import {
  Download,
  ExternalLink,
  FileText,
  Search,
  AlertCircle,
  CheckCircle,
  XCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Database,
  BarChart2,
  Brain,
  Layers,
  GitBranch,
  FileCode,
  Eye,
  Copy,
} from "lucide-react";

const PIPELINE_STEPS = [
  {
    id: "00_coverage_check",
    label: "Coverage Check",
    shortLabel: "Coverage",
    description: "Validates air quality data coverage across cities. Identifies which cities meet the ≥75% day coverage threshold across required years.",
    filename: "00_coverage_check.html",
    icon: Search,
    color: "blue",
    bgColor: "bg-blue-500",
    keyOutputs: [
      { label: "City inclusion flags", icon: CheckCircle },
      { label: "Year coverage matrix", icon: Database },
      { label: "CPCB/Kaggle source summary", icon: FileText },
    ],
    estimatedTime: "~30s",
    status: "complete",
  },
  {
    id: "01_data_profiling",
    label: "Data Profiling",
    shortLabel: "Profiling",
    description: "Generates descriptive statistics, distributions, and quality assessments for each raw data source before cleaning.",
    filename: "01_data_profiling.html",
    icon: BarChart2,
    color: "purple",
    bgColor: "bg-purple-500",
    keyOutputs: [
      { label: "Per-factor statistics", icon: BarChart2 },
      { label: "Missingness reports", icon: AlertCircle },
      { label: "Outlier detection", icon: XCircle },
      { label: "Source-level summaries", icon: FileText },
    ],
    estimatedTime: "~45s",
    status: "complete",
  },
  {
    id: "02_cleaning_merging",
    label: "Cleaning & Merging",
    shortLabel: "Cleaning",
    description: "Standardizes place names, merges multi-source data, handles missing values, and produces the unified tidy dataset.",
    filename: "02_cleaning_merging.html",
    icon: GitBranch,
    color: "green",
    bgColor: "bg-green-500",
    keyOutputs: [
      { label: "factors_tidy.parquet", icon: Database },
      { label: "places.csv", icon: FileText },
      { label: "Name alias register", icon: Layers },
      { label: "Merge lineage logs", icon: FileCode },
    ],
    estimatedTime: "~1m",
    status: "complete",
  },
  {
    id: "03_statistics_eda",
    label: "Statistics & EDA",
    shortLabel: "Statistics",
    description: "Runs inferential statistics, hypothesis tests, and exploratory visualizations on the cleaned data.",
    filename: "03_statistics_eda.html",
    icon: BarChart2,
    color: "orange",
    bgColor: "bg-orange-500",
    keyOutputs: [
      { label: "Correlation matrices", icon: GitBranch },
      { label: "Regional ANOVA", icon: BarChart2 },
      { label: "PM2.5 distribution fits", icon: Sparkles },
      { label: "Key findings (findings.md)", icon: FileText },
    ],
    estimatedTime: "~1m 30s",
    status: "complete",
  },
  {
    id: "04_scoring",
    label: "Scoring Engine",
    shortLabel: "Scoring",
    description: "Computes 0–100 livability scores using configurable weights, normalization bounds, and partial-data reweighting.",
    filename: "04_scoring.html",
    icon: Brain,
    color: "red",
    bgColor: "bg-red-500",
    keyOutputs: [
      { label: "scores_wide.csv", icon: Database },
      { label: "Factor score breakdowns", icon: BarChart2 },
      { label: "Preset comparisons", icon: Layers },
      { label: "Sensitivity analysis (1000 draws)", icon: Sparkles },
    ],
    estimatedTime: "~2m",
    status: "complete",
  },
  {
    id: "05_ml_trend_clustering",
    label: "ML, Trends & Clustering",
    shortLabel: "ML & Trends",
    description: "Fits linear trends with prediction intervals, runs k-means clustering, and generates tier labels for places.",
    filename: "05_ml_trend_clustering.html",
    icon: AlertCircle,
    color: "indigo",
    bgColor: "bg-indigo-500",
    keyOutputs: [
      { label: "trends.csv", icon: Brain },
      { label: "clusters.csv", icon: Layers },
      { label: "Projection intervals", icon: Sparkles },
      { label: "Tier assignments", icon: CheckCircle },
    ],
    estimatedTime: "~2m 30s",
    status: "complete",
  },
];

const STATUS_ICONS = {
  complete: CheckCircle,
  running: Loader2,
  pending: XCircle,
};

const COLOR_MAP = {
  blue: { light: "bg-blue-50 text-blue-700 border-blue-100", main: "bg-blue-500", ring: "ring-blue-500" },
  purple: { light: "bg-purple-50 text-purple-700 border-purple-100", main: "bg-purple-500", ring: "ring-purple-500" },
  green: { light: "bg-green-50 text-green-700 border-green-100", main: "bg-green-500", ring: "ring-green-500" },
  orange: { light: "bg-orange-50 text-orange-700 border-orange-100", main: "bg-orange-500", ring: "ring-orange-500" },
  red: { light: "bg-red-50 text-red-700 border-red-100", main: "bg-red-500", ring: "ring-red-500" },
  indigo: { light: "bg-indigo-50 text-indigo-700 border-indigo-100", main: "bg-indigo-500", ring: "ring-indigo-500" },
};

function StatusDot({ status, size = 8 }) {
  const Icon = STATUS_ICONS[status] || XCircle;
  const colors = {
    complete: "text-green-500",
    running: "text-blue-500 animate-spin",
    pending: "text-gray-300",
  };
  return (
    <Icon
      size={size}
      className={`${colors[status]} flex-shrink-0`}
      aria-label={`Step ${status}`}
    />
  );
}

function PipelineStepCard({ step, index, isExpanded, onToggle }) {
  const Icon = step.icon;
  const colors = COLOR_MAP[step.color];
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const iframeRef = useRef(null);

  const handleIframeLoad = () => setIframeLoaded(true);

  const copyUrl = () => {
    const url = `${window.location.origin}/pipeline/${step.filename}`;
    navigator.clipboard.writeText(url);
  };

  return (
    <div
      className="group rounded-2xl border border-gray-200 bg-white overflow-hidden transition-all duration-300 hover:shadow-lg hover:border-[#D4D4D4]"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {/* Collapsed Header */}
      <button
        onClick={onToggle}
        className="w-full px-5 py-4 flex items-center gap-4 text-left hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-[#B51F3B] focus:ring-offset-2"
        aria-expanded={isExpanded}
        aria-controls={`step-content-${step.id}`}
      >
        {/* Step Number & Status */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="relative">
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${colors.main} shadow-lg`}
            >
              <Icon size={22} className="text-white" aria-hidden="true" />
            </div>
            <StatusDot status={step.status} color={step.color} size={16} className="absolute -bottom-1 -right-1 bg-white p-1 rounded-full" />
          </div>
          <div className="hidden sm:block">
            <span className="text-xs font-mono text-gray-500 font-medium">
              {String(index + 1).padStart(2, "0")}
            </span>
          </div>
        </div>

        {/* Step Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h3 className="font-semibold text-gray-900 truncate flex-1">{step.label}</h3>
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${colors.light}`}>
              {step.keyOutputs.length} outputs
            </span>
            <span className="text-xs text-gray-500 font-mono hidden md:inline">
              {step.estimatedTime}
            </span>
          </div>
          <p className="mt-1 text-sm text-gray-600 line-clamp-2">{step.description}</p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <ChevronDown
            size={20}
            className={`text-gray-500 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
            aria-hidden="true"
          />
        </div>
      </button>

      {/* Expanded Content */}
      <div
        id={`step-content-${step.id}`}
        className={`overflow-hidden transition-all duration-300 ease-out ${
          isExpanded ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"
        }`}
        role="region"
        aria-label={`${step.label} details`}
      >
        <div className="border-t border-gray-200 bg-gradient-to-b from-gray-50 to-white p-5 animate-slide-down">
          {/* Action Bar */}
          <div className="flex flex-wrap items-center gap-3 mb-4 pb-4 border-b border-gray-200">
            <div className="flex flex-wrap items-center gap-2">
              <a
                href={`/pipeline/${step.filename}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-[#111111] rounded-xl hover:bg-[#333333] transition-all duration-200 shadow-sm hover:shadow-md"
              >
                <ExternalLink size={14} />
                <span className="hidden sm:inline">Open in New Tab</span>
              </a>
              <button
                onClick={copyUrl}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-900 border border-gray-200 rounded-xl hover:bg-white hover:border-[#D4D4D4] transition-all duration-200"
                title="Copy notebook URL"
              >
                <Copy size={14} />
                <span className="hidden sm:inline">Copy Link</span>
              </button>
              <a
                href={`/pipeline/${step.filename}`}
                download
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-900 border border-gray-200 rounded-xl hover:bg-white hover:border-[#D4D4D4] transition-all duration-200"
              >
                <Download size={14} />
                <span className="hidden sm:inline">Download HTML</span>
              </a>
            </div>
            <div className="flex-1" />
            <span className={`text-xs font-medium px-3 py-1 rounded-full ${colors.light} flex items-center gap-1`}>
              <StatusDot status={step.status} size={10} />
              <span className="capitalize">{step.status}</span>
            </span>
          </div>

          {/* Key Outputs - Compact */}
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <FileText size={14} className="text-gray-500" />
              Key Outputs
            </h4>
            <div className="flex flex-wrap gap-2">
              {step.keyOutputs.map((output, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-gray-600 hover:border-[#D4D4D4] hover:bg-gray-50 transition-colors"
                >
                  <output.icon size={12} className="text-gray-500" aria-hidden="true" />
                  {output.label}
                </span>
              ))}
            </div>
          </div>

          {/* Notebook Viewer */}
          <div className="relative rounded-xl border border-gray-200 bg-white overflow-hidden">
            {/* Loading State */}
            {!iframeLoaded && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
                <div className="text-center p-8">
                  <Loader2 size={32} className="mx-auto mb-3 text-accent animate-spin" />
                  <p className="text-sm text-gray-600">Loading notebook...</p>
                  <p className="text-xs text-gray-500 mt-1">{step.filename}</p>
                </div>
              </div>
            )}

            <iframe
              ref={iframeRef}
              src={`/pipeline/${step.filename}`}
              className="w-full h-[700px] border-0 bg-white"
              title={`${step.label} Notebook Output`}
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
              onLoad={handleIframeLoad}
              loading="lazy"
              style={{ display: iframeLoaded ? "block" : "none" }}
            />

            {/* Fallback for blocked iframes */}
            <div className="hidden absolute inset-0 flex flex-col items-center justify-center p-8 bg-gray-50 z-20" id={`fallback-${step.id}`}>
              <ExternalLink size={48} className="text-[#D4D4D4] mb-4" />
              <h4 className="text-lg font-semibold text-gray-900 mb-2">Notebook cannot be embedded</h4>
              <p className="text-sm text-gray-600 text-center mb-4 max-w-md">
                Your browser settings may prevent embedding. Use the links above to view the full notebook.
              </p>
              <a
                href={`/pipeline/${step.filename}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-accent rounded-xl hover:bg-accent-hover transition-colors"
              >
                <ExternalLink size={14} />
                Open in New Tab
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PipelineView() {
  const [expandedStep, setExpandedStep] = useState(null);
  const [viewMode, setViewMode] = useState("cards"); // "cards" | "timeline"

  const toggleStep = (id) => {
    setExpandedStep(expandedStep === id ? null : id);
  };

  const expandAll = () => {
    setExpandedStep(PIPELINE_STEPS[PIPELINE_STEPS.length - 1].id);
  };

  const collapseAll = () => {
    setExpandedStep(null);
  };

  const completedCount = PIPELINE_STEPS.filter(s => s.status === "complete").length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
            Data Pipeline Transparency
          </h1>
          <p className="mt-1.5 text-gray-600 max-w-2xl">
            Every step below is a fully executed Jupyter notebook — code, outputs, tables, and visualizations.
            Click to expand, or open in a new tab for the complete scrollable experience.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-green-50 border border-green-100">
            <CheckCircle size={14} className="text-green-600" />
            <span className="text-sm font-medium text-green-700">
              {completedCount} of {PIPELINE_STEPS.length} steps complete
            </span>
          </div>
          <div className="flex items-center gap-1 rounded-xl border border-gray-200 bg-white">
            <button
              onClick={() => setViewMode("cards")}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                viewMode === "cards"
                  ? "bg-[#111111] text-white"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <Layers size={14} className="mr-1" />
              Cards
            </button>
            <button
              onClick={() => setViewMode("timeline")}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                viewMode === "timeline"
                  ? "bg-[#111111] text-white"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <GitBranch size={14} className="mr-1" />
              Timeline
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={expandedStep ? collapseAll : expandAll}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-900 border border-gray-200 rounded-xl hover:bg-white hover:border-[#D4D4D4] transition-colors"
            >
              {expandedStep ? (
                <>
                  <ChevronUp size={14} />
                  Collapse All
                </>
              ) : (
                <>
                  <ChevronDown size={14} />
                  Expand All
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Pipeline Progress Timeline */}
      <div className="relative hidden lg:block mb-8">
        <div className="flex items-start justify-between">
          {PIPELINE_STEPS.map((step, idx) => (
            <React.Fragment key={step.id}>
              <div className="flex flex-col items-center relative z-10">
                {/* Connecting line */}
                {idx > 0 && (
                  <div className="absolute left-0 right-0 top-[28px] h-1.5 bg-[#E5E5E5] -z-10" />
                )}
                {/* Step Circle */}
                <div
                  className={`w-14 h-14 rounded-full flex items-center justify-center text-white font-bold transition-all duration-300 ${
                    step.status === "complete"
                      ? `${COLOR_MAP[step.color].main} ring-4 ring-white shadow-lg`
                      : "bg-gray-200 text-gray-400"
                  }`}
                >
                  {step.status === "complete" ? (
                    <CheckCircle size={22} className="text-white" />
                  ) : (
                    <span className="text-xs font-mono">{String(idx + 1).padStart(2, "0")}</span>
                  )}
                </div>
                {/* Labels */}
                <div className="mt-2 text-center w-32">
                  <p className="text-xs font-semibold text-gray-900 truncate">{step.shortLabel}</p>
                  <p className="text-[10px] text-gray-500">{step.estimatedTime}</p>
                </div>
              </div>
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Mobile Timeline */}
      <div className="lg:hidden mb-6 space-y-3">
        {PIPELINE_STEPS.map((step, idx) => (
          <div
            key={step.id}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors ${
              step.status === "complete"
                ? "bg-green-50 border-green-100"
                : "bg-white border-gray-200"
            }`}
          >
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                step.status === "complete"
                  ? `${COLOR_MAP[step.color].main} text-white`
                  : "bg-gray-100 text-gray-400"
              }`}
            >
              {step.status === "complete" ? (
                <CheckCircle size={18} />
              ) : (
                <span className="text-xs font-mono">{String(idx + 1).padStart(2, "0")}</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm text-gray-900 truncate">{step.label}</p>
              <p className="text-xs text-gray-600">{step.estimatedTime}</p>
            </div>
            <StatusDot status={step.status} size={16} />
          </div>
        ))}
      </div>

      {/* Step Cards */}
      <div className="space-y-4" role="list" aria-label="Pipeline steps">
        {PIPELINE_STEPS.map((step, idx) => (
          <PipelineStepCard
            key={step.id}
            step={step}
            index={idx}
            isExpanded={expandedStep === step.id}
            onToggle={() => toggleStep(step.id)}
            totalSteps={PIPELINE_STEPS.length}
          />
        ))}
      </div>

      {/* Footer Info */}
      <div className="mt-10 p-5 rounded-2xl border border-gray-200 bg-gradient-to-r from-gray-50 to-white">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <Sparkles size={18} className="text-accent" />
              How to Use This
            </h4>
            <ul className="text-sm text-gray-600 space-y-1.5">
              <li className="flex items-start gap-2">{"•"} Click any step to expand and explore the full notebook</li>
              <li className="flex items-start gap-2">{"•"} "Open in New Tab" for the complete scrollable experience with interactive tables</li>
              <li className="flex items-start gap-2">{"•"} Download HTML to save locally or share with collaborators</li>
              <li className="flex items-start gap-2">{"•"} Green checkmarks indicate successfully completed steps</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <Eye size={18} className="text-accent" />
              What You'll See
            </h4>
            <ul className="text-sm text-gray-600 space-y-1.5">
              <li className="flex items-start gap-2">{"•"} Raw code cells with syntax highlighting</li>
              <li className="flex items-start gap-2">{"•"} All outputs: tables, plots, statistics, warnings</li>
              <li className="flex items-start gap-2">{"•"} High-resolution figures (right-click to save)</li>
              <li className="flex items-start gap-2">{"•"} Execution timestamps showing data freshness</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <FileCode size={18} className="text-accent" />
              Reproducibility
            </h4>
            <ul className="text-sm text-gray-600 space-y-1.5">
              <li className="flex items-start gap-2">{"•"} Each notebook runs end-to-end on the current dataset</li>
              <li className="flex items-start gap-2">{"•"} What you see is exactly what executed — no hidden steps</li>
              <li className="flex items-start gap-2">{"•"} Source data, parameters, and random seeds are all visible</li>
              <li className="flex items-start gap-2">{"•"} Regenerate anytime: run notebooks locally with the same inputs</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}