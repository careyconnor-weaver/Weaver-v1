"""Unit tests for the report's data shaping (no database needed).  Run: python -m pytest analytics/python"""
from datetime import date

import pandas as pd

from weekly_report import build_workbook, complete_weeks, shape

TODAY = date(2026, 10, 30)  # a Friday


def sample():
    members = pd.DataFrame({
        "user_id": ["a", "b", "c"],
        "member": ["Ava", "Ben", "Cam"],
        "role": ["owner", "member", "member"],
        "joined": [date(2026, 9, 1)] * 3,
    })
    activity = pd.DataFrame({
        "user_id": ["a", "a", "a", "b", "b"],
        "kind": ["email_sent", "reply", "call", "email_sent", "email_sent"],
        "day": [date(2026, 10, 28), date(2026, 10, 29), date(2026, 10, 29), date(2026, 10, 10), date(2026, 9, 1)],
    })
    return {"members": members, "activity": activity}


def test_shape_counts_and_status():
    df = shape(sample(), TODAY).set_index("member")
    assert df.loc["Ava", ["outreach", "replies", "calls"]].tolist() == [1, 1, 1]
    assert df.loc["Ava", "status"] == "Active"        # 1 day ago
    assert df.loc["Ben", "status"] == "Slowing"       # 20 days ago
    assert df.loc["Cam", "status"] == "Inactive"      # never active
    assert df.loc["Cam", "outreach"] == 0


def test_complete_weeks_fills_gaps():
    weekly = pd.DataFrame({"week": [date(2026, 10, 19)], "outreach": [3], "replies": [1], "calls": [0]})
    out = complete_weeks(weekly, 4, TODAY)
    assert len(out) == 4
    assert out["week"].tolist()[-1] == date(2026, 10, 26)   # Monday of this week
    assert out["outreach"].tolist() == [0, 0, 3, 0]


def test_workbook_uses_live_formulas():
    wb = build_workbook("Test Club", shape(sample(), TODAY), complete_weeks(pd.DataFrame(columns=["week", "outreach", "replies", "calls"]), 4, TODAY), TODAY)
    assert wb.sheetnames == ["Summary", "Members", "Trend", "Notes"]
    assert str(wb["Members"]["F2"].value).startswith("=IF(D2=0")
    assert wb["Summary"]["B7"].value == "=SUM(Members!D2:D1000)"
    assert len(wb["Summary"]._charts) == 1
