"""
generate_documents.py
─────────────────────
Complete generator for the academic Master's project report:
  1. PROJECT_REPORT.md
  2. PROJECT_REPORT.docx
  3. PROJECT_REPORT.pdf
"""

import os
import sys
from pathlib import Path
import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn
from markdown_pdf import Section, MarkdownPdf

REPORT_DIR = Path(__file__).resolve().parent
MD_PATH = REPORT_DIR / "PROJECT_REPORT.md"
DOCX_PATH = REPORT_DIR / "PROJECT_REPORT.docx"
PDF_PATH = REPORT_DIR / "PROJECT_REPORT.pdf"
DIAGRAMS_DIR = REPORT_DIR / "diagrams"

print(f"Working in: {REPORT_DIR}")
