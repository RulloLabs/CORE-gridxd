import os
import io
import uuid
import zipfile
from typing import List, Optional
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import numpy as np
import cv2
from PIL import Image
from rembg import remove
import base64
from dotenv import load_dotenv

# Load local .env if present
load_dotenv()

import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("gridxd")

from style_extractor import extract_style, generate_icon_svg
from auth_middleware import verify_supabase_jwt
from supabase_service import upload_to_storage

app = FastAPI(title="GridXD Processing Backend", version="2.0.0")

@app.on_event("startup")
async def startup_event():
    logger.info("🚀 GridXD Backend starting up...")
    logger.info(f"SUPABASE_URL configured: {bool(os.environ.get('SUPABASE_URL'))}")
    logger.info(f"GEMINI_API_KEY configured: {bool(os.environ.get('GEMINI_API_KEY'))}")
    logger.info(f"SUPABASE_JWT_SECRET configured: {bool(os.environ.get('SUPABASE_JWT_SECRET'))}")
    if os.environ.get("DEBUG", "false").lower() == "true":
        logger.warning("⚠️ Running in DEBUG mode. Authentication might be bypassed if JWT_SECRET is missing.")

# ─── CORS — NO WILDCARD ───────────────────────────────────────────────────────
ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:3000",
    "https://gridxd.vercel.app",
    "https://gridxd-core-eta.vercel.app",
]

# Allow preview deployments dynamically via env var
extra_origin = os.environ.get("EXTRA_ALLOWED_ORIGIN")
if extra_origin:
    ALLOWED_ORIGINS.append(extra_origin)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept"],
)

# ─── Security Headers Middleware ──────────────────────────────────────────────
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    response.headers["Content-Security-Policy"] = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';"
    return response


def detect_icons(image_np):
    """
    Detect icons using OpenCV contours
    """
    gray = cv2.cvtColor(image_np, cv2.COLOR_BGR2GRAY)
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    thresh = cv2.adaptiveThreshold(blurred, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
                                   cv2.THRESH_BINARY_INV, 11, 2)

    contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    regions = []
    min_size = min(image_np.shape[0], image_np.shape[1]) * 0.05

    for cnt in contours:
        x, y, w, h = cv2.boundingRect(cnt)
        if w > min_size and h > min_size:
            regions.append((x, y, w, h))

    # Sort regions top-to-bottom, left-to-right
    regions.sort(key=lambda r: (r[1] // 50, r[0]))
    return regions


# ─── Health Check (public — no auth required) ─────────────────────────────────
@app.get("/health")
async def health():
    gemini_configured = bool(os.environ.get("GEMINI_API_KEY"))
    jwt_configured = bool(os.environ.get("SUPABASE_JWT_SECRET"))
    return {
        "status": "ok",
        "engine": "OpenCV + rembg",
        "style_ai": "gemini-1.5-flash" if gemini_configured else "disabled (no GEMINI_API_KEY)",
        "auth": "enabled" if jwt_configured else "disabled (DEBUG mode)",
        "version": "2.0.0",
    }


# ─── Style Extraction Endpoint (PROTECTED) ────────────────────────────────────
@app.post("/extract-style")
async def extract_style_endpoint(
    image: UploadFile = File(...),
    user_id: str = Depends(verify_supabase_jwt),
):
    """
    Analyzes an image with Gemini Vision and returns the visual DNA.
    Requires a valid Supabase JWT.
    """
    try:
        contents = await image.read()
        pil_img = Image.open(io.BytesIO(contents)).convert("RGB")
        style = await extract_style(pil_img)
        return {"style": style, "processed_by": user_id[:8] + "..."}
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


# ─── Icon Generation Endpoint (PROTECTED) ─────────────────────────────────────
@app.post("/generate-icon")
async def generate_icon_endpoint(
    icon_name: str = Form(...),
    dna: str = Form(...),
    variant: str = Form("outline"),
    user_id: str = Depends(verify_supabase_jwt),
):
    """
    Generates a custom SVG icon based on name, style DNA and variant.
    Requires a valid Supabase JWT.
    """
    try:
        import json
        try:
            dna_dict = json.loads(dna)
        except json.JSONDecodeError:
            raise HTTPException(status_code=400, detail="DNA must be a valid JSON string")
            
        svg_code = await generate_icon_svg(icon_name, dna_dict, variant)

        if not svg_code:
            raise HTTPException(status_code=500, detail="Gemini failed to generate SVG")

        return {"svg": svg_code}
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


# ─── Main Processing Endpoint (PROTECTED) ─────────────────────────────────────
@app.post("/process-image")
async def process_image(
    image: UploadFile = File(...),
    remove_background: str = Form("true"),
    upscale: str = Form("true"),
    project_name: Optional[str] = Form(None),
    system_prompt: Optional[str] = Form(None),
    analyze_style: str = Form("true"),
    user_id: str = Depends(verify_supabase_jwt),
):
    try:
        logger.info(f"📸 Processing image for user: {user_id}")
        
        # ── Limit File Size (10MB) ───────────────────────────────────────────
        MAX_SIZE = 10 * 1024 * 1024
        contents = await image.read()
        if len(contents) > MAX_SIZE:
            logger.error(f"❌ File too large: {len(contents)} bytes")
            raise HTTPException(status_code=413, detail="Imagen demasiado grande (máx 10MB)")

        nparr = np.frombuffer(contents, np.uint8)
        img_np = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if img_np is None:
            logger.error("❌ Invalid image format")
            raise HTTPException(status_code=400, detail="Imagen inválida")

        # ── Style Analysis ───────────────────────────────────────────────────
        style_result = None
        if analyze_style.lower() == "true":
            logger.info("🎨 Extracting style DNA with Gemini...")
            try:
                pil_for_style = Image.fromarray(cv2.cvtColor(img_np, cv2.COLOR_BGR2RGB))
                style_result = await extract_style(pil_for_style)
                logger.info("✅ Style extracted successfully")
            except Exception as e:
                logger.warning(f"⚠️ Style extraction failed: {e}")
                pass 

        # Detect icons
        logger.info("🔍 Detecting icons with OpenCV...")
        regions = detect_icons(img_np)
        if not regions:
            logger.info("ℹ️ No specific icons detected, processing full image")
            h, w = img_np.shape[:2]
            regions = [(0, 0, w, h)]
        else:
            logger.info(f"✅ Detected {len(regions)} icon regions")

        session_id = str(uuid.uuid4())
        results = []
        
        # Memory buffer for the ZIP
        zip_buffer = io.BytesIO()
        
        logger.info(f"⚡ Processing {min(len(regions), 20)} icons...")
        
        with zipfile.ZipFile(zip_buffer, 'w') as zip_file:
            for i, (x, y, w, h) in enumerate(regions[:20]):
                padding = 20
                x1 = max(0, x - padding)
                y1 = max(0, y - padding)
                x2 = min(img_np.shape[1], x + w + padding)
                y2 = min(img_np.shape[0], y + h + padding)

                roi = img_np[y1:y2, x1:x2]
                roi_pil = Image.fromarray(cv2.cvtColor(roi, cv2.COLOR_BGR2RGB))

                if remove_background.lower() == "true":
                    roi_processed = remove(roi_pil)
                else:
                    roi_processed = roi_pil

                size = (2048, 2048) if upscale.lower() == "true" else (1024, 1024)
                roi_processed = roi_processed.resize(size, Image.Resampling.LANCZOS)

                # Save to bytes
                img_byte_arr = io.BytesIO()
                roi_processed.save(img_byte_arr, format='PNG')
                img_bytes = img_byte_arr.getvalue()

                # Upload to Supabase Storage
                icon_name_file = f"icon_{i+1:02d}.png"
                storage_path = f"{user_id}/{session_id}/{icon_name_file}"
                
                public_url = await upload_to_storage(
                    bucket="processed_assets",
                    path=storage_path,
                    file_content=img_bytes
                )

                if public_url:
                    zip_file.writestr(icon_name_file, img_bytes)
                    results.append({
                        "url": public_url,
                        "name": icon_name_file
                    })

        # Upload ZIP
        zip_filename = f"{project_name or 'gridxd'}_assets.zip"
        zip_storage_path = f"{user_id}/{session_id}/{zip_filename}"
        zip_public_url = await upload_to_storage(
            bucket="processed_assets",
            path=zip_storage_path,
            file_content=zip_buffer.getvalue(),
            content_type="application/zip"
        )

        response = {
            "zipUrl": zip_public_url,
            "images": results,
        }
        if style_result:
            response["visualStyle"] = style_result

        return response

    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        # Do not expose internal error details in production
        detail = str(e) if os.environ.get("DEBUG", "false").lower() == "true" else "Error interno en el procesamiento de imagen"
        raise HTTPException(status_code=500, detail=detail)


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
