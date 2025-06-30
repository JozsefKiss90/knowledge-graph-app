from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from passlib.context import CryptContext
import datetime
from datetime import timedelta
from typing import Optional
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

router = APIRouter(tags=["Authentication"])

# === CONFIGURATION ===
SECRET_KEY = os.getenv("SECRET_KEY", "fallback-secret-key")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

ADMIN_USERNAME = os.getenv("ADMIN_USERNAME", "admin")
ADMIN_PASSWORD_HASH = os.getenv("ADMIN_PASSWORD_HASH")  # bcrypt hash
 
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def enforce_header_token(request: Request) -> str:
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(
            status_code=401,
            detail="Authorization header with Bearer token required"
        )
    return auth_header.removeprefix("Bearer ").strip()

oauth2_scheme = enforce_header_token

def verify_password(plain_password: str, hashed_password: str) -> bool:
    print(f"[DEBUG] Verifying {plain_password=} against {hashed_password=}")
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    expire = datetime.datetime.now(datetime.timezone.utc) + (
        expires_delta or datetime.timedelta(minutes=15)
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def decode_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username = payload.get("sub")
        print(f"[DEBUG] Token payload: {payload}")
        print(f"[DEBUG] Decoded username from token: {username}")
        print(f"[DEBUG] ADMIN_USERNAME from env: {ADMIN_USERNAME}")

        if username != ADMIN_USERNAME:
            print("[DEBUG] Username does not match ADMIN_USERNAME — rejecting")
            raise HTTPException(status_code=401, detail="Invalid credentials")

        return {"username": username, "role": "admin"}
    except JWTError as e:
        print(f"[DEBUG] JWT decode error: {e}")
        raise HTTPException(status_code=401, detail="Invalid or expired token")


# === AUTH ROUTES ===
@router.post("/token")
def login(form_data: OAuth2PasswordRequestForm = Depends()):
    print(f"[DEBUG] Using password hash: {ADMIN_PASSWORD_HASH}")
    print(f"[DEBUG] Login attempt: username={form_data.username}, password={form_data.password}")
    print(f"[DEBUG] Expected username: {ADMIN_USERNAME}")

    if form_data.username != ADMIN_USERNAME:
        print("[DEBUG] Username mismatch")
        raise HTTPException(status_code=401, detail="Incorrect username or password")

    if not ADMIN_PASSWORD_HASH or not verify_password(form_data.password, ADMIN_PASSWORD_HASH):
        print("[DEBUG] Password verification failed")
        raise HTTPException(status_code=401, detail="Incorrect username or password")

    print("[DEBUG] Login successful")
    token = create_access_token(data={"sub": ADMIN_USERNAME})
    return {"access_token": token, "token_type": "bearer"}


@router.get("/me")
def get_me(token: str = Depends(oauth2_scheme)):
    return decode_token(token)

# === DEPENDENCIES ===
def get_current_user(token: str = Depends(oauth2_scheme)):
    return decode_token(token)

def require_admin(user: dict = Depends(get_current_user)):
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user