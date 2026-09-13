from django.urls import path

from .views import (
    hello,
    login,
    register,
    projects,
    project_detail,
    subjects,
    subject_detail,
    notes,
    note_detail,
    tasks,
    task_detail,
    study_sessions,
    start_study_session,
    stop_study_session,
    study_session_detail,
    dashboard_stats,
    global_search,
    assistant,
    assistant_action,
    assistant_conversations,
    assistant_conversation_detail,
    profile,
    change_password,
)


urlpatterns = [
    path("hello/", hello),

    path("login/", login),
    path("register/", register),

    path("projects/", projects),
    path("projects/<int:pk>/", project_detail),

    path("subjects/", subjects),
    path("subjects/<int:pk>/", subject_detail),

    path("notes/", notes),
    path("notes/<int:pk>/", note_detail),
    path("tasks/", tasks),
    path("tasks/<int:pk>/", task_detail),
    path("study-sessions/", study_sessions),
    path("study-sessions/start/", start_study_session),
    path("study-sessions/<int:pk>/", study_session_detail),
    path("study-sessions/<int:pk>/stop/", stop_study_session),
    path("dashboard/stats/", dashboard_stats),
    path("search/", global_search),
    path("assistant/", assistant),
    path("assistant/actions/", assistant_action),
    path("assistant/conversations/", assistant_conversations),
    path("assistant/conversations/<int:pk>/", assistant_conversation_detail),
    path("profile/", profile),
    path("profile/password/", change_password),
]