# Smart Mid-Day Meal Management System

Attendance, meal planning and inventory management for India's PM POSHAN (Mid-Day Meal)
scheme, with group face recognition for taking attendance.

Point a webcam at a group of students, and every recognised face is marked present in one
capture. The day's meal requirement is then calculated from who actually attended, using the
official PM POSHAN norms, and deducted from the school's stock.

---

## Contents

- [What it does](#what-it-does)
- [Quick start with Docker](#quick-start-with-docker)
- [Manual setup](#manual-setup)
- [Configuration](#configuration)
- [How the pieces fit together](#how-the-pieces-fit-together)
- [API overview](#api-overview)
- [Project layout](#project-layout)
- [Troubleshooting](#troubleshooting)

---

## What it does

**Two portals, one system.**

A *Government* administrator registers schools, appoints a school administrator for each,
allocates food and budget, and monitors the whole state. A *School* administrator manages
their own students, takes attendance, plans meals and tracks stock. Every endpoint is scoped
to the caller's role and school.

### Face recognition attendance

- **Multiple students per capture.** The camera detects every face in the frame, matches each
  one independently, and writes one attendance record per student. Faces that cannot be
  marked are reported individually with a reason (unrecognised, poor quality, already marked).
- Uses [InsightFace](https://github.com/deepinsight/insightface) `buffalo_l` — 512-dimension
  ArcFace embeddings, matched by cosine similarity.
- A match must also beat the runner-up by a margin, so two similar-looking children are
  refused rather than guessed between.
- One record per student per day, enforced by a database constraint, not just a check.

### Meal planning on the government norms

Requirements are calculated per student from their grade, not as a flat per-head figure:

| | Food grains | Pulses | Vegetables | Oil & fat | Calories | Protein |
|---|---|---|---|---|---|---|
| **Primary** (I–V) | 100 g | 20 g | 50 g | 5 g | 450 | 12 g |
| **Upper Primary** (VI–VIII) | 150 g | 30 g | 75 g | 7.5 g | 700 | 20 g |

Classes IX–X are outside the scheme; they are budgeted at the Upper Primary rate and reported
separately rather than being folded in silently.

The plan is costed from the school's own per-unit inventory prices, flags any ingredient it
has no price for, and compares the requirement against stock before letting you deduct it.

### Also included

- Inventory with reorder thresholds, stock valuation and low-stock alerts
- Food allocation workflow (government allocates → approve → lands in the school's stock)
- Budget allocation and utilisation tracking per financial year
- Daily / weekly / monthly reports with CSV export
- Photo storage on local disk, or S3 when configured

---

## Quick start with Docker

**Requirements:** Docker Engine 20.10+ with the Compose plugin (any recent Docker Desktop),
and a PostgreSQL database.

```bash
git clone https://github.com/disha2005-cs/smart-mdm-.git
cd smart-mdm-

cp .env.example .env
```

Set two values in `.env`:

```env
# Your Postgres connection string (Neon, RDS, Supabase, a local server, ...)
DATABASE_URL=postgresql://user:password@your-host.neon.tech/neondb?sslmode=require

# Generate with: python -c "import secrets; print(secrets.token_urlsafe(48))"
JWT_SECRET_KEY=
```

Then:

```bash
docker compose up --build
```

That one command builds and starts the API and the web UI, waits for the database, creates
any missing tables, and adds the first administrator if the database has none.

Open **<http://localhost:8080>**.

### No database of your own?

A PostgreSQL container is bundled. Use this `DATABASE_URL` instead:

```env
DATABASE_URL=postgresql://mdm:mdm_local_password@db:5432/mdm
```

and start it alongside the app:

```bash
docker compose --profile localdb up --build
```

### Signing in

If your database already has a government administrator, use those credentials.

On a fresh database one is created for you, from `.env`:

| | |
|---|---|
| Employee ID | `GOV-001` |
| Password | `admin123` |

Change it from **Settings** straight away, or set `SEED_ADMIN_PASSWORD` before the first run.
The seed step never overwrites an existing administrator.

### First run takes a while

The backend image bakes in the ~300 MB face-recognition model so the first attendance capture
is not a multi-minute stall. Expect the initial build to take several minutes; later starts
are fast.

```bash
docker compose ps                 # both services should report healthy
docker compose logs -f backend    # follow startup
```

### Everyday commands

```bash
docker compose up -d                            # start in the background
docker compose down                             # stop
docker compose down -v                          # stop and wipe volumes (uploads, model cache)
docker compose logs -f backend                  # follow the API logs
docker compose exec backend python seed.py      # re-run the admin bootstrap
docker compose build --no-cache backend         # force a clean rebuild
```

`docker compose down -v` removes the uploads and model volumes. It does **not** touch a
managed database — only the bundled `localdb` one.

### What runs where

| Service | Port | Purpose |
|---|---|---|
| `frontend` | <http://localhost:8080> | React UI, served by nginx |
| `backend` | <http://localhost:8000/docs> | FastAPI + interactive API docs |
| `db` | <http://localhost:5432> | PostgreSQL 16, only with `--profile localdb` |

The browser only ever talks to port 8080: nginx reverse-proxies `/api` and `/uploads` through
to the backend. That means same-origin requests and no CORS configuration to get wrong. Port
8000 is published purely so you can reach `/docs` and call the API directly.

---

## Manual setup

For working on the code without Docker.

**Requirements:** Python 3.12+, Node.js 20+, PostgreSQL 14+.

### Backend

```bash
cd backend

python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env              # then fill in DATABASE_URL and JWT_SECRET_KEY

python seed.py                    # creates the first admin (schema is created on boot)
uvicorn main:app --reload --port 8000
```

API docs: <http://localhost:8000/docs>

The first attendance request downloads the InsightFace model (~300 MB) into
`~/.insightface`. It is a one-time cost.

### Frontend

```bash
cd frontend-new

npm install
cp .env.example .env              # defaults to http://localhost:8000/api/v1
npm run dev
```

UI: <http://localhost:5173>

### Useful scripts

```bash
npm run build      # type-check and build for production
npm run lint       # oxlint
npm run preview    # serve the production build locally
```

---

## Configuration

`DATABASE_URL` and `JWT_SECRET_KEY` are required; everything else has a usable default.

### Root `.env` — used by Docker Compose

| Variable | Default | Notes |
|---|---|---|
| `DATABASE_URL` | — | **Required.** Any PostgreSQL connection string |
| `JWT_SECRET_KEY` | — | **Required.** Minimum 32 characters; the app refuses to start otherwise |
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` / `POSTGRES_PORT` | `mdm` / `mdm_local_password` / `mdm` / `5432` | Bundled Postgres only (`--profile localdb`) |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `1440` | Login session length |
| `SEED_ADMIN_EMPLOYEE_ID` | `GOV-001` | First administrator, created only when none exists |
| `SEED_ADMIN_EMAIL` | `admin@pmposhan.gov.in` | |
| `SEED_ADMIN_PASSWORD` | `admin123` | **Change before deploying anywhere public** |
| `FRONTEND_PORT` / `BACKEND_PORT` | `8080` / `8000` | Host ports |
| `AWS_*` | empty | Optional S3 photo storage; falls back to local disk |
| `BACKEND_CORS_ORIGINS` | empty | Only needed for a browser app on a different origin |

### `backend/.env` — used for manual setup

Same variables, minus the Compose-only ones. See `backend/.env.example`.

### `frontend-new/.env`

| Variable | Default | Notes |
|---|---|---|
| `VITE_API_URL` | `http://localhost:8000/api/v1` | The Docker image builds with `/api/v1` so the UI is same-origin |

---

## How the pieces fit together

```
                 ┌──────────────────────────────────────────┐
  Browser  ────▶  │  nginx  :80                              │
   :8080          │    /            → React SPA (static)     │
                  │    /api/*       → proxy ─┐               │
                  │    /uploads/*   → proxy ─┤               │
                  └──────────────────────────┼───────────────┘
                                             ▼
                              ┌────────────────────────────┐
                              │  FastAPI  :8000            │
                              │    JWT auth, role scoping  │
                              │    InsightFace buffalo_l   │
                              │    PM POSHAN calculator    │
                              └──────────┬─────────────────┘
                                         ▼
                              ┌────────────────────────────┐
                              │  PostgreSQL 16             │
                              └────────────────────────────┘
```

**Attendance flow.** The browser grabs a frame from the webcam and posts it to
`/attendance/detect-faces` roughly once a second to draw the boxes. When faces are ready it
posts the frame to `/attendance/mark-attendance`, which detects every face, matches each
against that school's registered encodings in a single matrix operation, and writes an
attendance row per student — each inside its own savepoint, so one conflict cannot discard the
students already marked from the same frame.

**Schema.** Tables are created and reconciled at startup by `app/db_bootstrap.py`, which is
idempotent and safe to run against both an empty and an established database. It waits for
the database first, so a serverless Postgres that has scaled to zero is given time to wake.
Schema changes belong in that file.

---

## API overview

Full interactive documentation at `/docs` once the backend is running.

| Area | Endpoints |
|---|---|
| Auth | `POST /auth/login`, `GET /auth/me` |
| Attendance | `POST /attendance/detect-faces`, `POST /attendance/mark-attendance`, `POST /attendance/mark-absent`, `GET /attendance/today`, `GET /attendance/statistics` |
| Students | `GET|POST /students/`, `PUT|DELETE /students/{id}`, `POST /students/{id}/regenerate-encoding` |
| Meals | `POST /meals/plan`, `POST /meals/record-from-plan`, `POST /meals/{id}/consume` |
| Inventory | `GET|POST /inventory/`, `PUT|DELETE /inventory/{id}`, `POST /inventory/{id}/adjust`, `GET /inventory/summary` |
| Schools | `GET|POST /schools/`, `PUT|DELETE /schools/{id}`, `GET /schools/districts` |
| Users | `GET|POST /users/`, `POST /users/change-password`, `POST /users/{id}/reset-password` |
| Allocations | `GET|POST /allocations/`, `POST /allocations/{id}/approve`, `POST /allocations/{id}/reject` |
| Budgets | `GET|POST /budgets/`, `POST /budgets/{id}/utilize`, `GET /budgets/summary/government` |
| Reports | `GET /reports/daily|weekly|monthly|inventory|schools` |
| Alerts | `GET|POST /alerts/`, `POST /alerts/scan-low-stock` |

Authenticate with `Authorization: Bearer <token>` from the login response.

---

## Project layout

```
.
├── docker-compose.yml          One command to run the whole stack
├── .env.example                Compose configuration template
│
├── backend/
│   ├── Dockerfile              Multi-stage; bakes in the face model
│   ├── requirements.txt        Pinned, verified versions
│   ├── main.py                 App factory, CORS, error handlers, routers
│   ├── seed.py                 Creates the first administrator
│   ├── configure_s3_bucket.py  One-off: opens an S3 bucket for photo reads
│   └── app/
│       ├── api/v1/             One module per resource
│       ├── core/
│       │   ├── config.py       Settings, with validation at boot
│       │   ├── security.py     Password hashing and JWT
│       │   └── validators.py   Shared field validation
│       ├── models/             SQLAlchemy models
│       ├── schemas/            Pydantic request/response models
│       ├── services/
│       │   ├── face_recognition_service.py
│       │   ├── meal_calculator.py       PM POSHAN norms
│       │   ├── photo_storage.py         S3 with local fallback
│       │   └── s3_service.py
│       └── db_bootstrap.py     Idempotent schema creation
│
└── frontend-new/
    ├── Dockerfile              Vite build → nginx
    ├── nginx.conf              SPA routing + API proxy
    └── src/
        ├── components/         Layout, KPICard, FaceRecognitionCamera
        ├── pages/              One per route
        ├── lib/api.ts          Typed API client
        └── types/              Shared TypeScript types
```

---

## Troubleshooting

**`JWT_SECRET_KEY must be at least 32 characters`**
Set it in `.env`. Generate one with
`python -c "import secrets; print(secrets.token_urlsafe(48))"`.

**The camera does not start.**
Browsers only allow camera access on `localhost` or over HTTPS. `http://localhost:8080` is
fine; `http://192.168.x.x:8080` is not — put it behind HTTPS to use it from another machine.

**"No student face encodings found."**
Students need a photo with a clearly visible face. Add or re-upload one; if the photo is fine
but the encoding failed, use *Regenerate encoding* on the student.

**A face is detected but never recognised.**
The photo on file may be too dark, too small or at too steep an angle. Re-upload a clear,
front-facing photo. The match must also beat the runner-up by a margin, so two students with
very similar photos are deliberately refused rather than guessed.

**Backend keeps restarting under Compose.**
`docker compose logs backend`. Usually a bad `DATABASE_URL` or a missing `JWT_SECRET_KEY`.

**The first capture is very slow.**
The model loads into memory on first use. If the build-time download was skipped it also has
to fetch ~300 MB. Subsequent captures are fast.

**Port already in use.**
Change `FRONTEND_PORT` or `BACKEND_PORT` in `.env`.

---

## Notes on the stack

Python 3.12+ · FastAPI · SQLAlchemy 2 · PostgreSQL 16 · InsightFace + ONNX Runtime ·
React 19 · TypeScript · Vite · Tailwind CSS · Recharts

Passwords are hashed with bcrypt. Sessions are JWTs. Every list endpoint is scoped by the
caller's role and school, and credentials are only ever sent in request bodies.
