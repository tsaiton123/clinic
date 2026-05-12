from fastapi import APIRouter, Header, HTTPException, status

from app.core.config import settings
from app.seed import run as run_seed


router = APIRouter(prefix="/internal", tags=["internal"])


@router.post("/bootstrap-demo")
def bootstrap_demo(x_bootstrap_token: str | None = Header(default=None)) -> dict[str, str]:
    if not settings.bootstrap_token:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bootstrap endpoint is disabled",
        )
    if x_bootstrap_token != settings.bootstrap_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid bootstrap token",
        )

    run_seed()
    return {"message": "Bootstrap complete"}
