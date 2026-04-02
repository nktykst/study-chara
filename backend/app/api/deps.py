import httpx
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.user import User
from app.config import settings
import jwt

security = HTTPBearer()


async def verify_clerk_token(token: str) -> dict:
    """Clerk JWTトークンを検証してペイロードを返す"""
    try:
        # Clerk JWKS エンドポイントから公開鍵を取得
        async with httpx.AsyncClient() as client:
            # Clerk secret key から issuer を取得（sk_test_ or sk_live_）
            clerk_api_url = "https://api.clerk.com/v1/jwks"
            response = await client.get(
                clerk_api_url,
                headers={"Authorization": f"Bearer {settings.clerk_secret_key}"},
            )
            if response.status_code != 200:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Failed to fetch Clerk JWKS",
                )
            jwks = response.json()

        # JWTヘッダーからkidを取得
        unverified_header = jwt.get_unverified_header(token)
        kid = unverified_header.get("kid")

        # マッチするキーを探す
        public_key = None
        for key in jwks.get("keys", []):
            if key.get("kid") == kid:
                public_key = jwt.algorithms.RSAAlgorithm.from_jwk(key)
                break

        if not public_key:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Public key not found",
            )

        payload = jwt.decode(
            token,
            public_key,
            algorithms=["RS256"],
            options={"verify_aud": False},
        )
        return payload

    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
        )
    except jwt.InvalidTokenError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {str(e)}",
        )


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> User:
    """JWTを検証し、DBからユーザーを取得（なければ自動作成）"""
    token = credentials.credentials
    payload = await verify_clerk_token(token)

    clerk_user_id = payload.get("sub")
    if not clerk_user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
        )

    # ユーザーを取得または作成
    user = db.query(User).filter(User.clerk_user_id == clerk_user_id).first()
    if not user:
        user = User(
            clerk_user_id=clerk_user_id,
            display_name=payload.get("name", ""),
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    return user
