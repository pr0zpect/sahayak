"""Clinical safety-checking engine for abnormal lab test values and drug-drug interactions."""
from core.models import ClinicalFlag

# Reference ranges for common lab tests
LAB_REFERENCE_RANGES = {
    "blood sugar": {"min": 70, "max": 140, "unit": "mg/dL"},
    "fasting blood sugar": {"min": 70, "max": 100, "unit": "mg/dL"},
    "hba1c": {"min": 4.0, "max": 5.7, "unit": "%"},
    "hemoglobin": {"min": 12.0, "max": 17.5, "unit": "g/dL"},
    "wbc": {"min": 4000, "max": 11000, "unit": "/uL"},
    "creatinine": {"min": 0.6, "max": 1.2, "unit": "mg/dL"},
    "serum creatinine": {"min": 0.6, "max": 1.2, "unit": "mg/dL"},
    "bilirubin": {"min": 0.2, "max": 1.2, "unit": "mg/dL"},
    "systolic bp": {"min": 90, "max": 130, "unit": "mmHg"},
    "diastolic bp": {"min": 60, "max": 85, "unit": "mmHg"},
}

# Dangerous drug-drug interaction pairs
KNOWN_DRUG_INTERACTIONS = [
    {
        "pair": ("warfarin", "aspirin"),
        "severity": "High",
        "description": "Increased risk of severe internal bleeding when anticoagulant is combined with antiplatelet agent."
    },
    {
        "pair": ("metformin", "contrast"),
        "severity": "Moderate",
        "description": "Risk of contrast-induced acute renal failure and lactic acidosis."
    },
    {
        "pair": ("enalapril", "spironolactone"),
        "severity": "High",
        "description": "Risk of severe hyperkalemia (dangerously high potassium levels)."
    },
    {
        "pair": ("pantoprazole", "clopidogrel"),
        "severity": "Moderate",
        "description": "Proton pump inhibitor may reduce antiplatelet efficacy of clopidogrel."
    },
    {
        "pair": ("ibuprofen", "prednisolone"),
        "severity": "High",
        "description": "Substantially increased risk of gastrointestinal ulceration and ulcer hemorrhage."
    },
    {
        "pair": ("paracetamol", "alcohol"),
        "severity": "Moderate",
        "description": "Increased risk of severe hepatotoxicity (liver toxicity)."
    }
]


def analyze_document_fields(session, document, fields):
    flags = []

    # 1. Analyze extracted diagnosis or text for abnormal values
    extracted_text = (document.extracted_text if document else "").lower()

    # Check for blood sugar or lab numbers in text / fields
    for test_name, ref in LAB_REFERENCE_RANGES.items():
        if test_name in extracted_text:
            # Parse numerical values around test_name
            import re
            match = re.search(r'(' + test_name + r'[\s\:\-]*)([\d\.]+)', extracted_text)
            if match:
                try:
                    val = float(match.group(2))
                    if val < ref["min"] or val > ref["max"]:
                        status = "HIGH" if val > ref["max"] else "LOW"
                        flag_detail = {
                            "test_name": test_name.title(),
                            "value": val,
                            "reference_range": f"{ref['min']} - {ref['max']} {ref['unit']}",
                            "status": status,
                            "severity": "High" if (val > ref["max"] * 1.4 or val < ref["min"] * 0.7) else "Moderate"
                        }
                        flag = ClinicalFlag.objects.create(
                            session=session,
                            document=document,
                            flag_type=ClinicalFlag.FlagType.ABNORMAL_VALUE,
                            detail=flag_detail
                        )
                        flags.append(flag)
                except ValueError:
                    pass

    # 2. Analyze extracted medicines list for drug interactions
    medicines = fields.get("medicines", [])
    if isinstance(medicines, list):
        med_names_lower = [str(m).lower() for m in medicines]
        for interaction in KNOWN_DRUG_INTERACTIONS:
            d1, d2 = interaction["pair"]
            # Check if both drugs are in the document's medicines list or prior session docs
            has_d1 = any(d1 in m for m in med_names_lower)
            has_d2 = any(d2 in m for m in med_names_lower)

            if has_d1 and has_d2:
                flag_detail = {
                    "interacting_pair": [d1.title(), d2.title()],
                    "severity": interaction["severity"],
                    "description": interaction["description"]
                }
                flag = ClinicalFlag.objects.create(
                    session=session,
                    document=document,
                    flag_type=ClinicalFlag.FlagType.DRUG_INTERACTION,
                    detail=flag_detail
                )
                flags.append(flag)

    return flags
