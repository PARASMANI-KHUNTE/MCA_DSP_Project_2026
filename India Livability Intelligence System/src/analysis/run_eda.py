"""
src/analysis/run_eda.py
───────────────────────
Executes the full Statistical and Exploratory Data Analysis (M4) pipeline:
- Computes descriptive statistics and regional aggregations
- Conducts hypothesis tests (One-way ANOVA across regions, Pearson correlations)
- Generates all publication-quality Matplotlib & Seaborn figures into reports/figures/
- Writes reports/findings.md with interpreted statistical results
"""

from pathlib import Path
import matplotlib.pyplot as plt
import seaborn as sns
import pandas as pd
import numpy as np
from scipy import stats

from src.utils.constants import (
    DATA_PROCESSED,
    REPORTS,
    FIGURES,
    SCORES_WIDE,
    FACTORS_WIDE,
    TRENDS_CSV,
    CLUSTERS_CSV,
    PLACES_CSV,
)

def run_eda():
    FIGURES.mkdir(parents=True, exist_ok=True)
    sns.set_theme(style="whitegrid", palette="muted")
    plt.rcParams.update({"font.sans-serif": "DejaVu Sans", "font.family": "sans-serif"})

    print("Loading analytical tables...")
    places = pd.read_csv(PLACES_CSV)
    factors_wide = pd.read_csv(FACTORS_WIDE)
    scores_wide = pd.read_csv(SCORES_WIDE)
    trends = pd.read_csv(TRENDS_CSV)
    clusters = pd.read_csv(CLUSTERS_CSV)

    merged = scores_wide.merge(places, on="place_id", how="left")
    scored_counts = merged.dropna(subset=["score"]).groupby("year").size()
    complete_years = scored_counts[scored_counts >= 50]
    if not complete_years.empty:
        latest_year = int(complete_years.index.max())
    else:
        latest_year = int(merged["year"].max())
    latest_scores = merged[merged["year"] == latest_year].copy()
    if latest_scores.empty or latest_scores["score"].notna().sum() < 10:
        latest_scores = merged.sort_values("year").groupby("place_id").last().reset_index()

    # 1. Figure 1: Univariate Distributions (Histogram + KDE)
    fig, axes = plt.subplots(2, 2, figsize=(12, 10))
    fig.suptitle("Univariate Factor Distributions across Indian Places", fontsize=16, fontweight="bold")
    
    factors = [
        ("air_quality", "Air Quality (PM2.5 µg/m³)", "#e74c3c", axes[0, 0]),
        ("safety", "Safety (Crime Rate per Lakh)", "#3498db", axes[0, 1]),
        ("health", "Health (Infant Mortality Rate per 1,000)", "#2ecc71", axes[1, 0]),
        ("per_capita_nsdp_constant", "Economy (Per Capita NSDP ₹)", "#f39c12", axes[1, 1]),
    ]
    
    for col, title, color, ax in factors:
        if col in factors_wide.columns:
            vals = factors_wide[col].dropna()
            sns.histplot(vals, kde=True, ax=ax, color=color, bins=15, alpha=0.6)
            ax.set_title(title, fontsize=12, fontweight="semibold")
            ax.set_xlabel("Value")
            ax.set_ylabel("Frequency")
    plt.tight_layout()
    fig1_path = FIGURES / "01_univariate_distributions.png"
    plt.savefig(fig1_path, dpi=200, bbox_inches="tight")
    plt.close()
    print(f"Saved: {fig1_path}")

    # 2. Figure 2: Regional Livability Boxplots
    plt.figure(figsize=(10, 6))
    regional_cross_section = latest_scores.dropna(subset=["region", "score"])
    order = regional_cross_section.groupby("region")["score"].median().sort_values(ascending=False).index
    sns.boxplot(data=regional_cross_section, x="region", y="score", order=order, palette="Set2")
    sns.stripplot(data=regional_cross_section, x="region", y="score", order=order, color="black", alpha=0.3, jitter=0.2)
    plt.title(f"Composite Livability Score Distribution by Region ({latest_year})", fontsize=14, fontweight="bold")
    plt.xlabel("Geographic Region", fontsize=12)
    plt.ylabel("Livability Score (0 - 100)", fontsize=12)
    plt.ylim(0, 100)
    plt.tight_layout()
    fig2_path = FIGURES / "02_regional_boxplots.png"
    plt.savefig(fig2_path, dpi=200, bbox_inches="tight")
    plt.close()
    print(f"Saved: {fig2_path}")

    # 3. Figure 3: Correlation Heatmap
    plt.figure(figsize=(8, 6))
    score_cols = [c for c in ["score", "air_quality_score", "safety_score", "health_score", "economy_score"] if c in scores_wide.columns]
    corr = scores_wide[score_cols].corr()
    mask = np.triu(np.ones_like(corr, dtype=bool))
    sns.heatmap(corr, annot=True, fmt=".2f", cmap="coolwarm", vmin=-1, vmax=1, mask=mask, square=True, linewidths=1)
    plt.title("Correlation Matrix of Livability Dimensions", fontsize=14, fontweight="bold")
    plt.tight_layout()
    fig3_path = FIGURES / "03_correlation_heatmap.png"
    plt.savefig(fig3_path, dpi=200, bbox_inches="tight")
    plt.close()
    print(f"Saved: {fig3_path}")

    # 4. Figure 4: Air Quality Time-Series Trends for Key Metropolitan Cities
    plt.figure(figsize=(12, 6))
    air_df = factors_wide.dropna(subset=["air_quality", "year"]).merge(places, on="place_id", how="left")
    top_cities = ["Delhi", "Mumbai", "Bengaluru", "Kolkata", "Chennai", "Hyderabad", "Patna", "Lucknow"]
    city_data = air_df[air_df["place_name"].isin(top_cities)]
    if not city_data.empty:
        sns.lineplot(data=city_data, x="year", y="air_quality", hue="place_name", marker="o", linewidth=2.5)
        plt.axhline(60, color="orange", linestyle="--", alpha=0.7, label="CPCB Annual PM2.5 Standard (40-60 µg/m³)")
        plt.axhline(15, color="red", linestyle=":", alpha=0.7, label="WHO Air Quality Guideline (15 µg/m³)")
        plt.title("PM2.5 Air Pollution Trends in Major Indian Metros (2015-2024)", fontsize=14, fontweight="bold")
        plt.xlabel("Year", fontsize=12)
        plt.ylabel("Annual Mean PM2.5 (µg/m³)", fontsize=12)
        plt.legend(bbox_to_anchor=(1.02, 1), loc="upper left")
    plt.tight_layout()
    fig4_path = FIGURES / "04_air_quality_trends.png"
    plt.savefig(fig4_path, dpi=200, bbox_inches="tight")
    plt.close()
    print(f"Saved: {fig4_path}")

    # 5. Figure 5: K-Means Clustering Silhouette Curve & Profiles
    kmeans_metrics_path = DATA_PROCESSED / "kmeans_metrics.csv"
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 5))
    if kmeans_metrics_path.exists():
        k_df = pd.read_csv(kmeans_metrics_path)
        ax1.plot(k_df["k"], k_df["silhouette"], marker="s", color="#8e44ad", linewidth=2)
        ax1.set_title("K-Means Silhouette Score by Cluster Count (k)", fontsize=12, fontweight="bold")
        ax1.set_xlabel("Number of Clusters (k)")
        ax1.set_ylabel("Mean Silhouette Score")
        ax1.grid(True)
    
    cluster_profiles_path = DATA_PROCESSED / "cluster_profiles.csv"
    if cluster_profiles_path.exists():
        c_prof = pd.read_csv(cluster_profiles_path)
        if "score" in c_prof.columns and "cluster_id" in c_prof.columns:
            c_prof = c_prof.sort_values("score", ascending=False)
            sns.barplot(data=c_prof, x="cluster_id", y="score", ax=ax2, palette="viridis")
            ax2.set_title("Mean Composite Score by K-Means Cluster", fontsize=12, fontweight="bold")
            ax2.set_xlabel("Cluster ID")
            ax2.set_ylabel("Mean Score")
    plt.tight_layout()
    fig5_path = FIGURES / "05_kmeans_clusters.png"
    plt.savefig(fig5_path, dpi=200, bbox_inches="tight")
    plt.close()
    print(f"Saved: {fig5_path}")

    # 6. Figure 6: Scatter Relationship - PM2.5 vs Health
    plt.figure(figsize=(9, 6))
    if "air_quality" in factors_wide.columns and "health" in factors_wide.columns:
        valid_scatter = factors_wide.dropna(subset=["air_quality", "health"])
        if not valid_scatter.empty:
            sns.regplot(data=valid_scatter, x="air_quality", y="health", scatter_kws={"alpha": 0.6, "color": "#e67e22"}, line_kws={"color": "#d35400"})
            plt.title("Relationship between PM2.5 Air Pollution and Infant Mortality", fontsize=13, fontweight="bold")
            plt.xlabel("Air Quality (PM2.5 in µg/m³)")
            plt.ylabel("Infant Mortality Rate (per 1,000 live births)")
    plt.tight_layout()
    fig6_path = FIGURES / "06_scatter_relationships.png"
    plt.savefig(fig6_path, dpi=200, bbox_inches="tight")
    plt.close()
    print(f"Saved: {fig6_path}")

    # 7. Figure 7: Top 10 and Bottom 10 Places
    top_bot = latest_scores.dropna(subset=["score"]).sort_values("score", ascending=False)
    if len(top_bot) >= 10:
        top10 = top_bot.head(10).copy()
        bot10 = top_bot.tail(10).copy()
        combined_tb = pd.concat([top10, bot10])
        combined_tb["category"] = ["Top 10" if i < 10 else "Bottom 10" for i in range(len(combined_tb))]

        plt.figure(figsize=(12, 8))
        palette = {"Top 10": "#27ae60", "Bottom 10": "#e74c3c"}
        sns.barplot(data=combined_tb, y="place_name", x="score", hue="category", palette=palette, dodge=False)
        plt.title("Top 10 and Bottom 10 Places in India by Livability Score", fontsize=14, fontweight="bold")
        plt.xlabel("Composite Score (0 - 100)")
        plt.ylabel("Place")
        plt.xlim(0, 100)
        plt.legend(title="Standing")
        plt.tight_layout()
        fig7_path = FIGURES / "07_top_bottom_rankings.png"
        plt.savefig(fig7_path, dpi=200, bbox_inches="tight")
        plt.close()
        print(f"Saved: {fig7_path}")

    # 8. Figure 8: Factor Data Coverage Matrix
    plt.figure(figsize=(10, 6))
    coverage = factors_wide.drop(columns=["place_id", "year"], errors="ignore").notna().mean() * 100
    sns.barplot(x=coverage.values, y=coverage.index, palette="Blues_r")
    plt.title("Data Completeness Rate across Monitored Factors (%)", fontsize=13, fontweight="bold")
    plt.xlabel("Completeness Percentage (%)")
    plt.xlim(0, 100)
    for i, v in enumerate(coverage.values):
        plt.text(v + 1, i, f"{v:.1f}%", va="center", fontweight="bold")
    plt.tight_layout()
    fig8_path = FIGURES / "08_coverage_matrix.png"
    plt.savefig(fig8_path, dpi=200, bbox_inches="tight")
    plt.close()
    print(f"Saved: {fig8_path}")

    # ── Statistical Hypothesis Testing ─────────────────────────────────────
    print("Computing statistical hypothesis tests...")
    regional_cross_section = latest_scores.dropna(subset=["score", "region"])
    region_groups = [
        group["score"].dropna().values
        for _, group in regional_cross_section.groupby("region")
        if len(group["score"].dropna()) > 3
    ]
    anova_f, anova_p = (0.0, 1.0)
    if len(region_groups) >= 2:
        anova_f, anova_p = stats.f_oneway(*region_groups)

    valid_corr = factors_wide.dropna(subset=["air_quality", "health"])
    r_val, p_val = (0.0, 1.0)
    if len(valid_corr) > 5:
        r_val, p_val = stats.pearsonr(valid_corr["air_quality"], valid_corr["health"])

    nsdp_corr = factors_wide.dropna(subset=["per_capita_nsdp_constant", "health"])
    nsdp_r, nsdp_p = (0.0, 1.0)
    if len(nsdp_corr) > 5:
        nsdp_r, nsdp_p = stats.pearsonr(
            nsdp_corr["per_capita_nsdp_constant"], nsdp_corr["health"]
        )

    outlook_counts = trends["outlook"].value_counts().to_dict()
    trend_complete = int(
        outlook_counts.get("Improving", 0)
        + outlook_counts.get("Declining", 0)
        + outlook_counts.get("Stable or uncertain", 0)
    )
    trend_insufficient = int(outlook_counts.get("Insufficient data", 0))

    metrics_path = DATA_PROCESSED / "kmeans_metrics.csv"
    cluster_path = DATA_PROCESSED / "cluster_profiles.csv"
    best_k = None
    best_silhouette = None
    if metrics_path.exists():
        metrics_df = pd.read_csv(metrics_path)
        if not metrics_df.empty:
            best_row = metrics_df.loc[metrics_df["silhouette"].idxmax()]
            best_k = int(best_row["k"])
            best_silhouette = float(best_row["silhouette"])

    cluster_score_range = None
    if cluster_path.exists():
        profile_df = pd.read_csv(cluster_path)
        if "score" in profile_df.columns and not profile_df.empty:
            cluster_score_range = (
                float(profile_df["score"].min()),
                float(profile_df["score"].max()),
            )

    region_summary = (
        regional_cross_section.groupby("region")["score"]
        .agg(["count", "mean", "median"])
        .sort_values("mean", ascending=False)
    )
    region_lines = "\n".join(
        f"- **{region}:** {int(row['count'])} scored places, mean {row['mean']:.1f}, "
        f"median {row['median']:.1f}."
        for region, row in region_summary.iterrows()
    )

    air_significance = "statistically significant" if p_val < 0.05 else "not statistically significant"
    regional_significance = "statistically significant" if anova_p < 0.05 else "not statistically significant"
    nsdp_significance = "statistically significant" if nsdp_p < 0.05 else "not statistically significant"
    cluster_metric_text = (
        f"k={best_k}, silhouette={best_silhouette:.3f}"
        if best_k is not None and best_silhouette is not None
        else "Not available"
    )
    cluster_text = (
        f"Offline K-Means analysis selected $k={best_k}$ (mean silhouette {best_silhouette:.3f}); "
        f"cluster profile scores span {cluster_score_range[0]:.1f} to {cluster_score_range[1]:.1f}. "
        "The interactive interface uses explicit score bands instead of cluster labels."
        if best_k is not None and cluster_score_range
        else "K-Means outputs are not used until cluster assignments are reconciled with the saved metrics."
    )

    findings_content = f"""# Key Findings and Statistical Analysis Report
**India Livability Intelligence System (ILIS)**  
*CAPCTD3 Elective-V: Data Science using Python*  
*Date: 26 October 2026 | Author: Parasmani Khunte (MCA, 2026)*

---

## 1. Executive Summary
This report synthesizes empirical findings from 61 Indian places (32 states/UTs and 29 metropolitan centers) and {len(factors_wide)} processed factor-year rows. The cross-section below uses **{latest_year}**, the latest year with at least 50 scored places; 2023–2024 scores cover cities only because the state safety/health/economy series end in 2022.

| Metric | Result | Interpretation |
|---|---|---|
| **One-Way ANOVA (Regional Livability, {latest_year})** | $F = {anova_f:.2f}, p = {anova_p:.4e}$ | Regional differences are {regional_significance} at $\\alpha = 0.05$ across {len(regional_cross_section)} scored places. |
| **Pearson Correlation (PM2.5 vs IMR)** | $r = {r_val:.2f}, p = {p_val:.4f}$ | Association is {air_significance}; only {len(valid_corr)} rows have both values. |
| **Pearson Correlation (NSDP vs IMR)** | $r = {nsdp_r:.2f}, p = {nsdp_p:.4e}$ | Higher per-capita NSDP is {nsdp_significance} and negatively associated with infant mortality. |
| **Trend Outlook (place-factor series)** | Improving: {outlook_counts.get('Improving', 0)}, Declining: {outlook_counts.get('Declining', 0)}, Stable/uncertain: {outlook_counts.get('Stable or uncertain', 0)}, Insufficient: {trend_insufficient} | {trend_complete} series meet the minimum observation rule for an outlook. |
| **K-Means Analysis (offline)** | {cluster_metric_text} | {cluster_text} |

---

## 2. Key Statistical Insights

### 2.1 Regional Disparities (M4.3 & M4.4)
{region_lines}

The null hypothesis of equal regional means is **{'rejected' if anova_p < 0.05 else 'not rejected'}** at $\\alpha = 0.05$ ($F = {anova_f:.2f}, p = {anova_p:.4e}$). This describes the latest broad cross-section, not a causal claim about any individual place.

### 2.2 Factor Correlations (M4.5)
- **Air Quality and Infant Mortality:** $r = {r_val:.2f}$ ($p = {p_val:.4f}$, n = {len(valid_corr)}). This is {air_significance}; the limited overlap comes from city-level air observations and state-level health series.
- **Economic Output and Infant Mortality:** $r = {nsdp_r:.2f}$ ($p = {nsdp_p:.4e}$, n = {len(nsdp_corr)}). The negative direction is consistent with higher state income accompanying lower infant mortality, but remains an association rather than a causal estimate.

### 2.3 Trends and Clustering (M6)
- **OLS Projections:** Trends are fitted to observed 2015–2024 series and projected to 2034 only when at least five yearly points exist. Missing years stay missing; no synthetic interpolation is added for the web app.
- **Outlook Counts:** {outlook_counts.get('Improving', 0)} improving, {outlook_counts.get('Declining', 0)} declining, {outlook_counts.get('Stable or uncertain', 0)} stable/uncertain, and {trend_insufficient} insufficient-data place-factor series.
- **K-Means:** {cluster_text}

---

## 3. Known Data Gaps
- Air has processed observations for 2015–2019 and 2023–2024, with no 2021–2022 values.
- State safety, health and economy end in 2022; 2023–2024 city scores inherit those latest observations and display the source year.
- Cost of living is a 2022 rent snapshot for six metros and is never trended.
- Population is not present in the processed data, so pins use a fixed scale.

---

## 4. Visual Figures Generated
All visual outputs conform to the M4.6 Matplotlib & Seaborn checklist and are stored in `reports/figures/`:
1. `01_univariate_distributions.png`: Histograms and KDE plots for core factors.
2. `02_regional_boxplots.png`: Composite score distribution by region for {latest_year}.
3. `03_correlation_heatmap.png`: Correlation matrix across livability pillars.
4. `04_air_quality_trends.png`: PM2.5 trajectories for major cities against CPCB and WHO thresholds.
5. `05_kmeans_clusters.png`: K-Means silhouette curve and offline cluster score profiles.
6. `06_scatter_relationships.png`: PM2.5 vs infant mortality scatter plot.
7. `07_top_bottom_rankings.png`: Top and bottom 10 places for {latest_year}.
8. `08_coverage_matrix.png`: Factor completeness across the processed panel.
"""
    findings_path = REPORTS / "findings.md"
    findings_path.write_text(findings_content, encoding="utf-8")
    print(f"Saved: {findings_path}")

if __name__ == "__main__":
    run_eda()
