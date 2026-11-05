"""
make_report.py
──────────────
Coordinates the generation of:
  1. PROJECT_REPORT.md
  2. PROJECT_REPORT.docx (Strict OpenXML schema compliance, perfectly formatted)
  3. PROJECT_REPORT.pdf (A4 Print-ready via markdown_pdf)
"""

import os
import sys
import re
from pathlib import Path

# Add builder and current directory to sys.path for IDE & CLI compatibility
current_dir = Path(__file__).resolve().parent
builder_dir = current_dir / "builder"
if str(builder_dir) not in sys.path:
    sys.path.insert(0, str(builder_dir))
if str(current_dir) not in sys.path:
    sys.path.insert(0, str(current_dir))

try:
    from builder.part1_front_matter import FRONT_MATTER_MD
    from builder.part2_chapters_1_to_3 import CHAPTERS_1_TO_3_MD
    from builder.part3_chapters_4_to_5 import CHAPTERS_4_TO_5_MD
    from builder.part4_chapters_6_to_8 import CHAPTERS_6_TO_8_MD
except ImportError:
    from part1_front_matter import FRONT_MATTER_MD
    from part2_chapters_1_to_3 import CHAPTERS_1_TO_3_MD
    from part3_chapters_4_to_5 import CHAPTERS_4_TO_5_MD
    from part4_chapters_6_to_8 import CHAPTERS_6_TO_8_MD

import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import parse_xml
from docx.oxml.ns import nsdecls
from markdown_pdf import Section, MarkdownPdf

REPORT_DIR = Path(__file__).resolve().parent
MD_PATH = REPORT_DIR / "PROJECT_REPORT.md"
DOCX_PATH = REPORT_DIR / "PROJECT_REPORT.docx"
PDF_PATH = REPORT_DIR / "PROJECT_REPORT.pdf"
DIAGRAMS_DIR = REPORT_DIR / "diagrams"

def generate_markdown():
    print("1. Generating unified PROJECT_REPORT.md...")
    full_md = (
        FRONT_MATTER_MD.strip() + "\n\n---\n\n" +
        CHAPTERS_1_TO_3_MD.strip() + "\n\n---\n\n" +
        CHAPTERS_4_TO_5_MD.strip() + "\n\n---\n\n" +
        CHAPTERS_6_TO_8_MD.strip() + "\n"
    )
    with open(MD_PATH, "w", encoding="utf-8") as f:
        f.write(full_md)
    print(f"   -> Wrote {len(full_md):,} characters to {MD_PATH}")
    return full_md

def format_cell_strict_xml(cell, fill_hex, is_header=False, width_inches=None):
    """
    Applies background, padding, and vertical alignment to a table cell
    in STRICT accordance with the ECMA-376 OpenXML schema sequence:
    1. tcW
    2. shd
    3. tcMar (top, left, bottom, right)
    4. vAlign
    """
    tcPr = cell._tc.get_or_add_tcPr()
    
    # Remove any existing shd, tcMar, or vAlign to prevent sequence violations
    for child in list(tcPr):
        tag = child.tag.split('}')[-1]
        if tag in ('shd', 'tcMar', 'vAlign'):
            tcPr.remove(child)

    # 1. Shading
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{fill_hex}"/>')
    tcPr.append(shd)

    # 2. Margins (Strict order: top, left, bottom, right)
    tcMar = parse_xml(
        f'<w:tcMar {nsdecls("w")}>'
        f'<w:top w:w="120" w:type="dxa"/>'
        f'<w:left w:w="160" w:type="dxa"/>'
        f'<w:bottom w:w="120" w:type="dxa"/>'
        f'<w:right w:w="160" w:type="dxa"/>'
        f'</w:tcMar>'
    )
    tcPr.append(tcMar)

    # 3. Vertical alignment
    vAlign = parse_xml(f'<w:vAlign {nsdecls("w")} w:val="center"/>')
    tcPr.append(vAlign)

    if width_inches:
        cell.width = Inches(width_inches)

def generate_docx():
    print("2. Generating PROJECT_REPORT.docx with strict OpenXML compliance...")
    doc = docx.Document()

    # Page setup - A4 (8.27 x 11.69 inches)
    # 1.0 inch margins -> 6.27 inches printable width
    for section in doc.sections:
        section.page_width = Inches(8.27)
        section.page_height = Inches(11.69)
        section.top_margin = Inches(1.0)
        section.bottom_margin = Inches(1.0)
        section.left_margin = Inches(1.0)
        section.right_margin = Inches(1.0)

    # Base Normal style
    style = doc.styles['Normal']
    font = style.font
    font.name = 'Times New Roman'
    font.size = Pt(11)
    font.color.rgb = RGBColor(0x2C, 0x3E, 0x50)

    with open(MD_PATH, 'r', encoding='utf-8') as f:
        text = f.read()

    lines = text.split('\n')
    i = 0
    in_code_block = False
    code_lines = []
    table_lines = []

    def flush_table(t_lines):
        if not t_lines:
            return
        # Parse table markdown
        cleaned_rows = []
        for line in t_lines:
            # Skip markdown separator line
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

        # Calculate balanced column widths (total max 6.27 inches)
        col_width = 6.27 / num_cols

        for r_idx, row_data in enumerate(cleaned_rows):
            is_header = (r_idx == 0)
            for c_idx in range(num_cols):
                cell = t.cell(r_idx, c_idx)
                fill_hex = "1B365D" if is_header else ("F8F9F9" if r_idx % 2 == 1 else "FFFFFF")
                format_cell_strict_xml(cell, fill_hex, is_header=is_header, width_inches=col_width)

                raw_val = row_data[c_idx] if c_idx < len(row_data) else ""
                val = re.sub(r'\*\*(.*?)\*\*', r'\1', raw_val)
                val = re.sub(r'\*(.*?)\*', r'\1', val)
                val = re.sub(r'\$(.*?)\$', r'\1', val)
                val = re.sub(r'<br\s*/?>', ' ', val)

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
                        run.font.size = Pt(9.5)
                        run.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)
                    else:
                        run.font.size = Pt(9.0)
                        run.font.color.rgb = RGBColor(0x2C, 0x3E, 0x50)

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
        run.font.color.rgb = RGBColor(0x1A, 0x52, 0x76)

    while i < len(lines):
        line = lines[i]

        # Code block handling
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

        # Table handling
        if line.strip().startswith('|'):
            table_lines.append(line)
            i += 1
            continue
        elif table_lines:
            flush_table(table_lines)
            table_lines = []

        # Horizontal rule / page break
        if line.strip() in ['---', '***']:
            if i + 1 < len(lines) and (lines[i+1].startswith('# ') or lines[i+1].startswith('## ')):
                doc.add_page_break()
            i += 1
            continue

        # Headings
        if line.startswith('# '):
            text_val = line[2:].strip()
            if text_val.startswith('CHAPTER ') or text_val.startswith('INDIA LIVABILITY'):
                if doc.paragraphs:
                    doc.add_page_break()
            h = doc.add_heading(text_val, level=1)
            h.paragraph_format.space_before = Pt(14)
            h.paragraph_format.space_after = Pt(8)
            for r in h.runs:
                r.font.name = 'Times New Roman'
                r.font.size = Pt(15)
                r.font.bold = True
                r.font.color.rgb = RGBColor(0x1B, 0x36, 0x5D)
            i += 1
            continue

        if line.startswith('## '):
            text_val = line[3:].strip()
            h = doc.add_heading(text_val, level=2)
            h.paragraph_format.space_before = Pt(12)
            h.paragraph_format.space_after = Pt(6)
            for r in h.runs:
                r.font.name = 'Times New Roman'
                r.font.size = Pt(12.5)
                r.font.bold = True
                r.font.color.rgb = RGBColor(0x2C, 0x3E, 0x50)
            i += 1
            continue

        if line.startswith('### '):
            text_val = line[4:].strip()
            h = doc.add_heading(text_val, level=3)
            h.paragraph_format.space_before = Pt(8)
            h.paragraph_format.space_after = Pt(4)
            for r in h.runs:
                r.font.name = 'Times New Roman'
                r.font.size = Pt(11)
                r.font.bold = True
                r.font.color.rgb = RGBColor(0x34, 0x49, 0x5E)
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
                    p_img.paragraph_format.space_before = Pt(8)
                    p_img.paragraph_format.space_after = Pt(2)
                    doc.add_picture(str(img_path), width=Inches(5.8))
                    
                    p_cap = doc.add_paragraph()
                    p_cap.alignment = WD_ALIGN_PARAGRAPH.CENTER
                    p_cap.paragraph_format.space_after = Pt(8)
                    run_cap = p_cap.add_run(caption)
                    run_cap.font.name = 'Times New Roman'
                    run_cap.font.italic = True
                    run_cap.font.size = Pt(9.5)
                    run_cap.font.color.rgb = RGBColor(0x56, 0x65, 0x73)
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
                if part.startswith('**') and part.endswith('**'):
                    run = p.add_run(part[2:-2])
                    run.font.bold = True
                else:
                    run = p.add_run(part)
                run.font.name = 'Times New Roman'
                run.font.size = Pt(10.5)
                run.font.color.rgb = RGBColor(0x2C, 0x3E, 0x50)
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
                    run = p.add_run(part[2:-2])
                    run.font.bold = True
                else:
                    run = p.add_run(part)
                run.font.name = 'Times New Roman'
                run.font.size = Pt(10.5)
                run.font.color.rgb = RGBColor(0x2C, 0x3E, 0x50)
            i += 1
            continue

        # Standard paragraph
        if line.strip():
            p = doc.add_paragraph()
            p.paragraph_format.space_before = Pt(2)
            p.paragraph_format.space_after = Pt(5)
            p.paragraph_format.line_spacing = 1.15
            p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY

            parts = re.split(r'(\*\*.*?\*\*|\*.*?\*|\$.*?\$|`.*?`)', line)
            for part in parts:
                if part.startswith('**') and part.endswith('**'):
                    run = p.add_run(part[2:-2])
                    run.font.bold = True
                elif part.startswith('*') and part.endswith('*'):
                    run = p.add_run(part[1:-1])
                    run.font.italic = True
                elif part.startswith('`') and part.endswith('`'):
                    run = p.add_run(part[1:-1])
                    run.font.name = 'Consolas'
                    run.font.size = Pt(9.5)
                    run.font.color.rgb = RGBColor(0x1A, 0x52, 0x76)
                elif part.startswith('$') and part.endswith('$'):
                    run = p.add_run(part[1:-1])
                    run.font.italic = True
                else:
                    run = p.add_run(part)
                if not (part.startswith('`') and part.endswith('`')):
                    run.font.name = 'Times New Roman'
                    run.font.size = Pt(11)
                    run.font.color.rgb = RGBColor(0x2C, 0x3E, 0x50)

        i += 1

    if table_lines:
        flush_table(table_lines)

    doc.save(str(DOCX_PATH))
    print(f"   -> Successfully saved {DOCX_PATH}")

def generate_pdf():
    print("3. Generating publication-quality PROJECT_REPORT.pdf...")
    with open(MD_PATH, "r", encoding="utf-8") as f:
        md_text = f.read()

    # Preprocess image paths for markdown_pdf (absolute paths)
    def fix_img_path(match):
        caption, rel_path = match.groups()
        abs_path = (REPORT_DIR / rel_path).resolve().as_posix()
        return f"![{caption}]({abs_path})"

    md_text_clean = re.sub(r'!\[(.*?)\]\((.*?)\)', fix_img_path, md_text)

    # CSS for publication quality PDF
    css = """
    @page {
        size: A4;
        margin: 20mm 15mm 20mm 15mm;
    }
    body {
        font-family: "Times New Roman", Times, serif;
        font-size: 10pt;
        line-height: 1.45;
        color: #2C3E50;
    }
    h1 {
        color: #1B365D;
        font-size: 17pt;
        border-bottom: 1.5px solid #1B365D;
        padding-bottom: 4px;
        margin-top: 22pt;
        margin-bottom: 10pt;
        page-break-before: always;
    }
    h1:first-of-type {
        page-break-before: avoid;
    }
    h2 {
        color: #2C3E50;
        font-size: 13pt;
        margin-top: 14pt;
        margin-bottom: 6pt;
        border-bottom: 0.5px solid #BDC3C7;
        padding-bottom: 2px;
    }
    h3 {
        color: #34495E;
        font-size: 11pt;
        margin-top: 10pt;
        margin-bottom: 4pt;
    }
    p {
        margin-top: 2pt;
        margin-bottom: 6pt;
        text-align: justify;
    }
    table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 8pt;
        margin-bottom: 12pt;
        font-size: 8.5pt;
    }
    th {
        background-color: #1B365D;
        color: #FFFFFF;
        font-weight: bold;
        padding: 5px 6px;
        border: 1px solid #1B365D;
        text-align: left;
    }
    td {
        padding: 4px 6px;
        border: 1px solid #BDC3C7;
        vertical-align: top;
    }
    tr:nth-child(even) td {
        background-color: #F8F9F9;
    }
    pre {
        background-color: #F4F6F6;
        border: 1px solid #D5D8DC;
        border-left: 3px solid #1B365D;
        padding: 6px 10px;
        font-family: Consolas, monospace;
        font-size: 8pt;
        overflow-x: auto;
        margin: 6pt 0;
    }
    code {
        font-family: Consolas, monospace;
        font-size: 8.5pt;
        background-color: #F4F6F6;
        padding: 1px 3px;
        border-radius: 2px;
        color: #1A5276;
    }
    img {
        max-width: 90%;
        height: auto;
        display: block;
        margin: 8pt auto 2pt auto;
    }
    hr {
        border: 0;
        height: 1px;
        background: #BDC3C7;
        margin: 14pt 0;
    }
    ul, ol {
        margin-top: 2pt;
        margin-bottom: 6pt;
        padding-left: 18pt;
    }
    li {
        margin-bottom: 2pt;
    }
    """

    pdf = MarkdownPdf(toc_level=2)
    pdf.add_section(Section(md_text_clean, toc=True), user_css=css)
    pdf.save(str(PDF_PATH))
    print(f"   -> Successfully saved {PDF_PATH}")

if __name__ == "__main__":
    generate_markdown()
    generate_docx()
    generate_pdf()
    print("\nAll deliverables generated successfully!")
