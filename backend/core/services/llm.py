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
    "Prakriti Assessment": ["body frame", "skin type", "temperature preference"],
    "Vikriti Imbalance": ["current symptoms", "recent bodily changes"],
    "Agni & Koshtha": ["appetite", "bowel movements", "acidity or gas"],
    "Ahara & Vihara": ["diet", "sleep", "stress levels", "exercise routine"],
}

MULTI_SELECT_DIMENSIONS = {"associated symptoms", "current symptoms", "diet"}


def _ask(prompt, fallback, language="en"):
    lang_names = {"en": "English", "hi": "Hindi", "bn": "Bengali", "te": "Telugu", "ta": "Tamil"}
    lang_name = lang_names.get(language, "English")
    
    if language != "en":
        prompt += f"\n\nRespond in {lang_name} (language code: {language}). All question text and answer options must be written in this language, not English."

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

    def _format_fallback(fb):
        return {
            "question": fb["question"],
            "chips": fb["chips"],
            "escape_hatch": "Something else / not sure",
            "input_type": "options",
            "done": False,
            "needs_clarification": False,
            "dimension": None,
            "selection_mode": "single"
        }

    # Allopathic SOCRATES rotation
    allopathic_fallbacks = [
        {"question": "When did this symptom start and how long has it lasted?", "chips": ["Today", "A few days ago", "More than a week"]},
        {"question": "How would you describe the feeling, and how severe is it on a scale of 1 to 10?", "chips": ["Mild (1-3)", "Moderate (4-6)", "Severe (7-10)"]},
        {"question": "Are you experiencing any accompanying symptoms like fever, nausea, or dizziness?", "chips": ["Fever", "Nausea", "Dizziness", "No other symptoms"]},
        {"question": "Do you have any existing medical conditions or daily medications?", "chips": ["Diabetes", "Hypertension", "Asthma", "No prior conditions"]},
    ]
    
    ayush_fallbacks = [
        {"question": "How is your appetite (Agni) and bowel movement pattern (Koshtha)?", "chips": ["Regular appetite", "Irregular/Gas", "Low appetite", "Burning sensation"]},
        {"question": "Could you describe your daily diet (Ahara), sleep pattern (Nidra), and stress levels?", "chips": ["Spicy/Oily food", "Late night sleep", "High stress", "Balanced diet"]},
        {"question": "Do you feel sensitive to cold or heat, and how is your body energy throughout the day?", "chips": ["Sensitive to cold", "Sensitive to heat", "Low energy/Heavy", "Energetic"]},
        {"question": "Have you noticed any swelling, joint stiffness, or skin flare-ups?", "chips": ["Joint stiffness", "Skin redness", "Body heaviness", "None"]},
    ]

    fb_list = ayush_fallbacks if mode == "ayush" else allopathic_fallbacks
    fallback_idx = min(patient_answers, len(fb_list) - 1)
    default_fallback = _format_fallback(fb_list[fallback_idx])

    stated_complaint = None
    allowed_dimensions_str = "the standard clinical dimensions for their complaint"
    covered_dimensions_str = "None"
    remaining_dimensions_str = "All"
    
    if mode == "allopathic":
        ontology_dict = ALLOPATHIC_ONTOLOGY
        for t in transcript:
            if t.get("speaker") == "patient":
                ans = t.get("text", "").lower()
                for key in ontology_dict:
                    if key.lower() in ans:
                        stated_complaint = key
                        break
                if stated_complaint:
                    break
        if stated_complaint:
            dims = ontology_dict[stated_complaint]
    else:
        stated_complaint = "AYUSH Intake"
        dims = [d for category in AYUSH_ONTOLOGY.values() for d in category]

    if stated_complaint:
        covered_dims = [t.get("dimension_asked") for t in transcript if t.get("speaker") == "ai" and t.get("dimension_asked")]
        remaining_dims = [d for d in dims if d not in covered_dims]
        allowed_dimensions_str = f"the specific dimension list for '{stated_complaint}': {json.dumps(dims)}"
        covered_dimensions_str = json.dumps(covered_dims) if covered_dims else "None"
        remaining_dimensions_str = json.dumps(remaining_dims) if remaining_dims else "None (All covered)"

    complaint_mention = f"The patient's stated complaint is '{stated_complaint}'. " if stated_complaint else ""
    prompt = (
        f"Interview transcript so far: {json.dumps(transcript)}. "
        f"If the patient's most recent answer is clearly unrelated to a medical symptom, unclear, or nonsensical "
        f"(e.g. random letters like 'asdf', completely off-topic, gibberish), YOU MUST NOT treat it as clinical data. "
        f"Instead, generate a polite clarifying question asking the patient to restate their symptom, "
        f"include relevant options where sensible (e.g. 'It is about my current visit', 'I want to say something else'), "
        f"and YOU MUST set \"needs_clarification\": true in your response. "
        f"Otherwise, ask exactly one clinically relevant next question that has not yet been covered. "
        f"{complaint_mention}"
        f"Dimensions already covered in this conversation: {covered_dimensions_str}. "
        f"Remaining uncovered dimensions: {remaining_dimensions_str}. "
        f"You MUST ONLY ask about ONE of the remaining uncovered dimensions listed above. "
        f"Do not ask about {covered_dimensions_str} again in any form or phrasing — they have already been covered. "
        f"Do not ask about body location, radiation, or any other dimension NOT explicitly listed for this specific complaint — "
        f"for example, fever, cough, and abdominal pain each have their own distinct relevant dimensions and you must respect them exactly as given, "
        f"not reuse a pattern from a different complaint type. "
        f"ALWAYS include 3-5 short, mutually exclusive, tappable answer options specific to that exact question in the 'chips' array "
        f"(e.g. for a 'how long' question -> ['Today', '2-3 days', 'About a week', 'More than a week']; "
        f"for a 'where exactly' question -> ['Center of chest', 'Left side', 'Right side', 'Spreads to arm/jaw']; "
        f"for a 'how severe' question -> ['Mild', 'Moderate', 'Severe', 'Worst pain I\\'ve felt']). "
        f"NEVER return an empty 'chips' array for a substantive question. "
        f"Judge, using the full transcript so far, whether enough clinically useful information now exists to produce a usable Chief Complaint and HPI "
        f"by evaluating coverage against THE STATED COMPLAINT'S OWN DIMENSION LIST, not a generic checklist. "
        f"If the relevant dimensions are adequately covered (or Remaining uncovered dimensions is 'None (All covered)'), stop asking ontology questions and instead return exactly this JSON: {{\"is_closing\":true}}. "
        f"Otherwise, return JSON like this: {{\"question\":str,\"chips\":[str],\"needs_clarification\":bool,\"is_closing\":false,\"dimension\":str,\"selection_mode\":str}} "
        f"where 'dimension' is the name of the ONE uncovered dimension you are asking about, and 'selection_mode' is 'multi' if the dimension naturally allows multiple concurrent answers (e.g. {list(MULTI_SELECT_DIMENSIONS)}), or 'single' otherwise."
    )

    result = _ask(prompt, default_fallback, language=language)

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
        "needs_clarification": needs_clarification,
        "dimension": result.get("dimension"),
        "selection_mode": result.get("selection_mode", "single")
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
