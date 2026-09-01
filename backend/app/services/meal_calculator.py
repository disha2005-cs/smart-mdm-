"""
Meal calculation service based on Government of India MDMS norms.
Official norms: Primary (I-V) and Upper Primary (VI-VIII) have different requirements.
"""
from typing import Dict, List
from sqlalchemy.orm import Session
from app.models.student import Student

# Government MDMS Food Norms (per child per day)
GOVERNMENT_NORMS = {
    "PRIMARY": {  # Grades I-V
        "calories": 450,
        "protein_gms": 12,
        "food_grains_gms": 100,  # rice/wheat
        "pulses_gms": 20,
        "vegetables_gms": 50,
        "oil_fat_gms": 5,
    },
    "UPPER_PRIMARY": {  # Grades VI-VIII
        "calories": 700,
        "protein_gms": 20,
        "food_grains_gms": 150,  # rice/wheat
        "pulses_gms": 30,
        "vegetables_gms": 75,
        "oil_fat_gms": 7.5,
    }
}

def classify_student_by_grade(grade: str) -> str:
    """
    Classify student as PRIMARY or UPPER_PRIMARY based on grade.
    Primary: Grades 1-5
    Upper Primary: Grades 6-8
    """
    try:
        grade_num = int(grade)
        if 1 <= grade_num <= 5:
            return "PRIMARY"
        elif 6 <= grade_num <= 8:
            return "UPPER_PRIMARY"
        else:
            # Grades 9-10 use Upper Primary norms as fallback
            return "UPPER_PRIMARY"
    except (ValueError, TypeError):
        # If grade is not a number, default to PRIMARY
        return "PRIMARY"


def calculate_meal_requirements(
    db: Session,
    school_id: int,
    student_ids: List[int] = None
) -> Dict:
    """
    Calculate meal requirements based on government norms and student grades.
    
    Args:
        db: Database session
        school_id: School ID
        student_ids: Optional list of specific student IDs (for attendance-based calculation)
    
    Returns:
        Dictionary with total ingredient requirements and breakdown by category
    """
    # Get students (either specific IDs or all active students)
    query = db.query(Student).filter(
        Student.school_id == school_id,
        Student.is_active == True
    )
    
    if student_ids:
        query = query.filter(Student.id.in_(student_ids))
    
    students = query.all()
    
    # Count students by category
    primary_count = 0
    upper_primary_count = 0
    
    for student in students:
        category = classify_student_by_grade(student.grade)
        if category == "PRIMARY":
            primary_count += 1
        else:
            upper_primary_count += 1
    
    # Calculate total requirements
    primary_norms = GOVERNMENT_NORMS["PRIMARY"]
    upper_norms = GOVERNMENT_NORMS["UPPER_PRIMARY"]
    
    total_requirements = {
        "rice_kg": round(
            (primary_count * primary_norms["food_grains_gms"] + 
             upper_primary_count * upper_norms["food_grains_gms"]) / 1000, 
            2
        ),
        "dal_kg": round(
            (primary_count * primary_norms["pulses_gms"] + 
             upper_primary_count * upper_norms["pulses_gms"]) / 1000, 
            2
        ),
        "vegetables_kg": round(
            (primary_count * primary_norms["vegetables_gms"] + 
             upper_primary_count * upper_norms["vegetables_gms"]) / 1000, 
            2
        ),
        "oil_liters": round(
            (primary_count * primary_norms["oil_fat_gms"] + 
             upper_primary_count * upper_norms["oil_fat_gms"]) / 1000, 
            3
        ),
        "total_calories": (
            primary_count * primary_norms["calories"] + 
            upper_primary_count * upper_norms["calories"]
        ),
        "total_protein_gms": (
            primary_count * primary_norms["protein_gms"] + 
            upper_primary_count * upper_norms["protein_gms"]
        ),
    }
    
    return {
        "total_students": len(students),
        "primary_students": primary_count,
        "upper_primary_students": upper_primary_count,
        "requirements": total_requirements,
        "per_student_breakdown": {
            "primary": primary_norms,
            "upper_primary": upper_norms
        }
    }


def calculate_cost_estimate(requirements: Dict, inventory_costs: Dict[str, float]) -> Dict:
    """
    Calculate estimated cost for meal requirements.
    
    Args:
        requirements: Output from calculate_meal_requirements
        inventory_costs: Dictionary mapping item names to cost per unit
            Example: {"rice": 40.0, "dal": 120.0, "vegetables": 30.0, "oil": 150.0}
    
    Returns:
        Dictionary with cost breakdown
    """
    costs = {}
    total_cost = 0.0
    
    req = requirements["requirements"]
    
    # Map requirements to inventory items
    item_mapping = {
        "rice_kg": "rice",
        "dal_kg": "dal",
        "vegetables_kg": "vegetables",
        "oil_liters": "oil"
    }
    
    for req_key, item_name in item_mapping.items():
        quantity = req.get(req_key, 0)
        unit_cost = inventory_costs.get(item_name, 0)
        item_cost = round(quantity * unit_cost, 2)
        
        costs[item_name] = {
            "quantity": quantity,
            "unit_cost": unit_cost,
            "total_cost": item_cost
        }
        total_cost += item_cost
    
    return {
        "item_costs": costs,
        "total_cost": round(total_cost, 2),
        "per_student_cost": round(total_cost / requirements["total_students"], 2) if requirements["total_students"] > 0 else 0
    }
