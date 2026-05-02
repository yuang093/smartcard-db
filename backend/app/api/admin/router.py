# ===================================================================
# Admin API Router - 系統管理員專用 API
# 路徑: /api/v1/admin/
# 權限: 僅限 admin 角色
# ===================================================================

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
import os
import glob

from app.models import User, Card, Tag
from app.core.database import get_db
from app.api.auth.router import get_current_user

router = APIRouter(prefix="/api/v1/admin", tags=["admin"])


# ── Schemas ──────────────────────────────────────────────────────────

class UserResponse(BaseModel):
    id: str
    username: str
    is_active: bool
    is_admin: bool
    card_count: int
    created_at: str

    class Config:
        from_attributes = True


class UserCreate(BaseModel):
    username: str
    password: str
    is_admin: bool = False


class UserUpdate(BaseModel):
    is_admin: Optional[bool] = None


class SystemStatsResponse(BaseModel):
    total_cards: int
    total_users: int
    total_tags: int
    total_storage_mb: float
    backup_count: int
    last_backup: Optional[str]


# ── Dependencies ─────────────────────────────────────────────────────

async def get_current_admin(current_user: User = Depends(get_current_user)):
    """檢查是否為管理員"""
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="需要管理員權限")
    return current_user


# ── Endpoints ───────────────────────────────────────────────────────

@router.get("/stats", response_model=SystemStatsResponse)
async def get_system_stats(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    """取得系統統計資料"""
    # 計算卡片數
    cards_count = await db.scalar(select(func.count(Card.id)))

    # 計算用戶數
    users_count = await db.scalar(select(func.count(User.id)))

    # 計算標籤數
    tags_count = await db.scalar(select(func.count(Tag.id)))

    # 計算圖檔儲存（使用容器內的路徑）
    # 注意：uploads 目錄在 /app/uploads（容器內）
    # 但備份目錄需要掛載才能從容器存取
    uploads_dir = "/app/uploads"
    total_size = 0
    if os.path.exists(uploads_dir):
        for f in glob.glob(os.path.join(uploads_dir, "**/*"), recursive=True):
            if os.path.isfile(f):
                total_size += os.path.getsize(f)
    total_storage_mb = round(total_size / (1024 * 1024), 2)

    # 計算備份檔案（容器內掛載的主機路徑）
    # docker-compose 已將主機 backups 目錄掛載到 /backups
    backup_dir = "/backups"
    backup_count = 0
    last_backup = None
    if os.path.exists(backup_dir):
        dumps = sorted(glob.glob(os.path.join(backup_dir, "smartcard_db_*.dump")))
        backup_count = len(dumps)
        if dumps:
            # 取出日期時間
            import re
            match = re.search(r'smartcard_db_(\d{4}-\d{2}-\d{2}_\d{6})\.dump', os.path.basename(dumps[-1]))
            if match:
                dt_str = match.group(1)
                dt = datetime.strptime(dt_str, "%Y-%m-%d_%H%M%S")
                last_backup = dt.strftime("%Y-%m-%d %H:%M")

    return SystemStatsResponse(
        total_cards=cards_count or 0,
        total_users=users_count or 0,
        total_tags=tags_count or 0,
        total_storage_mb=total_storage_mb,
        backup_count=backup_count,
        last_backup=last_backup,
    )


@router.get("/users", response_model=List[UserResponse])
async def list_users(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    """取得所有用戶列表"""
    result = await db.execute(select(User).order_by(User.created_at))
    users = result.scalars().all()

    response = []
    for user in users:
        # 計算每個用戶的名片數
        card_count = await db.scalar(
            select(func.count(Card.id)).where(Card.user_id == user.id)
        )
        response.append(UserResponse(
            id=str(user.id),
            username=user.username,
            is_active=user.is_active,
            is_admin=user.is_admin,
            card_count=card_count or 0,
            created_at=user.created_at.isoformat() if user.created_at else "",
        ))
    return response


@router.post("/users", status_code=201)
async def create_user(
    user_data: UserCreate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    """新增使用者"""
    # 檢查帳號是否已存在
    existing = await db.execute(
        select(User).where(User.username == user_data.username)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="帳號已存在")

    from app.core.security import get_password_hash

    new_user = User(
        username=user_data.username,
        hashed_password=get_password_hash(user_data.password),
        is_admin=user_data.is_admin,
        is_active=True,
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)

    return {"id": str(new_user.id), "username": new_user.username, "is_admin": new_user.is_admin}


@router.patch("/users/{user_id}")
async def update_user(
    user_id: str,
    update_data: UserUpdate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    """更新使用者（支援修改 admin 權限）"""
    from uuid import UUID
    try:
        uid = UUID(user_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="無效的使用者 ID")

    result = await db.execute(select(User).where(User.id == uid))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="使用者不存在")

    if update_data.is_admin is not None:
        user.is_admin = update_data.is_admin

    await db.commit()
    return {"id": str(user.id), "username": user.username, "is_admin": user.is_admin}


class PasswordChange(BaseModel):
    new_password: str


@router.patch("/users/{user_id}/password")
async def change_user_password(
    user_id: str,
    password_data: PasswordChange,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    """修改使用者密碼（僅管理員可用）"""
    from uuid import UUID
    from app.core.security import get_password_hash

    try:
        uid = UUID(user_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="無效的使用者 ID")

    result = await db.execute(select(User).where(User.id == uid))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="使用者不存在")

    user.hashed_password = get_password_hash(password_data.new_password)
    await db.commit()
    return {"id": str(user.id), "username": user.username, "message": "密碼已更新"}


@router.delete("/users/{user_id}", status_code=204)
async def delete_user(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    """刪除使用者（連帶刪除該用戶所有名片）"""
    from uuid import UUID
    try:
        uid = UUID(user_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="無效的使用者 ID")

    result = await db.execute(select(User).where(User.id == uid))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="使用者不存在")

    if user.username == "admin":
        raise HTTPException(status_code=400, detail="無法刪除 admin 帳號")

    # 刪除用戶所有名片（cascade）
    await db.delete(user)
    await db.commit()
    return None


# ── Backup & Restore Endpoints ────────────────────────────────────────

import subprocess
import os

BACKUP_DIR_HOST = "/Users/taeyeon093.bot/.openclaw/workspace/smartcard-db-docker/backups"
BACKUP_DIR_CONTAINER = "/backups"
CONTAINER_NAME = "smartcard_v2_postgres"
DB_NAME = "smartcard"
DB_USER = "smartcard"



@router.post("/backup")
async def create_backup(admin: User = Depends(get_current_admin)):
    """手動建立備份（資料庫 + 上傳圖檔），在主機執行避免容器內無 docker 權限"""
    os.makedirs(BACKUP_DIR_HOST, exist_ok=True)
    date_str = datetime.now().strftime("%Y-%m-%d_%H%M%S")

    # 1. 從主機執行 pg_dump（需先建立 port forwarding 或用 docker run）
    db_dump_path = os.path.join(BACKUP_DIR_HOST, f"smartcard_db_{date_str}.dump")
    try:
        result = subprocess.run(
            ["docker", "exec", "-i", CONTAINER_NAME,
             "pg_dump", "-U", DB_USER, "-d", DB_NAME, "-F", "c", "-b"],
            capture_output=True,
        )
        if result.returncode != 0:
            raise Exception(result.stderr.decode())
        with open(db_dump_path, "wb") as f:
            f.write(result.stdout)
        db_size = os.path.getsize(db_dump_path)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"資料庫備份失敗: {str(e)}")

    # 2. 備份上傳圖檔（uploads 在主機 volumes/ 目錄）
    uploads_host_dir = "/Users/taeyeon093.bot/.openclaw/workspace/smartcard-db-docker/volumes/uploads"
    upload_tar_path = os.path.join(BACKUP_DIR_HOST, f"smartcard_uploads_{date_str}.tar.gz")
    upload_size = 0
    if os.path.exists(uploads_host_dir) and os.listdir(uploads_host_dir):
        try:
            result = subprocess.run(
                ["tar", "-czf", upload_tar_path, "-C", os.path.dirname(uploads_host_dir), os.path.basename(uploads_host_dir)],
                capture_output=True,
            )
            if result.returncode == 0 and os.path.exists(upload_tar_path):
                upload_size = os.path.getsize(upload_tar_path)
            else:
                upload_tar_path = None
        except Exception:
            upload_tar_path = None

    return {
        "message": "備份完成",
        "db_file": f"smartcard_db_{date_str}.dump",
        "db_size_mb": round(db_size / (1024 * 1024), 2),
        "upload_file": f"smartcard_uploads_{date_str}.tar.gz" if upload_tar_path else None,
        "upload_size_mb": round(upload_size / (1024 * 1024), 2) if upload_size else 0,
    }


@router.get("/backup/list")
async def list_backups(admin: User = Depends(get_current_admin)):
    """列出所有備份檔案"""
    os.makedirs(BACKUP_DIR_HOST, exist_ok=True)
    dumps = sorted(glob.glob(os.path.join(BACKUP_DIR_HOST, "smartcard_db_*.dump")))
    tars = sorted(glob.glob(os.path.join(BACKUP_DIR_HOST, "smartcard_uploads_*.tar.gz")))

    files = []
    for f in dumps + tars:
        stat = os.stat(f)
        files.append({
            "name": os.path.basename(f),
            "size_mb": round(stat.st_size / (1024 * 1024), 2),
            "created": datetime.fromtimestamp(stat.st_mtime).strftime("%Y-%m-%d %H:%M:%S"),
            "type": "db" if "db_" in f else "uploads",
        })

    return {"files": files}



@router.get("/backup/download/{filename}")
async def download_backup(
    filename: str,
    admin: User = Depends(get_current_admin),
):
    """下載備份檔案"""
    safe_name = os.path.basename(filename)
    file_path = os.path.join(BACKUP_DIR_HOST, safe_name)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="檔案不存在")

    from starlette.responses import FileResponse
    return FileResponse(
        file_path,
        media_type="application/octet-stream",
        filename=safe_name,
    )


@router.post("/backup/restore")
async def restore_backup(
    db_file: str,
    upload_file: str | None = None,
    admin: User = Depends(get_current_admin),
):
    """從備份檔案還原（需提供 db dump 檔名，可選上傳圖檔）"""
    db_path = os.path.join(BACKUP_DIR_HOST, os.path.basename(db_file))
    if not os.path.exists(db_path):
        raise HTTPException(status_code=404, detail="資料庫備份檔案不存在")

    # 還原資料庫
    try:
        result = subprocess.run(
            ["docker", "exec", "-i", CONTAINER_NAME,
             "pg_restore", "-U", DB_USER, "-d", DB_NAME, "--clean", "--if-exists"],
            stdin=open(db_path, "rb"),
            capture_output=True,
        )
        if result.returncode != 0:
            raise Exception(result.stderr.decode())
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"資料庫還原失敗: {str(e)}")

    # 還原上傳圖檔（可選）
    if upload_file:
        upload_path = os.path.join(BACKUP_DIR_HOST, os.path.basename(upload_file))
        if os.path.exists(upload_path):
            uploads_host_dir = "/Users/taeyeon093.bot/.openclaw/workspace/smartcard-db-docker/volumes/uploads"
            subprocess.run(["rm", "-rf", uploads_host_dir])
            os.makedirs(uploads_host_dir, exist_ok=True)
            subprocess.run(
                ["tar", "-xzf", upload_path, "-C", os.path.dirname(uploads_host_dir)],
                capture_output=True,
            )

    return {"message": "還原完成", "db_file": db_file, "upload_file": upload_file}