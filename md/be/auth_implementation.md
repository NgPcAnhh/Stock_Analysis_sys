# 🔐 Tính Năng Đăng Nhập / Đăng Ký — Hướng Dẫn Triển Khai Chi Tiết

> **Nguyên tắc**: Không sửa đổi bất kỳ module hay FE nào hiện tại.
> Tính năng auth sẽ là module **mới hoàn toàn** (`BE/app/modules/auth/`), database tables mới trong **schema `system`**.

---

## 📑 Mục Lục

1. [Tổng Quan Tính Năng](#1-tổng-quan-tính-năng)
2. [Database Schema (system)](#2-database-schema-system)
3. [Cấu Hình Environment](#3-cấu-hình-environment)
4. [Cấu Trúc Module Auth](#4-cấu-trúc-module-auth)
5. [API Endpoints](#5-api-endpoints)
6. [Luồng Xử Lý Chi Tiết](#6-luồng-xử-lý-chi-tiết)
7. [Dependencies Cần Thêm](#7-dependencies-cần-thêm)
8. [Thứ Tự Triển Khai](#8-thứ-tự-triển-khai)

---

## 1. Tổng Quan Tính Năng

| Tính năng | Mô tả |
|---|---|
| **Đăng ký (email/password)** | Tạo tài khoản mới bằng email + mật khẩu |
| **Đăng nhập (email/password)** | Xác thực và trả JWT |
| **Đăng nhập/Đăng ký Google OAuth 2.0** | Nếu email Google chưa có → tự đăng ký nhanh |
| **Quên mật khẩu** | Gửi link reset qua email, verify token, đổi mật khẩu |
| **Phân quyền (Role)** | `user`, `admin`, `moderator` — lưu trong schema `system` |
| **JWT Authentication** | Access token (15 phút) + Refresh token (7 ngày) |

---

## 2. Database Schema (system)

> Thêm vào file `BE/app/database/schema_system.sql` (append, không sửa tables cũ).

### 2.1. Bảng `system.roles` — Danh sách vai trò

```sql
-- ────────────────────────────────────────────────────────────
-- roles — Danh sách vai trò trong hệ thống
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS system.roles (
    id          SERIAL       PRIMARY KEY,
    name        VARCHAR(50)  NOT NULL UNIQUE,          -- 'user', 'admin', 'moderator'
    description TEXT,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Seed data mặc định
INSERT INTO system.roles (name, description) VALUES
    ('user',      'Người dùng thông thường'),
    ('admin',     'Quản trị viên hệ thống'),
    ('moderator', 'Kiểm duyệt nội dung')
ON CONFLICT (name) DO NOTHING;
```

### 2.2. Bảng `system.users` — Thông tin người dùng

```sql
-- ────────────────────────────────────────────────────────────
-- users — Thông tin tài khoản người dùng
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS system.users (
    id              BIGSERIAL    PRIMARY KEY,
    email           VARCHAR(255) NOT NULL UNIQUE,
    hashed_password VARCHAR(255),                       -- NULL nếu đăng ký qua Google
    full_name       VARCHAR(255),
    avatar_url      TEXT,                               -- Avatar từ Google hoặc upload
    role_id         INTEGER      NOT NULL DEFAULT 1     -- FK → system.roles.id (default: user)
                    REFERENCES system.roles(id),
    auth_provider   VARCHAR(20)  NOT NULL DEFAULT 'local', -- 'local' | 'google'
    google_id       VARCHAR(255) UNIQUE,                -- Google sub ID
    is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
    is_verified     BOOLEAN      NOT NULL DEFAULT FALSE,-- Email đã verify chưa
    last_login_at   TIMESTAMPTZ,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON system.users (email);
CREATE INDEX IF NOT EXISTS idx_users_google_id ON system.users (google_id) WHERE google_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_role ON system.users (role_id);
```

### 2.3. Bảng `system.refresh_tokens` — Quản lý refresh token

```sql
-- ────────────────────────────────────────────────────────────
-- refresh_tokens — Lưu refresh token để cấp lại access token
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS system.refresh_tokens (
    id          BIGSERIAL    PRIMARY KEY,
    user_id     BIGINT       NOT NULL REFERENCES system.users(id) ON DELETE CASCADE,
    token       VARCHAR(512) NOT NULL UNIQUE,
    device_info VARCHAR(255),                           -- User-Agent hoặc device name
    ip_address  VARCHAR(45),
    expires_at  TIMESTAMPTZ  NOT NULL,
    revoked     BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON system.refresh_tokens (user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON system.refresh_tokens (token);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires ON system.refresh_tokens (expires_at);
```

### 2.4. Bảng `system.password_reset_tokens` — Token đặt lại mật khẩu

```sql
-- ────────────────────────────────────────────────────────────
-- password_reset_tokens — Token reset mật khẩu (hết hạn sau 15 phút)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS system.password_reset_tokens (
    id          BIGSERIAL    PRIMARY KEY,
    user_id     BIGINT       NOT NULL REFERENCES system.users(id) ON DELETE CASCADE,
    token       VARCHAR(255) NOT NULL UNIQUE,
    expires_at  TIMESTAMPTZ  NOT NULL,
    used        BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pwd_reset_user ON system.password_reset_tokens (user_id);
CREATE INDEX IF NOT EXISTS idx_pwd_reset_token ON system.password_reset_tokens (token);
```

### 2.5. Sơ đồ quan hệ

```
system.roles ──1:N──→ system.users
system.users ──1:N──→ system.refresh_tokens
system.users ──1:N──→ system.password_reset_tokens
```

---

## 3. Cấu Hình Environment

Thêm vào `.env` và `.env.example`:

```env
# ============================================
# Auth / JWT
# ============================================
JWT_SECRET_KEY=super-secret-jwt-key-change-in-production
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=7

# ============================================
# Google OAuth 2.0
# ============================================
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:8000/api/v1/auth/google/callback

# ============================================
# Email (SMTP) — cho reset password
# ============================================
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
EMAIL_FROM=noreply@stockanalysis.vn
```

Thêm vào `app/core/config.py` class `Settings`:

```python
# Auth / JWT
JWT_SECRET_KEY: str = "change-me"
JWT_ALGORITHM: str = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
REFRESH_TOKEN_EXPIRE_DAYS: int = 7

# Google OAuth
GOOGLE_CLIENT_ID: str = ""
GOOGLE_CLIENT_SECRET: str = ""
GOOGLE_REDIRECT_URI: str = "http://localhost:8000/api/v1/auth/google/callback"

# SMTP
SMTP_HOST: str = "smtp.gmail.com"
SMTP_PORT: int = 587
SMTP_USER: str = ""
SMTP_PASSWORD: str = ""
EMAIL_FROM: str = "noreply@stockanalysis.vn"
```

---

## 4. Cấu Trúc Module Auth

```
BE/app/modules/auth/
├── __init__.py
├── router.py          ← API endpoints (register, login, google, reset-password)
├── schemas.py         ← Pydantic request/response models
├── logic.py           ← Business logic (tạo user, verify password, tạo JWT, ...)
├── models.py          ← SQLAlchemy ORM models (User, Role, RefreshToken, ...)
├── dependencies.py    ← FastAPI dependencies (get_current_user, require_role)
├── security.py        ← Hash password, tạo/verify JWT, tạo reset token
├── google_oauth.py    ← Xử lý Google OAuth flow
└── email_service.py   ← Gửi email reset password
```

---

## 5. API Endpoints

Tất cả endpoint prefix: `/api/v1/auth`

### 5.1. Đăng ký & Đăng nhập

| Method | Path | Mô tả |
|---|---|---|
| `POST` | `/register` | Đăng ký bằng email + password |
| `POST` | `/login` | Đăng nhập → access + refresh token |
| `POST` | `/refresh` | Đổi refresh token → access token mới |
| `POST` | `/logout` | Thu hồi refresh token |

### 5.2. Google OAuth

| Method | Path | Mô tả |
|---|---|---|
| `GET`  | `/google/login` | Redirect tới Google consent screen |
| `GET`  | `/google/callback` | Google redirect về, xử lý code → token |

### 5.3. Quên mật khẩu

| Method | Path | Mô tả |
|---|---|---|
| `POST` | `/forgot-password` | Gửi email chứa link reset |
| `POST` | `/reset-password` | Verify token + đổi mật khẩu mới |

### 5.4. User info (protected)

| Method | Path | Mô tả |
|---|---|---|
| `GET`  | `/me` | Lấy thông tin user hiện tại (cần JWT) |
| `PUT`  | `/me` | Cập nhật profile (cần JWT) |

---

## 6. Luồng Xử Lý Chi Tiết

### 6.1. Đăng Ký (Local)

```
Client                          Server
  │                                │
  ├─ POST /register ──────────────→│
  │  { email, password, full_name }│
  │                                ├─ Validate input (schemas.py)
  │                                ├─ Check email đã tồn tại? → 409
  │                                ├─ Hash password (bcrypt)
  │                                ├─ INSERT system.users (role_id=1, auth_provider='local')
  │                                ├─ Tạo access_token + refresh_token
  │                                │
  ←── 201 { access_token, ────────┤
  │        refresh_token,          │
  │        user }                  │
```

**File liên quan**: `schemas.py` → `RegisterRequest`, `AuthResponse`

```python
class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)
    full_name: str = Field(..., min_length=2, max_length=255)

class AuthResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int          # seconds
    user: UserResponse
```

### 6.2. Đăng Nhập (Local)

```
Client                          Server
  │                                │
  ├─ POST /login ─────────────────→│
  │  { email, password }           │
  │                                ├─ Tìm user theo email → 401 nếu không có
  │                                ├─ Verify password (bcrypt) → 401 nếu sai
  │                                ├─ Check is_active → 403 nếu bị khoá
  │                                ├─ Update last_login_at
  │                                ├─ Tạo access_token + refresh_token
  │                                ├─ INSERT system.refresh_tokens
  │                                │
  ←── 200 { access_token, ────────┤
  │        refresh_token, user }   │
```

### 6.3. Đăng Nhập / Đăng Ký Google OAuth 2.0

> **Điểm then chốt**: Nếu email Google chưa có trong DB → **tự tạo tài khoản** (đăng ký nhanh).

```
Client                    Server                        Google
  │                          │                              │
  ├─ GET /google/login ─────→│                              │
  │                          ├─ Build Google OAuth URL      │
  ←── 302 Redirect ─────────┤  (client_id, redirect_uri,   │
  │   to Google              │   scope=email+profile)       │
  │                          │                              │
  ├─ User đồng ý ──────────────────────────────────────────→│
  │                          │                              │
  │                          │←── GET /google/callback ─────┤
  │                          │    ?code=AUTH_CODE            │
  │                          │                              │
  │                          ├─ Exchange code → tokens ────→│
  │                          │←── { id_token, access_token }│
  │                          │                              │
  │                          ├─ Decode id_token → { email, name, picture, sub }
  │                          │
  │                          ├─ Tìm user theo google_id hoặc email:
  │                          │   ├─ CÓ user → Login (update google_id nếu cần)
  │                          │   └─ KHÔNG CÓ → Auto-register:
  │                          │       INSERT system.users (
  │                          │         email, full_name, avatar_url,
  │                          │         google_id, auth_provider='google',
  │                          │         is_verified=TRUE, hashed_password=NULL
  │                          │       )
  │                          │
  │                          ├─ Tạo JWT tokens
  ←── 302 Redirect ─────────┤
  │   to FE + tokens         │
  │   (ví dụ: localhost:3000/auth/callback?token=...)
```

**File `google_oauth.py`** — logic chính:

```python
import httpx
from app.core.config import get_settings

settings = get_settings()

GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo"

def get_google_auth_url() -> str:
    """Tạo URL redirect tới Google consent screen."""
    params = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "redirect_uri": settings.GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "offline",
        "prompt": "consent",
    }
    return f"https://accounts.google.com/o/oauth2/v2/auth?{urlencode(params)}"

async def exchange_code_for_user(code: str) -> dict:
    """Đổi authorization code → lấy thông tin user từ Google."""
    async with httpx.AsyncClient() as client:
        # 1. Exchange code → tokens
        token_resp = await client.post(GOOGLE_TOKEN_URL, data={
            "code": code,
            "client_id": settings.GOOGLE_CLIENT_ID,
            "client_secret": settings.GOOGLE_CLIENT_SECRET,
            "redirect_uri": settings.GOOGLE_REDIRECT_URI,
            "grant_type": "authorization_code",
        })
        tokens = token_resp.json()

        # 2. Lấy user info
        userinfo_resp = await client.get(GOOGLE_USERINFO_URL, headers={
            "Authorization": f"Bearer {tokens['access_token']}"
        })
        return userinfo_resp.json()
        # Returns: { "sub": "...", "email": "...", "name": "...", "picture": "..." }
```

### 6.4. Quên Mật Khẩu

```
Client                          Server                       Email
  │                                │                            │
  ├─ POST /forgot-password ───────→│                            │
  │  { email }                     │                            │
  │                                ├─ Tìm user theo email      │
  │                                │  (nếu không có → vẫn trả 200 để tránh leak info)
  │                                ├─ Tạo random token (uuid4) │
  │                                ├─ INSERT system.password_reset_tokens
  │                                │  (expires_at = NOW + 15 min)
  │                                ├─ Gửi email ──────────────→│
  │                                │  (link: FE/reset?token=...) │
  ←── 200 { message } ────────────┤                            │
  │                                │                            │
  │  ... User click link email ... │                            │
  │                                │                            │
  ├─ POST /reset-password ────────→│                            │
  │  { token, new_password }       │                            │
  │                                ├─ Tìm token trong DB       │
  │                                ├─ Check hết hạn? used?      │
  │                                ├─ Hash new_password         │
  │                                ├─ UPDATE system.users SET hashed_password
  │                                ├─ Mark token as used        │
  │                                ├─ Thu hồi tất cả refresh_tokens cũ
  ←── 200 { message } ────────────┤
```

### 6.5. JWT Authentication Flow

**File `security.py`**:

```python
from datetime import datetime, timedelta, timezone
from jose import jwt, JWTError
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)

def create_access_token(user_id: int, role: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {"sub": str(user_id), "role": role, "exp": expire, "type": "access"}
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)

def create_refresh_token(user_id: int) -> str:
    expire = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    payload = {"sub": str(user_id), "exp": expire, "type": "refresh"}
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)

def decode_token(token: str) -> dict:
    return jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
```

**File `dependencies.py`** — Dependency cho protected routes:

```python
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

bearer_scheme = HTTPBearer()

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Decode JWT → lấy user từ DB. Dùng làm Depends() cho protected routes."""
    try:
        payload = decode_token(credentials.credentials)
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user_id = int(payload["sub"])
    except JWTError:
        raise HTTPException(status_code=401, detail="Token invalid or expired")

    user = await get_user_by_id(db, user_id)
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found or inactive")
    return user

def require_role(*roles: str):
    """Factory dependency: chỉ cho phép user có role phù hợp."""
    async def checker(user = Depends(get_current_user)):
        if user.role_name not in roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return user
    return checker

# Sử dụng:
# @router.get("/admin/users", dependencies=[Depends(require_role("admin"))])
```

### 6.6. Email Service

**File `email_service.py`**:

```python
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

async def send_reset_email(to_email: str, reset_token: str):
    """Gửi email chứa link reset password."""
    settings = get_settings()
    reset_link = f"http://localhost:3000/reset-password?token={reset_token}"

    msg = MIMEMultipart("alternative")
    msg["Subject"] = "Đặt lại mật khẩu — Stock Analysis"
    msg["From"] = settings.EMAIL_FROM
    msg["To"] = to_email

    html = f"""
    <h2>Đặt lại mật khẩu</h2>
    <p>Bạn đã yêu cầu đặt lại mật khẩu. Click link bên dưới (có hiệu lực 15 phút):</p>
    <a href="{reset_link}">Đặt lại mật khẩu</a>
    <p>Nếu bạn không yêu cầu, hãy bỏ qua email này.</p>
    """
    msg.attach(MIMEText(html, "html"))

    # Gửi qua SMTP (nên chạy trong thread pool để không block)
    with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
        server.starttls()
        server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
        server.sendmail(settings.EMAIL_FROM, to_email, msg.as_string())
```

---

## 7. Dependencies Cần Thêm

Thêm vào `requirements.txt`:

```
# ============================================
# Auth
# ============================================
python-jose[cryptography]==3.3.0    # JWT encode/decode
passlib[bcrypt]==1.7.4              # Password hashing (bcrypt)
```

> `httpx` đã có sẵn trong project (dùng cho Google OAuth HTTP calls).
> `pydantic[email]` — cần thêm nếu dùng `EmailStr` trong schemas.

---

## 8. Thứ Tự Triển Khai

### Bước 1: Database — Tạo tables mới

```bash
# Chạy SQL trong schema_system.sql (append thêm các tables mới)
psql -U admin -d postgres -f BE/app/database/schema_system.sql
```

Hoặc tạo file migration riêng: `BE/app/database/auth_tables.sql`

### Bước 2: Config — Thêm env vars

- Cập nhật `BE/.env` và `BE/.env.example` → thêm JWT, Google, SMTP vars
- Cập nhật `BE/app/core/config.py` → thêm fields vào class `Settings`

### Bước 3: Dependencies

```bash
pip install python-jose[cryptography] passlib[bcrypt]
```

### Bước 4: Module Auth — Tạo files

Theo thứ tự (mỗi file phụ thuộc file trước):

| # | File | Nội dung |
|---|---|---|
| 1 | `models.py` | ORM models: `User`, `Role`, `RefreshToken`, `PasswordResetToken` |
| 2 | `schemas.py` | Pydantic: `RegisterRequest`, `LoginRequest`, `AuthResponse`, `ForgotPasswordRequest`, `ResetPasswordRequest`, `UserResponse` |
| 3 | `security.py` | Hash/verify password, tạo/decode JWT |
| 4 | `email_service.py` | Gửi email reset password qua SMTP |
| 5 | `google_oauth.py` | Google OAuth URL builder, code exchange |
| 6 | `logic.py` | Business logic: create_user, authenticate, google_login_or_register, forgot_password, reset_password |
| 7 | `dependencies.py` | `get_current_user`, `require_role` |
| 8 | `router.py` | Tất cả endpoints |

### Bước 5: Đăng ký router vào app

Thêm vào `BE/app/main.py`:

```python
from app.modules.auth.router import router as auth_router

# ... existing routers ...
app.include_router(auth_router, prefix="/api/v1")
```

### Bước 6: Test

```bash
# 1. Test register
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "Abc@1234", "full_name": "Test User"}'

# 2. Test login
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "Abc@1234"}'

# 3. Test protected endpoint
curl http://localhost:8000/api/v1/auth/me \
  -H "Authorization: Bearer <access_token>"

# 4. Test Google OAuth (mở trong browser)
# http://localhost:8000/api/v1/auth/google/login

# 5. Test forgot password
curl -X POST http://localhost:8000/api/v1/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'
```

---

## 📌 Lưu Ý Quan Trọng

1. **Không sửa module/FE hiện tại** — Auth module hoàn toàn độc lập
2. **Schema `system`** — Tất cả tables auth nằm trong schema `system`, cùng chỗ với `article_clicks`, `search_logs`
3. **Google OAuth**: Cần tạo project trên [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials → OAuth 2.0 Client IDs
4. **SMTP**: Nếu dùng Gmail, cần bật **App Passwords** (không dùng mật khẩu Gmail trực tiếp)
5. **Production**: Thay `JWT_SECRET_KEY` bằng key mạnh, dùng HTTPS, cân nhắc thêm email verification flow
6. **Password policy**: Tối thiểu 8 ký tự, nên thêm validation: ít nhất 1 chữ hoa, 1 số, 1 ký tự đặc biệt
