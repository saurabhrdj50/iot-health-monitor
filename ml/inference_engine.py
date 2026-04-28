from __future__ import annotations

import json
import logging
import os
from dataclasses import asdict, dataclass
from datetime import datetime
from typing import Any, Dict

import joblib
import numpy as np

from ml.preprocessing import (
    BASELINE_STATS,
    FEATURE_COLUMNS,
    LABEL_MAPPING,
    VitalReading,
    build_feature_dict,
    feature_vector_from_reading,
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)


@dataclass
class PredictionResult:
    prediction: str
    confidence_score: float
    anomaly_flag: bool
    probability: Dict[str, float]
    input_features: Dict[str, float]
    metadata: Dict[str, Any]


class InferenceEngine:
    MODEL_PATH = "models/health_model.pkl"
    SCALER_PATH = "models/scaler.pkl"
    CONFIG_PATH = "models/model_config.json"

    def __init__(self) -> None:
        self.model = None
        self.scaler = None
        self.config: Dict[str, Any] = {}
        self.feature_columns = FEATURE_COLUMNS
        self.label_mapping = LABEL_MAPPING
        self.baseline_stats = dict(BASELINE_STATS)
        self.model_classes = sorted(LABEL_MAPPING)
        self._load_artifacts()

    def _load_artifacts(self) -> None:
        logger.info("Loading inference artifacts")

        if os.path.exists(self.CONFIG_PATH):
            with open(self.CONFIG_PATH, "r", encoding="utf-8") as file_obj:
                self.config = json.load(file_obj)
            self.feature_columns = self.config.get("feature_columns", FEATURE_COLUMNS)
            self.baseline_stats.update(self.config.get("baseline_stats", {}))
            self.model_classes = self.config.get("model_classes", sorted(LABEL_MAPPING))
            logger.info("Loaded config from %s", self.CONFIG_PATH)
        else:
            logger.warning("Config not found at %s", self.CONFIG_PATH)

        if os.path.exists(self.MODEL_PATH):
            self.model = joblib.load(self.MODEL_PATH)
            logger.info("Loaded model from %s", self.MODEL_PATH)
        else:
            logger.warning("Model not found at %s. Falling back to rules.", self.MODEL_PATH)

        if os.path.exists(self.SCALER_PATH):
            self.scaler = joblib.load(self.SCALER_PATH)
            logger.info("Loaded scaler from %s", self.SCALER_PATH)
        else:
            logger.warning("Scaler not found at %s. Input will not be scaled.", self.SCALER_PATH)

    def _validate_input(self, vitals: VitalReading) -> None:
        if not 30 <= vitals.heart_rate <= 250:
            raise ValueError(f"heart_rate out of range: {vitals.heart_rate}")
        if not 5 <= vitals.respiratory_rate <= 40:
            raise ValueError(f"respiratory_rate out of range: {vitals.respiratory_rate}")
        if vitals.body_temperature is not None and not 25 <= vitals.body_temperature <= 45:
            raise ValueError(f"body_temperature out of range: {vitals.body_temperature}")
        if not 70 <= vitals.spo2 <= 100:
            raise ValueError(f"spo2 out of range: {vitals.spo2}")

    def _check_anomaly(self, features: Dict[str, float]) -> bool:
        return (
            abs(features["hr_deviation"]) > 2.5
            or features["spo2"] < 90
            or features["heart_rate"] > 120
            or features["heart_rate"] < 45
        )

    def _is_risk_condition(self, features: Dict[str, float]) -> bool:
        return (
            features["spo2"] < 92
            or features["heart_rate"] > 110
            or features["body_temperature"] > 38.5
            or (features["body_temperature"] > 37.5 and features["heart_rate"] > 90)
            or features["abnormal_flags"] >= 3
        )

    def _fallback_prediction(self, features: Dict[str, float]) -> np.ndarray:
        if features["abnormal_flags"] >= 3 or features["health_index"] < 40:
            return np.array([0.08, 0.22, 0.70], dtype=float)
        if features["abnormal_flags"] >= 2 or features["stress_indicator"] > 3:
            return np.array([0.18, 0.55, 0.27], dtype=float)
        if features["abnormal_flags"] >= 1 or features["stress_indicator"] > 1.5:
            return np.array([0.28, 0.54, 0.18], dtype=float)
        return np.array([0.76, 0.18, 0.06], dtype=float)

    def predict(self, vitals: VitalReading) -> PredictionResult:
        self._validate_input(vitals)
        feature_dict = build_feature_dict(vitals)
        feature_vector = feature_vector_from_reading(vitals).reshape(1, -1)

        if self.model is not None:
            model_input = self.scaler.transform(feature_vector) if self.scaler is not None else feature_vector
            predicted_index = int(self.model.predict(model_input)[0])
            probabilities_raw = self.model.predict_proba(model_input)[0]
            confidence = float(np.max(probabilities_raw))
            probability = {label: 0.0 for label in self.label_mapping.values()}
            for class_index, class_label in enumerate(self.model_classes):
                probability[self.label_mapping[int(class_label)]] = float(probabilities_raw[class_index])
        else:
            probabilities_raw = self._fallback_prediction(feature_dict)
            predicted_index = int(np.argmax(probabilities_raw))
            confidence = float(probabilities_raw[predicted_index])
            probability = {
                self.label_mapping[idx]: float(probabilities_raw[idx])
                for idx in range(len(self.label_mapping))
            }

        prediction = self.label_mapping.get(predicted_index, "Normal")
        anomaly_flag = self._check_anomaly(feature_dict)
        if self._is_risk_condition(feature_dict):
            prediction = "Risk"
            probability = {"Normal": 0.08, "Stress": 0.22, "Risk": 0.70}
            confidence = probability["Risk"]
        elif anomaly_flag and prediction == "Normal":
            prediction = "Stress"
            probability = {"Normal": 0.32, "Stress": 0.50, "Risk": 0.18}
            confidence = probability["Stress"]

        metadata = {
            "timestamp": vitals.timestamp or datetime.now().isoformat(),
            "model_loaded": self.model is not None,
            "scaler_loaded": self.scaler is not None,
            "fallback_mode": self.model is None,
            "temperature_inferred": vitals.body_temperature is None,
        }

        return PredictionResult(
            prediction=prediction,
            confidence_score=confidence,
            anomaly_flag=anomaly_flag,
            probability=probability,
            input_features=feature_dict,
            metadata=metadata,
        )

    def predict_from_dict(self, data: Dict[str, Any]) -> Dict[str, Any]:
        vitals = VitalReading(
            heart_rate=float(data["heart_rate"]),
            respiratory_rate=float(data["respiratory_rate"]),
            body_temperature=None if data.get("body_temperature") is None else float(data["body_temperature"]),
            spo2=float(data["spo2"]),
            gsr=None if data.get("gsr") is None else float(data["gsr"]),
            timestamp=data.get("timestamp"),
        )
        return asdict(self.predict(vitals))

    def predict_from_json(self, json_str: str) -> Dict[str, Any]:
        return self.predict_from_dict(json.loads(json_str))


def create_inference_engine() -> InferenceEngine:
    return InferenceEngine()


def predict(vitals: Dict[str, Any]) -> Dict[str, Any]:
    return create_inference_engine().predict_from_dict(vitals)


if __name__ == "__main__":
    sample = {
        "heart_rate": 84,
        "respiratory_rate": 18,
        "body_temperature": 37.1,
        "spo2": 96,
        "timestamp": datetime.now().isoformat(),
    }
    print(json.dumps(predict(sample), indent=2))
