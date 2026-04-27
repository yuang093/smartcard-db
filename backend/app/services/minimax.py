# backend/app/services/minimax.py
"""
MiniMax Vision API client for business card OCR.
"""

import base64
import json
import httpx
from pathlib import Path

from app.core.config import settings


SYSTEM_PROMPT = """你是一個精準的名片資料萃取專家。我會提供給你一張或兩張名片照片（可能包含正反面）。
請解析圖片中的文字，並嚴格按照以下的 JSON 格式回傳結果。
如果某個欄位的資訊在名片上找不到、或是字跡模糊無法辨識，請將該欄位的值設為 null，絕對不要自行編造資料。
確保不要輸出任何 JSON 格式以外的文字解釋。

預期回傳的 JSON 結構 (Expected Output)
{
  "name": "字串或 null",
  "company": "字串或 null",
  "title": "字串或 null",
  "phone": "字串或 null (請保留分機號碼)",
  "mobile": "字串或 null",
  "email": "字串或 null",
  "address": "字串或 null",
  "suggested_tags": ["字串1", "字串2"]
}"""


async def parse_card_with_minimax(image_paths: list[str]) -> dict:
    """
    Send card images to MiniMax Vision API and return parsed JSON.

    Args:
        image_paths: List of absolute file paths (front, and optionally back).

    Returns:
        Parsed card data dict matching the expected JSON structure.
    Raises:
        httpx.HTTPStatusError: If API call fails.
        ValueError: If response cannot be parsed as JSON.
    """
    if not settings.MINIMAX_API_KEY:
        raise ValueError("MINIMAX_API_KEY is not configured")

    images_b64: list[dict] = []
    for path in image_paths:
        with open(path, "rb") as f:
            img_b64 = base64.b64encode(f.read()).decode("utf-8")
            images_b64.append({"data": img_b64, "type": "image_url"})

    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(
            "https://api.minimax.io/v1/coding_plan/vlm",
            headers={
                "Authorization": f"Bearer {settings.MINIMAX_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": "MiniMax-VL-01",
                "prompt": SYSTEM_PROMPT,
                "image_url": f"data:image/jpeg;base64,{images_b64[0]['data']}",
            },
        )
        response.raise_for_status()
        result = response.json()

    # Extract text from MiniMax VLM response
    text = result.get("content", "")
    if not text:
        raise ValueError("Empty response from MiniMax Vision API")

    # Strip markdown code fences if present
    text = text.strip()
    if text.startswith("```"):
        text = text.split("```")[1]
        if text.startswith("json"):
            text = text[4:]
        text = text.strip()

    return json.loads(text)
