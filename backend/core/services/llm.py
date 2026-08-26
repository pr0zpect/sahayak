"""Hugging Face inference integration. Keep SDK usage here so views remain mockable and deterministic."""
import json
import os
from huggingface_hub import InferenceClient

# SAFETY: This is supplied on every call. MediKiosk supports clinical intake only;
# it must never diagnose, recommend treatment, or fabricate facts.
SAFETY_SYSTEM_PROMPT = """You are a clinical intake assistant, not a doctor. Never diagnose, give treatment advice, or claim certainty. Never invent facts. Only ask neutral intake questions or summarize facts explicitly present in supplied data. Return valid JSON only, with no markdown or preamble."""
COMPLAINT_ONTOLOGY = {
    "chest pain": ["onset", "duration", "location", "severity", "character", "radiation", "associated symptoms"],
    "fever": ["onset", "duration", "temperature", "pattern", "associated symptoms"],
    "abdominal pain": ["onset", "location", "severity", "character", "associated symptoms"],
    "cough": ["onset", "duration", "dry or productive", "severity", "associated symptoms"],
    "headache": ["onset", "location", "severity", "character", "associated symptoms"],
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

def get_first_question(complaint_ontology=None):
    ontology = complaint_ontology or COMPLAINT_ONTOLOGY
    return _ask(f"Ask one opening question for an intake. Available complaint ontology: {json.dumps(ontology)}. Return {{\"question\":str,\"chips\":[str]}}.",
                {"question": "What brings you in today?", "chips": list(ontology)})


def get_next_question(transcript):
    patient_answers = sum(1 for item in transcript if item.get("speaker") == "patient")
    if patient_answers >= 10:
        return {"question": None, "chips": [], "done": True}
    fallback = {"question": "Could you describe when this started and how severe it is?", "chips": ["Today", "A few days ago", "More than a week"], "done": False}
    result = _ask(f"Interview transcript: {json.dumps(transcript)}. Ask the next single SOCRATES-style intake question. If enough information exists, return {{\"question\":null,\"chips\":[],\"done\":true}}; otherwise return {{\"question\":str,\"chips\":[str],\"done\":false}}.", fallback)
    return {"question": result.get("question"), "chips": result.get("chips", []), "done": bool(result.get("done", False))}


def check_red_flag(text):
    return _ask(f"Assess whether this patient text signals an immediate emergency. Return {{\"flagged\":bool,\"reason\":str}}. Text: {text}", {"flagged": False, "reason": ""})


def _blank_summary():
    return {key: {"text": "Not reported.", "source_turns": []} for key in ["chief_complaint", "hpi", "pmh", "drug_allergy", "family_history", "personal_history", "ros"]}


def generate_summary(transcript, documents):
    fallback = _blank_summary()
    result = _ask(f"Create exactly these sections: chief_complaint, hpi, pmh, drug_allergy, family_history, personal_history, ros. Each must be {{\"text\":str,\"source_turns\":[int]}} and may include source_documents:[int]. Use only transcript turns/documents provided and source every claim. Transcript: {json.dumps(transcript)} Documents: {json.dumps(documents)}", fallback)
    if not isinstance(result, dict):
        return fallback
    for key, empty in fallback.items():
        item = result.get(key)
        if not isinstance(item, dict): result[key] = empty
        else:
            item.setdefault("text", "Not reported.")
            item["source_turns"] = [x for x in item.get("source_turns", []) if isinstance(x, int)]
    return result


def extract_ocr_fields(raw_text):
    return _ask(f"Extract only explicit fields from prescription OCR text. Return {{\"diagnosis\":str|null,\"medicines\":[str],\"date\":str|null}}. OCR: {raw_text}", {"diagnosis": None, "medicines": [], "date": None})
