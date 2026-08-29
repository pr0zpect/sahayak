from . import llm

# ---------------------------------------------------------------------------
# Expanded keyword floor — organized by clinical category
# Includes common Hindi phrasings for highest-severity categories
# The keyword floor is the safety net: it works even if the LLM is offline.
# ---------------------------------------------------------------------------
CRITICAL_KEYWORDS = [
    # Breathing
    "can't breathe", "cannot breathe", "gasping", "choking", "chest feels tight",
    "saans nahi aa rahi", "सांस नहीं आ रही", "दम घुट रहा है",
    # Cardiac
    "severe chest pain", "crushing pain", "chest pain radiating", "left arm pain",
    "jaw pain with chest pain",
    "seene mein bahut dard", "सीने में बहुत दर्द",
    # Neurological
    "can't move my", "face drooping", "slurred speech", "sudden confusion",
    "worst headache of my life", "seizure", "fainted", "unconscious", "unresponsive",
    "behosh", "बेहोश", "होश नहीं",
    # Bleeding
    "heavy bleeding", "won't stop bleeding", "vomiting blood", "blood in stool",
    "bahut khoon", "बहुत खून बह रहा",
    # Mental health
    "want to die", "suicidal", "going to hurt myself", "end my life",
    "marna chahta", "मरना चाहता हूँ", "जीना नहीं चाहता",
    # Obstetric
    "severe bleeding pregnant", "baby not moving",
]

MODERATE_KEYWORDS = [
    # General concerns that warrant closer review but aren't immediately life-threatening
    "chest pain", "difficulty breathing", "high fever", "blood pressure very high",
    "sudden weight loss", "severe headache", "blurry vision", "numbness",
    "seene mein dard", "सीने में दर्द", "तेज बुखार",
]

# Common non-emergency phrases to exclude from LLM red-flag false alarms
NON_EMERGENCY_EXCLUSIONS = (
    "right now", "today", "yesterday", "upper", "lower",
    "tummy pain", "mild", "moderate", "more than a week",
    "a few days ago", "about a week ago", "2-3 days ago",
)


def check(text, full_transcript=None):
    """
    Two-layer red-flag detection:
    1. Keyword floor (instant, works offline) — catches obvious emergencies
    2. LLM secondary check (runs on every turn) — catches nuanced phrasing

    Returns: {"flagged": bool, "reason": str, "method": str, "severity": str}
    """
    lower = (text or "").strip().lower()

    # Layer 1: Critical keyword floor
    for phrase in CRITICAL_KEYWORDS:
        if phrase in lower:
            return {
                "flagged": True,
                "reason": f"Matched critical emergency phrase: {phrase}",
                "method": "keyword",
                "severity": "critical",
            }

    # Layer 1b: Moderate keyword check
    for phrase in MODERATE_KEYWORDS:
        if phrase in lower:
            return {
                "flagged": True,
                "reason": f"Matched moderate concern phrase: {phrase}",
                "method": "keyword",
                "severity": "moderate",
            }

    # Skip LLM check for very short routine answers (timing chips, etc.)
    if lower in NON_EMERGENCY_EXCLUSIONS or len(lower.split()) <= 2:
        return {"flagged": False, "reason": None, "method": "none", "severity": None}

    # Layer 2: LLM nuanced assessment — runs on every substantive turn
    try:
        result = llm.check_red_flag(text or "")
        if result.get("flagged"):
            severity = result.get("severity", "moderate")
            if severity not in ("critical", "moderate"):
                severity = "moderate"
            return {
                "flagged": True,
                "reason": result.get("reason") or "Potential emergency symptom",
                "method": "llm",
                "severity": severity,
            }
    except Exception as e:
        # LLM failure must never block the flow — keyword floor already ran
        print(f"[RED FLAG LLM ERROR] {e}")

    return {"flagged": False, "reason": None, "method": "none", "severity": None}
