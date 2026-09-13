from django.urls import path
from . import views


urlpatterns = [
    # Projects
    path("projects/", views.projects),
    path("projects/<int:pk>/", views.project_detail),

    # Subjects
    path("subjects/", views.subjects),
    path("subjects/<int:pk>/", views.subject_detail),

    # Notes
    path("notes/", views.notes),
    path("notes/<int:pk>/", views.note_detail),

    # Authentication
    path("register/", views.register),
    path("login/", views.login),
]