import React, { useState, useMemo, useCallback } from "react";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BarChart2,
  Brain,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Code2,
  Copy,
  Database,
  Download,
  ExternalLink,
  Eye,
  FileCode,
  FileText,
  GitBranch,
  Layers,
  Loader2,
  Maximize2,
  Minimize2,
  Search,
  Sparkles,
  Table,
  X
} from "lucide-react";

const PIPELINE_STEPS = [
  {
    id: "00_coverage_check",
    stepNumber: "01",
    label: "Coverage Check",
    shortLabel: "Coverage",
    category: "prep",
    categoryLabel: "Data Ingestion",
    description: "Validates ambient air quality monitoring coverage across Indian cities. Verifies which monitoring stations achieve the strict ≥75% day coverage threshold across required evaluation years.",
    filename: "00_coverage_check.html",
    icon: Search,
    color: "blue",
    bgColor: "bg-blue-500",
    estimatedTime: "~30s",
    status: "complete",
    inputs: [
      { name: "CPCB Station Daily PM2.5 Observations", source: "CPCB / National Air Monitoring Programme" },
      { name: "Historical City-Day Observations (2015–2020)", source: "Kaggle CPCB Archive" },
    ],
    keyOutputs: [
      { label: "Station inclusion flags", icon: CheckCircle, file: null, desc: "Binary filter for cities meeting coverage criteria" },
      { label: "Year coverage matrix", icon: Database, file: null, desc: "City × Year day-observation percentages" },
      { label: "CPCB source summary", icon: FileText, file: null, desc: "Provenance verification of ambient station feeds" },
    ],
    methodology: {
      title: "Threshold Verification Formula",
      formula: "Coverage\\% = \\frac{\\text{Days with Valid } PM_{2.5} \\text{ Reading}}{365} \\times 100 \\ge 75\\%",
      explanation: "Cities with sparse or intermittent sensor uptime (<75% valid days in an observation year) are disqualified from time-series trend fitting to prevent sample distortion."
    }
  },
  {
    id: "01_data_profiling",
    stepNumber: "02",
    label: "Data Profiling",
    shortLabel: "Profiling",
    category: "prep",
    categoryLabel: "Data Profiling",
    description: "Executes deep descriptive statistics, distribution fits, missingness matrices, and outlier anomaly detection for all raw data inputs before merging.",
    filename: "01_data_profiling.html",
    icon: BarChart2,
    color: "purple",
    bgColor: "bg-purple-500",
    estimatedTime: "~45s",
    status: "complete",
    inputs: [
      { name: "Raw Multi-Sector Indicator Tables", source: "NCRB (Safety), NFHS-5 (Health), RBI & MoSPI (Economy)" },
      { name: "CPCB Water Quality Snapshot", source: "CPCB Water Bodies Report (2021)" },
    ],
    keyOutputs: [
      { label: "Per-factor statistics", icon: BarChart2, file: null, desc: "Mean, median, IQR, skewness, and kurtosis per pillar" },
      { label: "Missingness reports", icon: AlertCircle, file: null, desc: "Null pattern assessment across all 61 jurisdictions" },
      { label: "Outlier detection log", icon: Table, file: null, desc: "1.5× IQR boundary violations flagged with zero deletion" },
      { label: "Source-level summaries", icon: FileText, file: null, desc: "Record counts and schema definitions per published table" },
    ],
    methodology: {
      title: "Interquartile Range Outlier Rule",
      formula: "[Q_1 - 1.5 \\times IQR, \\; Q_3 + 1.5 \\times IQR]",
      explanation: "All outliers are logged to an audit register (`outlier_log.csv`). To uphold the zero-imputation policy, real-world extreme values (such as Delhi winter PM2.5 peaks) are retained and flagged rather than artificially trimmed."
    }
  },
  {
    id: "02_cleaning_merging",
    stepNumber: "03",
    label: "Cleaning & Merging",
    shortLabel: "Cleaning",
    category: "prep",
    categoryLabel: "Data Preparation",
    description: "Standardizes place names across disparate government spellings, merges multi-source indicators into a unified tidy format, and registers official ISO state codes.",
    filename: "02_cleaning_merging.html",
    icon: GitBranch,
    color: "green",
    bgColor: "bg-green-500",
    estimatedTime: "~1m",
    status: "complete",
    inputs: [
      { name: "Profiled Indicator Tables", source: "Stage 01 Cleaned Outputs" },
      { name: "Standardized Name Aliases Register", source: "name_aliases.csv" },
    ],
    keyOutputs: [
      { label: "places.csv", icon: FileText, file: "/data/places.csv", desc: "61 master places (32 states/UTs, 29 major cities) with lat/lng" },
      { label: "factors_wide.csv", icon: Database, file: "/data/factors_wide.csv", desc: "Longitudinal matrix of indicator observations (643 rows)" },
      { label: "Name alias register", icon: Layers, file: null, desc: "Deterministic mapping resolving spelling variations" },
      { label: "Merge lineage logs", icon: FileCode, file: null, desc: "Audit trace connecting every row to its published agency source" },
    ],
    methodology: {
      title: "Canonical Geographic Harmonization",
      formula: "\\text{Place ID} = \\text{ISO-3166-2:IN} + \\text{State Code} + \\text{City Code}",
      explanation: "Resolves conflicting state and city names (e.g. 'Bangalore' vs 'Bengaluru', 'Prayagraj' vs 'Allahabad') using a verified one-to-one alias dictionary to ensure unambiguous joins."
    }
  },
  {
    id: "03_statistics_eda",
    stepNumber: "04",
    label: "Statistics & EDA",
    shortLabel: "Statistics",
    category: "analysis",
    categoryLabel: "Statistical Analysis",
    description: "Performs inferential hypothesis testing, One-Way Regional ANOVA, Pearson correlation analyses, and generates the formal statistical findings report.",
    filename: "03_statistics_eda.html",
    icon: BarChart2,
    color: "orange",
    bgColor: "bg-orange-500",
    estimatedTime: "~1m 30s",
    status: "complete",
    inputs: [
      { name: "Harmonized Wide Factors Dataset", source: "factors_wide.csv" },
      { name: "Geographic Hierarchy Metadata", source: "places.csv" },
    ],
    keyOutputs: [
      { label: "findings.md", icon: FileText, file: "/data/findings.md", desc: "Complete statistical report with ANOVA and correlation results" },
      { label: "Correlation matrices", icon: GitBranch, file: null, desc: "Cross-pillar Pearson r correlation coefficients" },
      { label: "Regional ANOVA test", icon: BarChart2, file: null, desc: "F = 0.90, p = 0.489 across 60 scored jurisdictions" },
      { label: "Distribution curve fits", icon: Sparkles, file: null, desc: "Log-normal and Gaussian fits for particulate air quality" },
    ],
    methodology: {
      title: "One-Way ANOVA & Pearson Formulation",
      formula: "F = \\frac{MS_{\\text{between}}}{MS_{\\text{within}}}, \\quad r = \\frac{\\sum (x_i - \\bar{x})(y_i - \\bar{y})}{\\sqrt{\\sum (x_i - \\bar{x})^2 \\sum (y_i - \\bar{y})^2}}",
      explanation: "Tests whether regional livability variations (South, West, North, Central, East, Northeast) reflect statistically significant differences or random cross-sectional variation."
    }
  },
  {
    id: "04_scoring",
    stepNumber: "05",
    label: "Scoring Engine",
    shortLabel: "Scoring",
    category: "analysis",
    categoryLabel: "Decision Modeling",
    description: "Computes 0–100 calibrated livability scores using configurable persona weights, directional bounds, and transparent partial-data reweighting without imputation.",
    filename: "04_scoring.html",
    icon: Brain,
    color: "red",
    bgColor: "bg-red-500",
    estimatedTime: "~2m",
    status: "complete",
    inputs: [
      { name: "Multi-Factor Indicator Matrix", source: "factors_wide.csv" },
      { name: "Indicator Calibration Bounds", source: "config/scoring_config.yaml" },
    ],
    keyOutputs: [
      { label: "scores_wide.csv", icon: Database, file: "/data/scores_wide.csv", desc: "Computed 0-100 scores across all places and observed years" },
      { label: "Factor breakdowns", icon: BarChart2, file: null, desc: "Pillar-by-pillar normalized values for every state and city" },
      { label: "Preset comparisons", icon: Layers, file: null, desc: "Composite score stability under alternative persona weights" },
      { label: "Sensitivity analysis", icon: Sparkles, file: null, desc: "1,000 Monte Carlo draws assessing rank confidence intervals" },
    ],
    methodology: {
      title: "Min-Max Directional Rescaling & Proportional Reweighting",
      formula: "S_i = \\begin{cases} \\frac{x - \\text{min}}{\\text{max} - \\text{min}} \\times 100 & \\text{(higher is better)} \\\\[4pt] \\frac{\\text{max} - x}{\\text{max} - \\text{min}} \\times 100 & \\text{(lower is better)} \\end{cases}, \\quad \\text{Score} = \\sum_{i \\in \\text{obs}} \\frac{w_i}{\\sum_{j \\in \\text{obs}} w_j} S_i",
      explanation: "Applies directional polarity (e.g. higher crime rate yields lower safety score). When a city lacks a direct indicator, weights are dynamically re-allocated across observed pillars rather than inventing data."
    }
  },
  {
    id: "05_ml_trend_clustering",
    stepNumber: "06",
    label: "ML, Trends & Clustering",
    shortLabel: "ML & Trends",
    category: "analysis",
    categoryLabel: "Machine Learning",
    description: "Fits longitudinal Ordinary Least Squares (OLS) slope trajectories, runs unsupervised K-Means clustering, and derives analytical livability tiers.",
    filename: "05_ml_trend_clustering.html",
    icon: AlertCircle,
    color: "indigo",
    bgColor: "bg-indigo-500",
    estimatedTime: "~2m 30s",
    status: "complete",
    inputs: [
      { name: "Calibrated Score Time Series", source: "scores_wide.csv" },
      { name: "Jurisdictional Metadata", source: "places.csv" },
    ],
    keyOutputs: [
      { label: "clusters.csv", icon: Layers, file: "/data/clusters.csv", desc: "K-Means cluster assignments (k=2, mean silhouette = 0.581)" },
      { label: "trends.csv", icon: Brain, file: null, desc: "OLS slope rates (pts/yr) and p-value statistical significance" },
      { label: "Tier assignments", icon: CheckCircle, file: null, desc: "Categorical tier mappings based on multi-dimensional performance" },
      { label: "Cluster profile metrics", icon: Sparkles, file: null, desc: "Centroid coordinates across each evaluation dimension" },
    ],
    methodology: {
      title: "OLS Slope & K-Means Optimization",
      formula: "\\beta = \\frac{\\sum (t - \\bar{t})(S_t - \\bar{S})}{\\sum (t - \\bar{t})^2}, \\quad \\arg\\min_C \\sum_{k=1}^K \\sum_{x \\in C_k} \\|x - \\mu_k\\|^2",
      explanation: "OLS fits annual improvement or decline trajectories. K-Means (evaluated across k=2..6) identified k=2 as the optimal silhouette partition (score 0.581), cleanly grouping high-infrastructure vs developing centers."
    }
  },
];

const COLOR_MAP = {
  blue: { light: "bg-blue-50 text-blue-700 border-blue-200", main: "bg-blue-600", dot: "bg-blue-500" },
  purple: { light: "bg-purple-50 text-purple-700 border-purple-200", main: "bg-purple-600", dot: "bg-purple-500" },
  green: { light: "bg-emerald-50 text-emerald-700 border-emerald-200", main: "bg-emerald-600", dot: "bg-emerald-500" },
  orange: { light: "bg-amber-50 text-amber-800 border-amber-200", main: "bg-amber-600", dot: "bg-amber-500" },
  red: { light: "bg-rose-50 text-rose-700 border-rose-200", main: "bg-rose-600", dot: "bg-rose-500" },
  indigo: { light: "bg-indigo-50 text-indigo-700 border-indigo-200", main: "bg-indigo-600", dot: "bg-indigo-500" },
};

function NotebookIframe({ step }) {
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const handleLoad = useCallback(() => {
    setLoaded(true);
  }, []);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setLoadError(true);
    }, 8000);
    return () => clearTimeout(timer);
  }, []);

  const copyUrl = () => {
    const url = `${window.location.origin}/pipeline/${step.filename}`;
    navigator.clipboard.writeText(url);
  };

  return (
    <div className={`relative flex flex-col rounded-xl border border-[#E5E5E5] bg-white overflow-hidden shadow-xs ${
      isFullscreen ? "fixed inset-4 z-[9999] shadow-2xl" : ""
    }`}>
      {/* Notebook Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E5E5E5] bg-[#FAFAF8] px-3.5 py-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-[#111111]">
          <Code2 size={14} className="text-[#B51F3B]" />
          <span className="font-mono text-[11px] text-[#666666]">{step.filename}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <a
            href={`/pipeline/${step.filename}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-lg border border-[#E5E5E5] bg-white px-2.5 py-1 text-xs font-semibold text-[#111111] transition-colors hover:border-[#D4D4D4] hover:bg-[#FAFAF8]"
            title="Open in new browser tab"
          >
            <ExternalLink size={12} />
            <span className="hidden sm:inline">New Tab</span>
          </a>
          <button
            onClick={copyUrl}
            className="inline-flex items-center gap-1 rounded-lg border border-[#E5E5E5] bg-white px-2.5 py-1 text-xs font-semibold text-[#111111] transition-colors hover:border-[#D4D4D4] hover:bg-[#FAFAF8]"
            title="Copy URL to clipboard"
          >
            <Copy size={12} />
            <span className="hidden sm:inline">Copy Link</span>
          </button>
          <a
            href={`/pipeline/${step.filename}`}
            download={step.filename}
            className="inline-flex items-center gap-1 rounded-lg border border-[#E5E5E5] bg-white px-2.5 py-1 text-xs font-semibold text-[#111111] transition-colors hover:border-[#D4D4D4] hover:bg-[#FAFAF8]"
            title="Download full HTML output"
          >
            <Download size={12} />
            <span className="hidden sm:inline">Download</span>
          </a>
          <button
            onClick={() => setIsFullscreen(v => !v)}
            className="inline-flex items-center gap-1 rounded-lg border border-[#E5E5E5] bg-white px-2.5 py-1 text-xs font-semibold text-[#111111] transition-colors hover:border-[#D4D4D4] hover:bg-[#FAFAF8]"
            title={isFullscreen ? "Exit fullscreen" : "Expand to fullscreen"}
          >
            {isFullscreen ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
            <span className="hidden sm:inline">{isFullscreen ? "Exit" : "Expand"}</span>
          </button>
        </div>
      </div>

      {/* Frame Container */}
      <div className="relative w-full flex-1 min-h-[500px]">
        {!loaded && !loadError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/90 z-10 p-6 text-center">
            <Loader2 size={32} className="text-[#B51F3B] animate-spin mb-3" />
            <p className="text-xs font-bold text-[#111111]">Loading interactive notebook...</p>
            <p className="text-[11px] text-[#777777] mt-0.5">Parsing outputs, charts, and execution tables</p>
          </div>
        )}

        {loadError && !loaded && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#FAFAF8] z-10 p-6 text-center">
            <AlertCircle size={36} className="text-amber-600 mb-2" />
            <p className="text-sm font-bold text-[#111111]">Notebook display preview</p>
            <p className="text-xs text-[#666666] max-w-md mt-1 mb-4">
              Your browser may restrict iframe embedding for local files. Click below to view the full notebook in a new tab.
            </p>
            <a
              href={`/pipeline/${step.filename}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl bg-[#111111] px-4 py-2 text-xs font-bold text-white hover:bg-[#333333]"
            >
              <ExternalLink size={13} />
              Open Notebook in New Tab
            </a>
          </div>
        )}

        {isExpanded && (
          <iframe
            src={`/pipeline/${step.filename}`}
            className={`w-full border-0 bg-white ${isFullscreen ? "h-[calc(100vh-100px)]" : "h-[680px]"}`}
            title={`${step.label} Output`}
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            onLoad={handleLoad}
          />
        )}
      </div>
    </div>
  );
}

function PipelineStepCard({ step, isExpanded, onToggle, totalSteps: _totalSteps }) {
  const [activeTab, setActiveTab] = useState("notebook"); // "notebook" | "outputs" | "methodology"
  const Icon = step.icon;
  const colors = COLOR_MAP[step.color];

  return (
    <div
      id={`step-card-${step.id}`}
      className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
        isExpanded
          ? "border-[#111111] bg-white shadow-md"
          : "border-[#E5E5E5] bg-white hover:border-[#D4D4D4] hover:shadow-xs"
      }`}
    >
      {/* Header Button */}
      <button
        onClick={onToggle}
        className="w-full px-4 py-3.5 sm:px-5 sm:py-4 flex items-center gap-3.5 text-left transition-colors hover:bg-[#FAFAF8] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#B51F3B]"
        aria-expanded={isExpanded}
        aria-controls={`step-content-${step.id}`}
      >
        {/* Step Avatar */}
        <div className="relative shrink-0">
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-white ${colors.main} shadow-xs`}>
            <Icon size={20} />
          </div>
          <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-white border border-[#E5E5E5]">
            <CheckCircle size={12} className="text-emerald-600" />
          </span>
        </div>

        {/* Step Summary */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-xs font-bold text-[#777777]">Stage {step.stepNumber}</span>
            <span className="text-[#CCCCCC]">·</span>
            <h3 className="font-extrabold text-sm sm:text-base text-[#111111] truncate">{step.label}</h3>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${colors.light}`}>
              {step.categoryLabel}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-[#666666] line-clamp-1">{step.description}</p>
        </div>

        {/* Badge & Chevron */}
        <div className="flex items-center gap-3 shrink-0">
          <span className="hidden sm:inline-block font-mono text-[11px] font-semibold text-[#888888]">
            {step.estimatedTime}
          </span>
          <div className={`flex h-7 w-7 items-center justify-center rounded-lg border border-[#E5E5E5] bg-white text-[#666666] transition-transform duration-200 ${
            isExpanded ? "rotate-180 bg-[#FAFAF8] text-[#111111]" : ""
          }`}>
            <ChevronDown size={15} />
          </div>
        </div>
      </button>

      {/* Expanded Body */}
      {isExpanded && (
        <div id={`step-content-${step.id}`} className="border-t border-[#E5E5E5] bg-[#FAFAF8] p-4 sm:p-6 animate-fade-in">
          {/* Sub-Tabs Navigation */}
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-[#E5E5E5] pb-3">
            <div className="flex items-center gap-1.5 rounded-xl border border-[#E5E5E5] bg-white p-1">
              <button
                onClick={() => setActiveTab("notebook")}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                  activeTab === "notebook"
                    ? "bg-[#111111] text-white shadow-xs"
                    : "text-[#666666] hover:bg-[#FAFAF8] hover:text-[#111111]"
                }`}
              >
                <Code2 size={13} />
                <span>Notebook Output</span>
              </button>
              <button
                onClick={() => setActiveTab("outputs")}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                  activeTab === "outputs"
                    ? "bg-[#111111] text-white shadow-xs"
                    : "text-[#666666] hover:bg-[#FAFAF8] hover:text-[#111111]"
                }`}
              >
                <Database size={13} />
                <span>Data Artifacts ({step.keyOutputs.length})</span>
              </button>
              <button
                onClick={() => setActiveTab("methodology")}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                  activeTab === "methodology"
                    ? "bg-[#111111] text-white shadow-xs"
                    : "text-[#666666] hover:bg-[#FAFAF8] hover:text-[#111111]"
                }`}
              >
                <Brain size={13} />
                <span>Methodology & Logic</span>
              </button>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-[#777777]">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span>Executed End-to-End</span>
            </div>
          </div>

          {/* Tab 1: Interactive Notebook */}
          {activeTab === "notebook" && (
            <NotebookIframe step={step} isExpanded={isExpanded} />
          )}

          {/* Tab 2: Data Artifacts & Lineage */}
          {activeTab === "outputs" && (
            <div className="flex flex-col gap-5 animate-fade-in">
              {/* Inputs */}
              <div className="rounded-xl border border-[#E5E5E5] bg-white p-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#888888] mb-2.5 flex items-center gap-1.5">
                  <Database size={13} className="text-[#B51F3B]" />
                  Inputs Consumed
                </h4>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {step.inputs.map((input, idx) => (
                    <div key={idx} className="flex items-start gap-2 rounded-lg border border-[#EBEBE8] bg-[#FAFAF8] p-2.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#111111] mt-1.5 shrink-0" />
                      <div>
                        <span className="block text-xs font-bold text-[#111111]">{input.name}</span>
                        <span className="block text-[11px] text-[#777777]">{input.source}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Outputs */}
              <div className="rounded-xl border border-[#E5E5E5] bg-white p-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#888888] mb-2.5 flex items-center gap-1.5">
                  <Table size={13} className="text-emerald-700" />
                  Generated Outputs & Artifacts
                </h4>
                <div className="flex flex-col gap-2">
                  {step.keyOutputs.map((output, idx) => (
                    <div
                      key={idx}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#EBEBE8] bg-[#FAFAF8] p-3 transition-colors hover:border-[#D4D4D4] hover:bg-white"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white border border-[#E5E5E5] text-[#111111]">
                          <output.icon size={14} className="text-[#B51F3B]" />
                        </span>
                        <div>
                          <span className="block text-xs font-bold text-[#111111]">{output.label}</span>
                          <span className="block text-[11px] text-[#666666]">{output.desc}</span>
                        </div>
                      </div>

                      {output.file ? (
                        <a
                          href={output.file}
                          download
                          className="inline-flex items-center gap-1 rounded-lg border border-[#E5E5E5] bg-white px-3 py-1.5 text-xs font-bold text-[#111111] transition-colors hover:border-[#B51F3B] hover:text-[#B51F3B]"
                        >
                          <Download size={12} />
                          <span>Download Data</span>
                        </a>
                      ) : (
                        <span className="text-[10px] font-semibold text-[#888888] rounded-md bg-white border border-[#E5E5E5] px-2 py-0.5">
                          In-Memory / Notebook
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Tab 3: Methodology & Formulation */}
          {activeTab === "methodology" && (
            <div className="flex flex-col gap-4 rounded-xl border border-[#E5E5E5] bg-white p-5 animate-fade-in">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#B51F3B]">
                <Brain size={14} />
                <span>{step.methodology.title}</span>
              </div>
              <div className="rounded-xl border border-[#E5E5E5] bg-[#FAFAF8] p-4 text-center font-mono text-xs sm:text-sm text-[#111111] overflow-x-auto">
                {step.methodology.formula}
              </div>
              <p className="text-xs sm:text-sm text-[#555555] leading-relaxed">
                {step.methodology.explanation}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function PipelineView() {
  const [expandedStep, setExpandedStep] = useState(null);
  const [viewMode, setViewMode] = useState("cards"); // "cards" | "timeline"
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all"); // "all" | "prep" | "analysis"

  const toggleStep = useCallback(id => {
    setExpandedStep(curr => (curr === id ? null : id));
  }, []);

  const selectAndScrollToStep = useCallback((id) => {
    setExpandedStep(id);
    const element = document.getElementById(`step-card-${id}`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  // Filter steps by search query and category
  const filteredSteps = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return PIPELINE_STEPS.filter(step => {
      const matchesCategory = categoryFilter === "all" || step.category === categoryFilter;
      const matchesQuery =
        !q ||
        step.label.toLowerCase().includes(q) ||
        step.description.toLowerCase().includes(q) ||
        step.filename.toLowerCase().includes(q) ||
        step.keyOutputs.some(o => o.label.toLowerCase().includes(q));
      return matchesCategory && matchesQuery;
    });
  }, [searchQuery, categoryFilter]);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 py-4 animate-fade-in sm:py-6">
      {/* ── 1. Page Header ────────────────────────────────────────── */}
      <div className="rounded-2xl border border-[#E5E5E5] bg-[#FAFAF8] p-5 sm:p-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#B51F3B]">
              <GitBranch size={14} />
              <span>Computational Provenance</span>
            </div>
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-[#111111] sm:text-3xl">
              Data Pipeline & Model Transparency
            </h1>
            <p className="mt-1 text-xs text-[#555555] sm:text-sm max-w-2xl leading-relaxed">
              Every stage is a fully executed, reproducible Jupyter notebook — raw code, execution tables, statistical tests, and artifacts.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800">
              <CheckCircle size={13} className="text-emerald-600" />
              <span>6 of 6 Stages Complete</span>
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#E5E5E5] bg-white px-3 py-1 text-xs font-semibold text-[#555555]">
              <Sparkles size={13} className="text-[#B51F3B]" />
              <span>Zero Imputation</span>
            </span>
          </div>
        </div>

        {/* ── 2. Top Interactive Pipeline Stepper ───────────────────── */}
        <div className="mt-6 border-t border-[#E5E5E5] pt-5">
          <div className="mb-2 flex items-center justify-between text-xs">
            <span className="eyebrow text-[#888888]">Execution Sequence</span>
            <span className="text-[11px] text-[#777777]">Click any node to inspect</span>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {PIPELINE_STEPS.map((step, idx) => {
              const Icon = step.icon;
              const isSelected = expandedStep === step.id;
              const colors = COLOR_MAP[step.color];

              return (
                <button
                  key={step.id}
                  onClick={() => selectAndScrollToStep(step.id)}
                  className={`group flex items-center gap-2 rounded-xl border p-2 text-left transition-all ${
                    isSelected
                      ? "border-[#111111] bg-white shadow-xs ring-1 ring-[#111111]"
                      : "border-[#E5E5E5] bg-white hover:border-[#D4D4D4] hover:bg-[#FAFAF8]"
                  }`}
                  title={`Stage ${idx + 1}: ${step.label}`}
                >
                  <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-white font-bold text-[10px] ${colors.main}`}>
                    <Icon size={13} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-bold text-[#111111]">
                      {step.shortLabel}
                    </span>
                    <span className="block text-[10px] text-[#777777] font-mono">
                      {step.estimatedTime}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── 3. Filter Bar & View Mode Toggle ───────────────────────── */}
      <div className="flex flex-col gap-3 rounded-2xl border border-[#E5E5E5] bg-white p-3.5 sm:flex-row sm:items-center sm:justify-between sm:p-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#888888]" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search stages, methods, or datasets (e.g. PM2.5, ANOVA, IQR)..."
            className="w-full rounded-xl border border-[#E5E5E5] bg-[#FAFAF8] py-1.5 pl-8 pr-8 text-xs text-[#111111] placeholder:text-[#999999] transition-colors focus:border-[#111111] focus:bg-white focus:outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#888888] hover:text-[#111111]"
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* Filters and View Switcher */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Category Chips */}
          <div className="flex items-center gap-1 rounded-xl border border-[#E5E5E5] bg-[#FAFAF8] p-1">
            <button
              onClick={() => setCategoryFilter("all")}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                categoryFilter === "all" ? "bg-[#111111] text-white shadow-xs" : "text-[#666666] hover:text-[#111111]"
              }`}
            >
              All (6)
            </button>
            <button
              onClick={() => setCategoryFilter("prep")}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                categoryFilter === "prep" ? "bg-[#111111] text-white shadow-xs" : "text-[#666666] hover:text-[#111111]"
              }`}
            >
              Data Prep (3)
            </button>
            <button
              onClick={() => setCategoryFilter("analysis")}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                categoryFilter === "analysis" ? "bg-[#111111] text-white shadow-xs" : "text-[#666666] hover:text-[#111111]"
              }`}
            >
              Models & Scoring (3)
            </button>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 rounded-xl border border-[#E5E5E5] bg-[#FAFAF8] p-1">
            <button
              onClick={() => setViewMode("cards")}
              className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                viewMode === "cards" ? "bg-[#111111] text-white shadow-xs" : "text-[#666666] hover:text-[#111111]"
              }`}
              title="Cards view mode"
            >
              <Layers size={13} />
              <span>Cards</span>
            </button>
            <button
              onClick={() => setViewMode("timeline")}
              className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                viewMode === "timeline" ? "bg-[#111111] text-white shadow-xs" : "text-[#666666] hover:text-[#111111]"
              }`}
              title="Interactive DAG timeline view"
            >
              <GitBranch size={13} />
              <span>DAG Flow</span>
            </button>
          </div>

          {/* Expand/Collapse All (Cards View) */}
          {viewMode === "cards" && (
            <button
              onClick={() => setExpandedStep(curr => (curr ? null : PIPELINE_STEPS[PIPELINE_STEPS.length - 1].id))}
              className="inline-flex items-center gap-1 rounded-xl border border-[#E5E5E5] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#111111] hover:border-[#D4D4D4] hover:bg-[#FAFAF8] transition-colors"
            >
              {expandedStep ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              <span>{expandedStep ? "Collapse" : "Expand"}</span>
            </button>
          )}
        </div>
      </div>

      {/* ── 4. Main View Container ─────────────────────────────────── */}
      {viewMode === "cards" ? (
        /* Cards View Mode */
        <div className="flex flex-col gap-3.5" role="list" aria-label="Pipeline stages">
          {filteredSteps.map((step, idx) => (
            <PipelineStepCard
              key={step.id}
              step={step}
              index={idx}
              isExpanded={expandedStep === step.id}
              onToggle={() => toggleStep(step.id)}
              totalSteps={PIPELINE_STEPS.length}
            />
          ))}

          {filteredSteps.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-[#E5E5E5] bg-white py-12 text-center">
              <Search size={24} className="text-[#CCCCCC]" />
              <p className="text-sm font-bold text-[#111111]">No matching pipeline stages</p>
              <p className="text-xs text-[#777777]">Try adjusting your search query or reset the filter.</p>
              <button
                onClick={() => {
                  setSearchQuery("");
                  setCategoryFilter("all");
                }}
                className="mt-2 rounded-lg border border-[#E5E5E5] bg-[#FAFAF8] px-3 py-1 text-xs font-bold text-[#111111] hover:bg-white"
              >
                Reset Filters
              </button>
            </div>
          )}
        </div>
      ) : (
        /* Timeline DAG Flow Mode */
        <div className="flex flex-col gap-6 animate-fade-in">
          {/* Visual DAG Stepper Cards */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filteredSteps.map(step => {
              const Icon = step.icon;
              const isSelected = (expandedStep || PIPELINE_STEPS[0].id) === step.id;
              const colors = COLOR_MAP[step.color];

              return (
                <div
                  key={step.id}
                  onClick={() => setExpandedStep(step.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => (e.key === "Enter" || e.key === " ") && setExpandedStep(step.id)}
                  className={`relative flex flex-col justify-between rounded-2xl border p-4 cursor-pointer transition-all ${
                    isSelected
                      ? "border-[#111111] bg-white shadow-md ring-2 ring-[#111111]"
                      : "border-[#E5E5E5] bg-[#FAFAF8] hover:border-[#D4D4D4] hover:bg-white"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className={`flex h-8 w-8 items-center justify-center rounded-lg text-white font-bold text-xs ${colors.main}`}>
                          <Icon size={16} />
                        </div>
                        <span className="font-mono text-xs font-bold text-[#777777]">Stage {step.stepNumber}</span>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${colors.light}`}>
                        {step.categoryLabel}
                      </span>
                    </div>

                    <h3 className="font-extrabold text-sm text-[#111111] mb-1">{step.label}</h3>
                    <p className="text-xs text-[#666666] line-clamp-2 leading-relaxed">{step.description}</p>
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-[#EBEBE8] pt-3 text-[11px] text-[#777777]">
                    <span className="font-mono">{step.estimatedTime}</span>
                    <span className="font-bold text-[#111111] group-hover:text-[#B51F3B] flex items-center gap-1">
                      {isSelected ? "Active View" : "Click to Inspect"}
                      <ArrowRight size={11} />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Focused Stage Deep Dive */}
          {(() => {
            const currentStep = PIPELINE_STEPS.find(s => s.id === (expandedStep || PIPELINE_STEPS[0].id)) || PIPELINE_STEPS[0];
            const currIdx = PIPELINE_STEPS.findIndex(s => s.id === currentStep.id);
            const prevStep = currIdx > 0 ? PIPELINE_STEPS[currIdx - 1] : null;
            const nextStep = currIdx < PIPELINE_STEPS.length - 1 ? PIPELINE_STEPS[currIdx + 1] : null;

            return (
              <div className="rounded-2xl border border-[#111111] bg-white p-5 shadow-lg animate-scale-in sm:p-6">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-[#E5E5E5] pb-4">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs font-black text-[#B51F3B]">
                      STAGE {currentStep.stepNumber} OF 06
                    </span>
                    <span className="text-[#CCCCCC]">·</span>
                    <h2 className="text-lg font-extrabold text-[#111111]">{currentStep.label}</h2>
                  </div>

                  {/* Previous / Next Stage Navigator */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => prevStep && setExpandedStep(prevStep.id)}
                      disabled={!prevStep}
                      className="inline-flex items-center gap-1 rounded-lg border border-[#E5E5E5] bg-white px-2.5 py-1 text-xs font-bold text-[#111111] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#FAFAF8]"
                    >
                      <ArrowLeft size={12} />
                      <span>Previous</span>
                    </button>
                    <button
                      onClick={() => nextStep && setExpandedStep(nextStep.id)}
                      disabled={!nextStep}
                      className="inline-flex items-center gap-1 rounded-lg border border-[#E5E5E5] bg-white px-2.5 py-1 text-xs font-bold text-[#111111] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#FAFAF8]"
                    >
                      <span>Next Stage</span>
                      <ArrowRight size={12} />
                    </button>
                  </div>
                </div>

                <div className="mb-4 text-xs sm:text-sm text-[#555555] leading-relaxed">
                  {currentStep.description}
                </div>

                {/* Live Notebook Viewer */}
                <NotebookIframe step={currentStep} isExpanded={true} />
              </div>
            );
          })()}
        </div>
      )}

      {/* ── 5. Technical Rigor & Reproducibility Footer ────────────── */}
      <div className="rounded-2xl border border-[#E5E5E5] bg-[#FAFAF8] p-5 sm:p-6">
        <h3 className="font-bold text-xs uppercase tracking-wider text-[#888888] mb-4 flex items-center gap-2">
          <Sparkles size={14} className="text-[#B51F3B]" />
          <span>Pipeline Architecture & Reproducibility</span>
        </h3>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="flex flex-col justify-between">
            <div>
              <h4 className="font-bold text-xs text-[#111111] mb-1.5 flex items-center gap-1.5">
                <Database size={13} className="text-[#B51F3B]" />
                Ground-Truth Data Hygiene
              </h4>
              <p className="text-xs text-[#666666] leading-relaxed">
                Zero synthetic data or simulated tables. All values originate from verified government publications (CPCB, NCRB, MoHFW, RBI, MoSPI) with timestamped records.
              </p>
            </div>
          </div>
          <div className="flex flex-col justify-between">
            <div>
              <h4 className="font-bold text-xs text-[#111111] mb-1.5 flex items-center gap-1.5">
                <Eye size={13} className="text-[#B51F3B]" />
                Notebook Transparency
              </h4>
              <p className="text-xs text-[#666666] leading-relaxed">
                Every calculation from raw CSV ingestion to multi-factor sensitivity analysis runs through standalone Jupyter notebooks. What you see is exactly what executed.
              </p>
            </div>
          </div>
          <div className="flex flex-col justify-between">
            <div>
              <h4 className="font-bold text-xs text-[#111111] mb-1.5 flex items-center gap-1.5">
                <Brain size={13} className="text-[#B51F3B]" />
                Statistical Calibration
              </h4>
              <p className="text-xs text-[#666666] leading-relaxed">
                Calibrated directional bounds invert negative indicators (crime, pollution) into intuitive 0–100 scores, validated by Monte Carlo rank sensitivity draws.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
