from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import date, datetime
from app.api import deps
from app.database import get_db
from app.models.daily_meal import DailyMeal
from app.models.attendance import Attendance
from app.models.inventory import Inventory
from app.models.user import UserRole
from app.schemas.inventory import DailyMeal as DailyMealSchema, DailyMealCreate
from app.services.meal_calculator import calculate_meal_requirements, calculate_cost_estimate

router = APIRouter()

@router.post("/plan", status_code=status.HTTP_200_OK)
def generate_meal_plan(
    *,
    db: Session = Depends(get_db),
    plan_date: date = None,
    current_user = Depends(deps.get_current_school_admin)
):
    """
    Generate meal plan based on today's attendance and government norms.
    Uses grade-based calculation: Primary (100g grains) vs Upper Primary (150g grains).
    """
    if not plan_date:
        plan_date = date.today()
    
    # Get students present today
    attendance_records = db.query(Attendance).filter(
        Attendance.school_id == current_user.school_id,
        Attendance.date == plan_date,
        Attendance.status == "PRESENT"
    ).all()
    
    if not attendance_records:
        raise HTTPException(
            status_code=400,
            detail=f"No attendance records found for {plan_date}. Mark attendance first."
        )
    
    student_ids = [a.student_id for a in attendance_records]
    
    # Calculate requirements based on government norms
    meal_calc = calculate_meal_requirements(
        db=db,
        school_id=current_user.school_id,
        student_ids=student_ids
    )
    
    # Get inventory costs for cost estimation
    inventory_items = db.query(Inventory).filter(
        Inventory.school_id == current_user.school_id
    ).all()
    
    inventory_costs = {}
    for item in inventory_items:
        if item.cost_per_unit:
            # Map inventory items to meal calculator format
            item_lower = item.item_name.lower()
            if 'rice' in item_lower or 'grain' in item_lower:
                inventory_costs['rice'] = item.cost_per_unit
            elif 'dal' in item_lower or 'pulse' in item_lower:
                inventory_costs['dal'] = item.cost_per_unit
            elif 'veg' in item_lower:
                inventory_costs['vegetables'] = item.cost_per_unit
            elif 'oil' in item_lower:
                inventory_costs['oil'] = item.cost_per_unit
    
    # Calculate cost
    cost_estimate = calculate_cost_estimate(meal_calc, inventory_costs)
    
    # Check inventory availability
    requirements = meal_calc["requirements"]
    inventory_status = []
    
    for item in inventory_items:
        item_lower = item.item_name.lower()
        required_qty = 0
        
        if 'rice' in item_lower or 'grain' in item_lower:
            required_qty = requirements["rice_kg"]
        elif 'dal' in item_lower or 'pulse' in item_lower:
            required_qty = requirements["dal_kg"]
        elif 'veg' in item_lower:
            required_qty = requirements["vegetables_kg"]
        elif 'oil' in item_lower:
            required_qty = requirements["oil_liters"]
        
        if required_qty > 0:
            sufficient = item.quantity >= required_qty
            inventory_status.append({
                "item_name": item.item_name,
                "required": required_qty,
                "available": item.quantity,
                "unit": item.unit,
                "sufficient": sufficient,
                "shortage": max(0, required_qty - item.quantity) if not sufficient else 0
            })
    
    return {
        "date": plan_date,
        "students": meal_calc,
        "requirements": requirements,
        "cost_estimate": cost_estimate,
        "inventory_status": inventory_status
    }


@router.post("/daily", response_model=DailyMealSchema, status_code=status.HTTP_201_CREATED)
def create_daily_meal_record(
    *,
    db: Session = Depends(get_db),
    meal_in: DailyMealCreate,
    current_user = Depends(deps.get_current_school_admin)
):
    """
    Create or update daily meal consumption record.
    """
    # Check if record already exists for this date
    existing = db.query(DailyMeal).filter(
        DailyMeal.school_id == current_user.school_id,
        DailyMeal.date == meal_in.date
    ).first()
    
    if existing:
        # Update existing record
        existing.total_students_present = meal_in.total_students_present
        existing.rice_consumed = meal_in.rice_consumed
        existing.wheat_consumed = meal_in.wheat_consumed
        existing.dal_consumed = meal_in.dal_consumed
        db.commit()
        db.refresh(existing)
        return existing
    
    # Create new record
    meal = DailyMeal(
        school_id=current_user.school_id,
        **meal_in.model_dump()
    )
    db.add(meal)
    db.commit()
    db.refresh(meal)
    return meal


@router.post("/{id}/consume", status_code=status.HTTP_200_OK)
def consume_inventory(
    id: int,
    db: Session = Depends(get_db),
    current_user = Depends(deps.get_current_school_admin)
):
    """
    Deduct meal ingredients from inventory after meal is served.
    """
    meal = db.query(DailyMeal).filter(
        DailyMeal.id == id,
        DailyMeal.school_id == current_user.school_id
    ).first()
    
    if not meal:
        raise HTTPException(status_code=404, detail="Meal record not found")
    
    # Get inventory items
    inventory_items = db.query(Inventory).filter(
        Inventory.school_id == current_user.school_id
    ).all()
    
    deductions = []
    
    for item in inventory_items:
        item_lower = item.item_name.lower()
        deduct_qty = 0
        
        if 'rice' in item_lower:
            deduct_qty = meal.rice_consumed
        elif 'wheat' in item_lower:
            deduct_qty = meal.wheat_consumed
        elif 'dal' in item_lower or 'pulse' in item_lower:
            deduct_qty = meal.dal_consumed
        
        if deduct_qty > 0:
            if item.quantity < deduct_qty:
                raise HTTPException(
                    status_code=400,
                    detail=f"Insufficient {item.item_name}. Available: {item.quantity}, Required: {deduct_qty}"
                )
            
            item.quantity -= deduct_qty
            deductions.append({
                "item": item.item_name,
                "deducted": deduct_qty,
                "remaining": item.quantity
            })
    
    db.commit()
    
    return {
        "message": "Inventory updated successfully",
        "deductions": deductions
    }


@router.get("/", response_model=List[DailyMealSchema])
def get_daily_meals(
    skip: int = 0,
    limit: int = 30,
    db: Session = Depends(get_db),
    current_user = Depends(deps.get_current_user)
):
    """
    Get daily meal records.
    """
    query = db.query(DailyMeal)
    
    if current_user.role == UserRole.SCHOOL:
        query = query.filter(DailyMeal.school_id == current_user.school_id)
    
    meals = query.order_by(DailyMeal.date.desc()).offset(skip).limit(limit).all()
    return meals
