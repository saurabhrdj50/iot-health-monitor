from __future__ import annotations

import json
import logging
import os
import sqlite3
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

DB_PATH = "data/telemetry.db"

DEFAULT_PATIENTS = [
    {
        "name": "John Doe",
        "age": 64,
        "dob": "1962-11-04",
        "admitted": "2026-04-28",
        "doctor": "Dr. Sarah Vance",
        "room": "ICU-04",
        "notes": "Cardiac telemetry and oxygen monitoring",
    },
    {
        "name": "Jane Smith",
        "age": 42,
        "dob": "1984-03-15",
        "admitted": "2026-05-01",
        "doctor": "Dr. Michael Chen",
        "room": "GEN-12",
        "notes": "Recovery observation after respiratory event",
    },
    {
        "name": "Robert Miller",
        "age": 78,
        "dob": "1948-09-22",
        "admitted": "2026-04-25",
        "doctor": "Dr. Sarah Vance",
        "room": "ICU-10",
        "notes": "High-risk overnight monitoring",
    },
    {
        "name": "Emily Davis",
        "age": 29,
        "dob": "1997-07-11",
        "admitted": "2026-05-02",
        "doctor": "Dr. Alan Grant",
        "room": "GEN-05",
        "notes": "Post-procedure baseline observation",
    },
]


def get_connection() -> sqlite3.Connection:
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH, timeout=10)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA synchronous=NORMAL")
    conn.execute("PRAGMA cache_size=-64000")
    conn.execute("PRAGMA foreign_keys=ON")
    conn.execute("PRAGMA temp_store=MEMORY")
    return conn


def _has_column(cursor: sqlite3.Cursor, table: str, column: str) -> bool:
    cursor.execute(f"PRAGMA table_info({table})")
    return any(row["name"] == column for row in cursor.fetchall())


def _ensure_patients_table(cursor: sqlite3.Cursor) -> None:
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS patients (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            age INTEGER,
            dob TEXT,
            admitted TEXT,
            doctor TEXT,
            room TEXT,
            notes TEXT,
            active INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
        """
    )


def _ensure_vitals_table(cursor: sqlite3.Cursor) -> None:
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS patient_vitals (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            patient_id INTEGER,
            timestamp TEXT NOT NULL,
            heart_rate REAL,
            respiratory_rate REAL,
            body_temperature REAL,
            spo2 REAL,
            gsr REAL,
            prediction TEXT,
            confidence_score REAL,
            anomaly_flag INTEGER,
            probability TEXT,
            source TEXT,
            source_entry_id TEXT,
            FOREIGN KEY(patient_id) REFERENCES patients(id)
        )
        """
    )

    if not _has_column(cursor, "patient_vitals", "patient_id"):
        cursor.execute("ALTER TABLE patient_vitals ADD COLUMN patient_id INTEGER")
    if not _has_column(cursor, "patient_vitals", "source"):
        cursor.execute("ALTER TABLE patient_vitals ADD COLUMN source TEXT")
    if not _has_column(cursor, "patient_vitals", "source_entry_id"):
        cursor.execute("ALTER TABLE patient_vitals ADD COLUMN source_entry_id TEXT")

    cursor.execute("CREATE INDEX IF NOT EXISTS idx_vitals_timestamp ON patient_vitals(timestamp DESC)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_vitals_patient_timestamp ON patient_vitals(patient_id, timestamp DESC)")
    cursor.execute(
        """
        CREATE UNIQUE INDEX IF NOT EXISTS idx_vitals_source_entry
        ON patient_vitals(source, source_entry_id)
        WHERE source IS NOT NULL AND source_entry_id IS NOT NULL
        """
    )


def _ensure_feedback_table(cursor: sqlite3.Cursor) -> None:
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS prediction_feedback (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            patient_id INTEGER,
            snapshot_id INTEGER,
            accurate INTEGER NOT NULL,
            prediction TEXT,
            metrics TEXT,
            notes TEXT,
            submitted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(patient_id) REFERENCES patients(id),
            FOREIGN KEY(snapshot_id) REFERENCES patient_vitals(id)
        )
        """
    )


def _seed_patients(cursor: sqlite3.Cursor) -> None:
    cursor.execute("SELECT COUNT(*) AS count FROM patients")
    row = cursor.fetchone()
    if row and row["count"] > 0:
        return

    for index, patient in enumerate(DEFAULT_PATIENTS):
        cursor.execute(
            """
            INSERT INTO patients (name, age, dob, admitted, doctor, room, notes, active)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                patient["name"],
                patient["age"],
                patient["dob"],
                patient["admitted"],
                patient["doctor"],
                patient["room"],
                patient["notes"],
                1 if index == 0 else 0,
            ),
        )


def init_db() -> None:
    conn = get_connection()
    cursor = conn.cursor()
    _ensure_patients_table(cursor)
    _ensure_vitals_table(cursor)
    _ensure_feedback_table(cursor)
    _seed_patients(cursor)

    cursor.execute(
        """
        UPDATE patient_vitals
        SET patient_id = COALESCE(patient_id, (SELECT id FROM patients WHERE active = 1 LIMIT 1))
        WHERE patient_id IS NULL
        """
    )

    conn.commit()
    conn.close()
    logger.info("Database initialized at %s", DB_PATH)


def _row_to_patient(row: sqlite3.Row) -> Dict[str, Any]:
    return {
        "id": row["id"],
        "name": row["name"],
        "age": row["age"],
        "dob": row["dob"],
        "admitted": row["admitted"],
        "doctor": row["doctor"],
        "room": row["room"],
        "notes": row["notes"],
        "active": bool(row["active"]),
        "created_at": row["created_at"],
    }


def list_patients() -> List[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM patients ORDER BY active DESC, admitted DESC, id ASC")
    rows = cursor.fetchall()
    conn.close()
    return [_row_to_patient(row) for row in rows]


def get_patient(patient_id: int) -> Optional[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM patients WHERE id = ?", (patient_id,))
    row = cursor.fetchone()
    conn.close()
    return _row_to_patient(row) if row else None


def get_active_patient() -> Optional[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM patients WHERE active = 1 ORDER BY id ASC LIMIT 1")
    row = cursor.fetchone()
    conn.close()
    return _row_to_patient(row) if row else None


def create_patient(payload: Dict[str, Any]) -> Dict[str, Any]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        INSERT INTO patients (name, age, dob, admitted, doctor, room, notes, active)
        VALUES (?, ?, ?, ?, ?, ?, ?, 0)
        """,
        (
            payload["name"],
            payload.get("age"),
            payload.get("dob"),
            payload.get("admitted"),
            payload.get("doctor"),
            payload.get("room"),
            payload.get("notes"),
        ),
    )
    patient_id = cursor.lastrowid
    conn.commit()
    cursor.execute("SELECT * FROM patients WHERE id = ?", (patient_id,))
    row = cursor.fetchone()
    conn.close()
    return _row_to_patient(row)


def update_patient(patient_id: int, payload: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM patients WHERE id = ?", (patient_id,))
    if cursor.fetchone() is None:
        conn.close()
        return None

    cursor.execute(
        """
        UPDATE patients
        SET name = COALESCE(?, name),
            age = COALESCE(?, age),
            dob = COALESCE(?, dob),
            admitted = COALESCE(?, admitted),
            doctor = COALESCE(?, doctor),
            room = COALESCE(?, room),
            notes = COALESCE(?, notes)
        WHERE id = ?
        """,
        (
            payload.get("name"),
            payload.get("age"),
            payload.get("dob"),
            payload.get("admitted"),
            payload.get("doctor"),
            payload.get("room"),
            payload.get("notes"),
            patient_id,
        ),
    )
    conn.commit()
    cursor.execute("SELECT * FROM patients WHERE id = ?", (patient_id,))
    row = cursor.fetchone()
    conn.close()
    return _row_to_patient(row) if row else None


def set_active_patient(patient_id: int) -> Optional[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM patients WHERE id = ?", (patient_id,))
    if cursor.fetchone() is None:
        conn.close()
        return None

    cursor.execute("UPDATE patients SET active = 0")
    cursor.execute("UPDATE patients SET active = 1 WHERE id = ?", (patient_id,))
    conn.commit()
    cursor.execute("SELECT * FROM patients WHERE id = ?", (patient_id,))
    row = cursor.fetchone()
    conn.close()
    return _row_to_patient(row)

def delete_patient(patient_id: int) -> bool:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM patients WHERE id = ?", (patient_id,))
    if cursor.fetchone() is None:
        conn.close()
        return False

    cursor.execute("DELETE FROM prediction_feedback WHERE patient_id = ?", (patient_id,))
    cursor.execute("DELETE FROM patient_vitals WHERE patient_id = ?", (patient_id,))
    cursor.execute("DELETE FROM patients WHERE id = ?", (patient_id,))
    conn.commit()
    conn.close()
    return True


def _row_to_snapshot(row: sqlite3.Row) -> Dict[str, Any]:
    data = dict(row)
    data["anomaly_flag"] = bool(data["anomaly_flag"])
    try:
        data["probability"] = json.loads(data["probability"]) if data["probability"] else {}
    except Exception:
        data["probability"] = {}
    return data


def insert_snapshot(snapshot: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        INSERT OR IGNORE INTO patient_vitals (
            patient_id, timestamp, heart_rate, respiratory_rate, body_temperature,
            spo2, gsr, prediction, confidence_score, anomaly_flag, probability,
            source, source_entry_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            snapshot.get("patient_id"),
            snapshot.get("timestamp"),
            snapshot.get("heart_rate"),
            snapshot.get("respiratory_rate"),
            snapshot.get("body_temperature"),
            snapshot.get("spo2"),
            snapshot.get("gsr"),
            snapshot.get("prediction"),
            snapshot.get("confidence_score"),
            1 if snapshot.get("anomaly_flag") else 0,
            json.dumps(snapshot.get("probability", {})),
            snapshot.get("source"),
            snapshot.get("source_entry_id"),
        ),
    )
    inserted = cursor.rowcount > 0
    snapshot_id = cursor.lastrowid if inserted else None
    conn.commit()

    if not inserted:
        conn.close()
        return None

    cursor.execute(
        """
        SELECT pv.*, p.name AS patient_name
        FROM patient_vitals pv
        LEFT JOIN patients p ON p.id = pv.patient_id
        WHERE pv.id = ?
        """,
        (snapshot_id,),
    )
    row = cursor.fetchone()
    conn.close()
    return _row_to_snapshot(row) if row else None


def get_history(limit: int = 60, patient_id: Optional[int] = None) -> List[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    if patient_id is None:
        cursor.execute(
            """
            SELECT pv.*, p.name AS patient_name
            FROM patient_vitals pv
            LEFT JOIN patients p ON p.id = pv.patient_id
            ORDER BY pv.timestamp DESC
            LIMIT ?
            """,
            (limit,),
        )
    else:
        cursor.execute(
            """
            SELECT pv.*, p.name AS patient_name
            FROM patient_vitals pv
            LEFT JOIN patients p ON p.id = pv.patient_id
            WHERE pv.patient_id = ?
            ORDER BY pv.timestamp DESC
            LIMIT ?
            """,
            (patient_id, limit),
        )
    rows = cursor.fetchall()
    conn.close()
    return [_row_to_snapshot(row) for row in reversed(rows)]


def get_latest(patient_id: Optional[int] = None) -> Optional[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    if patient_id is None:
        cursor.execute(
            """
            SELECT pv.*, p.name AS patient_name
            FROM patient_vitals pv
            LEFT JOIN patients p ON p.id = pv.patient_id
            ORDER BY pv.timestamp DESC
            LIMIT 1
            """
        )
    else:
        cursor.execute(
            """
            SELECT pv.*, p.name AS patient_name
            FROM patient_vitals pv
            LEFT JOIN patients p ON p.id = pv.patient_id
            WHERE pv.patient_id = ?
            ORDER BY pv.timestamp DESC
            LIMIT 1
            """,
            (patient_id,),
        )
    row = cursor.fetchone()
    conn.close()
    return _row_to_snapshot(row) if row else None


def save_feedback(payload: Dict[str, Any]) -> Dict[str, Any]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        INSERT INTO prediction_feedback (patient_id, snapshot_id, accurate, prediction, metrics, notes)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (
            payload.get("patient_id"),
            payload.get("snapshot_id"),
            1 if payload.get("accurate") else 0,
            payload.get("prediction"),
            json.dumps(payload.get("metrics", {})),
            payload.get("notes"),
        ),
    )
    feedback_id = cursor.lastrowid
    conn.commit()
    cursor.execute("SELECT * FROM prediction_feedback WHERE id = ?", (feedback_id,))
    row = cursor.fetchone()
    conn.close()

    data = dict(row)
    try:
        data["metrics"] = json.loads(data["metrics"]) if data["metrics"] else {}
    except Exception:
        data["metrics"] = {}
    data["accurate"] = bool(data["accurate"])
    return data


def get_feedback_summary(patient_id: Optional[int] = None) -> Dict[str, Any]:
    conn = get_connection()
    cursor = conn.cursor()
    if patient_id is None:
        cursor.execute(
            """
            SELECT COUNT(*) AS total,
                   SUM(CASE WHEN accurate = 1 THEN 1 ELSE 0 END) AS positive
            FROM prediction_feedback
            """
        )
    else:
        cursor.execute(
            """
            SELECT COUNT(*) AS total,
                   SUM(CASE WHEN accurate = 1 THEN 1 ELSE 0 END) AS positive
            FROM prediction_feedback
            WHERE patient_id = ?
            """,
            (patient_id,),
        )
    row = cursor.fetchone()
    conn.close()
    total = row["total"] or 0
    positive = row["positive"] or 0
    return {
        "total_feedback": total,
        "positive_feedback": positive,
        "accuracy_ratio": round((positive / total), 3) if total else None,
    }


def get_patient_overview() -> List[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT
            p.*,
            pv.timestamp AS latest_timestamp,
            pv.prediction AS latest_prediction,
            pv.heart_rate AS latest_heart_rate,
            pv.spo2 AS latest_spo2,
            pv.body_temperature AS latest_body_temperature
        FROM patients p
        LEFT JOIN patient_vitals pv
          ON pv.id = (
            SELECT id
            FROM patient_vitals
            WHERE patient_id = p.id
            ORDER BY timestamp DESC
            LIMIT 1
          )
        ORDER BY p.active DESC, p.admitted DESC, p.id ASC
        """
    )
    rows = cursor.fetchall()
    conn.close()

    results: List[Dict[str, Any]] = []
    for row in rows:
        patient = _row_to_patient(row)
        patient["latest_timestamp"] = row["latest_timestamp"]
        patient["latest_prediction"] = row["latest_prediction"]
        patient["latest_heart_rate"] = row["latest_heart_rate"]
        patient["latest_spo2"] = row["latest_spo2"]
        patient["latest_body_temperature"] = row["latest_body_temperature"]
        results.append(patient)
    return results


def clear_history(patient_id: Optional[int] = None) -> int:
    conn = get_connection()
    cursor = conn.cursor()
    if patient_id is None:
        cursor.execute("DELETE FROM patient_vitals")
    else:
        cursor.execute("DELETE FROM patient_vitals WHERE patient_id = ?", (patient_id,))
    deleted = cursor.rowcount
    conn.commit()
    conn.close()
    return deleted
