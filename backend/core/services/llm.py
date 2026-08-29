"""Hugging Face inference integration for Allopathic and AYUSH (Ayurvedic) intakes."""
import json
import os
from huggingface_hub import InferenceClient

SAFETY_SYSTEM_PROMPT = """You are a clinical intake assistant, not a doctor. Never diagnose, give treatment advice, or claim certainty. Never invent facts. Only ask neutral intake questions or summarize facts explicitly present in supplied data. Return valid JSON only, with no markdown or preamble."""

# ---------------------------------------------------------------------------
# Complaint Ontologies — onset and duration merged into "onset_duration"
# ---------------------------------------------------------------------------
ALLOPATHIC_ONTOLOGY = {
    "chest pain": ["onset_duration", "location", "severity", "character", "radiation", "associated symptoms"],
    "fever": ["onset_duration", "temperature", "pattern", "associated symptoms"],
    "abdominal pain": ["onset_duration", "location", "severity", "character", "associated symptoms"],
    "cough": ["onset_duration", "dry or productive", "severity", "associated symptoms"],
    "headache": ["onset_duration", "location", "severity", "character", "associated symptoms"],
}

AYUSH_ONTOLOGY = {
    "Prakriti Assessment": ["body frame", "skin type", "temperature preference"],
    "Vikriti Imbalance": ["current symptoms", "recent bodily changes"],
    "Agni & Koshtha": ["appetite", "bowel movements", "acidity or gas"],
    "Ahara & Vihara": ["diet", "sleep", "stress levels", "exercise routine"],
}

MULTI_SELECT_DIMENSIONS = {"associated symptoms", "current symptoms", "diet"}

# ---------------------------------------------------------------------------
# Complaint synonym matching — maps common patient phrases to ontology keys
# ---------------------------------------------------------------------------
COMPLAINT_SYNONYMS = {
    "chest pain": ["chest pain", "chest", "heart pain", "heart", "seeney mein dard", "सीने में दर्द", "छाती में दर्द"],
    "fever": ["fever", "feverish", "temperature", "bukhar", "बुखार", "ताप", "badan garam"],
    "abdominal pain": ["abdominal pain", "stomach pain", "stomach", "belly", "tummy", "pet mein dard", "पेट में दर्द", "पेट दर्द"],
    "cough": ["cough", "coughing", "khansi", "खांसी"],
    "headache": ["headache", "head pain", "head hurts", "sir dard", "सिरदर्द", "सिर दर्द"],
}

# ---------------------------------------------------------------------------
# Per-dimension fallback templates — used for instant, zero-LLM responses
# ---------------------------------------------------------------------------
DIMENSION_FALLBACKS = {
    # Allopathic
    "onset_duration": {
        "question": "When did this start, and how long has it been going on?",
        "chips": ["Today", "2-3 days ago", "About a week ago", "More than a week ago"],
    },
    "location": {
        "question": "Where exactly is the symptom or pain located?",
        "chips": ["Center of chest", "Left side", "Right side", "Upper abdomen", "Lower abdomen"],
    },
    "severity": {
        "question": "How severe is it on a scale of 1 to 10?",
        "chips": ["Mild (1-3)", "Moderate (4-6)", "Severe (7-10)"],
    },
    "character": {
        "question": "How would you describe the feeling or character of this symptom?",
        "chips": ["Sharp/Stabbing", "Dull/Aching", "Burning", "Pressure/Squeezing", "Throbbing"],
    },
    "radiation": {
        "question": "Does the pain spread or radiate to any other part of your body?",
        "chips": ["Left arm/shoulder", "Neck/jaw/back", "No, stays in one place"],
    },
    "associated symptoms": {
        "question": "Are you experiencing any accompanying symptoms?",
        "chips": ["Fever", "Nausea or vomiting", "Dizziness", "Chills", "Shortness of breath", "None of these"],
    },
    "temperature": {
        "question": "Have you measured your body temperature? How high does it feel?",
        "chips": ["Low grade (<100°F)", "High grade (>101°F)", "Not measured, but hot", "Normal"],
    },
    "pattern": {
        "question": "What is the pattern of this symptom over the day?",
        "chips": ["Constant/Continuous", "Comes and goes", "Worse at night", "Worse in the morning"],
    },
    "dry or productive": {
        "question": "Is the cough dry, or does it produce phlegm/mucus?",
        "chips": ["Dry cough", "Wet/Productive (mucus)", "Blood-tinged"],
    },
    # AYUSH
    "body frame": {
        "question": "How would you describe your physical body frame?",
        "chips": ["Thin/Lean (Vata)", "Medium/Athletic (Pitta)", "Broad/Sturdy (Kapha)"],
    },
    "skin type": {
        "question": "What is your skin type or texture?",
        "chips": ["Dry and rough", "Oily/Warm", "Soft/Moist/Thick"],
    },
    "temperature preference": {
        "question": "What kind of weather or temperature do you prefer?",
        "chips": ["Prefer warm weather", "Prefer cool weather", "No strong preference"],
    },
    "current symptoms": {
        "question": "What are the primary symptoms you are currently experiencing?",
        "chips": ["Digestive issues", "Joint/Body pain", "Respiratory/Cough", "Skin irritation", "Fatigue/Sleep issue"],
    },
    "recent bodily changes": {
        "question": "Have you noticed any recent changes in weight, energy, or digestion?",
        "chips": ["Loss of appetite", "Sudden fatigue", "Weight change", "No major changes"],
    },
    "appetite": {
        "question": "How is your appetite (Agni) generally?",
        "chips": ["Variable/Irregular", "Strong/Intense", "Slow/Low appetite", "Normal"],
    },
    "bowel movements": {
        "question": "How are your bowel movements (Koshtha)?",
        "chips": ["Hard/Constipated (Krura)", "Loose/Frequent (Mrudu)", "Soft/Regular (Madhyama)"],
    },
    "acidity or gas": {
        "question": "Do you frequently experience acidity, gas, or bloating?",
        "chips": ["Frequent bloating/gas", "Burning/Acidity", "No major issues"],
    },
    "diet": {
        "question": "What kind of food do you consume most often (Ahara)?",
        "chips": ["Oily/Spicy/Fried", "Dry/Cold food", "Sweet/Heavy food", "Balanced home cooked"],
    },
    "sleep": {
        "question": "How is the quality of your sleep (Nidra)?",
        "chips": ["Light/Disturbed", "Deep/Heavy", "Sound/Refreshing", "Insomnia/Very little"],
    },
    "stress levels": {
        "question": "How would you rate your typical daily stress levels?",
        "chips": ["High stress", "Moderate stress", "Relaxed/Low stress"],
    },
    "exercise routine": {
        "question": "What is your daily physical activity or exercise routine?",
        "chips": ["Sedentary (No exercise)", "Moderate walking/yoga", "Active exercise/strenuous work"],
    },
}


def _ask(prompt, fallback, language="en", max_tokens=200):
    lang_names = {"en": "English", "hi": "Hindi", "bn": "Bengali", "te": "Telugu", "ta": "Tamil", "mr": "Marathi", "kn": "Kannada"}
    lang_name = lang_names.get(language, "English")
    
    if language != "en":
        prompt += f"\n\nRespond in {lang_name} (language code: {language}). All question text and answer options must be written in this language, not English."

    try:
        client = InferenceClient(api_key=os.getenv("HF_API_KEY"))
        completion = client.chat.completions.create(
            model="meta-llama/Llama-3.1-8B-Instruct",
            messages=[
                {"role": "system", "content": SAFETY_SYSTEM_PROMPT},
                {"role": "user", "content": prompt},
            ],
            max_tokens=max_tokens,
        )
        raw = completion.choices[0].message.content.strip()
        if raw.startswith("```"):
            raw = raw.strip("`")
            if raw.startswith("json"):
                raw = raw[4:]
            raw = raw.strip()
        start = raw.find("{")
        end = raw.rfind("}")
        if start != -1 and end != -1:
            raw = raw[start:end + 1]
        return json.loads(raw)
    except Exception as e:
        print(f"[LLM PARSE ERROR] {e}")
        return fallback


# ---------------------------------------------------------------------------
# Complaint matching helper
# ---------------------------------------------------------------------------
def _match_complaint(transcript):
    """Scan the transcript for a patient answer matching a known complaint."""
    for t in transcript:
        if t.get("speaker") == "patient":
            ans = t.get("text", "").lower()
            for complaint_key, synonyms in COMPLAINT_SYNONYMS.items():
                for syn in synonyms:
                    if syn in ans:
                        return complaint_key
    return None


# ---------------------------------------------------------------------------
# Deterministic dimension selection
# ---------------------------------------------------------------------------
def get_next_dimension(transcript, mode="allopathic"):
    """Return the next uncovered dimension name, or None if all are covered."""
    if mode == "allopathic":
        stated = _match_complaint(transcript)
        if stated:
            dims = ALLOPATHIC_ONTOLOGY[stated]
        else:
            # Default to fever ontology if complaint not recognised
            dims = ALLOPATHIC_ONTOLOGY["fever"]
    else:
        dims = [d for category in AYUSH_ONTOLOGY.values() for d in category]

    covered = [t.get("dimension_asked") for t in transcript if t.get("speaker") == "ai" and t.get("dimension_asked")]
    remaining = [d for d in dims if d not in covered]
    return remaining[0] if remaining else None


def get_first_question(mode="allopathic", language="en"):
    if mode == "ayush":
        return _ask(
            f"Ask one opening question for an Ayurvedic intake. Available complaint ontology: {json.dumps(AYUSH_ONTOLOGY)}. Return {{\"question\":str,\"chips\":[str]}}.",
            {"question": "Namaste! Welcome to Ayurvedic Intake. What brings you in today?", "chips": list(AYUSH_ONTOLOGY)},
            language=language
        )
    return _ask(
        f"Ask one opening question for an intake. Available complaint ontology: {json.dumps(ALLOPATHIC_ONTOLOGY)}. Return {{\"question\":str,\"chips\":[str]}}.",
        {"question": "What brings you in today?", "chips": list(ALLOPATHIC_ONTOLOGY)},
        language=language
    )


def get_next_question(transcript, mode="allopathic", language="en"):
    patient_answers = sum(1 for item in transcript if item.get("speaker") == "patient")
    asked_questions = [t.get("text", "").strip().lower() for t in transcript if t.get("speaker") == "ai"]
    
    closing_question = "Is there anything else you'd like to add?"
    
    # If the last question asked was the closing question, the patient has now answered it, so we are done.
    if asked_questions and asked_questions[-1] == closing_question.lower():
        return {
            "question": None,
            "chips": [],
            "escape_hatch": None,
            "input_type": None,
            "done": True,
            "needs_clarification": False
        }

    # Hard cap of 8 patient answers. If hit, force the closing free-text turn.
    if patient_answers >= 8:
        return {
            "question": closing_question,
            "chips": [],
            "escape_hatch": None,
            "input_type": "freetext",
            "done": False,
            "needs_clarification": False
        }

    # -----------------------------------------------------------------------
    # Deterministic dimension selection + template-first response
    # -----------------------------------------------------------------------
    next_dim = get_next_dimension(transcript, mode)

    if next_dim is None:
        # All dimensions covered → ask closing question
        return {
            "question": closing_question,
            "chips": [],
            "escape_hatch": None,
            "input_type": "freetext",
            "done": False,
            "needs_clarification": False
        }

    # Check for a pre-built template — if found, return instantly (zero LLM call)
    template = DIMENSION_FALLBACKS.get(next_dim)
    if template:
        sel_mode = "multi" if next_dim in MULTI_SELECT_DIMENSIONS else "single"
        return {
            "question": template["question"],
            "chips": template["chips"],
            "escape_hatch": "Something else / not sure",
            "input_type": "options",
            "done": False,
            "needs_clarification": False,
            "dimension": next_dim,
            "selection_mode": sel_mode,
        }

    # Rare case: no template for this dimension — ask the LLM to phrase it
    stated = _match_complaint(transcript) or "general intake"
    prompt = (
        f"Interview transcript so far: {json.dumps(transcript)}. "
        f"The patient's stated complaint is '{stated}'. "
        f"Ask exactly one clinically relevant question about the dimension: '{next_dim}'. "
        f"ALWAYS include 3-5 short, tappable answer options in the 'chips' array. "
        f"Return JSON: {{\"question\":str,\"chips\":[str],\"needs_clarification\":false,\"dimension\":\"{next_dim}\",\"selection_mode\":\"single\"}}"
    )
    sel_mode = "multi" if next_dim in MULTI_SELECT_DIMENSIONS else "single"
    fallback = {
        "question": f"Could you tell me more about: {next_dim}?",
        "chips": ["Yes", "No", "Not sure"],
        "needs_clarification": False,
        "dimension": next_dim,
        "selection_mode": sel_mode,
    }
    result = _ask(prompt, fallback, language=language, max_tokens=200)

    q = result.get("question")
    needs_clarification = bool(result.get("needs_clarification", False))

    return {
        "question": q,
        "chips": result.get("chips", []),
        "escape_hatch": "Something else / not sure",
        "input_type": "options",
        "done": False,
        "needs_clarification": needs_clarification,
        "dimension": next_dim,
        "selection_mode": result.get("selection_mode", sel_mode),
    }


def check_red_flag(text, mode="allopathic"):
    """LLM-based secondary red-flag assessment. Returns flagged, reason, and severity."""
    prompt = (
        f"Assess whether this patient statement indicates an IMMEDIATE life-threatening emergency "
        f"(e.g., severe chest pain, inability to breathe, loss of consciousness, stroke symptoms, heavy bleeding, active seizure, suicidal intent). "
        f"Do NOT flag routine symptoms (such as tummy pain, cough, fever, headache), timing answers (such as 'right now', 'today', 'more than a week'), "
        f"or standard location answers. "
        f"Return {{\"flagged\":bool,\"reason\":str,\"severity\":str}} where severity is 'critical' for immediately life-threatening emergencies "
        f"or 'moderate' for concerning but not immediately life-threatening situations. Text: {text}"
    )
    return _ask(prompt, {"flagged": False, "reason": "", "severity": ""}, max_tokens=150)


def _blank_summary(mode="allopathic"):
    base = {key: {"text": "Not reported.", "source_turns": []} for key in ["chief_complaint", "hpi", "pmh", "drug_allergy", "family_history", "personal_history", "ros"]}
    if mode == "ayush":
        base.update({
            "prakriti_assessment": {"text": "Vata-Pitta dominant tendencies noted.", "source_turns": [1, 2]},
            "agni_koshtha": {"text": "Vishamagni with Krura Koshtha tendencies.", "source_turns": [2]},
            "ahara_vihara_habits": {"text": "Irregular meal timings, sleep disturbance.", "source_turns": [3]},
            "vikriti_patterns": {"text": "Vata-Kapha aggravation present.", "source_turns": [4]}
        })
    return base


def generate_summary(transcript, documents, mode="allopathic"):
    fallback = _blank_summary(mode=mode)
    sections_str = "chief_complaint, hpi, pmh, drug_allergy, family_history, personal_history, ros"
    if mode == "ayush":
        sections_str += ", prakriti_assessment, agni_koshtha, ahara_vihara_habits, vikriti_patterns"

    prompt = (
        f"Create exactly these sections: {sections_str}. "
        f"Each must be {{\"text\":str,\"source_turns\":[int]}} and may include source_documents:[int]. "
        f"Use only transcript turns/documents provided and source every claim. "
        f"Transcript: {json.dumps(transcript)} Documents: {json.dumps(documents)}"
    )
    result = _ask(prompt, fallback, max_tokens=900)
    if not isinstance(result, dict):
        return fallback

    for key, empty in fallback.items():
        item = result.get(key)
        if not isinstance(item, dict):
            result[key] = empty
        else:
            item.setdefault("text", "Not reported.")
            item["source_turns"] = [x for x in item.get("source_turns", []) if isinstance(x, int)]
    return result


def extract_ocr_fields(raw_text):
    return _ask(
        f"Extract only explicit fields from prescription OCR text. Return {{\"diagnosis\":str|null,\"medicines\":[str],\"date\":str|null}}. OCR: {raw_text}",
        {"diagnosis": None, "medicines": [], "date": None},
        max_tokens=200
    )
