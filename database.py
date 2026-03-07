"""
database.py — SQLite persistence layer for AI Quiz Generator
Handles all quiz attempt storage and admin queries.
"""

import sqlite3
import os
from datetime import datetime, timezone
from typing import Optional

DB_PATH = os.path.join(os.path.dirname(__file__), "quiz_history.db")


def get_conn() -> sqlite3.Connection:
    """Return a connection with row_factory so rows behave like dicts."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    """Create tables if they don't already exist."""
    with get_conn() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS quiz_attempts (
                id               INTEGER PRIMARY KEY AUTOINCREMENT,
                name             TEXT    NOT NULL,
                topic            TEXT    NOT NULL,
                level            TEXT    NOT NULL,
                num_questions    INTEGER NOT NULL,
                score            INTEGER NOT NULL,
                percentage       REAL    NOT NULL,
                certificate_earned INTEGER NOT NULL DEFAULT 0,
                timestamp        TEXT    NOT NULL
            )
        """)
        conn.commit()


def save_attempt(
    name: str,
    topic: str,
    level: str,
    num_questions: int,
    score: int,
) -> int:
    """Insert a quiz attempt and return its new id."""
    percentage = round((score / num_questions) * 100, 1) if num_questions else 0.0
    certificate_earned = 1 if percentage >= 70 else 0
    timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")

    with get_conn() as conn:
        cur = conn.execute("""
            INSERT INTO quiz_attempts
                (name, topic, level, num_questions, score, percentage, certificate_earned, timestamp)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (name, topic, level, num_questions, score, percentage, certificate_earned, timestamp))
        conn.commit()
        return cur.lastrowid


def delete_attempt(attempt_id: int) -> None:
    """Delete a single attempt by id."""
    with get_conn() as conn:
        conn.execute("DELETE FROM quiz_attempts WHERE id = ?", (attempt_id,))
        conn.commit()


def get_all_attempts(search: str = "", sort_by: str = "timestamp", order: str = "desc") -> list:
    """Return all attempts, optionally filtered by name/topic search string."""
    allowed_sort = {"id", "name", "topic", "level", "score", "percentage", "timestamp"}
    if sort_by not in allowed_sort:
        sort_by = "timestamp"
    order = "ASC" if order.lower() == "asc" else "DESC"

    query = f"""
        SELECT * FROM quiz_attempts
        WHERE name LIKE ? OR topic LIKE ?
        ORDER BY {sort_by} {order}
    """
    pattern = f"%{search}%"
    with get_conn() as conn:
        rows = conn.execute(query, (pattern, pattern)).fetchall()
    return [dict(r) for r in rows]


def get_stats() -> dict:
    """Return aggregate stats for the dashboard summary cards."""
    with get_conn() as conn:
        total       = conn.execute("SELECT COUNT(*) FROM quiz_attempts").fetchone()[0]
        certs       = conn.execute("SELECT COUNT(*) FROM quiz_attempts WHERE certificate_earned=1").fetchone()[0]
        avg_pct_row = conn.execute("SELECT AVG(percentage) FROM quiz_attempts").fetchone()[0]
        avg_pct     = round(avg_pct_row or 0, 1)
        unique      = conn.execute("SELECT COUNT(DISTINCT LOWER(name)) FROM quiz_attempts").fetchone()[0]
        today_str   = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        today       = conn.execute(
            "SELECT COUNT(*) FROM quiz_attempts WHERE timestamp LIKE ?",
            (f"{today_str}%",)
        ).fetchone()[0]
    return {
        "total": total,
        "certificates": certs,
        "avg_percentage": avg_pct,
        "unique_users": unique,
        "today": today,
    }


def get_chart_data() -> dict:
    """Return aggregated data needed for the three dashboard charts."""
    with get_conn() as conn:
        # Score distribution — buckets of 20
        buckets = {"0-20": 0, "21-40": 0, "41-60": 0, "61-80": 0, "81-100": 0}
        for row in conn.execute("SELECT percentage FROM quiz_attempts").fetchall():
            p = row[0]
            if p <= 20:   buckets["0-20"]   += 1
            elif p <= 40: buckets["21-40"]  += 1
            elif p <= 60: buckets["41-60"]  += 1
            elif p <= 80: buckets["61-80"]  += 1
            else:         buckets["81-100"] += 1

        # Top 6 topics by attempt count
        topic_rows = conn.execute("""
            SELECT topic, COUNT(*) as cnt
            FROM quiz_attempts
            GROUP BY LOWER(topic)
            ORDER BY cnt DESC
            LIMIT 6
        """).fetchall()
        topics = [r["topic"] for r in topic_rows]
        topic_counts = [r["cnt"] for r in topic_rows]

        # Difficulty breakdown
        diff_rows = conn.execute("""
            SELECT level, COUNT(*) as cnt
            FROM quiz_attempts
            GROUP BY level
        """).fetchall()
        diff = {r["level"]: r["cnt"] for r in diff_rows}

    return {
        "score_labels": list(buckets.keys()),
        "score_data":   list(buckets.values()),
        "topic_labels": topics,
        "topic_data":   topic_counts,
        "diff_labels":  list(diff.keys()),
        "diff_data":    list(diff.values()),
    }


# Auto-initialise on import
init_db()
