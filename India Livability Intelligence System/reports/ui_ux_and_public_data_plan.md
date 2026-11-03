# UI/UX and Public Data Recovery Plan

**Status:** Working plan — updated with the requested visual and accuracy requirements.  
**Purpose:** Make the application easy to operate and ensure every answer it gives is supported by traceable public observations.

## 1. Desired user outcome

A user should be able to ask a simple question such as **“Which of these places looks better for the priorities I selected?”** and receive an answer that clearly states:

- which places and years were compared;
- which public indicators and source releases support the result;
- how much comparable data each place has;
- where data are missing or use a different geographic level;
- why the ranking changes when the user changes their priorities.

When the data cannot support that answer, the application should say **“Not enough comparable data to answer this”** and explain what is missing. It should not fill the gap with fabricated values or present a demonstration score as a verified result.

## 2. Current issues to resolve

- Six local raw files for NCRB safety, SRS health, RBI income, PLFS unemployment, and CPCB air quality exactly match hard-coded outputs from the retired placeholder generator. They are not validated source extracts.
- Processed tables and the embedded frontend bundle depend on some of those files. The current figures therefore cannot be presented as empirical findings.
- The API is reachable, but correctly disables score endpoints while known placeholder inputs remain. The frontend can still calculate from its embedded bundle, so its warning does not by itself make those answers safe to rely on.
- The source register has unresolved licensing and retrieval details. Other local datasets, including the Kaggle-hosted air and rent data, have not been fully verified either.
- A dataset being publicly downloadable, including from Kaggle or a similar platform, does not alone establish that its observations, definitions, license, geographic coverage, and methods are suitable for this project.
- The UI currently presents many controls and views before establishing what can be compared and how trustworthy the result is.

## 3. Public data policy

Use publicly accessible datasets from platforms such as Kaggle, government open-data portals, research repositories, and other identifiable public publishers. Every dataset must pass the checks below before it contributes to a user-facing result.

### Required dataset record

For each dataset or source release, record:

| Field | Required information |
|---|---|
| Identity | Dataset title, publisher/uploader, platform, stable URL, release/version |
| Access | Retrieval date, original download filename, SHA-256 checksum |
| Rights | Exact license or reuse terms and required attribution; mark unresolved terms as unusable for redistribution |
| Meaning | Indicator definition, unit, denominator, population, geography, and observation period |
| Method | Collection or survey method, aggregation, known revisions, and breaks in comparability |
| Quality | Row counts, duplicate and missing-value checks, expected range, geographic coverage, and source-to-extract spot checks |
| Lineage | Transformations and output files derived from the source |

### Eligibility rules

1. Public access and license suitability are separate checks. Do not treat a Kaggle listing or a public link as permission to redistribute.
2. Preserve the publisher's original files and record the exact dataset version. Do not silently substitute a different upload with a similar name.
3. Reject generated example data, synthetic data, untraceable repackagings, and files whose values cannot be checked against a source or documented methodology.
4. Keep an indicator definition and unit consistent across places and years. Do not join two series as though they were comparable when their measurement methods differ; mark the break or exclude the combined trend.
5. Do not invent observations to fill gaps. If imputation is later approved for a specific use, identify every imputed value and show how it affects coverage and confidence.
6. Only include places that meet a documented minimum-coverage rule for the selected indicators. A missing observation must not be interpreted as zero.
7. Re-run the data fingerprint check, loader validation, and source spot checks after replacement. A changed checksum only means the old exact placeholder file is gone; it does not prove the replacement is valid.

## 4. Proposed product flow

### A. Start with a question

Replace the feature-first entry point with a short guided flow:

1. **Choose what to compare:** states, cities, or a small user-selected set. Do not mix city and state comparisons without an explicit explanation.
2. **Choose a time period:** default to the latest year with adequate comparable coverage; show the year and source release.
3. **Choose priorities:** offer a small number of plain-language presets, with a simple option to adjust factor importance.
4. **Review data coverage:** show which selected indicators are available for each place before calculating a result.
5. **Get the answer:** show the ranking or comparison, the reasons behind it, and links to the source data.

### B. Make the result understandable

Each answer should include:

- a one-sentence result using the selected scope, year, and priorities;
- the score and rank, with the comparison group stated;
- a factor-by-factor explanation of what raised or lowered the result;
- a visible coverage/completeness indicator and a confidence description based on documented coverage rules;
- the source publisher, release, observation period, and citation link for each factor;
- explicit labels wherever a value is inherited from a state, estimated, imputed, stale, or unavailable;
- a concise explanation that user weights express preferences and the composite score is not an official quality-of-life rating.

If the chosen places do not share enough valid observations, disable the ranking and state the specific missing coverage. Do not quietly reweight across places in a way that makes their scores incomparable.

### C. Reduce interface complexity

- Keep the primary journey to compare places and understand the answer.
- Move detailed methodology, source tables, and model diagnostics into clearly named secondary views.
- Use familiar terms, short help text, and a small set of controls visible at each step.
- Keep color as a secondary cue; include numeric labels, text states, keyboard operation, and screen-reader labels.
- Design and check the flow at mobile and desktop widths.

### D. Visual design direction

- Use a restrained black, white, and gray foundation with clear spacing, readable typography, and a small number of interface accents.
- Reserve red and green for clear negative/positive indications. Use other solid, high-contrast colors only where distinct categories need them.
- Never use color alone to convey meaning; pair status colors with labels, icons or symbols, and accessible text.
- Avoid decorative gradients, multiple competing accent colors, dense card borders, and visual effects that distract from the answer.

## 5. Data and UI work sequence

1. **Inventory and decide scope:** inspect every local raw dataset, identify its exact public source/version/license, and classify it as eligible, needs review, or excluded. Agree on a manageable set of indicators and geography levels.
2. **Replace and validate sources:** acquire eligible public datasets, preserve originals, extract documented tidy tables, and spot-check values against their source materials.
3. **Validate comparability and coverage:** define common years, geographic units, indicator direction, missing-data treatment, and minimum coverage before calculating scores.
4. **Rebuild analytical outputs:** run the pipeline, scoring, analyses, model evaluation, and frontend export from the available local inputs. Reconcile report claims with generated outputs.
5. **Redesign the user flow:** implement the guided comparison and data-coverage states using the validated schema and outputs.
6. **Verify answers with users:** walk through representative tasks with first-time users, then check accessibility, responsive behavior, and that source/caveat details are discoverable.

### Accuracy gates for the data pipeline

The pipeline may process local inputs without a source-review prerequisite. Technical validation checks the data structures and transformations; it does not claim that source values were independently checked against publisher releases.

After source approval, validate expected columns and types, duplicate keys, units and plausible ranges, geographic/year coverage, missingness, and time-series breaks. Preserve raw originals; write cleaned/versioned outputs and lineage metadata. Independently spot-check extracted observations against the cited public source. Automated tests can confirm structure and consistency, but cannot prove that an observation matches its publisher; report that distinction and remaining limitations clearly.

## 6. Acceptance criteria

The work is ready to present when all of the following are true:

- Use all intended local inputs through cleaning, scoring, analysis, modeling, and frontend export without a source-review gate.
- Keep the Method view's formulas, coverage, and geographic limitations accurate; distinguish pipeline/schema checks from source-level review in project documentation.
- Every included factor has a defined unit, direction, bounds, and geographic level in the scoring configuration.
- State and city results use comparable geographic units; inherited values are not described as city-level observations.
- The user can complete a place comparison without prior knowledge of the project's factor names or data pipeline.
- Each displayed answer reveals its comparison scope, year, contributing factors, coverage, and sources.
- When coverage is insufficient, the application declines to rank and explains why.
- Rankings and explanations respond consistently to preference changes, and accessibility checks cover keyboard use, labels, contrast, and mobile layout.
- Reports, dashboard data, and API behavior agree on what is verified and what is unavailable.

## 7. Decisions to make during review

These choices affect which public data to acquire and how the interface should answer questions:

1. Should the first release compare **states only**, or states and cities where each has its own valid data?
2. Which indicators are essential for the first answer? Are optional rent and trend projections worth retaining if their public sources are weak or non-comparable?
3. Should Kaggle-hosted public datasets be eligible when the uploader is not the original publisher, provided the original source and license can be verified?
4. **Resolved:** exclude a place from the selected comparison when any positively weighted factor is missing; do not silently reweight different factor subsets.

## 8. Current implementation direction

The user has directed the project to use the data already present locally, run the data-science pipeline, and display its outputs in the frontend without waiting for source verification. Source-review gating and the blocking source-status page have therefore been removed from the runtime workflow. The Method tab presents scoring formulas and known data-coverage limitations; these notes do not disable the dashboard or API. Generated results describe the supplied tables and configured methods.
