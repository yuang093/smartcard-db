# backend/app/services/minimax.py
"""
MiniMax Vision API client for business card OCR + edge detection.
"""

import base64
import json
import httpx
from pathlib import Path

from app.core.config import settings


OCR_SYSTEM_PROMPT = """你是一個精準的名片資料萃取專家。我會提供給你一張或兩張名片照片（可能包含正反面）。
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

EDGE_SYSTEM_PROMPT = """你是一個名片邊緣偵測專家。我會提供給你一張名片照片。
請仔細找出名片在圖片中的邊界範圍（名片通常佔圖片的 30%-95%）。

請嚴格按照以下 JSON 格式回傳，數值全部是 0-1 的歸一化座標：
{
  "crop_coords": {
    "x1": "左邊界 0-1",
    "y1": "上邊界 0-1",
    "x2": "右邊界 0-1",
    "y2": "下邊界 0-1"
  }
}

x1=0 代表名片的左邊緣碰到圖片左邊，x1=1 代表名片的左邊緣碰到圖片右邊。
y1=0 代表名片頂邊碰到圖片頂邊，y1=1 代表名片頂邊碰到圖片底邊。

只需要輸出一個 JSON 物件，不要有任何其他文字解釋。如果無法判斷，回傳預設值：
{"crop_coords": {"x1": 0.05, "y1": 0.05, "x2": 0.95, "y2": 0.95}}"""


def _call_minimax_vision(prompt: str, image_b64: str) -> dict:
    """Sync helper to call MiniMax Vision API."""
    if not settings.MINIMAX_API_KEY:
        raise ValueError("MINIMAX_API_KEY is not configured")

    with httpx.Client(timeout=60.0) as client:
        response = client.post(
            "https://api.minimax.io/v1/coding_plan/vlm",
            headers={
                "Authorization": f"Bearer {settings.MINIMAX_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": "MiniMax-VL-01",
                "prompt": prompt,
                "image_url": f"data:image/jpeg;base64,{image_b64}",
            },
        )
        response.raise_for_status()
        return response.json()


def _extract_json(text: str) -> dict:
    """Strip markdown fences and parse JSON."""
    text = text.strip()
    if text.startswith("```"):
        parts = text.split("```")
        if len(parts) >= 2:
            text = parts[1]
            if text.startswith("json"):
                text = text[4:]
            text = text.strip()
    return json.loads(text)


async def parse_card_with_minimax(image_paths: list[str]) -> dict:
    """
    Send card images to MiniMax Vision API and return parsed JSON (OCR only).
    """
    if not settings.MINIMAX_API_KEY:
        raise ValueError("MINIMAX_API_KEY is not configured")

    with open(image_paths[0], "rb") as f:
        img_b64 = base64.b64encode(f.read()).decode("utf-8")

    result = _call_minimax_vision(OCR_SYSTEM_PROMPT, img_b64)
    text = result.get("content", "")
    if not text:
        raise ValueError("Empty response from MiniMax Vision API")

    parsed = _extract_json(text)
    return parsed


async def detect_card_edges(image_path: str) -> dict:
    """
    Detect card edge coordinates using MiniMax Vision API.
    Returns dict with crop_coords: {x1, y1, x2, y2} normalized 0-1.
    """
    if not settings.MINIMAX_API_KEY:
        raise ValueError("MINIMAX_API_KEY is not configured")

    with open(image_path, "rb") as f:
        img_b64 = base64.b64encode(f.read()).decode("utf-8")

    result = _call_minimax_vision(EDGE_SYSTEM_PROMPT, img_b64)
    text = result.get("content", "")
    if not text:
        # Default fallback
        return {"crop_coords": {"x1": 0.05, "y1": 0.05, "x2": 0.95, "y2": 0.95}}

    parsed = _extract_json(text)

    # Validate structure
    if "crop_coords" not in parsed:
        return {"crop_coords": {"x1": 0.05, "y1": 0.05, "x2": 0.95, "y2": 0.95}}

    coords = parsed["crop_coords"]
    # Ensure all values are numbers and in valid range
    for key in ["x1", "y1", "x2", "y2"]:
        if key not in coords or not isinstance(coords[key], (int, float)):
            coords[key] = 0.05 if key in ("x1", "y1") else 0.95

    # Sanitize: ensure x1 < x2, y1 < y2, all in [0, 1]
    coords["x1"] = max(0, min(0.95, float(coords["x1"])))
    coords["y1"] = max(0, min(0.95, float(coords["y1"])))
    coords["x2"] = max(coords["x1"] + 0.05, min(1, float(coords["x2"])))
    coords["y2"] = max(coords["y1"] + 0.05, min(1, float(coords["y2"])))

    return {"crop_coords": coords}