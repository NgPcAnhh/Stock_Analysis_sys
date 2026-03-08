"""API Router for Auth module — register, login, Google OAuth, password reset."""

import logging

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.database.database import get_db
from app.modules.auth import logic
from app.modules.auth.dependencies import get_current_user
from app.modules.auth.email_service import send_reset_email
from app.modules.auth.google_oauth import exchange_code_for_user, get_google_auth_url
from app.modules.auth.schemas import (
    AuthResponse,
    ForgotPasswordRequest,
    LoginRequest,
    MessageResponse,
    RefreshTokenRequest,
    RegisterRequest,
    ResetPasswordRequest,
    UpdateProfileRequest,
    UserResponse,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["Authentication"])

settings = get_settings()


def _client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


# ── 1. Register ───────────────────────────────────────────────────


@router.post("/register", response_model=AuthResponse, status_code=201)
async def register(body: RegisterRequest, db: AsyncSession = Depends(get_db)):
    """Đăng ký tài khoản mới bằng email + password."""
    result = await logic.register_user(
        db, email=body.email, password=body.password, full_name=body.full_name
    )
    if result is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email đã được sử dụng",
        )
    return result


# ── 2. Login ──────────────────────────────────────────────────────


@router.post("/login", response_model=AuthResponse)
async def login(body: LoginRequest, request: Request, db: AsyncSession = Depends(get_db)):
    """Đăng nhập bằng email + password."""
    from app.modules.tracking.logic import track_login as _track_login

    ip = _client_ip(request)
    device = request.headers.get("user-agent", "")

    result = await logic.authenticate_user(
        db,
        email=body.email,
        password=body.password,
        ip_address=ip,
        device_info=device,
    )
    if isinstance(result, str):
        # Ghi log đăng nhập thất bại (không có user_id)
        await _track_login(db, user_id=None, method="local", success=False,
                           ip_address=ip, device_info=device)
        error_map = {
            "invalid_credentials": (401, "Email hoặc mật khẩu không đúng"),
            "google_account": (400, "Tài khoản này sử dụng Google. Vui lòng đăng nhập bằng Google."),
            "account_disabled": (403, "Tài khoản đã bị khoá"),
        }
        code, msg = error_map.get(result, (401, "Lỗi xác thực"))
        raise HTTPException(status_code=code, detail=msg)
    return result


# ── 3. Refresh Token ─────────────────────────────────────────────


@router.post("/refresh", response_model=AuthResponse)
async def refresh_token(body: RefreshTokenRequest, db: AsyncSession = Depends(get_db)):
    """Đổi refresh token lấy access token mới."""
    result = await logic.refresh_access_token(db, body.refresh_token)
    if isinstance(result, str):
        error_map = {
            "invalid_token": (401, "Refresh token không hợp lệ"),
            "token_expired": (401, "Refresh token đã hết hạn"),
            "user_not_found": (401, "Người dùng không tồn tại"),
        }
        code, msg = error_map.get(result, (401, "Lỗi xác thực"))
        raise HTTPException(status_code=code, detail=msg)
    return result


# ── 4. Logout ─────────────────────────────────────────────────────


@router.post("/logout", response_model=MessageResponse)
async def logout(body: RefreshTokenRequest, db: AsyncSession = Depends(get_db)):
    """Thu hồi refresh token (logout)."""
    revoked = await logic.revoke_refresh_token(db, body.refresh_token)
    if revoked:
        return MessageResponse(success=True, message="Đã đăng xuất")
    return MessageResponse(success=False, message="Token không tìm thấy")


# ── 5. Google OAuth ───────────────────────────────────────────────


@router.get("/google/login")
async def google_login():
    """Redirect tới Google consent screen."""
    return RedirectResponse(url=get_google_auth_url())


@router.get("/google/callback")
async def google_callback(
    code: str = Query(...),
    request: Request = None,
    db: AsyncSession = Depends(get_db),
):
    """
    Google redirect về đây sau khi user đồng ý.
    - Nếu chưa có tài khoản → tự đăng ký nhanh.
    - Redirect về FE kèm token.
    """
    google_user = await exchange_code_for_user(code)
    if not google_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Không thể xác thực với Google",
        )

    result = await logic.google_login_or_register(
        db,
        google_user=google_user,
        ip_address=_client_ip(request) if request else None,
    )

    if isinstance(result, str):
        error_map = {
            "invalid_google_data": (400, "Dữ liệu Google không hợp lệ"),
            "account_disabled": (403, "Tài khoản đã bị khoá"),
        }
        code_num, msg = error_map.get(result, (400, "Lỗi xác thực Google"))
        raise HTTPException(status_code=code_num, detail=msg)

    # Redirect về FE kèm tokens trong query params
    fe_callback = (
        f"{settings.FRONTEND_URL}/auth/callback"
        f"?access_token={result['access_token']}"
        f"&refresh_token={result['refresh_token']}"
    )
    return RedirectResponse(url=fe_callback)


# ── 6. Forgot Password ───────────────────────────────────────────


@router.post("/forgot-password", response_model=MessageResponse)
async def forgot_password(body: ForgotPasswordRequest, db: AsyncSession = Depends(get_db)):
    """
    Gửi email chứa link reset password.
    Luôn trả 200 dù email tồn tại hay không (tránh leak).
    """
    token = await logic.create_password_reset_token(db, body.email)
    if token:
        await send_reset_email(body.email, token)

    return MessageResponse(
        success=True,
        message="Nếu email tồn tại, bạn sẽ nhận được link đặt lại mật khẩu.",
    )


# ── 7. Reset Password ────────────────────────────────────────────


@router.post("/reset-password", response_model=MessageResponse)
async def reset_password(body: ResetPasswordRequest, db: AsyncSession = Depends(get_db)):
    """Verify token và đổi mật khẩu mới."""
    result = await logic.reset_password(db, token=body.token, new_password=body.new_password)

    if result == "success":
        return MessageResponse(success=True, message="Đã đổi mật khẩu thành công")

    error_map = {
        "invalid_token": (400, "Token không hợp lệ"),
        "token_expired": (400, "Token đã hết hạn"),
        "token_used": (400, "Token đã được sử dụng"),
    }
    code, msg = error_map.get(result, (400, "Lỗi đặt lại mật khẩu"))
    raise HTTPException(status_code=code, detail=msg)


# ── 8. Get Current User (protected) ──────────────────────────────


@router.get("/me", response_model=UserResponse)
async def get_me(user=Depends(get_current_user)):
    """Lấy thông tin user hiện tại (cần JWT)."""
    return UserResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        avatar_url=user.avatar_url,
        role=user.role.name if user.role else "user",
        auth_provider=user.auth_provider,
        is_verified=user.is_verified,
        created_at=user.created_at,
    )


# ── 9. Update Profile (protected) ────────────────────────────────


@router.put("/me", response_model=UserResponse)
async def update_me(
    body: UpdateProfileRequest,
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Cập nhật profile (cần JWT)."""
    updated = await logic.update_user_profile(
        db,
        user_id=user.id,
        full_name=body.full_name,
        avatar_url=body.avatar_url,
    )
    if not updated:
        raise HTTPException(status_code=404, detail="User not found")

    return UserResponse(
        id=updated.id,
        email=updated.email,
        full_name=updated.full_name,
        avatar_url=updated.avatar_url,
        role=updated.role.name if updated.role else "user",
        auth_provider=updated.auth_provider,
        is_verified=updated.is_verified,
        created_at=updated.created_at,
    )
