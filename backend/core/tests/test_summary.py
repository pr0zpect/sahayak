from unittest.mock import patch
from django.contrib.auth.models import User
from rest_framework.authtoken.models import Token
from rest_framework.test import APITestCase
from core.models import Patient, Session, Transcript


class SummaryTests(APITestCase):
    def setUp(self):
        self.session = Session.objects.create(patient=Patient.objects.create(name="A", language="en"))
        Transcript.objects.create(session=self.session, turn=1, speaker="patient", text="Fever")
        self.summary = {k: {"text": "Not reported.", "source_turns": []} for k in ("chief_complaint", "hpi", "pmh", "drug_allergy", "family_history", "personal_history", "ros")}
    @patch("core.views.llm.generate_summary")
    def test_generate_and_protected_patch(self, generate):
        generate.return_value = self.summary
        self.assertEqual(self.client.post("/api/summary/generate/", {"session_id": self.session.id}, format="json").status_code, 200)
        url = f"/api/summary/{self.session.id}/"
        self.assertEqual(self.client.patch(url, {"structured_json": self.summary}, format="json").status_code, 401)
        user = User.objects.create_user("doctor", password="pass"); token = Token.objects.create(user=user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")
        self.assertEqual(self.client.patch(url, {"structured_json": self.summary, "doctor_notes": "Reviewed"}, format="json").status_code, 200)
