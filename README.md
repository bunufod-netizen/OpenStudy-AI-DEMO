# OpenStudy-AI

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

- Python 3.11+ recommended
- Node.js 18+ recommended
- npm

The repository includes a local Python virtual environment in the development workspace, but deployments should create their own environment from the project dependencies.

## Local setup

### 1. Start the Django API

From the repository root:

```powershell
.\venv\Scripts\Activate.ps1
Copy-Item .env.example .env
python manage.py migrate
python manage.py runserver 127.0.0.1:8000
```

The API will be available at:

- Health check: `http://127.0.0.1:8000/api/hello/`
- API base: `http://127.0.0.1:8000/api/`

### 2. Start the React frontend

In a second terminal:

```powershell
cd frontend
Copy-Item .env.example .env
npm install
npm run dev
```

Open `http://127.0.0.1:5173/`.

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

Run the same checks used before publication:

```powershell
.\venv\Scripts\python.exe manage.py check
.\venv\Scripts\python.exe manage.py makemigrations --check
.\venv\Scripts\python.exe manage.py test
cd frontend
npm run lint
npm run build
```

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
