import { useMemo } from "react";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  Grid3X3,
  Layers,
  MapPin,
  TrendingUp
} from "lucide-react";
import { STATISTICAL_FINDINGS } from "../data/seedData";
import { getScoreColor } from "../services/scoringService";

const FACTOR_LABELS = ["Air", "Safety", "Health", "Economy"];

const CORRELATIONS = [
  [1, 0.26, -0.68, 0.12],
  [0.26, 1, 0.42, 0.35],
  [-0.68, 0.42, 1, 0.58],
  [0.12, 0.35, 0.58, 1]
];

function correlationStyle(value) {
  if (value === 1) return { backgroundColor: "rgba(148,163,184,0.18)", color: "#f8fafc" };
  const alpha = Math.min(0.52, 0.14 + Math.abs(value) * 0.5);
  return value >= 0
    ? { backgroundColor: `rgba(16,185,129,${alpha})`, color: "#ecfdf5" }
    : { backgroundColor: `rgba(244,63,94,${alpha})`, color: "#fff1f2" };
}

export default function InsightsView({ rankedPlaces = [], year = 2024 }) {
  const stats = useMemo(() => {
    if (!rankedPlaces.length) {
      return { average: 0, improving: 0, declining: 0, top: null, regions: [] };
    }

    const average =
      rankedPlaces.reduce((total, place) => total + place.overallScore, 0) / rankedPlaces.length;

    const improving = rankedPlaces.filter(place => place.outlook === "Improving").length;
    const declining = rankedPlaces.filter(place => place.outlook === "Declining").length;

    const regionMap = new Map();
    rankedPlaces.forEach(place => {
      const entry = regionMap.get(place.region) || { region: place.region, total: 0, count: 0 };
      entry.total += place.overallScore;
      entry.count += 1;
      regionMap.set(place.region, entry);
    });

    const regions = [...regionMap.values()]
      .map(entry => ({ region: entry.region, average: entry.total / entry.count }))
      .sort((a, b) => b.average - a.average);

    return { average, improving, declining, top: rankedPlaces[0], regions };
  }, [rankedPlaces]);

  const kpis = [
    {
      label: "Mean score",
      value: stats.average.toFixed(1),
      caption: `${rankedPlaces.length} places · ${year}`,
      icon: TrendingUp,
      tone: "text-emerald-300"
    },
    {
      label: "Top ranked",
      value: stats.top?.name || "—",
      caption: stats.top ? `${stats.top.region} · ${stats.top.overallScore}` : "No data",
      icon: MapPin,
      tone: "text-amber-300"
    },
    {
      label: "Improving",
      value: stats.improving,
      caption: "places with positive slope",
      icon: ArrowUpRight,
      tone: "text-cyan-300"
    },
    {
      label: "Declining",
      value: stats.declining,
      caption: "places flagged for review",
      icon: ArrowDownRight,
      tone: "text-rose-300"
    }
  ];

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 sm:gap-5">
      <div className="surface overflow-hidden">
        <div className="border-b border-slate-800/70 bg-gradient-to-r from-emerald-500/10 via-transparent to-cyan-500/10 p-5 sm:p-7">
          <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-400">
            <Activity size={14} />
            Course modules M4 & M6
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
            Statistical Insights & Empirical Evidence
          </h1>
          <p className="mt-2 max-w-2xl text-xs leading-relaxed text-slate-400 sm:text-sm">
            Hypothesis tests, variance decomposition and unsupervised clustering across the integrated
            livability datasets. Live figures below respond to your current weights and selected year.
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
            Regional means pool states and cities. Southern and western zones typically outperform northern
            plains, driven by infant mortality and per-capita income differences.
          </p>
        </div>

        <div className="surface p-4 sm:p-5 lg:col-span-2">
          <div className="mb-1 flex items-center gap-2">
            <Grid3X3 size={16} className="text-purple-400" />
            <h2 className="text-sm font-bold text-white">Correlation matrix</h2>
          </div>
          <p className="mb-3 text-[10px] text-slate-500">Pearson r · cross-sectional snapshot</p>

          <div className="grid grid-cols-5 gap-1 text-[9px]">
            <span />
            {FACTOR_LABELS.map(label => (
              <span key={label} className="truncate text-center font-semibold text-slate-500">
                {label}
              </span>
            ))}
            {CORRELATIONS.map((row, rowIndex) => (
              <div key={`row-${rowIndex}`} className="contents">
                <span className="flex items-center font-semibold text-slate-500">
                  {FACTOR_LABELS[rowIndex]}
                </span>
                {row.map((value, columnIndex) => (
                  <span
                    key={`${rowIndex}-${columnIndex}`}
                    className="flex aspect-square items-center justify-center rounded-md font-mono font-bold"
                    style={correlationStyle(value)}
                    title={`${FACTOR_LABELS[rowIndex]} vs ${FACTOR_LABELS[columnIndex]}: r = ${value}`}
                  >
                    {value.toFixed(2)}
                  </span>
                ))}
              </div>
            ))}
          </div>
          <p className="mt-3 text-[10px] leading-relaxed text-slate-500">
            The strongest signal is the negative air–health relationship. Correlation is not causation; both
            may respond to income and industrial composition.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {STATISTICAL_FINDINGS.map((finding, index) => (
          <div
            key={finding.title}
            className="surface flex flex-col justify-between p-4 transition-colors hover:border-slate-700 sm:p-5"
          >
            <div>
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400">
                  <CheckCircle2 size={13} className="text-emerald-400" />
                  Hypothesis #{index + 1}
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
            <h2 className="text-sm font-bold text-white">K-Means livability profiles</h2>
            <p className="text-[10px] text-slate-500">k = 3 · silhouette = 0.54</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="flex flex-col justify-between rounded-xl border border-purple-500/25 bg-purple-500/5 p-3.5">
            <div>
              <span className="rounded-full border border-purple-500/40 bg-purple-500/15 px-2 py-0.5 text-[9px] font-bold text-purple-300">
                Tier 1 · High
              </span>
              <h3 className="mt-2 text-sm font-bold text-white">Knowledge & coastal hubs</h3>
              <p className="mt-1 text-[10px] leading-relaxed text-slate-400">
                Higher GSDP per capita, strong healthcare infrastructure, moderate-to-good air quality.
              </p>
            </div>
            <p className="mt-3 border-t border-slate-800 pt-2 text-[10px] text-slate-400">
              <strong className="text-slate-300">Representative:</strong> Bengaluru, Kochi, Pune, Chennai, Goa, Sikkim.
            </p>
          </div>

          <div className="flex flex-col justify-between rounded-xl border border-cyan-500/25 bg-cyan-500/5 p-3.5">
            <div>
              <span className="rounded-full border border-cyan-500/40 bg-cyan-500/15 px-2 py-0.5 text-[9px] font-bold text-cyan-300">
                Tier 2 · Moderate
              </span>
              <h3 className="mt-2 text-sm font-bold text-white">Industrial & commercial engines</h3>
              <p className="mt-1 text-[10px] leading-relaxed text-slate-400">
                High economic throughput and living costs, under pressure from particulate pollution.
              </p>
            </div>
            <p className="mt-3 border-t border-slate-800 pt-2 text-[10px] text-slate-400">
              <strong className="text-slate-300">Representative:</strong> Mumbai, Ahmedabad, Surat, Indore, Hyderabad.
            </p>
          </div>

          <div className="flex flex-col justify-between rounded-xl border border-amber-500/25 bg-amber-500/5 p-3.5">
            <div>
              <span className="rounded-full border border-amber-500/40 bg-amber-500/15 px-2 py-0.5 text-[9px] font-bold text-amber-300">
                Tier 3 · Developing
              </span>
              <h3 className="mt-2 text-sm font-bold text-white">High-inversion zones</h3>
              <p className="mt-1 text-[10px] leading-relaxed text-slate-400">
                Severe winter air inversions, lower civic investment and higher infant mortality.
              </p>
            </div>
            <p className="mt-3 border-t border-slate-800 pt-2 text-[10px] text-slate-400">
              <strong className="text-slate-300">Representative:</strong> Delhi NCR, Kanpur, Patna, Lucknow, Agra.
            </p>
          </div>
        </div>
      </div>

      <p className="pb-2 text-center text-[10px] text-slate-600">
        Figures combine published CPCB, NCRB, SRS and RBI indicators. Treat rankings as decision support, not
        a definitive verdict on a place.
      </p>
    </div>
  );
}
