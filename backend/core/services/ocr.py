from PIL import Image, UnidentifiedImageError
import pytesseract
from pytesseract import Output
from . import llm


def extract(image_file):
    try:
        image_file.seek(0)
        image = Image.open(image_file)
        raw_text = pytesseract.image_to_string(image).strip()
        data = pytesseract.image_to_data(image, output_type=Output.DICT)
        values = [float(x) for x in data.get("conf", []) if str(x) not in ("-1", "") and float(x) >= 0]
        confidence = round((sum(values) / len(values) / 100) if values else 0, 3)
        return {"extracted_text": raw_text, "fields": llm.extract_ocr_fields(raw_text) if raw_text else {"diagnosis": None, "medicines": [], "date": None}, "confidence": confidence}
    except (Exception, UnidentifiedImageError):
        return {"extracted_text": "", "fields": {"diagnosis": None, "medicines": [], "date": None}, "confidence": 0.0}
