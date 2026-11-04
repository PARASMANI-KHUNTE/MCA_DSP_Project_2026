import { useMemo } from "react";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  Database,
  Grid3X3,
  Layers,
  TrendingUp
} from "lucide-react";
import {
  DATA_COVERAGE,
  FACTOR_DEFS,
  getScoreColor
} from "../services/scoringService";

const CORRELATION_KEYS = ["air", "safety", "health", "economy"];
const FACTOR_LABELS = ["Air quality", "Public safety", "Healthcare", "Economy & jobs"];

function pearsonCorrelation(places, keyA, keyB) {
  const pairs = [];
  places.forEach(place => {
    const a = place.factorScores?.[keyA];
    const b = place.factorScores?.[keyB];
    if (Number.isFinite(a) && Number.isFinite(b)) pairs.push([a, b]);
  });
  if (pairs.length < 3) return null;

  const meanA = pairs.reduce((total, pair) => total + pair[0], 0) / pairs.length;
  const meanB = pairs.reduce((total, pair) => total + pair[1], 0) / pairs.length;
  let covariance = 0;
  let varianceA = 0;
  let varianceB = 0;

  pairs.forEach(([a, b]) => {
    const dx = a - meanA;
    const dy = b - meanB;
    covariance += dx * dy;
    varianceA += dx * dx;
    varianceB += dy * dy;
  });

  if (varianceA === 0 || varianceB === 0) return null;
  return Number((covariance / Math.sqrt(varianceA * varianceB)).toFixed(2));
}

function correlationStyle(value) {
  if (value === null) return { backgroundColor: "#F5F5F2", color: "#999999" };
  if (value === 1) return { backgroundColor: "#FAFAF8", color: "#111111" };
  const alpha = Math.min(0.35, 0.08 + Math.abs(value) * 0.3);
  return value >= 0
    ? { backgroundColor: "rgba(22, 163, 74, " + alpha + ")", color: "#166534" }
    : { backgroundColor: "rgba(181, 31, 59, " + alpha + ")", color: "#98172F" };
}

export default function InsightsView({ rankedPlaces = [], year = 2024, weights = {} }) {
  const scoredPlaces = useMemo(
    () => rankedPlaces.filter(place => Number.isFinite(place.overallScore)),
    [rankedPlaces]
  );

  const stats = useMemo(() => {
    if (!scoredPlaces.length) {
      return { average: null, improving: 0, declining: 0, trended: 0, top: null, regions: [] };
    }

    const average =
      scoredPlaces.reduce((total, place) => total + place.overallScore, 0) / scoredPlaces.length;
    const improving = scoredPlaces.filter(place => place.outlook === "Improving").length;
    const declining = scoredPlaces.filter(place => place.outlook === "Declining").length;
    const trended = scoredPlaces.filter(place => Number.isFinite(place.slope)).length;

    const regionMap = new Map();
    scoredPlaces.forEach(place => {
      const entry = regionMap.get(place.region) || { region: place.region, total: 0, count: 0 };
      entry.total += place.overallScore;
      entry.count += 1;
      regionMap.set(place.region, entry);
    });

    const regions = [...regionMap.values()]
      .map(entry => ({ region: entry.region, average: entry.total / entry.count }))
      .sort((a, b) => b.average - a.average);

    return { average, improving, declining, trended, top: scoredPlaces[0], regions };
  }, [scoredPlaces]);

  const correlationMatrix = useMemo(
    () =>
      CORRELATION_KEYS.map(rowKey =>
        CORRELATION_KEYS.map(columnKey =>
          rowKey === columnKey ? 1 : pearsonCorrelation(scoredPlaces, rowKey, columnKey)
        )
      ),
    [scoredPlaces]
  );

  const strongestCorrelation = useMemo(() => {
    let strongest = null;
    for (let row = 0; row < CORRELATION_KEYS.length; row += 1) {
      for (let column = row + 1; column < CORRELATION_KEYS.length; column += 1) {
        const value = correlationMatrix[row][column];
        if (value === null) continue;
        if (!strongest || Math.abs(value) > Math.abs(strongest.value)) {
          strongest = { row, column, value };
        }
      }
    }
    return strongest;
  }, [correlationMatrix]);

  const findings = useMemo(() => {
    const bestRegion = stats.regions[0];
    const worstRegion = stats.regions[stats.regions.length - 1];
    const spread = bestRegion && worstRegion ? bestRegion.average - worstRegion.average : null;
    const airHealth = correlationMatrix[0][2];
    const significant = stats.improving + stats.declining;

    return [
      {
        title: "Regional differences in livability",
        stat: bestRegion && worstRegion
          ? bestRegion.region + " scores " + spread.toFixed(1) + " points higher"
          : "Not enough data",
        summary: bestRegion && worstRegion
          ? bestRegion.region + " has the highest overall score (" + bestRegion.average.toFixed(1) + "); " + worstRegion.region + " has the lowest (" + worstRegion.average.toFixed(1) + ")."
          : "Regional scores cannot be computed for the current selection.",
        interpretation:
          "Regional scores pool all states and cities together. They show overall patterns but do not prove one region is better than another."
      },
      {
        title: "Air quality and health connection",
        stat: Number.isFinite(airHealth) ? "r = " + airHealth.toFixed(2) : "No overlap",
        summary: Number.isFinite(airHealth)
          ? "Places that score higher on air quality also tend to score higher on health, and vice versa."
          : "Too few places have both air and health data in the current view.",
        interpretation:
          "This shows a pattern across the current selection of places. It does not mean air quality causes better health. Other factors like income and education also play a role."
      },
      {
        title: "Places with noticeable changes",
        stat: significant + " of " + stats.trended + " places show a change",
        summary: stats.improving + " places are flagged as improving and " + stats.declining + " declining.",
        interpretation:
          "A change is flagged only when the statistical test shows a real difference from zero, not just random variation. Fewer than half the places may show a flagged change."
      },
      {
        title: "How many places are included",
        stat: scoredPlaces.length + " places active",
        summary: (scoredPlaces.filter(p => p.type === "city").length) + " cities and " + (scoredPlaces.filter(p => p.type === "state").length) + " states/UTs have data for " + year + ".",
        interpretation:
          "Urban coverage reflects active monitoring sites. Rural and remote areas may have fewer observations."
      }
    ];
  }, [stats, correlationMatrix, scoredPlaces, year]);

const kpis = [
    {
      label: "Analyzed mean",
      value: stats.average ? stats.average.toFixed(1) : "—",
      caption: "Average across " + scoredPlaces.length + " places for " + year,
      icon: Activity,
      tone: "text-[#B51F3B]"
    },
    {
      label: "Improving",
      value: stats.improving,
      caption: "More places are getting better",
      icon: ArrowUpRight,
      tone: "text-emerald-700"
    },
    {
      label: "Declining",
      value: stats.declining,
      caption: "More places are getting worse",
      icon: ArrowDownRight,
      tone: "text-[#B51F3B]"
    },
    {
      label: "Highest score",
      value: stats.top?.overallScore ?? "—",
      caption: stats.top ? stats.top.name + " is ranked #1" : "No rank",
      icon: TrendingUp,
      tone: "text-[#111111]"
    }
  ];

  const provenance = [
    {
      label: "Air Quality (PM2.5)",
      source: "Local Kaggle city_day PM2.5",
      latest: DATA_COVERAGE.lastYearByFactor?.air ?? null,
      coverage: "City-level series 2015–2019 for matched cities; state means derived from city observations.",
      note: "Upstream publisher version and license are unverified."
    },
    {
      label: "Public Safety",
      source: "NCRB Crime in India, Table 1A.3",
      latest: DATA_COVERAGE.lastYearByFactor?.safety ?? null,
      coverage: "State and UT annual cognizable crime rates, 2020–2022.",
      note: "Locally extracted; 2020–21 rates use the 2022 projected population."
    },
    {
      label: "Healthcare (NFHS-5 index)",
      source: "NFHS-5 district factsheets / MoHFW",
      latest: DATA_COVERAGE.lastYearByFactor?.health ?? null,
      coverage: "State composite index (0–100) from institutional births, full vaccination, child stunting and women's anaemia, 2019–21.",
      note: "Household-weighted state aggregation; higher index yields a higher score."
    },
    {
      label: "Economy & Employment",
      source: "RBI NSDP Table 20 & MoSPI PLFS 2023-24",
      latest: DATA_COVERAGE.lastYearByFactor?.economy ?? null,
      coverage: "Constant-price per-capita NSDP (2011–2024) and 2023 unemployment (15+).",
      note: "Locally extracted; economy scores require both indicators in the same year."
    },
    {
      label: "Housing Affordability",
      source: "Longitudinal city cost-of-living estimates",
      latest: DATA_COVERAGE.lastYearByFactor?.col ?? null,
      coverage: "Average 1BHK rent (city-centre and outside-centre) for 26 matched cities, 2010–2024.",
      note: "Modelled/estimated series with PLFS and Numbeo provenance; it is never projected."
    }
  ];

  // The historical full-composite insights below are only valid when the
  // corresponding factors are active. With today's partial, unverified inputs,
  // show coverage and the live single-factor result instead of stale claims.
  if (!DATA_COVERAGE.compositeAvailable) {
    const usedFactors = Object.entries(weights)
      .filter(([key, weight]) => Number(weight) > 0 && DATA_COVERAGE.availableFactors?.includes(key))
      .map(([key]) => key);
    const validRanked = rankedPlaces.filter(place => Number.isFinite(place.overallScore));
    const factorNames = { air: "Air quality", safety: "Public safety", health: "Healthcare", economy: "Economy & jobs", col: "Rent affordability" };
    const factorRows = DATA_COVERAGE.counts?.factorRowsByFactor || {};
    const coverage = (DATA_COVERAGE.availableFactors || []).map(key => ({
      key,
      name: factorNames[key] || FACTOR_DEFS[key]?.label || key,
      rows: key === "air"
        ? DATA_COVERAGE.counts?.airCityYears || 0
        : key === "economy"
          ? (factorRows.per_capita_nsdp_constant || 0) + (factorRows.unemployment_rate || 0)
          : factorRows[key === "col" ? "cost_of_living" : key] || 0,
      first: DATA_COVERAGE.firstYearByFactor?.[key] ?? null,
      last: DATA_COVERAGE.lastYearByFactor?.[key] ?? null
    }));

    return (
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 py-4 animate-fade-in sm:py-6">
        <div className="rounded-2xl border border-[#E5E5E5] bg-[#FAFAF8] p-6 sm:p-8">
          <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#B51F3B]">
            <Activity size={14} /> <span>Data coverage preview</span>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-[#111111] sm:text-3xl">Available results and limits</h1>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[#555555]">
            The current view does not have complete multi-factor coverage for the selected weights. Factor-specific results are shown instead. Upstream values and reuse terms have not been independently verified.
          </p>
          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {coverage.map(item => (
              <article key={item.key} className="rounded-xl border border-[#E5E5E5] bg-white p-4">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-sm font-bold text-[#111111]">{item.name}</h2>
                  <span className="rounded-full border border-[#E5E5E5] bg-[#FAFAF8] px-2 py-0.5 text-[10px] font-semibold text-[#666666]">Local preview</span>
                </div>
                <p className="mt-2 text-xs text-[#555555]">{item.rows} active observations{item.first != null && item.last != null ? ` · ${item.first}${item.first === item.last ? "" : `–${item.last}`}` : ""}</p>
                <p className="mt-1 text-[11px] leading-relaxed text-[#777777]">{FACTOR_DEFS[item.key]?.source || "Source details are in the source register."}</p>
              </article>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <article className="rounded-xl border border-[#E5E5E5] bg-white p-4"><span className="text-[11px] text-[#777777]">Current ranking</span><p className="mt-1 text-lg font-bold text-[#111111]">{usedFactors.map(key => factorNames[key] || key).join(" + ") || "Select an available factor"}</p></article>
          <article className="rounded-xl border border-[#E5E5E5] bg-white p-4"><span className="text-[11px] text-[#777777]">Ranked places</span><p className="mt-1 text-lg font-bold text-[#111111]">{validRanked.length}</p></article>
          <article className="rounded-xl border border-[#E5E5E5] bg-white p-4"><span className="text-[11px] text-[#777777]">Top available result</span><p className="mt-1 text-lg font-bold text-[#111111]">{validRanked[0]?.name || "No rank"}</p></article>
          <article className="rounded-xl border border-[#E5E5E5] bg-white p-4"><span className="text-[11px] text-[#777777]">Selected year</span><p className="mt-1 text-lg font-bold text-[#111111]">{year}</p></article>
        </div>

        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-relaxed text-amber-950">
          At least one weighted factor lacks usable observations for this view. The preview above reports active factor coverage without substituting synthetic values.
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 py-4 animate-fade-in sm:py-6">
      {/* Header Banner */}
      <div className="rounded-2xl border border-[#E5E5E5] bg-[#FAFAF8] p-6 sm:p-8">
        <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#B51F3B]">
          <Activity size={14} />
          <span>Statistical Diagnostics</span>
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight text-[#111111] sm:text-3xl">
          Statistical Insights & Empirical Findings
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#555555] sm:text-sm">
          Live regional scores, simple correlation views, and change flags computed
          directly from the data you selected. Linked to your custom weighting scheme.
        </p>

        {/* 4 KPIs */}
        <div className="mt-6 grid grid-cols-2 gap-4 border-t border-[#E5E5E5] pt-6 sm:grid-cols-4">
          {kpis.map(kpi => {
            const Icon = kpi.icon;
            return (
              <div key={kpi.label} className="flex flex-col">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#888888]">
                  <Icon size={13} className={kpi.tone} />
                  <span>{kpi.label}</span>
                </div>
                <div className="mt-1 font-mono text-2xl font-black text-[#111111] sm:text-3xl">
                  {kpi.value}
                </div>
                <div className="mt-0.5 text-[10px] text-[#777777]">{kpi.caption}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Regional Snapshot & Correlation Matrix */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Regional Snapshot */}
        <div className="rounded-2xl border border-[#E5E5E5] bg-white p-5 sm:p-6 lg:col-span-3">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 size={16} className="text-[#B51F3B]" />
              <h2 className="text-sm font-bold text-[#111111]">Regional Mean Distribution</h2>
            </div>
            <span className="text-[10px] text-[#888888]">{year} weighted mean</span>
          </div>

          <div className="flex flex-col gap-3">
            {stats.regions.map(region => (
              <div key={region.region} className="flex items-center gap-2">
                <span className="w-20 shrink-0 text-xs font-semibold text-[#444444]">
                  {region.region}
                </span>
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-[#E5E5E5]">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${region.average}%`, backgroundColor: getScoreColor(region.average) }}
                  />
                </div>
                <span className="w-10 shrink-0 text-right font-mono text-xs font-bold text-[#111111]">
                  {region.average.toFixed(1)}
                </span>
              </div>
            ))}
          </div>

          <p className="mt-4 border-t border-[#E5E5E5] pt-3 text-[11px] leading-relaxed text-[#777777]">
            Regional means pool states and cities based on observations at or before {year}.
            They represent descriptive summaries rather than causal effects.
          </p>
        </div>

        {/* Correlation Matrix */}
        <div className="rounded-2xl border border-[#E5E5E5] bg-white p-5 sm:p-6 lg:col-span-2">
          <div className="mb-1 flex items-center gap-2">
            <Grid3X3 size={16} className="text-[#B51F3B]" />
            <h2 className="text-sm font-bold text-[#111111]">Correlation Matrix</h2>
          </div>
          <p className="mb-3 text-[10px] text-[#888888]">Pearson r across live cross-section</p>

          <div className="grid grid-cols-5 gap-1.5 text-[10px]">
            <span />
            {FACTOR_LABELS.map(label => (
              <span key={label} className="truncate text-center font-bold text-[#777777]">
                {label}
              </span>
            ))}
            {correlationMatrix.map((row, rowIndex) => (
              <div key={`row-${rowIndex}`} className="contents">
                <span className="flex items-center font-bold text-[#777777]">
                  {FACTOR_LABELS[rowIndex]}
                </span>
                {row.map((value, columnIndex) => (
                  <span
                    key={`${rowIndex}-${columnIndex}`}
                    className="flex aspect-square items-center justify-center rounded-lg border border-[#E5E5E5] font-mono font-bold"
                    style={correlationStyle(value)}
                    title={
                      value === null
                        ? `${FACTOR_LABELS[rowIndex]} vs ${FACTOR_LABELS[columnIndex]}: insufficient pairs`
                        : `${FACTOR_LABELS[rowIndex]} vs ${FACTOR_LABELS[columnIndex]}: r = ${value}`
                    }
                  >
                    {value === null ? "—" : value.toFixed(2)}
                  </span>
                ))}
              </div>
            ))}
          </div>

          <p className="mt-4 text-[11px] leading-relaxed text-[#777777]">
            {strongestCorrelation
              ? `Strongest absolute association: ${FACTOR_LABELS[strongestCorrelation.row]} vs ${FACTOR_LABELS[strongestCorrelation.column]} (r = ${strongestCorrelation.value.toFixed(2)}).`
              : "Insufficient data pairs."}
          </p>
        </div>
      </div>

      {/* Key Diagnostic Findings Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {findings.map((finding, index) => (
          <div
            key={finding.title}
            className="flex flex-col justify-between rounded-2xl border border-[#E5E5E5] bg-white p-5 transition-shadow hover:shadow-xs"
          >
            <div>
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-[11px] font-bold text-[#666666]">
                  <CheckCircle2 size={13} className="text-[#B51F3B]" />
                  Finding #{index + 1}
                </span>
                <span className="rounded-full border border-[#E5E5E5] bg-[#FAFAF8] px-2 py-0.5 font-mono text-[10px] font-bold text-[#111111]">
                  {finding.stat}
                </span>
              </div>
              <h3 className="text-sm font-bold text-[#111111]">{finding.title}</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-[#555555]">{finding.summary}</p>
            </div>
            <div className="mt-3 rounded-xl border border-[#E5E5E5] bg-[#FAFAF8] p-3 text-[11px] leading-relaxed text-[#666666]">
              <strong className="mb-0.5 block font-semibold text-[#111111]">Interpretation:</strong>
              {finding.interpretation}
            </div>
          </div>
        ))}
      </div>

      {/* Pillar Provenance Table */}
      <div className="rounded-2xl border border-[#E5E5E5] bg-white p-5 sm:p-6">
        <div className="mb-4 flex items-center gap-2">
          <Layers className="text-[#B51F3B]" size={17} />
          <div>
            <h2 className="text-sm font-bold text-[#111111]">Pillar Provenance & Ground-Truth Coverage</h2>
            <p className="text-[10px] text-[#888888]">
              Source years and published origins behind every metric
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {provenance.map(item => (
            <div
              key={item.label}
              className="flex flex-col justify-between rounded-xl border border-[#E5E5E5] bg-[#FAFAF8] p-3.5"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-[#111111]">{item.label}</span>
                  <span className="rounded-full border border-[#E5E5E5] bg-white px-1.5 py-0.5 font-mono text-[10px] font-bold text-[#111111]">
                    {item.latest ?? "—"}
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-1 text-[11px] text-[#777777]">
                  <Database size={11} />
                  <span>{item.source}</span>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-[#555555]">{item.coverage}</p>
              </div>
              <p className="mt-2 border-t border-[#E5E5E5] pt-2 text-[10px] text-[#777777]">
                {item.note}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
