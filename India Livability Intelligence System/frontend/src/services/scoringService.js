import { DATA } from "../data/realData.js";

export const PLACES = DATA.places;
export const FACTOR_DEFS = DATA.factorDefs;
export const DATA_COVERAGE = DATA.meta;
// Anchor the default view to the latest year with multi-factor observations
// rather than the most recent air year. Snapshot factors such as the
// cost-of-living index have their own observation year and are never treated
// as a time series.
export const BASELINE_YEAR = DATA.meta.baselineYear;
export const OBSERVED_YEARS = DATA.meta.years;
// Projections are disabled — all factors have trend: never in the config.
export const PROJECTION_END_YEAR = null;
export const PROJECTION_YEARS = [];

// A restrained status scale: lower scores are red, higher scores are green.
export const SCORE_BANDS = [
  { min: 80, color: "#15803d", label: "Very high" },
  { min: 70, color: "#22c55e", label: "High" },
  { min: 60, color: "#737373", label: "Moderate" },
  { min: 50, color: "#ca8a04", label: "Watch" },
  { min: 40, color: "#ea580c", label: "Low" },
  { min: 0, color: "#b91c1c", label: "Very low" }
];

// Low-to-high ordering of the same bands, used by legends and gradients.
export const SCORE_BANDS_ASC = [...SCORE_BANDS].sort((a, b) => a.min - b.min);

// Smooth perceptually ordered gradient mirroring the band thresholds.
export const SCORE_GRADIENT_CSS = `linear-gradient(90deg, ${SCORE_BANDS_ASC.map(
  band => `${band.color} ${band.min}%`
).join(", ")}, #14532d 100%)`;

const FACTOR_KEYS = ["air", "safety", "health", "economy", "col"];

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const ROWS_BY_PLACE = new Map();
DATA.rows.forEach(row => {
  if (!ROWS_BY_PLACE.has(row.placeId)) ROWS_BY_PLACE.set(row.placeId, []);
  ROWS_BY_PLACE.get(row.placeId).push(row);
});
ROWS_BY_PLACE.forEach(rows => rows.sort((a, b) => a.year - b.year));

const COST_BY_PLACE = new Map(
  DATA.costSnapshots.map(snapshot => [snapshot.placeId, snapshot])
);

function normalize(value, definition) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return null;
  const numeric = Number(value);
  const [lower, upper] = definition.bounds;
  if (!Number.isFinite(lower) || !Number.isFinite(upper) || upper <= lower) return null;
  const bounded = clamp(numeric, lower, upper);
  const score =
    definition.direction === "higher_is_better"
      ? ((bounded - lower) / (upper - lower)) * 100
      : ((upper - bounded) / (upper - lower)) * 100;
  return Number(score.toFixed(1));
}

function latestObservedValues(placeId, year) {
  const rows = ROWS_BY_PLACE.get(placeId) || [];
  const values = {
    air: null,
    safety: null,
    health: null,
    nsdp: null,
    unemployment: null
  };
  const years = {
    air: null,
    safety: null,
    health: null,
    nsdp: null,
    unemployment: null
  };
  const seriesBreaks = { air: false, safety: false, health: false, economy: false };
  const gapFlags = { air: "", safety: "", health: "", economy: "" };

  rows.forEach(row => {
    if (row.year > year) return;
    for (const key of Object.keys(values)) {
      if (row[key] !== null && row[key] !== undefined) {
        values[key] = row[key];
        years[key] = row.year;
      }
    }
    if (row.year === year) {
      Object.keys(seriesBreaks).forEach(key => {
        if (row.seriesBreak?.[key]) seriesBreaks[key] = true;
        if (row.gapFlags?.[key]) gapFlags[key] = row.gapFlags[key];
      });
    }
  });

  return { values, years, seriesBreaks, gapFlags };
}

function factorScoresAt(placeId, year) {
  const { values, years, seriesBreaks, gapFlags } = latestObservedValues(placeId, year);
  // Economy: NSDP (higher_is_better) averaged with unemployment rate (lower_is_better).
  // Read both indicator scores from their row fields and only combine them when
  // the two indicators share an observation year.
  const nsdpScore = normalize(values.nsdp, FACTOR_DEFS.economy.indicators[0]);
  const unempScore = normalize(values.unemployment, FACTOR_DEFS.economy.indicators[1]);
  const economyScore =
    nsdpScore !== null &&
    unempScore !== null &&
    years.nsdp !== null &&
    years.unemployment !== null &&
    years.nsdp === years.unemployment
      ? Number(((nsdpScore + unempScore) / 2).toFixed(1))
      : null;
  const economyYear =
    economyScore !== null
      ? years.nsdp
      : values.nsdp !== null || values.unemployment !== null
        ? Math.max(years.nsdp ?? -Infinity, years.unemployment ?? -Infinity)
        : null;

  const cost = COST_BY_PLACE.get(placeId);
  const costValue = cost && cost.year <= year ? cost.value : null;
  const costYear = costValue !== null ? cost.year : null;

  return {
    factorScores: {
      air: normalize(values.air, FACTOR_DEFS.air),
      safety: normalize(values.safety, FACTOR_DEFS.safety),
      health: normalize(values.health, FACTOR_DEFS.health),
      economy: economyScore,
      col: normalize(costValue, FACTOR_DEFS.col)
    },
    factorYears: {
      air: years.air,
      safety: years.safety,
      health: years.health,
      economy: economyYear,
      col: costYear
    },
    seriesBreaks,
    gapFlags
  };
}

function compositeScore(placeId, year, weights) {
  const { factorScores, factorYears, seriesBreaks, gapFlags } = factorScoresAt(placeId, year);
  const selectedFactors = FACTOR_KEYS.filter(key => Number(weights?.[key] || 0) > 0);
  const missingFactors = selectedFactors.filter(key => factorScores[key] === null);
  let weightedSum = 0;
  let activeWeight = 0;

  FACTOR_KEYS.forEach(key => {
    const score = factorScores[key];
    const weight = Number(weights?.[key] || 0);
    if (score !== null && weight > 0) {
      weightedSum += score * weight;
      activeWeight += weight;
    }
  });

  const hasScore = activeWeight > 0;
  const isPartial = missingFactors.length > 0;

  return {
    year,
    score: hasScore ? Number((weightedSum / activeWeight).toFixed(1)) : null,
    partialData: isPartial && hasScore,
    missingFactors,
    trendEligible: !isPartial && hasScore,
    seriesBreak: selectedFactors.some(key => seriesBreaks[key]),
    gapFlag: selectedFactors.map(key => gapFlags[key]).filter(Boolean).join("|"),
    factorScores,
    factorYears
  };
}

function tierForScore(score) {
  if (!Number.isFinite(score)) return "Unclassified";
  if (!DATA_COVERAGE.compositeAvailable) return "Factor score";
  if (score >= 70) return "Tier 1: High Livability";
  if (score >= 50) return "Tier 2: Moderate Livability";
  return "Tier 3: Developing Livability";
}

export function calculateScores(weights, filterType = "all", year = BASELINE_YEAR) {
  const targetPlaces = PLACES.filter(place => filterType === "all" || place.type === filterType);

  const scoredList = targetPlaces.map(place => {
    const history = OBSERVED_YEARS.map(observedYear =>
      compositeScore(place.id, observedYear, weights)
    );
    const baselinePoint = history.find(point => point.year === BASELINE_YEAR) || null;
    const observedPoint = history.find(point => point.year === year) || null;
    const factorPoint = observedPoint || baselinePoint;

    return {
      ...place,
      overallScore: factorPoint?.score ?? null,
      baseScore: baselinePoint?.score ?? null,
      partialData: factorPoint?.partialData ?? false,
      missingFactors: factorPoint?.missingFactors ?? [],
      factorScores: factorPoint?.factorScores || {},
      factorYears: factorPoint?.factorYears || {},
      availablePillars: Object.values(factorPoint?.factorScores || {}).filter(
        value => value !== null && value !== undefined
      ).length,
      outlook: "Insufficient data",
      slope: null,
      pVal: null,
      tier: tierForScore(factorPoint?.score ?? baselinePoint?.score),
      scoreYear: year,
      history,
      projections: []
    };
  });

  scoredList.sort((a, b) => {
    const aHasScore = Number.isFinite(a.overallScore);
    const bHasScore = Number.isFinite(b.overallScore);
    if (aHasScore && bHasScore) {
      return b.overallScore - a.overallScore || a.name.localeCompare(b.name);
    }
    if (aHasScore) return -1;
    if (bHasScore) return 1;
    return a.name.localeCompare(b.name);
  });

  let nextRank = 1;
  scoredList.forEach(place => {
    place.rank = Number.isFinite(place.overallScore) ? nextRank++ : null;
  });

  return scoredList;
}

export function getScoreColor(score) {
  if (score === null || score === undefined || !Number.isFinite(Number(score))) return "#64748b";
  const numeric = clamp(Number(score), 0, 100);
  const band = SCORE_BANDS.find(item => numeric >= item.min);
  return band ? band.color : "#64748b";
}

export function getContinuousScoreColor(score) {
  if (score === null || score === undefined || !Number.isFinite(Number(score))) return "#64748b";
  const numeric = clamp(Number(score), 0, 100);
  const stops = [...SCORE_BANDS_ASC, { min: 100, color: "#14532d" }];
  const upperIndex = stops.findIndex(stop => stop.min >= numeric);
  if (upperIndex <= 0) return stops[0].color;

  const lower = stops[upperIndex - 1];
  const upper = stops[upperIndex];
  const position = (numeric - lower.min) / (upper.min - lower.min);
  const lowerRgb = lower.color.match(/[\da-f]{2}/gi).map(value => parseInt(value, 16));
  const upperRgb = upper.color.match(/[\da-f]{2}/gi).map(value => parseInt(value, 16));
  const channels = lowerRgb.map((value, index) =>
    Math.round(value + (upperRgb[index] - value) * position)
  );
  return `#${channels.map(value => value.toString(16).padStart(2, "0")).join("")}`;
}

export function getScoreLabel(score) {
  if (score === null || score === undefined || !Number.isFinite(Number(score))) return "No data";
  const numeric = Number(score);
  const band = SCORE_BANDS.find(item => numeric >= item.min);
  return band ? band.label : "No data";
}

export function getTierColor(tier) {
  if (!tier) return "#94a3b8";
  if (tier.includes("Tier 1")) return "#22c55e";
  if (tier.includes("Tier 2")) return "#eab308";
  if (tier.includes("Tier 3")) return "#f97316";
  return "#94a3b8";
}

