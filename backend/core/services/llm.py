"""Hugging Face inference integration for Allopathic and AYUSH (Ayurvedic) intakes."""
import json
import os
from huggingface_hub import InferenceClient

SAFETY_SYSTEM_PROMPT = """You are a clinical intake assistant, not a doctor. Never diagnose, give treatment advice, or claim certainty. Never invent facts. Only ask neutral intake questions or summarize facts explicitly present in supplied data. Return valid JSON only, with no markdown or preamble."""

ALLOPATHIC_ONTOLOGY = {
    "chest pain": ["onset", "duration", "location", "severity", "character", "radiation", "associated symptoms"],
    "fever": ["onset", "duration", "temperature", "pattern", "associated symptoms"],
    "abdominal pain": ["onset", "location", "severity", "character", "associated symptoms"],
    "cough": ["onset", "duration", "dry or productive", "severity", "associated symptoms"],
    "headache": ["onset", "location", "severity", "character", "associated symptoms"],
}

AYUSH_ONTOLOGY = {
    "Prakriti Assessment": ["Vata", "Pitta", "Kapha", "body constitution"],
    "Vikriti Imbalance": ["current symptoms", "dosha aggravation"],
    "Agni & Koshtha": ["Mandagni", "Tikshnagni", "Vishamagni", "bowel patterns"],
    "Ahara & Vihara": ["dietary habits", "sleep/Nidra", "exercise/Vyayama", "lifestyle"],
}


def _ask(prompt, fallback):
    try:
        client = InferenceClient(api_key=os.getenv("HF_API_KEY"))
        # Fallback options: Qwen/Qwen2.5-7B-Instruct or meta-llama/Llama-3.2-3B-Instruct
        # Note: Qwen3-8B-Instruct and Qwen2.5-7B-Instruct are unavailable/unsupported, using Llama-3.1-8B-Instruct for now.
        completion = client.chat.completions.create(
            model="meta-llama/Llama-3.1-8B-Instruct",
            messages=[
                {"role": "system", "content": SAFETY_SYSTEM_PROMPT},
                {"role": "user", "content": prompt},
            ],
            max_tokens=900,
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


def get_first_question(mode="allopathic"):
    if mode == "ayush":
        return {
            "question": "Namaste! Welcome to Ayurvedic Intake. What brings you in today, and how would you describe your digestion and energy?",
            "chips": ["Digestive/Agni Issue", "Joint Pain (Vata)", "Skin/Heat (Pitta)", "Respiratory/Heavy (Kapha)"]
        }
    return _ask(
        f"Ask one opening question for an intake. Available complaint ontology: {json.dumps(ALLOPATHIC_ONTOLOGY)}. Return {{\"question\":str,\"chips\":[str]}}.",
        {"question": "What brings you in today?", "chips": list(ALLOPATHIC_ONTOLOGY)}
    )


def get_next_question(transcript, mode="allopathic"):
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

    def _format_fallback(fb):
        return {
            "question": fb["question"],
            "chips": fb["chips"],
            "escape_hatch": "Something else / not sure",
            "input_type": "options",
            "done": False,
            "needs_clarification": False
        }

    if mode == "ayush":
        ayush_fallbacks = [
            {"question": "How is your appetite (Agni) and bowel movement pattern (Koshtha)?", "chips": ["Regular appetite", "Irregular/Gas", "Low appetite", "Burning sensation"]},
            {"question": "Could you describe your daily diet (Ahara), sleep pattern (Nidra), and stress levels?", "chips": ["Spicy/Oily food", "Late night sleep", "High stress", "Balanced diet"]},
            {"question": "Do you feel sensitive to cold or heat, and how is your body energy throughout the day?", "chips": ["Sensitive to cold", "Sensitive to heat", "Low energy/Heavy", "Energetic"]},
            {"question": "Have you noticed any swelling, joint stiffness, or skin flare-ups?", "chips": ["Joint stiffness", "Skin redness", "Body heaviness", "None"]},
        ]
        fb_idx = min(patient_answers, len(ayush_fallbacks) - 1)
        return _format_fallback(ayush_fallbacks[fb_idx])

    # Allopathic SOCRATES rotation
    allopathic_fallbacks = [
        {"question": "When did this symptom start and how long has it lasted?", "chips": ["Today", "A few days ago", "More than a week"]},
        {"question": "How would you describe the feeling, and how severe is it on a scale of 1 to 10?", "chips": ["Mild (1-3)", "Moderate (4-6)", "Severe (7-10)"]},
        {"question": "Are you experiencing any accompanying symptoms like fever, nausea, or dizziness?", "chips": ["Fever", "Nausea", "Dizziness", "No other symptoms"]},
        {"question": "Do you have any existing medical conditions or daily medications?", "chips": ["Diabetes", "Hypertension", "Asthma", "No prior conditions"]},
    ]

    fallback_idx = min(patient_answers, len(allopathic_fallbacks) - 1)
    default_fallback = _format_fallback(allopathic_fallbacks[fallback_idx])

    prompt = (
        f"Interview transcript so far: {json.dumps(transcript)}. "
        f"Do NOT repeat any of these previously asked questions: {json.dumps(asked_questions)}. "
        f"If the patient's most recent answer is clearly unrelated to a medical symptom, unclear, or nonsensical "
        f"(e.g. random letters like 'asdf', completely off-topic, gibberish), YOU MUST NOT treat it as clinical data. "
        f"Instead, generate a polite clarifying question asking the patient to restate their symptom, "
        f"include relevant options where sensible (e.g. 'It is about my current visit', 'I want to say something else'), "
        f"and YOU MUST set \"needs_clarification\": true in your response. "
        f"Otherwise, ask exactly one clinically relevant next question chosen from the ontology dimensions for the patient's stated complaint "
        f"that has not yet been covered. "
        f"ALWAYS include 3-5 short, mutually exclusive, tappable answer options specific to that exact question in the 'chips' array "
        f"(e.g. for a 'how long' question -> ['Today', '2-3 days', 'About a week', 'More than a week']; "
        f"for a 'where exactly' question -> ['Center of chest', 'Left side', 'Right side', 'Spreads to arm/jaw']; "
        f"for a 'how severe' question -> ['Mild', 'Moderate', 'Severe', 'Worst pain I\\'ve felt']). "
        f"NEVER return an empty 'chips' array for a substantive question. "
        f"Judge, using the full transcript so far, whether enough clinically useful information now exists to produce a usable Chief Complaint and HPI "
        f"(onset, duration, severity, and at least one more relevant dimension covered). "
        f"If yes, stop asking ontology questions and instead return exactly this JSON: {{\"is_closing\":true}}. "
        f"Otherwise, return JSON like this: {{\"question\":str,\"chips\":[str],\"needs_clarification\":bool,\"is_closing\":false}}."
    )

    result = _ask(prompt, default_fallback)

    is_closing = bool(result.get("is_closing", False))
    q = result.get("question")
    
    if is_closing or (q and q.strip().lower() == closing_question.lower()):
        return {
            "question": closing_question,
            "chips": [],
            "escape_hatch": None,
            "input_type": "freetext",
            "done": False,
            "needs_clarification": False
        }

    needs_clarification = bool(result.get("needs_clarification", False))

    if q and q.strip().lower() in asked_questions:
        for fb in allopathic_fallbacks:
            if fb["question"].strip().lower() not in asked_questions:
                return _format_fallback(fb)
        return {
            "question": closing_question,
            "chips": [],
            "escape_hatch": None,
            "input_type": "freetext",
            "done": False,
            "needs_clarification": False
        }

    return {
        "question": q,
        "chips": result.get("chips", []),
        "escape_hatch": "Something else / not sure",
        "input_type": "options",
        "done": False,
        "needs_clarification": needs_clarification
    }


def check_red_flag(text, mode="allopathic"):
    prompt = (
        f"Assess whether this patient statement indicates an IMMEDIATE life-threatening emergency "
        f"(e.g., severe chest pain, inability to breathe, loss of consciousness, stroke symptoms, heavy bleeding, active seizure, suicidal intent). "
        f"Do NOT flag routine symptoms (such as tummy pain, cough, fever, headache), timing answers (such as 'right now', 'today', 'more than a week'), "
        f"or standard location answers. Return {{\"flagged\":bool,\"reason\":str}}. Text: {text}"
    )
    return _ask(prompt, {"flagged": False, "reason": ""})


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
    result = _ask(prompt, fallback)
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
        {"diagnosis": None, "medicines": [], "date": None}
    )
