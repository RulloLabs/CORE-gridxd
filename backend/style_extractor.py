"""
GridXD Style Extractor
Analyzes the visual "DNA" of an image using Google Gemini Vision AI.
Returns structured design system parameters.
"""

import os
import io
import base64
import json
import re
import logging
from typing import Optional
from PIL import Image

logger = logging.getLogger("gridxd")

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")


def _image_to_base64(img: Image.Image, max_size: int = 768) -> str:
    """Resize image and encode as base64 JPEG for the API."""
    img.thumbnail((max_size, max_size), Image.Resampling.LANCZOS)
    buf = io.BytesIO()
    img_rgb = img.convert("RGB")
    img_rgb.save(buf, format="JPEG", quality=85)
    return base64.b64encode(buf.getvalue()).decode("utf-8")


async def extract_style(img: Image.Image) -> dict:
    """
    Calls Gemini Vision to extract design system parameters from an image.
    Returns a dict with style properties.
    Falls back to sensible defaults if the API is unavailable.
    """
    if not GEMINI_API_KEY:
        return _default_style()

    try:
        import httpx

        img_b64 = _image_to_base64(img)

        prompt = """You are a senior UI/UX designer and design systems expert. 
Analyze this image and extract its visual DNA to define an icon design system.

Respond ONLY with valid JSON (no markdown, no code fences). The JSON must have exactly these fields:

{
  "style": "outline" | "filled" | "duotone",
  "stroke_width": number (1 to 3),
  "corner_radius": "sharp" | "soft" | "rounded",
  "color_primary": "#HEX",
  "color_secondary": "#HEX",
  "color_accent": "#HEX",
  "color_bg": "#HEX",
  "mood": "minimal" | "playful" | "corporate" | "luxury" | "techno",
  "complexity": "simple" | "medium" | "detailed",
  "grid_size": 24,
  "visual_weight": "light" | "regular" | "bold",
  "notes": "One sentence describing the style in English"
}

Base your analysis strictly on what you see in the image. Be precise and consistent."""

        payload = {
            "contents": [
                {
                    "parts": [
                        {"text": prompt},
                        {
                            "inline_data": {
                                "mime_type": "image/jpeg",
                                "data": img_b64
                            }
                        }
                    ]
                }
            ],
            "generationConfig": {
                "temperature": 0.2,
                "maxOutputTokens": 512,
                "responseMimeType": "application/json"
            }
        }

        url = (
            f"https://generativelanguage.googleapis.com/v1beta/models/"
            f"gemini-1.5-flash-latest:generateContent?key={GEMINI_API_KEY}"
        )

        async with httpx.AsyncClient(timeout=20.0) as client:
            response = await client.post(url, json=payload)
            response.raise_for_status()
            data = response.json()

        raw_text = data["candidates"][0]["content"]["parts"][0]["text"]

        # Strip markdown fences if present
        raw_text = re.sub(r"```json\s*", "", raw_text)
        raw_text = re.sub(r"```\s*", "", raw_text)

        style = json.loads(raw_text.strip())
        return _validate_style(style)

    except Exception as e:
        logger.warning(f"Gemini style extraction error: {e}. Using defaults.")
        return _default_style()


def _validate_style(style: dict) -> dict:
    """Merge API result with defaults to guarantee all keys are present."""
    defaults = _default_style()
    for key, value in defaults.items():
        if key not in style or style[key] is None:
            style[key] = value
    return style


def _default_style() -> dict:
    return {
        "style": "outline",
        "stroke_width": 2,
        "corner_radius": "rounded",
        "color_primary": "#000000",
        "color_secondary": "#555555",
        "color_accent": "#0066FF",
        "color_bg": "#FFFFFF",
        "mood": "minimal",
        "complexity": "simple",
        "grid_size": 24,
        "visual_weight": "regular",
        "notes": "Clean minimal outline style, suitable for SaaS dashboards."
    }


def _sanitize_svg(svg_code: str) -> str:
    """
    Robust sanitization to prevent XSS in SVGs using bleach.
    Falls back to regex if bleach is unavailable.
    """
    try:
        import bleach
        from bleach.sanitizer import ALLOWED_TAGS, ALLOWED_ATTRIBUTES
        
        svg_tags = [
            'svg', 'g', 'path', 'circle', 'rect', 'line', 'polyline', 'polygon', 
            'ellipse', 'defs', 'use', 'title', 'desc'
        ]
        
        svg_attrs = {
            '*': ['id', 'class', 'style', 'fill', 'stroke', 'stroke-width', 'stroke-linecap', 
                  'stroke-linejoin', 'opacity', 'transform', 'viewBox', 'width', 'height', 
                  'xmlns', 'version', 'x', 'y', 'r', 'cx', 'cy', 'x1', 'y1', 'x2', 'y2', 
                  'd', 'points'],
        }
        
        return bleach.clean(
            svg_code,
            tags=list(ALLOWED_TAGS) + svg_tags,
            attributes={**ALLOWED_ATTRIBUTES, **svg_attrs},
            strip=True
        )
    except ImportError:
        logger.warning("Bleach not found. Using fallback regex sanitization.")
        # Remove script tags and their content
        svg_code = re.sub(r"<script.*?>.*?</script>", "", svg_code, flags=re.DOTALL | re.IGNORECASE)
        # Remove event handlers (onmouseover, onload, etc.)
        svg_code = re.sub(r"\s+on\w+\s*=\s*['\"].*?['\"]", "", svg_code, flags=re.IGNORECASE)
        # Remove javascript: pseudoprotocol
        svg_code = re.sub(r"href\s*=\s*['\"]javascript:.*?['\"]", 'href="#"', svg_code, flags=re.IGNORECASE)
        return svg_code


async def generate_icon_svg(icon_name: str, dna: dict, variant: str = "outline") -> str:
    """
    Uses Gemini to generate original SVG code for a specific icon 
    that strictly follows the provided style DNA and variant.
    """
    if not GEMINI_API_KEY:
        return ""

    try:
        import httpx

        prompt = f"""You are a specialized SVG icon architect. 
Generate a valid, minimal SVG code for a '{icon_name}' icon.

STRICT DESIGN RULES (DNA):
- Base Style: {dna.get('style', 'outline')}
- Requested Variant: {variant}
- Stroke Width: {dna.get('stroke_width', 2)}px
- Corners: {dna.get('corner_radius', 'rounded')}
- Color: CURRENT_COLOR (use 'currentColor')
- ViewBox: 0 0 24 24
- Mood: {dna.get('mood', 'minimal')}

CONSTRUCTION RULES:
1. If variant is 'outline': Use strokes, no fill, ensure internal paths are open/stroked.
2. If variant is 'filled': Use closed paths with fill="currentColor", no stroke.
3. If variant is 'duotone': Use primary elements with opacity="1" and secondary elements with opacity="0.3".

Respond ONLY with the SVG code itself. No markdown, no comments, no explanations.
Ensure the icon is centered and fits within the 24x24 grid.
"""

        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "temperature": 0.4,
                "maxOutputTokens": 1024,
            }
        }

        url = (
            f"https://generativelanguage.googleapis.com/v1beta/models/"
            f"gemini-1.5-flash-latest:generateContent?key={GEMINI_API_KEY}"
        )

        async with httpx.AsyncClient(timeout=20.0) as client:
            response = await client.post(url, json=payload)
            response.raise_for_status()
            data = response.json()

        svg_code = data["candidates"][0]["content"]["parts"][0]["text"].strip()
        
        # Cleanup: remove markdown if Gemini ignored instructions
        svg_code = re.sub(r"```svg\s*", "", svg_code)
        svg_code = re.sub(r"```html\s*", "", svg_code)
        svg_code = re.sub(r"```\s*", "", svg_code)
        
        # Security: Sanitize output before returning to client
        return _sanitize_svg(svg_code)

    except Exception as e:
        logger.error(f"Gemini icon generation error: {e}")
        return ""
