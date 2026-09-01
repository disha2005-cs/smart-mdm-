from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from app.api import deps
from app.database import get_db
from app.models.budget import Budget
from app.models.school import School
from app.models.user import UserRole
from app.schemas.budget import Budget as BudgetSchema, BudgetCreate, BudgetUpdate

router = APIRouter()

@router.post("/", response_model=BudgetSchema, status_code=status.HTTP_201_CREATED)
def allocate_budget(
    *,
    db: Session = Depends(get_db),
    budget_in: BudgetCreate,
    current_user = Depends(deps.get_current_gov_admin)
):
    """
    Government admin allocates budget to school for a financial year.
    """
    # Check if school exists
    school = db.query(School).filter(School.id == budget_in.school_id).first()
    if not school:
        raise HTTPException(status_code=404, detail="School not found")
    
    # Check if budget already exists for this school and year
    existing = db.query(Budget).filter(
        Budget.school_id == budget_in.school_id,
        Budget.financial_year == budget_in.financial_year
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"Budget already allocated for {budget_in.financial_year}"
        )
    
    budget = Budget(**budget_in.model_dump())
    db.add(budget)
    db.commit()
    db.refresh(budget)
    
    return budget


@router.get("/", response_model=List[BudgetSchema])
def get_budgets(
    skip: int = 0,
    limit: int = 100,
    financial_year: str = None,
    db: Session = Depends(get_db),
    current_user = Depends(deps.get_current_user)
):
    """
    Get budgets. Government sees all, schools see their own.
    """
    query = db.query(Budget)
    
    if current_user.role == UserRole.SCHOOL:
        query = query.filter(Budget.school_id == current_user.school_id)
    
    if financial_year:
        query = query.filter(Budget.financial_year == financial_year)
    
    budgets = query.order_by(Budget.created_at.desc()).offset(skip).limit(limit).all()
    return budgets


@router.get("/{id}", response_model=BudgetSchema)
def get_budget(
    id: int,
    db: Session = Depends(get_db),
    current_user = Depends(deps.get_current_user)
):
    """
    Get specific budget.
    """
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
    current_user = Depends(deps.get_current_gov_admin)
):
    """
    Update budget allocation or utilization.
    """
    budget = db.query(Budget).filter(Budget.id == id).first()
    if not budget:
        raise HTTPException(status_code=404, detail="Budget not found")
    
    update_data = budget_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(budget, field, value)
    
    db.commit()
    db.refresh(budget)
    return budget


@router.post("/{id}/utilize")
def utilize_budget(
    id: int,
    amount: float,
    db: Session = Depends(get_db),
    current_user = Depends(deps.get_current_school_admin)
):
    """
    Record budget utilization by school.
    """
    budget = db.query(Budget).filter(
        Budget.id == id,
        Budget.school_id == current_user.school_id
    ).first()
    
    if not budget:
        raise HTTPException(status_code=404, detail="Budget not found")
    
    if budget.utilized_amount + amount > budget.allocated_amount:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot utilize ₹{amount}. Remaining budget: ₹{budget.allocated_amount - budget.utilized_amount}"
        )
    
    budget.utilized_amount += amount
    db.commit()
    db.refresh(budget)
    
    return {
        "message": "Budget utilized successfully",
        "utilized": budget.utilized_amount,
        "remaining": budget.allocated_amount - budget.utilized_amount
    }


@router.get("/summary/government")
def get_government_budget_summary(
    financial_year: str = "2026-27",
    db: Session = Depends(get_db),
    current_user = Depends(deps.get_current_gov_admin)
):
    """
    Get budget summary for government dashboard.
    """
    budgets = db.query(Budget).filter(Budget.financial_year == financial_year).all()
    
    total_allocated = sum(b.allocated_amount for b in budgets)
    total_utilized = sum(b.utilized_amount for b in budgets)
    
    # District-wise breakdown
    district_summary = db.query(
        School.district,
        func.sum(Budget.allocated_amount).label("allocated"),
        func.sum(Budget.utilized_amount).label("utilized"),
        func.count(Budget.id).label("schools")
    ).join(School, Budget.school_id == School.id)\
     .filter(Budget.financial_year == financial_year)\
     .group_by(School.district).all()
    
    return {
        "financial_year": financial_year,
        "total_allocated": round(total_allocated, 2),
        "total_utilized": round(total_utilized, 2),
        "remaining": round(total_allocated - total_utilized, 2),
        "utilization_percentage": round((total_utilized / total_allocated * 100), 2) if total_allocated > 0 else 0,
        "schools_covered": len(budgets),
        "district_breakdown": [
            {
                "district": d[0],
                "allocated": float(d[1]) if d[1] else 0,
                "utilized": float(d[2]) if d[2] else 0,
                "schools": d[3]
            }
            for d in district_summary
        ]
    }
