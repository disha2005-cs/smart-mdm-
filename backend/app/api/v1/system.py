"""
System maintenance endpoints
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.api import deps
from app.database import get_db

router = APIRouter()

@router.post("/cleanup-orphaned-users")
def cleanup_orphaned_users(
    db: Session = Depends(get_db),
    current_user = Depends(deps.get_current_gov_admin)
):
    """
    Clean up orphaned school admin users (whose schools were deleted).
    Government Admin only.
    """
    
    # Find orphaned users
    result = db.execute(text("""
        SELECT COUNT(*)
        FROM users
        WHERE role = 'SCHOOL'
        AND (
            school_id IS NULL
            OR NOT EXISTS (
                SELECT 1 FROM schools s WHERE s.id = users.school_id
            )
        )
    """))
    count_before = result.scalar()
    
    if count_before == 0:
        return {
            "message": "No orphaned users found",
            "deleted_count": 0
        }
    
    # Delete orphaned users
    result = db.execute(text("""
        DELETE FROM users
        WHERE role = 'SCHOOL'
        AND (
            school_id IS NULL
            OR NOT EXISTS (
                SELECT 1 FROM schools s WHERE s.id = users.school_id
            )
        )
    """))
    
    db.commit()
    deleted_count = result.rowcount
    
    return {
        "message": f"Successfully cleaned up {deleted_count} orphaned user(s)",
        "deleted_count": deleted_count
    }
