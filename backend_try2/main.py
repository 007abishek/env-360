"""
FastAPI Server for Backend Try2
OpenCV Detailed Stitcher with Loop Closure, Overlap Validation, and Plain Scene Handling
"""

from fastapi import FastAPI, File, UploadFile, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from typing import List, Optional
from pydantic import BaseModel, Field
import cv2
import numpy as np
import logging
import json
import sys

# Add current directory to path for imports
sys.path.insert(0, '.')

from stitching_pipeline import StitchingPipeline
from robust_360_stitcher import Robust360Stitcher
from fast_360_stitcher import Fast360Stitcher
import config

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="Backend Try2 - OpenCV Detailed Stitcher",
    description="Advanced 360° panorama stitching with loop closure detection",
    version=config.API_VERSION
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─────────────────────────────────────────────────────────────────────────────
# Response Models
# ─────────────────────────────────────────────────────────────────────────────

class HealthResponse(BaseModel):
    """Health check response"""
    status: str
    opencv_version: str
    backend_version: str
    method: str
    features: List[str]


class ImageInfo(BaseModel):
    """Image information"""
    filename: str
    size: str
    features: Optional[int] = None


class DebugResponse(BaseModel):
    """Debug analysis response"""
    total_images: int
    image_info: List[ImageInfo]
    overlap_stats: Optional[dict] = None
    loop_closure_info: Optional[dict] = None
    recommendations: List[str]


# ─────────────────────────────────────────────────────────────────────────────
# Helper Functions
# ─────────────────────────────────────────────────────────────────────────────

def load_image(upload_file: UploadFile) -> np.ndarray:
    """Load image from uploaded file"""
    data = upload_file.file.read()
    arr = np.frombuffer(data, np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError(f"Cannot decode {upload_file.filename}")
    return img


# ─────────────────────────────────────────────────────────────────────────────
# API Endpoints
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/api/health", response_model=HealthResponse)
async def health():
    """Health check endpoint"""
    return HealthResponse(
        status="healthy",
        opencv_version=cv2.__version__,
        backend_version=config.API_VERSION,
        method="OpenCV Detailed Stitcher with Loop Closure Detection",
        features=[
            "Loop closure detection for 360° panoramas",
            "Overlap validation between consecutive frames",
            "Plain scene handling (sky, walls)",
            "Multiple feature detectors (SIFT, ORB, AKAZE, BRISK)",
            "Configurable stitching parameters"
        ]
    )


@app.post("/api/debug-stitch", response_model=DebugResponse)
async def debug_stitch_endpoint(
    images: List[UploadFile] = File(...)
):
    """Debug endpoint that analyzes images without stitching"""
    if len(images) < config.MIN_IMAGES:
        raise HTTPException(400, f"Need at least {config.MIN_IMAGES} images")
    
    if len(images) > config.MAX_IMAGES:
        raise HTTPException(400, f"Too many images (max {config.MAX_IMAGES})")
    
    try:
        # Load images
        cv_images = []
        image_info = []
        
        for img_file in images:
            try:
                img = load_image(img_file)
                cv_images.append(img)
                image_info.append(ImageInfo(
                    filename=img_file.filename,
                    size=f"{img.shape[1]}x{img.shape[0]}"
                ))
            except Exception as e:
                raise HTTPException(400, f"Bad image '{img_file.filename}': {e}")
        
        logger.info(f"Debug analysis: {len(cv_images)} images")
        
        # Create pipeline for analysis
        pipeline = StitchingPipeline(mode="360", detector="sift")
        
        # Run loop closure detection
        loop_detected, best_matches, match_counts = pipeline.loop_closure_detector.detect_loop_closure(cv_images)
        loop_closure_info = {
            "detected": loop_detected,
            "best_match_count": best_matches,
            "match_counts": match_counts
        }
        
        # Run overlap validation
        overlap_valid, overlap_stats = pipeline.overlap_validator.validate_overlap(cv_images)
        
        # Generate recommendations
        recommendations = []
        if not loop_detected:
            recommendations.append("No loop closure detected - may not be a complete 360° sequence")
        if not overlap_valid:
            recommendations.append("Some frame pairs have insufficient overlap - consider retaking with more overlap")
        if overlap_stats.get("avg_matches", 0) < 40:
            recommendations.append("Average overlap is low - aim for 30-50% overlap between consecutive frames")
        if not recommendations:
            recommendations.append("Images look good for stitching!")
        
        return DebugResponse(
            total_images=len(cv_images),
            image_info=image_info,
            overlap_stats=overlap_stats,
            loop_closure_info=loop_closure_info,
            recommendations=recommendations
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Debug analysis error: {str(e)}", exc_info=True)
        raise HTTPException(500, f"Analysis error: {str(e)}")


@app.post("/api/stitch")
async def stitch_endpoint(
    images: List[UploadFile] = File(...),
    quality: int = Query(config.DEFAULT_JPEG_QUALITY, ge=config.MIN_QUALITY, le=config.MAX_QUALITY),
    mode: str = Query(config.DEFAULT_MODE, pattern="^(panorama|affine|360)$"),
    detector: str = Query(config.DEFAULT_DETECTOR, pattern="^(sift|orb|akaze|brisk)$"),
    max_dimension: int = Query(config.DEFAULT_MAX_DIMENSION, ge=config.MIN_MAX_DIMENSION, le=config.MAX_MAX_DIMENSION),
    confidence_threshold: float = Query(config.DEFAULT_CONFIDENCE_THRESHOLD, ge=config.MIN_CONFIDENCE, le=config.MAX_CONFIDENCE)
):
    """
    Stitch images into panorama
    
    Parameters:
    - images: 2-60 images to stitch
    - quality: JPEG quality (1-100, default: 95)
    - mode: "panorama", "affine", or "360" (default: "360")
    - detector: "sift", "orb", "akaze", or "brisk" (default: "sift")
    - max_dimension: Max image dimension 320-1280 (default: 640)
    - confidence_threshold: Matching confidence 0.01-1.0 (default: 0.3)
    """
    # Validate image count
    if len(images) < config.MIN_IMAGES:
        raise HTTPException(400, f"Need at least {config.MIN_IMAGES} images")
    
    if len(images) > config.MAX_IMAGES:
        raise HTTPException(400, f"Too many images (max {config.MAX_IMAGES})")
    
    try:
        # Load images
        cv_images = []
        for img_file in images:
            try:
                img = load_image(img_file)
                cv_images.append(img)
                logger.info(f"Loaded {img_file.filename}: {img.shape[1]}x{img.shape[0]}")
            except Exception as e:
                raise HTTPException(400, f"Bad image '{img_file.filename}': {e}")
        
        logger.info(f"Received {len(cv_images)} images for stitching")
        
        # SPEED OPTIMIZATION: Use fast stitcher for 360° mode
        if mode == "360":
            logger.info("🚀 Using FAST 360° stitcher for maximum speed")
            fast_stitcher = Fast360Stitcher(confidence_threshold=confidence_threshold)
            success, panorama, message, metadata = fast_stitcher.stitch_360_fast(cv_images)
        else:
            # Use original pipeline for other modes
            logger.info("Using standard stitching pipeline")
            pipeline = StitchingPipeline(
                mode=mode,
                detector=detector,
                max_dimension=max_dimension,
                confidence_threshold=confidence_threshold
            )
            success, panorama, message, metadata = pipeline.stitch(cv_images)
        
        if not success or panorama is None:
            raise HTTPException(500, message)
        
        # Encode to JPEG
        encode_params = [cv2.IMWRITE_JPEG_QUALITY, quality]
        ok, buffer = cv2.imencode('.jpg', panorama, encode_params)
        
        if not ok:
            raise HTTPException(500, "Failed to encode panorama")
        
        # Prepare response headers
        headers = {
            "X-Panorama-Width": str(panorama.shape[1]),
            "X-Panorama-Height": str(panorama.shape[0]),
            "X-Images-Processed": str(metadata["images_processed"]),
            "X-Stitching-Method": metadata["method"],
            "X-Status": "success",
            "X-Loop-Closure-Detected": str(metadata["loop_closure_detected"]),
            "X-Overlap-Stats": json.dumps(metadata["overlap_stats"])
        }
        
        logger.info(f"Stitching successful: {panorama.shape[1]}x{panorama.shape[0]}")
        
        return Response(
            content=buffer.tobytes(),
            media_type="image/jpeg",
            headers=headers
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Stitching error: {str(e)}", exc_info=True)
        raise HTTPException(500, f"Internal error: {str(e)}")


# ─────────────────────────────────────────────────────────────────────────────
# Server Startup
# ─────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    import argparse
    
    parser = argparse.ArgumentParser(description="Backend Try2 Server")
    parser.add_argument("--host", default=config.SERVER_HOST, help="Server host")
    parser.add_argument("--port", type=int, default=config.SERVER_PORT, help="Server port")
    args = parser.parse_args()
    
    logger.info(f"Starting Backend Try2 on {args.host}:{args.port}")
    uvicorn.run(app, host=args.host, port=args.port, log_level="info")
