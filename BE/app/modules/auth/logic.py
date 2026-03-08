"""Business logic for Auth module — DB operations & orchestration."""

import logging
import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.auth.models import PasswordResetToken, RefreshToken, Role, User
from app.modules.auth.security import (
    create_access_token,
    create_refresh_token,
    get_refresh_token_expiry,
    hash_password,
    verify_password,
)

logger = logging.getLogger(__name__)


# ── Helpers ────────────────────────────────────────────────────────


async def get_user_by_email(db: AsyncSession, email: str) -> User | None:
    result = await db.execute(select(User).where(User.email == email))
    return result.scalars().first()


async def get_user_by_id(db: AsyncSession, user_id: int) -> User | None:
    result = await db.execute(select(User).where(User.id == user_id))
    return result.scalars().first()


async def get_user_by_google_id(db: AsyncSession, google_id: str) -> User | None:
    result = await db.execute(select(User).where(User.google_id == google_id))
    return result.scalars().first()


def _user_role_name(user: User) -> str:
    """Get role name from user's eager-loaded relationship."""
    return user.role.name if user.role else "user"


def _build_auth_response(user: User, access: str, refresh: str, expire_min: int) -> dict:
    """Build the standard AuthResponse dict."""
    return {
        "access_token": access,
        "refresh_token": refresh,
        "token_type": "bearer",
        "expires_in": expire_min * 60,
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "avatar_url": user.avatar_url,
            "role": _user_role_name(user),
            "auth_provider": user.auth_provider,
            "is_verified": user.is_verified,
            "created_at": user.created_at,
        },
    }


# ── Register ───────────────────────────────────────────────────────


async def register_user(
    db: AsyncSession,
    email: str,
    password: str,
    full_name: str,
) -> dict | None:
    """
    Đăng ký tài khoản local.
    Returns AuthResponse dict hoặc None nếu email đã tồn tại.
    """
    from app.core.config import get_settings

    settings = get_settings()

    existing = await get_user_by_email(db, email)
    if existing:
        return None  # email đã tồn tại

    user = User(
        email=email,
        hashed_password=hash_password(password),
        full_name=full_name,
        role_id=1,  # default: user
        auth_provider="local",
    )
    db.add(user)
    await db.flush()
    await db.refresh(user, attribute_names=["role"])

    role_name = _user_role_name(user)
    access = create_access_token(user.id, role_name)
    refresh = create_refresh_token(user.id)

    # Lưu refresh token vào DB
    db.add(RefreshToken(
        user_id=user.id,
        token=refresh,
        expires_at=get_refresh_token_expiry(),
    ))
    await db.flush()

    return _build_auth_response(user, access, refresh, settings.ACCESS_TOKEN_EXPIRE_MINUTES)


# ── Login ──────────────────────────────────────────────────────────


async def authenticate_user(
    db: AsyncSession,
    email: str,
    password: str,
    ip_address: str | None = None,
    device_info: str | None = None,
) -> dict | str:
    """
    Đăng nhập local.
    Returns AuthResponse dict hoặc error string.
    """
    from app.core.config import get_settings

    settings = get_settings()

    user = await get_user_by_email(db, email)
    if not user:
        return "invalid_credentials"

    if not user.hashed_password:
        return "google_account"  # Tài khoản Google, không có password

    if not verify_password(password, user.hashed_password):
        return "invalid_credentials"

    if not user.is_active:
        return "account_disabled"

    # Cập nhật last_login_at
    user.last_login_at = datetime.now(timezone.utc)
    await db.flush()
    await db.refresh(user, attribute_names=["role"])

    role_name = _user_role_name(user)
    access = create_access_token(user.id, role_name)
    refresh = create_refresh_token(user.id)

    db.add(RefreshToken(
        user_id=user.id,
        token=refresh,
        device_info=device_info,
        ip_address=ip_address,
        expires_at=get_refresh_token_expiry(),
    ))
    await db.flush()

    # Ghi log đăng nhập
    from app.modules.tracking.logic import track_login as _track_login
    await _track_login(db, user_id=user.id, method="local", success=True,
                       ip_address=ip_address, device_info=device_info)

    return _build_auth_response(user, access, refresh, settings.ACCESS_TOKEN_EXPIRE_MINUTES)


# ── Google OAuth Login / Auto-Register ─────────────────────────────


async def google_login_or_register(
    db: AsyncSession,
    google_user: dict,
    ip_address: str | None = None,
) -> dict | str:
    """
    Xử lý đăng nhập/đăng ký Google.
    - Nếu google_id đã tồn tại → login.
    - Nếu email đã tồn tại (local) → link google_id vào tài khoản.
    - Nếu chưa có → auto-register.
    """
    from app.core.config import get_settings

    settings = get_settings()

    google_id = google_user.get("sub")
    email = google_user.get("email")
    name = google_user.get("name")
    picture = google_user.get("picture")

    if not email or not google_id:
        return "invalid_google_data"

    # Case 1: Tìm theo google_id
    user = await get_user_by_google_id(db, google_id)

    # Case 2: Tìm theo email
    if not user:
        user = await get_user_by_email(db, email)
        if user:
            # Link Google vào tài khoản hiện có
            user.google_id = google_id
            if not user.avatar_url and picture:
                user.avatar_url = picture

    # Case 3: Auto-register
    if not user:
        user = User(
            email=email,
            full_name=name,
            avatar_url=picture,
            google_id=google_id,
            auth_provider="google",
            is_verified=True,
            role_id=1,
        )
        db.add(user)
        await db.flush()

    if not user.is_active:
        return "account_disabled"

    user.last_login_at = datetime.now(timezone.utc)
    await db.flush()
    await db.refresh(user, attribute_names=["role"])

    role_name = _user_role_name(user)
    access = create_access_token(user.id, role_name)
    refresh = create_refresh_token(user.id)

    db.add(RefreshToken(
        user_id=user.id,
        token=refresh,
        ip_address=ip_address,
        device_info="Google OAuth",
        expires_at=get_refresh_token_expiry(),
    ))
    await db.flush()

    # Ghi log đăng nhập Google
    from app.modules.tracking.logic import track_login as _track_login
    await _track_login(db, user_id=user.id, method="google", success=True,
                       ip_address=ip_address, device_info="Google OAuth")

    return _build_auth_response(user, access, refresh, settings.ACCESS_TOKEN_EXPIRE_MINUTES)


# ── Refresh Token ──────────────────────────────────────────────────


async def refresh_access_token(db: AsyncSession, refresh_token_str: str) -> dict | str:
    """Đổi refresh token → access token mới."""
    from app.core.config import get_settings
    from app.modules.auth.security import decode_token

    settings = get_settings()

    # Tìm trong DB
    result = await db.execute(
        select(RefreshToken).where(
            RefreshToken.token == refresh_token_str,
            RefreshToken.revoked == False,  # noqa: E712
        )
    )
    db_token = result.scalars().first()

    if not db_token:
        return "invalid_token"

    if db_token.expires_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        return "token_expired"

    user = await get_user_by_id(db, db_token.user_id)
    if not user or not user.is_active:
        return "user_not_found"

    await db.refresh(user, attribute_names=["role"])
    role_name = _user_role_name(user)
    new_access = create_access_token(user.id, role_name)

    return {
        "access_token": new_access,
        "refresh_token": refresh_token_str,
        "token_type": "bearer",
        "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "avatar_url": user.avatar_url,
            "role": role_name,
            "auth_provider": user.auth_provider,
            "is_verified": user.is_verified,
            "created_at": user.created_at,
        },
    }


# ── Logout ─────────────────────────────────────────────────────────


async def revoke_refresh_token(db: AsyncSession, refresh_token_str: str) -> bool:
    """Thu hồi refresh token (logout)."""
    result = await db.execute(
        update(RefreshToken)
        .where(RefreshToken.token == refresh_token_str)
        .values(revoked=True)
    )
    await db.flush()
    return result.rowcount > 0


# ── Forgot / Reset Password ───────────────────────────────────────


async def create_password_reset_token(db: AsyncSession, email: str) -> str | None:
    """
    Tạo token reset password.
    Returns token string hoặc None nếu email không tồn tại.
    (Caller nên luôn trả 200 để không leak email existence.)
    """
    user = await get_user_by_email(db, email)
    if not user:
        return None

    token = str(uuid.uuid4())
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=15)

    db.add(PasswordResetToken(
        user_id=user.id,
        token=token,
        expires_at=expires_at,
    ))
    await db.flush()
    return token


async def reset_password(db: AsyncSession, token: str, new_password: str) -> str:
    """
    Verify token và đổi mật khẩu.
    Returns: "success" | "invalid_token" | "token_expired" | "token_used"
    """
    result = await db.execute(
        select(PasswordResetToken).where(PasswordResetToken.token == token)
    )
    db_token = result.scalars().first()

    if not db_token:
        return "invalid_token"

    if db_token.used:
        return "token_used"

    if db_token.expires_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        return "token_expired"

    # Đổi mật khẩu
    user = await get_user_by_id(db, db_token.user_id)
    if not user:
        return "invalid_token"

    user.hashed_password = hash_password(new_password)
    user.updated_at = datetime.now(timezone.utc)
    db_token.used = True

    # Thu hồi tất cả refresh tokens cũ
    await db.execute(
        update(RefreshToken)
        .where(RefreshToken.user_id == user.id)
        .values(revoked=True)
    )
    await db.flush()
    return "success"


# ── Update Profile ─────────────────────────────────────────────────


async def update_user_profile(
    db: AsyncSession,
    user_id: int,
    full_name: str | None = None,
    avatar_url: str | None = None,
) -> User | None:
    """Cập nhật thông tin profile."""
    user = await get_user_by_id(db, user_id)
    if not user:
        return None

    if full_name is not None:
        user.full_name = full_name
    if avatar_url is not None:
        user.avatar_url = avatar_url
    user.updated_at = datetime.now(timezone.utc)

    await db.flush()
    await db.refresh(user, attribute_names=["role"])
    return user
