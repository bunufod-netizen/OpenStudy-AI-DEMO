# OpenStudy-AI

[![CI](https://github.com/bunufod-netizen/OpenStudy-AI-DEMO/actions/workflows/ci.yml/badge.svg)](https://github.com/bunufod-netizen/OpenStudy-AI-DEMO/actions/workflows/ci.yml)

> A focused learning workspace for organizing projects, subjects, notes, tasks, study sessions, and AI-assisted revision.

OpenStudy-AI is a full-stack demo application built with Django REST Framework and React/Vite. It is designed for students who want one private workspace for planning study work, capturing knowledge, tracking progress, and turning notes into revision material.

The AI Assistant runs in **local DEMO MODE** by default. It generates useful note-based answers, summaries, quizzes, flashcards, and study plans without an API key, paid provider, or external network request.

## Highlights

- Token-authenticated user accounts.
- Per-user ownership checks for projects, subjects, notes, tasks, sessions, and conversations.
- Project progress derived from completed tasks.
- Notes connected to subjects and available to the AI Assistant.
- AI actions: Ask, Summarize, Generate quiz, Generate flashcards, and Study plan.
- Task filtering by status, completion, priority, project, subject, upcoming, and overdue state.
- Task ordering controls.
- Study-session timer with start/stop behavior, history, linked projects/subjects, and dashboard totals.
- Dashboard analytics, recent activity, deadlines, study trends, and global search.
- Responsive React interface with loading, error, and empty states.

## Architecture

```text
React/Vite frontend
        |
        | Token-authenticated JSON API
        v
Django REST Framework API
        |
        +-- SQLite database for local development
        +-- DemoAIService (local, deterministic, no network)
```

The AI integration is intentionally isolated in `api/services/ai.py`. The API views depend on the stable `complete(prompt, context, history)` service contract, so a real provider can be added later by replacing the service implementation without exposing credentials in React or changing the frontend API.

## Requirements

- Python 3.12 (the version used in CI; see `.python-version`)
- Node.js 24 and its bundled npm (see `.nvmrc`)
- Git

Python dependencies, including transitive dependencies, are pinned in
`requirements.txt`. Frontend dependencies are locked in `frontend/package-lock.json`.
Create your own virtual environment; no existing environment is needed.
SQLite and the local demo AI require no database server or API key.

## Local setup

### 1. Clone the repository

```sh
git clone https://github.com/bunufod-netizen/OpenStudy-AI-DEMO.git
cd OpenStudy-AI-DEMO
```

### 2. Start the Django API

Windows PowerShell, from the repository root (no activation script required):

```powershell
py -3.12 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
Copy-Item .env.example .env
.\.venv\Scripts\python.exe manage.py migrate
.\.venv\Scripts\python.exe manage.py runserver 127.0.0.1:8000
```

macOS/Linux:

```sh
python3.12 -m venv .venv
.venv/bin/python -m pip install -r requirements.txt
cp .env.example .env
.venv/bin/python manage.py migrate
.venv/bin/python manage.py runserver 127.0.0.1:8000
```

Copy the example environment files only on initial setup; keep existing `.env`
values when updating an installation.

The API will be available at:

- Health check: `http://127.0.0.1:8000/api/hello/`
- API base: `http://127.0.0.1:8000/api/`

### 3. Start the React frontend

In a second terminal, from the repository root:

```powershell
cd frontend
Copy-Item .env.example .env
npm ci
npm run dev
```

On macOS/Linux, use `cp .env.example .env` instead of `Copy-Item`.
If using nvm, run `nvm install` and `nvm use` from the repository root first.

Open `http://127.0.0.1:5173/` (or the URL printed by Vite if that port is busy).
Create an account in the UI or call `POST /api/register/`. Authenticated requests use:

```text
Authorization: Token <token>
```

## Demo AI mode

No AI provider setup is required.

1. Create a subject.
2. Create a note with real study content.
3. Open the Notes page and choose **Ask AI**, or open the AI Assistant directly.
4. Select the note.
5. Use Ask, Summarize, Make a quiz, Flashcards, or Study plan.

Django sends the selected `note_id` to the backend service. The demo service extracts sentences and key points from the note, then produces a contextual response. Conversations and both user/assistant messages are stored in the database.

## API overview

| Area | Endpoints |
| --- | --- |
| Authentication | `POST /api/register/`, `POST /api/login/` |
| Projects | `GET/POST /api/projects/`, `GET/PUT/DELETE /api/projects/<id>/` |
| Subjects | `GET/POST /api/subjects/`, `GET/PUT/DELETE /api/subjects/<id>/` |
| Notes | `GET/POST /api/notes/`, `GET/PUT/DELETE /api/notes/<id>/` |
| Tasks | `GET/POST /api/tasks/`, `GET/PUT/DELETE /api/tasks/<id>/` |
| Study sessions | `/api/study-sessions/`, `/api/study-sessions/start/`, `/api/study-sessions/<id>/stop/` |
| AI assistant | `POST /api/assistant/`, `POST /api/assistant/actions/` |
| AI conversations | `/api/assistant/conversations/` |
| Dashboard/search | `/api/dashboard/stats/`, `/api/search/?q=<query>` |

All authenticated resources are scoped to the current user. Related projects and subjects are also validated for ownership before they can be attached to tasks, notes, or study sessions.

## Validation

The [CI workflow](https://github.com/bunufod-netizen/OpenStudy-AI-DEMO/actions/workflows/ci.yml)
runs on every push and on pull requests targeting `main`. It installs dependencies from
scratch, checks dependency consistency and Django configuration, checks for missing
migrations, applies migrations to a fresh SQLite database, and runs the backend
tests on Linux and Windows. A separate Linux job runs frontend lint and build checks
using `npm ci`. No repository secrets or AI credentials are required.

After local setup, run the same checks from the repository root.
Windows PowerShell (run each command in order and resolve any failures):

```powershell
.\.venv\Scripts\python.exe -m pip check
.\.venv\Scripts\python.exe manage.py check
.\.venv\Scripts\python.exe manage.py makemigrations --check --dry-run
.\.venv\Scripts\python.exe manage.py migrate --noinput
.\.venv\Scripts\python.exe manage.py test --noinput
cd frontend
npm ci
npm run lint
npm run build
```

On macOS/Linux, replace `.\.venv\Scripts\python.exe` with `.venv/bin/python`.
Backend tests use a separate test database. Frontend lint/build checks do not
replace browser or component tests.

When updating dependencies, regenerate and commit the corresponding lockfile
(`requirements.txt` or `frontend/package-lock.json`) and rerun these checks.
Only describe CI as passing when the linked workflow run is green.

## Production notes

For a real deployment:

- Set a long random `DJANGO_SECRET_KEY`.
- Set `DJANGO_DEBUG=False`.
- Configure `DJANGO_ALLOWED_HOSTS` and `CORS_ALLOWED_ORIGINS`.
- Use a managed database instead of local SQLite.
- Run `python manage.py migrate`.
- Serve the frontend build with a static host or web server.
- Serve Django with a production WSGI/ASGI server.
- Never commit `.env`, tokens, database files, or API credentials.

## Project status

OpenStudy-AI is currently a polished demonstration project. The core workspace flows, ownership protections, task controls, study-session tracking, and local AI demo experience are implemented and validated.
