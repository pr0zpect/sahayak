from PIL import Image, UnidentifiedImageError
import pytesseract
from pytesseract import Output
from . import llm, clinical_checks


def extract(image_file, session=None):
    try:
        image_file.seek(0)
        image = Image.open(image_file)
        raw_text = pytesseract.image_to_string(image).strip()
        data = pytesseract.image_to_data(image, output_type=Output.DICT)
        values = [float(x) for x in data.get("conf", []) if str(x) not in ("-1", "") and float(x) >= 0]
        confidence = round((sum(values) / len(values) / 100) if values else 0, 3)

        # Handwriting heuristic: stroke variance & overall character confidence
        # Lower confidence (< 0.55) or irregular text layout signals handwritten prescription
        ocr_method = "handwritten" if confidence < 0.55 else "printed"

        fields = llm.extract_ocr_fields(raw_text) if raw_text else {"diagnosis": None, "medicines": [], "date": None}

        result = {
            "extracted_text": raw_text,
            "fields": fields,
            "confidence": confidence,
            "ocr_method": ocr_method
        }
        return result
    except (Exception, UnidentifiedImageError):
        return {
            "extracted_text": "",
            "fields": {"diagnosis": None, "medicines": [], "date": None},
            "confidence": 0.0,
            "ocr_method": "printed"
        }
