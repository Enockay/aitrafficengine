import io
from datetime import datetime

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle
from sqlalchemy import and_, func, select
from sqlalchemy.orm import Session

from app.models.analytics import Analytics
from app.models.page import Page
from app.models.post import Post
from app.models.site import Site
from app.models.user import User
from app.services.analytics_export import PLATFORM_LABEL


def generate_user_report_pdf(db: Session, user: User, since: datetime, until: datetime) -> bytes:
    """Builds the recurring per-user report PDF: posts published in [since, until),
    click/engagement totals, and a per-post breakdown. Reuses the same ReportLab
    primitives as analytics_export.py's user-triggered export.
    """
    rows = db.execute(
        select(
            Post.id,
            Post.title,
            Post.platform,
            Post.published_at,
            func.coalesce(func.sum(Analytics.clicks), 0),
            func.coalesce(func.sum(Analytics.likes + Analytics.comments + Analytics.shares), 0),
        )
        .join(Page, Post.page_id == Page.id)
        .join(Site, Page.site_id == Site.id)
        .outerjoin(
            Analytics,
            and_(
                Analytics.post_id == Post.id,
                Analytics.metric_date >= since.date(),
                Analytics.metric_date <= until.date(),
            ),
        )
        .where(
            Site.user_id == user.id,
            Post.deleted_at.is_(None),
            Post.status == "published",
            Post.published_at >= since,
            Post.published_at < until,
        )
        .group_by(Post.id)
        .order_by(Post.published_at.desc())
    ).all()

    total_clicks = sum(int(r[4]) for r in rows)
    total_interactions = sum(int(r[5]) for r in rows)

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, title="AI Traffic Engine — Your Report")
    styles = getSampleStyleSheet()

    elements = [
        Paragraph("AI Traffic Engine — Your Report", styles["Title"]),
        Paragraph(f"{since.date().isoformat()} to {until.date().isoformat()}", styles["Normal"]),
        Paragraph(f"Posts published: {len(rows)}", styles["Normal"]),
        Paragraph(f"Total clicks: {total_clicks}", styles["Normal"]),
        Paragraph(f"Total interactions (likes + comments + shares): {total_interactions}", styles["Normal"]),
        Spacer(1, 16),
    ]

    if rows:
        data = [["Title", "Platform", "Clicks", "Interactions", "Published"]]
        for _post_id, title, platform, published_at, clicks, interactions in rows:
            display_title = (title or "Untitled")[:60]
            published_str = published_at.date().isoformat() if published_at else ""
            data.append(
                [
                    display_title,
                    PLATFORM_LABEL.get(platform, platform),
                    str(int(clicks)),
                    str(int(interactions)),
                    published_str,
                ]
            )
        table = Table(data, colWidths=[220, 80, 60, 80, 80], repeatRows=1)
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
    else:
        elements.append(Paragraph("No posts were published in this period.", styles["Normal"]))

    doc.build(elements)
    return buffer.getvalue()
