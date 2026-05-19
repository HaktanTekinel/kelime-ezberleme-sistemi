from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

import models
import schemas
from auth import get_current_user
from database import get_db
from report_helpers import build_report_data

router = APIRouter()


@router.get("/me", response_model=schemas.ReportResponse)
def get_my_report(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return schemas.ReportResponse(**build_report_data(db, current_user.id))
