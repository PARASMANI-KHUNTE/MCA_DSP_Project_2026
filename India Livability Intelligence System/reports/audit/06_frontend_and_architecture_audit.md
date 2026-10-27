# Frontend and Architecture Audit

## Architecture
- **Type**: React + Vite frontend, FastAPI backend, Python data pipeline
- **Structure**: Well-organized with clear separation (src/, backend/, frontend/, data/)
- **State management**: React hooks in App.jsx
- **Data flow**: Frontend uses embedded realData.js; backend can serve via API

## Frontend Components (verified)
| Component | Status | Notes |
|---|---|---|
| App.jsx | PASS | Main app with tabs, state management, presets, comparison |
| Navbar | PASS | Navigation, year selector, backend status |
| WeightControls | PASS | Sliders, presets, reset |
| IndiaMap | PASS | Map component exists |
| Leaderboard | PASS | Rankings table |
| PlaceDetailModal | PASS | Place details with factors/trends |
| CompareModal/CompareBar | PASS | Comparison functionality |
| InsightsView | PASS | Insights/statistics view |
| MethodologyView | PASS | Methodology documentation |

## UI/UX Checks (code inspection)
| Check | Status | Notes |
|---|---|---|
| Weight changes update scores | PASS | calculateScores called with weights dependency |
| Presets work | PASS | PRESETS applied to weights |
| Comparison (max 3) | PASS | Logic enforces limit with toast |
| Mobile responsive panels | PASS | Mobile panel switching implemented |
| Toast notifications | PASS | Implemented |
| Onboarding tour | PASS | OnboardingTourModal exists |
| Backend status indicator | PASS | Health check every 30s |

## Architecture Concerns
- **Dual data paths**: Frontend can use embedded data OR backend API; need to ensure consistency
- **Scoring logic duplication**: Frontend has scoringService.js with its own normalization/scoring logic - should verify it matches src/scoring/scoring.py
- **Large realData.js**: 5000+ lines, generated file - acceptable but harder to debug

## Recommendations
- Verify frontend scoring logic matches backend exactly (formulas, bounds, inheritance)
- Test runtime behavior of map interactions
- Ensure backend and frontend use same normalization bounds
