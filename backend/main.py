"""
Professional 360° Panorama Stitching Backend - OpenStitching
Uses the OpenStitching library (robust wrapper around OpenCV stitching module)
Provides better API, automatic fallback strategies, and superior results
"""

from fastapi import FastAPI, File, UploadFile, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from typing import List
import cv2
import numpy as np
import logging
import traceback
from openstitching_stitcher import openstitching_stitch_with_fallback, openstitching_stitch
from robust_360_pipeline import stitch_360_robust

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="OpenStitching Panorama API", version="10.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def load_image(upload_file: UploadFile) -> np.ndarray:
    data = upload_file.file.read()
    arr  = np.frombuffer(data, np.uint8)
    img  = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError(f"Cannot decode {upload_file.filename}")
    return img


# ─────────────────────────────────────────────────────────────────────────────
# API
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/api/health")
async def health():
    try:
        from stitching import __version__ as stitching_version
    except:
        stitching_version = "unknown"
    
    return {
        "status": "healthy",
        "opencv_version": cv2.__version__,
        "openstitching_version": stitching_version,
        "method": "OpenStitching: Professional stitching with SIFT/ORB, bundle adjustment, wave correction, multiband blending",
        "features": [
            "Automatic fallback strategies",
            "Memory-optimized (640px max)",
            "PANORAMA and AFFINE modes",
            "Robust error handling"
        ],
        "version": "10.0.0"
    }


@app.post("/api/debug-stitch")
async def debug_stitch_endpoint(
    images: List[UploadFile] = File(...),
):
    """Debug endpoint that returns detailed information about image compatibility."""
    if len(images) < 2:
        raise HTTPException(400, "Need at least 2 images")
    
    # Load images
    cv_images = []
    for f in images:
        try:
            img = load_image(f)
            cv_images.append(img)
        except Exception as e:
            raise HTTPException(400, f"Bad image '{f.filename}': {e}")
    
    logger.info(f"Debug: analyzing {len(cv_images)} images")
    
    debug_info = {
        "total_images": len(cv_images),
        "image_sizes": [f"{img.shape[1]}x{img.shape[0]}" for img in cv_images],
        "recommendation": "Use 30-50% overlap between consecutive images for best results"
    }
    
    return debug_info


@app.post("/api/stitch")
async def stitch_endpoint(
    images: List[UploadFile] = File(...),
    quality: int = Query(95, ge=1, le=100),
    mode: str = Query("auto", regex="^(auto|panorama|affine|360)$"),
    detector: str = Query("sift", regex="^(sift|orb|akaze|brisk)$"),
    max_dimension: int = Query(640, ge=320, le=1280),
    confidence_threshold: float = Query(0.05, ge=0.01, le=1.0),
):
    """
    Stitch images into a panorama using OpenStitching.
    
    Parameters:
    - images: 2-60 images to stitch
    - quality: JPEG quality (1-100)
    - mode: "auto" (tries multiple), "panorama" (standard), "affine" (planar), "360" (true 360° with loop closure)
    - detector: "sift" (best), "orb" (fast), "akaze", "brisk"
    - max_dimension: Max image dimension for memory optimization (320-1280)
    - confidence_threshold: Matching confidence (0.01-1.0, lower = more frames included)
    """
    if len(images) < 2:
        raise HTTPException(400, "Need at least 2 images")
    if len(images) > 60:
        raise HTTPException(400, "Too many images (max 60)")

    # Load all images
    cv_images = []
    for f in images:
        try:
            img = load_image(f)
            cv_images.append(img)
            logger.info(f"  Loaded {f.filename}: {img.shape[1]}x{img.shape[0]}")
        except Exception as e:
            raise HTTPException(400, f"Bad image '{f.filename}': {e}")

    logger.info(f"Received {len(cv_images)} images")

    try:
        # Robust 360° pipeline for 360 and auto modes - uses ALL frames, never rejects
        if mode in ("360", "auto"):
            logger.info(f"Using robust 360° pipeline (detector={detector})")
            ok, pano, msg = stitch_360_robust(
                cv_images,
                detector_type=detector,
                confidence_threshold=confidence_threshold
            )
            if not ok or pano is None:
                raise HTTPException(500, f"Stitching failed: {msg}")
        else:
            ok, pano, msg = openstitching_stitch(
                cv_images,
                mode=mode,
                detector=detector,
                max_dimension=max_dimension
            )

        if not ok or pano is None:
            raise HTTPException(500, msg)

        enc_ok, buf = cv2.imencode(".jpg", pano, [cv2.IMWRITE_JPEG_QUALITY, quality])
        if not enc_ok:
            raise HTTPException(500, "Failed to encode panorama")

        return Response(
            content=buf.tobytes(),
            media_type="image/jpeg",
            headers={
                "X-Panorama-Width":   str(pano.shape[1]),
                "X-Panorama-Height":  str(pano.shape[0]),
                "X-Images-Processed": str(len(cv_images)),
                "X-Stitching-Method": "OpenStitching-v10",
                "X-Status":           msg,
            }
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error: {traceback.format_exc()}")
        raise HTTPException(500, f"Internal error: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=False)
