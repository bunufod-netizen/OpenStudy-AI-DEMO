from django.contrib import admin

from .models import AIConversation, AIMessage, Note, Project, Subject, StudySession, Task
admin.site.register([Project, Subject, Note, Task, StudySession, AIConversation, AIMessage])
