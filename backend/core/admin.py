from django.contrib import admin
from .models import Document, Patient, Session, Summary, Transcript


@admin.register(Patient)
class PatientAdmin(admin.ModelAdmin): list_display = ("id", "name", "language", "abha_id", "created_at")
@admin.register(Session)
class SessionAdmin(admin.ModelAdmin): list_display = ("id", "patient", "status", "red_flag", "pushed_to_abdm", "created_at")
@admin.register(Transcript)
class TranscriptAdmin(admin.ModelAdmin): list_display = ("id", "session", "turn", "speaker", "input_mode", "timestamp")
@admin.register(Document)
class DocumentAdmin(admin.ModelAdmin): list_display = ("id", "session", "confidence", "uploaded_at")
@admin.register(Summary)
class SummaryAdmin(admin.ModelAdmin): list_display = ("id", "session", "edited_by_doctor", "updated_at")
