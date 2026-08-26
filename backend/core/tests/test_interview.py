from unittest.mock import patch
from rest_framework.test import APITestCase
from core.models import Session, Transcript


class InterviewTests(APITestCase):
    @patch("core.views.llm.get_first_question", return_value={"question": "What is troubling you?", "chips": ["Pain"]})
    def test_start(self, mock_llm):
        r = self.client.post("/api/interview/start/", {"patient_name": "Asha", "language": "en"}, format="json")
        self.assertEqual(r.status_code, 201); self.assertEqual(Transcript.objects.count(), 1)

    @patch("core.views.llm.get_next_question", return_value={"question": None, "chips": [], "done": True})
    @patch("core.views.llm.get_first_question", return_value={"question": "Start?", "chips": []})
    def test_keyword_red_flag(self, *_):
        session_id = self.client.post("/api/interview/start/", {"patient_name": "Asha", "language": "en"}, format="json").data["session_id"]
        r = self.client.post("/api/interview/respond/", {"session_id": session_id, "answer": "I can't breathe", "input_mode": "voice"}, format="json")
        self.assertTrue(r.data["red_flag"]); self.assertTrue(Session.objects.get(pk=session_id).red_flag)
