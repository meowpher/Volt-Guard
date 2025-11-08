# VoltGaurd

Smart electrical monitoring web application.

## Tech Stack
- Frontend: React + Vite, HTML, CSS (dark, glassmorphism-inspired, responsive)
- Backend: Flask running as Vercel Python serverless functions
- AI/ML: IsolationForest for anomaly detection
- Deploy: Vercel (static frontend + serverless API)

## Local Development

### Prereqs
- Node 18+
- Python 3.11+

### Frontend
```sh
npm --prefix frontend ci
npm --prefix frontend run dev
```
This starts Vite on http://localhost:5173 with a dev proxy to the backend at /api.

### Backend (Flask)
```sh
python -m venv .venv
. .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r api/requirements.txt
python api/index.py
```
Serves on http://localhost:5000 with endpoints under /api.

### Endpoints
- POST /api/safety-check
- GET  /api/generate-report
- GET  /api/view-alerts
- POST /api/emergency-shutdown

## Deploy on Vercel
- Set up a Vercel project pointing to this repository.
- Vercel will run the build command to produce `frontend/dist` and expose Python functions under `/api`.
- Configure environment variables in Vercel dashboard (Project Settings → Environment Variables).

## Security & UX
- Basic input validation on API payloads.
- Frontend shows clear error notifications on API failures.
- Reusable React components and modular structure.

## Notes
- The AI/ML module uses synthetic data for local testing; integrate real IoT sources in `api/model.py:get_sensor_data`.
- For real-time, the UI polls `/api/view-alerts` periodically; swap to push/SSE when infrastructure allows.
