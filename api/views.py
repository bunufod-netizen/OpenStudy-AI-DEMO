from datetime import date, timedelta

from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.db.models import Q, Sum
from django.utils import timezone
from rest_framework.authtoken.models import Token
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from .models import AIConversation, AIMessage, Note, Project, Subject, StudySession, Task
from .serializers import (
    AIConversationSerializer,
    NoteSerializer,
    ProjectSerializer,
    SubjectSerializer,
    StudySessionSerializer,
    TaskSerializer,
)
from .services.ai import complete as ai_complete


def _owned_or_404(model, request, pk):
    return model.objects.filter(pk=pk, owner=request.user).first()


def _relation_for_user(model, value, user):
    if value in (None, "", 0, "0"):
        return None
    try:
        return model.objects.get(pk=value, owner=user)
    except (model.DoesNotExist, ValueError, TypeError):
        return False


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def projects(request):
    if request.method == "GET":
        return Response(ProjectSerializer(Project.objects.filter(owner=request.user), many=True).data)
    serializer = ProjectSerializer(data=request.data)
    if serializer.is_valid():
        return Response(ProjectSerializer(serializer.save(owner=request.user)).data, status=201)
    return Response(serializer.errors, status=400)


@api_view(["GET", "PUT", "DELETE"])
@permission_classes([IsAuthenticated])
def project_detail(request, pk):
    project = _owned_or_404(Project, request, pk)
    if not project:
        return Response({"detail": "Project not found."}, status=404)
    if request.method == "GET":
        return Response(ProjectSerializer(project).data)
    if request.method == "DELETE":
        project.delete()
        return Response(status=204)
    serializer = ProjectSerializer(project, data=request.data)
    if serializer.is_valid():
        return Response(ProjectSerializer(serializer.save(owner=request.user)).data)
    return Response(serializer.errors, status=400)


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def subjects(request):
    if request.method == "GET":
        return Response(SubjectSerializer(Subject.objects.filter(owner=request.user), many=True).data)
    serializer = SubjectSerializer(data=request.data)
    if serializer.is_valid():
        return Response(SubjectSerializer(serializer.save(owner=request.user)).data, status=201)
    return Response(serializer.errors, status=400)


@api_view(["GET", "PUT", "DELETE"])
@permission_classes([IsAuthenticated])
def subject_detail(request, pk):
    subject = _owned_or_404(Subject, request, pk)
    if not subject:
        return Response({"detail": "Subject not found."}, status=404)
    if request.method == "GET":
        return Response(SubjectSerializer(subject).data)
    if request.method == "DELETE":
        subject.delete()
        return Response(status=204)
    serializer = SubjectSerializer(subject, data=request.data)
    if serializer.is_valid():
        return Response(SubjectSerializer(serializer.save(owner=request.user)).data)
    return Response(serializer.errors, status=400)


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def notes(request):
    if request.method == "GET":
        queryset = Note.objects.filter(subject__owner=request.user)
        if request.GET.get("subject"):
            queryset = queryset.filter(subject_id=request.GET["subject"])
        return Response(NoteSerializer(queryset.order_by("-created_at"), many=True).data)
    subject = _relation_for_user(Subject, request.data.get("subject"), request.user)
    if subject is False or subject is None:
        return Response({"detail": "A subject owned by you is required."}, status=400)
    serializer = NoteSerializer(data=request.data)
    if serializer.is_valid():
        return Response(NoteSerializer(serializer.save(subject=subject)).data, status=201)
    return Response(serializer.errors, status=400)


@api_view(["GET", "PUT", "DELETE"])
@permission_classes([IsAuthenticated])
def note_detail(request, pk):
    note = Note.objects.filter(pk=pk, subject__owner=request.user).first()
    if not note:
        return Response({"detail": "Note not found."}, status=404)
    if request.method == "GET":
        return Response(NoteSerializer(note).data)
    if request.method == "DELETE":
        note.delete()
        return Response(status=204)
    subject = _relation_for_user(Subject, request.data.get("subject", note.subject_id), request.user)
    if subject is False or subject is None:
        return Response({"detail": "A subject owned by you is required."}, status=400)
    serializer = NoteSerializer(note, data=request.data)
    if serializer.is_valid():
        return Response(NoteSerializer(serializer.save(subject=subject)).data)
    return Response(serializer.errors, status=400)


def _task_payload(request):
    project = _relation_for_user(Project, request.data.get("project"), request.user)
    subject = _relation_for_user(Subject, request.data.get("subject"), request.user)
    if project is False or subject is False:
        return None, None, {"detail": "Related project and subject must belong to you."}
    return project, subject, None


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def tasks(request):
    if request.method == "GET":
        queryset = Task.objects.filter(owner=request.user)
        if request.GET.get("status"):
            queryset = queryset.filter(status=request.GET["status"])
        if request.GET.get("priority"):
            queryset = queryset.filter(priority=request.GET["priority"])
        if request.GET.get("project"):
            queryset = queryset.filter(project_id=request.GET["project"])
        if request.GET.get("subject"):
            queryset = queryset.filter(subject_id=request.GET["subject"])
        if request.GET.get("completed") == "true":
            queryset = queryset.filter(status="done")
        if request.GET.get("completed") == "false":
            queryset = queryset.exclude(status="done")
        if request.GET.get("upcoming") == "true":
            queryset = queryset.filter(due_date__gte=date.today(), status__in=["todo", "in_progress"])
        if request.GET.get("overdue") == "true":
            queryset = queryset.filter(due_date__lt=date.today(), status__in=["todo", "in_progress"])
        ordering = request.GET.get("ordering", "due_date")
        if ordering not in {"due_date", "-due_date", "created_at", "-created_at", "priority", "-priority"}:
            ordering = "due_date"
        return Response(TaskSerializer(queryset.order_by(ordering, "-created_at"), many=True).data)
    project, subject, error = _task_payload(request)
    if error:
        return Response(error, status=400)
    serializer = TaskSerializer(data=request.data)
    if serializer.is_valid():
        return Response(TaskSerializer(serializer.save(owner=request.user, project=project, subject=subject)).data, status=201)
    return Response(serializer.errors, status=400)


@api_view(["GET", "PUT", "DELETE"])
@permission_classes([IsAuthenticated])
def task_detail(request, pk):
    task = _owned_or_404(Task, request, pk)
    if not task:
        return Response({"detail": "Task not found."}, status=404)
    if request.method == "GET":
        return Response(TaskSerializer(task).data)
    if request.method == "DELETE":
        task.delete()
        return Response(status=204)
    project, subject, error = _task_payload(request)
    if error:
        return Response(error, status=400)
    serializer = TaskSerializer(task, data=request.data)
    if serializer.is_valid():
        return Response(TaskSerializer(serializer.save(owner=request.user, project=project, subject=subject)).data)
    return Response(serializer.errors, status=400)


def _session_payload(request):
    project = _relation_for_user(Project, request.data.get("project"), request.user)
    subject = _relation_for_user(Subject, request.data.get("subject"), request.user)
    if project is False or subject is False:
        return None, None, {"detail": "Related project and subject must belong to you."}
    return project, subject, None


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def study_sessions(request):
    if request.method == "GET":
        return Response(StudySessionSerializer(StudySession.objects.filter(owner=request.user).order_by("-started_at"), many=True).data)
    project, subject, error = _session_payload(request)
    if error:
        return Response(error, status=400)
    serializer = StudySessionSerializer(data=request.data)
    if serializer.is_valid():
        session = serializer.save(owner=request.user, project=project, subject=subject)
        if session.ended_at is None:
            session.ended_at = session.started_at + timedelta(minutes=session.duration_minutes)
            session.save(update_fields=["ended_at"])
        return Response(StudySessionSerializer(session).data, status=201)
    return Response(serializer.errors, status=400)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def start_study_session(request):
    active = StudySession.objects.filter(owner=request.user, ended_at__isnull=True).first()
    if active:
        return Response(StudySessionSerializer(active).data)
    project, subject, error = _session_payload(request)
    if error:
        return Response(error, status=400)
    session = StudySession.objects.create(
        owner=request.user,
        title=str(request.data.get("title") or "Live study session")[:200],
        project=project,
        subject=subject,
        started_at=timezone.now(),
        duration_minutes=0,
    )
    return Response(StudySessionSerializer(session).data, status=201)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def stop_study_session(request, pk):
    session = _owned_or_404(StudySession, request, pk)
    if not session:
        return Response({"detail": "Study session not found."}, status=404)
    if session.ended_at is None:
        session.ended_at = timezone.now()
        session.duration_minutes = max(1, round((session.ended_at - session.started_at).total_seconds() / 60))
        session.save(update_fields=["ended_at", "duration_minutes"])
    return Response(StudySessionSerializer(session).data)


@api_view(["GET", "PUT", "DELETE"])
@permission_classes([IsAuthenticated])
def study_session_detail(request, pk):
    session = _owned_or_404(StudySession, request, pk)
    if not session:
        return Response({"detail": "Study session not found."}, status=404)
    if request.method == "GET":
        return Response(StudySessionSerializer(session).data)
    if request.method == "DELETE":
        session.delete()
        return Response(status=204)
    project, subject, error = _session_payload(request)
    if error:
        return Response(error, status=400)
    serializer = StudySessionSerializer(session, data=request.data)
    if serializer.is_valid():
        return Response(StudySessionSerializer(serializer.save(owner=request.user, project=project, subject=subject)).data)
    return Response(serializer.errors, status=400)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def dashboard_stats(request):
    projects = Project.objects.filter(owner=request.user)
    tasks_queryset = Task.objects.filter(owner=request.user)
    sessions = StudySession.objects.filter(owner=request.user)
    total_tasks = tasks_queryset.count()
    completed = tasks_queryset.filter(status="done").count()
    today = timezone.localdate()
    upcoming = list(projects.filter(deadline__isnull=False, deadline__gte=today).order_by("deadline")[:5].values("id", "name", "deadline", "progress"))
    for item in upcoming:
        item["deadline"] = item["deadline"].isoformat()
        project = projects.get(pk=item["id"])
        if project.tasks.exists():
            total = project.tasks.count()
            item["progress"] = round(project.tasks.filter(status="done").count() / total * 100)
    trend = []
    for offset in range(6, -1, -1):
        day = today - timedelta(days=offset)
        trend.append({"date": day.isoformat(), "minutes": sessions.filter(started_at__date=day).aggregate(total=Sum("duration_minutes"))["total"] or 0})
    recent = []
    for note in Note.objects.filter(subject__owner=request.user).order_by("-created_at")[:4]:
        recent.append({"type": "note", "id": note.id, "title": note.title, "created_at": note.created_at})
    for task in tasks_queryset.order_by("-created_at")[:4]:
        recent.append({"type": "task", "id": task.id, "title": task.title, "created_at": task.created_at})
    recent.sort(key=lambda item: item["created_at"], reverse=True)
    return Response({
        "projects": projects.count(), "subjects": Subject.objects.filter(owner=request.user).count(),
        "notes": Note.objects.filter(subject__owner=request.user).count(), "tasks": total_tasks,
        "completed_tasks": completed, "task_completion": round(completed / total_tasks * 100) if total_tasks else 0,
        "study_sessions": sessions.count(), "study_minutes": sessions.aggregate(total=Sum("duration_minutes"))["total"] or 0,
        "active_projects": projects.filter(status="active").count(),
        "upcoming_deadlines": projects.filter(deadline__gte=today).count(),
        "active_sessions": sessions.filter(ended_at__isnull=True).count(), "upcoming": upcoming,
        "recent_activity": [{**item, "created_at": item["created_at"].isoformat()} for item in recent[:8]],
        "study_trend": trend,
        "project_task_counts": [
            {"id": project.id, "name": project.name, "total": project.tasks.count(), "completed": project.tasks.filter(status="done").count()}
            for project in projects[:8]
        ],
    })


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def global_search(request):
    query = request.GET.get("q", "").strip()
    if not query:
        return Response({"results": []})
    results = []
    for model, kind, title_field, text_fields in [
        (Project, "project", "name", ["name", "description"]),
        (Subject, "subject", "name", ["name", "description"]),
        (Task, "task", "title", ["title", "description"]),
    ]:
        owned = model.objects.filter(owner=request.user)
        condition = Q()
        for field in text_fields:
            condition |= Q(**{f"{field}__icontains": query})
        for item in owned.filter(condition)[:10]:
            results.append({"type": kind, "id": item.id, "title": getattr(item, title_field), "snippet": getattr(item, "description", "")})
    for item in Note.objects.filter(subject__owner=request.user).filter(Q(title__icontains=query) | Q(content__icontains=query))[:10]:
        results.append({"type": "note", "id": item.id, "title": item.title, "snippet": item.content[:180]})
    return Response({"results": results[:30], "query": query})


def _note_context(request, note_id):
    if not note_id:
        return ""
    note = Note.objects.filter(pk=note_id, subject__owner=request.user).first()
    return f"Title: {note.title}\n{note.content}" if note else None


def _conversation_for_user(request, conversation_id=None):
    if not conversation_id:
        return AIConversation.objects.create(owner=request.user)
    return AIConversation.objects.filter(pk=conversation_id, owner=request.user).first()


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def assistant_conversations(request):
    if request.method == "GET":
        return Response(AIConversationSerializer(AIConversation.objects.filter(owner=request.user).prefetch_related("messages"), many=True).data)
    conversation = AIConversation.objects.create(owner=request.user, title=str(request.data.get("title") or "New conversation")[:200])
    return Response(AIConversationSerializer(conversation).data, status=201)


@api_view(["GET", "DELETE"])
@permission_classes([IsAuthenticated])
def assistant_conversation_detail(request, pk):
    conversation = _conversation_for_user(request, pk)
    if not conversation:
        return Response({"detail": "Conversation not found."}, status=404)
    if request.method == "DELETE":
        conversation.delete()
        return Response(status=204)
    return Response(AIConversationSerializer(conversation).data)


def _assistant_action_impl(request):
    action = str(request.data.get("action") or "ask").strip().lower()
    prompt = str(request.data.get("prompt") or "").strip()
    allowed_actions = {"ask", "summarize", "quiz", "flashcards", "study-plan"}
    if action not in allowed_actions:
        return Response({"detail": "Unsupported assistant action."}, status=400)
    templates = {
        "summarize": "Summarize the supplied learning material into clear key points and practical takeaways.",
        "quiz": "Create five varied quiz questions from the supplied learning material, then include an answer key.",
        "flashcards": "Create concise front/back flashcards from the supplied learning material.",
        "study-plan": "Create a realistic study plan with timed steps and a quick review checkpoint.",
    }
    if action == "ask" and not prompt:
        return Response({"detail": "Prompt is required."}, status=400)
    prompt = f"{templates.get(action, '')}\n{prompt}".strip()
    conversation = _conversation_for_user(request, request.data.get("conversation_id"))
    if not conversation:
        return Response({"detail": "Conversation not found."}, status=404)
    context = _note_context(request, request.data.get("note_id"))
    if context is None:
        return Response({"detail": "Note not found."}, status=404)
    history = list(conversation.messages.order_by("created_at").values("role", "content"))
    answer, error = ai_complete(prompt, context, history)
    if error:
        return Response({"detail": error, "configured": False}, status=503)
    AIMessage.objects.create(conversation=conversation, role="user", content=prompt)
    AIMessage.objects.create(conversation=conversation, role="assistant", content=answer)
    conversation.save(update_fields=["updated_at"])
    return Response({"answer": answer, "configured": True, "action": action, "conversation_id": conversation.id})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def assistant_action(request):
    return _assistant_action_impl(request)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def assistant(request):
    return _assistant_action_impl(request)


@api_view(["GET", "PUT", "PATCH"])
@permission_classes([IsAuthenticated])
def profile(request):
    if request.method == "GET":
        return Response({"id": request.user.id, "username": request.user.username, "email": request.user.email, "first_name": request.user.first_name, "last_name": request.user.last_name})
    for field in ("email", "first_name", "last_name"):
        if field in request.data:
            setattr(request.user, field, str(request.data[field]).strip())
    request.user.save(update_fields=["email", "first_name", "last_name"])
    return Response({"id": request.user.id, "username": request.user.username, "email": request.user.email, "first_name": request.user.first_name, "last_name": request.user.last_name})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def change_password(request):
    if not request.user.check_password(request.data.get("current_password", "")):
        return Response({"detail": "Current password is incorrect."}, status=400)
    new_password = request.data.get("new_password", "")
    if len(new_password) < 8:
        return Response({"detail": "New password must be at least 8 characters."}, status=400)
    request.user.set_password(new_password)
    request.user.save(update_fields=["password"])
    Token.objects.filter(user=request.user).delete()
    token = Token.objects.create(user=request.user)
    return Response({"message": "Password updated.", "token": token.key})


@api_view(["POST"])
@permission_classes([AllowAny])
def register(request):
    username = str(request.data.get("username", "")).strip()
    password = request.data.get("password", "")
    if not username or not password:
        return Response({"detail": "Username and password are required."}, status=400)
    if User.objects.filter(username=username).exists():
        return Response({"detail": "Username already exists."}, status=400)
    user = User.objects.create_user(username=username, password=password)
    token = Token.objects.create(user=user)
    return Response({"message": "User created successfully", "username": username, "token": token.key}, status=201)


@api_view(["POST"])
@permission_classes([AllowAny])
def login(request):
    user = authenticate(username=request.data.get("username"), password=request.data.get("password"))
    if user is None:
        return Response({"detail": "Invalid username or password."}, status=401)
    token, _ = Token.objects.get_or_create(user=user)
    return Response({"message": "Login successful", "username": user.username, "token": token.key})


@api_view(["GET"])
@permission_classes([AllowAny])
def hello(request):
    return Response({"message": "OpenStudy-AI API is working!"})
