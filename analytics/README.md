# Weaver analytics

Three small, connected tools that turn Weaver's data into decisions:

| Step | Tool | File | What it produces |
| --- | --- | --- | --- |
| 1 | SQL (PostgreSQL) | `sql/views.sql` | Clean analysis tables in an `analytics` schema |
| 2 | Python (pandas, openpyxl) | `python/weekly_report.py` | A club's weekly report as an Excel workbook, plus a CSV for step 3 |
| 3 | R (base R) | `R/reply_analysis.R` | Which outreach gets replies: rates, a logistic regression, a chart |

Everything works on counts, dates, firms and outcomes. No email text, call notes or
contact names leave the database.

## Run it

```bash
# 1. Create or update the views (read-only; never changes app data)
psql "$DATABASE_URL" -f analytics/sql/views.sql

# 2. Build the Excel report and export the outreach table
pip install -r analytics/python/requirements.txt
python analytics/python/weekly_report.py --club "BC Finance Society" --out report.xlsx --csv-dir out/

# 3. Model reply rates
Rscript analytics/R/reply_analysis.R out/outreach_outcomes.csv

# Tests for the Python step (no database needed)
python -m pytest analytics/python
```

For the local demo database: `DATABASE_URL=postgresql://postgres:weaver-demo@127.0.0.1:54329/weaver`.

## What each piece does

**SQL: `views.sql`**
- `analytics.interactions`: every email and call as one long table (`UNION ALL`).
- `analytics.outreach_outcomes`: one row per email sent, with whether the contact replied within 14 days (a `LEFT JOIN LATERAL` subquery), which attempt it was (`ROW_NUMBER() OVER (PARTITION BY contact ...)`), the weekday, and whether a call had already happened (`EXISTS`).
- `analytics.member_weekly`: each member's weekly activity, with running totals (`SUM() OVER`) and week-over-week change (`LAG`).
- `analytics.club_summary`: one row per club, using `FILTER` aggregates for the last 30 days.
- Dates are stored as text in the app, so `analytics.to_day()` parses them defensively; bad values become `NULL` instead of breaking a query.

**Python: `weekly_report.py`**
- Parameterized SQL (`%(org)s`), never string-built queries.
- pandas: `pivot_table` turns activity into per-member counts; `pd.cut` assigns Active / Slowing / Inactive; missing weeks are filled so the trend never skips.
- openpyxl builds four sheets. The **Summary numbers are live Excel formulas** (`=SUM(Members!D2:D1000)`, `=COUNTIF(...)`), so they stay right if someone edits or filters the data. It also adds conditional formatting, a frozen header, a filter and a line chart.
- Unit tests in `test_weekly_report.py` cover the shaping logic and check the formulas are present.

**R: `reply_analysis.R`**
- Reply rates by attempt (first email, first follow-up, ...) and by weekday vs weekend, with **Wilson 95% intervals**. These are honest even for small groups.
- A **logistic regression** (`glm(..., family = binomial())`) estimating how attempt, day and a prior conversation change the odds of a reply, reported as odds ratios with intervals.
- It drops terms with no variation and flags "too few cases" instead of printing meaningless numbers. With small samples it says the results are directions, not conclusions.

## Sample output (local demo data, 22 emails)

```
Reply rate by attempt
 Group Emails Replies Reply rate 95% interval
   1st     19      11        58%   36% to 77%
   2nd      3       0         0%    0% to 56%
```

With 22 emails the intervals are very wide, which is the point of showing them.

## Provenance and using this for applications

These files were written with Claude (AI) as part of building Weaver; see `PROVENANCE.md`,
change set 13. Before you describe this work on an internship application, make sure you
can explain every line, and make your own contributions. Good next steps that are yours:

1. Run it on real club data and write up what you find (one page, with the chart).
2. Add a firm-level view: reply rate by firm, and test whether it differs (chi-squared in R).
3. Schedule the Python report weekly and email it to club leaders.
4. Add a column to the Excel report and a test for it.

Interviewers will ask how it works and what you'd change. Being able to answer is what makes it count.
