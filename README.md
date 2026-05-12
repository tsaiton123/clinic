# Clinic Management API

FastAPI backend for the clinic management MVP.

## Run Locally

Backend:

```bash
python -m venv .venv
.venv/bin/pip install -e ".[dev]"
.venv/bin/alembic upgrade head
.venv/bin/python -m app.seed
.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

The default database is local SQLite at `./clinic.db`. Set `DATABASE_URL` to use PostgreSQL:

```bash
DATABASE_URL=postgresql+psycopg://clinic:clinic@localhost:5432/clinic .venv/bin/alembic upgrade head
DATABASE_URL=postgresql+psycopg://clinic:clinic@localhost:5432/clinic .venv/bin/python -m app.seed
DATABASE_URL=postgresql+psycopg://clinic:clinic@localhost:5432/clinic .venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000
```

## Quick Deploy

This repo now includes a staging-first backend deployment setup for `Render` and `Railway`.

### Render

1. Push this repo to GitHub.
2. In Render, create a new Blueprint and point it at this repository.
3. Render will pick up [render.yaml](render.yaml) and create:
   - a web service `clinic-api`
   - a static site `clinic-frontend`
   - a PostgreSQL database `clinic-db`
4. After the first deploy:
   - set backend `ALLOWED_ORIGINS` to your frontend domain
   - set frontend `VITE_API_BASE_URL` to your backend domain
5. Optional seed step:

```bash
DATABASE_URL=<render-postgres-url> .venv/bin/python -m app.seed
```

The service starts via [start-backend.sh](start-backend.sh), which runs `alembic upgrade head` before `uvicorn`.

Frontend env example is in [frontend/.env.example](frontend/.env.example).

### Railway

1. Push this repo to GitHub.
2. Create a new Railway project from the repo.
3. Add a PostgreSQL service.
4. In the backend service variables, set:
   - `DATABASE_URL`
   - `SECRET_KEY`
   - `ACCESS_TOKEN_EXPIRE_MINUTES=1440`
   - `ALLOWED_ORIGINS=https://your-frontend-domain.up.railway.app`
   - `ALLOWED_ORIGIN_REGEX=`
5. Railway will use [railway.json](railway.json) and start the API with:

```bash
sh ./start-backend.sh
```

6. Optional seed step:

```bash
DATABASE_URL=<railway-postgres-url> .venv/bin/python -m app.seed
```

For both platforms, this setup is suitable for `staging / demo`. Before production, replace demo accounts, tighten CORS, rotate secrets, and add backup and monitoring.

### Seed Render Database

After the first deploy, open the Render shell for `clinic-api` and run:

```bash
python -m app.seed
```

The seed is idempotent for the demo users. If `admin@example.com` already exists, it exits without duplicating demo data.

### Smoke Test Deployed API

From your local machine:

```bash
.venv/bin/python scripts/smoke_test.py https://your-backend-domain.onrender.com
```

This verifies:

- `GET /health`
- admin login
- consultant login
- create client
- update stage
- create follow-up
- send notification
- admin analytics endpoints
- consultant dashboard, client list, notification inbox

### Frontend Local Env

For local frontend development:

```bash
cp frontend/.env.example frontend/.env
```

Then change `VITE_API_BASE_URL` if your backend is not running on `http://127.0.0.1:8000`.

## Docker

There is also a backend-only [Dockerfile](Dockerfile) for platforms that prefer container deploys.

Build locally:

```bash
docker build -t clinic-api .
```

Run locally:

```bash
docker run --rm -p 8000:8000 \
  -e DATABASE_URL=sqlite:///./clinic.db \
  -e SECRET_KEY=change-me-in-production \
  clinic-api
```

Use [deploy_checklist.md](deploy_checklist.md) before moving from staging to production.

## Database Migrations

Apply migrations:

```bash
.venv/bin/alembic upgrade head
```

Create a new migration after model changes:

```bash
.venv/bin/alembic revision --autogenerate -m "describe change"
```

## Demo Accounts

After running the seed script:

- Admin: `admin@example.com` / `password123`
- Consultant: `consultant@example.com` / `password123`

## MVP APIs

- `POST /auth/login`
- `GET /auth/me`
- `GET /clients`
- `POST /clients`
- `GET /clients/{id}`
- `PUT /clients/{id}`
- `DELETE /clients/{id}`
- `POST /clients/{id}/stage`
- `GET /clients/{id}/stage-logs`
- `POST /clients/{id}/follow-ups`
- `GET /clients/{id}/follow-ups`
- `GET /follow-ups/today`
- `GET /follow-ups/overdue`
- `POST /clients/{id}/barriers`
- `GET /clients/{id}/barriers`
- `PUT /barriers/{id}`
- `GET /analytics/barriers`
- `POST /notifications`
- `GET /notifications`
- `PUT /notifications/{id}/read`
- `GET /analytics/overview`
- `GET /analytics/funnel`
- `GET /analytics/consultants`
- `GET /analytics/revenue`
- `GET /dashboard/consultant`
