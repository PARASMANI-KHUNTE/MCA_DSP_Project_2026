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
    desc: "Adds six-city rent affordability to jobs, safety and health",
    weights: { air: 15, safety: 25, health: 15, economy: 20, col: 25 }
  }
];

export const METHODOLOGY_DETAILS = {
  formula: "Livability Score S = Σ (wᵢ × Scoreᵢ) / Σ wᵢ",
  normalization: "Direction-aware min-max scaling to [0, 100]. Lower-is-better: (Upper - Value)/(Upper - Lower) × 100. Higher-is-better: (Value - Lower)/(Upper - Lower) × 100.",
  bounds: [
    {
      factor: "Air quality (PM2.5)",
      bounds: "10 to 150 µg/m³",
      direction: "Lower is better",
      source: "Local PM2.5 input; exact publisher file and values are not independently verified",
      license: "Unverified for the exact source files; see source register."
    },
    {
      factor: "Public safety (IPC crime rate)",
      bounds: "100 to 600 per lakh",
      direction: "Lower is better",
      source: "NCRB Crime in India; configured scoring anchors",
      license: "Dataset-specific terms unverified; see source register."
    },
    {
      factor: "Healthcare (infant mortality)",
      bounds: "5 to 50 per 1,000 births",
      direction: "Lower is better",
      source: "SRS, Registrar General of India; configured scoring anchors",
      license: "Publication-specific terms unverified; see source register."
    },
    {
      factor: "Economy: NSDP per capita",
      bounds: "₹50,000 to ₹3,20,000",
      direction: "Higher is better",
      source: "RBI Handbook of Statistics on Indian States; configured scoring anchors",
      license: "Publication-specific terms unverified; see source register."
    },
    {
      factor: "Economy: unemployment",
      bounds: "2.0% to 10.0% of labour force",
      direction: "Lower is better",
      source: "MoSPI Periodic Labour Force Survey; configured scoring anchors",
      license: "Publication-specific terms unverified; see source register."
    },
    {
      factor: "Cost of living (rent)",
      bounds: "₹10,000 to ₹90,000 / month",
      direction: "Lower is better",
      source: "Local house-rent snapshot for six cities; exact publisher file and values are not independently verified",
      license: "Unverified for the exact local file; see source register."
    }
  ],
  ethics: [
    "Transparency: scores are calculated from the local indicator tables using the displayed formulas and bounds.",
    "No synthetic fallbacks: missing observations stay missing and are shown as unavailable rather than replaced with invented values.",
    "Safety, health, and economy inputs were quarantined after matching generated placeholder tables; they are unavailable in the current analysis.",
    "The active air and rent files have not been independently matched to their upstream publisher releases or licenses.",
    "Air observations currently cover 2015–2019 for a limited city sample. Any trend is a simple extrapolation from those observations, not a forecast of future conditions.",
    "Granularity protects privacy: the index stays at city and state level and does not rank wards or neighbourhoods."
  ]
};

export const DATA_GAPS = [
  "The active local air file contains 40 matched city-year observations across 13 cities and 40 derived state-year city-sample means across 13 states, for 2015–2019. State means summarize matched cities and do not represent statewide monitoring coverage.",
  "Safety, health, and economy are unavailable: their former local tables matched generated placeholders and were moved out of the active pipeline.",
  "The local rent file provides one snapshot for six cities. Its exact upstream version and reuse terms are unverified; it is never trended.",
  "The active air and rent files have not been independently matched to their cited public releases. Computed results are not source-certified factual comparisons.",
  "No composite score or composite ranking can be calculated with the current active factors. Air-only and rent-only rankings use different populations and observation periods and must not be compared to each other.",
  "Population is not part of the processed dataset, so map pin sizes use a fixed scale rather than population.",
  "The state boundary paths and several data source licenses are not yet verified; the attribution register marks unresolved terms explicitly.",
  "The app does not use old clustering outputs as current findings."
];
