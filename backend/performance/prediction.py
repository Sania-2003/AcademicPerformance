import csv
import os
from pathlib import Path
from collections import defaultdict
import numpy as np

# Reduce TensorFlow startup noise and disable oneDNN optimization warning.
os.environ.setdefault("TF_CPP_MIN_LOG_LEVEL", "2")
os.environ.setdefault("TF_ENABLE_ONEDNN_OPTS", "0")

import tensorflow as tf
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, classification_report
from sklearn.model_selection import train_test_split
from imblearn.over_sampling import SMOTE

ROOT_DIR = Path(__file__).resolve().parents[2]
DATA_DIR = ROOT_DIR / "data" / "processed"
MODEL_DIR = Path(__file__).resolve().parent / "trained_models"
MODEL_PATH = MODEL_DIR / "semester_performance_model.keras"

# Performance tier classes
PERFORMANCE_TIERS = ["Poor", "Average", "Good", "Excellent"]
TIER_TO_LABEL = {tier: idx for idx, tier in enumerate(PERFORMANCE_TIERS)}
LABEL_TO_TIER = {idx: tier for idx, tier in enumerate(PERFORMANCE_TIERS)}

FEATURE_COLUMNS = [
    "semester_index",
    "subject_count",
    "avg_total_marks",
    "max_total_marks",
    "min_total_marks",
    "avg_attendance_percent",
    "avg_grade_points",
    "sgpa",
    "total_credit_hours",
    "cgpa",
    "previous_sgpa",
    "sgpa_trend",
    "failed_subjects",
    "failed_subjects_delta",
    "high_grade_subjects",
    "chapter_marks_avg",
    "topic_marks_avg",
    "practical_marks_avg",
]
TARGET_COLUMN = "next_semester_performance_tier"

GRADE_THRESHOLDS = [
    (3.83, "A"),
    (3.495, "A-"),
    (3.165, "B+"),
    (2.83, "B"),
    (2.495, "B-"),
    (2.165, "C+"),
    (1.83, "C"),
    (1.48, "C-"),
    (1.15, "D+"),
    (0.75, "D"),
]


def _to_float(value):
    if value is None or value == "":
        return 0.0
    try:
        return float(value)
    except (TypeError, ValueError):
        return 0.0


def _grade_points_from_marks(total_marks):
    if total_marks >= 85:
        return 4.0
    if total_marks >= 80:
        return 3.66
    if total_marks >= 75:
        return 3.33
    if total_marks >= 71:
        return 3.0
    if total_marks >= 68:
        return 2.66
    if total_marks >= 64:
        return 2.33
    if total_marks >= 61:
        return 2.0
    if total_marks >= 58:
        return 1.66
    if total_marks >= 54:
        return 1.30
    if total_marks >= 50:
        return 1.0
    return 0.0


def grade_from_sgpa(sgpa):
    for threshold, grade in GRADE_THRESHOLDS:
        if sgpa >= threshold:
            return grade
    return "F"


def performance_tier_from_sgpa(sgpa):
    if sgpa >= 3.5:
        return "Excellent"
    if sgpa >= 3.0:
        return "Good"
    if sgpa >= 2.0:
        return "Average"
    return "Poor"


def _ensure_model_dir():
    MODEL_DIR.mkdir(parents=True, exist_ok=True)


def _load_training_data_from_csv():
    data_path = DATA_DIR / "dnn_semester_level.csv"
    if not data_path.exists():
        raise FileNotFoundError(f"Training data not found at {data_path}")

    X = []
    y = []
    with data_path.open(newline="", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            target_value = row.get(TARGET_COLUMN, "")
            if target_value == "" or target_value not in TIER_TO_LABEL:
                continue
            features = [_to_float(row.get(name)) for name in FEATURE_COLUMNS]
            X.append(features)
            y.append(TIER_TO_LABEL[target_value])

    if not X:
        raise ValueError("No training rows available for next semester prediction.")
    return np.array(X, dtype=np.float32), np.array(y, dtype=np.int32)


def _safe_mean(values):
    return sum(values) / len(values) if values else 0.0


def _estimate_record_total(record):
    if record.marks is not None:
        if record.chapter or record.topic:
            return float(record.marks) * 10.0
        return float(record.marks)

    total = float(record.quiz_marks or 0.0) + float(record.assignment_marks or 0.0) + float(record.mid_marks or 0.0)
    return round((total / 60.0) * 100.0, 2) if total else 0.0


def _load_training_data_from_database():
    from django.contrib.auth import get_user_model
    from .models import StudentPerformance

    User = get_user_model()
    records = (
        StudentPerformance.objects.filter(student__role=User.Roles.STUDENT)
        .select_related("student", "course")
        .order_by("student_id", "semester")
    )

    grouped = defaultdict(lambda: defaultdict(list))
    for record in records:
        if not record.semester:
            continue
        grouped[record.student_id][str(record.semester)].append(record)

    X = []
    y = []

    for semester_groups in grouped.values():
        try:
            semesters = sorted(semester_groups.keys(), key=lambda value: int(value))
        except ValueError:
            semesters = sorted(semester_groups.keys())

        semester_features = []
        previous_sgpa = 0.0
        previous_failed_subjects = 0
        cumulative_weighted_points = 0.0
        cumulative_credit_hours = 0

        for semester_index, semester in enumerate(semesters, start=1):
            semester_records = semester_groups[semester]
            overall_records = [record for record in semester_records if not record.chapter and not record.topic]
            source_records = overall_records or semester_records

            subject_marks = [_estimate_record_total(record) for record in source_records]
            attendance_values = [float(record.attendance or 0.0) for record in source_records]
            grade_points = [_grade_points_from_marks(value) for value in subject_marks]
            credit_hours = [
                int(record.credit_hours or (1 if record.subject and ("practical" in record.subject.lower() or "lab" in record.subject.lower()) else 3))
                for record in source_records
            ]

            if not subject_marks:
                continue

            total_credit_hours = sum(credit_hours)
            weighted_points = sum(point * hours for point, hours in zip(grade_points, credit_hours))
            sgpa = weighted_points / total_credit_hours if total_credit_hours else 0.0
            cumulative_weighted_points += weighted_points
            cumulative_credit_hours += total_credit_hours
            cgpa = cumulative_weighted_points / cumulative_credit_hours if cumulative_credit_hours else sgpa
            failed_subjects = sum(1 for value in grade_points if value == 0)

            chapter_marks = [_estimate_record_total(record) for record in semester_records if record.chapter]
            topic_marks = [_estimate_record_total(record) for record in semester_records if record.topic]
            practical_marks = [
                _estimate_record_total(record)
                for record in source_records
                if record.subject and ("practical" in record.subject.lower() or "lab" in record.subject.lower())
            ]

            feature_row = {
                "semester_index": semester_index,
                "subject_count": len(subject_marks),
                "avg_total_marks": _safe_mean(subject_marks),
                "max_total_marks": max(subject_marks),
                "min_total_marks": min(subject_marks),
                "avg_attendance_percent": _safe_mean(attendance_values),
                "avg_grade_points": _safe_mean(grade_points),
                "sgpa": sgpa,
                "total_credit_hours": total_credit_hours,
                "cgpa": cgpa,
                "previous_sgpa": previous_sgpa,
                "sgpa_trend": sgpa - previous_sgpa if semester_index > 1 else 0.0,
                "failed_subjects": failed_subjects,
                "failed_subjects_delta": failed_subjects - previous_failed_subjects if semester_index > 1 else 0,
                "high_grade_subjects": sum(1 for value in grade_points if value >= 3.33),
                "chapter_marks_avg": _safe_mean(chapter_marks),
                "topic_marks_avg": _safe_mean(topic_marks),
                "practical_marks_avg": _safe_mean(practical_marks),
                "_sgpa": sgpa,
            }
            semester_features.append(feature_row)
            previous_sgpa = sgpa
            previous_failed_subjects = failed_subjects

        for index, row in enumerate(semester_features[:-1]):
            next_sgpa = semester_features[index + 1]["_sgpa"]
            target_value = performance_tier_from_sgpa(next_sgpa)
            X.append([_to_float(row.get(name)) for name in FEATURE_COLUMNS])
            y.append(TIER_TO_LABEL[target_value])

    if not X:
        raise ValueError("No database training rows available for next semester prediction.")

    return np.array(X, dtype=np.float32), np.array(y, dtype=np.int32)


def load_training_data(source="database"):
    if source == "database":
        try:
            return _load_training_data_from_database()
        except Exception:
            return _load_training_data_from_csv()
    if source == "csv":
        return _load_training_data_from_csv()
    raise ValueError("Training source must be 'database' or 'csv'.")


def build_training_model(input_dim):
    model = tf.keras.Sequential([
        tf.keras.layers.Input(shape=(input_dim,)),
        tf.keras.layers.Dense(128, activation="relu", kernel_regularizer=tf.keras.regularizers.l2(0.001)),
        tf.keras.layers.BatchNormalization(),
        tf.keras.layers.Dropout(0.35),
        tf.keras.layers.Dense(64, activation="relu", kernel_regularizer=tf.keras.regularizers.l2(0.001)),
        tf.keras.layers.BatchNormalization(),
        tf.keras.layers.Dropout(0.3),
        tf.keras.layers.Dense(32, activation="relu", kernel_regularizer=tf.keras.regularizers.l2(0.001)),
        tf.keras.layers.Dropout(0.25),
        tf.keras.layers.Dense(len(PERFORMANCE_TIERS), activation="softmax"),
    ])

    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=1e-3),
        loss="sparse_categorical_crossentropy",
        metrics=[tf.keras.metrics.SparseCategoricalAccuracy(name="accuracy")],
    )
    return model


def train_and_save_model(source="database"):
    X, y = load_training_data(source=source)
    
    # Determine k_neighbors for SMOTE based on smallest class size
    unique, counts = np.unique(y, return_counts=True)
    min_class_size = counts.min()
    k_neighbors = min(3, max(1, min_class_size - 1))
    
    # Apply SMOTE for data augmentation to handle class imbalance
    smote = SMOTE(random_state=42, k_neighbors=k_neighbors)
    try:
        X_smote, y_smote = smote.fit_resample(X, y)
    except Exception:
        # Fallback if SMOTE fails
        X_smote, y_smote = X, y
    
    X_train, X_test, y_train, y_test = train_test_split(X_smote, y_smote, test_size=0.2, random_state=42)
    
    # Compute class weights
    unique_classes = np.unique(y_train)
    class_weights = {}
    for cls in unique_classes:
        n_cls = np.sum(y_train == cls)
        class_weights[cls] = len(y_train) / (len(unique_classes) * n_cls)
    
    model = build_training_model(X_train.shape[1])

    early_stopping = tf.keras.callbacks.EarlyStopping(
        monitor="val_loss",
        patience=25,
        restore_best_weights=True,
        min_delta=1e-4,
    )

    model.fit(
        X_train,
        y_train,
        validation_split=0.15,
        epochs=300,
        batch_size=16,
        class_weight=class_weights,
        callbacks=[early_stopping],
        verbose=0,
    )

    # Evaluate on test set
    y_pred_probs = model.predict(X_test, verbose=0)
    y_pred = np.argmax(y_pred_probs, axis=1)
    
    metrics = {
        "accuracy": float(accuracy_score(y_test, y_pred)),
        "precision": float(precision_score(y_test, y_pred, average="weighted", zero_division=0)),
        "recall": float(recall_score(y_test, y_pred, average="weighted", zero_division=0)),
        "f1": float(f1_score(y_test, y_pred, average="weighted", zero_division=0)),
    }

    _ensure_model_dir()
    model.save(MODEL_PATH)
    return MODEL_PATH, metrics


def load_model():
    if not MODEL_PATH.exists():
        raise FileNotFoundError(f"Model file not found. Run the training command first: python manage.py train_performance_model")
    return tf.keras.models.load_model(str(MODEL_PATH))


def predict_next_semester_performance(feature_vector):
    """Predict next semester performance tier."""
    model = load_model()
    pred_probs = model.predict(np.array(feature_vector, dtype=np.float32)[None, :], verbose=0)
    pred_label = np.argmax(pred_probs)
    pred_tier = LABEL_TO_TIER[pred_label]
    confidence = float(pred_probs[0, pred_label])
    return pred_tier, confidence


def predict_next_semester_sgpa(feature_vector):
    """Backward compatible wrapper for prediction."""
    tier, confidence = predict_next_semester_performance(feature_vector)
    # Map tier back to approximate SGPA for API compatibility
    tier_to_sgpa_approx = {
        "Poor": 1.5,
        "Average": 2.5,
        "Good": 3.2,
        "Excellent": 3.7,
    }
    return tier_to_sgpa_approx[tier]


def build_feature_vector(data):
    return [_to_float(data.get(name)) for name in FEATURE_COLUMNS]
