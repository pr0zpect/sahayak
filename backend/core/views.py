import random
import string
import uuid
from django.contrib.auth import authenticate
from django.db.models import Max
from django.utils import timezone
from rest_framework.authtoken.models import Token
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import ABDMPushLog, ClinicalFlag, ConsentRecord, Document, Patient, Session, Summary, Transcript
from .serializers import (
    ABDMPushLogSerializer, AbdmAuthSerializer, ClinicalFlagSerializer, ConsentRecordSerializer,
    ConsentRevokeSerializer, ConsentSerializer, DocumentSerializer, LoginSerializer,
    RedFlagSerializer, RespondSerializer, SessionIdSerializer, StartInterviewSerializer,
    SummaryPatchSerializer, SummarySerializer, TokenGenerateSerializer, TokenValidateSerializer,
    TranscriptSerializer, UploadDocumentSerializer
)
from .services import abdm, clinical_checks, drug_interactions, llm, ocr, redflag_rules


def _session(pk):
    try: return Session.objects.get(pk=pk)
    except Session.DoesNotExist: return None

def _next_turn(session):
    return (session.transcripts.aggregate(maximum=Max("turn"))["maximum"] or 0) + 1

def _history(session):
    return [{"turn": t.turn, "speaker": t.speaker, "text": t.text} for t in session.transcripts.all()]


class InterviewStartView(APIView):
    def post(self, request):
        form = StartInterviewSerializer(data=request.data)
        form.is_valid(raise_exception=True)
        data = form.validated_data

        patient, _ = Patient.objects.get_or_create(
            name=data["patient_name"],
            language=data["language"],
            defaults={"abha_id": data.get("abha_id"), "abha_number": data.get("abha_number"), "preferred_language": data["language"]}
        )

        session = Session.objects.create(patient=patient, mode=data.get("mode", "allopathic"))
        question = llm.get_first_question(mode=session.mode)
        text = question.get("question", "What brings you in today?")

        Transcript.objects.create(session=session, turn=1, speaker="ai", text=text, language=data["language"])

        # Auto-grant initial intake consent record
        ConsentRecord.objects.create(
            session=session,
            scope={"intake_interview": True, "ocr_scanning": True, "abdm_sharing": True}
        )

        return Response({
            "session_id": session.id,
            "mode": session.mode,
            "question": text,
            "chips": question.get("chips", []),
            "escape_hatch": "Something else / not sure",
            "input_type": "options"
        }, status=201)


class InterviewRespondView(APIView):
    def post(self, request):
        form = RespondSerializer(data=request.data)
        form.is_valid(raise_exception=True)
        data = form.validated_data

        session = _session(data["session_id"])
        if not session:
            return Response({"detail": "Session not found."}, status=404)

        Transcript.objects.create(
            session=session,
            turn=_next_turn(session),
            speaker="patient",
            text=data["answer"],
            input_mode=data["input_mode"],
            language=data.get("language", session.patient.language)
        )

        flag = redflag_rules.check(data["answer"], _history(session))
        if flag["flagged"]:
            session.red_flag, session.red_flag_reason = True, flag["reason"]

        next_item = llm.get_next_question(_history(session), mode=session.mode)

        if next_item.get("done"):
            session.status = Session.Status.AWAITING_SUMMARY
            session.save()
            return Response({
                "question": None,
                "chips": [],
                "escape_hatch": None,
                "input_type": None,
                "done": True,
                "needs_clarification": False,
                "red_flag": session.red_flag,
                "red_flag_reason": session.red_flag_reason
            })

        text = next_item.get("question") or "Could you describe when this started and how severe it is?"
        # Detect and store clarification flag — once set it remains set for the session
        if next_item.get("needs_clarification") and not session.needed_clarification:
            session.needed_clarification = True
        Transcript.objects.create(session=session, turn=_next_turn(session), speaker="ai", text=text)
        session.save()

        return Response({
            "question": text,
            "chips": next_item.get("chips", []),
            "escape_hatch": next_item.get("escape_hatch"),
            "input_type": next_item.get("input_type", "options"),
            "done": False,
            "needs_clarification": next_item.get("needs_clarification", False),
            "red_flag": session.red_flag,
            "red_flag_reason": session.red_flag_reason
        })


class DocumentUploadView(APIView):
    def post(self, request):
        form = UploadDocumentSerializer(data=request.data)
        form.is_valid(raise_exception=True)
        data = form.validated_data

        session = _session(data["session_id"])
        if not session:
            return Response({"detail": "Session not found."}, status=404)

        result = ocr.extract(data["image"], session=session)
        doc = Document.objects.create(
            session=session,
            image=data["image"],
            extracted_text=result["extracted_text"],
            extracted_fields=result["fields"],
            confidence=result["confidence"],
            ocr_method=result.get("ocr_method", "printed")
        )

        # Run clinical safety checks (abnormal lab values & drug interactions)
        flags = clinical_checks.analyze_document_fields(session, doc, doc.extracted_fields)

        # Run drug-interaction check on extracted medicines (rule-based, no LLM)
        medicines = doc.extracted_fields.get("medicines", []) or []
        interaction_alerts = drug_interactions.check_interactions(medicines)

        return Response({
            "document_id": doc.id,
            "extracted_text": doc.extracted_text,
            "fields": doc.extracted_fields,
            "confidence": doc.confidence,
            "ocr_method": doc.ocr_method,
            "clinical_flags": ClinicalFlagSerializer(flags, many=True).data,
            "interaction_alerts": interaction_alerts,
        }, status=201)


class SummaryGenerateView(APIView):
    def post(self, request):
        form = SessionIdSerializer(data=request.data)
        form.is_valid(raise_exception=True)
        session = _session(form.validated_data["session_id"])
        if not session:
            return Response({"detail": "Session not found."}, status=404)

        documents = [{"id": d.id, "fields": d.extracted_fields, "text": d.extracted_text} for d in session.documents.all()]
        structured = llm.generate_summary(_history(session), documents, mode=session.mode)

        Summary.objects.update_or_create(session=session, defaults={"structured_json": structured})
        session.status = Session.Status.SUMMARY_READY
        session.save(update_fields=["status", "updated_at"])
        return Response(structured)


class SummaryDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, session_id):
        session = _session(session_id)
        if not session:
            return Response({"detail": "Session not found."}, status=404)

        try: summary = session.summary
        except Summary.DoesNotExist: return Response({"detail": "Summary not found."}, status=404)

        return Response({
            "mode": session.mode,
            "summary": SummarySerializer(summary).data,
            "transcripts": TranscriptSerializer(session.transcripts.all(), many=True).data,
            "documents": DocumentSerializer(session.documents.all(), many=True).data,
            "clinical_flags": ClinicalFlagSerializer(session.clinical_flags.all(), many=True).data,
            "consent_records": ConsentRecordSerializer(session.consent_records.all(), many=True).data,
            "abdm_logs": ABDMPushLogSerializer(session.abdm_push_logs.all(), many=True).data
        })

    def patch(self, request, session_id):
        session = _session(session_id)
        if not session:
            return Response({"detail": "Session not found."}, status=404)

        try: summary = session.summary
        except Summary.DoesNotExist: return Response({"detail": "Summary not found."}, status=404)

        form = SummaryPatchSerializer(data=request.data)
        form.is_valid(raise_exception=True)

        summary.structured_json = form.validated_data["structured_json"]
        if "doctor_notes" in form.validated_data:
            summary.doctor_notes = form.validated_data["doctor_notes"]
        summary.edited_by_doctor = True
        summary.save()

        session.status = Session.Status.DOCTOR_REVIEWED
        session.save(update_fields=["status", "updated_at"])
        return Response(SummarySerializer(summary).data)


class RedFlagCheckView(APIView):
    def post(self, request):
        form = RedFlagSerializer(data=request.data)
        form.is_valid(raise_exception=True)
        return Response(redflag_rules.check(form.validated_data["text"]))


class ConsentGrantView(APIView):
    def post(self, request):
        form = ConsentSerializer(data=request.data)
        form.is_valid(raise_exception=True)
        session = _session(form.validated_data["session_id"])
        if not session:
            return Response({"detail": "Session not found."}, status=404)

        rec = ConsentRecord.objects.create(session=session, scope=form.validated_data["scope"])
        return Response(ConsentRecordSerializer(rec).data, status=201)


class ConsentRevokeView(APIView):
    def post(self, request):
        form = ConsentRevokeSerializer(data=request.data)
        form.is_valid(raise_exception=True)
        try:
            rec = ConsentRecord.objects.get(pk=form.validated_data["consent_id"])
        except ConsentRecord.DoesNotExist:
            return Response({"detail": "Consent record not found."}, status=404)

        rec.revoked_at = timezone.now()
        rec.save(update_fields=["revoked_at"])
        return Response(ConsentRecordSerializer(rec).data)


class AbdmAuthView(APIView):
    def post(self, request):
        form = AbdmAuthSerializer(data=request.data)
        form.is_valid(raise_exception=True)
        number = form.validated_data["abha_number"]
        return Response({
            "status": "authenticated",
            "abha_number": number,
            "abha_id": f"MOCK-{uuid.uuid4().hex[:8].upper()}",
            "txn_id": uuid.uuid4().hex
        })


class MockAbdmPushView(APIView):
    def post(self, request):
        form = SessionIdSerializer(data=request.data)
        form.is_valid(raise_exception=True)
        session = _session(form.validated_data["session_id"])
        if not session:
            return Response({"detail": "Session not found."}, status=404)

        result = abdm.push_to_abdm(session)
        return Response(result)


class LoginView(APIView):
    def post(self, request):
        form = LoginSerializer(data=request.data)
        form.is_valid(raise_exception=True)
        user = authenticate(username=form.validated_data["username"], password=form.validated_data["password"])
        if not user:
            return Response({"detail": "Invalid credentials."}, status=400)
        token, _ = Token.objects.get_or_create(user=user)
        return Response({"token": token.key})


def _generate_token_str():
    """Generate a unique 6-char uppercase alphanumeric token string."""
    chars = string.ascii_uppercase + string.digits
    for _ in range(20):  # retry loop to guarantee uniqueness
        candidate = "".join(random.choices(chars, k=6))
        if not Session.objects.filter(token=candidate).exists():
            return candidate
    raise ValueError("Could not generate unique token after 20 attempts")


class TokenGenerateView(APIView):
    """
    POST /api/token/generate/
    Generates a 6-char session token once the summary is ready.
    No authentication required — the patient kiosk calls this.
    """
    def post(self, request):
        form = TokenGenerateSerializer(data=request.data)
        form.is_valid(raise_exception=True)
        session = _session(form.validated_data["session_id"])
        if not session:
            return Response({"detail": "Session not found."}, status=404)

        # Precondition: summary must already exist
        if session.status not in (Session.Status.SUMMARY_READY, Session.Status.DOCTOR_REVIEWED):
            return Response(
                {"detail": "Summary has not been generated yet. Please generate the summary first."},
                status=400
            )

        # If a token already exists for this session, return it (idempotent)
        if session.token:
            return Response({
                "token": session.token,
                "priority": session.red_flag,
                "expires_at": session.token_expires_at,
            })

        now = timezone.now()
        tok = _generate_token_str()
        session.token = tok
        session.token_status = Session.TokenStatus.PENDING
        session.token_generated_at = now
        session.token_expires_at = now + timezone.timedelta(minutes=15)
        session.save(update_fields=["token", "token_status", "token_generated_at", "token_expires_at", "updated_at"])

        return Response({
            "token": session.token,
            "priority": session.red_flag,
            "expires_at": session.token_expires_at,
        })


class TokenLookupView(APIView):
    """
    GET /api/token/<token>/
    Condensed receptionist view. Requires authentication.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, token):
        try:
            session = Session.objects.get(token=token)
        except Session.DoesNotExist:
            return Response({"detail": "Token not found."}, status=404)

        # Pull chief complaint from summary if available
        chief_complaint = ""
        try:
            sj = session.summary.structured_json
            chief_complaint = sj.get("chief_complaint", {}).get("text", "") or ""
        except (Summary.DoesNotExist, AttributeError):
            pass

        expired = (
            session.token_expires_at is not None
            and timezone.now() > session.token_expires_at
        )

        return Response({
            "session_id": session.id,
            "patient_name": session.patient.name,
            "chief_complaint": chief_complaint,
            "priority": session.red_flag,
            "red_flag_reason": session.red_flag_reason or "",
            "needed_clarification": session.needed_clarification,
            "token_status": session.token_status,
            "expired": expired,
        })


class TokenValidateView(APIView):
    """
    PATCH /api/token/<token>/validate/
    Receptionist approves or rejects a token. Requires authentication.
    """
    permission_classes = [IsAuthenticated]

    def patch(self, request, token):
        try:
            session = Session.objects.get(token=token)
        except Session.DoesNotExist:
            return Response({"detail": "Token not found."}, status=404)

        form = TokenValidateSerializer(data=request.data)
        form.is_valid(raise_exception=True)
        action = form.validated_data["action"]
        reason = form.validated_data.get("reason", None)

        if action == "approve":
            session.token_status = Session.TokenStatus.APPROVED
            session.rejection_reason = None
        elif action == "reject":
            session.token_status = Session.TokenStatus.REJECTED
            session.rejection_reason = reason

        session.save(update_fields=["token_status", "rejection_reason", "updated_at"])

        return Response({
            "token": session.token,
            "token_status": session.token_status,
            "rejection_reason": session.rejection_reason,
            "session_id": session.id,
            "patient_name": session.patient.name,
        })


class TokenRejectionStatusView(APIView):
    """
    GET /api/token/<token>/rejection-status/
    Unauthenticated endpoint — patient kiosk polls this to check for rejection.
    """
    # No permission_classes — intentionally public so the patient kiosk can poll without auth

    def get(self, request, token):
        try:
            session = Session.objects.get(token=token)
        except Session.DoesNotExist:
            return Response({"detail": "Token not found."}, status=404)

        return Response({
            "token": session.token,
            "token_status": session.token_status,
            "rejection_reason": session.rejection_reason,
        })
