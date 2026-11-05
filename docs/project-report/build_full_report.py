"""
build_full_report.py
────────────────────
Assembles the complete academic project report for the India Livability Intelligence System.
Outputs:
  - docs/project-report/PROJECT_REPORT.md
  - docs/project-report/PROJECT_REPORT.docx
  - docs/project-report/PROJECT_REPORT.pdf
"""

import os
import sys
from pathlib import Path

# Paths
REPORT_DIR = Path("docs/project-report")
REPORT_MD = REPORT_DIR / "PROJECT_REPORT.md"
REPORT_DOCX = REPORT_DIR / "PROJECT_REPORT.docx"
REPORT_PDF = REPORT_DIR / "PROJECT_REPORT.pdf"
DIAGRAMS_DIR = REPORT_DIR / "diagrams"

print("Compiling Project Report deliverables...")
