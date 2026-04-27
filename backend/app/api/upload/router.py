import uuid
import aiofiles
import os
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.user import User
from app.api.auth.router import get_current_user

router = APIRouter(prefix="/upload", tags=["upload"])

UPLOAD_DIR = "/app/uploads"


@router.post("/image")
async def upload_card_image(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    """上傳名片圖片並返回檔案 ID"""
    # Validate file type
    allowed_types = ["image/jpeg", "image/png", "image/webp", "image/jpg"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail=f"不支援的檔案格式: {file.content_type}，僅支援 JPEG/PNG/WebP"
        )
    
    # Generate unique filename
    file_ext = file.filename.split(".")[-1] if "." in file.filename else "jpg"
    file_id = str(uuid.uuid4())
    filename = f"{file_id}.{file_ext}"
    filepath = os.path.join(UPLOAD_DIR, filename)
    
    # Ensure upload directory exists
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    
    # Save file
    try:
        async with aiofiles.open(filepath, 'wb') as f:
            content = await file.read()
            await f.write(content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"檔案儲存失敗: {str(e)}")
    
    # Return file info
    return {
        "file_id": file_id,
        "filename": filename,
        "url": f"/api/v1/uploads/{filename}",
        "size": len(content),
    }


@router.get("/{filename}")
async def get_uploaded_image(
    filename: str,
    current_user: User = Depends(get_current_user),
):
    """取得已上傳的圖片"""
    filepath = os.path.join(UPLOAD_DIR, filename)
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="檔案不存在")
    
    # Return file path for serving (in production, use static files or CDN)
    with open(filepath, 'rb') as f:
        content = f.read()
    
    # Determine content type
    if filename.endswith('.png'):
        content_type = "image/png"
    elif filename.endswith('.webp'):
        content_type = "image/webp"
    else:
        content_type = "image/jpeg"
    
    from fastapi.responses import Response
    return Response(content=content, media_type=content_type)