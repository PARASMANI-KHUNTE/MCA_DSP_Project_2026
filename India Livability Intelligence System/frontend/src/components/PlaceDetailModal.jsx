import { useEffect, useRef } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  ChevronRight,
  Coins,
  HeartPulse,
  MapPin,
  Minus,
  Scale,
  ShieldAlert,
  TrendingUp,
  Wind,
  X
} from "lucide-react";
import Modal from "./Modal";
import { BASELINE_YEAR, OBSERVED_YEARS, PROJECTION_END_YEAR, getScoreColor, getTierColor } from "../services/scoringService";

const FACTOR_CARDS = [
  { key: "air", label: "Air Quality", source: "Local PM2.5 input · source unverified", icon: Wind, color: "#0284c7" },
  { key: "safety", label: "Public Safety", source: "Unavailable · former placeholder quarantined", icon: ShieldAlert, color: "#e11d48" },
  { key: "health", label: "Healthcare", source: "Unavailable · former placeholder quarantined", icon: HeartPulse, color: "#16a34a" },
  { key: "economy", label: "Economy", source: "Unavailable · former placeholders quarantined", icon: TrendingUp, color: "#d97706" },
  { key: "col", label: "Cost of Living", source: "Local rent snapshot · source unverified", icon: Coins, color: "#9333ea" }
];

function OutlookBadge({ outlook }) {
  if (outlook === "Improving") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
        <ArrowUpRight size={11} /> Improving
      </span>
    );
  }
  if (outlook === "Declining") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-800">
        <ArrowDownRight size={11} /> Declining
      </span>
    );
  }
  if (outlook === "Insufficient data") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-[#E5E5E5] bg-[#FAFAF8] px-2 py-0.5 text-[10px] font-bold text-[#777777]">
        <Minus size={11} /> Insufficient data
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800">
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
  const plotHistory = history.filter(point => Number.isFinite(point.score) && point.trendEligible);
  const plotProjections = projections.filter(point => Number.isFinite(point.score));
  const allPoints = [...plotHistory, ...plotProjections];

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: 0 });
  }, [place?.id]);

  if (!place) return null;

  const scoreColor = getScoreColor(place.overallScore);
  const tierColor = getTierColor(place.tier);

  const selectedPoint = allPoints.find(point => point.year === year) || null;
  const baselinePoint = history.find(point => point.year === BASELINE_YEAR) || null;
  const finalPoint = plotProjections.length ? plotProjections[plotProjections.length - 1] : null;
  const hasChart = plotHistory.length >= 2 || plotProjections.length > 0;
  const hasProjection = plotHistory.length > 0 && plotProjections.length > 0;

  const totalWeight = Object.values(weights).reduce((total, value) => total + Number(value || 0), 0);
  const weightPct = factor => {
    if (!totalWeight) return 0;
    return Math.round((Number(weights[factor] || 0) / totalWeight) * 100);
  };

  const stateCities = allPlaces.filter(candidate => candidate.type === "city" && candidate.state === place.name);

  const svgWidth = 640;
  const svgHeight = 220;
  const padLeft = 40;
  const padRight = 24;
  const padTop = 24;
  const padBottom = 32;
  const chartW = svgWidth - padLeft - padRight;
  const chartH = svgHeight - padTop - padBottom;

  const allScores = [
    ...plotHistory.map(p => p.score),
    ...plotProjections.flatMap(p => [p.score, p.lower, p.upper].filter(Number.isFinite))
  ];
  const minVal = allScores.length ? Math.max(0, Math.floor(Math.min(...allScores) / 10) * 10 - 5) : 0;
  const maxVal = allScores.length ? Math.min(100, Math.ceil(Math.max(...allScores) / 10) * 10 + 5) : 100;
  const valRange = Math.max(10, maxVal - minVal);

  const totalPoints = Math.max(1, allPoints.length - 1);
  const getX = index => padLeft + (index / totalPoints) * chartW;
  const getY = value => padTop + chartH - ((value - minVal) / valRange) * chartH;

  const historyPath = plotHistory
    .map((point, index) => `${index === 0 ? "M" : "L"} ${getX(index)} ${getY(point.score)}`)
    .join(" ");

  const startIndex = plotHistory.length - 1;
  const projectionPath = hasProjection
    ? [
        `M ${getX(startIndex)} ${getY(plotHistory[startIndex].score)}`,
        ...plotProjections.map((point, index) => `L ${getX(startIndex + 1 + index)} ${getY(point.score)}`)
      ].join(" ")
    : "";

  const bandUpper = plotProjections.map((p, index) => `${index === 0 ? "M" : "L"} ${getX(startIndex + 1 + index)} ${getY(p.upper)}`).join(" ");
  const bandLower = [...plotProjections].reverse().map(p => `L ${getX(startIndex + 1 + plotProjections.indexOf(p))} ${getY(p.lower)}`).join(" ");
  const bandPath = hasProjection && plotProjections.length ? `${bandUpper} ${bandLower} Z` : "";

  const selectedIndex = allPoints.findIndex(point => point.year === year);
  const baselineIndex = allPoints.findIndex(point => point.year === BASELINE_YEAR);

  const slopeAvailable = Number.isFinite(place.slope);
  const pValueText = Number.isFinite(place.trend?.pValue)
    ? place.trend.pValue < 0.001
      ? "< 0.001"
      : place.trend.pValue.toFixed(3)
    : "—";

  return (
    <Modal onClose={onClose} label={`${place.name} details`} className="max-w-4xl">
      {/* Modal Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E5E5E5] bg-[#FAFAF8] p-4 sm:p-6">
        <div className="flex min-w-0 items-center gap-3.5">
          <div
            className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-2xl font-black text-white shadow-sm"
            style={{ backgroundColor: scoreColor }}
          >
            <span className="text-xl leading-none">{place.overallScore ?? "—"}</span>
            <span className="mt-0.5 text-[8px] uppercase tracking-wider opacity-90">{year}</span>
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate text-xl font-extrabold text-[#111111] sm:text-2xl">{place.name}</h2>
              <span
                className="rounded-full px-2.5 py-0.5 text-[10px] font-bold text-white shadow-xs"
                style={{ backgroundColor: tierColor }}
              >
                {place.tier?.split(":")[0] || "Unclassified"}
              </span>
              <OutlookBadge outlook={place.outlook} />
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-2.5 text-xs text-[#666666]">
              <span className="flex items-center gap-1">
                <MapPin size={12} className="text-[#B51F3B]" />
                {place.type === "city" ? `${place.state} · City` : `${place.region} · State`}
              </span>
              <span>·</span>
              <span className="font-bold text-[#111111]">
                {place.rank ? `Rank #${place.rank}` : "Unranked"}
              </span>
              <span>·</span>
              <span>
                {slopeAvailable ? (
                  <>
                    OLS slope:{" "}
                    <strong className={place.slope >= 0 ? "text-emerald-700" : "text-[#B51F3B]"}>
                      {place.slope > 0 ? "+" : ""}{place.slope}
                    </strong>{" "}
                    pts/yr
                  </>
                ) : (
                  "Insufficient trend points"
                )}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onToggleCompare(place)}
            className={`flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-semibold transition-all ${
              isComparing
                ? "bg-[#B51F3B] text-white border-transparent shadow-xs"
                : "border-[#E5E5E5] bg-white text-[#111111] hover:border-[#D4D4D4] hover:bg-[#FAFAF8]"
            }`}
          >
            <Scale size={13} />
            {isComparing ? "In Compare Tray" : "Add to Compare"}
          </button>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-[#888888] hover:bg-[#E5E5E5] hover:text-[#111111]"
            aria-label="Close details"
          >
            <X size={17} />
          </button>
        </div>
      </div>

      <div ref={bodyRef} className="custom-scrollbar flex-1 overflow-y-auto">
        <div className="flex flex-col gap-6 p-5 sm:p-6">
          {/* Key Metric Tiles */}
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
            <div className="rounded-xl border border-[#E5E5E5] bg-[#FAFAF8] p-3">
              <span className="eyebrow text-[#888888]">Baseline {BASELINE_YEAR}</span>
              <div className="mt-1 font-mono text-xl font-black text-[#111111]">
                {baselinePoint?.score ?? "—"}
              </div>
            </div>
            <div className="rounded-xl border border-[#E5E5E5] bg-[#FAFAF8] p-3">
              <span className="eyebrow text-[#888888]">Selected {year}</span>
              <div className="mt-1 font-mono text-xl font-black text-[#B51F3B]">
                {selectedPoint?.score ?? "—"}
              </div>
            </div>
            <div className="rounded-xl border border-[#E5E5E5] bg-[#FAFAF8] p-3">
              <span className="eyebrow text-[#888888]">{PROJECTION_END_YEAR ?? "10-year"} Projection</span>
              <div className="mt-1 font-mono text-xl font-black text-[#111111]">
                {finalPoint?.score ?? "—"}
              </div>
            </div>
            <div className="rounded-xl border border-[#E5E5E5] bg-[#FAFAF8] p-3">
              <span className="eyebrow text-[#888888]">Trend p-value</span>
              <div className="mt-1 font-mono text-xl font-black text-[#111111]">
                {pValueText}
              </div>
            </div>
            <div className="rounded-xl border border-[#E5E5E5] bg-[#FAFAF8] p-3 col-span-2 sm:col-span-1">
              <span className="eyebrow text-[#888888]">Available Pillars</span>
              <div className="mt-1 font-mono text-xl font-black text-[#111111]">
                {place.availablePillars ?? 0}/5
              </div>
            </div>
          </div>

          {/* Pillar Breakdown */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="eyebrow text-[#888888]">Pillar Breakdown & Ground-Truth Years</h3>
              <span className="text-xs text-[#888888]">Total Weight: {totalWeight}</span>
            </div>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
              {FACTOR_CARDS.map(card => {
                const Icon = card.icon;
                const value = place.factorScores?.[card.key];
                const hasValue = value !== null && value !== undefined;
                const sourceYear = place.factorYears?.[card.key];

                return (
                  <div key={card.key} className="rounded-xl border border-[#E5E5E5] bg-white p-3 flex flex-col justify-between gap-2">
                    <div className="flex items-start justify-between gap-1">
                      <span className="flex items-center gap-1 text-[11px] font-bold" style={{ color: card.color }}>
                        <Icon size={12} />
                        {card.label}
                      </span>
                      <span className="rounded bg-[#FAFAF8] border border-[#E5E5E5] px-1.5 py-0.5 text-[9px] font-semibold text-[#666666]">
                        {sourceYear ?? "No data"}
                      </span>
                    </div>
                    <div className="flex items-end justify-between">
                      <span className="font-mono text-2xl font-black text-[#111111]">
                        {hasValue ? value : "—"}
                      </span>
                      <span className="text-[10px] font-medium text-[#888888]">
                        {weightPct(card.key)}% wt
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#E5E5E5]">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${hasValue ? value : 0}%`, backgroundColor: card.color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Major Cities in State (if State) */}
          {place.type === "state" && (
            <div>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="eyebrow text-[#888888]">Major Cities in {place.name}</h3>
                <span className="text-xs text-[#888888]">{stateCities.length} tracked</span>
              </div>
              {stateCities.length ? (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {stateCities.map(city => (
                    <button
                      key={city.id}
                      onClick={() => onSelectPlace(city)}
                      className="group flex items-center justify-between gap-2 rounded-xl border border-[#E5E5E5] bg-white px-3.5 py-2.5 text-left transition-colors hover:border-[#111111] hover:bg-[#FAFAF8]"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-xs font-bold text-[#111111] group-hover:text-[#B51F3B]">
                          {city.name}
                        </span>
                        <span className="text-[11px] text-[#777777]">
                          Rank #{city.rank} · {city.outlook}
                        </span>
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span
                          className="rounded-lg px-2 py-0.5 text-xs font-bold text-white shadow-xs"
                          style={{ backgroundColor: getScoreColor(city.overallScore) }}
                        >
                          {city.overallScore}
                        </span>
                        <ChevronRight size={13} className="text-[#888888] group-hover:text-[#111111]" />
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="rounded-xl border border-[#E5E5E5] bg-[#FAFAF8] p-3 text-xs text-[#777777]">
                  No major metropolitan cities are isolated in this state's direct scope.
                </p>
              )}
            </div>
          )}

          {/* Historical Trajectory & OLS Projection */}
          <div>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <h3 className="eyebrow text-[#888888]">Temporal Trajectory & OLS Trend</h3>
              <div className="flex flex-wrap items-center gap-3 text-[10px] text-[#666666]">
                <span className="flex items-center gap-1">
                  <span className="h-1 w-3 rounded-full bg-[#111111]" /> Eligible observed years
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-1 w-3 rounded-full bg-[#B51F3B]" /> Projected after the latest eligible observation
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-sm bg-[#B51F3B]/15" /> 95% Confidence Band
                </span>
              </div>
            </div>

            {hasChart ? (
              <div className="rounded-2xl border border-[#E5E5E5] bg-[#FAFAF8] p-3 sm:p-4">
                <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="h-auto w-full" role="img" aria-label={`Score history and projection for ${place.name}`}>
                  {[20, 40, 60, 80, 100].map(value => (
                    <g key={value}>
                      <line
                        x1={padLeft}
                        y1={getY(value)}
                        x2={svgWidth - padRight}
                        y2={getY(value)}
                        stroke="#E5E5E5"
                        strokeDasharray="3,4"
                      />
                      <text
                        x={padLeft - 8}
                        y={getY(value) + 3}
                        fill="#888888"
                        textAnchor="end"
                        className="text-[10px] font-mono"
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
                        stroke="#B51F3B"
                        strokeDasharray="3,3"
                        strokeOpacity="0.4"
                      />
                      <text
                        x={getX(baselineIndex)}
                        y={padTop - 6}
                        fill="#B51F3B"
                        textAnchor="middle"
                        className="text-[9px] font-bold"
                      >
                        {BASELINE_YEAR} Anchor
                      </text>
                    </>
                  )}

                  {hasProjection && (
                    <>
                      <path d={bandPath} fill="#B51F3B" fillOpacity="0.08" stroke="none" />
                      <path d={projectionPath} fill="none" stroke="#B51F3B" strokeWidth="2.2" strokeDasharray="4,4" />
                    </>
                  )}

                  {plotHistory.length > 1 && (
                    <path d={historyPath} fill="none" stroke="#111111" strokeWidth="2.4" />
                  )}

                  {plotHistory.map((point, index) => (
                    <circle
                      key={point.year}
                      cx={getX(index)}
                      cy={getY(point.score)}
                      r={point.isCovid ? 4 : 3}
                      fill={point.isCovid ? "#d97706" : "#111111"}
                      stroke="#FFFFFF"
                      strokeWidth="1.5"
                    >
                      <title>{`${point.year}: ${point.score}${point.isCovid ? " (COVID shock)" : ""}`}</title>
                    </circle>
                  ))}

                  {plotProjections.map((point, index) => (
                    <circle
                      key={point.year}
                      cx={getX(startIndex + 1 + index)}
                      cy={getY(point.score)}
                      r="3"
                      fill="#B51F3B"
                      stroke="#FFFFFF"
                      strokeWidth="1.5"
                    >
                      <title>{`${point.year}: ${point.score} (95% CI ${point.lower}–${point.upper})`}</title>
                    </circle>
                  ))}

                  {selectedIndex >= 0 && (
                    <g>
                      <line
                        x1={getX(selectedIndex)}
                        y1={padTop}
                        x2={getX(selectedIndex)}
                        y2={padTop + chartH}
                        stroke="#111111"
                        strokeWidth="1.2"
                        strokeDasharray="4,3"
                      />
                      <circle
                        cx={getX(selectedIndex)}
                        cy={getY(allPoints[selectedIndex].score)}
                        r="5"
                        fill={year > BASELINE_YEAR ? "#B51F3B" : "#111111"}
                        stroke="#FFFFFF"
                        strokeWidth="2"
                      />
                      <text
                        x={getX(selectedIndex)}
                        y={padTop + chartH + 16}
                        fill="#111111"
                        fontWeight="800"
                        textAnchor="middle"
                        className="text-[10px] font-mono"
                      >
                        {year}
                      </text>
                    </g>
                  )}

                  {[OBSERVED_YEARS?.[0], BASELINE_YEAR, PROJECTION_END_YEAR].filter(Number.isFinite).map(labelYear => {
                    if (labelYear === year) return null;
                    const pointIndex = allPoints.findIndex(point => point.year === labelYear);
                    if (pointIndex === -1) return null;
                    return (
                      <text
                        key={labelYear}
                        x={getX(pointIndex)}
                        y={padTop + chartH + 16}
                        fill="#888888"
                        textAnchor="middle"
                        className="text-[9px] font-mono"
                      >
                        {labelYear}
                      </text>
                    );
                  })}
                </svg>
              </div>
            ) : (
              <div className="rounded-xl border border-[#E5E5E5] bg-[#FAFAF8] p-4 text-xs text-[#777777]">
                Insufficient historical points to establish an OLS projection.
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
