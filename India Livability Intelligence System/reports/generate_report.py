"""
reports/generate_report.py
──────────────────────────
Reads reports/project_report.md and compiles reports/project_report.pdf
using markdown_pdf.
"""

from pathlib import Path
from markdown_pdf import Section, MarkdownPdf

REPORT_MD = Path(__file__).resolve().parent / "project_report.md"
REPORT_PDF = Path(__file__).resolve().parent / "project_report.pdf"

def generate_pdf():
    content = REPORT_MD.read_text(encoding="utf-8")
    pdf = MarkdownPdf(toc_level=2)
    pdf.add_section(Section(content))
    pdf.save(str(REPORT_PDF))
    print(f"Compiled PDF: {REPORT_PDF}")

if __name__ == "__main__":
    generate_pdf()
