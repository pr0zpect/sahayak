from . import llm

RED_FLAG_KEYWORDS = ("severe chest pain", "can't breathe", "cannot breathe", "unconscious", "heavy bleeding", "suicidal", "seizure")


# Common non-emergency phrases to exclude from LLM red-flag false alarms
NON_EMERGENCY_EXCLUSIONS = ("right now", "today", "yesterday", "upper", "lower", "tummy pain", "mild", "moderate", "more than a week", "a few days ago")


def check(text, full_transcript=None):
    # Keyword rules are the safety floor: LLM availability or judgement must never be
    # the only protection against obvious emergencies.
    lower = (text or "").strip().lower()
    for phrase in RED_FLAG_KEYWORDS:
        if phrase in lower:
            return {"flagged": True, "reason": f"Matched emergency phrase: {phrase}", "method": "keyword"}

    # If the response is a short routine answer, skip LLM red flag check to prevent false positives
    if lower in NON_EMERGENCY_EXCLUSIONS or len(lower.split()) <= 2:
        return {"flagged": False, "reason": None, "method": "none"}

    result = llm.check_red_flag(text or "")
    if result.get("flagged"):
        return {"flagged": True, "reason": result.get("reason") or "Potential emergency symptom", "method": "llm"}
    return {"flagged": False, "reason": None, "method": "none"}

