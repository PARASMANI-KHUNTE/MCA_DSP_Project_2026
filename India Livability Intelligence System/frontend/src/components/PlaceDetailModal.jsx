import { useEffect, useRef } from "react";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  ChevronRight,
  Coins,
  HeartPulse,
  Info,
  Layers,
  MapPin,
  Minus,
  Scale,
  ShieldAlert,
  TrendingUp,
  Wind,
  X
} from "lucide-react";
import Modal from "./Modal";
import { getScoreColor, getTierColor } from "../services/scoringService";

const FACTOR_CARDS = [
  { key: "air", label: "Air Quality", source: "CPCB · PM2.5", icon: Wind, color: "#22d3ee" },
  { key: "safety", label: "Public Safety", source: "NCRB", icon: ShieldAlert, color: "#fb7185" },
  { key: "health", label: "Healthcare", source: "SRS · IMR", icon: HeartPulse, color: "#34d399" },
  { key: "economy", label: "Economy", source: "RBI · NSDP", icon: TrendingUp, color: "#fbbf24" },
  { key: "col", label: "Cost of Living", source: "6 metros · rent", icon: Coins, color: "#c084fc" }
];

function OutlookBadge({ outlook }) {
  if (outlook === "Improving") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
        <ArrowUpRight size={11} /> Improving
      </span>
    );
  }
  if (outlook === "Declining") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-rose-500/25 bg-rose-500/10 px-2 py-0.5 text-[10px] font-bold text-rose-300">
        <ArrowDownRight size={11} /> Declining
      </span>
    );
  }
  if (outlook === "Insufficient data") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-slate-500/25 bg-slate-500/10 px-2 py-0.5 text-[10px] font-bold text-slate-300">
        <Minus size={11} /> Insufficient data
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/25 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-300">
      <Minus size={11} /> Stable
    </span>
  );
}

export default function PlaceDetailModal({
  place,
  weights,
  year,
  onClose,
  onToggleCompare,
  isComparing,
  allPlaces = [],
  onSelectPlace
}) {
  const bodyRef = useRef(null);

  const history = place?.history || [];
  const projections = place?.projections || [];
  const plotHistory = history.filter(point => Number.isFinite(point.score));
  const plotProjections = projections.filter(point => Number.isFinite(point.score));
  const allPoints = [...plotHistory, ...plotProjections];

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: 0 });
  }, [place?.id]);

  if (!place) return null;

  const totalWeight =
    Number(weights?.air || 0) +
    Number(weights?.safety || 0) +
    Number(weights?.health || 0) +
    Number(weights?.economy || 0) +
    Number(weights?.col || 0);

  const weightPct = key => {
    if (!totalWeight) return 0;
    return Math.round((Number(weights?.[key] || 0) / totalWeight) * 100);
  };

  const selectedIndex = allPoints.findIndex(point => point.year === year);
  const selectedPoint = selectedIndex >= 0 ? allPoints[selectedIndex] : null;
  const baselineIndex = allPoints.findIndex(point => point.year === 2024);
  const baselinePoint = baselineIndex >= 0 ? allPoints[baselineIndex] : null;
  const finalPoint = plotProjections.length ? plotProjections[plotProjections.length - 1] : null;
  const hasChart = plotHistory.length >= 2 || plotProjections.length > 0;
  const hasProjection = plotHistory.length > 0 && plotProjections.length > 0;
  const slopeAvailable = Number.isFinite(place.slope);
  const pValueText = Number.isFinite(place.pVal)
    ? place.pVal < 0.001 ? "<0.001" : place.pVal.toFixed(3)
    : "—";

  const scoreColor = getScoreColor(place.overallScore);
  const tierColor = getTierColor(place.tier);
  const stateCities =
    place.type === "state"
      ? allPlaces.filter(city => city.type === "city" && city.state === place.name)
      : [];

  const svgWidth = 560;
  const svgHeight = 220;
  const padLeft = 38;
  const padRight = 22;
  const padTop = 22;
  const padBottom = 30;
  const chartW = svgWidth - padLeft - padRight;
  const chartH = svgHeight - padTop - padBottom;

  const denominator = Math.max(1, allPoints.length - 1);
  const getX = index => padLeft + (index / denominator) * chartW;
  const getY = value => padTop + chartH - (value / 100) * chartH;

  const historyPath = plotHistory
    .map((point, index) => `${index === 0 ? "M" : "L"} ${getX(index)} ${getY(point.score)}`)
    .join(" ");

  const startIndex = plotHistory.length - 1;
  const projectionPath = hasProjection
    ? [
        `M ${getX(startIndex)} ${getY(plotHistory[startIndex].score)}`,
        ...plotProjections.map(
          (point, index) => `L ${getX(startIndex + 1 + index)} ${getY(point.score)}`
        )
      ].join(" ")
    : "";

  const bandPath = hasProjection
    ? [
        `M ${getX(startIndex)} ${getY(plotHistory[startIndex].score)}`,
        ...plotProjections.map(
          (point, index) =>
            `L ${getX(startIndex + 1 + index)} ${getY(point.upper)}`
        ),
        ...[...plotProjections].reverse().map(
          (point, index) =>
            `L ${getX(startIndex + plotProjections.length - index)} ${getY(point.lower)}`
        ),
        "Z"
      ].join(" ")
    : "";

  return (
    <Modal onClose={onClose} label={`${place.name} livability details`} className="max-w-3xl">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-800/80 bg-slate-950/40 p-4 sm:p-5">
        <div className="flex min-w-0 items-start gap-3">
          <div
            className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl font-black shadow-lg"
            style={{ backgroundColor: scoreColor }}
          >
            <span className="text-lg leading-none text-slate-950">{place.overallScore ?? "—"}</span>
            <span className="mt-0.5 text-[8px] uppercase tracking-wide text-slate-950/70">{year}</span>
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate text-xl font-black tracking-tight text-white">{place.name}</h2>
              <span
                className="rounded-full px-2 py-0.5 text-[9px] font-bold text-slate-900"
                style={{ backgroundColor: tierColor }}
              >
                {place.tier?.split(":")[0] || "Unclassified"}
              </span>
              <OutlookBadge outlook={place.outlook} />
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-slate-400">
              <span className="flex items-center gap-1">
                <MapPin size={11} className="text-slate-500" />
                {place.type === "city" ? `${place.state} · City` : `${place.region} · State`}
              </span>
              <span className="text-slate-700">·</span>
              <span className="font-semibold text-emerald-400">
                {place.rank ? `Rank #${place.rank}` : "Unranked"}
              </span>
              <span className="text-slate-700">·</span>
              <span>
                {slopeAvailable ? (
                  <>
                    OLS slope{" "}
                    <strong className={place.slope >= 0 ? "text-emerald-300" : "text-rose-300"}>
                      {place.slope > 0 ? "+" : ""}{place.slope}
                    </strong>{" "}
                    pts/yr
                  </>
                ) : "Insufficient data for an OLS trend"}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onToggleCompare(place)}
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-[11px] font-semibold transition-all ${
              isComparing
                ? "border-emerald-400/60 bg-emerald-500 text-slate-950"
                : "border-slate-700 bg-slate-800/70 text-slate-300 hover:bg-slate-700"
            }`}
          >
            <Scale size={13} />
            {isComparing ? "In compare tray" : "Compare"}
          </button>
          <button
            onClick={onClose}
            className="icon-btn h-8 w-8"
            aria-label="Close details"
          >
            <X size={17} />
          </button>
        </div>
      </div>

      <div ref={bodyRef} className="custom-scrollbar flex-1 overflow-y-auto">
        <div className="flex flex-col gap-5 p-4 sm:p-5">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            <div className="surface-inset p-2.5">
              <span className="eyebrow">Baseline 2024</span>
              <div className="mt-1 text-lg font-black text-slate-100">{baselinePoint?.score ?? "—"}</div>
            </div>
            <div className="surface-inset p-2.5">
              <span className="eyebrow">Selected {year}</span>
              <div className="mt-1 text-lg font-black text-emerald-300">{selectedPoint?.score ?? "—"}</div>
            </div>
            <div className="surface-inset p-2.5">
              <span className="eyebrow">2034 projection</span>
              <div className="mt-1 text-lg font-black text-rose-300">{finalPoint?.score ?? "—"}</div>
            </div>
            <div className="surface-inset p-2.5">
              <span className="eyebrow">Trend p-value</span>
              <div className="mt-1 text-lg font-black text-slate-100">{pValueText}</div>
            </div>
            <div className="surface-inset col-span-2 p-2.5 sm:col-span-1">
              <span className="eyebrow">Pillars available</span>
              <div className="mt-1 flex items-center gap-1.5 text-lg font-black text-slate-100">
                <Layers size={14} className="text-slate-500" />
                {place.availablePillars ?? 0}/5
              </div>
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="eyebrow">Pillar breakdown</h3>
              <span className="text-[10px] text-slate-500">
                Weight sum {totalWeight}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
              {FACTOR_CARDS.map(card => {
                const Icon = card.icon;
                const value = place.factorScores?.[card.key];
                const hasValue = value !== null && value !== undefined;
                const sourceYear = place.factorYears?.[card.key];
                const sourceTag = sourceYear ?? "No data";

                return (
                  <div key={card.key} className="surface-soft flex flex-col justify-between gap-2 p-2.5">
                    <div className="flex items-start justify-between gap-1">
                      <span className="flex items-center gap-1 text-[10px] font-semibold" style={{ color: card.color }}>
                        <Icon size={12} />
                        {card.label}
                      </span>
                      <span
                        className="rounded bg-slate-800/80 px-1 py-0.5 text-[8px] font-medium text-slate-400"
                        title={sourceYear ? `Latest observation: ${sourceYear}` : "No observation available"}
                      >
                        {sourceTag}
                      </span>
                    </div>
                    <div className="flex items-end justify-between">
                      <span className="text-xl font-black leading-none text-slate-100">
                        {hasValue ? value : "—"}
                      </span>
                      <span className="text-[9px] font-medium text-slate-500">
                        {weightPct(card.key)}% wt
                      </span>
                    </div>
                    <div className="h-1 w-full overflow-hidden rounded-full bg-slate-800">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${hasValue ? value : 0}%`, backgroundColor: card.color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {place.type === "city" && (
              <div className="mt-2 flex items-start gap-2 rounded-xl border border-slate-800/80 bg-slate-950/40 p-2.5 text-[10px] leading-relaxed text-slate-400">
                <Info size={13} className="mt-0.5 shrink-0 text-cyan-400" />
                <span>
                  Air quality is measured from CPCB urban monitors in {place.name}. Safety, health and economy are
                  inherited from {place.state} state-level indicators and labelled accordingly.
                </span>
              </div>
            )}
          </div>

          {place.type === "state" && (
            <div>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="eyebrow">Major cities in {place.name}</h3>
                <span className="text-[10px] text-slate-500">{stateCities.length} tracked</span>
              </div>
              {stateCities.length ? (
                <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                  {stateCities.map(city => (
                    <button
                      key={city.id}
                      onClick={() => onSelectPlace(city)}
                      className="group flex items-center justify-between gap-2 rounded-xl border border-slate-800/80 bg-slate-950/40 px-3 py-2 text-left transition-colors hover:border-emerald-500/40 hover:bg-slate-800/50"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-xs font-semibold text-slate-200 group-hover:text-emerald-300">
                          {city.name}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          Rank #{city.rank} · {city.outlook}
                        </span>
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span
                          className="rounded-md px-1.5 py-0.5 text-[10px] font-bold text-slate-950"
                          style={{ backgroundColor: getScoreColor(city.overallScore) }}
                        >
                          {city.overallScore}
                        </span>
                        <ChevronRight size={13} className="text-slate-600 group-hover:text-emerald-400" />
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="surface-inset p-3 text-[11px] text-slate-500">
                  City-level detail is available only for major cities included in the project scope.
                </p>
              )}
            </div>
          )}

          <div>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <h3 className="eyebrow">Trajectory & OLS projection</h3>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[9px] text-slate-500">
                <span className="flex items-center gap-1">
                  <span className="h-0.5 w-3 rounded-full bg-cyan-400" /> History
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-0.5 w-3 rounded-full bg-rose-400" /> Projection
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-sm bg-rose-500/20" /> 95% band
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-sm bg-white" /> Selected year
                </span>
              </div>
            </div>

            {hasChart ? (
              <div className="surface-inset p-2 sm:p-3">
                <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="h-auto w-full" role="img" aria-label={`Score history and ten year projection for ${place.name}`}>
                  {[20, 40, 60, 80, 100].map(value => (
                    <g key={value}>
                      <line
                        x1={padLeft}
                        y1={getY(value)}
                        x2={svgWidth - padRight}
                        y2={getY(value)}
                        stroke="#1e293b"
                        strokeDasharray="2,4"
                      />
                      <text
                        x={padLeft - 8}
                        y={getY(value) + 3}
                        fill="#64748b"
                        textAnchor="end"
                        className="text-[16px] sm:text-[10px] lg:text-[8px]"
                      >
                        {value}
                      </text>
                    </g>
                  ))}

                  {baselineIndex >= 0 && (
                    <>
                      <line
                        x1={getX(baselineIndex)}
                        y1={padTop}
                        x2={getX(baselineIndex)}
                        y2={padTop + chartH}
                        stroke="#475569"
                        strokeDasharray="3,3"
                      />
                      <text
                        x={getX(baselineIndex)}
                        y={padTop - 6}
                        fill="#94a3b8"
                        textAnchor="middle"
                        className="text-[16px] sm:text-[10px] lg:text-[8px]"
                      >
                        Baseline 2024
                      </text>
                    </>
                  )}

                  {hasProjection && (
                    <>
                      <path d={bandPath} fill="#f43f5e" fillOpacity="0.14" stroke="none" />
                      <path d={projectionPath} fill="none" stroke="#f43f5e" strokeWidth="2.4" strokeDasharray="4,4" />
                    </>
                  )}
                  {plotHistory.length > 1 && (
                    <path d={historyPath} fill="none" stroke="#38bdf8" strokeWidth="2.4" />
                  )}

                  {plotHistory.map((point, index) => (
                    <circle
                      key={point.year}
                      cx={getX(index)}
                      cy={getY(point.score)}
                      r={point.isCovid ? 4 : 2.6}
                      fill={point.isCovid ? "#eab308" : "#38bdf8"}
                      stroke="#0f172a"
                      strokeWidth="1.4"
                    >
                      <title>{`${point.year}: ${point.score}${point.isCovid ? " (COVID lockdown)" : ""}`}</title>
                    </circle>
                  ))}

                  {plotProjections.map((point, index) => (
                    <circle
                      key={point.year}
                      cx={getX(startIndex + 1 + index)}
                      cy={getY(point.score)}
                      r="2.6"
                      fill="#f43f5e"
                      stroke="#0f172a"
                      strokeWidth="1.4"
                    >
                      <title>{`${point.year}: ${point.score} (approx. 95% interval ${point.lower}–${point.upper})`}</title>
                    </circle>
                  ))}

                  {selectedIndex >= 0 && (
                    <g>
                      <line
                        x1={getX(selectedIndex)}
                        y1={padTop}
                        x2={getX(selectedIndex)}
                        y2={padTop + chartH}
                        stroke="#f8fafc"
                        strokeOpacity="0.55"
                        strokeWidth="1.2"
                        strokeDasharray="4,3"
                      />
                      <circle
                        cx={getX(selectedIndex)}
                        cy={getY(allPoints[selectedIndex].score)}
                        r="5.5"
                        fill={year > 2024 ? "#fb7185" : "#38bdf8"}
                        stroke="#ffffff"
                        strokeWidth="2"
                      />
                      <text
                        x={getX(selectedIndex)}
                        y={padTop + chartH + 16}
                        fill="#f8fafc"
                        fontWeight="700"
                        textAnchor="middle"
                        className="text-[16px] sm:text-[10px] lg:text-[8px]"
                      >
                        {year}
                      </text>
                    </g>
                  )}

                  {[2015, 2020, 2024, 2029, 2034].map(labelYear => {
                    if (labelYear === year) return null;
                    const pointIndex = allPoints.findIndex(point => point.year === labelYear);
                    if (pointIndex === -1) return null;
                    return (
                      <text
                        key={labelYear}
                        x={getX(pointIndex)}
                        y={padTop + chartH + 16}
                        fill="#64748b"
                        textAnchor="middle"
                        className="text-[16px] sm:text-[10px] lg:text-[8px]"
                      >
                        {labelYear}
                      </text>
                    );
                  })}
                </svg>
              </div>
            ) : (
              <div className="surface-inset p-4 text-[11px] leading-relaxed text-slate-400">
                No chartable history is available for this place under the current weights. Increase a pillar
                with observed data or select a year covered by the source series.
              </div>
            )}
          </div>

          <div className="flex items-start gap-2 rounded-xl border border-amber-800/60 bg-amber-950/25 p-3 text-[10px] leading-relaxed text-amber-200/90">
            <AlertTriangle size={14} className="mt-0.5 shrink-0 text-amber-400" />
            <div>
              <strong className="font-semibold text-amber-300">Statistical disclaimer:</strong>{" "}
              Scores for 2015–2024 use the latest real observation at or before each year. Values for 2025–2034
              are OLS projections from those composite scores and are hidden when fewer than five yearly points
              exist. They do not model policy shifts, climate tipping points or future investment.
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
