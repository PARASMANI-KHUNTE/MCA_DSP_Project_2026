# New Data Integration Plan

**Status:** Plan prepared; source inventory and public-source review completed. Integration is held where source rights, indicator fit, or value validation are unresolved. See [`new_data_source_audit.md`](new_data_source_audit.md).

## Goal

Review the datasets in `data/raw/newData`, determine which are suitable public-source inputs, and integrate only those whose provenance, reuse terms, definitions, units, geography, coverage, and values can be verified. Update the pipeline and project materials to reflect the verified data and clearly report anything that remains blocked.

## Guiding rules

- A downloaded file or a trusted-looking filename is not, by itself, evidence that its contents are authentic or accurate.
- Preserve the original downloaded files. Do not overwrite, rename destructively, or silently discard them.
- Record a file checksum and specific source release/page for every admitted input.
- Keep analysis blocked for any required factor whose source, reuse status, or value checks cannot be established.
- Do not mark manifest rows verified until source-level checks are complete. Schema validity alone is insufficient.
- Avoid publishing scores, rankings, trends, model metrics, or narrative findings from mixed or unverified inputs.

## Work sequence

1. **Inventory the download folder**
   - List files and formats, sizes, checksums, and archive contents under `data/raw/newData`.
   - Read available accompanying source notes, licenses, and documentation.
   - Do not alter the downloaded files during inventory.

2. **Verify provenance and reuse**
   - Identify the original publisher, dataset page, release/version, retrieval date, license or reuse terms, and any attribution requirements for each file.
   - Confirm that the downloaded file corresponds to the stated release; note any conversion or extraction steps.
   - Exclude any source whose provenance or reuse permission remains unclear, and report the evidence needed to resolve it.

3. **Assess data meaning and accuracy**
   - Inspect headers, units, geography, periods, definitions, missingness, duplicate keys, and value ranges.
   - Compare representative records and totals with the original public publication or authoritative documentation.
   - Check for revisions, breaks in methodology, incompatible boundaries, and overlapping periods with existing inputs.
   - Identify which existing factor and loader, if any, the dataset can validly replace or extend.

4. **Define an explicit integration mapping**
   - Map verified source fields to the project schema, including place aliases, year alignment, units, and aggregation rules.
   - Preserve source identifiers and quality/break metadata through tidy, wide, scoring, trend, API, and frontend outputs.
   - Do not infer values or combine unlike measures merely to fill coverage gaps.

5. **Update controlled source records and pipeline**
   - Add or revise source-register and source-validation-manifest records with checksums and review evidence.
   - Update loaders and validation rules for the accepted inputs; retain fail-closed behavior for unresolved required factors.
   - Keep old files for audit unless their replacement and references are fully understood; document which inputs are active versus retired.

6. **Rebuild and validate downstream project artifacts**
   - Run the relevant ingestion, cleaning, scoring, trend/model, and frontend-export stages only after required sources pass review.
   - Reconcile the generated schemas, coverage, years, score completeness, trend breaks, and API/frontend parity.
   - Update README, SRS/requirements compliance, provenance notice, data-quality report, and other affected Markdown documents so claims match regenerated outputs.
   - Update the UI to explain sources, periods, missingness, and limitations in plain language while retaining the approved minimalist palette.

7. **Report completion and unresolved issues**
   - Summarize accepted and rejected files with reasons and source evidence.
   - Report the exact commands/checks run and their results.
   - Identify any factor or project feature still blocked; do not describe the full system as accurate if any relevant source remains unverified.

## Acceptance criteria

- Every active input is traceable to an exact public release and a documented reuse decision.
- The file checksum in the manifest matches the active file, and independent source spot-checks pass.
- The loader's field/unit/geography/year mapping is explicit and tested against source examples.
- Source breaks and gaps are retained in downstream tables and excluded from invalid trend comparisons.
- No score or ranking is emitted for an entity missing a positively weighted factor, and no incompatible factor definitions are silently combined.
- All current reports and UI labels agree with the data actually admitted and rebuilt.
- The final report distinguishes verified facts from unresolved assumptions and blocked work.

## Current limitation

The folder was inventoried after this plan was recorded. Some publisher/source metadata could be confirmed, but no new input has yet passed every gate for an active pipeline input. The air file duplicates the existing Kaggle file; other files either measure different indicators, contain modeled values, lack source/reuse evidence, or do not provide the denominator needed by the current score. Do not rebuild empirical outputs until these blockers are resolved.
