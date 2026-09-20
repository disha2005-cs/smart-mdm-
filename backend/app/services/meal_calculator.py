"""
Meal calculation service based on Government of India PM POSHAN (MDMS) norms.

Official norms differ by stage: Primary (classes I-V) and Upper Primary
(classes VI-VIII). Classes IX-X are not covered by the scheme, so they are
budgeted at the Upper Primary rate and reported separately rather than being
silently folded into the Upper Primary count.
"""
from typing import Dict, List, Optional

from sqlalchemy.orm import Session

from app.models.student import Student

# Government PM POSHAN food norms, per child per day.
GOVERNMENT_NORMS = {
    "PRIMARY": {  # Classes I-V
        "calories": 450,
        "protein_gms": 12,
        "food_grains_gms": 100,  # rice/wheat
        "pulses_gms": 20,
        "vegetables_gms": 50,
        "oil_fat_gms": 5,
    },
    "UPPER_PRIMARY": {  # Classes VI-VIII
        "calories": 700,
        "protein_gms": 20,
        "food_grains_gms": 150,  # rice/wheat
        "pulses_gms": 30,
        "vegetables_gms": 75,
        "oil_fat_gms": 7.5,
    },
}

# Ingredient keys the rest of the app uses, and the inventory names they map to.
INGREDIENT_KEYS = ("rice", "wheat", "dal", "vegetables", "oil")

# Default share of the grain requirement served as rice vs wheat. Schools that
# serve only rice keep the default; the split is surfaced in the response so it
# is never a hidden assumption.
DEFAULT_RICE_SHARE = 1.0


def classify_student_by_grade(grade: Optional[str]) -> str:
    """
    Classify a student as PRIMARY, UPPER_PRIMARY or SECONDARY.

    Accepts "5", "Grade 5", "5th" and roman numerals. Anything unparseable is
    treated as PRIMARY, which is the lower-cost bucket, so an unknown grade can
    never inflate the requirement.
    """
    if grade is None:
        return "PRIMARY"

    token = str(grade).strip().upper()
    token = token.replace("GRADE", "").replace("CLASS", "").replace("STD", "").strip()
    for suffix in ("ST", "ND", "RD", "TH"):
        if token.endswith(suffix):
            token = token[: -len(suffix)].strip()

    roman = {"I": 1, "II": 2, "III": 3, "IV": 4, "V": 5,
             "VI": 6, "VII": 7, "VIII": 8, "IX": 9, "X": 10}

    if token in roman:
        grade_num = roman[token]
    else:
        try:
            grade_num = int(float(token))
        except (ValueError, TypeError):
            return "PRIMARY"

    if 1 <= grade_num <= 5:
        return "PRIMARY"
    if 6 <= grade_num <= 8:
        return "UPPER_PRIMARY"
    # Classes IX-X sit outside the scheme; cost them at the Upper Primary rate.
    return "SECONDARY"


def _norms_for(category: str) -> Dict:
    return GOVERNMENT_NORMS["PRIMARY"] if category == "PRIMARY" else GOVERNMENT_NORMS["UPPER_PRIMARY"]


def requirements_from_grade_counts(
    counts_by_grade: Dict[Optional[str], int],
    rice_share: float = DEFAULT_RICE_SHARE,
) -> Dict:
    """
    Build a requirement set from a ``{grade: headcount}`` histogram.

    Same arithmetic as :func:`calculate_meal_requirements`, but taking counts
    the caller has already aggregated (in SQL, say) instead of a list of
    student rows. Both entry points share :func:`_totals_from_counts`, so the
    numbers cannot drift apart.
    """
    counts = {"PRIMARY": 0, "UPPER_PRIMARY": 0, "SECONDARY": 0}
    for grade, headcount in counts_by_grade.items():
        counts[classify_student_by_grade(grade)] += int(headcount or 0)
    return _totals_from_counts(counts, rice_share)


def _totals_from_counts(counts: Dict[str, int], rice_share: float) -> Dict:
    """Turn per-stage headcounts into the full requirement payload."""
    rice_share = min(max(float(rice_share), 0.0), 1.0)

    # Totals in grams first, converted once at the end. Summing rounded
    # per-category kilograms is what previously drifted from the true total.
    totals = {"food_grains_gms": 0.0, "pulses_gms": 0.0, "vegetables_gms": 0.0,
              "oil_fat_gms": 0.0, "calories": 0.0, "protein_gms": 0.0}

    for category, count in counts.items():
        norms = _norms_for(category)
        for key in totals:
            totals[key] += norms[key] * count

    grains_kg = totals["food_grains_gms"] / 1000.0

    requirements = {
        "rice_kg": round(grains_kg * rice_share, 3),
        "wheat_kg": round(grains_kg * (1 - rice_share), 3),
        "grains_kg": round(grains_kg, 3),
        "dal_kg": round(totals["pulses_gms"] / 1000.0, 3),
        "vegetables_kg": round(totals["vegetables_gms"] / 1000.0, 3),
        "oil_liters": round(totals["oil_fat_gms"] / 1000.0, 3),
        "total_calories": int(totals["calories"]),
        "total_protein_gms": round(totals["protein_gms"], 2),
    }

    total_students = sum(counts.values())

    return {
        "total_students": total_students,
        "primary_students": counts["PRIMARY"],
        "upper_primary_students": counts["UPPER_PRIMARY"],
        "secondary_students": counts["SECONDARY"],
        "rice_share": rice_share,
        "requirements": requirements,
        "per_student_averages": {
            "calories": round(totals["calories"] / total_students, 1) if total_students else 0,
            "protein_gms": round(totals["protein_gms"] / total_students, 2) if total_students else 0,
        },
        "per_student_breakdown": {
            "primary": GOVERNMENT_NORMS["PRIMARY"],
            "upper_primary": GOVERNMENT_NORMS["UPPER_PRIMARY"],
        },
    }


def calculate_meal_requirements(
    db: Session,
    school_id: int,
    student_ids: Optional[List[int]] = None,
    rice_share: float = DEFAULT_RICE_SHARE,
) -> Dict:
    """
    Calculate meal requirements from the government norms and student grades.

    Args:
        db: Database session
        school_id: School ID
        student_ids: Optional list of student IDs (for attendance-based planning).
            An empty list means "nobody present" and yields zero requirements -
            it is not the same as ``None`` ("all enrolled students").
        rice_share: Fraction of the grain requirement served as rice (0-1).
    """
    rice_share = min(max(float(rice_share), 0.0), 1.0)

    if student_ids is not None and len(student_ids) == 0:
        students: List[Student] = []
    else:
        query = db.query(Student).filter(
            Student.school_id == school_id,
            Student.is_active.is_(True),
        )
        if student_ids:
            # De-duplicate: one student cannot be counted twice for one meal.
            query = query.filter(Student.id.in_(set(student_ids)))
        students = query.all()

    counts = {"PRIMARY": 0, "UPPER_PRIMARY": 0, "SECONDARY": 0}
    for student in students:
        counts[classify_student_by_grade(student.grade)] += 1

    return _totals_from_counts(counts, rice_share)


def calculate_cost_estimate(meal_plan: Dict, inventory_costs: Dict[str, float]) -> Dict:
    """
    Cost the requirements using the school's own per-unit inventory prices.

    Args:
        meal_plan: Output of :func:`calculate_meal_requirements`
        inventory_costs: ``{"rice": 40.0, "dal": 120.0, ...}`` in rupees per kg/litre

    Items with no recorded price contribute nothing to the total and are
    flagged via ``missing_prices`` so the figure is never quietly understated.
    """
    requirements = meal_plan["requirements"]

    quantity_keys = {
        "rice": "rice_kg",
        "wheat": "wheat_kg",
        "dal": "dal_kg",
        "vegetables": "vegetables_kg",
        "oil": "oil_liters",
    }

    costs = {}
    total_cost = 0.0
    missing_prices = []

    for item_name, req_key in quantity_keys.items():
        quantity = float(requirements.get(req_key, 0) or 0)
        unit_cost = inventory_costs.get(item_name)

        if quantity > 0 and unit_cost is None:
            missing_prices.append(item_name)

        unit_cost = float(unit_cost or 0)
        item_cost = round(quantity * unit_cost, 2)

        costs[item_name] = {
            "quantity": round(quantity, 3),
            "unit_cost": unit_cost,
            "total_cost": item_cost,
            "priced": unit_cost > 0,
        }
        total_cost += item_cost

    total_students = meal_plan.get("total_students", 0) or 0

    return {
        "item_costs": costs,
        "total_cost": round(total_cost, 2),
        "per_student_cost": round(total_cost / total_students, 2) if total_students else 0.0,
        "missing_prices": missing_prices,
        "is_complete": not missing_prices,
    }


def match_inventory_item(item_name: Optional[str]) -> Optional[str]:
    """
    Map a free-text inventory item name onto an ingredient key.

    Order matters: "wheat flour" must resolve to wheat before the generic
    "flour"/grain fallback, and "mustard oil" to oil rather than to nothing.
    """
    if not item_name:
        return None

    name = item_name.lower()

    if any(token in name for token in ("rice", "chawal", "paddy")):
        return "rice"
    if any(token in name for token in ("wheat", "atta", "gehu", "flour")):
        return "wheat"
    if any(token in name for token in ("dal", "daal", "pulse", "lentil", "gram", "chana", "moong", "toor", "arhar")):
        return "dal"
    if "oil" in name or "ghee" in name:
        return "oil"
    if any(token in name for token in ("veg", "potato", "onion", "tomato", "carrot", "sabzi")):
        return "vegetables"
    if "grain" in name:
        return "rice"
    return None
