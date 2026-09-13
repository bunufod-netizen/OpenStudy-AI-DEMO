from rest_framework import serializers
from .models import AIConversation, AIMessage, Project, Subject, Note, Task, StudySession


class ProjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = Project
        fields = "__all__"
        read_only_fields = ["owner", "created_at"]

    def validate_progress(self, value):
        if not 0 <= value <= 100:
            raise serializers.ValidationError("Progress must be between 0 and 100.")
        return value

    def to_representation(self, instance):
        data = super().to_representation(instance)
        task_count = instance.tasks.count()
        if task_count:
            data["progress"] = round(instance.tasks.filter(status="done").count() / task_count * 100)
            data["task_count"] = task_count
            data["completed_task_count"] = instance.tasks.filter(status="done").count()
        else:
            data["task_count"] = 0
            data["completed_task_count"] = 0
        return data


class SubjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = Subject
        fields = "__all__"
        read_only_fields = ["owner", "created_at"]


class NoteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Note
        fields = "__all__"
        read_only_fields = ["created_at"]


class TaskSerializer(serializers.ModelSerializer):
    completed = serializers.SerializerMethodField()

    class Meta:
        model = Task
        fields = [
            "id",
            "owner",
            "title",
            "description",
            "status",
            "priority",
            "due_date",
            "project",
            "subject",
            "created_at",
            "completed",
        ]
        read_only_fields = ["owner", "created_at"]

    def get_completed(self, obj):
        return obj.status == "done"


class StudySessionSerializer(serializers.ModelSerializer):
    is_active = serializers.ReadOnlyField()

    class Meta:
        model = StudySession
        fields = "__all__"
        read_only_fields = ["owner", "created_at"]


class AIMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = AIMessage
        fields = ["id", "role", "content", "created_at"]
        read_only_fields = ["id", "created_at"]


class AIConversationSerializer(serializers.ModelSerializer):
    messages = AIMessageSerializer(many=True, read_only=True)

    class Meta:
        model = AIConversation
        fields = ["id", "title", "created_at", "updated_at", "messages"]
        read_only_fields = ["owner", "created_at", "updated_at", "messages"]