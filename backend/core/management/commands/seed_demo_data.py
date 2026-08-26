from django.core.management.base import BaseCommand
from core.models import Patient, Session, Transcript


class Command(BaseCommand):
    help = "Creates one demo MediKiosk patient session."
    def handle(self, *args, **options):
        patient, _ = Patient.objects.get_or_create(name="Demo Patient", language="en", defaults={"abha_id": "MOCK-DEMO-001"})
        session, created = Session.objects.get_or_create(patient=patient, status=Session.Status.IN_PROGRESS)
        if created:
            Transcript.objects.bulk_create([
                Transcript(session=session, turn=1, speaker="ai", text="What brings you in today?"),
                Transcript(session=session, turn=2, speaker="patient", text="I have had a headache for two days.", input_mode="touch"),
                Transcript(session=session, turn=3, speaker="ai", text="Where is the headache located and how severe is it?"),
            ])
        self.stdout.write(self.style.SUCCESS(f"Demo session ready: {session.id}"))
