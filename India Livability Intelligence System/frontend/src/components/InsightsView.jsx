import { useMemo } from "react";
import {
  Activity,
  Award,
  BarChart3,
  Briefcase,
  CheckCircle2,
  Compass,
  Droplets,
  Heart,
  Info,
  MapPin,
  Shield,
  TrendingUp,
  Wind
} from "lucide-react";
import { getScoreColor } from "../services/scoringService";

const PILLARS = [
  {
    key: "air",
    name: "Air Quality",
    icon: Wind,
    weightKey: "air",
    color: "#0284c7",
    desc: "PM2.5 concentration index; higher in coastal & southern cities.",
  },
  {
    key: "safety",
    name: "Public Safety",
    icon: Shield,
    weightKey: "safety",
    color: "#e11d48",
    desc: "Cognizable crime rate per lakh (NCRB published records).",
  },
  {
    key: "health",
    name: "Healthcare",
    icon: Heart,
    weightKey: "health",
    color: "#16a34a",
    desc: "NFHS-5 composite: institutional births, vaccination, & nutrition.",
  },
  {
    key: "economy",
    name: "Jobs & Economy",
    icon: Briefcase,
    weightKey: "economy",
    color: "#d97706",
    desc: "Constant per-capita NSDP combined with PLFS employment.",
  },
  {
    key: "water",
    name: "Water Quality",
    icon: Droplets,
    weightKey: "water",
    color: "#0891b2",
    desc: "CPCB 2021 surface-water index from BOD and dissolved oxygen.",
  },
];

function calculatePearson(places, keyA, keyB) {
  const pairs = [];
  places.forEach(place => {
    const a = place.factorScores?.[keyA];
    const b = place.factorScores?.[keyB];
    if (Number.isFinite(a) && Number.isFinite(b)) {
      pairs.push([a, b]);
    }
  });
  if (pairs.length < 5) return null;

  const meanA = pairs.reduce((sum, p) => sum + p[0], 0) / pairs.length;
  const meanB = pairs.reduce((sum, p) => sum + p[1], 0) / pairs.length;
  let cov = 0;
  let varA = 0;
  let varB = 0;

  pairs.forEach(([a, b]) => {
    const da = a - meanA;
    const db = b - meanB;
    cov += da * db;
    varA += da * da;
    varB += db * db;
  });

  if (varA === 0 || varB === 0) return null;
  return Number((cov / Math.sqrt(varA * varB)).toFixed(2));
}

export default function InsightsView({ rankedPlaces = [], year = 2026, weights = {} }) {
  // Only places with a valid composite score
  const validPlaces = useMemo(
    () => rankedPlaces.filter(p => Number.isFinite(p.overallScore)),
    [rankedPlaces]
  );

  // Core high-level metrics
  const summary = useMemo(() => {
    if (!validPlaces.length) {
      return {
        avgScore: 0,
        topOverall: null,
        topState: null,
        topCity: null,
        regions: [],
        bestRegion: null,
        lowestRegion: null,
        regionSpread: 0,
        pillarAverages: {},
        econHealthCorr: null,
        citiesCount: 0,
        statesCount: 0,
      };
    }

    const total = validPlaces.reduce((sum, p) => sum + p.overallScore, 0);
    const avgScore = total / validPlaces.length;

    // Top places
    const topOverall = validPlaces[0] || null;
    const topState = validPlaces.find(p => p.type === "state") || null;
    const topCity = validPlaces.find(p => p.type === "city") || null;

    // Counts
    const citiesCount = validPlaces.filter(p => p.type === "city").length;
    const statesCount = validPlaces.filter(p => p.type === "state").length;

    // Regional averages
    const regionAgg = {};
    validPlaces.forEach(p => {
      const reg = p.region || "Other";
      if (!regionAgg[reg]) regionAgg[reg] = { total: 0, count: 0 };
      regionAgg[reg].total += p.overallScore;
      regionAgg[reg].count += 1;
    });

    const regions = Object.entries(regionAgg)
      .map(([region, data]) => ({
        region,
        average: data.total / data.count,
        count: data.count,
      }))
      .sort((a, b) => b.average - a.average);

    const bestRegion = regions[0] || null;
    const lowestRegion = regions[regions.length - 1] || null;
    const regionSpread = bestRegion && lowestRegion ? bestRegion.average - lowestRegion.average : 0;

    // Pillar averages
    const pillarAverages = {};
    PILLARS.forEach(({ key }) => {
      const scores = validPlaces
        .map(p => p.factorScores?.[key])
        .filter(v => Number.isFinite(v));
      pillarAverages[key] = scores.length
        ? scores.reduce((sum, v) => sum + v, 0) / scores.length
        : 0;
    });

    // Correlation between economy & health
    const econHealthCorr = calculatePearson(validPlaces, "economy", "health");

    return {
      avgScore,
      topOverall,
      topState,
      topCity,
      regions,
      bestRegion,
      lowestRegion,
      regionSpread,
      pillarAverages,
      econHealthCorr,
      citiesCount,
      statesCount,
    };
  }, [validPlaces]);

  // Tier helper for average
  const getTierLabel = (score) => {
    if (score >= 75) return "High Livability";
    if (score >= 55) return "Moderate Livability";
    return "Developing Livability";
  };

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 py-4 animate-fade-in sm:py-6">
      {/* ── 1. Page Header ────────────────────────────────────────── */}
      <div className="rounded-2xl border border-[#E5E5E5] bg-[#FAFAF8] p-5 sm:p-7">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#B51F3B]">
              <Activity size={14} />
              <span>National Insights</span>
            </div>
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-[#111111] sm:text-3xl">
              Livability Insights & Analytics
            </h1>
            <p className="mt-1 text-xs text-[#555555] sm:text-sm">
              Empirical patterns, regional comparisons, and pillar performance across India.
            </p>
          </div>
          <div className="mt-2 flex items-center gap-2 self-start rounded-full border border-[#E5E5E5] bg-white px-3 py-1 text-xs font-semibold text-[#444444] sm:mt-0 sm:self-center">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span>Year {year} Analysis</span>
            <span className="text-[#888888]">·</span>
            <span>{validPlaces.length} Places</span>
          </div>
        </div>

        {/* ── 2. Top 4 Executive KPI Cards ──────────────────────────── */}
        <div className="mt-6 grid grid-cols-2 gap-3 border-t border-[#E5E5E5] pt-5 sm:grid-cols-4 sm:gap-4">
          {/* KPI 1: National Average */}
          <div className="flex flex-col justify-between rounded-xl border border-[#E5E5E5] bg-white p-3.5 shadow-2xs transition-shadow hover:shadow-xs sm:p-4">
            <div className="flex items-center justify-between text-xs font-semibold text-[#777777]">
              <span>National Average</span>
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-rose-50 text-[#B51F3B]">
                <Activity size={14} />
              </span>
            </div>
            <div className="my-2">
              <span className="font-mono text-2xl font-black text-[#111111] sm:text-3xl">
                {summary.avgScore ? summary.avgScore.toFixed(1) : "—"}
              </span>
              <span className="text-xs text-[#888888]"> / 100</span>
            </div>
            <span className="inline-block self-start rounded-md border border-[#EBEBE8] bg-[#FAFAF8] px-2 py-0.5 text-[10px] font-semibold text-[#555555]">
              {getTierLabel(summary.avgScore)}
            </span>
          </div>

          {/* KPI 2: Top Ranked State */}
          <div className="flex flex-col justify-between rounded-xl border border-[#E5E5E5] bg-white p-3.5 shadow-2xs transition-shadow hover:shadow-xs sm:p-4">
            <div className="flex items-center justify-between text-xs font-semibold text-[#777777]">
              <span>Top State</span>
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                <Award size={14} />
              </span>
            </div>
            <div className="my-2">
              <span className="block truncate text-lg font-extrabold text-[#111111] sm:text-xl">
                {summary.topState?.name || "—"}
              </span>
              <span className="font-mono text-xs font-bold text-emerald-700">
                Score: {summary.topState?.overallScore?.toFixed(1) ?? "—"}
              </span>
            </div>
            <span className="text-[10px] text-[#777777]">
              {summary.topState?.region || "National"} leader
            </span>
          </div>

          {/* KPI 3: Top Ranked City */}
          <div className="flex flex-col justify-between rounded-xl border border-[#E5E5E5] bg-white p-3.5 shadow-2xs transition-shadow hover:shadow-xs sm:p-4">
            <div className="flex items-center justify-between text-xs font-semibold text-[#777777]">
              <span>Top City</span>
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-rose-50 text-[#B51F3B]">
                <MapPin size={14} />
              </span>
            </div>
            <div className="my-2">
              <span className="block truncate text-lg font-extrabold text-[#111111] sm:text-xl">
                {summary.topCity?.name || "—"}
              </span>
              <span className="font-mono text-xs font-bold text-emerald-700">
                Score: {summary.topCity?.overallScore?.toFixed(1) ?? "—"}
              </span>
            </div>
            <span className="text-[10px] text-[#777777]">
              {summary.topCity?.state || "Metro"} leader
            </span>
          </div>

          {/* KPI 4: Leading Region */}
          <div className="flex flex-col justify-between rounded-xl border border-[#E5E5E5] bg-white p-3.5 shadow-2xs transition-shadow hover:shadow-xs sm:p-4">
            <div className="flex items-center justify-between text-xs font-semibold text-[#777777]">
              <span>Leading Region</span>
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <Compass size={14} />
              </span>
            </div>
            <div className="my-2">
              <span className="block truncate text-lg font-extrabold text-[#111111] sm:text-xl">
                {summary.bestRegion?.region || "—"}
              </span>
              <span className="font-mono text-xs font-bold text-blue-700">
                Avg: {summary.bestRegion?.average ? summary.bestRegion.average.toFixed(1) : "—"}
              </span>
            </div>
            <span className="text-[10px] text-[#777777]">
              Highest regional consistency
            </span>
          </div>
        </div>
      </div>

      {/* ── 3. Regional Breakdown & 4 Core Pillars ─────────────────── */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Left: Regional Rankings Bar Chart */}
        <div className="flex flex-col justify-between rounded-2xl border border-[#E5E5E5] bg-white p-5 sm:p-6">
          <div>
            <div className="mb-1 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 size={16} className="text-[#B51F3B]" />
                <h2 className="text-sm font-bold text-[#111111]">Regional Livability Rankings</h2>
              </div>
              <span className="rounded-full bg-[#FAFAF8] px-2 py-0.5 text-[10px] font-semibold text-[#777777]">
                Average Score
              </span>
            </div>
            <p className="mb-4 text-xs text-[#666666]">
              Mean livability calculated across all states and cities in each zone.
            </p>

            <div className="flex flex-col gap-3">
              {summary.regions.map(r => (
                <div key={r.region} className="flex items-center gap-3">
                  <span className="w-20 shrink-0 text-xs font-semibold text-[#333333]">
                    {r.region}
                  </span>
                  <div className="h-3 flex-1 overflow-hidden rounded-full bg-[#F0F0EE]">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(100, Math.max(0, r.average))}%`,
                        backgroundColor: getScoreColor(r.average),
                      }}
                    />
                  </div>
                  <span className="w-10 shrink-0 text-right font-mono text-xs font-bold text-[#111111]">
                    {r.average.toFixed(1)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-5 rounded-xl border border-[#EBEBEB] bg-[#FAFAF8] p-3 text-xs leading-relaxed text-[#555555]">
            <strong className="text-[#111111]">Key Regional Finding: </strong>
            {summary.bestRegion && summary.lowestRegion
              ? `${summary.bestRegion.region} India ranks highest (${summary.bestRegion.average.toFixed(1)}), leading ${summary.lowestRegion.region} India (${summary.lowestRegion.average.toFixed(1)}) by ${summary.regionSpread.toFixed(1)} points.`
              : "Regional calculations active."}
          </div>
        </div>

        {/* Right: National Pillar Performance */}
        <div className="flex flex-col justify-between rounded-2xl border border-[#E5E5E5] bg-white p-5 sm:p-6">
          <div>
            <div className="mb-1 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp size={16} className="text-[#B51F3B]" />
                <h2 className="text-sm font-bold text-[#111111]">Core Pillar Averages</h2>
              </div>
              <span className="rounded-full bg-[#FAFAF8] px-2 py-0.5 text-[10px] font-semibold text-[#777777]">
                National Means
              </span>
            </div>
            <p className="mb-4 text-xs text-[#666666]">
              Average performance score (0–100) across each evaluation dimension.
            </p>

            <div className="flex flex-col gap-3">
              {PILLARS.map(p => {
                const Icon = p.icon;
                const score = summary.pillarAverages[p.key] || 0;
                const totalWeight = Object.values(weights || {}).reduce(
                  (sum, value) => sum + Number(value || 0),
                  0
                );
                const currentWeight =
                  totalWeight > 0
                    ? (Number(weights?.[p.weightKey] || 0) / totalWeight) * 100
                    : 0;

                return (
                  <div
                    key={p.key}
                    className="flex flex-col rounded-xl border border-[#EBEBEB] bg-[#FAFAF8] p-3 transition-colors hover:border-[#D5D5D5]"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-white shadow-2xs">
                          <Icon size={13} style={{ color: p.color }} />
                        </div>
                        <span className="text-xs font-bold text-[#111111]">{p.name}</span>
                        <span className="text-[10px] text-[#888888]">
                          ({currentWeight.toFixed(0)}% weight)
                        </span>
                      </div>
                      <span className="font-mono text-xs font-extrabold text-[#111111]">
                        {score ? score.toFixed(1) : "—"} / 100
                      </span>
                    </div>
                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[#E5E5E5]">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min(100, Math.max(0, score))}%`,
                          backgroundColor: getScoreColor(score),
                        }}
                      />
                    </div>
                    <p className="mt-1.5 text-[10px] text-[#666666]">{p.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {summary.econHealthCorr !== null && (
            <div className="mt-3 flex items-center justify-between rounded-lg bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 size={13} className="text-emerald-600" />
                Economy & Health correlation:
              </span>
              <span className="font-mono font-bold">r = {summary.econHealthCorr > 0 ? `+${summary.econHealthCorr}` : summary.econHealthCorr}</span>
            </div>
          )}
        </div>
      </div>

      {/* ── 4. Key Empirical Takeaways (3 Plain-English Cards) ─────── */}
      <div>
        <h2 className="mb-3 text-sm font-bold text-[#111111]">
          Key Findings & Statistical Takeaways
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {/* Finding 1: Geographic Disparity */}
          <div className="flex flex-col justify-between rounded-2xl border border-[#E5E5E5] border-l-4 border-l-[#B51F3B] bg-white p-5 shadow-2xs transition-shadow hover:shadow-xs">
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-bold text-[#B51F3B]">Geographic Patterns</span>
                <span className="rounded-full bg-[#FAFAF8] px-2 py-0.5 text-[10px] font-bold text-[#111111]">
                  +{summary.regionSpread.toFixed(1)} pt spread
                </span>
              </div>
              <h3 className="text-sm font-bold text-[#111111]">
                Southern & Western Consistency
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-[#555555]">
                Southern and Western states report more consistent health outcomes and coastal air quality, whereas Northern locations experience substantial seasonal particulate air variance.
              </p>
            </div>
            <div className="mt-4 border-t border-[#F0F0EE] pt-2 text-[10px] text-[#777777]">
              Descriptive regional comparison of the current weighted cross-section.
            </div>
          </div>

          {/* Finding 2: Metro Cities vs States */}
          <div className="flex flex-col justify-between rounded-2xl border border-[#E5E5E5] border-l-4 border-l-[#0284c7] bg-white p-5 shadow-2xs transition-shadow hover:shadow-xs">
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-bold text-[#0284c7]">Urban Dynamics</span>
                <span className="rounded-full bg-[#FAFAF8] px-2 py-0.5 text-[10px] font-bold text-[#111111]">
                  {summary.citiesCount} Cities Monitored
                </span>
              </div>
              <h3 className="text-sm font-bold text-[#111111]">
                Metropolitan Trade-Offs
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-[#555555]">
                Metros like Bengaluru and Mumbai demonstrate strong economic output and healthcare access, but trade off particulate air quality compared to smaller states.
              </p>
            </div>
            <div className="mt-4 border-t border-[#F0F0EE] pt-2 text-[10px] text-[#777777]">
              Air values are historic and enriched station observations, not live monitoring.
            </div>
          </div>

          {/* Finding 3: Economic Link */}
          <div className="flex flex-col justify-between rounded-2xl border border-[#E5E5E5] border-l-4 border-l-[#16a34a] bg-white p-5 shadow-2xs transition-shadow hover:shadow-xs">
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-bold text-[#16a34a]">Development Link</span>
                <span className="rounded-full bg-[#FAFAF8] px-2 py-0.5 text-[10px] font-bold text-[#111111]">
                  {summary.econHealthCorr !== null
                    ? `Pearson r = ${summary.econHealthCorr > 0 ? "+" : ""}${summary.econHealthCorr}`
                    : "Descriptive association"}
                </span>
              </div>
              <h3 className="text-sm font-bold text-[#111111]">
                Income & Social Infrastructure
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-[#555555]">
                Per capita income (NSDP) exhibits a strong positive relationship with healthcare delivery and housing investment, highlighting how economic capability reinforces livability.
              </p>
            </div>
            <div className="mt-4 border-t border-[#F0F0EE] pt-2 text-[10px] text-[#777777]">
              Based on RBI NSDP and PLFS employment surveys
            </div>
          </div>
        </div>
      </div>

      {/* ── 5. Clean, Minimal Data Sources Bar ──────────────────────── */}
      <div className="flex flex-col items-start justify-between gap-3 rounded-2xl border border-[#E5E5E5] bg-[#FAFAF8] p-4 text-xs text-[#666666] sm:flex-row sm:items-center sm:px-6">
        <div className="flex items-center gap-2">
          <Info size={15} className="shrink-0 text-[#B51F3B]" />
          <span>
            <strong className="text-[#111111]">Official Data Sources:</strong> CPCB Air Quality (Daily/Enriched) · NCRB Crime in India (2020–22) · MoHFW NFHS-5 (2019–21) · RBI & MoSPI PLFS (2023–24) · CPCB Water Bodies (2021).
          </span>
        </div>
        <span className="shrink-0 rounded-full border border-[#E5E5E5] bg-white px-2.5 py-1 text-[10px] font-semibold text-[#555555]">
          Zero Imputation Policy
        </span>
      </div>
    </div>
  );
}
