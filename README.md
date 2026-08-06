# AI Traffic Engine

Automated content distribution system that drives organic traffic to owned web properties by crawling site pages, generating AI social copy and flyers, and publishing to Twitter/X, LinkedIn, and Reddit via official APIs.

Full architecture: see `AI_Traffic_Engine_Complete_Blueprint.pdf`.

## Stack

Python + FastAPI + PostgreSQL + Celery + Redis (backend) · React + TypeScript + Tailwind + shadcn/ui (frontend)

## Development

```bash
cp .env.example .env
make up
```

- Backend: http://localhost:8000 (`/health` for a liveness check)
- Frontend: http://localhost:5173

### Backend only (without Docker)

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements-dev.txt
uvicorn app.main:app --reload
```

### Frontend only (without Docker)

```bash
cd frontend
npm install
npm run dev
```
