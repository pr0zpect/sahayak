"""
Demo-scale, rule-based drug interaction checker for MediKiosk.
This is intentionally a small, hardcoded reference list for hackathon demo
purposes — it is NOT a claim of clinical completeness and must not be used
as a substitute for a real, licensed clinical drug interaction database.
All alerts are flagged for clinician review only.
"""

KNOWN_INTERACTIONS = [
    {
        "drug_a": "warfarin",
        "drug_b": "aspirin",
        "severity": "high",
        "note": "Increased bleeding risk — flagged for clinician review.",
    },
    {
        "drug_a": "metformin",
        "drug_b": "contrast dye",
        "severity": "moderate",
        "note": "Risk of lactic acidosis with iodinated contrast; often held before imaging — flagged for clinician review.",
    },
    {
        "drug_a": "ibuprofen",
        "drug_b": "lisinopril",
        "severity": "moderate",
        "note": "NSAIDs may reduce ACE inhibitor effectiveness and affect kidney function — flagged for clinician review.",
    },
    {
        "drug_a": "simvastatin",
        "drug_b": "clarithromycin",
        "severity": "high",
        "note": "Increased risk of myopathy/rhabdomyolysis — flagged for clinician review.",
    },
    {
        "drug_a": "methotrexate",
        "drug_b": "ibuprofen",
        "severity": "high",
        "note": "NSAIDs may reduce methotrexate clearance, increasing toxicity risk — flagged for clinician review.",
    },
    {
        "drug_a": "digoxin",
        "drug_b": "amiodarone",
        "severity": "high",
        "note": "Amiodarone increases digoxin levels, risking toxicity — flagged for clinician review.",
    },
    {
        "drug_a": "sildenafil",
        "drug_b": "nitrates",
        "severity": "high",
        "note": "Combination can cause severe hypotension — flagged for clinician review.",
    },
    {
        "drug_a": "warfarin",
        "drug_b": "ibuprofen",
        "severity": "high",
        "note": "NSAIDs may potentiate anticoagulant effect and increase GI bleeding risk — flagged for clinician review.",
    },
    {
        "drug_a": "clopidogrel",
        "drug_b": "omeprazole",
        "severity": "moderate",
        "note": "Omeprazole may reduce clopidogrel's antiplatelet effect — flagged for clinician review.",
    },
    {
        "drug_a": "lithium",
        "drug_b": "ibuprofen",
        "severity": "moderate",
        "note": "NSAIDs can raise lithium levels; risk of lithium toxicity — flagged for clinician review.",
    },
]


def check_interactions(medicine_list: list) -> list:
    """
    Given a list of medicine name strings (as extracted from OCR or the interview),
    returns any matching known interaction pairs found within that list.

    Matching is case-insensitive and substring-based — e.g. "Tab. Aspirin 75mg"
    matches "aspirin".

    Returns an empty list if no known pairs are present, or on any error.
    This function is pure, deterministic, and makes no LLM or network calls.
    """
    try:
        if not medicine_list or not isinstance(medicine_list, list):
            return []

        # Normalise: lowercase, strip — keep original for display but match lowercase
        normalised = [str(m).lower().strip() for m in medicine_list if m]

        found = []
        for interaction in KNOWN_INTERACTIONS:
            a = interaction["drug_a"].lower()
            b = interaction["drug_b"].lower()

            a_present = any(a in med for med in normalised)
            b_present = any(b in med for med in normalised)

            if a_present and b_present:
                found.append({
                    "drug_a": interaction["drug_a"],
                    "drug_b": interaction["drug_b"],
                    "severity": interaction["severity"],
                    "note": interaction["note"],
                })

        return found
    except Exception as e:
        print(f"[DRUG INTERACTION CHECK ERROR] {e}")
        return []
