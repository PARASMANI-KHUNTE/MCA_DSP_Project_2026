export const PRESETS = [
  {
    id: "balanced",
    name: "Balanced Baseline",
    desc: "Canonical 35/25/25/15 emphasis across air, safety, healthcare and economy",
    weights: { air: 35, safety: 25, health: 25, economy: 15, col: 0 }
  },
  {
    id: "environmental",
    name: "Clean Air & Greenery",
    desc: "Prioritizes low particulate matter and ambient air quality",
    weights: { air: 55, safety: 15, health: 20, economy: 10, col: 0 }
  },
  {
    id: "family",
    name: "Family & Wellbeing",
    desc: "Emphasizes low crime and strong maternal-child healthcare",
    weights: { air: 20, safety: 40, health: 30, economy: 10, col: 0 }
  },
  {
    id: "career",
    name: "Career & Economic Growth",
    desc: "Weights per-capita income and employment conditions most",
    weights: { air: 10, safety: 20, health: 20, economy: 50, col: 0 }
  },
  {
    id: "student",
    name: "Student / Budget Living",
    desc: "Adds city cost-of-living affordability to jobs, safety and health",
    weights: { air: 15, safety: 25, health: 15, economy: 20, col: 25 }
  }
];
