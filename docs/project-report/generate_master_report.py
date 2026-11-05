"""
generate_master_report.py
─────────────────────────
Publication-quality Academic Project Report Generator for India Livability Intelligence System.
Produces:
  1. PROJECT_REPORT.docx (Strict OpenXML, beautiful typography, headers, footers, page breaks)
  2. PROJECT_REPORT.pdf  (Native Word PDF export with exact layout fidelity)
  3. PROJECT_REPORT.md   (Clean, complete Markdown source)
"""

import os
import sys
import re
from pathlib import Path

REPORT_DIR = Path(__file__).resolve().parent
BUILDER_DIR = REPORT_DIR / "builder"
if str(BUILDER_DIR) not in sys.path:
    sys.path.insert(0, str(BUILDER_DIR))
if str(REPORT_DIR) not in sys.path:
    sys.path.insert(0, str(REPORT_DIR))

import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.enum.section import WD_SECTION_START
from docx.oxml import parse_xml, OxmlElement
from docx.oxml.ns import nsdecls, qn

from report_data import (
    COVER_PAGE,
    CERTIFICATE_TEXT,
    DECLARATION_TEXT,
    ACKNOWLEDGEMENT_TEXT,
    ABSTRACT_TEXT,
    KEYWORDS_TEXT,
)
from part2_chapters_1_to_3 import CHAPTERS_1_TO_3_MD
from part3_chapters_4_to_5 import CHAPTERS_4_TO_5_MD
from part4_chapters_6_to_8 import CHAPTERS_6_TO_8_MD

MD_PATH = REPORT_DIR / "PROJECT_REPORT.md"
DOCX_PATH = REPORT_DIR / "PROJECT_REPORT.docx"
PDF_PATH = REPORT_DIR / "PROJECT_REPORT.pdf"
DIAGRAMS_DIR = REPORT_DIR / "diagrams"

NAVY = RGBColor(0x1B, 0x36, 0x5D)
SLATE = RGBColor(0x2C, 0x3E, 0x50)
MUTED = RGBColor(0x56, 0x65, 0x73)
CODE_BLUE = RGBColor(0x1A, 0x52, 0x76)


def clean_math_and_text(s: str) -> str:
    """Transforms LaTeX commands, equations, and raw math markup into clean Unicode math typography."""
    if not s:
        return ""
    
    # 1. LaTeX font and text wrappers
    s = re.sub(r'\\text\{([^}]*)\}', r'\1', s)
    s = re.sub(r'\\mathrm\{([^}]*)\}', r'\1', s)
    s = re.sub(r'\\mathbf\{([^}]*)\}', r'\1', s)
    s = re.sub(r'\\boldsymbol\{([^}]*)\}', r'\1', s)

    # 2. Fractions and roots
    s = re.sub(r'\\frac\{([^}]*)\}\{([^}]*)\}', r'(\1) / (\2)', s)
    s = re.sub(r'\\sqrt\{([^}]*)\}', r'√(\1)', s)

    # 3. Operators & Comparisons
    s = re.sub(r'\\times\b', '×', s)
    s = re.sub(r'\\pm\b', '±', s)
    s = re.sub(r'\\le\b', '≤', s)
    s = re.sub(r'\\ge\b', '≥', s)
    s = re.sub(r'\\ne\b', '≠', s)
    s = re.sub(r'\\in\b', '∈', s)
    s = re.sub(r'\\quad\b', '   ', s)

    # 4. Greek symbols
    s = re.sub(r'\\mu\b', 'μ', s)
    s = re.sub(r'\\sigma\b', 'σ', s)
    s = re.sub(r'\\beta_1\b', 'β₁', s)
    s = re.sub(r'\\beta_0\b', 'β₀', s)
    s = re.sub(r'\\beta\b', 'β', s)
    s = re.sub(r'\\alpha\b', 'α', s)
    s = re.sub(r'\\epsilon\b', 'ε', s)
    s = re.sub(r'\\sum_\{([^}]*)\}\^\{([^}]*)\}', r'Σ(\1..\2)', s)
    s = re.sub(r'\\sum\b', 'Σ', s)

    # 5. Scientific superscripts & subscripts
    s = re.sub(r'R\^2\b', 'R²', s)
    s = re.sub(r'r\^2\b', 'r²', s)
    s = re.sub(r'x\^2\b', 'x²', s)
    s = re.sub(r'PM_\{2\.5\}', 'PM₂.₅', s)
    s = re.sub(r'PM_2\.5', 'PM₂.₅', s)
    s = re.sub(r'Q_1\b', 'Q₁', s)
    s = re.sub(r'Q_3\b', 'Q₃', s)
    s = re.sub(r'w_\{([a-zA-Z0-9_]+)\}', r'w_\1', s)
    s = re.sub(r'w_\{\\text\{([a-zA-Z0-9_]+)\}\}', r'w_\1', s)

    # 6. Inline dollar math wrappers
    # Only remove $ if it encloses math, without disturbing general currency/prose
    s = re.sub(r'\$([^$\n]+)\$', r'\1', s)

    return s


def set_cell_properties(cell, fill_hex, is_header=False, width_inches=None):
    """Strict OpenXML compliant cell formatting (tcW -> shd -> tcMar -> vAlign)."""
    tcPr = cell._tc.get_or_add_tcPr()
    for child in list(tcPr):
        tag = child.tag.split('}')[-1]
        if tag in ('shd', 'tcMar', 'vAlign'):
            tcPr.remove(child)

    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{fill_hex}"/>')
    tcPr.append(shd)

    tcMar = parse_xml(
        f'<w:tcMar {nsdecls("w")}>'
        f'<w:top w:w="120" w:type="dxa"/>'
        f'<w:left w:w="160" w:type="dxa"/>'
        f'<w:bottom w:w="120" w:type="dxa"/>'
        f'<w:right w:w="160" w:type="dxa"/>'
        f'</w:tcMar>'
    )
    tcPr.append(tcMar)

    vAlign = parse_xml(f'<w:vAlign {nsdecls("w")} w:val="center"/>')
    tcPr.append(vAlign)

    if width_inches:
        cell.width = Inches(width_inches)


def set_row_properties(row, is_header=False):
    """Configures table rows to never split across pages and repeats table headers."""
    trPr = row._tr.get_or_add_trPr()
    for child in list(trPr):
        tag = child.tag.split('}')[-1]
        if tag in ('cantSplit', 'tblHeader'):
            trPr.remove(child)

    cant_split = parse_xml(f'<w:cantSplit {nsdecls("w")}/>')
    trPr.append(cant_split)
    if is_header:
        tbl_header = parse_xml(f'<w:tblHeader {nsdecls("w")}/>')
        trPr.append(tbl_header)


def get_column_widths(header_row, num_cols):
    """Returns mathematically tailored column widths totaling 6.27 inches for each table."""
    headers_joined = " ".join(header_row).lower()

    # Table 12: Test Case Verification Matrix (7 cols)
    if "test identifier" in headers_joined and "actual outcome" in headers_joined:
        return [0.65, 0.75, 1.15, 1.10, 1.10, 1.00, 0.52]

    # Table 2: Comprehensive Technology Stack Inventory (5 cols)
    if "architecture layer" in headers_joined and "architectural role" in headers_joined:
        return [0.90, 1.10, 0.70, 2.10, 1.47]

    # Table 7: REST API Route Catalogue (5 cols)
    if "route path" in headers_joined and ("schema" in headers_joined or "pydantic" in headers_joined):
        return [0.65, 1.50, 1.25, 1.25, 1.62]

    # Table 8: Indicator Normalization Anchors (6 cols)
    if "factor identifier" in headers_joined and "physical indicator" in headers_joined:
        return [0.85, 1.60, 0.75, 0.80, 0.80, 1.47]

    # Table 9: Persona Weight Allocations (7 cols)
    if "persona identifier" in headers_joined:
        return [1.05, 1.82, 0.68, 0.68, 0.68, 0.68, 0.68]

    # Table 10: Data Loader Registry (5 cols)
    if "loader module" in headers_joined and "source institution" in headers_joined:
        return [1.10, 1.00, 1.10, 0.80, 2.27]

    # Table 11: Test Suite Module Distribution (5 cols)
    if "test module" in headers_joined and "execution result" in headers_joined:
        return [1.40, 2.37, 0.70, 1.10, 0.70]

    # Table 13: Regional Disparity ANOVA Results (6 cols)
    if "f-statistic" in headers_joined or "anova" in headers_joined:
        return [1.30, 0.65, 0.75, 0.85, 1.40, 1.32]

    # Table 14: Correlation Matrix Between Core Urban Indicators (5 cols)
    if "indicator pair" in headers_joined and "pearson" in headers_joined:
        return [1.80, 0.85, 0.85, 0.65, 2.12]

    # Table 15: K-Means Silhouette Scores (4 cols)
    if "silhouette" in headers_joined and num_cols == 4:
        return [0.80, 1.00, 1.10, 3.37]

    # Table 16: Out-of-Sample Holdout Model Validation Metrics (6 cols)
    if "model architecture" in headers_joined and "root mean" in headers_joined:
        return [1.10, 1.30, 0.70, 1.00, 1.05, 1.12]

    # Table 1: Verified Hardware Specification (4 cols)
    if "hardware component" in headers_joined:
        return [1.30, 1.67, 1.50, 1.80]

    # 3-column database schema tables
    if num_cols == 3 and "column name" in headers_joined:
        return [1.50, 1.30, 3.47]

    # 4-column database schema tables
    if num_cols == 4 and "column name" in headers_joined:
        return [1.40, 1.10, 1.10, 2.67]

    # General fallback: even width distribution
    return [round(6.27 / num_cols, 3)] * num_cols


def add_header_footer(section, is_front_matter=False):
    """Configures running header and footer with dynamic page numbering."""
    header = section.header
    header.is_linked_to_previous = False
    hp = header.paragraphs[0]
    hp.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    hp.text = "" if is_front_matter else "India Livability Intelligence System — Academic Project Report"
    if hp.runs:
        hrun = hp.runs[0]
        hrun.font.name = 'Times New Roman'
        hrun.font.size = Pt(8.5)
        hrun.font.color.rgb = MUTED

    footer = section.footer
    footer.is_linked_to_previous = False
    fp = footer.paragraphs[0]
    fp.text = ""
    if not is_front_matter:
        fp.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        run_l = fp.add_run("Department of Computer Applications | MCA 2026          Page ")
        run_l.font.name = 'Times New Roman'
        run_l.font.size = Pt(8.5)
        run_l.font.color.rgb = MUTED
        
        # Add dynamic PAGE field
        fld = parse_xml(f'<w:fldSimple {nsdecls("w")} w:instr="PAGE"/>')
        fp._p.append(fld)


def build_docx():
    print("Building publication-grade Word document (PROJECT_REPORT.docx)...")
    doc = docx.Document()

    # SECTION 1: COVER PAGE (Standalone section, unnumbered)
    sec_cover = doc.sections[0]
    sec_cover.page_width = Inches(8.27)
    sec_cover.page_height = Inches(11.69)
    sec_cover.top_margin = Inches(1.2)
    sec_cover.bottom_margin = Inches(1.2)
    sec_cover.left_margin = Inches(1.0)
    sec_cover.right_margin = Inches(1.0)
    add_header_footer(sec_cover, is_front_matter=True)

    # Title
    p_pre = doc.add_paragraph()
    p_pre.paragraph_format.space_before = Pt(36)
    p_pre.paragraph_format.space_after = Pt(8)
    p_pre.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_pre = p_pre.add_run("A CAPSTONE PROJECT REPORT ON")
    r_pre.font.name = 'Times New Roman'
    r_pre.font.size = Pt(11)
    r_pre.font.bold = True
    r_pre.font.color.rgb = MUTED

    p_title = doc.add_paragraph()
    p_title.paragraph_format.space_before = Pt(12)
    p_title.paragraph_format.space_after = Pt(8)
    p_title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_title = p_title.add_run(COVER_PAGE["title"])
    r_title.font.name = 'Times New Roman'
    r_title.font.size = Pt(21)
    r_title.font.bold = True
    r_title.font.color.rgb = NAVY

    p_sub = doc.add_paragraph()
    p_sub.paragraph_format.space_before = Pt(4)
    p_sub.paragraph_format.space_after = Pt(24)
    p_sub.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_sub = p_sub.add_run(COVER_PAGE["subtitle"])
    r_sub.font.name = 'Times New Roman'
    r_sub.font.size = Pt(12.5)
    r_sub.font.italic = True
    r_sub.font.color.rgb = SLATE

    # Decorative bar
    p_bar = doc.add_paragraph()
    p_bar.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_bar.paragraph_format.space_after = Pt(40)
    r_bar = p_bar.add_run("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    r_bar.font.name = 'Times New Roman'
    r_bar.font.size = Pt(12)
    r_bar.font.color.rgb = NAVY

    p_meta = doc.add_paragraph()
    p_meta.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_meta.paragraph_format.space_before = Pt(20)
    p_meta.paragraph_format.space_after = Pt(4)
    p_meta.paragraph_format.line_spacing = 1.3
    
    r_meta1 = p_meta.add_run("Submitted in partial fulfillment of the requirements for the degree of\n")
    r_meta1.font.name = 'Times New Roman'
    r_meta1.font.size = Pt(11)
    r_meta1.font.color.rgb = SLATE

    r_meta2 = p_meta.add_run(f"{COVER_PAGE['degree']}\n")
    r_meta2.font.name = 'Times New Roman'
    r_meta2.font.size = Pt(13)
    r_meta2.font.bold = True
    r_meta2.font.color.rgb = NAVY

    r_meta3 = p_meta.add_run(f"in\n{COVER_PAGE['course']}\n\n")
    r_meta3.font.name = 'Times New Roman'
    r_meta3.font.size = Pt(11)
    r_meta3.font.bold = True
    r_meta3.font.color.rgb = SLATE

    p_auth = doc.add_paragraph()
    p_auth.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_auth.paragraph_format.space_before = Pt(30)
    p_auth.paragraph_format.space_after = Pt(4)
    p_auth.paragraph_format.line_spacing = 1.25

    r_by = p_auth.add_run("Submitted by:\n")
    r_by.font.name = 'Times New Roman'
    r_by.font.size = Pt(10.5)
    r_by.font.color.rgb = MUTED

    r_names = p_auth.add_run(f"{COVER_PAGE['authors']}\n")
    r_names.font.name = 'Times New Roman'
    r_names.font.size = Pt(12.5)
    r_names.font.bold = True
    r_names.font.color.rgb = NAVY

    r_dept = p_auth.add_run(f"{COVER_PAGE['dept']}\n{COVER_PAGE['year']}")
    r_dept.font.name = 'Times New Roman'
    r_dept.font.size = Pt(11)
    r_dept.font.color.rgb = SLATE

    # SECTION 2: FRONT MATTER PAGES
    sec_fm = doc.add_section(WD_SECTION_START.NEW_PAGE)
    sec_fm.page_width = Inches(8.27)
    sec_fm.page_height = Inches(11.69)
    sec_fm.top_margin = Inches(1.0)
    sec_fm.bottom_margin = Inches(1.0)
    sec_fm.left_margin = Inches(1.0)
    sec_fm.right_margin = Inches(1.0)
    add_header_footer(sec_fm, is_front_matter=True)

    def add_fm_page(title, body_text, signature_block=None):
        h = doc.add_heading(title, level=1)
        h.alignment = WD_ALIGN_PARAGRAPH.CENTER
        h.paragraph_format.space_before = Pt(12)
        h.paragraph_format.space_after = Pt(16)
        if h.runs:
            h.runs[0].font.name = 'Times New Roman'
            h.runs[0].font.size = Pt(16)
            h.runs[0].font.bold = True
            h.runs[0].font.color.rgb = NAVY

        for para in body_text.strip().split('\n\n'):
            p = doc.add_paragraph()
            p.paragraph_format.space_before = Pt(3)
            p.paragraph_format.space_after = Pt(8)
            p.paragraph_format.line_spacing = 1.2
            p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
            run = p.add_run(para.strip())
            run.font.name = 'Times New Roman'
            run.font.size = Pt(11)
            run.font.color.rgb = SLATE

        if signature_block:
            doc.add_paragraph().paragraph_format.space_before = Pt(30)
            sig_p = doc.add_paragraph()
            sig_p.paragraph_format.space_before = Pt(20)
            sig_p.paragraph_format.line_spacing = 1.3
            run_sig = sig_p.add_run(signature_block)
            run_sig.font.name = 'Times New Roman'
            run_sig.font.size = Pt(10.5)
            run_sig.font.bold = True
            run_sig.font.color.rgb = SLATE

        doc.add_page_break()

    # Certificate of Approval
    add_fm_page(
        "CERTIFICATE OF APPROVAL",
        CERTIFICATE_TEXT,
        "___________________________                         ___________________________\n"
        "Project Supervisor / Mentor                         Head of Department\n"
        "Department of Computer Applications                 Department of Computer Applications"
    )

    # Candidate's Declaration
    add_fm_page(
        "CANDIDATE'S DECLARATION",
        DECLARATION_TEXT,
        "___________________________\n"
        "Parasmani Khunte\n"
        "Candidate, MCA (Batch 2024–2026)\n"
        "Date: November 2026"
    )

    # Acknowledgement
    add_fm_page("ACKNOWLEDGEMENT", ACKNOWLEDGEMENT_TEXT)

    # Abstract & Keywords
    h_abs = doc.add_heading("ABSTRACT", level=1)
    h_abs.alignment = WD_ALIGN_PARAGRAPH.CENTER
    h_abs.paragraph_format.space_before = Pt(12)
    h_abs.paragraph_format.space_after = Pt(16)
    if h_abs.runs:
        h_abs.runs[0].font.name = 'Times New Roman'
        h_abs.runs[0].font.size = Pt(16)
        h_abs.runs[0].font.bold = True
        h_abs.runs[0].font.color.rgb = NAVY

    for para in ABSTRACT_TEXT.strip().split('\n\n'):
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(3)
        p.paragraph_format.space_after = Pt(8)
        p.paragraph_format.line_spacing = 1.2
        p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
        run = p.add_run(para.strip())
        run.font.name = 'Times New Roman'
        run.font.size = Pt(11)
        run.font.color.rgb = SLATE

    p_kw = doc.add_paragraph()
    p_kw.paragraph_format.space_before = Pt(12)
    p_kw.paragraph_format.space_after = Pt(12)
    r_kwh = p_kw.add_run("Keywords: ")
    r_kwh.font.name = 'Times New Roman'
    r_kwh.font.size = Pt(10.5)
    r_kwh.font.bold = True
    r_kwh.font.color.rgb = NAVY
    r_kwt = p_kw.add_run(KEYWORDS_TEXT)
    r_kwt.font.name = 'Times New Roman'
    r_kwt.font.size = Pt(10.5)
    r_kwt.font.italic = True
    r_kwt.font.color.rgb = SLATE

    doc.add_page_break()

    # Table of Contents & Lists
    def add_list_page(title, items):
        h = doc.add_heading(title, level=1)
        h.paragraph_format.space_before = Pt(12)
        h.paragraph_format.space_after = Pt(14)
        if h.runs:
            h.runs[0].font.name = 'Times New Roman'
            h.runs[0].font.size = Pt(15)
            h.runs[0].font.bold = True
            h.runs[0].font.color.rgb = NAVY

        for item in items:
            p = doc.add_paragraph()
            p.paragraph_format.space_before = Pt(2)
            p.paragraph_format.space_after = Pt(2)
            p.paragraph_format.line_spacing = 1.15
            run = p.add_run(item)
            run.font.name = 'Times New Roman'
            run.font.size = Pt(10)
            run.font.color.rgb = SLATE

        doc.add_page_break()

    toc_items = [
        "CHAPTER 1: INTRODUCTION ............................................................................................ Page 1",
        "    1.1 Background and Context ...................................................................................... Page 1",
        "    1.2 Problem Statement ............................................................................................ Page 1",
        "    1.3 Existing Challenges and Gaps in Prior Systems ................................................. Page 2",
        "    1.4 Proposed Solution ............................................................................................ Page 2",
        "    1.5 High-Level Project Overview .............................................................................. Page 2",
        "CHAPTER 2: OBJECTIVES AND SCOPE ............................................................................. Page 4",
        "    2.1 Primary Project Objectives ................................................................................. Page 4",
        "    2.2 Functional Scope ................................................................................................. Page 4",
        "    2.3 Operational and Analytical Scope ....................................................................... Page 5",
        "    2.4 Target Users and Stakeholder Profiles ............................................................... Page 5",
        "    2.5 System Boundaries and Analytical Limitations .................................................... Page 5",
        "CHAPTER 3: SYSTEM REQUIREMENTS AND TECHNOLOGY STACK .................................. Page 7",
        "    3.1 Hardware Requirements Specification ................................................................. Page 7",
        "    3.2 Software and Operating Environment Requirements .......................................... Page 7",
        "    3.3 Development Environment Setup ....................................................................... Page 7",
        "    3.4 Comprehensive Technology Stack Inventory ........................................................ Page 8",
        "    3.5 Technology Selection and Architectural Justification ............................................. Page 9",
        "CHAPTER 4: SYSTEM ANALYSIS AND DESIGN .................................................................. Page 10",
        "    4.1 Functional Requirements Specification .............................................................. Page 10",
        "    4.2 Non-Functional Requirements Specification .......................................................... Page 10",
        "    4.3 End-to-End System Architecture ........................................................................ Page 11",
        "    4.4 Data Pipeline & ETL Architecture ........................................................................ Page 11",
        "    4.5 Data Modeling & Analytical Schemas ................................................................... Page 12",
        "    4.6 RESTful API Design & Endpoint Specifications ..................................................... Page 14",
        "    4.7 Core Mathematical and Statistical Algorithms ...................................................... Page 15",
        "    4.8 Security, Data Provenance, and Access Architecture ........................................... Page 17",
        "CHAPTER 5: IMPLEMENTATION DETAILS ......................................................................... Page 18",
        "    5.1 System Entry Points and Lifespan Execution ...................................................... Page 18",
        "    5.2 Data Loaders and Entity Aliasing ......................................................................... Page 18",
        "    5.3 Normalization and Scoring Implementation ......................................................... Page 19",
        "    5.4 Machine Learning and Statistical Projections ....................................................... Page 19",
        "    5.5 Backend REST Microservice Implementation ....................................................... Page 19",
        "    5.6 Frontend Geospatial Dashboard Implementation ................................................. Page 20",
        "    5.7 Data Provenance and Quality Assurance Modules ............................................. Page 20",
        "    5.8 Error Handling, Edge Cases, and System Reliability ............................................ Page 21",
        "CHAPTER 6: TESTING AND QUALITY ASSURANCE ............................................................ Page 22",
        "    6.1 Testing Strategy and Test Harness ...................................................................... Page 22",
        "    6.2 Test Suite Execution Results (84 Passed, 1 Skipped) .......................................... Page 22",
        "    6.3 Schema and Referential Integrity Test Suite ....................................................... Page 23",
        "    6.4 Scoring Engine Mathematical Parity and Invariant Tests ...................................... Page 23",
        "    6.5 Statistical Modeling and ML Validation Tests ....................................................... Page 24",
        "    6.6 API Integration Testing and Runtime Observations ............................................. Page 24",
        "    6.7 Comprehensive Verification Traceability Matrix ................................................... Page 24",
        "CHAPTER 7: RESULTS, EMPIRICAL FINDINGS, AND FUTURE SCOPE ................................. Page 27",
        "    7.1 Inferential Statistics and Empirical Observations ................................................. Page 27",
        "    7.2 Unsupervised Learning and Cluster Archetypes ................................................... Page 31",
        "    7.3 Model Holdout Cross-Validation & Sensitivity Analysis ....................................... Page 33",
        "    7.4 Key Engineering Achievements ............................................................................ Page 33",
        "    7.5 Verified Limitations and Data Gaps ....................................................................... Page 34",
        "    7.6 Academic and Practical Conclusion .................................................................... Page 34",
        "    7.7 Future Engineering and Research Roadmap ........................................................ Page 34",
        "CHAPTER 8: REFERENCES (IEEE STYLE) ............................................................................ Page 35"
    ]
    add_list_page("TABLE OF CONTENTS", toc_items)

    lot_items = [
        "Table 3.1: Verified Hardware Specification Environment ................................................. Page 7",
        "Table 3.2: Comprehensive Technology Stack Inventory ..................................................... Page 8",
        "Table 4.1: Primary Entities Master Specification (places.csv) ............................................... Page 12",
        "Table 4.2: Long Analytical Schema (factors_tidy.parquet) ................................................... Page 12",
        "Table 4.3: Consolidated Cross-Sectional Table (factors_wide.csv) ....................................... Page 13",
        "Table 4.4: Composite Scoring Output Schema (scores_wide.csv) .......................................... Page 13",
        "Table 4.5: Longitudinal Trend Projections Schema (trends.csv) ........................................... Page 14",
        "Table 4.6: REST API Route Catalogue and Response Envelopes ........................................... Page 14",
        "Table 4.7: Indicator Direction, Boundaries, and Normalization Anchors ................................ Page 16",
        "Table 4.8: System Persona Weight Allocations .................................................................... Page 16",
        "Table 5.1: Data Loader Registry and Upstream Provenance Sources .................................... Page 18",
        "Table 6.1: Test Suite Module Distribution and Execution Metrics ......................................... Page 22",
        "Table 6.2: Comprehensive Test Case Verification Matrix ................................................... Page 24",
        "Table 7.1: Regional Disparity ANOVA Results (Master Panel vs 2023 Cross-Section) ......... Page 27",
        "Table 7.2: Correlation Matrix Between Core Urban Indicators ............................................ Page 28",
        "Table 7.3: K-Means Silhouette Scores Across Evaluated Cluster Counts (k=2 to 7) ............... Page 31",
        "Table 7.4: Out-of-Sample Holdout Model Validation Metrics for Trend Forecasting ........... Page 33",
        "",
        "LIST OF FIGURES",
        "Figure 4.1: High-Level System Architecture of India Livability Intelligence System ............. Page 11",
        "Figure 4.2: End-to-End Data Ingestion, Cleaning, and Analytical Pipeline ........................... Page 12",
        "Figure 4.3: Mathematical Normalization and Composite Scoring Engine Workflow ................ Page 15",
        "Figure 4.4: React 19 Frontend Component Hierarchy and Interaction Model ........................ Page 20",
        "Figure 7.1: Univariate Feature Distributions and Density Estimates of Core Indicators ....... Page 30",
        "Figure 7.2: Regional Boxplots Illustrating Geographic Score Disparities ............................ Page 28",
        "Figure 7.3: Pearson Correlation Heatmap Across Core Quality-of-Life Indicators ................. Page 29",
        "Figure 7.4: Ambient PM2.5 Trajectories for Major Cities Against National CPCB Standards .... Page 31",
        "Figure 7.5: K-Means Cluster Silhouette Curve and Profiling Radar Archetypes .................... Page 32",
        "Figure 7.6: Top 10 and Bottom 10 Scored Geographic Entities ............................................. Page 32"
    ]
    add_list_page("LIST OF TABLES AND FIGURES", lot_items)

    # SECTION 3: MAIN BODY CHAPTERS (With Running Header & Footer, Page numbering starts at 1)
    sec_body = doc.add_section(WD_SECTION_START.NEW_PAGE)
    sec_body.page_width = Inches(8.27)
    sec_body.page_height = Inches(11.69)
    sec_body.top_margin = Inches(1.0)
    sec_body.bottom_margin = Inches(1.0)
    sec_body.left_margin = Inches(1.0)
    sec_body.right_margin = Inches(1.0)
    add_header_footer(sec_body, is_front_matter=False)

    # Set page number to start at 1
    sec_body._sectPr.append(parse_xml(f'<w:pgNumType {nsdecls("w")} w:start="1"/>'))

    # Combine body markdown
    body_md = (
        CHAPTERS_1_TO_3_MD.strip() + "\n\n---\n\n" +
        CHAPTERS_4_TO_5_MD.strip() + "\n\n---\n\n" +
        CHAPTERS_6_TO_8_MD.strip() + "\n"
    )

    lines = body_md.split('\n')
    i = 0
    in_code_block = False
    code_lines = []
    table_lines = []
    is_first_chapter = True

    def flush_table(t_lines):
        if not t_lines:
            return
        cleaned_rows = []
        for line in t_lines:
            if re.match(r'^\s*\|?\s*[-:| ]+\s*\|?\s*$', line):
                continue
            cells = [c.strip() for c in line.strip().strip('|').split('|')]
            if any(cells):
                cleaned_rows.append(cells)

        if not cleaned_rows:
            return

        num_cols = max(len(r) for r in cleaned_rows)
        t = doc.add_table(rows=len(cleaned_rows), cols=num_cols)
        t.alignment = WD_TABLE_ALIGNMENT.CENTER
        t.style = 'Table Grid'

        header_row_text = cleaned_rows[0] if cleaned_rows else []
        col_widths = get_column_widths(header_row_text, num_cols)

        for r_idx, row_data in enumerate(cleaned_rows):
            is_header = (r_idx == 0)
            row_obj = t.rows[r_idx]
            set_row_properties(row_obj, is_header=is_header)

            for c_idx in range(num_cols):
                cell = t.cell(r_idx, c_idx)
                fill_hex = "1B365D" if is_header else ("F8F9F9" if r_idx % 2 == 1 else "FFFFFF")
                width_in = col_widths[c_idx] if c_idx < len(col_widths) else (6.27 / num_cols)
                set_cell_properties(cell, fill_hex, is_header=is_header, width_inches=width_in)

                raw_val = row_data[c_idx] if c_idx < len(row_data) else ""
                val = re.sub(r'\*\*(.*?)\*\*', r'\1', raw_val)
                val = re.sub(r'\*(.*?)\*', r'\1', val)
                val = re.sub(r'<br\s*/?>', ' ', val)
                val = clean_math_and_text(val)

                p = cell.paragraphs[0]
                p.text = val
                p.paragraph_format.line_spacing = 1.05
                p.paragraph_format.space_after = Pt(2)
                p.paragraph_format.space_before = Pt(2)

                if p.runs:
                    run = p.runs[0]
                    run.font.name = 'Times New Roman'
                    if is_header:
                        run.font.bold = True
                        run.font.size = Pt(8.5)
                        run.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)
                    else:
                        run.font.size = Pt(8.0)
                        run.font.color.rgb = SLATE

        sp = doc.add_paragraph()
        sp.paragraph_format.space_after = Pt(6)

    def flush_code(c_lines):
        if not c_lines:
            return
        code_p = doc.add_paragraph()
        code_p.paragraph_format.left_indent = Inches(0.3)
        code_p.paragraph_format.right_indent = Inches(0.3)
        code_p.paragraph_format.space_before = Pt(4)
        code_p.paragraph_format.space_after = Pt(6)
        run = code_p.add_run('\n'.join(c_lines))
        run.font.name = 'Consolas'
        run.font.size = Pt(8.5)
        run.font.color.rgb = CODE_BLUE

    while i < len(lines):
        line = lines[i]

        if line.strip().startswith('```'):
            if in_code_block:
                in_code_block = False
                flush_code(code_lines)
                code_lines = []
            else:
                in_code_block = True
                code_lines = []
            i += 1
            continue

        if in_code_block:
            code_lines.append(line)
            i += 1
            continue

        if line.strip().startswith('|'):
            table_lines.append(line)
            i += 1
            continue
        elif table_lines:
            flush_table(table_lines)
            table_lines = []

        if line.strip() in ['---', '***']:
            if i + 1 < len(lines) and (lines[i+1].startswith('# ') or lines[i+1].startswith('## ')):
                # Will be handled by heading page break
                pass
            i += 1
            continue

        if line.startswith('# '):
            text_val = clean_math_and_text(line[2:].strip())
            # Start each chapter on a new page, but NOT the first chapter which is already at the top of Section 3!
            if text_val.startswith('CHAPTER '):
                if not is_first_chapter:
                    doc.add_page_break()
                is_first_chapter = False

            h = doc.add_heading(text_val, level=1)
            h.paragraph_format.space_before = Pt(14)
            h.paragraph_format.space_after = Pt(8)
            for r in h.runs:
                r.font.name = 'Times New Roman'
                r.font.size = Pt(15)
                r.font.bold = True
                r.font.color.rgb = NAVY
            i += 1
            continue

        if line.startswith('## '):
            text_val = clean_math_and_text(line[3:].strip())
            h = doc.add_heading(text_val, level=2)
            h.paragraph_format.space_before = Pt(12)
            h.paragraph_format.space_after = Pt(6)
            for r in h.runs:
                r.font.name = 'Times New Roman'
                r.font.size = Pt(12.5)
                r.font.bold = True
                r.font.color.rgb = SLATE
            i += 1
            continue

        if line.startswith('### '):
            text_val = clean_math_and_text(line[4:].strip())
            h = doc.add_heading(text_val, level=3)
            h.paragraph_format.space_before = Pt(8)
            h.paragraph_format.space_after = Pt(4)
            for r in h.runs:
                r.font.name = 'Times New Roman'
                r.font.size = Pt(11)
                r.font.bold = True
                r.font.color.rgb = SLATE
            i += 1
            continue

        # Formatted Display Equation ($$ ... $$)
        if line.strip().startswith('$$') and line.strip().endswith('$$') and len(line.strip()) > 4:
            eq_text = line.strip()[2:-2].strip()
            eq_clean = clean_math_and_text(eq_text)

            p_eq = doc.add_paragraph()
            p_eq.alignment = WD_ALIGN_PARAGRAPH.CENTER
            p_eq.paragraph_format.left_indent = Inches(0.4)
            p_eq.paragraph_format.right_indent = Inches(0.4)
            p_eq.paragraph_format.space_before = Pt(6)
            p_eq.paragraph_format.space_after = Pt(6)

            r_eq = p_eq.add_run(eq_clean)
            r_eq.font.name = 'Cambria Math'
            r_eq.font.size = Pt(10.5)
            r_eq.font.bold = True
            r_eq.font.color.rgb = NAVY
            i += 1
            continue

        # Images
        img_match = re.match(r'!\[(.*?)\]\((.*?)\)', line.strip())
        if img_match:
            caption, img_rel_path = img_match.groups()
            img_path = REPORT_DIR / img_rel_path
            if img_path.exists():
                try:
                    p_img = doc.add_paragraph()
                    p_img.alignment = WD_ALIGN_PARAGRAPH.CENTER
                    p_img.paragraph_format.space_before = Pt(10)
                    p_img.paragraph_format.space_after = Pt(2)
                    doc.add_picture(str(img_path), width=Inches(5.5))
                    
                    p_cap = doc.add_paragraph()
                    p_cap.alignment = WD_ALIGN_PARAGRAPH.CENTER
                    p_cap.paragraph_format.space_after = Pt(10)
                    run_cap = p_cap.add_run(clean_math_and_text(caption))
                    run_cap.font.name = 'Times New Roman'
                    run_cap.font.italic = True
                    run_cap.font.size = Pt(9.5)
                    run_cap.font.color.rgb = MUTED
                except Exception as e:
                    print(f"   [!] Image insert failed for {img_path}: {e}")
            i += 1
            continue

        # Bullet points
        if line.strip().startswith('- ') or line.strip().startswith('* '):
            item_text = line.strip()[2:].strip()
            p = doc.add_paragraph(style='List Bullet')
            p.paragraph_format.space_before = Pt(1)
            p.paragraph_format.space_after = Pt(2)
            p.paragraph_format.line_spacing = 1.15
            
            parts = re.split(r'(\*\*.*?\*\*)', item_text)
            for part in parts:
                cleaned_part = clean_math_and_text(part)
                if part.startswith('**') and part.endswith('**'):
                    run = p.add_run(clean_math_and_text(part[2:-2]))
                    run.font.bold = True
                else:
                    run = p.add_run(cleaned_part)
                run.font.name = 'Times New Roman'
                run.font.size = Pt(10.5)
                run.font.color.rgb = SLATE
            i += 1
            continue

        # Numbered list
        num_match = re.match(r'^(\d+)\.\s+(.*)$', line.strip())
        if num_match:
            num, item_text = num_match.groups()
            p = doc.add_paragraph(style='List Number')
            p.paragraph_format.space_before = Pt(1)
            p.paragraph_format.space_after = Pt(2)
            p.paragraph_format.line_spacing = 1.15
            
            parts = re.split(r'(\*\*.*?\*\*)', item_text)
            for part in parts:
                if part.startswith('**') and part.endswith('**'):
                    run = p.add_run(clean_math_and_text(part[2:-2]))
                    run.font.bold = True
                else:
                    run = p.add_run(clean_math_and_text(part))
                run.font.name = 'Times New Roman'
                run.font.size = Pt(10.5)
                run.font.color.rgb = SLATE
            i += 1
            continue

        # Standard paragraph
        if line.strip():
            p = doc.add_paragraph()
            p.paragraph_format.space_before = Pt(2)
            p.paragraph_format.space_after = Pt(5)
            p.paragraph_format.line_spacing = 1.15
            p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY

            parts = re.split(r'(\*\*.*?\*\*|\*.*?\*|`.*?`)', line)
            for part in parts:
                if part.startswith('**') and part.endswith('**'):
                    run = p.add_run(clean_math_and_text(part[2:-2]))
                    run.font.bold = True
                elif part.startswith('*') and part.endswith('*'):
                    run = p.add_run(clean_math_and_text(part[1:-1]))
                    run.font.italic = True
                elif part.startswith('`') and part.endswith('`'):
                    run = p.add_run(part[1:-1])
                    run.font.name = 'Consolas'
                    run.font.size = Pt(9.5)
                    run.font.color.rgb = CODE_BLUE
                else:
                    run = p.add_run(clean_math_and_text(part))
                
                if not (part.startswith('`') and part.endswith('`')):
                    run.font.name = 'Times New Roman'
                    run.font.size = Pt(11)
                    run.font.color.rgb = SLATE

        i += 1

    if table_lines:
        flush_table(table_lines)

    doc.save(str(DOCX_PATH))
    print(f"   -> Successfully saved {DOCX_PATH}")


def generate_clean_markdown():
    """Generates the consolidated, clean PROJECT_REPORT.md without broken LaTeX markup."""
    print("1. Generating unified, clean PROJECT_REPORT.md...")
    try:
        from builder.part1_front_matter import FRONT_MATTER_MD
    except ImportError:
        from part1_front_matter import FRONT_MATTER_MD

    raw_md = (
        FRONT_MATTER_MD.strip() + "\n\n---\n\n" +
        CHAPTERS_1_TO_3_MD.strip() + "\n\n---\n\n" +
        CHAPTERS_4_TO_5_MD.strip() + "\n\n---\n\n" +
        CHAPTERS_6_TO_8_MD.strip() + "\n"
    )

    clean_md = clean_math_and_text(raw_md)
    with open(MD_PATH, 'w', encoding='utf-8') as f:
        f.write(clean_md)
    print(f"   -> Wrote {len(clean_md):,} characters to {MD_PATH}")


def export_native_word_pdf():
    """Exports DOCX to PDF using Word's native engine via PowerShell COM."""
    print("Exporting native Word PDF (100% layout fidelity)...")
    import subprocess
    cmd = (
        '$word = New-Object -ComObject Word.Application; $word.Visible = $false; '
        f'$doc = $word.Documents.Open("{DOCX_PATH.resolve()}"); '
        f'$doc.SaveAs([ref]"{PDF_PATH.resolve()}", [ref]17); '
        '$doc.Close([ref]$false); $word.Quit();'
    )
    result = subprocess.run(["powershell", "-Command", cmd], capture_output=True, text=True)
    if result.returncode == 0 and PDF_PATH.exists():
        print(f"   -> Successfully exported native Word PDF: {PDF_PATH}")
    else:
        print(f"   [!] Word export returned error: {result.stderr}. Falling back to markdown_pdf...")
        from markdown_pdf import Section, MarkdownPdf
        with open(MD_PATH, 'r', encoding='utf-8') as f:
            content = f.read()
        pdf = MarkdownPdf(toc_level=2)
        pdf.add_section(Section(content))
        pdf.save(str(PDF_PATH))
        print(f"   -> Saved fallback PDF: {PDF_PATH}")


if __name__ == "__main__":
    generate_clean_markdown()
    build_docx()
    export_native_word_pdf()
    print("\nMaster Report Generation Completed Successfully!")
