<div align="center">

# 🇮🇳 India Livability Intelligence System
### Data Science Project — MCA 2026
**Course:** CAPCTD3 Elective-V | **Capstone Project**

[![React](https://img.shields.io/badge/Frontend-React_19_%2B_Vite-61DAFB.svg?logo=react&logoColor=black)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4.0-38B2AC.svg?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/Academic-MCA_Capstone_2026-orange.svg)](#acknowledgments)

<p align="center">
  <b>Research Question:</b><br/>
  <i>"Is India Becoming Less Livable? A Data-Driven Livability Index with Interactive Map and Trend Projection"</i>
</p>

</div>

---

## 👥 Authors & Team Members

- **Parasmani Khunte**
- **Shuchi Trivedi**

*Master of Computer Applications (MCA) — Batch 2026*  
*Specialization:* Data Science using Python (DSP)

---

## 📌 Executive Summary

The **India Livability Intelligence System** is an interactive, empirical intelligence dashboard and decision-support system evaluating multi-criteria quality of life across 36 Indian States and Union Territories and 61 cities.

Rather than relying on subjective opinions or anecdotal perceptions, this platform integrates multi-source official public datasets (CPCB, NCRB, RBI, MoSPI, Registrar General of India) into a standardized multi-factor composite index, supported by:
1. **Multi-Pillar Composite Scoring:** Evaluates Air Quality, Healthcare Infrastructure, Public Safety, Economic Vitality, and Cost of Living with customizable weights and presets.
2. **Inferential Statistics & Hypothesis Testing:** One-Way ANOVA for regional disparity, Pearson correlation matrices, and sensitivity testing.
3. **Time-Series Trend Projection:** Ordinary Least Squares (OLS) regression models projecting historical trajectories with 95% confidence intervals through 2034.
4. **Unsupervised Machine Learning & Archetypes:** K-Means clustering ($k=5$, Silhouette Score $= 0.647$) for grouping regions by multi-dimensional profiles.
5. **Interactive React Application:** Modern React 19 + Vite dashboard featuring dynamic choropleth maps, radar comparisons, factor breakdowns, side-by-side comparison tray, and what-if simulation.

---

## 🚀 Running the Application

```bash
# Install dependencies
npm install

# Start development server on port 3000
npm run dev

# Build for production
npm run build
```

---

## 🛠️ Technology Stack

- **Framework:** React 19 with Vite 6
- **Styling:** Tailwind CSS v4
- **Icons:** Lucide React
- **Animations:** Canvas Confetti
- **Analytics & Engine:** Embedded client-side multi-criteria scoring and OLS projection engine
