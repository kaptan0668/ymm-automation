import re
from datetime import datetime


def _find_date(text: str):
    m = re.search(r"(\d{2}[./-]\d{2}[./-]\d{4})", text)
    if not m:
        return None
    for fmt in ("%d.%m.%Y", "%d/%m/%Y", "%d-%m-%Y"):
        try:
            return datetime.strptime(m.group(1), fmt).date()
        except Exception:
            continue
    return None


def parse_contract_text(text: str) -> dict:
    data = {}

    tax_no = re.search(r"\b(\d{10,11})\b", text)
    if tax_no:
        data["tax_no"] = tax_no.group(1)

    office = re.search(r"(?i)vergi\s*dairesi\s*[:\-]?\s*(.+)", text)
    if office:
        data["tax_office"] = office.group(1).splitlines()[0].strip()

    name = re.search(r"(?i)(m[Ã¼u]ÅŸteri|unvan|m[Ã¼u]kellef)\s*[:\\-]?\s*(.+)", text)
    if name:
        data["customer_name"] = name.group(2).splitlines()[0].strip()

    phone = re.search(r"(?i)(telefon|tel)\s*[:\-]?\s*(.+)", text)
    if phone:
        data["phone"] = phone.group(2).splitlines()[0].strip()

    email = re.search(r"(?i)(e-?posta|email)\s*[:\-]?\s*([\w\.-]+@[\w\.-]+)", text)
    if email:
        data["email"] = email.group(2).strip()

    contact = re.search(r"(?i)(yetkili|ilgili)\s*[:\-]?\s*(.+)", text)
    if contact:
        data["contact_person"] = contact.group(2).splitlines()[0].strip()

    contract_no = re.search(r"(?i)(s[Ã¶o]zleÅŸme\s*no)\s*[:\\-]?\s*([\\w/-]+)", text)
    if contract_no:
        data["contract_no"] = contract_no.group(2).strip()

    contract_type = re.search(r"(?i)(s[Ã¶o]zleÅŸme\s*t[Ã¼u]r[Ã¼u])\s*[:\\-]?\s*(.+)", text)
    if contract_type:
        data["contract_type"] = contract_type.group(2).splitlines()[0].strip()

    period = re.search(r"(\d{2})[./](\d{4})\s*-\s*(\d{2})[./](\d{4})", text)
    if period:
        data["period_start_month"] = int(period.group(1))
        data["period_start_year"] = int(period.group(2))
        data["period_end_month"] = int(period.group(3))
        data["period_end_year"] = int(period.group(4))

    data["contract_date"] = _find_date(text)

    return data
