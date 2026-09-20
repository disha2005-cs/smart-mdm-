"""
Shared validation helpers used across the API layer.

Centralising these keeps the rules identical everywhere (a phone number
validated on student creation is validated the same way on update) and keeps
the endpoint bodies readable.
"""
import re
from datetime import date, datetime
from typing import Optional

from fastapi import HTTPException

# ---------------------------------------------------------------- patterns

EMAIL_RE = re.compile(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$")
INDIAN_PHONE_RE = re.compile(r"^[6-9]\d{9}$")
UDISE_RE = re.compile(r"^\d{11}$")
PIN_CODE_RE = re.compile(r"^[1-9]\d{5}$")
FINANCIAL_YEAR_RE = re.compile(r"^(\d{4})-(\d{2})$")
NAME_RE = re.compile(r"^[A-Za-z][A-Za-z .'\-]*$")

GENDERS = {"Male", "Female", "Other"}
INVENTORY_UNITS = {"kg", "g", "litres", "liters", "ml", "units", "nos", "packets"}
INVENTORY_CATEGORIES = {"Grains", "Pulses", "Oil", "Vegetables", "Spices", "Dairy", "Other"}
ALLOCATION_UNITS = {"kg", "litres", "liters", "units", "nos", "quintal"}

# Grades the system supports (stored as plain strings "1".."10").
VALID_GRADES = {str(n) for n in range(1, 11)}

MAX_PHOTO_BYTES = 8 * 1024 * 1024  # 8 MB
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/jpg", "image/png", "image/webp"}

ROMAN_GRADES = {
    "I": "1", "II": "2", "III": "3", "IV": "4", "V": "5",
    "VI": "6", "VII": "7", "VIII": "8", "IX": "9", "X": "10",
}


def bad_request(detail: str) -> HTTPException:
    return HTTPException(status_code=400, detail=detail)


# ---------------------------------------------------------------- scalars

def clean_str(value: Optional[str]) -> Optional[str]:
    """Trim a string and collapse empty strings to None."""
    if value is None:
        return None
    value = str(value).strip()
    return value or None


def validate_name(value: Optional[str], field: str, *, max_len: int = 60) -> str:
    value = (value or "").strip()
    if not value:
        raise bad_request(f"{field} is required")
    if len(value) > max_len:
        raise bad_request(f"{field} must be at most {max_len} characters")
    if not NAME_RE.match(value):
        raise bad_request(
            f"{field} may only contain letters, spaces, apostrophes, periods and hyphens"
        )
    return value


def validate_phone(value: Optional[str], field: str = "Phone number", *, required: bool = False) -> Optional[str]:
    value = clean_str(value)
    if value is None:
        if required:
            raise bad_request(f"{field} is required")
        return None
    digits = re.sub(r"[\s\-()]", "", value)
    if len(digits) > 10:
        digits = re.sub(r"^(\+91|0091|91|0)", "", digits)
    if not INDIAN_PHONE_RE.match(digits):
        raise bad_request(f"{field} must be a valid 10-digit Indian mobile number")
    return digits


def validate_email(value: Optional[str], *, required: bool = False) -> Optional[str]:
    value = clean_str(value)
    if value is None:
        if required:
            raise bad_request("Email is required")
        return None
    value = value.lower()
    if len(value) > 254 or not EMAIL_RE.match(value):
        raise bad_request("Invalid email format")
    return value


def validate_gender(value: Optional[str]) -> Optional[str]:
    value = clean_str(value)
    if value is None:
        return None
    normalised = value.capitalize()
    if normalised not in GENDERS:
        raise bad_request(f"Gender must be one of: {', '.join(sorted(GENDERS))}")
    return normalised


def validate_grade(value: Optional[str], *, required: bool = False) -> Optional[str]:
    """Normalise 'Grade 5', '5th', 'V' and '5' all to '5'."""
    value = clean_str(value)
    if value is None:
        if required:
            raise bad_request("Grade is required")
        return None
    token = value.upper().replace("GRADE", "").replace("CLASS", "").strip()
    token = re.sub(r"(ST|ND|RD|TH)$", "", token).strip()
    token = ROMAN_GRADES.get(token, token)
    if token not in VALID_GRADES:
        raise bad_request("Grade must be between 1 and 10")
    return token


def validate_section(value: Optional[str]) -> Optional[str]:
    value = clean_str(value)
    if value is None:
        return None
    value = value.upper()
    if not re.match(r"^[A-Z]{1,2}$", value):
        raise bad_request("Section must be 1-2 letters (e.g. A, B, AB)")
    return value


def parse_date_of_birth(value: Optional[str]) -> Optional[date]:
    """Parse an ISO date and sanity-check it as a school student's DOB."""
    value = clean_str(value)
    if value is None:
        return None
    try:
        dob = datetime.strptime(value, "%Y-%m-%d").date()
    except ValueError:
        raise bad_request("Date of birth must be in YYYY-MM-DD format")

    today = date.today()
    if dob >= today:
        raise bad_request("Date of birth must be in the past")

    age = today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))
    if age < 3 or age > 25:
        raise bad_request("Date of birth implies an age outside the supported 3-25 year range")
    return dob


def parse_iso_date(value: Optional[str], field: str = "Date") -> Optional[date]:
    value = clean_str(value)
    if value is None:
        return None
    try:
        return datetime.strptime(value, "%Y-%m-%d").date()
    except ValueError:
        raise bad_request(f"{field} must be in YYYY-MM-DD format")


def validate_positive(
    value,
    field: str,
    *,
    allow_zero: bool = False,
    max_value: Optional[float] = None,
) -> float:
    if value is None:
        raise bad_request(f"{field} is required")
    try:
        value = float(value)
    except (TypeError, ValueError):
        raise bad_request(f"{field} must be a number")
    if value != value or value in (float("inf"), float("-inf")):  # NaN / inf
        raise bad_request(f"{field} must be a finite number")
    if allow_zero and value < 0:
        raise bad_request(f"{field} cannot be negative")
    if not allow_zero and value <= 0:
        raise bad_request(f"{field} must be greater than 0")
    if max_value is not None and value > max_value:
        raise bad_request(f"{field} must not exceed {max_value:,.2f}")
    return round(value, 3)


def validate_choice(value: Optional[str], allowed: set, field: str, *, required: bool = True) -> Optional[str]:
    """Case-insensitive membership check that returns the canonical spelling."""
    value = clean_str(value)
    if value is None:
        if required:
            raise bad_request(f"{field} is required")
        return None
    match = next((a for a in allowed if a.lower() == value.lower()), None)
    if match is None:
        raise bad_request(f"{field} must be one of: {', '.join(sorted(allowed))}")
    return match


def validate_financial_year(value: Optional[str], *, required: bool = True) -> Optional[str]:
    """Validate a '2026-27' style financial year and check the halves line up."""
    value = clean_str(value)
    if value is None:
        if required:
            raise bad_request("Financial year is required")
        return None
    match = FINANCIAL_YEAR_RE.match(value)
    if not match:
        raise bad_request("Financial year must be in YYYY-YY format (e.g. 2026-27)")
    start_year = int(match.group(1))
    end_short = int(match.group(2))
    if (start_year + 1) % 100 != end_short:
        raise bad_request(
            f"Financial year must span consecutive years (e.g. {start_year}-{(start_year + 1) % 100:02d})"
        )
    if not (2000 <= start_year <= 2100):
        raise bad_request("Financial year must be between 2000 and 2100")
    return value


def current_financial_year(today: Optional[date] = None) -> str:
    """Indian financial year runs April-March: 2026-09-20 -> '2026-27'."""
    today = today or date.today()
    start = today.year if today.month >= 4 else today.year - 1
    return f"{start}-{(start + 1) % 100:02d}"


def validate_password(password: Optional[str], *, field: str = "Password") -> str:
    if not password or len(password) < 8:
        raise bad_request(f"{field} must be at least 8 characters")
    if len(password) > 128:
        raise bad_request(f"{field} must be at most 128 characters")
    if not re.search(r"[A-Za-z]", password) or not re.search(r"\d", password):
        raise bad_request(f"{field} must contain at least one letter and one digit")
    return password


def validate_udise(value: Optional[str]) -> str:
    value = re.sub(r"\s", "", clean_str(value) or "")
    if not UDISE_RE.match(value):
        raise bad_request("UDISE code must be exactly 11 digits")
    return value


def validate_pin_code(value: Optional[str]) -> Optional[str]:
    value = clean_str(value)
    if value is None:
        return None
    value = re.sub(r"\s", "", value)
    if not PIN_CODE_RE.match(value):
        raise bad_request("PIN code must be a valid 6-digit Indian PIN code")
    return value


def validate_coordinates(latitude: Optional[float], longitude: Optional[float]):
    if latitude is not None and not (-90 <= latitude <= 90):
        raise bad_request("Latitude must be between -90 and 90")
    if longitude is not None and not (-180 <= longitude <= 180):
        raise bad_request("Longitude must be between -180 and 180")
    return latitude, longitude
