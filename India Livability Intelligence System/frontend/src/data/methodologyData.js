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
      factor: "Healthcare (NFHS-5 composite)",
      bounds: "0 to 100 index",
      direction: "Higher is better",
      source: "NFHS-5 district factsheets, MoHFW; configured scoring anchors",
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
      bounds: "₹3,000 to ₹40,000 / month",
      direction: "Lower is better",
      source: "Longitudinal city cost-of-living estimates, 2010–2024; exact publisher file and values are not independently verified",
      license: "Unverified for the exact local file; see source register."
    }
  ],
  ethics: [
    "Transparency: scores are calculated from the local indicator tables using the displayed formulas and bounds.",
    "No synthetic fallbacks: missing observations stay missing and are shown as unavailable rather than replaced with invented values.",
    "Historic air, safety, NFHS-5 health, RBI NSDP, PLFS, CPCB water-quality and longitudinal cost-of-living inputs are active, but their exact publisher versions and reuse terms remain unverified.",
    "Air has historic 2015–2019 observations plus 2025–2026 enriched station data; the recent city-years are sparse and flagged. Any trend is a simple extrapolation from available observations, not a forecast of future conditions.",
    "Granularity protects privacy: the index stays at city and state level and does not rank wards or neighbourhoods."
  ]
};

export const DATA_GAPS = [
  "Air has 48 historic city-year observations for 2015–2019 and 447 enriched city-years for 2025–2026. Every enriched city-year is flagged sparse because it has fewer than seven PM2.5 observations. State means summarize matched cities and do not represent statewide monitoring coverage.",
  "Safety ends in 2022, health and water quality are 2021 snapshots, and the economy indicators are 2023. Composite scores inherit each place's latest observation at or before the selected year, so the displayed source years can differ.",
  "The longitudinal cost-of-living file provides 735 city-years for 2010–2024, of which 390 rows match 26 places. Its exact upstream version and reuse terms are unverified, and it is never trended.",
  "The active source files have not been independently matched to their cited public releases. Computed results are not source-certified factual comparisons.",
  "Composite scores are available when all selected factors have observations; a place missing one selected factor is reweighted and flagged as partial. Cost-of-living and water-quality views use different populations and observation periods and must not be compared directly to the four-factor balanced composite.",
  "Population is not part of the processed dataset, so map pin sizes use a fixed scale rather than population.",
  "The state boundary paths and several data source licenses are not yet verified; the attribution register marks unresolved terms explicitly.",
  "The app does not use old clustering outputs as current findings."
];
