import { PLACES, PLACE_METRICS } from "../data/seedData";

const API_BASE_URL = "http://localhost:8000/api";
const BASELINE_YEAR = 2024;

export const SCORE_BANDS = [
  { min: 80, color: "#10b981", label: "Elite" },
  { min: 70, color: "#06b6d4", label: "High" },
  { min: 60, color: "#3b82f6", label: "Good" },
  { min: 50, color: "#f59e0b", label: "Moderate" },
  { min: 40, color: "#f97316", label: "Developing" },
  { min: 0, color: "#ef4444", label: "Critical" }
];

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export function calculateScores(weights, filterType = "all", year = BASELINE_YEAR) {
  const { air, safety, health, economy, col = 0 } = weights;

  const targetPlaces = PLACES.filter(place => {
    if (filterType === "all") return true;
    return place.type === filterType;
  });

  const scoredList = targetPlaces.map(place => {
    const metrics = PLACE_METRICS[place.id] || {
      air: 50,
      safety: 60,
      health: 65,
      economy: 60,
      col: null,
      outlook: "Stable",
      slope: 0.1,
      pVal: 0.5,
      tier: "Tier 2: Moderate Livability"
    };

    let weightedSum = 0;
    let activeWeight = 0;

    if (metrics.air !== null && air > 0) {
      weightedSum += metrics.air * air;
      activeWeight += air;
    }
    if (metrics.safety !== null && safety > 0) {
      weightedSum += metrics.safety * safety;
      activeWeight += safety;
    }
    if (metrics.health !== null && health > 0) {
      weightedSum += metrics.health * health;
      activeWeight += health;
    }
    if (metrics.economy !== null && economy > 0) {
      weightedSum += metrics.economy * economy;
      activeWeight += economy;
    }
    if (metrics.col !== null && col > 0) {
      weightedSum += metrics.col * col;
      activeWeight += col;
    }

    const baseScore = activeWeight > 0 ? weightedSum / activeWeight : 50;
    const yearOffset = (year - BASELINE_YEAR) * (metrics.slope || 0);
    const overallScore = clamp(baseScore + yearOffset, 0, 100);

    return {
      ...place,
      overallScore: parseFloat(overallScore.toFixed(1)),
      baseScore: parseFloat(baseScore.toFixed(1)),
      factorScores: {
        air: metrics.air,
        safety: metrics.safety,
        health: metrics.health,
        economy: metrics.economy,
        col: metrics.col
      },
      outlook: metrics.outlook,
      slope: metrics.slope,
      pVal: metrics.pVal,
      tier: metrics.tier,
      scoreYear: year
    };
  });

  scoredList.sort((a, b) => b.overallScore - a.overallScore);

  scoredList.forEach((item, index) => {
    item.rank = index + 1;
  });

  return scoredList;
}

export function getScoreColor(score) {
  if (score === null || score === undefined || Number.isNaN(Number(score))) return "#64748b";
  const numeric = Number(score);
  const band = SCORE_BANDS.find(item => numeric >= item.min);
  return band ? band.color : "#64748b";
}

export function getScoreLabel(score) {
  if (score === null || score === undefined) return "No data";
  const numeric = Number(score);
  const band = SCORE_BANDS.find(item => numeric >= item.min);
  return band ? band.label : "No data";
}

export function getTierColor(tier) {
  if (!tier) return "#94a3b8";
  if (tier.includes("Tier 1")) return "#10b981";
  if (tier.includes("Tier 2")) return "#3b82f6";
  return "#f59e0b";
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
