from fastapi import APIRouter

import schemas
from auth import CurrentUser, DbSession
from report_helpers import build_report_data

router = APIRouter()


@router.get("/me", response_model=schemas.ReportResponse)
def get_my_report(
    current_user: CurrentUser,
    db: DbSession,
):
    return schemas.ReportResponse(**build_report_data(db, current_user.id))
