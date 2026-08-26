from django.urls import path
from .views import (DocumentUploadView, InterviewRespondView, InterviewStartView, LoginView,
                    MockAbdmPushView, RedFlagCheckView, SummaryDetailView, SummaryGenerateView)

urlpatterns = [
    path("interview/start/", InterviewStartView.as_view()), path("interview/respond/", InterviewRespondView.as_view()),
    path("documents/upload/", DocumentUploadView.as_view()), path("summary/generate/", SummaryGenerateView.as_view()),
    path("summary/<int:session_id>/", SummaryDetailView.as_view()), path("redflag/check/", RedFlagCheckView.as_view()),
    path("mock-abdm/push/", MockAbdmPushView.as_view()), path("auth/login/", LoginView.as_view()),
]
