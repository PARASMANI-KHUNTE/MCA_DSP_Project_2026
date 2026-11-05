"""
part1_front_matter.py
─────────────────────
Front matter for India Livability Intelligence System academic report.
"""

FRONT_MATTER_MD = """# INDIA LIVABILITY INTELLIGENCE SYSTEM (ILIS)
## A Multi-Criteria Analytical Framework, Statistical Trend Projections, and Interactive Spatial Decision Support System

---

**Course:** Data Science using Python (CAPCTD3 Elective-V)  
**Academic Degree:** Master of Computer Applications (MCA) — Batch 2024–2026  
**Candidate Name:** Parasmani Khunte  
**Co-Contributor:** Shuchi Trivedi  
**Specialization:** Data Science & Advanced Software Engineering  
**Department:** Department of Computer Applications  
**Academic Submission Year:** 2026  

---

## CERTIFICATE OF APPROVAL

This is to certify that the project entitled **"India Livability Intelligence System: A Multi-Criteria Analytical Framework, Statistical Trend Projections, and Interactive Spatial Decision Support System"** submitted by **Parasmani Khunte** (with co-contributor **Shuchi Trivedi**) in partial fulfillment of the requirements for the degree of **Master of Computer Applications (MCA)** under the course **Data Science using Python (CAPCTD3 Elective-V)**, is an authentic record of academic and practical work carried out under appropriate supervision.

The content presented in this report has been verified against the underlying software repository, empirical data pipelines, and test suites. The source code, data engineering architecture, statistical formulations, and evaluation results embody genuine academic investigation and software engineering principles.

<br/><br/>
___________________________ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ___________________________  
**Project Supervisor / Faculty Mentor** &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; **Head of Department**  
Department of Computer Applications &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Department of Computer Applications  

---

## CANDIDATE'S DECLARATION

I hereby declare that this project report titled **"India Livability Intelligence System"** submitted in partial fulfillment of the degree of Master of Computer Applications is my original work. All data sources, analytical algorithms, library implementations, and research findings reported herein reflect genuine development and empirical execution.

I further declare that this work adheres strictly to academic integrity standards:
1. All public datasets ingested from official statutory bodies (CPCB, NCRB, MoHFW NFHS-5, RBI, MoSPI) and open repositories are explicitly registered with citations in `data/raw/source_register.csv`.
2. A formal provenance and fabrication audit was completed on 3 November 2026 (`reports/data_fabrication_audit.md`) that identified, quarantined, and eliminated six synthetic placeholder files from the active pipeline, ensuring that all published scores derive from verifiable inputs.
3. Every component—including the FastAPI REST microservice, React 19 geospatial dashboard, OLS trend projection models, and K-Means clustering—has been implemented and verified against an automated test suite comprising 85 test specifications with 84 passing and 0 failures.

<br/><br/>
**Parasmani Khunte**  
Candidate, Master of Computer Applications (MCA 2026)  
Date: November 2026  

---

## ACKNOWLEDGEMENT

I express my deepest gratitude to our faculty mentors, course instructors, and laboratory coordinators in the Department of Computer Applications for their invaluable academic guidance, technical critiques, and encouragement throughout the lifecycle of the **Data Science using Python (DSP)** capstone curriculum.

I extend sincere appreciation to the open-data initiatives and statutory data-producing agencies of the Government of India, including the Central Pollution Control Board (CPCB), the National Crime Records Bureau (NCRB), the Ministry of Health and Family Welfare (MoHFW), the Reserve Bank of India (RBI), and the Ministry of Statistics and Programme Implementation (MoSPI). Their systematic publication of official public statistics makes data-driven civic transparency and empirical academic research possible.

Finally, I thank my team co-contributor, Shuchi Trivedi, and our peers for their collaborative insights, constructive code reviews, and shared commitment to engineering robust, reproducible data science software.

---

## ABSTRACT

Selecting an urban center or state to reside in within India is conventionally steered by anecdotal narratives, uncurated real estate marketing, or isolated commercial cost indices. Public indicators concerning ambient air quality, criminal victimization, public health infrastructure, and economic opportunity are heavily fragmented across distinct statutory bodies, divergent measurement conventions, and incongruent spatial granularities (metropolitan monitoring stations versus state-level administrative jurisdictions).

To resolve these empirical challenges, this project establishes the **India Livability Intelligence System (ILIS)**: an end-to-end data science architecture and geospatial decision-support platform spanning 61 geographic entities (32 states/Union Territories and 29 primary metropolitan centers). The system implements a complete data engineering lifecycle comprising:
1. **Multi-Source Data Ingestion & Governance:** Ingestion of public environmental, demographic, public safety, and economic indicators spanning 2010–2026, backed by a cryptographic SHA-256 provenance quarantine gate and non-destructive Tukey Interquartile Range (IQR) outlier fencing.
2. **Direction-Aware Mathematical Normalization:** A bounded $[0, 100]$ Min-Max normalization engine that enforces direction inversion for negative externalities (PM2.5 particulate matter, IPC cognizable crime rates, unemployment rates) and positive scaling for developmental goods (per-capita NSDP, NFHS-5 maternal/child healthcare composite).
3. **Dynamic Composite Scoring & Stakeholder Personas:** A flexible multi-criteria evaluation framework featuring client-side and server-side weight normalization, minimum-factor gating, and customizable persona presets (Balanced, Clean Air First, Family Wellbeing, Career Growth, and Student Budget).
4. **Longitudinal Trend Modeling & Inferential Statistics:** Ordinary Least Squares (OLS) regression models generating 10-year forward projections (2025–2034) with 95% prediction intervals; One-Way ANOVA proving statistically significant regional disparity ($F = 7.23, p = 2.89 \\times 10^{-5}$ across the complete 61-place panel, and $F = 13.27, p = 3.38 \\times 10^{-4}$ on the 2023 cross-section); and unsupervised K-Means clustering ($k=5$, Silhouette Score $= 0.647$).
5. **Decoupled Dual-Tier Architecture:** A high-throughput Python FastAPI REST service equipped with an in-memory, LRU-cached `DataStore` singleton, paired with an interactive single-page application built on React 19, Vite, Tailwind CSS, and an interactive vector SVG India map with client-side real-time calculation.

The software architecture is substantiated by 85 automated test cases achieving comprehensive coverage across schema integrity, mathematical normalization invariants, regression determinism, and data provenance verification.

---

## KEYWORDS

Livability Index, Urban Data Science, Multi-Criteria Decision Analysis (MCDA), Spatial Intelligence, Directional Min-Max Normalization, Ordinary Least Squares (OLS) Projections, K-Means Clustering, One-Way ANOVA, FastAPI, React 19, Automated Provenance Verification.

---

## TABLE OF CONTENTS

- **Front Matter**
  - Certificate of Approval
  - Candidate's Declaration
  - Acknowledgement
  - Abstract
  - Keywords
  - List of Tables
  - List of Figures
- **CHAPTER 1: INTRODUCTION**
  - 1.1 Background and Context
  - 1.2 Problem Statement
  - 1.3 Existing Challenges and Gaps in Prior Systems
  - 1.4 Proposed Solution
  - 1.5 High-Level Project Overview
- **CHAPTER 2: OBJECTIVES AND SCOPE**
  - 2.1 Primary Project Objectives
  - 2.2 Functional Scope
  - 2.3 Operational and Analytical Scope
  - 2.4 Target Users and Stakeholder Profiles
  - 2.5 System Boundaries and Analytical Limitations
- **CHAPTER 3: SYSTEM REQUIREMENTS AND TECHNOLOGY STACK**
  - 3.1 Hardware Requirements Specification
  - 3.2 Software and Operating Environment Requirements
  - 3.3 Development Environment Setup
  - 3.4 Comprehensive Technology Stack Inventory
  - 3.5 Technology Selection and Architectural Justification
- **CHAPTER 4: SYSTEM ANALYSIS AND DESIGN**
  - 4.1 Functional Requirements Specification
  - 4.2 Non-Functional Requirements Specification
  - 4.3 End-to-End System Architecture
  - 4.4 Data Pipeline & ETL Architecture
  - 4.5 Data Modeling & Analytical Schemas
  - 4.6 RESTful API Design & Endpoint Specifications
  - 4.7 Core Mathematical and Statistical Algorithms
  - 4.8 Security, Data Provenance, and Access Architecture
- **CHAPTER 5: IMPLEMENTATION DETAILS**
  - 5.1 System Entry Points and Lifespan Execution
  - 5.2 Data Loaders and Entity Aliasing (`src/loaders/`)
  - 5.3 Normalization and Scoring Implementation (`src/scoring/`)
  - 5.4 Machine Learning and Statistical Projections (`src/models/`)
  - 5.5 Backend REST Microservice Implementation (`backend/app/`)
  - 5.6 Frontend Geospatial Dashboard Implementation (`frontend/src/`)
  - 5.7 Data Provenance and Quality Assurance Modules (`src/utils/`)
  - 5.8 Error Handling, Edge Cases, and System Reliability
- **CHAPTER 6: TESTING AND QUALITY ASSURANCE**
  - 6.1 Testing Strategy and Test Harness (`pytest`)
  - 6.2 Test Suite Execution Results (84 Passed, 1 Skipped)
  - 6.3 Schema and Referential Integrity Test Suite
  - 6.4 Scoring Engine Mathematical Parity and Invariant Tests
  - 6.5 Statistical Modeling and ML Validation Tests
  - 6.6 API Integration Testing and Runtime Observations
  - 6.7 Comprehensive Verification Traceability Matrix
- **CHAPTER 7: RESULTS, EMPIRICAL FINDINGS, AND FUTURE SCOPE**
  - 7.1 Inferential Statistics and Empirical Observations
  - 7.2 Unsupervised Learning and Cluster Archetypes
  - 7.3 Model Holdout Cross-Validation & Sensitivity Analysis
  - 7.4 Key Engineering Achievements
  - 7.5 Verified Limitations and Data Gaps
  - 7.6 Academic and Practical Conclusion
  - 7.7 Future Engineering and Research Roadmap
- **CHAPTER 8: REFERENCES (IEEE STYLE)**

---

## LIST OF TABLES

- **Table 3.1:** Verified Hardware Specification Environment
- **Table 3.2:** Comprehensive Technology Stack Inventory
- **Table 4.1:** Primary Entities Master Specification (`places.csv`)
- **Table 4.2:** Long Analytical Schema (`factors_tidy.parquet`)
- **Table 4.3:** Consolidated Cross-Sectional Table (`factors_wide.csv`)
- **Table 4.4:** Composite Scoring Output Schema (`scores_wide.csv`)
- **Table 4.5:** Longitudinal Trend Projections Schema (`trends.csv`)
- **Table 4.6:** REST API Route Catalogue and Response Envelopes
- **Table 4.7:** Indicator Direction, Boundaries, and Normalization Anchors
- **Table 4.8:** System Persona Weight Allocations
- **Table 5.1:** Data Loader Registry and Upstream Provenance Sources
- **Table 6.1:** Test Suite Module Distribution and Execution Metrics
- **Table 6.2:** Comprehensive Test Case Verification Matrix
- **Table 7.1:** Regional Disparity ANOVA Results (Complete 61-Place Panel vs 2023 Cross-Section)
- **Table 7.2:** Correlation Matrix Between Core Urban Indicators
- **Table 7.3:** K-Means Silhouette Scores Across Evaluated Cluster Counts ($k=2$ to $k=7$)
- **Table 7.4:** Out-of-Sample Holdout Model Validation Metrics for Trend Forecasting

---

## LIST OF FIGURES

- **Figure 4.1:** High-Level System Architecture of India Livability Intelligence System
- **Figure 4.2:** End-to-End Data Ingestion, Cleaning, and Analytical Pipeline
- **Figure 4.3:** Mathematical Normalization and Composite Scoring Engine Workflow
- **Figure 4.4:** React 19 Frontend Component Hierarchy and Interaction Model
- **Figure 4.5:** Sequence Diagram of API Request Execution and In-Memory DataStore Lifecycle
- **Figure 7.1:** Univariate Feature Distributions and Density Estimates of Core Indicators
- **Figure 7.2:** Regional Boxplots Illustrating Geographic Score Disparities
- **Figure 7.3:** Pearson Correlation Heatmap Across Core Quality-of-Life Indicators
- **Figure 7.4:** Ambient PM2.5 Trajectories for Major Cities Against National CPCB Standards
- **Figure 7.5:** K-Means Cluster Silhouette Curve and Profiling Radar Archetypes
- **Figure 7.6:** Top 10 and Bottom 10 Scored Geographic Entities
"""
