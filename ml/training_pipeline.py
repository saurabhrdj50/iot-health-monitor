from __future__ import annotations

import json
import logging
import os
import warnings
from datetime import datetime

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix, f1_score
from sklearn.model_selection import StratifiedKFold, cross_val_score, train_test_split
from sklearn.preprocessing import StandardScaler

from ml.preprocessing import (
    BASELINE_STATS,
    FEATURE_COLUMNS,
    LABEL_MAPPING,
    LABEL_REVERSE,
    create_rule_based_labels,
    engineer_features,
    feature_matrix_from_frame,
    handle_missing_values,
    normalize_dataset_columns,
    sort_by_timestamp,
)

warnings.filterwarnings("ignore")

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

DATA_PATH = "data/human_vital_signs_dataset_2024.csv"
MODEL_PATH = "models/health_model.pkl"
SCALER_PATH = "models/scaler.pkl"
CONFIG_PATH = "models/model_config.json"


class HealthMLPipeline:
    def __init__(self) -> None:
        self.model: RandomForestClassifier | None = None
        self.scaler: StandardScaler | None = None
        self.feature_columns = FEATURE_COLUMNS
        self.label_mapping = LABEL_MAPPING
        self.label_reverse = LABEL_REVERSE

    def load_data(self, path: str | None = None) -> pd.DataFrame:
        dataset_path = path or DATA_PATH
        logger.info("Loading data from %s", dataset_path)
        df = pd.read_csv(dataset_path)
        df = normalize_dataset_columns(df)
        logger.info("Loaded %s records", len(df))
        return df

    def prepare_data(self, df: pd.DataFrame) -> tuple[np.ndarray, np.ndarray]:
        logger.info("Preparing data for training")
        prepared = handle_missing_values(df)
        prepared = sort_by_timestamp(prepared)
        prepared = engineer_features(prepared)
        prepared = create_rule_based_labels(prepared)

        x = feature_matrix_from_frame(prepared)
        y = prepared["label"].astype(int).to_numpy()
        logger.info("Prepared feature matrix with shape %s", x.shape)
        self.log_label_distribution(y, context="full dataset")
        return x, y

    def log_label_distribution(self, y: np.ndarray, context: str) -> None:
        total = len(y)
        counts = np.bincount(y, minlength=len(self.label_mapping))
        logger.info("Label distribution for %s:", context)
        for index, count in enumerate(counts):
            pct = (count / total) * 100 if total else 0.0
            logger.info("  %s: %s samples (%.2f%%)", self.label_mapping[index], int(count), pct)
            if pct < 5.0:
                logger.warning(
                    "Class %s is underrepresented at %.2f%% of %s. Consider threshold tuning or controlled augmentation.",
                    self.label_mapping[index],
                    pct,
                    context,
                )

    def train_model(self, x_train: np.ndarray, y_train: np.ndarray) -> RandomForestClassifier:
        logger.info("Training RandomForest classifier")
        self.model = RandomForestClassifier(
            n_estimators=200,
            max_depth=15,
            min_samples_split=5,
            min_samples_leaf=2,
            max_features="sqrt",
            class_weight="balanced",
            random_state=42,
            n_jobs=1,
        )
        self.model.fit(x_train, y_train)
        train_pred = self.model.predict(x_train)
        logger.info("Training accuracy: %.4f", accuracy_score(y_train, train_pred))
        return self.model

    def evaluate_model(self, x_test: np.ndarray, y_test: np.ndarray) -> dict[str, object]:
        if self.model is None:
            raise RuntimeError("Model must be trained before evaluation.")

        logger.info("Evaluating model")
        y_pred = self.model.predict(x_test)
        accuracy = accuracy_score(y_test, y_pred)
        weighted_f1 = f1_score(y_test, y_pred, average="weighted")
        macro_f1 = f1_score(y_test, y_pred, average="macro", zero_division=0)
        report = classification_report(
            y_test,
            y_pred,
            labels=sorted(self.label_mapping),
            target_names=[self.label_mapping[idx] for idx in sorted(self.label_mapping)],
            zero_division=0,
        )
        matrix = confusion_matrix(y_test, y_pred, labels=sorted(self.label_mapping))
        feature_importance = (
            pd.DataFrame(
                {
                    "feature": self.feature_columns,
                    "importance": self.model.feature_importances_,
                }
            )
            .sort_values("importance", ascending=False)
            .reset_index(drop=True)
        )

        logger.info("Test accuracy: %.4f", accuracy)
        logger.info("Weighted F1: %.4f", weighted_f1)
        logger.info("Macro F1: %.4f", macro_f1)
        logger.info("Confusion matrix:\n%s", matrix)
        logger.info("Classification report:\n%s", report)
        logger.info("Top features:\n%s", feature_importance.head(5))

        return {
            "accuracy": accuracy,
            "f1_score": weighted_f1,
            "macro_f1_score": macro_f1,
            "confusion_matrix": matrix,
            "classification_report": report,
            "feature_importance": feature_importance,
        }

    def cross_validate(self, x: np.ndarray, y: np.ndarray, cv: int = 5) -> np.ndarray:
        if self.model is None:
            raise RuntimeError("Model must be trained before cross-validation.")

        logger.info("Running %s-fold cross-validation", cv)
        scores = cross_val_score(
            self.model,
            x,
            y,
            cv=StratifiedKFold(n_splits=cv, shuffle=True, random_state=42),
            scoring="f1_weighted",
        )
        logger.info("Cross-validation F1 scores: %s", scores.tolist())
        logger.info("Cross-validation mean F1: %.4f", float(scores.mean()))
        return scores

    def save_artifacts(self) -> None:
        if self.model is None or self.scaler is None:
            raise RuntimeError("Model and scaler must exist before saving.")

        os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)
        joblib.dump(self.model, MODEL_PATH)
        joblib.dump(self.scaler, SCALER_PATH)

        config = {
            "feature_columns": self.feature_columns,
            "label_mapping": self.label_mapping,
            "label_reverse": self.label_reverse,
            "baseline_stats": BASELINE_STATS,
            "model_classes": self.model.classes_.tolist(),
            "trained_at": datetime.now().isoformat(),
        }
        with open(CONFIG_PATH, "w", encoding="utf-8") as file_obj:
            json.dump(config, file_obj, indent=2)

        logger.info("Saved model to %s", MODEL_PATH)
        logger.info("Saved scaler to %s", SCALER_PATH)
        logger.info("Saved config to %s", CONFIG_PATH)

    def run(self) -> RandomForestClassifier:
        logger.info("=" * 50)
        logger.info("Starting ML Training Pipeline")
        logger.info("=" * 50)

        df = self.load_data()
        x, y = self.prepare_data(df)

        x_train, x_test, y_train, y_test = train_test_split(
            x,
            y,
            test_size=0.2,
            random_state=42,
            stratify=y,
        )

        self.scaler = StandardScaler()
        x_train_scaled = self.scaler.fit_transform(x_train)
        x_test_scaled = self.scaler.transform(x_test)
        x_scaled = self.scaler.transform(x)

        self.log_label_distribution(y_train, context="train split")
        self.log_label_distribution(y_test, context="test split")

        self.train_model(x_train_scaled, y_train)
        self.evaluate_model(x_test_scaled, y_test)
        self.cross_validate(x_scaled, y)
        self.save_artifacts()

        logger.info("=" * 50)
        logger.info("ML Training Pipeline Complete")
        logger.info("=" * 50)
        return self.model


if __name__ == "__main__":
    pipeline = HealthMLPipeline()
    pipeline.run()
