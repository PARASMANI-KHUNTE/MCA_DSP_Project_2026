# Forecasting Audit

## Implementation
- **Frontend**: rontend/src/services/scoringService.js does OLS trend fitting on historical factor scores, computes projections to 2034, calculates prediction intervals using t-distribution, flags insufficient data (< 5 points)
- **Backend/Models**: src/models/, models/ directory exists with artifacts
- **Trends data**: data/processed/trends.csv present
- **Config**: MIN_TREND_POINTS = 5, PROJECTION_YEARS = 10 in constants

## Verification
| Check | Status | Evidence |
|---|---|---|
| Target variable correct | PARTIAL | Projects factor-level trends; composite score projections not clearly shown as separate model in frontend service |
| Chronological ordering | PASS | History sorted by year |
| No future leakage | NEEDS VERIFICATION | OLS on past data only - looks correct in structure |
| Baseline comparison | NOT VERIFIED | No explicit seasonal-naive baseline comparison found in frontend service |
| Sufficient data requirement | PASS | Requires >= 5 points |
| Prediction intervals | PASS | Computed using t-distribution with residual standard error |
| Labeled as projections | PASS | README says "Projections are naive linear trends from limited yearly data — not predictions" |
| Cost of living excluded | PASS | Marked as never projected |

## Risks
- Linear extrapolation may be poor for environmental/economic series
- Limited data points in many series
- No cross-validation or baseline comparison visible
- Confidence intervals depend on normality assumptions

## Recommendations
- Add explicit baseline (e.g., naive last-value) and compare metrics
- Document forecast limitations more prominently in UI
- Consider adding hold-out validation
