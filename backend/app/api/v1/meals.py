from datetime import date as date_type
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.api import deps
from app.core.validators import bad_request, parse_iso_date, validate_positive
from app.database import get_db
from app.models.attendance import Attendance
from app.models.daily_meal import DailyMeal
from app.models.inventory import Inventory
from app.models.user import UserRole
from app.schemas.inventory import DailyMeal as DailyMealSchema, DailyMealCreate
from app.services.meal_calculator import (
    calculate_cost_estimate,
    calculate_meal_requirements,
    match_inventory_item,
)

router = APIRouter()

STATUS_PRESENT = "PRESENT"

# Requirement key per ingredient, used for both planning and stock deduction.
REQUIREMENT_KEYS = {
    "rice": ("rice_kg", "kg"),
    "wheat": ("wheat_kg", "kg"),
    "dal": ("dal_kg", "kg"),
    "vegetables": ("vegetables_kg", "kg"),
    "oil": ("oil_liters", "litres"),
}


class MealPlanRequest(BaseModel):
    date: Optional[str] = None
    # Schools that serve a rice/wheat mix can shift the grain split.
    rice_share: float = Field(default=1.0, ge=0.0, le=1.0)


def _build_meal_plan(db: Session, school_id: int, plan_date: date_type, rice_share: float) -> dict:
    """Assemble the full plan: students, requirements, costs and stock gaps."""
    attendance_records = db.query(Attendance.student_id).filter(
        Attendance.school_id == school_id,
        Attendance.date == plan_date,
        Attendance.status == STATUS_PRESENT,
    ).all()

    if not attendance_records:
        raise bad_request(
            f"No attendance recorded for {plan_date.isoformat()}. Mark attendance before generating a meal plan."
        )

    student_ids = [row[0] for row in attendance_records]

    meal_calc = calculate_meal_requirements(
        db=db, school_id=school_id, student_ids=student_ids, rice_share=rice_share
    )
    requirements = meal_calc["requirements"]

    inventory_items = db.query(Inventory).filter(Inventory.school_id == school_id).all()

    # Several rows can map to one ingredient ("Rice" and "Basmati Rice"), so
    # stock is pooled per ingredient before it is compared with the requirement.
    stock_by_ingredient: dict = {}
    costs_by_ingredient: dict = {}

    for item in inventory_items:
        key = match_inventory_item(item.item_name)
        if key is None:
            continue
        bucket = stock_by_ingredient.setdefault(key, {"quantity": 0.0, "unit": item.unit, "items": []})
        bucket["quantity"] += item.quantity or 0
        bucket["items"].append(item.item_name)
        if item.cost_per_unit:
            # Where several rows price the same ingredient, use the dearest so
            # the estimate errs on the safe side for budgeting.
            costs_by_ingredient[key] = max(costs_by_ingredient.get(key, 0), item.cost_per_unit)

    cost_estimate = calculate_cost_estimate(meal_calc, costs_by_ingredient)

    inventory_status = []
    for ingredient, (req_key, default_unit) in REQUIREMENT_KEYS.items():
        required = float(requirements.get(req_key, 0) or 0)
        if required <= 0:
            continue
        stock = stock_by_ingredient.get(ingredient)
        available = float(stock["quantity"]) if stock else 0.0
        inventory_status.append({
            "ingredient": ingredient,
            "item_name": ", ".join(stock["items"]) if stock else ingredient.title(),
            "tracked": stock is not None,
            "required": round(required, 3),
            "available": round(available, 3),
            "unit": stock["unit"] if stock else default_unit,
            "sufficient": available >= required,
            "shortage": round(max(0.0, required - available), 3),
        })

    existing_record = db.query(DailyMeal).filter(
        DailyMeal.school_id == school_id,
        DailyMeal.date == plan_date,
    ).first()

    return {
        "date": plan_date.isoformat(),
        "students": meal_calc,
        "requirements": requirements,
        "cost_estimate": cost_estimate,
        "inventory_status": inventory_status,
        "shortages": [row for row in inventory_status if not row["sufficient"]],
        "can_serve": all(row["sufficient"] for row in inventory_status) if inventory_status else False,
        "daily_record": {
            "id": existing_record.id,
            "inventory_consumed": bool(existing_record.inventory_consumed),
        } if existing_record else None,
    }


@router.post("/plan", status_code=status.HTTP_200_OK)
def generate_meal_plan(
    *,
    db: Session = Depends(get_db),
    date: Optional[str] = None,
    rice_share: float = 1.0,
    current_user=Depends(deps.get_current_school_admin),
):
    """
    Generate a meal plan from the day's attendance and the government norms.

    Grade-aware: Primary (100g grains) and Upper Primary (150g grains) are
    counted separately rather than applying one flat per-head figure.
    """
    plan_date = parse_iso_date(date, "Date") or date_type.today()

    if plan_date > date_type.today():
        raise bad_request("Cannot generate a meal plan for a future date")

    if not 0.0 <= rice_share <= 1.0:
        raise bad_request("rice_share must be between 0 and 1")

    return _build_meal_plan(db, current_user.school_id, plan_date, rice_share)


@router.post("/daily", response_model=DailyMealSchema, status_code=status.HTTP_201_CREATED)
def create_daily_meal_record(
    *,
    db: Session = Depends(get_db),
    meal_in: DailyMealCreate,
    current_user=Depends(deps.get_current_school_admin),
):
    """Create or update the daily meal consumption record."""
    if meal_in.date > date_type.today():
        raise bad_request("Cannot record consumption for a future date")

    rice = validate_positive(meal_in.rice_consumed, "Rice consumed", allow_zero=True, max_value=100_000)
    wheat = validate_positive(meal_in.wheat_consumed, "Wheat consumed", allow_zero=True, max_value=100_000)
    dal = validate_positive(meal_in.dal_consumed, "Dal consumed", allow_zero=True, max_value=100_000)

    if meal_in.total_students_present < 0:
        raise bad_request("Students present cannot be negative")

    # Sanity-check the figures against the register: recording a meal for more
    # children than were present is the most common data-entry error here.
    present_count = db.query(Attendance).filter(
        Attendance.school_id == current_user.school_id,
        Attendance.date == meal_in.date,
        Attendance.status == STATUS_PRESENT,
    ).count()

    if present_count and meal_in.total_students_present > present_count:
        raise bad_request(
            f"{meal_in.total_students_present} meals recorded but only {present_count} "
            f"student(s) were marked present on {meal_in.date.isoformat()}"
        )

    existing = db.query(DailyMeal).filter(
        DailyMeal.school_id == current_user.school_id,
        DailyMeal.date == meal_in.date,
    ).first()

    if existing:
        if existing.inventory_consumed:
            raise bad_request(
                "Stock has already been deducted for this date. Delete the record first if it needs correcting."
            )
        existing.total_students_present = meal_in.total_students_present
        existing.rice_consumed = rice
        existing.wheat_consumed = wheat
        existing.dal_consumed = dal
        db.commit()
        db.refresh(existing)
        return existing

    meal = DailyMeal(
        school_id=current_user.school_id,
        date=meal_in.date,
        total_students_present=meal_in.total_students_present,
        rice_consumed=rice,
        wheat_consumed=wheat,
        dal_consumed=dal,
    )
    db.add(meal)
    db.commit()
    db.refresh(meal)
    return meal


@router.post("/record-from-plan", response_model=DailyMealSchema, status_code=status.HTTP_201_CREATED)
def record_meal_from_plan(
    *,
    db: Session = Depends(get_db),
    target_date: Optional[str] = None,
    rice_share: float = 1.0,
    current_user=Depends(deps.get_current_school_admin),
):
    """
    Save the computed plan as the day's consumption record in one step.

    This keeps the recorded figures identical to the norms-based calculation
    instead of relying on someone retyping them.
    """
    plan_date = parse_iso_date(target_date, "Date") or date_type.today()
    if plan_date > date_type.today():
        raise bad_request("Cannot record consumption for a future date")

    plan = _build_meal_plan(db, current_user.school_id, plan_date, rice_share)
    requirements = plan["requirements"]

    existing = db.query(DailyMeal).filter(
        DailyMeal.school_id == current_user.school_id,
        DailyMeal.date == plan_date,
    ).first()

    if existing and existing.inventory_consumed:
        raise bad_request("Stock has already been deducted for this date.")

    record = existing or DailyMeal(school_id=current_user.school_id, date=plan_date)
    record.total_students_present = plan["students"]["total_students"]
    record.rice_consumed = requirements["rice_kg"]
    record.wheat_consumed = requirements["wheat_kg"]
    record.dal_consumed = requirements["dal_kg"]

    if existing is None:
        db.add(record)

    db.commit()
    db.refresh(record)
    return record


@router.post("/{id}/consume", status_code=status.HTTP_200_OK)
def consume_inventory(
    id: int,
    db: Session = Depends(get_db),
    current_user=Depends(deps.get_current_school_admin),
):
    """
    Deduct a day's meal ingredients from stock.

    The meal row is locked and flagged, so calling this twice for the same day
    cannot deduct the stock twice.
    """
    meal = db.query(DailyMeal).filter(
        DailyMeal.id == id,
        DailyMeal.school_id == current_user.school_id,
    ).with_for_update().first()

    if not meal:
        raise HTTPException(status_code=404, detail="Meal record not found")

    if meal.inventory_consumed:
        raise bad_request(f"Stock was already deducted for {meal.date.isoformat()}")

    required = {
        "rice": float(meal.rice_consumed or 0),
        "wheat": float(meal.wheat_consumed or 0),
        "dal": float(meal.dal_consumed or 0),
    }
    required = {key: value for key, value in required.items() if value > 0}

    if not required:
        raise bad_request("This meal record has no ingredient quantities to deduct")

    # Lock every row up front and order deterministically to avoid deadlocking
    # against a concurrent deduction for another day.
    inventory_items = db.query(Inventory).filter(
        Inventory.school_id == current_user.school_id
    ).order_by(Inventory.id).with_for_update().all()

    pools: dict = {}
    for item in inventory_items:
        key = match_inventory_item(item.item_name)
        if key in required:
            pools.setdefault(key, []).append(item)

    # Validate the whole basket before mutating anything, so a shortage on the
    # last ingredient cannot leave the first ones already deducted.
    for ingredient, amount in required.items():
        available = sum(i.quantity or 0 for i in pools.get(ingredient, []))
        if not pools.get(ingredient):
            db.rollback()
            raise bad_request(
                f"No inventory item matching '{ingredient}' exists. Add it to inventory before serving."
            )
        if available + 1e-9 < amount:
            db.rollback()
            raise bad_request(
                f"Insufficient {ingredient}. Available: {round(available, 3)}, required: {round(amount, 3)}"
            )

    deductions = []
    for ingredient, amount in required.items():
        remaining = amount
        # Draw from the largest stock first so small partial rows are not
        # left stranded at awkward quantities.
        for item in sorted(pools[ingredient], key=lambda i: i.quantity or 0, reverse=True):
            if remaining <= 1e-9:
                break
            take = min(remaining, item.quantity or 0)
            if take <= 0:
                continue
            item.quantity = round((item.quantity or 0) - take, 3)
            remaining = round(remaining - take, 6)
            deductions.append({
                "item": item.item_name,
                "ingredient": ingredient,
                "deducted": round(take, 3),
                "remaining": item.quantity,
                "unit": item.unit,
            })

    meal.inventory_consumed = True
    db.commit()

    return {
        "message": f"Stock updated for {meal.date.isoformat()}",
        "date": meal.date.isoformat(),
        "deductions": deductions,
    }


@router.get("/", response_model=List[DailyMealSchema])
def get_daily_meals(
    skip: int = 0,
    limit: int = 30,
    school_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user=Depends(deps.get_current_user),
):
    """Get daily meal records, newest first."""
    if skip < 0 or limit < 1 or limit > 365:
        raise bad_request("skip must be >= 0 and limit between 1 and 365")

    query = db.query(DailyMeal)

    if current_user.role == UserRole.SCHOOL:
        query = query.filter(DailyMeal.school_id == current_user.school_id)
    elif school_id is not None:
        query = query.filter(DailyMeal.school_id == school_id)

    return query.order_by(DailyMeal.date.desc()).offset(skip).limit(limit).all()


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_daily_meal(
    id: int,
    db: Session = Depends(get_db),
    current_user=Depends(deps.get_current_school_admin),
):
    """
    Delete a meal record, restoring any stock that was deducted for it.

    Without the restore, deleting a consumed record would permanently lose the
    stock it had taken.
    """
    meal = db.query(DailyMeal).filter(
        DailyMeal.id == id,
        DailyMeal.school_id == current_user.school_id,
    ).with_for_update().first()

    if not meal:
        raise HTTPException(status_code=404, detail="Meal record not found")

    if meal.inventory_consumed:
        restore = {
            "rice": float(meal.rice_consumed or 0),
            "wheat": float(meal.wheat_consumed or 0),
            "dal": float(meal.dal_consumed or 0),
        }
        inventory_items = db.query(Inventory).filter(
            Inventory.school_id == current_user.school_id
        ).order_by(Inventory.id).with_for_update().all()

        for ingredient, amount in restore.items():
            if amount <= 0:
                continue
            target = next(
                (i for i in inventory_items if match_inventory_item(i.item_name) == ingredient),
                None,
            )
            if target is not None:
                target.quantity = round((target.quantity or 0) + amount, 3)

    db.delete(meal)
    db.commit()
    return None
