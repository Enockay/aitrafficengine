import csv
import io
from datetime import date

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

PLATFORM_LABEL = {"twitter": "X / Twitter", "linkedin": "LinkedIn", "reddit": "Reddit"}

ExportRow = tuple  # (post_id, title, platform, status, created_at, clicks)


def generate_csv(rows: list[ExportRow]) -> bytes:
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Post ID", "Title", "Platform", "Status", "Created At", "Clicks"])
    for post_id, title, platform, post_status, created_at, clicks in rows:
        writer.writerow(
            [
                str(post_id),
                title or "",
                PLATFORM_LABEL.get(platform, platform),
                post_status,
                created_at.isoformat(),
                int(clicks),
            ]
        )
    return output.getvalue().encode("utf-8")


def generate_pdf(rows: list[ExportRow], since: date, until: date, total_clicks: int) -> bytes:
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, title="AI Traffic Engine — Analytics Report")
    styles = getSampleStyleSheet()

    elements = [
        Paragraph("AI Traffic Engine — Analytics Report", styles["Title"]),
        Paragraph(f"{since.isoformat()} to {until.isoformat()}", styles["Normal"]),
        Paragraph(f"Total clicks in range: {total_clicks}", styles["Normal"]),
        Paragraph(f"Posts: {len(rows)}", styles["Normal"]),
        Spacer(1, 16),
    ]

    data = [["Title", "Platform", "Status", "Clicks"]]
    for _post_id, title, platform, post_status, _created_at, clicks in rows:
        display_title = (title or "Untitled")[:60]
        data.append([display_title, PLATFORM_LABEL.get(platform, platform), post_status, str(int(clicks))])

    table = Table(data, colWidths=[260, 90, 80, 60], repeatRows=1)
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1a1a3e")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTSIZE", (0, 0), (-1, -1), 9),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f0f0f5")]),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ]
        )
    )
    elements.append(table)

    doc.build(elements)
    return buffer.getvalue()
