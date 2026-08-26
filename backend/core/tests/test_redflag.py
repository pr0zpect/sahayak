from unittest.mock import patch
from rest_framework.test import APITestCase


class RedFlagTests(APITestCase):
    @patch("core.services.redflag_rules.llm.check_red_flag")
    def test_keyword_does_not_call_llm(self, check):
        r = self.client.post("/api/redflag/check/", {"text": "severe chest pain"}, format="json")
        self.assertEqual(r.data["method"], "keyword"); check.assert_not_called()
