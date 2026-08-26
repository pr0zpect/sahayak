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
    if patient_answers >= 5:
        return {"question": None, "chips": [], "done": True}

    asked_questions = [t.get("text", "").strip().lower() for t in transcript if t.get("speaker") == "ai"]

    if mode == "ayush":
        ayush_fallbacks = [
            {"question": "How is your appetite (Agni) and bowel movement pattern (Koshtha)?", "chips": ["Regular appetite", "Irregular/Gas", "Low appetite", "Burning sensation"], "done": False},
            {"question": "Could you describe your daily diet (Ahara), sleep pattern (Nidra), and stress levels?", "chips": ["Spicy/Oily food", "Late night sleep", "High stress", "Balanced diet"], "done": False},
            {"question": "Do you feel sensitive to cold or heat, and how is your body energy throughout the day?", "chips": ["Sensitive to cold", "Sensitive to heat", "Low energy/Heavy", "Energetic"], "done": False},
            {"question": "Have you noticed any swelling, joint stiffness, or skin flare-ups?", "chips": ["Joint stiffness", "Skin redness", "Body heaviness", "None"], "done": False},
        ]
        fb_idx = min(patient_answers, len(ayush_fallbacks) - 1)
        return ayush_fallbacks[fb_idx]

    # Allopathic SOCRATES rotation
    allopathic_fallbacks = [
        {"question": "When did this symptom start and how long has it lasted?", "chips": ["Today", "A few days ago", "More than a week"], "done": False},
        {"question": "How would you describe the feeling, and how severe is it on a scale of 1 to 10?", "chips": ["Mild (1-3)", "Moderate (4-6)", "Severe (7-10)"], "done": False},
        {"question": "Are you experiencing any accompanying symptoms like fever, nausea, or dizziness?", "chips": ["Fever", "Nausea", "Dizziness", "No other symptoms"], "done": False},
        {"question": "Do you have any existing medical conditions or daily medications?", "chips": ["Diabetes", "Hypertension", "Asthma", "No prior conditions"], "done": False},
    ]

    fallback_idx = min(patient_answers, len(allopathic_fallbacks) - 1)
    default_fallback = allopathic_fallbacks[fallback_idx]

    result = _ask(
        f"Interview transcript so far: {json.dumps(transcript)}. "
        f"Do NOT repeat any of these previously asked questions: {json.dumps(asked_questions)}. "
        f"Ask the single next logical SOCRATES intake question. "
        f"If 4 or more questions have been answered, return {{\"question\":null,\"chips\":[],\"done\":true}}; "
        f"otherwise return {{\"question\":str,\"chips\":[str],\"done\":false}}.",
        default_fallback
    )

    q = result.get("question")
    done = bool(result.get("done", False))

    if q and q.strip().lower() in asked_questions:
        for fb in allopathic_fallbacks:
            if fb["question"].strip().lower() not in asked_questions:
                return fb
        return {"question": None, "chips": [], "done": True}

    return {"question": q, "chips": result.get("chips", []), "done": done}


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
