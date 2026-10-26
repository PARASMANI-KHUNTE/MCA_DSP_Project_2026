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
  MapPin,
  TrendingUp
} from "lucide-react";
import {
  DATA_COVERAGE,
  FACTOR_DEFS,
  OBSERVED_YEARS,
  getScoreColor
} from "../services/scoringService";

const CORRELATION_KEYS = ["air", "safety", "health", "economy"];
const FACTOR_LABELS = ["Air", "Safety", "Health", "Economy"];

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
  if (value === null) return { backgroundColor: "rgba(71,85,105,0.18)", color: "#94a3b8" };
  if (value === 1) return { backgroundColor: "rgba(148,163,184,0.18)", color: "#f8fafc" };
  const alpha = Math.min(0.52, 0.14 + Math.abs(value) * 0.5);
  return value >= 0
    ? { backgroundColor: `rgba(16,185,129,${alpha})`, color: "#ecfdf5" }
    : { backgroundColor: `rgba(244,63,94,${alpha})`, color: "#fff1f2" };
}

export default function InsightsView({ rankedPlaces = [], year = 2024 }) {
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
    const counts = DATA_COVERAGE.counts;

    return [
      {
        title: "Regional spread in the live composite",
        stat: bestRegion && worstRegion
          ? `${bestRegion.region} +${spread.toFixed(1)} pts`
          : "No regional sample",
        summary: bestRegion && worstRegion
          ? `${bestRegion.region} has the highest weighted regional mean (${bestRegion.average.toFixed(1)}); ${worstRegion.region} has the lowest (${worstRegion.average.toFixed(1)}).`
          : "Regional means cannot be computed for the current selection.",
        interpretation:
          "Regional means pool states and cities, so they describe this dataset rather than establish a causal regional effect. Change the weights to test how sensitive the ordering is."
      },
      {
        title: "Air and health association",
        stat: Number.isFinite(airHealth) ? `r = ${airHealth.toFixed(2)}` : "No overlap",
        summary: Number.isFinite(airHealth)
          ? `Pearson r between the normalized air and health pillars is ${airHealth.toFixed(2)} across places where both are observed.`
          : "Too few places have both air and health pillars in the current view.",
        interpretation:
          "State places have no city air observation, so this coefficient is effectively city-weighted. Correlation is not causation; income, industry and reporting quality can move both pillars."
      },
      {
        title: "Statistically flagged trends",
        stat: `${significant} of ${stats.trended} at p < 0.05`,
        summary: `${stats.improving} places are flagged improving and ${stats.declining} declining using composite OLS over ${OBSERVED_YEARS[0]}–${OBSERVED_YEARS[OBSERVED_YEARS.length - 1]} as-of scores.`,
        interpretation:
          "A trend is flagged only when the OLS slope is statistically distinguishable from zero at the 5% level. Places without enough yearly points remain labelled insufficient data rather than receiving a synthetic projection."
      },
      {
        title: "Observed coverage behind the scores",
        stat: `${counts.cities} cities · ${counts.states} states`,
        summary: `${counts.factorRows} place-year factor rows feed the interface, including ${counts.inheritedRows} city rows that inherit state safety, health or economy values.`,
        interpretation:
          "Air has no processed 2021–22 observations, while state indicators end in 2022 and are carried forward as the latest observed value. Every factor card shows its source year."
      }
    ];
  }, [correlationMatrix, stats]);

  const kpis = [
    {
      label: "Mean score",
      value: stats.average === null ? "—" : stats.average.toFixed(1),
      caption: `${scoredPlaces.length} scored places · ${year}`,
      icon: TrendingUp,
      tone: "text-emerald-300"
    },
    {
      label: "Top ranked",
      value: stats.top?.name || "—",
      caption: stats.top ? `${stats.top.region} · ${stats.top.overallScore}` : "No scored places",
      icon: MapPin,
      tone: "text-amber-300"
    },
    {
      label: "Improving",
      value: stats.improving,
      caption: "p < 0.05 positive slope",
      icon: ArrowUpRight,
      tone: "text-cyan-300"
    },
    {
      label: "Declining",
      value: stats.declining,
      caption: "p < 0.05 negative slope",
      icon: ArrowDownRight,
      tone: "text-rose-300"
    }
  ];

  const counts = DATA_COVERAGE.counts;
  const factorRows = counts.factorRowsByFactor || {};
  const inheritedRows = counts.inheritedByFactor || {};
  const provenance = [
    {
      label: "Air quality",
      source: FACTOR_DEFS.air.source,
      latest: DATA_COVERAGE.lastYearByFactor.air,
      coverage: `${counts.airCityYears} city-years across ${counts.cities} cities`,
      note: "No processed 2021–22 observations; 2015–19 and 2023–24 are separate source series."
    },
    {
      label: "Public safety",
      source: FACTOR_DEFS.safety.source,
      latest: DATA_COVERAGE.lastYearByFactor.safety,
      coverage: `${factorRows.safety ?? 0} rows, ${inheritedRows.safety ?? 0} inherited by cities`,
      note: "State crime rates are used for cities; metro tables are not mixed into state rates."
    },
    {
      label: "Healthcare",
      source: FACTOR_DEFS.health.source,
      latest: DATA_COVERAGE.lastYearByFactor.health,
      coverage: `${factorRows.health ?? 0} rows, ${inheritedRows.health ?? 0} inherited by cities`,
      note: "State infant mortality is inherited by cities; SRS reporting lags by roughly three years."
    },
    {
      label: "Economy & jobs",
      source: FACTOR_DEFS.economy.source,
      latest: DATA_COVERAGE.lastYearByFactor.economy,
      coverage: `${factorRows.per_capita_nsdp_constant ?? 0} NSDP + ${factorRows.unemployment_rate ?? 0} unemployment rows`,
      note: "State indicators exist only for 2018 and 2022 in this processed dataset."
    },
    {
      label: "Cost of living",
      source: FACTOR_DEFS.col.source,
      latest: DATA_COVERAGE.lastYearByFactor.col,
      coverage: `${counts.costSnapshots} metro snapshots`,
      note: "A single 2022 rent snapshot for six cities; it is never projected."
    }
  ];

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 sm:gap-5">
      <div className="surface overflow-hidden">
        <div className="border-b border-slate-800/70 bg-gradient-to-r from-emerald-500/10 via-transparent to-cyan-500/10 p-5 sm:p-7">
          <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-400">
            <Activity size={14} />
            Real-data diagnostics
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
            Statistical Insights & Data Coverage
          </h1>
          <p className="mt-2 max-w-2xl text-xs leading-relaxed text-slate-400 sm:text-sm">
            Live regional means, pairwise correlations and trend diagnostics computed from the processed
            dataset. Every figure responds to your current weights and selected year.
          </p>
        </div>

        <div className="grid grid-cols-2 divide-x divide-slate-800/70 border-t border-slate-800/70 sm:grid-cols-4">
          {kpis.map(kpi => {
            const Icon = kpi.icon;
            return (
              <div key={kpi.label} className="p-3.5 sm:p-4">
                <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-slate-500">
                  <Icon size={12} className={kpi.tone} />
                  {kpi.label}
                </div>
                <div className="mt-1 truncate text-xl font-black text-white sm:text-2xl">{kpi.value}</div>
                <div className="truncate text-[10px] text-slate-500">{kpi.caption}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="surface p-4 sm:p-5 lg:col-span-3">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 size={16} className="text-cyan-400" />
              <h2 className="text-sm font-bold text-white">Regional snapshot</h2>
            </div>
            <span className="text-[10px] text-slate-500">{year} weighted mean</span>
          </div>

          <div className="flex flex-col gap-2.5">
            {stats.regions.map(region => (
              <div key={region.region} className="flex items-center gap-2">
                <span className="w-16 shrink-0 text-[10px] font-semibold text-slate-400 sm:w-20">
                  {region.region}
                </span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-800/80">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${region.average}%`, backgroundColor: getScoreColor(region.average) }}
                  />
                </div>
                <span className="w-8 shrink-0 text-right font-mono text-[10px] font-bold text-slate-300">
                  {region.average.toFixed(1)}
                </span>
              </div>
            ))}
          </div>
          <p className="mt-3 border-t border-slate-800/70 pt-2 text-[10px] leading-relaxed text-slate-500">
            Regional means pool states and cities and use the latest observation at or before {year}.
            They are descriptive summaries, not tests of a causal regional effect.
          </p>
        </div>

        <div className="surface p-4 sm:p-5 lg:col-span-2">
          <div className="mb-1 flex items-center gap-2">
            <Grid3X3 size={16} className="text-purple-400" />
            <h2 className="text-sm font-bold text-white">Correlation matrix</h2>
          </div>
          <p className="mb-3 text-[10px] text-slate-500">Pearson r · live cross-section</p>

          <div className="grid grid-cols-5 gap-1 text-[9px]">
            <span />
            {FACTOR_LABELS.map(label => (
              <span key={label} className="truncate text-center font-semibold text-slate-500">
                {label}
              </span>
            ))}
            {correlationMatrix.map((row, rowIndex) => (
              <div key={`row-${rowIndex}`} className="contents">
                <span className="flex items-center font-semibold text-slate-500">
                  {FACTOR_LABELS[rowIndex]}
                </span>
                {row.map((value, columnIndex) => (
                  <span
                    key={`${rowIndex}-${columnIndex}`}
                    className="flex aspect-square items-center justify-center rounded-md font-mono font-bold"
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
          <p className="mt-3 text-[10px] leading-relaxed text-slate-500">
            {strongestCorrelation
              ? `Strongest absolute association: ${FACTOR_LABELS[strongestCorrelation.row]} vs ${FACTOR_LABELS[strongestCorrelation.column]} (r = ${strongestCorrelation.value.toFixed(2)}). Correlation is not causation.`
              : "Not enough complete factor pairs are available under the current weights."}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {findings.map((finding, index) => (
          <div
            key={finding.title}
            className="surface flex flex-col justify-between p-4 transition-colors hover:border-slate-700 sm:p-5"
          >
            <div>
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400">
                  <CheckCircle2 size={13} className="text-emerald-400" />
                  Diagnostic #{index + 1}
                </span>
                <span className="rounded-full border border-slate-700 bg-slate-800/80 px-2 py-0.5 font-mono text-[9px] font-bold text-cyan-300">
                  {finding.stat}
                </span>
              </div>
              <h3 className="text-sm font-bold text-white">{finding.title}</h3>
              <p className="mt-1.5 text-[11px] leading-relaxed text-slate-300">{finding.summary}</p>
            </div>
            <div className="mt-3 rounded-lg border border-slate-800/80 bg-slate-950/50 p-2.5 text-[10px] leading-relaxed text-slate-400">
              <strong className="mb-0.5 block font-semibold text-slate-200">Interpretation</strong>
              {finding.interpretation}
            </div>
          </div>
        ))}
      </div>

      <div className="surface p-4 sm:p-6">
        <div className="mb-4 flex items-center gap-2">
          <Layers className="text-purple-400" size={17} />
          <div>
            <h2 className="text-sm font-bold text-white">Pillar provenance & coverage</h2>
            <p className="text-[10px] text-slate-500">
              Source years and inheritance behind the current scores
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {provenance.map(item => (
            <div
              key={item.label}
              className="flex flex-col justify-between rounded-xl border border-slate-800/80 bg-slate-950/40 p-3.5"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-white">{item.label}</span>
                  <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-1.5 py-0.5 font-mono text-[9px] font-bold text-cyan-300">
                    {item.latest ?? "—"}
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-1 text-[10px] text-slate-500">
                  <Database size={10} />
                  {item.source}
                </div>
                <p className="mt-2 text-[10px] leading-relaxed text-slate-300">{item.coverage}</p>
              </div>
              <p className="mt-2 border-t border-slate-800 pt-2 text-[9px] leading-relaxed text-slate-500">
                {item.note}
              </p>
            </div>
          ))}
        </div>

        <p className="mt-3 flex items-start gap-1.5 rounded-lg border border-slate-800/80 bg-slate-950/40 p-2.5 text-[10px] leading-relaxed text-slate-400">
          <Database size={12} className="mt-0.5 shrink-0 text-cyan-400" />
          K-Means profiles are intentionally omitted: the stored cluster assignments do not match the saved
          K-Means evaluation results. Tier coloring therefore uses live score bands, not cluster labels.
        </p>
      </div>

      <p className="pb-2 text-center text-[10px] text-slate-600">
        Figures combine published CPCB, NCRB, SRS, RBI, MoSPI and Kaggle indicators. Treat rankings as decision
        support, not a definitive verdict on a place.
      </p>
    </div>
  );
}
