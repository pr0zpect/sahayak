from rest_framework import serializers
from .models import Document, Summary, Transcript


class StartInterviewSerializer(serializers.Serializer):
    patient_name = serializers.CharField(max_length=255)
    language = serializers.CharField(max_length=10)
    abha_id = serializers.CharField(max_length=100, required=False, allow_null=True, allow_blank=True)
class RespondSerializer(serializers.Serializer):
    session_id = serializers.IntegerField(min_value=1); answer = serializers.CharField(); input_mode = serializers.ChoiceField(choices=["voice", "touch"])
class UploadDocumentSerializer(serializers.Serializer):
    session_id = serializers.IntegerField(min_value=1); image = serializers.ImageField()
class SessionIdSerializer(serializers.Serializer): session_id = serializers.IntegerField(min_value=1)
class RedFlagSerializer(serializers.Serializer): text = serializers.CharField()
class LoginSerializer(serializers.Serializer): username = serializers.CharField(); password = serializers.CharField(write_only=True)
class SummaryPatchSerializer(serializers.Serializer):
    structured_json = serializers.JSONField(); doctor_notes = serializers.CharField(required=False, allow_null=True, allow_blank=True)
class TranscriptSerializer(serializers.ModelSerializer):
    class Meta: model = Transcript; fields = ("id", "turn", "speaker", "text", "input_mode", "timestamp")
class DocumentSerializer(serializers.ModelSerializer):
    class Meta: model = Document; fields = ("id", "image", "extracted_text", "extracted_fields", "confidence", "uploaded_at")
class SummarySerializer(serializers.ModelSerializer):
    class Meta: model = Summary; fields = ("structured_json", "edited_by_doctor", "doctor_notes", "created_at", "updated_at")
