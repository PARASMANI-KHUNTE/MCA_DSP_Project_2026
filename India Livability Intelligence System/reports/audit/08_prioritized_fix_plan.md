# Prioritized Fix Plan

## P0 - Critical (Fix Immediately)
| ID | Issue | Affected Files | Evidence | Root Cause | Recommended Fix | Dependencies | Regression Test | Acceptance Criteria |
|---|---|---|---|---|---|---|---|---|
| P0-001 | Verify default weights match intended specification | src/scoring/factors_config.yaml, docs | Master prompt says 35/25/25/15; config uses different presets | Unclear which is canonical | Clarify intended defaults, update config/docs to match, or document difference | None | Test with default weights | Defaults clearly documented and consistent across codebase |
| P0-002 | Ensure scoring formulas identical across backend/frontend | src/scoring/scoring.py, rontend/src/services/scoringService.js | Two implementations exist | Duplication for offline capability | Cross-validate with tests; consider shared logic or automated comparison | None | Add integration test comparing outputs | Backend and frontend produce identical scores for same inputs |

## P1 - High (Fix Soon)
| ID | Issue | Affected Files | Evidence | Root Cause | Recommended Fix | Dependencies | Regression Test | Acceptance Criteria |
|---|---|---|---|---|---|---|---|---|
| P1-001 | Replace placeholder bounds with data-driven bounds | src/scoring/factors_config.yaml | Config says "Bounds are placeholders" | Not yet computed from data | Compute 5th/95th percentiles from actual data, update config, document in data quality report | Processed data | Re-run scoring tests | Bounds documented with rationale and computed from real data |
| P1-002 | Run full test suite and fix failures | 	ests/ | Only scoring tests run so far | Incomplete verification | Execute all tests, address any failures | None | All tests pass | pytest tests/ -v shows all passing |
| P1-003 | Validate pipeline end-to-end from clean state | src/cleaning/run_pipeline.py | Processed data exists but not re-run in audit | Reproducibility unverified | Run pipeline, check outputs, compare with existing | Raw data present | Pipeline completes without errors | Pipeline runs successfully, produces valid outputs |
| P1-004 | Complete data quality report | eports/data_quality_report.md | Report may be stub | Incomplete documentation | Generate comprehensive report with stats from actual data | Pipeline run | Report exists with real metrics | Report includes missing%, duplicates, coverage, issues |

## P2 - Medium (Fix When Possible)
| ID | Issue | Affected Files | Evidence | Root Cause | Recommended Fix | Dependencies | Regression Test | Acceptance Criteria |
|---|---|---|---|---|---|---|---|---|
| P2-001 | Test backend API endpoints | ackend/app/ | API structured but not tested | Runtime not verified | Start backend, test health/score/places endpoints | Processed data loaded | API tests pass | All endpoints return expected responses |
| P2-002 | Verify map interactions and UI flows | rontend/ | Code inspected only | Runtime not tested | Manual/browser testing of key flows | Frontend can run | UI tests/checklist complete | Core user flows work without errors |
| P2-003 | Add baseline comparison for forecasts | rontend/src/services/scoringService.js, src/models/ | No explicit baseline found | Incomplete evaluation | Implement naive baseline, compare metrics | Historical data | Forecast tests added | Baseline comparison reported |
| P2-004 | Document inheritance more prominently | rontend/src/, README.md | Noted in code/README | Could be clearer to users | Add UI indicators/tooltips explaining state inheritance for cities | None | UI review | Users understand inherited data |
| P2-005 | Remove or justify code duplication | rontend/src/services/scoringService.js vs src/scoring/scoring.py | Duplication exists | Offline capability | Refactor to share logic or document why duplicated | None | Outputs still match | No divergence in scores |

## P3 - Low (Improvements)
| ID | Issue | Affected Files | Evidence | Root Cause | Recommended Fix | Dependencies | Regression Test | Acceptance Criteria |
|---|---|---|---|---|---|---|---|---|
| P3-001 | Clean up pycache files | Various __pycache__ dirs | Many pycache dirs exist | Build artifacts | Add to .gitignore (already there) and clean | None | Clean repo | No committed pycache |
| P3-002 | Add type hints/improve docs | Various | Generally good but some gaps | Incremental improvement | Enhance documentation where helpful | None | None | Better code maintainability |
