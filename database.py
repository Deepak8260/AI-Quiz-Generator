"""
database.py — Supabase persistence layer for AI Quiz Generator
Handles quiz attempts (admin dashboard) AND quiz sessions (stateless flow).
"""

import os
import json
from collections import Counter
from datetime import datetime, timezone
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY: str = os.getenv("SUPABASE_KEY", "")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

ATTEMPTS_TABLE = "quiz_attempts"
SESSIONS_TABLE = "quiz_sessions"


# ════════════════════════════════════════════════════════════════════════════
# QUIZ SESSIONS  (replaces the old in-memory quiz_data dict)
# ════════════════════════════════════════════════════════════════════════════

def save_session(
    session_id: str,
    name: str,
    topic: str,
    level: str,
    num_questions: int,
    questions: list,
) -> None:
    """Create a new quiz session row in Supabase."""
    supabase.table(SESSIONS_TABLE).insert({
        "id":            session_id,
        "name":          name,
        "topic":         topic,
        "level":         level,
        "num_questions": num_questions,
        "questions":     questions,          # Supabase JSONB column
    }).execute()


def get_session(session_id: str) -> dict | None:
    """Fetch a session by its id. Returns None if not found."""
    if not session_id:
        return None
    res = supabase.table(SESSIONS_TABLE).select("*").eq("id", session_id).execute()
    if res.data:
        return res.data[0]
    return None


def update_session_score(session_id: str, score: int, total_questions: int) -> None:
    """Write the score back to an existing session after quiz submission."""
    supabase.table(SESSIONS_TABLE).update({
        "score":           score,
        "total_questions": total_questions,
    }).eq("id", session_id).execute()


# ════════════════════════════════════════════════════════════════════════════
# QUIZ ATTEMPTS  (admin dashboard persistence)
# ════════════════════════════════════════════════════════════════════════════

def save_attempt(
    name: str,
    topic: str,
    level: str,
    num_questions: int,
    score: int,
) -> None:
    """Insert a completed quiz attempt into the admin dashboard table."""
    percentage         = round((score / num_questions) * 100, 1) if num_questions else 0.0
    certificate_earned = percentage >= 70
    timestamp          = datetime.now(timezone.utc).isoformat()

    supabase.table(ATTEMPTS_TABLE).insert({
        "name":               name,
        "topic":              topic,
        "level":              level,
        "num_questions":      num_questions,
        "score":              score,
        "percentage":         percentage,
        "certificate_earned": certificate_earned,
        "timestamp":          timestamp,
    }).execute()


def delete_attempt(attempt_id: int) -> None:
    """Delete a single attempt by its id."""
    supabase.table(ATTEMPTS_TABLE).delete().eq("id", attempt_id).execute()


def get_all_attempts(
    search: str = "",
    sort_by: str = "timestamp",
    order: str = "desc",
) -> list:
    """Return all attempts, optionally filtered by name/topic."""
    allowed_sort = {"id", "name", "topic", "level", "score", "percentage", "timestamp"}
    if sort_by not in allowed_sort:
        sort_by = "timestamp"
    desc = order.lower() != "asc"

    query = supabase.table(ATTEMPTS_TABLE).select("*")
    if search:
        query = query.or_(f"name.ilike.%{search}%,topic.ilike.%{search}%")
    query = query.order(sort_by, desc=desc)
    return query.execute().data or []


def get_stats() -> dict:
    """Return aggregate stats for the dashboard summary cards."""
    rows = supabase.table(ATTEMPTS_TABLE).select("*").execute().data or []

    total       = len(rows)
    certs       = sum(1 for r in rows if r.get("certificate_earned"))
    avg_pct     = round(sum(r["percentage"] for r in rows) / total, 1) if total else 0.0
    unique      = len(set(r["name"].lower() for r in rows))
    today_str   = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    today_count = sum(1 for r in rows if (r.get("timestamp") or "").startswith(today_str))

    return {
        "total":          total,
        "certificates":   certs,
        "avg_percentage": avg_pct,
        "unique_users":   unique,
        "today":          today_count,
    }


def get_chart_data() -> dict:
    """Return aggregated data for the three dashboard charts."""
    rows = supabase.table(ATTEMPTS_TABLE).select("percentage,topic,level").execute().data or []

    buckets = {"0-20": 0, "21-40": 0, "41-60": 0, "61-80": 0, "81-100": 0}
    for r in rows:
        p = r.get("percentage", 0)
        if p <= 20:   buckets["0-20"]   += 1
        elif p <= 40: buckets["21-40"]  += 1
        elif p <= 60: buckets["41-60"]  += 1
        elif p <= 80: buckets["61-80"]  += 1
        else:         buckets["81-100"] += 1

    topic_ctr = Counter(r["topic"] for r in rows if r.get("topic"))
    top6      = topic_ctr.most_common(6)
    diff_ctr  = Counter(r["level"] for r in rows if r.get("level"))

    return {
        "score_labels": list(buckets.keys()),
        "score_data":   list(buckets.values()),
        "topic_labels": [t[0] for t in top6],
        "topic_data":   [t[1] for t in top6],
        "diff_labels":  list(diff_ctr.keys()),
        "diff_data":    list(diff_ctr.values()),
    }
