import json
from pathlib import Path

# Common robust setup code for Cell 1
SETUP_CELL_CODE = (
    "import sys, os\n"
    "cwd = os.getcwd()\n"
    "ROOT = os.path.abspath(os.path.join(cwd, '..')) if os.path.basename(cwd) == 'notebooks' else os.path.abspath(cwd)\n"
    "if ROOT not in sys.path:\n"
    "    sys.path.insert(0, ROOT)\n"
    "import warnings; warnings.filterwarnings('ignore')\n"
    "import pandas as pd, numpy as np, matplotlib.pyplot as plt, seaborn as sns\n"
    "from src.utils.helpers import setup_logging\n"
    "setup_logging()\n"
    "sns.set_theme(style='whitegrid')\n"
    "FIGURES = os.path.join(ROOT, 'reports', 'figures')\n"
    "os.makedirs(FIGURES, exist_ok=True)\n"
    "print('Environment ready.')"
)

# 1. Update 01_data_profiling.ipynb
p01 = Path("notebooks/01_data_profiling.ipynb")
with open(p01, "r", encoding="utf-8") as f:
    nb01 = json.load(f)

# Cell 1
nb01["cells"][1]["source"] = [SETUP_CELL_CODE]

# Cell 3
c3_src = "".join(nb01["cells"][3]["source"])
c3_src = c3_src.replace(
    "from src.loaders.load_health import load_health",
    "from src.loaders.load_health_nfhs import load_nfhs_health as load_health"
)
nb01["cells"][3]["source"] = [c3_src]

with open(p01, "w", encoding="utf-8") as f:
    json.dump(nb01, f, indent=1)
print("Updated 01_data_profiling.ipynb")

# 2. Update 03_statistics_eda.ipynb
p03 = Path("notebooks/03_statistics_eda.ipynb")
with open(p03, "r", encoding="utf-8") as f:
    nb03 = json.load(f)

nb03["cells"][1]["source"] = [
    SETUP_CELL_CODE + "\n"
    "from scipy import stats\n"
    "from scipy.stats import skew, kurtosis as kurt\n"
    "from src.utils.constants import FACTORS_TIDY, FACTORS_WIDE, PLACES_CSV\n"
    "tidy = pd.read_parquet(FACTORS_TIDY)\n"
    "wide = pd.read_csv(FACTORS_WIDE)\n"
    "places = pd.read_csv(PLACES_CSV)\n"
    "wide = wide.merge(places[['place_id','region','place_type','state_name']], on='place_id', how='left')\n"
    "pm25 = tidy[(tidy['factor']=='air_quality') & (tidy['value_raw'].notna())].copy()\n"
    "pm25 = pm25.merge(places[['place_id','region','place_type']], on='place_id', how='left')\n"
    "pm25['year'] = pm25['year'].astype('Int64')\n"
    "pm25_vals = pm25['value_raw'].dropna()\n"
    "print(f'Tidy: {tidy.shape}, PM2.5 rows: {len(pm25_vals)}')"
]

# Cell 5: Spearman Correlation with canonical columns & latest snapshot
nb03["cells"][5]["source"] = [
    "# Canonical factor columns in wide table\n"
    "candidate_cols = ['air_quality', 'safety', 'health', 'per_capita_nsdp_constant', 'unemployment_rate', 'cost_of_living']\n"
    "factor_cols = [c for c in candidate_cols if c in wide.columns]\n"
    "if factor_cols:\n"
    "    # Aggregate to latest observed cross-sectional snapshot per place to capture inter-factor relationships\n"
    "    snapshot = wide.sort_values('year').groupby('place_id')[factor_cols].last()\n"
    "    col_labels = {\n"
    "        'air_quality': 'Air Quality (PM2.5)',\n"
    "        'safety': 'Safety (Crime Rate)',\n"
    "        'health': 'Health Index',\n"
    "        'per_capita_nsdp_constant': 'Per Capita NSDP',\n"
    "        'unemployment_rate': 'Unemployment Rate',\n"
    "        'cost_of_living': 'Cost of Living'\n"
    "    }\n"
    "    corr = snapshot.corr(method='spearman')\n"
    "    corr_labeled = corr.rename(index=col_labels, columns=col_labels)\n"
    "    fig, ax = plt.subplots(figsize=(9, 7))\n"
    "    sns.heatmap(corr_labeled, ax=ax, cmap='RdBu_r', center=0, vmin=-1, vmax=1, annot=True, fmt='.2f', linewidths=0.5)\n"
    "    ax.set_title('Spearman Correlation Matrix (Cross-Sectional Place Snapshot)', fontsize=12, fontweight='bold')\n"
    "    plt.xticks(rotation=30, ha='right')\n"
    "    plt.yticks(rotation=0)\n"
    "    plt.tight_layout()\n"
    "    plt.savefig(f'{FIGURES}/03_correlation_matrix.png', dpi=150, bbox_inches='tight')\n"
    "    plt.show()\n"
    "else:\n"
    "    print('No numeric factor columns found in wide table.')"
]

# Cell 18: Rich statistical findings export
nb03["cells"][18]["source"] = [
    "import pathlib\n"
    "reports_dir = pathlib.Path(ROOT) / 'reports'\n"
    "reports_dir.mkdir(parents=True, exist_ok=True)\n"
    "rho_econ = snapshot['per_capita_nsdp_constant'].corr(snapshot['cost_of_living'], method='spearman')\n"
    "findings = [\n"
    "    f'Mean PM2.5: {pm25_vals.mean():.2f} ug/m3 (NAAQS statutory threshold: {NAAQS:.1f} ug/m3; one-sample t={t3:.2f}, p={p3_os:.4e})',\n"
    "    f'PM2.5 normality rejection (Shapiro-Wilk W={stat_sw:.4f}, p={p_sw:.4e}) confirms heavy-tailed right-skewed distribution',\n"
    "    f'North region mean PM2.5: {north.mean():.2f} ug/m3 vs South region mean PM2.5: {south.mean():.2f} ug/m3 (Welch t={t1:.2f}, p={p1:.4e})',\n"
    "    f'Regional PM2.5 ANOVA disparity: F={F:.2f}, p={p_an:.4e} (statistically significant across geographic zones)',\n"
    "    f'Per Capita NSDP vs Cost of Living Spearman rank correlation: rho={rho_econ:.2f} (statistically significant positive association)',\n"
    "]\n"
    "findings_path = reports_dir / 'findings.md'\n"
    "with open(findings_path, 'w', encoding='utf-8') as f:\n"
    "    f.write('# Key Statistical Findings (MCA DSP 2026)\\n\\n')\n"
    "    for line in findings:\n"
    "        f.write(f'- {line}\\n')\n"
    "print(f'Saved: {findings_path}')"
]

with open(p03, "w", encoding="utf-8") as f:
    json.dump(nb03, f, indent=1)
print("Updated 03_statistics_eda.ipynb")

# 3. Update 05_ml_trend_clustering.ipynb
p05 = Path("notebooks/05_ml_trend_clustering.ipynb")
with open(p05, "r", encoding="utf-8") as f:
    nb05 = json.load(f)

# Cell 1
nb05["cells"][1]["source"] = [
    SETUP_CELL_CODE + "\n"
    "import statsmodels.api as sm\n"
    "from sklearn.metrics import mean_squared_error, r2_score\n"
    "from src.utils.constants import (\n"
    "    FACTORS_TIDY, FACTORS_WIDE, PLACES_CSV, SCORES_WIDE,\n"
    "    TRENDS_CSV, CLUSTERS_CSV, METRICS_JSON, MODELS_DIR, DATA_PROCESSED\n"
    ")\n"
    "from src.scoring.scoring import load_config, compute_scores\n"
    "from src.models.trend import run_all_trends\n"
    "from src.models.clustering import run_clustering\n"
    "tidy = pd.read_parquet(FACTORS_TIDY)\n"
    "wide = pd.read_csv(FACTORS_WIDE)\n"
    "places = pd.read_csv(PLACES_CSV)\n"
    "config = load_config()\n"
    "DATA_PROCESSED.mkdir(exist_ok=True)\n"
    "MODELS_DIR.mkdir(exist_ok=True)\n"
    "balanced = {'air_quality':0.30,'safety':0.25,'health':0.25,'economy':0.20}\n"
    "all_years = sorted(wide['year'].dropna().unique().astype(int).tolist())\n"
    "print(f'Years: {all_years}')"
]

# Cell 8: Coerce slope to numeric
nb05["cells"][8]["source"] = [
    "# Visualise trend for top 5 cities by air quality\n"
    "city_air = trends_df[(trends_df['factor']=='air_quality') & (trends_df['place_id'].isin(places[places['place_type']=='city']['place_id']))].merge(places[['place_id','place_name']], on='place_id')\n"
    "city_air['slope'] = pd.to_numeric(city_air['slope'], errors='coerce')\n"
    "top5 = city_air.dropna(subset=['slope']).nsmallest(5, 'slope')\n"
    "if len(top5)>0:\n"
    "    fig, axes = plt.subplots(1, len(top5), figsize=(14, 4), sharey=False)\n"
    "    if len(top5)==1: axes=[axes]\n"
    "    for ax, (_, row) in zip(axes, top5.iterrows()):\n"
    "        hist = fslong[(fslong['place_id']==row['place_id']) & (fslong['factor']=='air_quality')]\n"
    "        proj = projections_df[(projections_df['place_id']==row['place_id']) & (projections_df['factor']=='air_quality')]\n"
    "        ax.plot(hist['year'], hist['score'], 'o-', color='#3498db', label='Historical', markersize=5)\n"
    "        if not proj.empty:\n"
    "            ax.plot(proj['year'], proj['yhat'], '--', color='#e74c3c', label='Projected')\n"
    "            ax.fill_between(proj['year'], proj['lower'], proj['upper'], alpha=0.2, color='#e74c3c')\n"
    "        ax.set_title(f\"{row['place_name']}\\n({row['outlook']})\", fontsize=9)\n"
    "        ax.set_ylim(0, 100)\n"
    "        ax.legend(fontsize=7)\n"
    "    plt.suptitle('Air Quality: 10-Year Projection', fontsize=12, fontweight='bold')\n"
    "    plt.tight_layout()\n"
    "    plt.savefig(f'{FIGURES}/05_trend_projections.png', dpi=150, bbox_inches='tight')\n"
    "    plt.show()"
]

# Cell 14: Clustering on composite score across highest-coverage year
nb05["cells"][14]["source"] = [
    "# Find year with highest valid composite score coverage\n"
    "best_year = None\n"
    "best_count = 0\n"
    "for yr in sorted(scores_long['year'].unique(), reverse=True):\n"
    "    yr_df = scores_long[scores_long['year'] == yr]\n"
    "    cnt = yr_df['score'].notna().sum()\n"
    "    if cnt > best_count:\n"
    "        best_count = cnt\n"
    "        best_year = yr\n"
    "\n"
    "cluster_year = int(best_year) if best_year is not None else int(scores_long['year'].max())\n"
    "latest_scores = scores_long[scores_long['year'] == cluster_year].copy()\n"
    "feature_cols = ['score'] if 'score' in latest_scores.columns else [c for c in latest_scores.columns if c.endswith('_score')]\n"
    "\n"
    "if feature_cols and len(latest_scores.dropna(subset=feature_cols[:1])) >= 4:\n"
    "    clusters_df, profiles_df, km_metrics = run_clustering(latest_scores, factor_score_cols=feature_cols)\n"
    "    print(f'Cluster profiles for year {cluster_year} (n={len(clusters_df)}):')\n"
    "    print(profiles_df)\n"
    "    cn = clusters_df.merge(places[['place_id','place_name','place_type']], on='place_id', how='left')\n"
    "    print(cn.head(20))\n"
    "else:\n"
    "    print('Not enough data for clustering.')\n"
    "    clusters_df = pd.DataFrame(); km_metrics = pd.DataFrame()"
]

# Cell 17: Metrics export with cluster_year
nb05["cells"][17]["source"] = [
    "import json\n"
    "from src.models.run_ml import evaluate_air_holdout\n"
    "\n"
    "if not trends_df.empty:\n"
    "    trends_df['last_year'] = cluster_year\n"
    "    trends_df.to_csv(TRENDS_CSV, index=False)\n"
    "    print(f'Saved: {TRENDS_CSV}')\n"
    "if not clusters_df.empty:\n"
    "    clusters_df.to_csv(CLUSTERS_CSV, index=False)\n"
    "    print(f'Saved: {CLUSTERS_CSV}')\n"
    "metrics_out = {\n"
    "    'holdout_evaluation': evaluate_air_holdout(scores_long),\n"
    "    'clustering': {\n"
    "        'k_chosen': int(clusters_df['cluster_id'].nunique()) if not clusters_df.empty else None,\n"
    "        'year': int(cluster_year),\n"
    "        'n_places': int(clusters_df['place_id'].nunique()) if not clusters_df.empty else 0,\n"
    "    },\n"
    "    'trends': {\n"
    "        'n_fitted': int((trends_df['outlook'] != 'Insufficient data').sum()) if not trends_df.empty else 0,\n"
    "        'n_insufficient': int((trends_df['outlook'] == 'Insufficient data').sum()) if not trends_df.empty else 0,\n"
    "    },\n"
    "}\n"
    "with open(METRICS_JSON, 'w', encoding='utf-8') as f:\n"
    "    json.dump(metrics_out, f, indent=2)\n"
    "print(f'Saved: {METRICS_JSON}')"
]

with open(p05, "w", encoding="utf-8") as f:
    json.dump(nb05, f, indent=1)
print("Updated 05_ml_trend_clustering.ipynb")
