from unittest.mock import patch
from PIL import Image
from io import BytesIO
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APITestCase
from core.models import Patient, Session


class DocumentTests(APITestCase):
    @patch("core.views.ocr.extract", return_value={"extracted_text": "Rx", "fields": {"medicines": ["Paracetamol"]}, "confidence": .9})
    def test_upload(self, _):
        session = Session.objects.create(patient=Patient.objects.create(name="A", language="en"))
        out = BytesIO(); Image.new("RGB", (5, 5)).save(out, "PNG")
        file = SimpleUploadedFile("rx.png", out.getvalue(), content_type="image/png")
        r = self.client.post("/api/documents/upload/", {"session_id": session.id, "image": file}, format="multipart")
        self.assertEqual(r.status_code, 201); self.assertEqual(r.data["confidence"], .9)
