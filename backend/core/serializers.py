from rest_framework import serializers
from .models import ABDMPushLog, ClinicalFlag, ConsentRecord, Document, Summary, Transcript


class StartInterviewSerializer(serializers.Serializer):
    patient_name = serializers.CharField(max_length=255)
    language = serializers.CharField(max_length=10, default="en")
    mode = serializers.ChoiceField(choices=["allopathic", "ayush"], default="allopathic")
    abha_id = serializers.CharField(max_length=100, required=False, allow_null=True, allow_blank=True)
    abha_number = serializers.CharField(max_length=100, required=False, allow_null=True, allow_blank=True)


class RespondSerializer(serializers.Serializer):
    session_id = serializers.IntegerField(min_value=1)
    answer = serializers.CharField()
    input_mode = serializers.ChoiceField(choices=["voice", "touch"])
    language = serializers.CharField(max_length=10, required=False, default="en")


class UploadDocumentSerializer(serializers.Serializer):
    session_id = serializers.IntegerField(min_value=1)
    image = serializers.ImageField()


class SessionIdSerializer(serializers.Serializer):
    session_id = serializers.IntegerField(min_value=1)


class RedFlagSerializer(serializers.Serializer):
    text = serializers.CharField()
    mode = serializers.ChoiceField(choices=["allopathic", "ayush"], required=False, default="allopathic")


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)


class SummaryPatchSerializer(serializers.Serializer):
    structured_json = serializers.JSONField()
    doctor_notes = serializers.CharField(required=False, allow_null=True, allow_blank=True)


class ConsentSerializer(serializers.Serializer):
    session_id = serializers.IntegerField(min_value=1)
    scope = serializers.JSONField(default=dict)


class ConsentRevokeSerializer(serializers.Serializer):
    consent_id = serializers.IntegerField(min_value=1)


class AbdmAuthSerializer(serializers.Serializer):
    abha_number = serializers.CharField(max_length=100)


class TranscriptSerializer(serializers.ModelSerializer):
    class Meta:
        model = Transcript
        fields = ("id", "turn", "speaker", "text", "language", "input_mode", "timestamp")


class DocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Document
        fields = ("id", "image", "extracted_text", "extracted_fields", "confidence", "ocr_method", "uploaded_at")


class ClinicalFlagSerializer(serializers.ModelSerializer):
    class Meta:
        model = ClinicalFlag
        fields = ("id", "document", "flag_type", "detail", "created_at")


class ConsentRecordSerializer(serializers.ModelSerializer):
    class Meta:
        model = ConsentRecord
        fields = ("id", "scope", "granted_at", "revoked_at")


class ABDMPushLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = ABDMPushLog
        fields = ("id", "fhir_bundle", "status", "response_payload", "attempted_at")


class SummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = Summary
        fields = ("structured_json", "edited_by_doctor", "doctor_notes", "created_at", "updated_at")


class TokenGenerateSerializer(serializers.Serializer):
    session_id = serializers.IntegerField(min_value=1)


class TokenValidateSerializer(serializers.Serializer):
    VALID_REASONS = ["unclear_complaint", "incomplete_document", "needs_reinterview", "other"]

    action = serializers.ChoiceField(choices=["approve", "reject"])
    reason = serializers.ChoiceField(choices=VALID_REASONS, required=False, allow_null=True)

    def validate(self, data):
        if data["action"] == "reject" and not data.get("reason"):
            raise serializers.ValidationError(
                {"reason": "A rejection reason is required when action is 'reject'."}
            )
        return data
