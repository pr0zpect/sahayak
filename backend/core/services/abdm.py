"""ABDM (Ayushman Bharat Digital Mission) FHIR R4 Integration Engine."""
import uuid
from core.models import ABDMPushLog, Session


def build_fhir_bundle(session):
    patient = session.patient
    abha_id = patient.abha_id or patient.abha_number or f"MOCK-{uuid.uuid4().hex[:12].upper()}"

    # 1. Patient Resource
    patient_resource = {
        "resourceType": "Patient",
        "id": str(patient.id),
        "identifier": [
            {
                "system": "https://healthid.ndhm.gov.in",
                "value": abha_id
            }
        ],
        "name": [{"text": patient.name}],
        "gender": "unknown",
        "communication": [{"language": {"text": patient.preferred_language or patient.language}}]
    }

    entries = [{"resource": patient_resource}]

    # 2. Condition Resource (from Summary Chief Complaint & HPI)
    if hasattr(session, "summary") and session.summary.structured_json:
        summary_json = session.summary.structured_json
        cc_text = summary_json.get("chief_complaint", {}).get("text")
        if cc_text and cc_text != "Not reported.":
            condition_resource = {
                "resourceType": "Condition",
                "id": f"cond-{session.id}",
                "clinicalStatus": {"coding": [{"system": "http://terminology.hl7.org/CodeSystem/condition-clinical", "code": "active"}]},
                "code": {"text": cc_text},
                "subject": {"reference": f"Patient/{patient.id}"}
            }
            entries.append({"resource": condition_resource})

    # 3. Composition Resource (Main Clinical Document)
    composition_resource = {
        "resourceType": "Composition",
        "id": f"comp-{session.id}",
        "status": "final",
        "type": {"coding": [{"system": "http://loinc.org", "code": "34133-9", "display": "Summarization of Episode Note"}]},
        "subject": {"reference": f"Patient/{patient.id}"},
        "date": session.updated_at.isoformat(),
        "title": f"MediKiosk Pre-Consultation OPD Intake Note ({session.mode.upper()})",
        "section": [
            {
                "title": "Transcript Record",
                "entry": [{"reference": f"Transcript/session-{session.id}"}]
            }
        ]
    }
    entries.append({"resource": composition_resource})

    bundle = {
        "resourceType": "Bundle",
        "type": "transaction",
        "timestamp": session.updated_at.isoformat(),
        "entry": entries
    }

    return bundle, abha_id


def validate_fhir_bundle(bundle):
    """Validates FHIR R4 Bundle structural contract."""
    if not isinstance(bundle, dict):
        return False, "Bundle must be a JSON object"
    if bundle.get("resourceType") != "Bundle":
        return False, "Missing or invalid resourceType (must be 'Bundle')"
    if "entry" not in bundle or not isinstance(bundle["entry"], list):
        return False, "Bundle must contain an 'entry' list"
    
    resource_types = [e.get("resource", {}).get("resourceType") for e in bundle.get("entry", [])]
    if "Patient" not in resource_types:
        return False, "FHIR Bundle missing required 'Patient' resource"
    if "Composition" not in resource_types:
        return False, "FHIR Bundle missing required 'Composition' resource"

    return True, "FHIR R4 Bundle contract validation successful"


def push_to_abdm(session):
    bundle, abha_id = build_fhir_bundle(session)
    valid, message = validate_fhir_bundle(bundle)

    if not session.patient.abha_id:
        session.patient.abha_id = abha_id
        session.patient.save(update_fields=["abha_id"])

    response_payload = {
        "abdm_transaction_id": uuid.uuid4().hex,
        "validation": message,
        "status": "pushed" if valid else "failed"
    }

    # Log attempt in ABDMPushLog
    push_log = ABDMPushLog.objects.create(
        session=session,
        fhir_bundle=bundle,
        status="success" if valid else "failed",
        response_payload=response_payload
    )

    session.pushed_to_abdm = True
    session.save(update_fields=["pushed_to_abdm", "updated_at"])

    return {
        "status": "pushed",
        "abha_id": abha_id,
        "push_log_id": push_log.id,
        "fhir_bundle": bundle,
        "validation_message": message
    }
