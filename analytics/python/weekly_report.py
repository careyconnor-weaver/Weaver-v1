"""Weaver club weekly report: from the database to a formatted Excel workbook.

Usage:
    pip install -r analytics/python/requirements.txt
    export DATABASE_URL=postgresql://...            # read-only access is enough
    python analytics/python/weekly_report.py --club "BC Finance Society" --out report.xlsx

What it does:
    1. Reads the analytics views (analytics/sql/views.sql) with parameterized SQL.
    2. Shapes the data with pandas: per-member totals, a 12-week trend, a status
       for each member (Active / Slowing / Inactive) from days since last activity.
    3. Writes an Excel workbook with openpyxl:
         Summary  – headline numbers, written as live Excel formulas over the Members sheet
         Members  – one row per member, reply rate as a formula, conditional formatting
         Trend    – weekly outreach, replies and calls, with a line chart
         Notes    – definitions, so the report explains itself
    4. Optionally exports the outreach table as CSV for analytics/R/reply_analysis.R.

Privacy: counts and dates only. No email text, call notes or contact names.
"""

from __future__ import annotations

import argparse
import os
import sys
import warnings
from datetime import date, timedelta

import pandas as pd
import psycopg2
from openpyxl import Workbook
from openpyxl.chart import LineChart, Reference
from openpyxl.formatting.rule import CellIsRule, ColorScaleRule
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter

# pandas prefers SQLAlchemy connections; a plain psycopg2 connection works fine for reads.
warnings.filterwarnings("ignore", message="pandas only supports SQLAlchemy")

NAVY = "1F3B73"
INK = "16203A"
GREY = "5B6474"
HAIR = "E3E6EB"


# ---------------------------------------------------------------- data
def connect(url: str):
    return psycopg2.connect(url)


def find_club(conn, club: str) -> tuple[str, str]:
    """Accept a club id or an exact (case-insensitive) club name."""
    with conn.cursor() as cur:
        cur.execute(
            "SELECT id, name FROM organizations WHERE id = %s OR lower(name) = lower(%s) ORDER BY verified DESC LIMIT 1",
            (club, club),
        )
        row = cur.fetchone()
    if not row:
        sys.exit(f"No club found matching {club!r}.")
    return row[0], row[1]


def load(conn, org_id: str, weeks: int) -> dict[str, pd.DataFrame]:
    since = date.today() - timedelta(weeks=weeks)
    members = pd.read_sql(
        """
        SELECT m.user_id,
               COALESCE(NULLIF(m.display_name, ''), split_part(u.email, '@', 1)) AS member,
               m.role, m.joined_at::date AS joined
        FROM org_members m JOIN users u ON u.id = m.user_id
        WHERE m.org_id = %(org)s
        """,
        conn, params={"org": org_id},
    )
    activity = pd.read_sql(
        """
        SELECT i.user_id, i.kind, i.day
        FROM analytics.interactions i
        JOIN org_members m ON m.user_id = i.user_id AND m.org_id = %(org)s
        WHERE i.day IS NOT NULL
        """,
        conn, params={"org": org_id},
    )
    weekly = pd.read_sql(
        """
        SELECT week, SUM(outreach) AS outreach, SUM(replies) AS replies, SUM(calls) AS calls
        FROM analytics.member_weekly
        WHERE org_id = %(org)s AND week >= %(since)s
        GROUP BY week ORDER BY week
        """,
        conn, params={"org": org_id, "since": since},
    )
    outreach = pd.read_sql(
        """
        SELECT o.email_type, o.sent_day, o.weekday, o.nth_email, o.replied, o.days_to_reply, o.prior_call, o.firm
        FROM analytics.outreach_outcomes o
        JOIN org_members m ON m.user_id = o.user_id AND m.org_id = %(org)s
        """,
        conn, params={"org": org_id},
    )
    return {"members": members, "activity": activity, "weekly": weekly, "outreach": outreach}


def shape(data: dict[str, pd.DataFrame], today: date) -> pd.DataFrame:
    """One row per member with totals, last activity and a status."""
    act = data["activity"].copy()
    act["day"] = pd.to_datetime(act["day"])
    counts = (
        act.pivot_table(index="user_id", columns="kind", values="day", aggfunc="count", fill_value=0)
        .reindex(columns=["email_sent", "reply", "call"], fill_value=0)
        .rename(columns={"email_sent": "outreach", "reply": "replies", "call": "calls"})
    )
    last = act.groupby("user_id")["day"].max().rename("last_active")
    df = data["members"].merge(counts, left_on="user_id", right_index=True, how="left")
    df = df.merge(last, left_on="user_id", right_index=True, how="left")
    df[["outreach", "replies", "calls"]] = df[["outreach", "replies", "calls"]].fillna(0).astype(int)
    df["days_since"] = (pd.Timestamp(today) - df["last_active"]).dt.days
    df["status"] = pd.cut(
        df["days_since"].fillna(10_000), bins=[-1, 14, 30, float("inf")], labels=["Active", "Slowing", "Inactive"]
    ).astype(str)
    df["last_active"] = df["last_active"].dt.date
    return df.sort_values(["outreach", "calls"], ascending=False).reset_index(drop=True)


def complete_weeks(weekly: pd.DataFrame, weeks: int, today: date) -> pd.DataFrame:
    """Fill in weeks with no activity so the chart doesn't skip them."""
    monday = today - timedelta(days=today.weekday())
    frame = pd.DataFrame({"week": [monday - timedelta(weeks=w) for w in range(weeks - 1, -1, -1)]})
    weekly = weekly.copy()
    weekly["week"] = pd.to_datetime(weekly["week"]).dt.date
    out = frame.merge(weekly, on="week", how="left").fillna(0)
    out[["outreach", "replies", "calls"]] = out[["outreach", "replies", "calls"]].astype(int)
    return out


# ---------------------------------------------------------------- workbook
def style_header(ws, row: int, ncols: int):
    for c in range(1, ncols + 1):
        cell = ws.cell(row=row, column=c)
        cell.font = Font(bold=True, color="FFFFFF")
        cell.fill = PatternFill("solid", fgColor=NAVY)
        cell.alignment = Alignment(horizontal="center" if c > 1 else "left", vertical="center")


def autosize(ws, widths: dict[int, int] | None = None):
    for col in ws.columns:
        letter = get_column_letter(col[0].column)
        longest = max(len(str(c.value)) if c.value is not None else 0 for c in col)
        ws.column_dimensions[letter].width = (widths or {}).get(col[0].column, min(max(10, longest + 2), 48))


def build_workbook(club: str, members: pd.DataFrame, weekly: pd.DataFrame, today: date) -> Workbook:
    wb = Workbook()
    thin = Side(style="thin", color=HAIR)

    # Members sheet first, so Summary formulas can point at it.
    ws = wb.active
    ws.title = "Members"
    cols = ["Member", "Role", "Joined", "Outreach", "Replies", "Reply rate", "Calls", "Last active", "Days since", "Status"]
    ws.append(cols)
    style_header(ws, 1, len(cols))
    for i, r in enumerate(members.itertuples(index=False), start=2):
        ws.append([r.member, r.role, r.joined, r.outreach, r.replies, None, r.calls, r.last_active,
                   None if pd.isna(r.days_since) else int(r.days_since), r.status])
        ws.cell(row=i, column=6, value=f'=IF(D{i}=0,"",E{i}/D{i})').number_format = "0%"   # live formula
        for c in range(1, len(cols) + 1):
            ws.cell(row=i, column=c).border = Border(bottom=thin)
    last = max(2, ws.max_row)
    ws.conditional_formatting.add(f"D2:D{last}", ColorScaleRule(start_type="min", start_color="FFFFFF", end_type="max", end_color="C9D6EE"))
    ws.conditional_formatting.add(f"J2:J{last}", CellIsRule(operator="equal", formula=['"Inactive"'], font=Font(color="8A2A1B", bold=True)))
    ws.conditional_formatting.add(f"J2:J{last}", CellIsRule(operator="equal", formula=['"Slowing"'], font=Font(color="8A5A00")))
    ws.freeze_panes = "A2"
    ws.auto_filter.ref = f"A1:{get_column_letter(len(cols))}{last}"
    autosize(ws)

    # Summary: every number is an Excel formula over the Members sheet, so it stays
    # correct if someone edits or filters the data.
    s = wb.create_sheet("Summary", 0)
    s["A1"] = f"{club}: weekly recruiting report"
    s["A1"].font = Font(size=16, bold=True, color=INK)
    s["A2"] = f"Week of {today - timedelta(days=today.weekday()):%B %d, %Y} · generated by Weaver"
    s["A2"].font = Font(color=GREY)
    rows = [
        ("Members", "=COUNTA(Members!A2:A1000)", "0"),
        ("Active in the last 14 days", '=COUNTIF(Members!J2:J1000,"Active")', "0"),
        ("Need a nudge (inactive 30+ days)", '=COUNTIF(Members!J2:J1000,"Inactive")', "0"),
        ("Outreach sent", "=SUM(Members!D2:D1000)", "#,##0"),
        ("Replies", "=SUM(Members!E2:E1000)", "#,##0"),
        ("Reply rate", "=IF(B7=0,0,B8/B7)", "0.0%"),
        ("Calls and coffee chats", "=SUM(Members!G2:G1000)", "#,##0"),
        ("Outreach per active member", "=IF(B5=0,0,B7/B5)", "0.0"),
    ]
    for i, (label, formula, fmt) in enumerate(rows, start=4):
        s.cell(row=i, column=1, value=label).font = Font(color=GREY)
        cell = s.cell(row=i, column=2, value=formula)
        cell.number_format = fmt
        cell.font = Font(bold=True, size=13, color=INK)
    s.column_dimensions["A"].width = 36
    s.column_dimensions["B"].width = 16

    # Trend sheet + chart
    t = wb.create_sheet("Trend")
    t.append(["Week of", "Outreach", "Replies", "Calls"])
    style_header(t, 1, 4)
    for r in weekly.itertuples(index=False):
        t.append([r.week, r.outreach, r.replies, r.calls])
    for row in t.iter_rows(min_row=2, max_col=1):
        row[0].number_format = "mmm d"
    autosize(t, {1: 12})
    chart = LineChart()
    chart.title = "Club activity by week"
    chart.y_axis.title = "Count"
    chart.height, chart.width = 8, 16
    data_ref = Reference(t, min_col=2, min_row=1, max_col=4, max_row=t.max_row)
    chart.add_data(data_ref, titles_from_data=True)
    chart.set_categories(Reference(t, min_col=1, min_row=2, max_row=t.max_row))
    for series, color in zip(chart.series, [NAVY, "D97B36", "8B97AD"]):
        series.graphicalProperties.line.solidFill = color
        series.graphicalProperties.line.width = 22000
        series.smooth = False
    s.add_chart(chart, "A14")   # below the numbers, so the sheet prints on one page

    # Notes: definitions, so the workbook stands on its own.
    n = wb.create_sheet("Notes")
    notes = [
        ("Outreach", "Emails a member logged as sent."),
        ("Replies", "Emails a member logged as received from a contact."),
        ("Reply rate", "Replies ÷ outreach. Calculated live in Excel."),
        ("Calls", "Calls and coffee chats logged in Weaver."),
        ("Status", "Active: activity in the last 14 days. Slowing: 15–30 days. Inactive: more than 30."),
        ("Privacy", "Counts only. No email text, call notes or contact names are included."),
    ]
    n.append(["Term", "Definition"])
    style_header(n, 1, 2)
    for row in notes:
        n.append(row)
    n.column_dimensions["A"].width = 14
    n.column_dimensions["B"].width = 90
    return wb


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description="Build a club's weekly recruiting report as an Excel workbook.")
    ap.add_argument("--club", required=True, help="club id or exact club name")
    ap.add_argument("--out", default="weekly_report.xlsx", help="output .xlsx path")
    ap.add_argument("--weeks", type=int, default=12, help="weeks of trend to include (default 12)")
    ap.add_argument("--csv-dir", help="also export outreach_outcomes.csv here for the R analysis")
    ap.add_argument("--db", default=os.environ.get("DATABASE_URL"), help="database URL (default: $DATABASE_URL)")
    args = ap.parse_args(argv)
    if not args.db:
        ap.error("set DATABASE_URL or pass --db")

    today = date.today()
    with connect(args.db) as conn:
        org_id, club = find_club(conn, args.club)
        data = load(conn, org_id, args.weeks)
    members = shape(data, today)
    weekly = complete_weeks(data["weekly"], args.weeks, today)
    wb = build_workbook(club, members, weekly, today)
    wb.save(args.out)
    print(f"Wrote {args.out}: {len(members)} members, {int(members['outreach'].sum())} outreach, {args.weeks} weeks of trend.")

    if args.csv_dir:
        os.makedirs(args.csv_dir, exist_ok=True)
        path = os.path.join(args.csv_dir, "outreach_outcomes.csv")
        data["outreach"].to_csv(path, index=False)
        print(f"Wrote {path}: {len(data['outreach'])} emails for the R analysis.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
