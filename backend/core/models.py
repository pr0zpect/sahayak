from django.db import models


class Patient(models.Model):
    name = models.CharField(max_length=255)
    language = models.CharField(max_length=10, default="en")
    abha_id = models.CharField(max_length=100, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self): return self.name


class Session(models.Model):
    class Status(models.TextChoices):
        IN_PROGRESS = "in_progress", "In progress"
        AWAITING_SUMMARY = "awaiting_summary", "Awaiting summary"
        SUMMARY_READY = "summary_ready", "Summary ready"
        DOCTOR_REVIEWED = "doctor_reviewed", "Doctor reviewed"
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name="sessions")
    status = models.CharField(max_length=30, choices=Status.choices, default=Status.IN_PROGRESS)
    red_flag = models.BooleanField(default=False)
    red_flag_reason = models.TextField(null=True, blank=True)
    pushed_to_abdm = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self): return f"Session {self.pk} — {self.patient.name}"


class Transcript(models.Model):
    class Speaker(models.TextChoices): PATIENT = "patient", "Patient"; AI = "ai", "AI"
    class InputMode(models.TextChoices): VOICE = "voice", "Voice"; TOUCH = "touch", "Touch"
    session = models.ForeignKey(Session, on_delete=models.CASCADE, related_name="transcripts")
    turn = models.PositiveIntegerField()
    speaker = models.CharField(max_length=10, choices=Speaker.choices)
    text = models.TextField()
    input_mode = models.CharField(max_length=10, choices=InputMode.choices, null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["turn", "id"]
        constraints = [models.UniqueConstraint(fields=["session", "turn"], name="unique_session_turn")]


class Document(models.Model):
    session = models.ForeignKey(Session, on_delete=models.CASCADE, related_name="documents")
    image = models.ImageField(upload_to="documents/")
    extracted_text = models.TextField(blank=True)
    extracted_fields = models.JSONField(default=dict)
    confidence = models.FloatField(default=0)
    uploaded_at = models.DateTimeField(auto_now_add=True)


class Summary(models.Model):
    session = models.OneToOneField(Session, on_delete=models.CASCADE, related_name="summary")
    structured_json = models.JSONField(default=dict)
    edited_by_doctor = models.BooleanField(default=False)
    doctor_notes = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
