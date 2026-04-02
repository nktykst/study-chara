from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from cryptography.fernet import Fernet
from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.schemas.user import UserResponse, UserUpdate, ApiKeyUpdate, ApiKeyStatus
from app.config import settings

router = APIRouter()


def get_fernet() -> Fernet:
    return Fernet(settings.encryption_key.encode() if isinstance(settings.encryption_key, str) else settings.encryption_key)


def mask_api_key(key: str) -> str:
    if len(key) <= 8:
        return "****"
    return key[:6] + "****" + key[-4:]


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.put("/me", response_model=UserResponse)
async def update_me(
    data: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if data.display_name is not None:
        current_user.display_name = data.display_name
    db.commit()
    db.refresh(current_user)
    return current_user


@router.put("/me/api-key")
async def update_api_key(
    data: ApiKeyUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if data.provider not in ("anthropic", "google"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid provider. Must be 'anthropic' or 'google'",
        )

    fernet = get_fernet()
    encrypted = fernet.encrypt(data.api_key.encode()).decode()

    current_user.ai_provider = data.provider
    current_user.encrypted_api_key = encrypted
    db.commit()

    return {"message": "API key updated successfully"}


@router.delete("/me/api-key")
async def delete_api_key(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    current_user.encrypted_api_key = None
    db.commit()
    return {"message": "API key deleted successfully"}


@router.get("/me/api-key/status", response_model=ApiKeyStatus)
async def get_api_key_status(current_user: User = Depends(get_current_user)):
    if not current_user.encrypted_api_key:
        return ApiKeyStatus(
            provider=current_user.ai_provider,
            masked_key=None,
            is_set=False,
        )

    fernet = get_fernet()
    decrypted = fernet.decrypt(current_user.encrypted_api_key.encode()).decode()

    return ApiKeyStatus(
        provider=current_user.ai_provider,
        masked_key=mask_api_key(decrypted),
        is_set=True,
    )
