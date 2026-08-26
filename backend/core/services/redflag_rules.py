from . import llm

RED_FLAG_KEYWORDS = ("severe chest pain", "can't breathe", "cannot breathe", "unconscious", "heavy bleeding", "suicidal", "seizure")


def check(text, full_transcript=None):
    # Keyword rules are the safety floor: LLM availability or judgement must never be
    # the only protection against obvious emergencies.
    lower = (text or "").lower()
    for phrase in RED_FLAG_KEYWORDS:
        if phrase in lower:
            return {"flagged": True, "reason": f"Matched emergency phrase: {phrase}", "method": "keyword"}
    result = llm.check_red_flag(text or "")
    if result.get("flagged"):
        return {"flagged": True, "reason": result.get("reason") or "Potential emergency symptom", "method": "llm"}
    return {"flagged": False, "reason": None, "method": "none"}
