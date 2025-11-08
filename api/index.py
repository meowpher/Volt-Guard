import time
import io
import csv
import numpy as np
from flask import Flask, request, jsonify, Response
from flask_cors import CORS
from model import AnomalyDetector, get_sensor_data
from db import init_db, get_session, User, Sensor, Reading, Anomaly
from auth import require_auth, create_token, hash_password, verify_password

app = Flask(__name__)
CORS(app)
init_db()

# Single, reusable model instance for warm serverless invocations
_detector = AnomalyDetector()

@app.post('/api/safety-check')
@require_auth
def safety_check():
    try:
        data = get_sensor_data()
        result = _detector.diagnose(data)
        # persist anomalies with user association
        user_id = request.user["id"]
        with get_session() as s:
            for a in result.get("anomalies", []):
                s.add(Anomaly(user_id=user_id, sensor_id=None, timestamp=a["timestamp"], score=a["score"], explanation=a["explanation"]))
            s.commit()
        return jsonify({"ok": True, "result": result})
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 500

@app.get('/api/generate-report')
@require_auth
def generate_report():
    try:
        data = get_sensor_data()
        report = _detector.generate_report(data)
        return jsonify(report)
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 500

@app.get('/api/sample-series')
@require_auth
def sample_series():
    try:
        data = get_sensor_data()
        return jsonify({"data": data})
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 500

@app.get('/api/view-alerts')
@require_auth
def view_alerts():
    try:
        alerts = _detector.get_recent_alerts()
        return jsonify({"alerts": alerts})
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 500

@app.post('/api/emergency-shutdown')
@require_auth
def emergency_shutdown():
    try:
        payload = request.get_json(silent=True) or {}
        reason = str(payload.get('reason', 'manual'))[:128]
        # TODO: integrate with real shutdown control plane
        return jsonify({"ok": True, "message": "Shutdown sequence initiated", "reason": reason})
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 500

# Auth & user management
@app.post('/api/auth/signup')
def signup():
    try:
        body = request.get_json() or {}
        email = (body.get('email') or '').strip().lower()
        password = body.get('password') or ''
        if not email or not password:
            return jsonify({"ok": False, "error": "missing_credentials"}), 400
        with get_session() as s:
            if s.query(User).filter_by(email=email).first():
                return jsonify({"ok": False, "error": "email_taken"}), 400
            u = User(email=email, password_hash=hash_password(password))
            s.add(u); s.commit(); s.refresh(u)
            token = create_token(u.id, u.email)
            return jsonify({"ok": True, "token": token})
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 500

@app.post('/api/auth/login')
def login():
    try:
        body = request.get_json() or {}
        email = (body.get('email') or '').strip().lower()
        password = body.get('password') or ''
        with get_session() as s:
            u = s.query(User).filter_by(email=email).first()
            if not u or not verify_password(password, u.password_hash):
                return jsonify({"ok": False, "error": "invalid_login"}), 401
            token = create_token(u.id, u.email)
            return jsonify({"ok": True, "token": token})
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 500

@app.get('/api/me')
@require_auth
def me():
    return jsonify({"ok": True, "user": request.user})

# Sensors & readings
@app.post('/api/sensors')
@require_auth
def create_sensor():
    body = request.get_json() or {}
    name = (body.get('name') or '').strip()
    room = (body.get('room') or '').strip()
    typ = (body.get('type') or 'meter').strip()
    if not name or not room:
        return jsonify({"ok": False, "error": "missing_fields"}), 400
    with get_session() as s:
        sensor = Sensor(user_id=request.user['id'], name=name, room=room, type=typ)
        s.add(sensor); s.commit(); s.refresh(sensor)
        return jsonify({"ok": True, "sensor": {"id": sensor.id, "name": sensor.name, "room": sensor.room, "type": sensor.type}})

@app.get('/api/sensors')
@require_auth
def list_sensors():
    with get_session() as s:
        sensors = s.query(Sensor).filter_by(user_id=request.user['id']).all()
        return jsonify({"ok": True, "sensors": [{"id": x.id, "name": x.name, "room": x.room, "type": x.type} for x in sensors]})

@app.post('/api/readings')
@require_auth
def add_readings():
    body = request.get_json() or {}
    sensor_id = int(body.get('sensor_id') or 0)
    rows = body.get('data') or []
    if not sensor_id or not isinstance(rows, list) or not rows:
        return jsonify({"ok": False, "error": "missing_data"}), 400
    ts_list = body.get('timestamps') or []
    ts_buffer = []
    anomalies = []
    with get_session() as s:
        # validate sensor ownership
        sensor = s.query(Sensor).filter_by(id=sensor_id, user_id=request.user['id']).first()
        if not sensor:
            return jsonify({"ok": False, "error": "sensor_not_found"}), 404
        for i, vec in enumerate(rows):
            v1, v2, v3 = map(float, vec[:3])
            ts = float(ts_list[i]) if i < len(ts_list) else time.time()
            ts_buffer.append(ts)
            s.add(Reading(user_id=request.user['id'], sensor_id=sensor_id, timestamp=ts, v1=v1, v2=v2, v3=v3))
        s.commit()
        # diagnose batch (model-based)
        result = _detector.diagnose(rows)
        for a in result.get('anomalies', []):
            rec = Anomaly(user_id=request.user['id'], sensor_id=sensor_id, timestamp=a.get('timestamp', time.time()), score=a['score'], explanation=a['explanation'])
            s.add(rec)
            anomalies.append({"timestamp": rec.timestamp, "score": rec.score, "explanation": rec.explanation})
        # type-aware rule-based anomalies
        type_mu_sigma = {
            'meter': (120.0, 15.0, 3.0),  # (mu, sigma, z-threshold)
            'phase': (100.0, 10.0, 2.5),
            'plug':  (20.0,  8.0, 2.0),
        }
        mu, sigma, zthr = type_mu_sigma.get((sensor.type or 'meter').lower(), (100.0, 10.0, 3.0))
        for i, vec in enumerate(rows):
            v1, v2, v3 = map(float, vec[:3])
            zs = [abs((v - mu) / max(1e-6, sigma)) for v in (v1, v2, v3)]
            spike = max(v1, v2, v3) > mu * 1.6
            dip = min(v1, v2, v3) < mu * 0.6
            if spike or dip or any(z > zthr for z in zs):
                rec = Anomaly(
                    user_id=request.user['id'], sensor_id=sensor_id, timestamp=ts_buffer[i],
                    score=float(max(zs)), explanation=f"Type-aware rule: {sensor.type} z={max(zs):.2f}"
                )
                s.add(rec)
                anomalies.append({"timestamp": rec.timestamp, "score": rec.score, "explanation": rec.explanation})
        s.commit()
    return jsonify({"ok": True, "inserted": len(rows), "anomalies": anomalies})

@app.get('/api/readings')
@require_auth
def list_readings():
    sensor_id = request.args.get('sensor_id', type=int)
    limit = request.args.get('limit', type=int, default=500)
    with get_session() as s:
        q = s.query(Reading).filter_by(user_id=request.user['id'])
        if sensor_id:
            q = q.filter_by(sensor_id=sensor_id)
        rows = q.order_by(Reading.timestamp.desc()).limit(limit).all()
        out = [[r.v1, r.v2, r.v3, r.timestamp, r.sensor_id] for r in rows][::-1]
        return jsonify({"ok": True, "data": out})

@app.get('/api/anomalies')
@require_auth
def list_anomalies():
    limit = request.args.get('limit', type=int, default=100)
    with get_session() as s:
        rows = (
            s.query(Anomaly, Sensor)
            .outerjoin(Sensor, Anomaly.sensor_id == Sensor.id)
            .filter(Anomaly.user_id == request.user['id'])
            .order_by(Anomaly.timestamp.desc())
            .limit(limit)
            .all()
        )
        out = []
        for a, sn in rows:
            sensor_type = (sn.type if sn else None) or 'unknown'
            room = (sn.room if sn else None) or '-'
            name = (sn.name if sn else None) or f"Sensor {a.sensor_id or ''}".strip()
            # quick advice
            advice = ""
            if sensor_type == 'meter':
                advice = "Check concurrent high-load appliances; consider staggering usage; inspect for shorts or overcurrent."
            elif sensor_type == 'phase':
                advice = "Investigate phase imbalance or wiring; redistribute loads across phases; check breaker health."
            elif sensor_type == 'plug':
                advice = "Unplug suspect device, inspect adapter/cable, avoid overloading multi-plugs."
            else:
                advice = "Verify wiring and recent load changes." 
            out.append({
                "timestamp": a.timestamp,
                "score": a.score,
                "explanation": a.explanation,
                "sensor_id": a.sensor_id,
                "sensor_name": name,
                "sensor_type": sensor_type,
                "room": room,
                "advice": advice,
            })
        return jsonify({"ok": True, "anomalies": out})

@app.get('/api/rooms-summary')
@require_auth
def rooms_summary():
    # Aggregate recent readings by room
    limit = request.args.get('limit', type=int, default=1000)
    user_id = request.user['id']
    with get_session() as s:
        # Sensor counts per room
        sensors = s.query(Sensor).filter_by(user_id=user_id).all()
        room_sensors = {}
        for sn in sensors:
            room_sensors.setdefault(sn.room, set()).add(sn.id)
        # Recent readings joined with sensors
        q = (
            s.query(Reading, Sensor.room)
            .join(Sensor, Reading.sensor_id == Sensor.id)
            .filter(Reading.user_id == user_id)
            .order_by(Reading.timestamp.desc())
            .limit(limit)
        )
        rooms = {}
        for r, room in q:
            entry = rooms.setdefault(room, {"reading_count": 0, "total": 0.0, "last": [0.0,0.0,0.0], "last_ts": 0})
            entry["reading_count"] += 1
            entry["total"] += float(r.v1 + r.v2 + r.v3)
            if r.timestamp > entry["last_ts"]:
                entry["last_ts"] = r.timestamp
                entry["last"] = [float(r.v1), float(r.v2), float(r.v3)]
        out = []
        for room, data in rooms.items():
            out.append({
                "room": room,
                "sensors": len(room_sensors.get(room, [])),
                "reading_count": data["reading_count"],
                "total": data["total"],
                "last": data["last"],
                "last_ts": data["last_ts"],
            })
        # Include rooms with sensors but no readings yet
        for room in room_sensors.keys():
            if not any(x["room"] == room for x in out):
                out.append({"room": room, "sensors": len(room_sensors[room]), "reading_count": 0, "total": 0.0, "last": [0,0,0], "last_ts": 0})
        # sort by sensors then room name
        out.sort(key=lambda x: (-x["sensors"], x["room"]))
        return jsonify({"ok": True, "rooms": out})

@app.post('/api/train')
@require_auth
def train_model():
    # Train model on user's historical readings
    with get_session() as s:
        rows = s.query(Reading).filter_by(user_id=request.user['id']).all()
        data = [[r.v1, r.v2, r.v3] for r in rows]
        if not data:
            return jsonify({"ok": False, "error": "no_data"}), 400
        _detector.fit_with_user_data(data)
        return jsonify({"ok": True, "trained_on": len(data)})

@app.post('/api/seed-demo')
def seed_demo():
    # Create a demo user, sensors, and 10k samples
    try:
        import numpy as np, random, time as _t
        email = 'demo@voltgaurd.local'
        with get_session() as s:
            u = s.query(User).filter_by(email=email).first()
            if not u:
                u = User(email=email, password_hash=hash_password('demo1234'))
                s.add(u); s.commit(); s.refresh(u)
            rooms = ['Kitchen','Living Room','Bedroom','Garage']
            sensors = []
            for name in ['Main Meter','HVAC','Washer']:
                room = random.choice(rooms)
                existing = s.query(Sensor).filter_by(user_id=u.id, name=name).first()
                if existing:
                    sensors.append(existing)
                else:
                    sn = Sensor(user_id=u.id, name=name, room=room, type='meter')
                    s.add(sn); s.commit(); s.refresh(sn); sensors.append(sn)
            # Seed ~10k samples across sensors
            rng = np.random.default_rng(123)
            total = 10000
            for sn in sensors:
                for _ in range(total // len(sensors)):
                    base = rng.normal(loc=100.0, scale=10.0, size=(1,3))[0]
                    if rng.random() < 0.02:
                        base *= 1.8
                    s.add(Reading(user_id=u.id, sensor_id=sn.id, timestamp=_t.time(), v1=float(base[0]), v2=float(base[1]), v3=float(base[2])))
            s.commit()
            return jsonify({"ok": True, "demo_user": email})
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 500

@app.get('/api/dataset.csv')
def dataset_csv():
    # Generate a CSV dataset with anomalies for offline testing
    try:
        n = int(request.args.get('n', 10000))
        rate = float(request.args.get('anomaly_rate', 0.02))
        profile = (request.args.get('profile') or 'baseline').lower()  # baseline|meter|phase|plug
        rng = np.random.default_rng(42)
        if profile == 'meter':
            mu, sd = 120.0, 15.0
            X = rng.normal(loc=mu, scale=sd, size=(n, 3))
            labels = np.zeros(n, dtype=int)
            k = max(1, int(n * rate))
            idx = rng.choice(n, size=k, replace=False)
            X[idx] *= 1.7
            labels[idx] = 1
        elif profile == 'phase':
            mu, sd = 100.0, 10.0
            X = rng.normal(loc=mu, scale=sd, size=(n, 3))
            # emphasize single-phase spikes/dips
            labels = np.zeros(n, dtype=int)
            for i in rng.integers(0, n, size=max(1,int(n*rate))):
                phase = rng.integers(0,3)
                mult = 1.9 if rng.random() < 0.5 else 0.6
                X[i, phase] *= mult
                labels[i] = 1
        elif profile == 'plug':
            mu, sd = 20.0, 8.0
            X = rng.normal(loc=mu, scale=sd, size=(n, 3))
            labels = np.zeros(n, dtype=int)
            for i in rng.integers(0, n, size=max(1,int(n*rate))):
                X[i, :] *= 2.5 if rng.random() < 0.5 else 0.5
                labels[i] = 1
        else:  # baseline
            X = rng.normal(loc=100.0, scale=10.0, size=(n, 3))
            labels = np.zeros(n, dtype=int)
            k = max(1, int(n * rate))
            idx = rng.choice(n, size=k, replace=False)
            X[idx] *= 1.8
            labels[idx] = 1
        buf = io.StringIO()
        w = csv.writer(buf)
        w.writerow(['timestamp','v1','v2','v3','label','profile'])
        ts0 = time.time()
        for i in range(n):
            w.writerow([ts0 + i, float(X[i,0]), float(X[i,1]), float(X[i,2]), int(labels[i]), profile])
        out = buf.getvalue()
        return Response(out, mimetype='text/csv', headers={
            'Content-Disposition': f'attachment; filename="voltgaurd_{profile}_{n}.csv"'
        })
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 500

# Vercel uses module-level app reference
if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5000, debug=True)
