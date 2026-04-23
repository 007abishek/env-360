"""
OpenStitching-based panorama stitcher
Uses the 'stitching' package which is a robust wrapper around OpenCV's stitching module
Provides better API, error handling, and intermediate result visualization
"""
import cv2
import numpy as np
from typing import List, Tuple, Optional
import logging
from stitching import Stitcher, AffineStitcher
from stitching.images import Images

logger = logging.getLogger(__name__)


def openstitching_stitch(
    images: List[np.ndarray],
    mode: str = "panorama",
    detector: str = "sift",
    confidence_threshold: float = 0.5,
    max_dimension: int = 640
) -> Tuple[bool, Optional[np.ndarray], str]:
    """
    Stitch images using OpenStitching library.
    
    Args:
        images: List of BGR images
        mode: "panorama" for 360° or "affine" for planar scenes
        detector: "sift", "orb", "akaze", "brisk"
        confidence_threshold: Lower = more lenient (0.2-1.0)
        max_dimension: Max image dimension for memory optimization
        
    Returns:
        (success, panorama, message)
    """
    n = len(images)
    logger.info(f"OpenStitching: {n} images, mode={mode}, detector={detector}")
    
    # Step 1: Resize for memory efficiency
    resized = []
    for i, img in enumerate(images):
        h, w = img.shape[:2]
        if max(h, w) > max_dimension:
            scale = max_dimension / max(h, w)
            new_w, new_h = int(w * scale), int(h * scale)
            img = cv2.resize(img, (new_w, new_h), interpolation=cv2.INTER_AREA)
        resized.append(img)
        logger.info(f"  Image {i+1}: {img.shape[1]}x{img.shape[0]}")
    
    # Step 2: Create stitcher with settings
    try:
        if mode == "affine":
            stitcher = AffineStitcher(
                detector=detector,
                confidence_threshold=confidence_threshold,
                crop=True,  # Auto-crop black borders
                compensator="gain_blocks",  # Better color correction
                finder="dp_color",  # Better seam finding
                blender_type="multiband",  # High-quality blending
            )
        else:
            stitcher = Stitcher(
                detector=detector,
                confidence_threshold=confidence_threshold,
                crop=True,
                compensator="gain_blocks",
                finder="dp_color",
                blender_type="multiband",
                wave_correct_kind="horiz",  # Wave correction for panoramas
            )
        
        logger.info("  Stitching...")
        panorama = stitcher.stitch(resized)
        
        if panorama is None or panorama.size == 0:
            return False, None, "Stitching failed: empty result"
        
        logger.info(f"✓ Success: {panorama.shape[1]}x{panorama.shape[0]}")
        return True, panorama, f"OpenStitching {mode} ({n} frames)"
        
    except Exception as e:
        error_msg = str(e)
        logger.error(f"  OpenStitching error: {error_msg}")
        
        # Provide helpful error messages
        if "not enough matches" in error_msg.lower() or "confidence" in error_msg.lower():
            return False, None, "Insufficient overlap between images. Try: 1) More overlap (30-50%), 2) Better lighting, 3) Avoid motion blur"
        elif "memory" in error_msg.lower():
            return False, None, "Memory error. Images are too large - try reducing resolution"
        else:
            return False, None, f"Stitching error: {error_msg}"


def openstitching_stitch_with_fallback(
    images: List[np.ndarray],
    max_dimension: int = 640
) -> Tuple[bool, Optional[np.ndarray], str]:
    """
    Try multiple stitching strategies with fallback.
    
    Strategy order:
    1. PANORAMA mode with SIFT (best quality)
    2. PANORAMA mode with ORB (faster, more robust)
    3. AFFINE mode with SIFT (for planar scenes)
    4. AFFINE mode with ORB (last resort)
    """
    strategies = [
        ("panorama", "sift", 0.5, "PANORAMA+SIFT (best quality)"),
        ("panorama", "orb", 0.3, "PANORAMA+ORB (robust)"),
        ("affine", "sift", 0.5, "AFFINE+SIFT (planar)"),
        ("affine", "orb", 0.3, "AFFINE+ORB (fallback)"),
    ]
    
    for mode, detector, conf, desc in strategies:
        logger.info(f"Trying: {desc}")
        success, pano, msg = openstitching_stitch(
            images, 
            mode=mode, 
            detector=detector,
            confidence_threshold=conf,
            max_dimension=max_dimension
        )
        
        if success:
            return True, pano, f"{desc} - {msg}"
    
    return False, None, "All stitching strategies failed. Check image overlap and quality."


def openstitching_stitch_verbose(
    images: List[np.ndarray],
    output_dir: str = "stitching_debug",
    max_dimension: int = 640
) -> Tuple[bool, Optional[np.ndarray], str, dict]:
    """
    Stitch with verbose output for debugging.
    Saves intermediate results to output_dir.
    
    Returns:
        (success, panorama, message, debug_info)
    """
    import os
    os.makedirs(output_dir, exist_ok=True)
    
    n = len(images)
    logger.info(f"OpenStitching verbose: {n} images")
    
    # Resize
    resized = []
    for i, img in enumerate(images):
        h, w = img.shape[:2]
        if max(h, w) > max_dimension:
            scale = max_dimension / max(h, w)
            new_w, new_h = int(w * scale), int(h * scale)
            img = cv2.resize(img, (new_w, new_h), interpolation=cv2.INTER_AREA)
        resized.append(img)
    
    try:
        stitcher = Stitcher(
            detector="sift",
            confidence_threshold=0.5,
            crop=True,
            compensator="gain_blocks",
            finder="dp_color",
            blender_type="multiband",
            wave_correct_kind="horiz",
        )
        
        # Use stitch_verbose to get intermediate results
        panorama = stitcher.stitch(resized)
        
        # Save debug images if available
        debug_info = {
            "num_images": n,
            "detector": "sift",
            "success": panorama is not None
        }
        
        if panorama is not None:
            cv2.imwrite(os.path.join(output_dir, "panorama.jpg"), panorama)
            logger.info(f"✓ Saved debug results to {output_dir}")
            return True, panorama, "OpenStitching verbose", debug_info
        else:
            return False, None, "Stitching failed", debug_info
            
    except Exception as e:
        logger.error(f"Verbose stitching error: {e}")
        return False, None, str(e), {"error": str(e)}
