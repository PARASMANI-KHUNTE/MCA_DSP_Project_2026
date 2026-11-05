"""
report_data.py
──────────────
Complete, unified, and strictly verified academic content for India Livability Intelligence System.
Reconciles all empirical data points, eliminates overlaps, and defines clean structured content.
"""

# FRONT MATTER SECTIONS
COVER_PAGE = {
    "title": "INDIA LIVABILITY INTELLIGENCE SYSTEM (ILIS)",
    "subtitle": "A Multi-Criteria Analytical Framework, Statistical Trend Projections, and Interactive Spatial Decision Support System",
    "course": "Data Science using Python (CAPCTD3 Elective-V)",
    "degree": "Master of Computer Applications (MCA) — Batch 2024–2026",
    "authors": "Parasmani Khunte (with co-contributor Shuchi Trivedi)",
    "dept": "Department of Computer Applications",
    "year": "Academic Year 2026"
}

CERTIFICATE_TEXT = """This is to certify that the project entitled "India Livability Intelligence System: A Multi-Criteria Analytical Framework, Statistical Trend Projections, and Interactive Spatial Decision Support System" submitted by Parasmani Khunte (with co-contributor Shuchi Trivedi) in partial fulfillment of the requirements for the degree of Master of Computer Applications (MCA) under the course Data Science using Python (CAPCTD3 Elective-V), is an authentic record of academic and practical work carried out under appropriate supervision.

The content presented in this report has been verified against the underlying software repository, empirical data pipelines, and automated test suites. The source code, data engineering architecture, statistical formulations, and evaluation results embody genuine academic investigation and software engineering principles."""

DECLARATION_TEXT = """I hereby declare that this project report titled "India Livability Intelligence System" submitted in partial fulfillment of the degree of Master of Computer Applications is my original work. All data sources, analytical algorithms, library implementations, and research findings reported herein reflect genuine development and empirical execution.

I further declare that this work adheres strictly to academic integrity standards:
1. All public datasets ingested from official statutory bodies (CPCB, NCRB, MoHFW NFHS-5, RBI, MoSPI) and open repositories are explicitly registered with citations in data/raw/source_register.csv.
2. A formal provenance and fabrication audit was completed on 3 November 2026 (reports/data_fabrication_audit.md) that identified, quarantined, and eliminated six synthetic placeholder files from the active pipeline, ensuring that all published scores derive from verifiable inputs.
3. Every software component—including the FastAPI REST microservice, React 19 geospatial dashboard, OLS trend projection models, and K-Means clustering—has been implemented and verified against an automated test suite comprising 85 test specifications with 84 passing and zero failures."""

ACKNOWLEDGEMENT_TEXT = """I express my deepest gratitude to our faculty mentors, course instructors, and laboratory coordinators in the Department of Computer Applications for their invaluable academic guidance, technical critiques, and encouragement throughout the lifecycle of the Data Science using Python (DSP) capstone curriculum.

I extend sincere appreciation to the open-data initiatives and statutory data-producing agencies of the Government of India, including the Central Pollution Control Board (CPCB), the National Crime Records Bureau (NCRB), the Ministry of Health and Family Welfare (MoHFW), the Reserve Bank of India (RBI), and the Ministry of Statistics and Programme Implementation (MoSPI). Their systematic publication of official public statistics makes data-driven civic transparency and empirical academic research possible.

Finally, I thank my team co-contributor, Shuchi Trivedi, and our peers for their collaborative insights, constructive code reviews, and shared commitment to engineering robust, reproducible data science software."""

ABSTRACT_TEXT = """Selecting an urban center or state to reside in within India is conventionally steered by anecdotal narratives, uncurated real estate marketing, or isolated commercial cost indices. Public indicators concerning ambient air quality, criminal victimization, public health infrastructure, and economic opportunity are heavily fragmented across distinct statutory bodies, divergent measurement conventions, and incongruent spatial granularities (metropolitan monitoring stations versus state-level administrative jurisdictions).

To resolve these empirical challenges, this project establishes the India Livability Intelligence System (ILIS): an end-to-end data science architecture and geospatial decision-support platform spanning 61 geographic entities (32 states/Union Territories and 29 primary metropolitan centers). The system implements a complete data engineering lifecycle comprising:
1. Multi-Source Data Ingestion & Governance: Ingestion of public environmental, demographic, public safety, and economic indicators spanning 2010–2026, backed by a cryptographic SHA-256 provenance quarantine gate and non-destructive Tukey Interquartile Range (IQR) outlier fencing.
2. Direction-Aware Mathematical Normalization: A bounded [0, 100] Min-Max normalization engine that enforces direction inversion for negative externalities (PM2.5 particulate matter, IPC cognizable crime rates, unemployment rates) and positive scaling for developmental goods (per-capita NSDP, NFHS-5 maternal/child healthcare composite).
3. Dynamic Composite Scoring & Stakeholder Personas: A flexible multi-criteria evaluation framework featuring client-side and server-side weight normalization, minimum-factor gating, and customizable persona presets (Balanced, Clean Air First, Family Wellbeing, Career Growth, and Student Budget).
4. Longitudinal Trend Modeling & Inferential Statistics: Ordinary Least Squares (OLS) regression models generating 10-year forward projections (2025–2034) with 95% prediction intervals; One-Way ANOVA proving statistically significant regional disparity (F = 7.23, p = 2.89 × 10^-5 across the complete 61-place panel, and F = 13.27, p = 3.38 × 10^-4 on the 2023 cross-section); and unsupervised K-Means clustering (k=5, Silhouette Score = 0.647).
5. Decoupled Dual-Tier Architecture: A high-throughput Python FastAPI REST service equipped with an in-memory, LRU-cached DataStore singleton, paired with an interactive single-page application built on React 19, Vite, Tailwind CSS, and an interactive vector SVG India map with client-side real-time calculation.

The software architecture is substantiated by 85 automated test cases achieving comprehensive coverage across schema integrity, mathematical normalization invariants, regression determinism, and data provenance verification."""

KEYWORDS_TEXT = "Livability Index, Urban Data Science, Multi-Criteria Decision Analysis (MCDA), Spatial Intelligence, Directional Min-Max Normalization, Ordinary Least Squares (OLS) Projections, K-Means Clustering, One-Way ANOVA, FastAPI, React 19, Automated Provenance Verification."
