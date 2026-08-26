import uuid
from django.contrib.auth import authenticate
from django.db.models import Max
from rest_framework.authtoken.models import Token
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import Document, Patient, Session, Summary, Transcript
from .serializers import (DocumentSerializer, LoginSerializer, RedFlagSerializer, RespondSerializer,
                          SessionIdSerializer, StartInterviewSerializer, SummaryPatchSerializer,
                          SummarySerializer, TranscriptSerializer, UploadDocumentSerializer)
from .services import llm, ocr, redflag_rules


def _session(pk):
    try: return Session.objects.get(pk=pk)
    except Session.DoesNotExist: return None
def _next_turn(session): return (session.transcripts.aggregate(maximum=Max("turn"))["maximum"] or 0) + 1
def _history(session): return [{"turn": t.turn, "speaker": t.speaker, "text": t.text} for t in session.transcripts.all()]


class InterviewStartView(APIView):
    def post(self, request):
        form = StartInterviewSerializer(data=request.data); form.is_valid(raise_exception=True)
        data = form.validated_data
        patient, _ = Patient.objects.get_or_create(name=data["patient_name"], language=data["language"], defaults={"abha_id": data.get("abha_id")})
        if data.get("abha_id") and not patient.abha_id: patient.abha_id = data["abha_id"]; patient.save(update_fields=["abha_id"])
        session = Session.objects.create(patient=patient)
        question = llm.get_first_question()
        text = question.get("question", "What brings you in today?")
        Transcript.objects.create(session=session, turn=1, speaker="ai", text=text)
        return Response({"session_id": session.id, "question": text, "chips": question.get("chips", [])}, status=201)


class InterviewRespondView(APIView):
    def post(self, request):
        form = RespondSerializer(data=request.data); form.is_valid(raise_exception=True); data = form.validated_data
        session = _session(data["session_id"])
        if not session: return Response({"detail": "Session not found."}, status=404)
        Transcript.objects.create(session=session, turn=_next_turn(session), speaker="patient", text=data["answer"], input_mode=data["input_mode"])
        flag = redflag_rules.check(data["answer"], _history(session))
        if flag["flagged"]:
            session.red_flag, session.red_flag_reason = True, flag["reason"]
        next_item = llm.get_next_question(_history(session))
        if next_item.get("done"):
            session.status = Session.Status.AWAITING_SUMMARY; session.save()
            return Response({"question": None, "chips": [], "done": True, "red_flag": session.red_flag, "red_flag_reason": session.red_flag_reason})
        text = next_item.get("question") or "Could you tell me more about your symptoms?"
        Transcript.objects.create(session=session, turn=_next_turn(session), speaker="ai", text=text)
        session.save()
        return Response({"question": text, "chips": next_item.get("chips", []), "done": False, "red_flag": session.red_flag, "red_flag_reason": session.red_flag_reason})


class DocumentUploadView(APIView):
    def post(self, request):
        form = UploadDocumentSerializer(data=request.data); form.is_valid(raise_exception=True); data = form.validated_data
        session = _session(data["session_id"])
        if not session: return Response({"detail": "Session not found."}, status=404)
        result = ocr.extract(data["image"])
        doc = Document.objects.create(session=session, image=data["image"], extracted_text=result["extracted_text"], extracted_fields=result["fields"], confidence=result["confidence"])
        return Response({"document_id": doc.id, "extracted_text": doc.extracted_text, "fields": doc.extracted_fields, "confidence": doc.confidence}, status=201)


class SummaryGenerateView(APIView):
    def post(self, request):
        form = SessionIdSerializer(data=request.data); form.is_valid(raise_exception=True)
        session = _session(form.validated_data["session_id"])
        if not session: return Response({"detail": "Session not found."}, status=404)
        documents = [{"id": d.id, "fields": d.extracted_fields, "text": d.extracted_text} for d in session.documents.all()]
        structured = llm.generate_summary(_history(session), documents)
        Summary.objects.update_or_create(session=session, defaults={"structured_json": structured})
        session.status = Session.Status.SUMMARY_READY; session.save(update_fields=["status", "updated_at"])
        return Response(structured)


class SummaryDetailView(APIView):
    permission_classes = [IsAuthenticated]
    def get(self, request, session_id):
        session = _session(session_id)
        if not session: return Response({"detail": "Session not found."}, status=404)
        try: summary = session.summary
        except Summary.DoesNotExist: return Response({"detail": "Summary not found."}, status=404)
        return Response({"summary": SummarySerializer(summary).data, "transcripts": TranscriptSerializer(session.transcripts.all(), many=True).data, "documents": DocumentSerializer(session.documents.all(), many=True).data})
    def patch(self, request, session_id):
        session = _session(session_id)
        if not session: return Response({"detail": "Session not found."}, status=404)
        try: summary = session.summary
        except Summary.DoesNotExist: return Response({"detail": "Summary not found."}, status=404)
        form = SummaryPatchSerializer(data=request.data); form.is_valid(raise_exception=True)
        summary.structured_json = form.validated_data["structured_json"]
        if "doctor_notes" in form.validated_data: summary.doctor_notes = form.validated_data["doctor_notes"]
        summary.edited_by_doctor = True; summary.save()
        session.status = Session.Status.DOCTOR_REVIEWED; session.save(update_fields=["status", "updated_at"])
        return Response(SummarySerializer(summary).data)


class RedFlagCheckView(APIView):
    def post(self, request):
        form = RedFlagSerializer(data=request.data); form.is_valid(raise_exception=True)
        return Response(redflag_rules.check(form.validated_data["text"]))


class MockAbdmPushView(APIView):
    def post(self, request):
        form = SessionIdSerializer(data=request.data); form.is_valid(raise_exception=True)
        session = _session(form.validated_data["session_id"])
        if not session: return Response({"detail": "Session not found."}, status=404)
        if not session.patient.abha_id:
            session.patient.abha_id = f"MOCK-{uuid.uuid4().hex[:12].upper()}"; session.patient.save(update_fields=["abha_id"])
        session.pushed_to_abdm = True; session.save(update_fields=["pushed_to_abdm", "updated_at"])
        bundle = {"resourceType": "Bundle", "type": "transaction", "entry": [{"resource": {"resourceType": "Patient", "id": str(session.patient_id), "identifier": [{"value": session.patient.abha_id}]}}]}
        return Response({"status": "pushed", "abha_id": session.patient.abha_id, "fhir_bundle": bundle})


class LoginView(APIView):
    def post(self, request):
        form = LoginSerializer(data=request.data); form.is_valid(raise_exception=True)
        user = authenticate(username=form.validated_data["username"], password=form.validated_data["password"])
        if not user: return Response({"detail": "Invalid credentials."}, status=400)
        token, _ = Token.objects.get_or_create(user=user)
        return Response({"token": token.key})
