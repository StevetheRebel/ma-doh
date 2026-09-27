import json
import re
from datetime import datetime
from typing import Optional
from pathlib import Path

def simple_extract_from_text(text: str) -> dict:
    # naive amount/date/desc extraction
    amount_match = re.search(r"(\d+[\.,]?\d*)", text.replace(',', ''))
    date_match = re.search(r"(\d{4}-\d{2}-\d{2})", text)
    amount = float(amount_match.group(1)) if amount_match else 0.0
    date = datetime.fromisoformat(date_match.group(1)) if date_match else datetime.utcnow()
    return {"amount": amount, "date": date, "description": text}

def extract_transaction_from_image(path: str) -> dict:
    # Try to use pytesseract if available, otherwise fallback to naive stub
    try:
        from PIL import Image
        import pytesseract
        img = Image.open(path)
        text = pytesseract.image_to_string(img)
        return simple_extract_from_text(text)
    except Exception:
        # fallback stub: return placeholder
        return {"amount": 0.0, "date": datetime.utcnow(), "description": f"Receipt at {Path(path).name}"}

def extract_transaction_from_audio(path: str) -> dict:
    # Stub: install speech packages and replace this with real ASR
    return {"amount": 0.0, "date": datetime.utcnow(), "description": f"Voice note {Path(path).name}"}

def categorize_transaction(description: Optional[str], amount: float) -> str:
    text = (description or "").lower()
    keywords = {
        "transport": ["taxi", "uber", "bus", "matatu", "transport"],
        "groceries": ["supermarket", "market", "grocer", "maize", "milk", "grocer"],
        "rent": ["rent", "house"],
        "salary": ["salary", "pay", "payslip"],
        "utilities": ["electricity", "water", "utility", "airtel", "safaricom"],
    }
    for cat, keys in keywords.items():
        for k in keys:
            if k in text:
                return cat
    return "other"
