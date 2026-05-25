import os
import io
import json
import uuid
import zipfile
from datetime import datetime, timezone
from typing import Optional
from fastapi import FastAPI, UploadFile, File, Form, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
import numpy as np
import cv2
from PIL import Image
from rembg import remove
import base64
from dotenv import load_dotenv

# Load local .env if present
load_dotenv()

import logging

# Structured JSON logging for better traceability in Cloud Run
class StructuredFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        log_entry = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "name": record.name,
            "message": record.getMessage(),
        }
        if hasattr(record, "extra"):
            log_entry["extra"] = getattr(record, "extra")
        if record.exc_info and record.exc_info[0]:
            log_entry["exception"] = self.formatException(record.exc_info)
        return json.dumps(log_entry)

handler = logging.StreamHandler()
handler.setFormatter(StructuredFormatter())
logging.basicConfig(level=logging.INFO, handlers=[handler])
logger = logging.getLogger("gridxd")

from style_extractor import extract_style, generate_icon_svg
from auth_middleware import verify_supabase_jwt
from supabase_service import upload_to_storage
from app_exceptions import (
    AppException,
    UnauthorizedException,
    RateLimitException,
    ValidationException,
    InternalException,
    ServiceUnavailableException,
)

DEBUG = os.environ.get("DEBUG", "false").lower() == "true"

app = FastAPI(title="GridXD Processing Backend", version="2.0.0")

@app.on_event("startup")
async def startup_event():
    logger.info("GridXD Backend starting up", extra={"event": "startup"})
    services = {
        "SUPABASE_URL": bool(os.environ.get("SUPABASE_URL")),
        "GEMINI_API_KEY": bool(os.environ.get("GEMINI_API_KEY")),
        "SUPABASE_JWT_SECRET": bool(os.environ.get("SUPABASE_JWT_SECRET")),
    }
    for name, configured in services.items():
        level = "info" if configured else "warning"
        logger.log(getattr(logging, level.upper()), f"{name} configured: {configured}", extra={"service": name, "configured": configured, "event": "startup"})

    if DEBUG:
        logger.warning("Running in DEBUG mode", extra={"mode": "debug", "event": "startup"})

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


# ─── Global Error Handler — catches unhandled exceptions ─────────────────────
@app.exception_handler(AppException)
async def app_exception_handler(request: Request, exc: AppException):
    logger.error(
        f"AppException: {exc.detail.get('code')} — {exc.detail.get('message')}",
        extra={"status_code": exc.status_code, "code": exc.detail.get("code"), "path": request.url.path},
    )
    return JSONResponse(status_code=exc.status_code, content=exc.detail)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    logger.warning(f"Validation error: {exc.errors()}", extra={"path": request.url.path})
    return JSONResponse(
        status_code=422,
        content={
            "code": "VALIDATION_ERROR",
            "message": "Invalid request",
            "context": {"errors": exc.errors()},
        },
    )


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {exc}", extra={"path": request.url.path}, exc_info=True)
    detail = str(exc) if DEBUG else "Internal server error"
    return JSONResponse(
        status_code=500,
        content={
            "code": "INTERNAL_ERROR",
            "message": detail,
        },
    )


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
    gemini_key = os.environ.get("GEMINI_API_KEY", "")
    supabase_url = os.environ.get("SUPABASE_URL", "")
    jwt_secret = os.environ.get("SUPABASE_JWT_SECRET", "")
    stripe_key = os.environ.get("STRIPE_SECRET_KEY", "")

    gemini_configured = bool(gemini_key)
    jwt_configured = bool(jwt_secret)
    supabase_configured = bool(supabase_url)
    stripe_configured = bool(stripe_key)

    # Check if any key is approaching expiration (keys are plain strings, so we can't check expiry)
    # But we can report configuration status for monitoring
    services = {
        "gemini": {
            "configured": gemini_configured,
            "status": "ok" if gemini_configured else "missing",
        },
        "supabase": {
            "configured": supabase_configured,
            "status": "ok" if supabase_configured else "missing",
        },
        "stripe": {
            "configured": stripe_configured,
            "status": "ok" if stripe_configured else "missing",
        },
    }

    overall_status = "ok"
    for name, svc in services.items():
        if svc["status"] == "missing":
            overall_status = "degraded"

    return {
        "status": overall_status,
        "version": "2.0.0",
        "engine": "OpenCV + rembg",
        "style_ai": "gemini-1.5-flash" if gemini_configured else "disabled",
        "auth": "enabled" if jwt_configured else "disabled",
        "mode": "production" if not DEBUG else "debug",
        "services": services,
        "timestamp": datetime.now(timezone.utc).isoformat(),
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
        logger.error(f"Style extraction failed: {e}", exc_info=True, extra={"endpoint": "extract-style"})
        raise InternalException(message=str(e) if DEBUG else "Style extraction failed")


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
        try:
            dna_dict = json.loads(dna)
        except json.JSONDecodeError:
            raise ValidationException(message="DNA must be a valid JSON string", context={"dna": dna[:100]})

        svg_code = await generate_icon_svg(icon_name, dna_dict, variant)

        if not svg_code:
            raise InternalException(message="Gemini failed to generate SVG")

        return {"svg": svg_code}
    except AppException:
        raise
    except Exception as e:
        logger.error(f"Icon generation failed: {e}", exc_info=True, extra={"endpoint": "generate-icon"})
        raise InternalException(message=str(e) if DEBUG else "Icon generation failed")


# ─── Main Processing Endpoint (PROTECTED) ─────────────────────────────────────
@app.post("/process-image")
async def process_image(
    image: UploadFile = File(...),
    remove_background: str = Form("true"),
    upscale: str = Form("true"),
    project_name: Optional[str] = Form(None),
    system_prompt: Optional[str] = Form(None),
    analyze_style: str = Form("true"),
    regions: Optional[str] = Form(None),
    user_id: str = Depends(verify_supabase_jwt),
):
    try:
        logger.info(f"Processing image for user: {user_id}", extra={"user_id": user_id, "endpoint": "process-image"})

        # ── Limit File Size (10MB) ───────────────────────────────────────────
        MAX_SIZE = 10 * 1024 * 1024
        contents = await image.read()
        if len(contents) > MAX_SIZE:
            logger.error(f"File too large: {len(contents)} bytes", extra={"size": len(contents), "user_id": user_id})
            raise ValidationException(message="File too large (max 10MB)")

        nparr = np.frombuffer(contents, np.uint8)
        img_np = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if img_np is None:
            logger.error("Invalid image format", extra={"user_id": user_id})
            raise ValidationException(message="Invalid image format")

        # ── Style Analysis ───────────────────────────────────────────────────
        style_result = None
        if analyze_style.lower() == "true":
            logger.info("Extracting style DNA with Gemini...", extra={"user_id": user_id})
            try:
                pil_for_style = Image.fromarray(cv2.cvtColor(img_np, cv2.COLOR_BGR2RGB))
                style_result = await extract_style(pil_for_style)
                logger.info("Style extracted successfully", extra={"user_id": user_id})
            except Exception as e:
                logger.warning(f"Style extraction failed: {e}", extra={"user_id": user_id})
                pass

        # Detect icons
        logger.info("Detecting icons with OpenCV...", extra={"user_id": user_id})

        regions_list = []
        if regions:
            try:
                parsed_regions = json.loads(regions)
                img_h, img_w = img_np.shape[:2]

                for r in parsed_regions:
                    x = int(r.get('x', 0))
                    y = int(r.get('y', 0))
                    w = int(r.get('w', 0))
                    h = int(r.get('h', 0))

                    x = max(0, x)
                    y = max(0, y)

                    if w <= 0 or h <= 0:
                        continue

                    if x + w > img_w:
                        w = img_w - x
                    if y + h > img_h:
                        h = img_h - y

                    if w > 0 and h > 0:
                        regions_list.append((x, y, w, h))

                logger.info(f"Using {len(regions_list)} valid regions provided by frontend", extra={"user_id": user_id})
                if not regions_list:
                    logger.warning("All provided regions were invalid. Falling back to auto-detect.", extra={"user_id": user_id})
                    regions_list = detect_icons(img_np)
            except Exception as e:
                logger.warning(f"Failed to parse provided regions: {e}. Falling back to auto-detect.", extra={"user_id": user_id})
                regions_list = detect_icons(img_np)
        else:
            regions_list = detect_icons(img_np)

        if not regions_list:
            logger.info("No specific icons detected, processing full image", extra={"user_id": user_id})
            h, w = img_np.shape[:2]
            regions_list = [(0, 0, w, h)]
        else:
            logger.info(f"Processing {len(regions_list)} icon regions", extra={"user_id": user_id, "region_count": len(regions_list)})

        session_id = str(uuid.uuid4())
        results = []

        zip_buffer = io.BytesIO()

        icon_count = min(len(regions_list), 20)
        logger.info(f"Processing {icon_count} icons...", extra={"user_id": user_id, "icon_count": icon_count})

        with zipfile.ZipFile(zip_buffer, 'w') as zip_file:
            for i, (x, y, w, h) in enumerate(regions_list[:20]):
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

                img_byte_arr = io.BytesIO()
                roi_processed.save(img_byte_arr, format='PNG')
                img_bytes = img_byte_arr.getvalue()

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

        logger.info(f"Processing complete: {len(results)} icons", extra={"user_id": user_id, "result_count": len(results)})
        return response

    except AppException:
        raise
    except Exception as e:
        logger.error(f"Image processing failed: {e}", exc_info=True, extra={"user_id": user_id})
        raise InternalException(message=str(e) if DEBUG else "Internal error during image processing")


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
