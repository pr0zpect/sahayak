from django.core.management.base import BaseCommand
from core.models import ClinicalFlag, ConsentRecord, Document, Patient, Session, Summary, Transcript


class Command(BaseCommand):
    help = "Creates full-scope demo Sahayak patients, sessions (Allopathic + AYUSH), OCR document, and clinical safety flags."

    def handle(self, *args, **options):
        # 1. Allopathic Demo Patient
        patient1, _ = Patient.objects.get_or_create(
            name="Demo Patient (Allopathic)",
            language="en",
            defaults={"abha_id": "MOCK-DEMO-001", "abha_number": "91-1234-5678-9012", "preferred_language": "en"}
        )
        session1, _ = Session.objects.get_or_create(patient=patient1, mode=Session.Mode.ALLOPATHIC, defaults={"status": Session.Status.IN_PROGRESS})

        if not session1.transcripts.exists():
            Transcript.objects.bulk_create([
                Transcript(session=session1, turn=1, speaker="ai", text="What brings you in today?"),
                Transcript(session=session1, turn=2, speaker="patient", text="I have had severe chest pain and fever.", input_mode="touch"),
                Transcript(session=session1, turn=3, speaker="ai", text="When did the chest pain start and how severe is it?"),
            ])

        # 2. AYUSH (Ayurvedic) Demo Patient
        patient2, _ = Patient.objects.get_or_create(
            name="Rukmini Devi (AYUSH)",
            language="hi",
            defaults={"abha_id": "MOCK-AYUSH-002", "abha_number": "91-9876-5432-1098", "preferred_language": "hi"}
        )
        session2, _ = Session.objects.get_or_create(patient=patient2, mode=Session.Mode.AYUSH, defaults={"status": Session.Status.SUMMARY_READY})

        if not session2.transcripts.exists():
            Transcript.objects.bulk_create([
                Transcript(session=session2, turn=1, speaker="ai", text="Namaste! Welcome to Ayurvedic Intake. What brings you in today, and how would you describe your digestion and energy?"),
                Transcript(session=session2, turn=2, speaker="patient", text="I have gas, indigestion, and stiffness in my knees.", input_mode="touch"),
                Transcript(session=session2, turn=3, speaker="ai", text="How is your appetite (Agni) and bowel movement pattern (Koshtha)?"),
                Transcript(session=session2, turn=4, speaker="patient", text="Appetite is irregular, and bowels are constipated.", input_mode="touch"),
            ])

        # 3. Clinical Safety Sample Flags (Abnormal Lab Value & Drug Interaction)
        doc, _ = Document.objects.get_or_create(
            session=session1,
            defaults={
                "extracted_text": "CITY HOSPITAL REPORT\nPatient: Asha Sharma\nFasting Blood Sugar: 240 mg/dL (Abnormal High)\nRx:\n1. Tab. Warfarin 5mg - 1-0-0\n2. Tab. Aspirin 75mg - 0-1-0",
                "extracted_fields": {"diagnosis": "Uncontrolled Diabetes", "medicines": ["Warfarin 5mg", "Aspirin 75mg"], "date": "26-Aug-2026"},
                "confidence": 0.88,
                "ocr_method": "printed"
            }
        )

        ClinicalFlag.objects.get_or_create(
            session=session1,
            document=doc,
            flag_type=ClinicalFlag.FlagType.ABNORMAL_VALUE,
            defaults={
                "detail": {
                    "test_name": "Fasting Blood Sugar",
                    "value": 240,
                    "reference_range": "70 - 100 mg/dL",
                    "status": "HIGH",
                    "severity": "High"
                }
            }
        )

        ClinicalFlag.objects.get_or_create(
            session=session1,
            document=doc,
            flag_type=ClinicalFlag.FlagType.DRUG_INTERACTION,
            defaults={
                "detail": {
                    "interacting_pair": ["Warfarin", "Aspirin"],
                    "severity": "High",
                    "description": "Increased risk of severe internal bleeding when anticoagulant is combined with antiplatelet agent."
                }
            }
        )

        ConsentRecord.objects.get_or_create(
            session=session1,
            defaults={"scope": {"intake_interview": True, "ocr_scanning": True, "abdm_sharing": True}}
        )

        # Seed Summary for Session 2 (AYUSH)
        Summary.objects.get_or_create(
            session=session2,
            defaults={
                "structured_json": {
                    "chief_complaint": {"text": "Gas, indigestion, and knee joint stiffness.", "source_turns": [2]},
                    "hpi": {"text": "Patient reports irregular appetite and constipation for past 2 weeks.", "source_turns": [4]},
                    "pmh": {"text": "Not reported.", "source_turns": []},
                    "drug_allergy": {"text": "None reported.", "source_turns": []},
                    "family_history": {"text": "Not reported.", "source_turns": []},
                    "personal_history": {"text": "Irregular meal timings, low physical activity.", "source_turns": [4]},
                    "ros": {"text": "Gastrointestinal and musculoskeletal symptoms.", "source_turns": [2]},
                    "prakriti_assessment": {"text": "Vata-Kapha dominant constitution.", "source_turns": [2, 4]},
                    "agni_koshtha": {"text": "Vishamagni with Krura Koshtha.", "source_turns": [4]},
                    "ahara_vihara_habits": {"text": "Irregular intake of dry/cold food.", "source_turns": [4]},
                    "vikriti_patterns": {"text": "Vata aggravation causing joint stiffness and constipation.", "source_turns": [2, 4]}
                }
            }
        )

        self.stdout.write(self.style.SUCCESS(f"Demo sessions ready: Session #{session1.id} (Allopathic) and Session #{session2.id} (AYUSH)"))
