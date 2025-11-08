import time
from typing import List
import numpy as np
from sklearn.ensemble import IsolationForest

class AnomalyDetector:
    def __init__(self, baseline_samples: int = 10000, features: int = 3, random_state: int = 42):
        # Train a stronger baseline model on synthetic normal usage
        rng = np.random.default_rng(random_state)
        baseline = rng.normal(loc=100.0, scale=10.0, size=(baseline_samples, features))
        self.model = IsolationForest(n_estimators=200, contamination=0.02, random_state=random_state)
        self.model.fit(baseline)
        self._alerts = []

    def diagnose(self, data: List[List[float]]):
        X = np.array(data, dtype=float)
        scores = -self.model.score_samples(X)  # higher => more anomalous
        preds = self.model.predict(X)  # -1 => anomaly
        anomalies = []
        for i, (s, p) in enumerate(zip(scores, preds)):
            if p == -1:
                alert = {
                    "timestamp": time.time(),
                    "index": i,
                    "score": float(s),
                    "explanation": "IsolationForest indicates outlier compared to baseline.",
                }
                anomalies.append(alert)
                self._alerts.append(alert)
        return {
            "detected": len(anomalies),
            "anomalies": anomalies,
            "max_score": float(scores.max()),
            "mean_score": float(scores.mean()),
        }

    def generate_report(self, data: List[List[float]]):
        X = np.array(data, dtype=float)
        return {
            "consumption_kwh": float(X.sum()),
            "peak_value": float(X.max()),
            "avg_value": float(X.mean()),
            "samples": int(X.shape[0]),
        }

    def fit_with_user_data(self, rows: List[List[float]]):
        X = np.array(rows, dtype=float)
        # Retrain (IsolationForest lacks partial_fit)
        self.model.fit(X)
        return True

    def get_recent_alerts(self, limit: int = 10):
        return self._alerts[-limit:]

def get_sensor_data(n: int = 128, features: int = 3):
    # Placeholder for real IoT integration; generate synthetic series with occasional spikes
    rng = np.random.default_rng()
    base = rng.normal(loc=100.0, scale=10.0, size=(n, features))
    # inject a random spike
    idx = rng.integers(0, n)
    base[idx, :] *= 1.8
    return base.tolist()
