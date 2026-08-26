from django.db import models


class Patient(models.Model):
    name = models.CharField(max_length=255)
    language = models.CharField(max_length=10, default="en")
    preferred_language = models.CharField(max_length=10, default="en")
    abha_id = models.CharField(max_length=100, null=True, blank=True)
    abha_number = models.CharField(max_length=100, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self): return self.name


class Session(models.Model):
    class Status(models.TextChoices):
        IN_PROGRESS = "in_progress", "In progress"
        AWAITING_SUMMARY = "awaiting_summary", "Awaiting summary"
        SUMMARY_READY = "summary_ready", "Summary ready"
        DOCTOR_REVIEWED = "doctor_reviewed", "Doctor reviewed"
    class Mode(models.TextChoices):
        ALLOPATHIC = "allopathic", "Allopathic"
        AYUSH = "ayush", "AYUSH (Ayurvedic)"

    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name="sessions")
    mode = models.CharField(max_length=20, choices=Mode.choices, default=Mode.ALLOPATHIC)
    status = models.CharField(max_length=30, choices=Status.choices, default=Status.IN_PROGRESS)
    red_flag = models.BooleanField(default=False)
    red_flag_reason = models.TextField(null=True, blank=True)
    pushed_to_abdm = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self): return f"Session {self.pk} ({self.mode}) — {self.patient.name}"


class Transcript(models.Model):
    class Speaker(models.TextChoices): PATIENT = "patient", "Patient"; AI = "ai", "AI"
    class InputMode(models.TextChoices): VOICE = "voice", "Voice"; TOUCH = "touch", "Touch"
    session = models.ForeignKey(Session, on_delete=models.CASCADE, related_name="transcripts")
    turn = models.PositiveIntegerField()
    speaker = models.CharField(max_length=10, choices=Speaker.choices)
    text = models.TextField()
    language = models.CharField(max_length=10, default="en")
    input_mode = models.CharField(max_length=10, choices=InputMode.choices, null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["turn", "id"]
        constraints = [models.UniqueConstraint(fields=["session", "turn"], name="unique_session_turn")]


class Document(models.Model):
    class OCRMethod(models.TextChoices):
        PRINTED = "printed", "Printed OCR"
        HANDWRITTEN = "handwritten", "Handwritten OCR"

    session = models.ForeignKey(Session, on_delete=models.CASCADE, related_name="documents")
    image = models.ImageField(upload_to="documents/")
    extracted_text = models.TextField(blank=True)
    extracted_fields = models.JSONField(default=dict)
    confidence = models.FloatField(default=0)
    ocr_method = models.CharField(max_length=20, choices=OCRMethod.choices, default=OCRMethod.PRINTED)
    uploaded_at = models.DateTimeField(auto_now_add=True)


class ClinicalFlag(models.Model):
    class FlagType(models.TextChoices):
        ABNORMAL_VALUE = "abnormal_value", "Abnormal Lab Value"
        DRUG_INTERACTION = "drug_interaction", "Drug-Drug Interaction"

    session = models.ForeignKey(Session, on_delete=models.CASCADE, related_name="clinical_flags")
    document = models.ForeignKey(Document, on_delete=models.CASCADE, null=True, blank=True, related_name="clinical_flags")
    flag_type = models.CharField(max_length=30, choices=FlagType.choices)
    detail = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)


class Summary(models.Model):
    session = models.OneToOneField(Session, on_delete=models.CASCADE, related_name="summary")
    structured_json = models.JSONField(default=dict)
    edited_by_doctor = models.BooleanField(default=False)
    doctor_notes = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


class ConsentRecord(models.Model):
    session = models.ForeignKey(Session, on_delete=models.CASCADE, related_name="consent_records")
    scope = models.JSONField(default=dict)
    granted_at = models.DateTimeField(auto_now_add=True)
    revoked_at = models.DateTimeField(null=True, blank=True)


class ABDMPushLog(models.Model):
    session = models.ForeignKey(Session, on_delete=models.CASCADE, related_name="abdm_push_logs")
    fhir_bundle = models.JSONField(default=dict)
    status = models.CharField(max_length=20, default="success")
    response_payload = models.JSONField(default=dict)
    attempted_at = models.DateTimeField(auto_now_add=True)
