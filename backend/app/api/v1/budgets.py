from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api import deps
from app.core.validators import (
    bad_request,
    clean_str,
    current_financial_year,
    validate_financial_year,
    validate_positive,
)
from app.database import get_db
from app.models.budget import Budget
from app.models.school import School
from app.models.user import UserRole
from app.schemas.budget import Budget as BudgetSchema, BudgetCreate, BudgetUpdate

router = APIRouter()

MAX_BUDGET = 1_000_000_000.0  # ₹100 crore per school per year


class UtilizeRequest(BaseModel):
    amount: float = Field(..., gt=0)
    note: Optional[str] = Field(default=None, max_length=200)


@router.post("/", response_model=BudgetSchema, status_code=status.HTTP_201_CREATED)
def allocate_budget(
    *,
    db: Session = Depends(get_db),
    budget_in: BudgetCreate,
    current_user=Depends(deps.get_current_gov_admin),
):
    """Allocate a school's budget for a financial year."""
    financial_year = validate_financial_year(budget_in.financial_year)
    amount = validate_positive(budget_in.allocated_amount, "Allocated amount", max_value=MAX_BUDGET)

    school = db.query(School).filter(School.id == budget_in.school_id).first()
    if not school:
        raise HTTPException(status_code=404, detail="School not found")

    existing = db.query(Budget).filter(
        Budget.school_id == budget_in.school_id,
        Budget.financial_year == financial_year,
    ).first()

    if existing:
        raise bad_request(
            f"{school.school_name} already has a budget for {financial_year}. Edit that allocation instead."
        )

    budget = Budget(
        school_id=budget_in.school_id,
        financial_year=financial_year,
        allocated_amount=amount,
        utilized_amount=0.0,
    )
    db.add(budget)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise bad_request(f"A budget for {financial_year} already exists for this school")

    db.refresh(budget)
    return budget


@router.get("/", response_model=List[BudgetSchema])
def get_budgets(
    skip: int = 0,
    limit: int = 100,
    financial_year: Optional[str] = None,
    school_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user=Depends(deps.get_current_user),
):
    """Government admins see every budget; school admins see their own."""
    if skip < 0 or limit < 1 or limit > 500:
        raise bad_request("skip must be >= 0 and limit between 1 and 500")

    query = db.query(Budget)

    if current_user.role == UserRole.SCHOOL:
        query = query.filter(Budget.school_id == current_user.school_id)
    elif school_id is not None:
        query = query.filter(Budget.school_id == school_id)

    if clean_str(financial_year):
        query = query.filter(Budget.financial_year == validate_financial_year(financial_year))

    return query.order_by(Budget.financial_year.desc(), Budget.created_at.desc()).offset(skip).limit(limit).all()


@router.get("/summary/government")
def get_government_budget_summary(
    financial_year: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user=Depends(deps.get_current_gov_admin),
):
    """State-wide budget summary with a district breakdown."""
    # Default to the live financial year rather than a hardcoded one.
    financial_year = validate_financial_year(financial_year) if clean_str(financial_year) else current_financial_year()

    totals = db.query(
        func.coalesce(func.sum(Budget.allocated_amount), 0.0),
        func.coalesce(func.sum(Budget.utilized_amount), 0.0),
        func.count(Budget.id),
    ).filter(Budget.financial_year == financial_year).one()

    total_allocated = float(totals[0])
    total_utilized = float(totals[1])
    schools_covered = int(totals[2])

    district_summary = db.query(
        School.district,
        func.sum(Budget.allocated_amount).label("allocated"),
        func.sum(Budget.utilized_amount).label("utilized"),
        func.count(func.distinct(Budget.school_id)).label("schools"),
    ).join(School, Budget.school_id == School.id).filter(
        Budget.financial_year == financial_year
    ).group_by(School.district).order_by(func.sum(Budget.allocated_amount).desc()).all()

    total_schools = db.query(func.count(School.id)).filter(School.is_active.is_(True)).scalar() or 0

    return {
        "financial_year": financial_year,
        "total_allocated": round(total_allocated, 2),
        "total_utilized": round(total_utilized, 2),
        "remaining": round(total_allocated - total_utilized, 2),
        "utilization_percentage": round(total_utilized / total_allocated * 100, 2) if total_allocated else 0.0,
        "schools_covered": schools_covered,
        "schools_without_budget": max(0, total_schools - schools_covered),
        "district_breakdown": [{
            "district": row[0],
            "allocated": round(float(row[1] or 0), 2),
            "utilized": round(float(row[2] or 0), 2),
            "remaining": round(float(row[1] or 0) - float(row[2] or 0), 2),
            "utilization_percentage": (
                round(float(row[2] or 0) / float(row[1]) * 100, 2) if row[1] else 0.0
            ),
            "schools": row[3],
        } for row in district_summary],
    }


@router.get("/summary/school")
def get_school_budget_summary(
    financial_year: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user=Depends(deps.get_current_school_admin),
):
    """Budget position for the caller's own school."""
    financial_year = validate_financial_year(financial_year) if clean_str(financial_year) else current_financial_year()

    budget = db.query(Budget).filter(
        Budget.school_id == current_user.school_id,
        Budget.financial_year == financial_year,
    ).first()

    if not budget:
        return {
            "financial_year": financial_year,
            "allocated": 0.0,
            "utilized": 0.0,
            "remaining": 0.0,
            "utilization_percentage": 0.0,
            "has_budget": False,
        }

    allocated = float(budget.allocated_amount or 0)
    utilized = float(budget.utilized_amount or 0)

    return {
        "id": budget.id,
        "financial_year": financial_year,
        "allocated": round(allocated, 2),
        "utilized": round(utilized, 2),
        "remaining": round(allocated - utilized, 2),
        "utilization_percentage": round(utilized / allocated * 100, 2) if allocated else 0.0,
        "has_budget": True,
    }


@router.get("/{id}", response_model=BudgetSchema)
def get_budget(
    id: int,
    db: Session = Depends(get_db),
    current_user=Depends(deps.get_current_user),
):
    """Get a specific budget."""
    budget = db.query(Budget).filter(Budget.id == id).first()
    if not budget:
        raise HTTPException(status_code=404, detail="Budget not found")

    if current_user.role == UserRole.SCHOOL and budget.school_id != current_user.school_id:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    return budget


@router.put("/{id}", response_model=BudgetSchema)
def update_budget(
    id: int,
    budget_in: BudgetUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(deps.get_current_gov_admin),
):
    """Update a budget allocation or its recorded utilisation."""
    budget = db.query(Budget).filter(Budget.id == id).with_for_update().first()
    if not budget:
        raise HTTPException(status_code=404, detail="Budget not found")

    update_data = budget_in.model_dump(exclude_unset=True)
    if not update_data:
        raise bad_request("No fields to update")

    allocated = budget.allocated_amount or 0.0
    utilized = budget.utilized_amount or 0.0

    if "allocated_amount" in update_data and update_data["allocated_amount"] is not None:
        allocated = validate_positive(update_data["allocated_amount"], "Allocated amount", max_value=MAX_BUDGET)

    if "utilized_amount" in update_data and update_data["utilized_amount"] is not None:
        utilized = validate_positive(
            update_data["utilized_amount"], "Utilized amount", allow_zero=True, max_value=MAX_BUDGET
        )

    # The invariant that makes every downstream percentage meaningful.
    if utilized > allocated:
        raise bad_request(
            f"Utilized amount (₹{utilized:,.2f}) cannot exceed the allocation (₹{allocated:,.2f})"
        )

    budget.allocated_amount = allocated
    budget.utilized_amount = utilized

    db.commit()
    db.refresh(budget)
    return budget


@router.post("/{id}/utilize")
def utilize_budget(
    id: int,
    payload: UtilizeRequest,
    db: Session = Depends(get_db),
    current_user=Depends(deps.get_current_school_admin),
):
    """Record budget utilisation by a school."""
    amount = validate_positive(payload.amount, "Utilization amount", max_value=MAX_BUDGET)

    # Row lock so two concurrent spends cannot both pass the remaining check.
    budget = db.query(Budget).filter(
        Budget.id == id,
        Budget.school_id == current_user.school_id,
    ).with_for_update().first()

    if not budget:
        raise HTTPException(status_code=404, detail="Budget not found")

    allocated = float(budget.allocated_amount or 0)
    utilized = float(budget.utilized_amount or 0)
    remaining = allocated - utilized

    if amount > remaining:
        raise bad_request(
            f"Cannot utilize ₹{amount:,.2f}. Remaining budget: ₹{remaining:,.2f}"
        )

    budget.utilized_amount = round(utilized + amount, 2)
    db.commit()
    db.refresh(budget)

    return {
        "message": f"₹{amount:,.2f} recorded against the {budget.financial_year} budget",
        "allocated": round(allocated, 2),
        "utilized": round(float(budget.utilized_amount), 2),
        "remaining": round(allocated - float(budget.utilized_amount), 2),
        "utilization_percentage": round(float(budget.utilized_amount) / allocated * 100, 2) if allocated else 0.0,
    }


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_budget(
    id: int,
    db: Session = Depends(get_db),
    current_user=Depends(deps.get_current_gov_admin),
):
    """Delete a budget allocation that has not been drawn against."""
    budget = db.query(Budget).filter(Budget.id == id).first()
    if not budget:
        raise HTTPException(status_code=404, detail="Budget not found")

    if (budget.utilized_amount or 0) > 0:
        raise bad_request(
            f"₹{budget.utilized_amount:,.2f} has already been utilised against this budget; it cannot be deleted."
        )

    db.delete(budget)
    db.commit()
    return None
