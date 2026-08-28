from django.urls import path
from .views import (
    AbdmAuthView, ConsentGrantView, ConsentRevokeView, DocumentUploadView,
    InterviewRespondView, InterviewStartView, LoginView, MockAbdmPushView,
    RedFlagCheckView, SummaryDetailView, SummaryGenerateView,
    TokenGenerateView, TokenLookupView, TokenValidateView, TokenRejectionStatusView,
)

urlpatterns = [
    path("interview/start/", InterviewStartView.as_view()),
    path("interview/respond/", InterviewRespondView.as_view()),
    path("documents/upload/", DocumentUploadView.as_view()),
    path("summary/generate/", SummaryGenerateView.as_view()),
    path("summary/<int:session_id>/", SummaryDetailView.as_view()),
    path("redflag/check/", RedFlagCheckView.as_view()),
    path("consent/grant/", ConsentGrantView.as_view()),
    path("consent/revoke/", ConsentRevokeView.as_view()),
    path("abdm/authenticate/", AbdmAuthView.as_view()),
    path("abdm/push/", MockAbdmPushView.as_view()),
    path("mock-abdm/push/", MockAbdmPushView.as_view()),
    path("auth/login/", LoginView.as_view()),
    # Token & Receptionist Validation
    # Sub-paths MUST come before the generic token/<str:token>/ catch-all
    path("token/generate/", TokenGenerateView.as_view()),
    path("token/<str:token>/validate/", TokenValidateView.as_view()),
    path("token/<str:token>/rejection-status/", TokenRejectionStatusView.as_view()),
    path("token/<str:token>/", TokenLookupView.as_view()),
]
