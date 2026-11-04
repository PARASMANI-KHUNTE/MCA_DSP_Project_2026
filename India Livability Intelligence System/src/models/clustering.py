"""
src/models/clustering.py
─────────────────────────
K-Means clustering of places into livability tiers (M6.4).

Steps:
  1. Standardize factor scores (zero mean, unit variance).
  2. Choose k using elbow method (inertia) + silhouette score.
  3. Fit K-Means with fixed KMEANS_SEED for reproducibility.
  4. Interpret clusters by mean factor profile.
"""

import logging

import numpy as np
import pandas as pd
from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score
from sklearn.preprocessing import StandardScaler

from src.utils.constants import KMEANS_K_RANGE, KMEANS_SEED

logger = logging.getLogger(__name__)


def _choose_k(
    X_scaled: np.ndarray,
    k_range: range = KMEANS_K_RANGE,
    seed: int = KMEANS_SEED,
) -> tuple[int, pd.DataFrame]:
    """
    Run elbow + silhouette search to recommend k.

    Returns
    -------
    best_k     : recommended k (highest silhouette score)
    metrics_df : DataFrame with k, inertia, silhouette for all k in range
    """
    rows = []
    for k in k_range:
        km = KMeans(n_clusters=k, random_state=seed, n_init="auto")
        labels = km.fit_predict(X_scaled)
        inertia = float(km.inertia_)
        sil = float(silhouette_score(X_scaled, labels)) if k > 1 else np.nan
        rows.append({"k": k, "inertia": inertia, "silhouette": sil})
        logger.info("  k=%d  inertia=%.1f  silhouette=%.3f", k, inertia, sil)

    metrics_df = pd.DataFrame(rows)
    best_k = int(metrics_df.loc[metrics_df["silhouette"].idxmax(), "k"])
    logger.info("Recommended k = %d (highest silhouette)", best_k)
    return best_k, metrics_df


def _label_clusters(
    cluster_profiles: pd.DataFrame,
) -> dict[int, str]:
    """
    Assign a human-readable tier label to each cluster based on its
    mean factor scores.

    This is a simple heuristic — review and adjust labels after seeing
    the actual data.
    """
    labels = {}
    for cluster_id, row in cluster_profiles.iterrows():
        scores = row.dropna()
        mean_score = scores.mean()
        if mean_score >= 65:
            labels[cluster_id] = "High livability"
        elif mean_score >= 45:
            labels[cluster_id] = "Medium livability"
        else:
            labels[cluster_id] = "Low livability"
    return labels


def run_clustering(
    scores_wide: pd.DataFrame,
    factor_score_cols: list[str],
    k: int | None = None,
    k_range: range = KMEANS_K_RANGE,
    seed: int = KMEANS_SEED,
) -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    """
    Run K-Means clustering on the latest-year factor scores.

    Parameters
    ----------
    scores_wide       : DataFrame with place_id + factor score columns.
    factor_score_cols : list of column names to use (e.g. ['air_quality_score', ...]).
    k                 : if None, auto-select via silhouette; else use this k.

    Returns
    -------
    clusters_df   : place_id, cluster_id, tier_label
    profiles_df   : mean factor scores per cluster (for interpretation)
    km_metrics_df : k vs inertia vs silhouette (for the elbow plot)
    """
    df = scores_wide.copy().dropna(subset=factor_score_cols)

    X = df[factor_score_cols].values
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    # Choose k
    if k is None:
        logger.info("Searching for best k in range %s ...", list(k_range))
        k, km_metrics_df = _choose_k(X_scaled, k_range=k_range, seed=seed)
    else:
        km_metrics_df = pd.DataFrame()

    logger.info("Fitting K-Means with k=%d, seed=%d", k, seed)
    km = KMeans(n_clusters=k, random_state=seed, n_init="auto")
    df["cluster_id"] = km.fit_predict(X_scaled)

    # Cluster profiles (mean of raw scores, not scaled)
    profiles_df = df.groupby("cluster_id")[factor_score_cols].mean().round(1)
    tier_labels = _label_clusters(profiles_df)

    df["tier_label"] = df["cluster_id"].map(tier_labels)

    clusters_df = df[["place_id", "cluster_id", "tier_label"]].reset_index(drop=True)

    logger.info("Clusters:\n%s", profiles_df.to_string())
    for cid, label in tier_labels.items():
        n = (clusters_df["cluster_id"] == cid).sum()
        logger.info("  Cluster %d (%s): %d places", cid, label, n)

    return clusters_df, profiles_df, km_metrics_df
