import { DATA } from "../data/realData.js";

const API_BASE_URL = "http://localhost:8000/api";

export const PLACES = DATA.places;
export const FACTOR_DEFS = DATA.factorDefs;
export const DATA_COVERAGE = DATA.meta;
export const BASELINE_YEAR = DATA.meta.baselineYear;
export const PROJECTION_END_YEAR = DATA.meta.projectionEndYear;
export const OBSERVED_YEARS = DATA.meta.years;
export const PROJECTION_YEARS = Array.from(
  { length: PROJECTION_END_YEAR - BASELINE_YEAR },
  (_, index) => BASELINE_YEAR + index + 1
);

const MIN_TREND_POINTS = 5;
const P_VALUE_THRESHOLD = 0.05;

export const SCORE_BANDS = [
  { min: 80, color: "#10b981", label: "Elite" },
  { min: 70, color: "#06b6d4", label: "High" },
  { min: 60, color: "#3b82f6", label: "Good" },
  { min: 50, color: "#f59e0b", label: "Moderate" },
  { min: 40, color: "#f97316", label: "Developing" },
  { min: 0, color: "#ef4444", label: "Critical" }
];

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

  rows.forEach(row => {
    if (row.year > year) return;
    for (const key of Object.keys(values)) {
      if (row[key] !== null && row[key] !== undefined) {
        values[key] = row[key];
        years[key] = row.year;
      }
    }
  });

  return { values, years };
}

function factorScoresAt(placeId, year) {
  const { values, years } = latestObservedValues(placeId, year);
  const economyDefinitions = FACTOR_DEFS.economy.indicators;
  const economyScores = [];

  economyDefinitions.forEach(definition => {
    const score = normalize(values[definition.key], definition);
    if (score !== null) economyScores.push(score);
  });

  const cost = COST_BY_PLACE.get(placeId);
  const costValue = cost && cost.year <= year ? cost.value : null;
  const costYear = costValue !== null ? cost.year : null;
  const economyYear =
    values.nsdp !== null || values.unemployment !== null
      ? Math.max(years.nsdp ?? -Infinity, years.unemployment ?? -Infinity)
      : null;

  return {
    factorScores: {
      air: normalize(values.air, FACTOR_DEFS.air),
      safety: normalize(values.safety, FACTOR_DEFS.safety),
      health: normalize(values.health, FACTOR_DEFS.health),
      economy: economyScores.length
        ? Number((economyScores.reduce((total, score) => total + score, 0) / economyScores.length).toFixed(1))
        : null,
      col: normalize(costValue, FACTOR_DEFS.col)
    },
    factorYears: {
      air: years.air,
      safety: years.safety,
      health: years.health,
      economy: economyYear,
      col: costYear
    }
  };
}

function compositeScore(placeId, year, weights) {
  const { factorScores, factorYears } = factorScoresAt(placeId, year);
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

  return {
    year,
    score: activeWeight > 0 ? Number((weightedSum / activeWeight).toFixed(1)) : null,
    factorScores,
    factorYears
  };
}

function logGamma(value) {
  const coefficients = [
    76.1800917294715, -86.5053203294168, 24.0140982408309,
    -1.23173957245015, 0.00120865097386618, -0.00000539523938495
  ];
  let x = value;
  let y = value;
  let temp = x + 5.5;
  temp -= (x + 0.5) * Math.log(temp);
  let series = 1.00000000019;
  coefficients.forEach(coefficient => {
    y += 1;
    series += coefficient / y;
  });
  return -temp + Math.log((2.506628274631 * series) / x);
}

function betaContinuedFraction(a, b, x) {
  const maxIterations = 200;
  const epsilon = 3e-12;
  const tiny = 1e-300;
  const qab = a + b;
  const qap = a + 1;
  const qam = a - 1;
  let c = 1;
  let d = 1 - (qab * x) / qap;
  if (Math.abs(d) < tiny) d = tiny;
  d = 1 / d;
  let h = d;

  for (let iteration = 1; iteration <= maxIterations; iteration += 1) {
    const m2 = 2 * iteration;
    let aa = (iteration * (b - iteration) * x) / ((qam + m2) * (a + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < tiny) d = tiny;
    c = 1 + aa / c;
    if (Math.abs(c) < tiny) c = tiny;
    d = 1 / d;
    h *= d * c;

    aa = (-(a + iteration) * (qab + iteration) * x) / ((a + m2) * (qap + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < tiny) d = tiny;
    c = 1 + aa / c;
    if (Math.abs(c) < tiny) c = tiny;
    d = 1 / d;
    const delta = d * c;
    h *= delta;
    if (Math.abs(delta - 1) < epsilon) break;
  }

  return h;
}

function incompleteBeta(a, b, x) {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const factor = Math.exp(
    logGamma(a + b) - logGamma(a) - logGamma(b) + a * Math.log(x) + b * Math.log1p(-x)
  );
  if (x < (a + 1) / (a + b + 2)) {
    return (factor * betaContinuedFraction(a, b, x)) / a;
  }
  return 1 - (factor * betaContinuedFraction(b, a, 1 - x)) / b;
}

function twoSidedStudentP(value, degreesOfFreedom) {
  if (!Number.isFinite(value) || degreesOfFreedom <= 0) return null;
  const x = degreesOfFreedom / (degreesOfFreedom + value * value);
  return clamp(incompleteBeta(degreesOfFreedom / 2, 0.5, x), 0, 1);
}

function fitTrend(history) {
  const points = history.filter(point => Number.isFinite(point.score));
  if (points.length < MIN_TREND_POINTS) return null;

  const n = points.length;
  const meanX = points.reduce((total, point) => total + point.year, 0) / n;
  const meanY = points.reduce((total, point) => total + point.score, 0) / n;
  let sxx = 0;
  let sxy = 0;
  let syy = 0;

  points.forEach(point => {
    const dx = point.year - meanX;
    sxx += dx * dx;
    sxy += dx * (point.score - meanY);
    syy += (point.score - meanY) ** 2;
  });

  if (sxx === 0) return null;

  const slope = sxy / sxx;
  const intercept = meanY - slope * meanX;
  const residualSum = points.reduce(
    (total, point) => total + (point.score - (intercept + slope * point.year)) ** 2,
    0
  );
  const degreesOfFreedom = n - 2;
  const sigma = Math.sqrt(residualSum / degreesOfFreedom);
  const standardError = sxx > 0 ? sigma / Math.sqrt(sxx) : null;
  const tStatistic = standardError && standardError > 0 ? slope / standardError : null;
  const pValue = tStatistic !== null ? twoSidedStudentP(tStatistic, degreesOfFreedom) : null;

  return {
    n,
    slope: Number(slope.toFixed(3)),
    intercept,
    sigma,
    sxx,
    meanX,
    pValue: pValue !== null ? Number(pValue.toFixed(4)) : null,
    significant: pValue !== null && pValue < P_VALUE_THRESHOLD
  };
}

function tCritical95(degreesOfFreedom) {
  const table = {
    1: 12.706, 2: 4.303, 3: 3.182, 4: 2.776, 5: 2.571,
    6: 2.447, 7: 2.365, 8: 2.306, 9: 2.262, 10: 2.228,
    11: 2.201, 12: 2.179, 13: 2.16, 14: 2.145, 15: 2.131,
    16: 2.12, 17: 2.11, 18: 2.101, 19: 2.093, 20: 2.086
  };
  return table[degreesOfFreedom] ?? 1.96;
}

function projectPoint(trend, baselineScore, targetYear) {
  if (!trend || !Number.isFinite(baselineScore)) return null;
  const horizon = targetYear - BASELINE_YEAR;
  const fitted = baselineScore + trend.slope * horizon;
  const critical = tCritical95(Math.max(1, trend.n - 2));
  const standardError =
    trend.sigma *
    Math.sqrt(1 + 1 / trend.n + ((targetYear - trend.meanX) ** 2) / trend.sxx);
  return {
    year: targetYear,
    score: Number(clamp(fitted, 0, 100).toFixed(1)),
    lower: Number(clamp(fitted - critical * standardError, 0, 100).toFixed(1)),
    upper: Number(clamp(fitted + critical * standardError, 0, 100).toFixed(1)),
    isHistorical: false,
    fitted: Number(fitted.toFixed(1))
  };
}

function tierForScore(score) {
  if (!Number.isFinite(score)) return "Unclassified";
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
    const trend = fitTrend(history);
    const baselinePoint = history.find(point => point.year === BASELINE_YEAR) || null;
    const observedPoint = history.find(point => point.year === year) || null;
    const selectedPoint =
      year > BASELINE_YEAR ? projectPoint(trend, baselinePoint?.score, year) : observedPoint;
    const factorPoint =
      year > BASELINE_YEAR || !observedPoint ? baselinePoint : observedPoint;
    const projections = trend
      ? PROJECTION_YEARS.map(projectionYear =>
          projectPoint(trend, baselinePoint?.score, projectionYear)
        ).filter(Boolean)
      : [];

    return {
      ...place,
      overallScore: selectedPoint?.score ?? null,
      baseScore: baselinePoint?.score ?? null,
      factorScores: factorPoint?.factorScores || {},
      factorYears: factorPoint?.factorYears || {},
      availablePillars: Object.values(factorPoint?.factorScores || {}).filter(
        value => value !== null && value !== undefined
      ).length,
      outlook: !trend
        ? "Insufficient data"
        : trend.significant
          ? trend.slope > 0 ? "Improving" : "Declining"
          : "Stable",
      slope: trend?.slope ?? null,
      pVal: trend?.pValue ?? null,
      tier: tierForScore(selectedPoint?.score ?? baselinePoint?.score),
      scoreYear: year,
      history,
      projections
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
  const numeric = Number(score);
  const band = SCORE_BANDS.find(item => numeric >= item.min);
  return band ? band.color : "#64748b";
}

export function getScoreLabel(score) {
  if (score === null || score === undefined || !Number.isFinite(Number(score))) return "No data";
  const numeric = Number(score);
  const band = SCORE_BANDS.find(item => numeric >= item.min);
  return band ? band.label : "No data";
}

export function getTierColor(tier) {
  if (!tier) return "#94a3b8";
  if (tier.includes("Tier 1")) return "#10b981";
  if (tier.includes("Tier 2")) return "#3b82f6";
  if (tier.includes("Tier 3")) return "#f59e0b";
  return "#94a3b8";
}

export function getTierLabel(tier) {
  if (!tier) return "Unclassified";
  return tier.split(":")[0];
}

export async function syncWithBackend(weights, year = BASELINE_YEAR, placeType = "all") {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1500);

    const response = await fetch(`${API_BASE_URL}/score`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ weights, year, place_type: placeType === "all" ? null : placeType }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      return await response.json();
    }
  } catch {
    return null;
  }
  return null;
}
