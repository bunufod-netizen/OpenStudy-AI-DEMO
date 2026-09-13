from datetime import timedelta
from unittest.mock import patch

from django.contrib.auth.models import User
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from .models import AIConversation, AIMessage, Note, Project, Subject, StudySession, Task


class ApiWorkflowTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username="alice", password="safe-password")
        self.other = User.objects.create_user(username="bob", password="safe-password")
        response = self.client.post("/api/login/", {"username": "alice", "password": "safe-password"}, format="json")
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {response.data['token']}")

    def test_auth_and_ownership_are_enforced(self):
        self.assertEqual(self.client.get("/api/projects/").status_code, 200)
        foreign = Project.objects.create(owner=self.other, name="Private", description="")
        self.assertEqual(self.client.get(f"/api/projects/{foreign.id}/").status_code, 404)
        self.assertEqual(self.client.delete(f"/api/projects/{foreign.id}/").status_code, 404)

    def test_task_relations_and_project_progress_are_derived(self):
        project = Project.objects.create(owner=self.user, name="Math", description="")
        Task.objects.create(owner=self.user, project=project, title="Done", status="done")
        Task.objects.create(owner=self.user, project=project, title="Next")
        response = self.client.get("/api/projects/")
        self.assertEqual(response.data[0]["progress"], 50)
        self.assertEqual(response.data[0]["task_count"], 2)
        foreign = Project.objects.create(owner=self.other, name="Nope", description="")
        rejected = self.client.post("/api/tasks/", {"title": "Bad", "project": foreign.id}, format="json")
        self.assertEqual(rejected.status_code, 400)

    def test_live_session_start_stop_calculates_duration(self):
        started = self.client.post("/api/study-sessions/start/", {"title": "Focus"}, format="json")
        self.assertEqual(started.status_code, 201)
        session = StudySession.objects.get(pk=started.data["id"])
        session.started_at = timezone.now() - timedelta(minutes=12)
        session.save(update_fields=["started_at"])
        stopped = self.client.post(f"/api/study-sessions/{session.id}/stop/", {}, format="json")
        self.assertEqual(stopped.status_code, 200)
        self.assertGreaterEqual(stopped.data["duration_minutes"], 12)
        self.assertFalse(stopped.data["is_active"])

    def test_dashboard_includes_trend_and_counts(self):
        Project.objects.create(owner=self.user, name="Project", description="")
        Task.objects.create(owner=self.user, title="Task", status="done")
        response = self.client.get("/api/dashboard/stats/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["completed_tasks"], 1)
        self.assertEqual(len(response.data["study_trend"]), 7)
        self.assertIn("recent_activity", response.data)

    @patch("api.views.ai_complete")
    def test_ai_conversation_history_and_action(self, complete):
        complete.side_effect = lambda prompt, context, history: (
            "A useful answer based on the selected note.", None
        )
        subject = Subject.objects.create(owner=self.user, name="Biology")
        note = Note.objects.create(subject=subject, title="Cells", content="Cells contain genetic material.")
        conversation = self.client.post("/api/assistant/conversations/", {"title": "Revision"}, format="json")
        self.assertEqual(conversation.status_code, 201)
        response = self.client.post("/api/assistant/actions/", {
            "action": "flashcards", "prompt": "", "note_id": note.id,
            "conversation_id": conversation.data["id"],
        }, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(AIMessage.objects.filter(conversation_id=conversation.data["id"]).count(), 2)
        self.assertEqual(complete.call_args.args[2], [])

    def test_demo_ai_actions_use_note_content_and_save_messages(self):
        subject = Subject.objects.create(owner=self.user, name="History")
        note = Note.objects.create(
            subject=subject,
            title="Industrial revolution",
            content="Steam power changed manufacturing. Factories grew around reliable energy.",
        )
        for action in ("summarize", "quiz", "flashcards", "study-plan"):
            response = self.client.post(
                "/api/assistant/actions/",
                {"action": action, "note_id": note.id},
                format="json",
            )
            self.assertEqual(response.status_code, 200)
            self.assertTrue(response.data["answer"].startswith("DEMO MODE"))
            self.assertIsNotNone(response.data["conversation_id"])
        self.assertEqual(AIConversation.objects.filter(owner=self.user).count(), 4)
        self.assertEqual(AIMessage.objects.filter(conversation__owner=self.user).count(), 8)

    def test_demo_ai_rejects_foreign_note_and_handles_empty_note(self):
        other_subject = Subject.objects.create(owner=self.other, name="Private")
        foreign_note = Note.objects.create(subject=other_subject, title="Private", content="Secret")
        rejected = self.client.post("/api/assistant/", {"note_id": foreign_note.id, "action": "summarize"}, format="json")
        self.assertEqual(rejected.status_code, 404)
        own_subject = Subject.objects.create(owner=self.user, name="Empty")
        empty_note = Note.objects.create(subject=own_subject, title="Blank", content="")
        response = self.client.post("/api/assistant/", {"note_id": empty_note.id, "action": "summarize"}, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertIn("empty", response.data["answer"].lower())

    def test_profile_and_password_change(self):
        response = self.client.patch("/api/profile/", {"email": "alice@example.com"}, format="json")
        self.assertEqual(response.data["email"], "alice@example.com")
        response = self.client.post("/api/profile/password/", {
            "current_password": "safe-password", "new_password": "new-safe-password",
        }, format="json")
        self.assertEqual(response.status_code, 200)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("new-safe-password"))
