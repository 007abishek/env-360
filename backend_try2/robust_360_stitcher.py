"""
Robust 360° Panorama Stitcher
Combines multiple fallback strategies for reliable 360° panorama creation
"""

import cv2
import numpy as np
from typing import List, Tuple, Optional, Dict, Any
import logging

logger = logging.getLogger(__name__)


class Robust360Stitcher:
    """Robust 360° stitcher with multiple fallback strategies"""
    
    def __init__(self, confidence_threshold: float = 0.1):
        self.confidence_threshold = confidence_threshold
    
    def stitch_360(
        self, 
        images: List[np.ndarray]
    ) -> Tuple[bool, Optional[np.ndarray], str, Dict[str, Any]]:
        """
        Stitch images into 360° panorama using multiple strategies
        
        Returns:
            success: Boolean indicating success
            panorama: Stitched image or None
            message: Status message
            metadata: Processing metadata
        """
        
        metadata = {
            "images_processed": len(images),
            "method": "Unknown",
            "strategy_used": "None",
            "loop_closure_detected": False,
            "overlap_stats": {},
            "plain_scenes_detected": 0,
            "processing_time_seconds": 0.0
        }
        
        if len(images) < 2:
            return False, None, "Need at least 2 images", metadata
        
        logger.info(f"Starting robust 360° stitching with {len(images)} images")
        
        # Strategy 1: OpenCV Stitcher with PANORAMA mode
        success, panorama, message = self._try_opencv_panorama(images)
        if success:
            metadata["method"] = "OpenCV Stitcher (PANORAMA)"
            metadata["strategy_used"] = "Strategy 1: OpenCV PANORAMA"
            return True, panorama, message, metadata
        
        logger.info("Strategy 1 failed, trying Strategy 2...")
        
        # Strategy 2: OpenCV Stitcher with SCANS mode
        success, panorama, message = self._try_opencv_scans(images)
        if success:
            metadata["method"] = "OpenCV Stitcher (SCANS)"
            metadata["strategy_used"] = "Strategy 2: OpenCV SCANS"
            return True, panorama, message, metadata
        
        logger.info("Strategy 2 failed, trying Strategy 3...")
        
        # Strategy 3: Manual cylindrical projection + blending
        success, panorama, message = self._try_cylindrical_manual(images)
        if success:
            metadata["method"] = "Manual Cylindrical Projection"
            metadata["strategy_used"] = "Strategy 3: Manual Cylindrical"
            return True, panorama, message, metadata
        
        logger.info("Strategy 3 failed, trying Strategy 4...")
        
        # Strategy 4: Simple horizontal concatenation (fallback)
        success, panorama, message = self._try_simple_concat(images)
        if success:
            metadata["method"] = "Simple Concatenation"
            metadata["strategy_used"] = "Strategy 4: Simple Concatenation"
            return True, panorama, message, metadata
        
        return False, None, "All stitching strategies failed", metadata
    
    def _try_opencv_panorama(self, images: List[np.ndarray]) -> Tuple[bool, Optional[np.ndarray], str]:
        """Try OpenCV Stitcher in PANORAMA mode"""
        try:
            stitcher = cv2.Stitcher.create(cv2.Stitcher_PANORAMA)
            stitcher.setPanoConfidenceThresh(self.confidence_threshold)
            
            status, panorama = stitcher.stitch(images)
            
            if status == cv2.Stitcher_OK:
                logger.info(f"✓ OpenCV PANORAMA successful: {panorama.shape[1]}x{panorama.shape[0]}")
                return True, panorama, "OpenCV PANORAMA stitching successful"
            else:
                logger.info(f"OpenCV PANORAMA failed with status {status}")
                return False, None, f"OpenCV PANORAMA failed (status {status})"
                
        except Exception as e:
            logger.error(f"OpenCV PANORAMA error: {e}")
            return False, None, f"OpenCV PANORAMA error: {e}"
    
    def _try_opencv_scans(self, images: List[np.ndarray]) -> Tuple[bool, Optional[np.ndarray], str]:
        """Try OpenCV Stitcher in SCANS mode"""
        try:
            stitcher = cv2.Stitcher.create(cv2.Stitcher_SCANS)
            stitcher.setPanoConfidenceThresh(self.confidence_threshold)
            
            status, panorama = stitcher.stitch(images)
            
            if status == cv2.Stitcher_OK:
                logger.info(f"✓ OpenCV SCANS successful: {panorama.shape[1]}x{panorama.shape[0]}")
                return True, panorama, "OpenCV SCANS stitching successful"
            else:
                logger.info(f"OpenCV SCANS failed with status {status}")
                return False, None, f"OpenCV SCANS failed (status {status})"
                
        except Exception as e:
            logger.error(f"OpenCV SCANS error: {e}")
            return False, None, f"OpenCV SCANS error: {e}"
    
    def _try_cylindrical_manual(self, images: List[np.ndarray]) -> Tuple[bool, Optional[np.ndarray], str]:
        """Try manual cylindrical projection and stitching"""
        try:
            # Estimate focal length from image dimensions
            h, w = images[0].shape[:2]
            focal_length = w * 0.7  # Rough estimate
            
            # Project images to cylindrical coordinates
            cylindrical_images = []
            for img in images:
                cyl_img = self._cylindrical_projection(img, focal_length)
                if cyl_img is not None:
                    cylindrical_images.append(cyl_img)
            
            if len(cylindrical_images) < 2:
                return False, None, "Cylindrical projection failed"
            
            # Simple horizontal stitching of cylindrical images
            panorama = self._stitch_cylindrical_images(cylindrical_images)
            
            if panorama is not None:
                logger.info(f"✓ Manual cylindrical successful: {panorama.shape[1]}x{panorama.shape[0]}")
                return True, panorama, "Manual cylindrical stitching successful"
            else:
                return False, None, "Manual cylindrical stitching failed"
                
        except Exception as e:
            logger.error(f"Manual cylindrical error: {e}")
            return False, None, f"Manual cylindrical error: {e}"
    
    def _try_simple_concat(self, images: List[np.ndarray]) -> Tuple[bool, Optional[np.ndarray], str]:
        """Simple horizontal concatenation as last resort"""
        try:
            # Resize all images to same height
            target_height = min(img.shape[0] for img in images)
            resized_images = []
            
            for img in images:
                if img.shape[0] != target_height:
                    aspect_ratio = img.shape[1] / img.shape[0]
                    target_width = int(target_height * aspect_ratio)
                    img = cv2.resize(img, (target_width, target_height))
                resized_images.append(img)
            
            # Concatenate horizontally
            panorama = np.hstack(resized_images)
            
            logger.info(f"✓ Simple concatenation: {panorama.shape[1]}x{panorama.shape[0]}")
            return True, panorama, "Simple concatenation successful"
            
        except Exception as e:
            logger.error(f"Simple concatenation error: {e}")
            return False, None, f"Simple concatenation error: {e}"
    
    def _cylindrical_projection(self, img: np.ndarray, focal_length: float) -> Optional[np.ndarray]:
        """Project image to cylindrical coordinates"""
        try:
            h, w = img.shape[:2]
            
            # Create coordinate matrices
            x, y = np.meshgrid(np.arange(w), np.arange(h))
            
            # Convert to cylindrical coordinates
            x_c = x - w / 2
            y_c = y - h / 2
            
            # Cylindrical projection
            theta = x_c / focal_length
            h_cyl = y_c / np.sqrt(x_c**2 + focal_length**2) * focal_length
            
            # Convert back to image coordinates
            x_new = theta * focal_length + w / 2
            y_new = h_cyl + h / 2
            
            # Remap image
            map_x = x_new.astype(np.float32)
            map_y = y_new.astype(np.float32)
            
            cylindrical_img = cv2.remap(img, map_x, map_y, cv2.INTER_LINEAR)
            
            return cylindrical_img
            
        except Exception as e:
            logger.error(f"Cylindrical projection error: {e}")
            return None
    
    def _stitch_cylindrical_images(self, images: List[np.ndarray]) -> Optional[np.ndarray]:
        """Stitch cylindrical images with simple overlap blending"""
        try:
            if len(images) == 1:
                return images[0]
            
            result = images[0]
            
            for i in range(1, len(images)):
                next_img = images[i]
                
                # Simple side-by-side placement with overlap blending
                overlap_width = min(result.shape[1] // 4, next_img.shape[1] // 4, 100)
                
                # Create new canvas
                new_width = result.shape[1] + next_img.shape[1] - overlap_width
                new_height = max(result.shape[0], next_img.shape[0])
                
                canvas = np.zeros((new_height, new_width, 3), dtype=np.uint8)
                
                # Place first image
                canvas[:result.shape[0], :result.shape[1]] = result
                
                # Place second image with blending in overlap region
                start_x = result.shape[1] - overlap_width
                
                # Simple alpha blending in overlap region
                for x in range(overlap_width):
                    alpha = x / overlap_width
                    blend_x = start_x + x
                    
                    if blend_x < result.shape[1] and x < next_img.shape[1]:
                        canvas[:next_img.shape[0], blend_x] = (
                            (1 - alpha) * canvas[:next_img.shape[0], blend_x] +
                            alpha * next_img[:, x]
                        ).astype(np.uint8)
                
                # Place non-overlapping part of second image
                if overlap_width < next_img.shape[1]:
                    end_x = start_x + next_img.shape[1]
                    canvas[:next_img.shape[0], start_x + overlap_width:end_x] = \
                        next_img[:, overlap_width:]
                
                result = canvas
            
            return result
            
        except Exception as e:
            logger.error(f"Cylindrical stitching error: {e}")
            return None