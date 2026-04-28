from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, List

import numpy as np
import pandas as pd

BASELINE_STATS = {
    "hr_mean": 75.0,
    "hr_std": 15.0,
    "spo2_normal": 98.0,
    "temp_normal": 36.8,
    "rr_normal": 16.0,
}

FEATURE_COLUMNS = [
    "heart_rate",
    "respiratory_rate",
    "body_temperature",
    "spo2",
    "health_index",
    "stress_indicator",
    "hr_deviation",
    "spo2_deficit",
    "temp_deviation",
    "rr_deviation",
    "abnormal_flags",
]

LABEL_MAPPING = {0: "Normal", 1: "Stress", 2: "Risk"}
LABEL_REVERSE = {value: key for key, value in LABEL_MAPPING.items()}
SOURCE_RISK_HIGH = "High Risk"


@dataclass
class VitalReading:
    heart_rate: float
    respiratory_rate: float
    body_temperature: float | None
    spo2: float
    gsr: float | None = None
    timestamp: str | None = None


def resolve_body_temperature(body_temperature: float | None) -> float:
    return BASELINE_STATS["temp_normal"] if body_temperature is None else float(body_temperature)


def normalize_dataset_columns(df: pd.DataFrame) -> pd.DataFrame:
    normalized = df.copy()
    normalized.columns = normalized.columns.str.strip().str.lower().str.replace(" ", "_")
    column_mapping = {
        "oxygen_saturation": "spo2",
        "weight_(kg)": "weight",
        "height_(m)": "height",
        "derived_hrv": "hrv",
        "derived_pulse_pressure": "pulse_pressure",
        "derived_bmi": "bmi",
        "derived_map": "map",
        "risk_category": "risk_category",
    }
    return normalized.rename(columns=column_mapping)


def handle_missing_values(df: pd.DataFrame) -> pd.DataFrame:
    filled = df.copy()
    numeric_cols = filled.select_dtypes(include=[np.number]).columns
    for col in numeric_cols:
        if filled[col].isnull().any():
            filled[col] = filled[col].fillna(filled[col].median())

    categorical_cols = filled.select_dtypes(include=["object"]).columns
    for col in categorical_cols:
        if filled[col].isnull().any():
            filled[col] = filled[col].fillna(filled[col].mode().iloc[0])
    return filled


def sort_by_timestamp(df: pd.DataFrame) -> pd.DataFrame:
    if "timestamp" not in df.columns:
        return df.reset_index(drop=True)

    sorted_df = df.copy()
    sorted_df["timestamp"] = pd.to_datetime(sorted_df["timestamp"], errors="coerce")
    sorted_df = sorted_df.sort_values("timestamp").reset_index(drop=True)
    return sorted_df


def remove_outliers(df: pd.DataFrame, columns: List[str] | None = None) -> pd.DataFrame:
    if columns is None:
        columns = ["heart_rate", "respiratory_rate", "body_temperature", "spo2"]

    filtered = df.copy()
    for col in columns:
        if col not in filtered.columns:
            continue
        q1 = filtered[col].quantile(0.25)
        q3 = filtered[col].quantile(0.75)
        iqr = q3 - q1
        lower_bound = q1 - 1.5 * iqr
        upper_bound = q3 + 1.5 * iqr
        filtered = filtered[(filtered[col] >= lower_bound) & (filtered[col] <= upper_bound)]
    return filtered.reset_index(drop=True)


def build_feature_dict(reading: VitalReading | Dict[str, Any]) -> Dict[str, float]:
    if isinstance(reading, dict):
        reading = VitalReading(
            heart_rate=float(reading["heart_rate"]),
            respiratory_rate=float(reading["respiratory_rate"]),
            body_temperature=None if reading.get("body_temperature") is None else float(reading["body_temperature"]),
            spo2=float(reading["spo2"]),
            gsr=None if reading.get("gsr") is None else float(reading["gsr"]),
            timestamp=reading.get("timestamp"),
        )

    hr = float(reading.heart_rate)
    rr = float(reading.respiratory_rate)
    temp = resolve_body_temperature(reading.body_temperature)
    spo2 = float(reading.spo2)

    health_index = (
        (100 - abs(hr - BASELINE_STATS["hr_mean"]) / BASELINE_STATS["hr_std"] * 10)
        + (spo2 - BASELINE_STATS["spo2_normal"] + 5)
        + (40 - abs(temp - BASELINE_STATS["temp_normal"]) * 10)
        + (20 - abs(rr - BASELINE_STATS["rr_normal"]))
    )
    health_index = float(np.clip(health_index, 0, 100))

    stress_indicator = (
        abs(hr - BASELINE_STATS["hr_mean"]) / BASELINE_STATS["hr_std"] * 2
        + (BASELINE_STATS["spo2_normal"] - spo2) / 2
        + abs(rr - BASELINE_STATS["rr_normal"]) / 4
        + abs(temp - BASELINE_STATS["temp_normal"]) * 3
    )

    feature_dict = {
        "heart_rate": hr,
        "respiratory_rate": rr,
        "body_temperature": temp,
        "spo2": spo2,
        "health_index": health_index,
        "stress_indicator": float(stress_indicator),
        "hr_deviation": float((hr - BASELINE_STATS["hr_mean"]) / BASELINE_STATS["hr_std"]),
        "spo2_deficit": float(BASELINE_STATS["spo2_normal"] - spo2),
        "temp_deviation": float(temp - BASELINE_STATS["temp_normal"]),
        "rr_deviation": float(rr - BASELINE_STATS["rr_normal"]),
        "abnormal_flags": float(
            (1 if hr < 60 else 0)
            + (1 if hr > 100 else 0)
            + (1 if spo2 < 94 else 0)
            + (1 if temp > 37.5 else 0)
            + (1 if temp < 36.0 else 0)
            + (1 if rr > 20 else 0)
            + (1 if rr < 12 else 0)
        ),
    }
    return feature_dict


def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    featured = df.copy()
    feature_frame = featured.apply(
        lambda row: pd.Series(
            build_feature_dict(
                {
                    "heart_rate": row["heart_rate"],
                    "respiratory_rate": row["respiratory_rate"],
                    "body_temperature": row["body_temperature"],
                    "spo2": row["spo2"],
                    "gsr": row.get("gsr"),
                    "timestamp": row.get("timestamp"),
                }
            )
        ),
        axis=1,
    )
    for col in FEATURE_COLUMNS:
        featured[col] = feature_frame[col]
    return featured


def create_rule_based_labels(df: pd.DataFrame) -> pd.DataFrame:
    labeled = df.copy()
    labels: List[int] = []

    for _, row in labeled.iterrows():
        hr = float(row["heart_rate"])
        spo2 = float(row["spo2"])
        temp = float(row["body_temperature"])
        rr = float(row["respiratory_rate"])
        source_risk = str(row.get("risk_category", "")).strip()

        score = 0
        severe_signals = 0

        if hr >= 95 or hr <= 63:
            score += 2
            severe_signals += 1
        elif hr >= 88 or hr <= 66:
            score += 1

        if spo2 <= 95.8:
            score += 2
            severe_signals += 1
        elif spo2 <= 96.5:
            score += 1

        if temp >= 37.3 or temp <= 36.2:
            score += 2
            severe_signals += 1
        elif temp >= 37.1 or temp <= 36.4:
            score += 1

        if rr >= 19 or rr <= 12:
            score += 2
            severe_signals += 1
        elif rr >= 18 or rr <= 13:
            score += 1

        if source_risk == SOURCE_RISK_HIGH:
            score += 1

        if score >= 6 or (source_risk == SOURCE_RISK_HIGH and score >= 5) or severe_signals >= 3:
            labels.append(2)
        elif score >= 3 or (source_risk == SOURCE_RISK_HIGH and score >= 2):
            labels.append(1)
        else:
            labels.append(0)

    labeled["label"] = labels
    return labeled


def feature_matrix_from_frame(df: pd.DataFrame) -> np.ndarray:
    return df[FEATURE_COLUMNS].astype(float).to_numpy()


def feature_vector_from_reading(reading: VitalReading | Dict[str, Any]) -> np.ndarray:
    feature_dict = build_feature_dict(reading)
    return np.array([feature_dict[col] for col in FEATURE_COLUMNS], dtype=float)
