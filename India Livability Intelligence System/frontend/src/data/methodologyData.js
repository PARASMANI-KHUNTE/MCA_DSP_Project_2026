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
      source: "CPCB / Kaggle urban monitors (WHO=15, NAAQS=60, 5th-95th percentile=35-122)"
    },
    {
      factor: "Public safety (IPC crime rate)",
      bounds: "100 to 600 per lakh",
      direction: "Lower is better",
      source: "NCRB Crime in India (5th-95th percentile=140-510)"
    },
    {
      factor: "Healthcare (infant mortality)",
      bounds: "5 to 50 per 1,000 births",
      direction: "Lower is better",
      source: "SRS, Registrar General of India (5th-95th percentile=10-46, min=5, max=50)"
    },
    {
      factor: "Economy: NSDP per capita",
      bounds: "₹50,000 to ₹3,20,000",
      direction: "Higher is better",
      source: "RBI Handbook of Statistics on Indian States (5th-95th percentile=₹54.2k-₹312k)"
    },
    {
      factor: "Economy: unemployment",
      bounds: "2.0% to 10.0% of labour force",
      direction: "Lower is better",
      source: "MoSPI Periodic Labour Force Survey (5th-95th percentile=2.4%-9.4%)"
    },
    {
      factor: "Cost of living (rent)",
      bounds: "₹10,000 to ₹90,000 / month",
      direction: "Lower is better",
      source: "Kaggle house-rent snapshot (6 metros: Kolkata ₹11.6k to Mumbai ₹85.3k)"
    }
  ],
  ethics: [
    "Transparency: every displayed score is derived from published CPCB, NCRB, SRS, RBI, MoSPI or Kaggle source tables.",
    "No synthetic fallbacks: missing observations stay missing and are shown as unavailable rather than replaced with invented values.",
    "Inheritance is labelled: city safety, health and economy come from the surrounding state when city-level series do not exist.",
    "Uncertainty is explicit: only observed years are scored directly; 2025–2034 values are OLS projections with approximate 95% intervals.",
    "Granularity protects privacy: the index stays at city and state level and does not rank wards or neighbourhoods."
  ]
};

export const DATA_GAPS = [
  "Air quality has no processed observations for 2021 or 2022; the 2015–2019 Kaggle series and the 2023–2024 CPCB series are not joined as one continuous trend.",
  "State safety, health and economy series end in 2022. Scores for 2023 and 2024 reuse those latest observations and label their source year.",
  "Cost of living is a single 2022 rent snapshot for six metros, so it is never trended and applies only to those six cities.",
  "Population is not part of the processed dataset, so map pin sizes use a fixed scale rather than population.",
  "The clustering outputs are not used in the interface because the current cluster assignments are not consistent with the stored K-Means evaluation results."
];
