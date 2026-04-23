"""
Core Stitching Pipeline
Orchestrates the complete stitching process using OpenCV's detailed stitching approach
"""

import cv2
import numpy as np
from typing import List, Tuple, Dict, Any, Optional
import logging
import time
from feature_detector import FeatureDetectorWrapper
from loop_closure import LoopClosureDetector
from overlap_validator import OverlapValidator
from plain_scene_handler import PlainSceneHandler
import config

logger = logging.getLogger(__name__)


class StitchingPipeline:
    """Complete stitching pipeline based on OpenCV stitching_detailed.py"""
    
    def __init__(
        self,
        mode: str = "360",
        detector: str = "sift",
        max_dimension: int = 640,
        confidence_threshold: float = 0.3,
        blend_strength: int = 5
    ):
        """
        Initialize stitching pipeline
        
        Args:
            mode: Stitching mode ("panorama", "affine", "360")
            detector: Feature detector type ("sift", "orb", "akaze", "brisk")
            max_dimension: Maximum image dimension for processing
            confidence_threshold: Feature matching confidence threshold
            blend_strength: Blending strength (1-100)
        """
        self.mode = mode
        self.detector = detector
        self.max_dimension = max_dimension
        self.confidence_threshold = confidence_threshold
        self.blend_strength = blend_strength
        
        # Initialize components
        self.feature_detector = FeatureDetectorWrapper(detector)
        self.loop_closure_detector = LoopClosureDetector(detector)
        self.overlap_validator = OverlapValidator(detector)
        self.plain_scene_handler = PlainSceneHandler()
        
        # Configure warping mode
        if mode == "affine":
            self.warp_type = "plane"
        else:  # panorama or 360
            self.warp_type = "cylindrical"
        
        logger.info(
            f"Initialized stitching pipeline: "
            f"mode={mode}, detector={detector}, max_dim={max_dimension}, "
            f"confidence={confidence_threshold}, warp={self.warp_type}"
        )
    
    def _resize_images(self, images: List[np.ndarray]) -> List[np.ndarray]:
        """Resize images to max_dimension while maintaining aspect ratio"""
        resized = []
        
        for i, img in enumerate(images):
            h, w = img.shape[:2]
            max_dim = max(h, w)
            
            if max_dim > self.max_dimension:
                scale = self.max_dimension / max_dim
                new_w = int(w * scale)
                new_h = int(h * scale)
                img_resized = cv2.resize(img, (new_w, new_h), interpolation=cv2.INTER_AREA)
                logger.debug(f"Resized image {i}: {w}x{h} -> {new_w}x{new_h}")
                resized.append(img_resized)
            else:
                resized.append(img)
        
        return resized
    
    def stitch(
        self,
        images: List[np.ndarray]
    ) -> Tuple[bool, Optional[np.ndarray], str, Dict[str, Any]]:
        """
        Stitch images into panorama
        
        Args:
            images: List of input images
        
        Returns:
            success: Boolean indicating success
            panorama: Stitched image or None
            message: Status message
            metadata: Dictionary with processing statistics
        """
        start_time = time.time()
        
        metadata = {
            "images_processed": len(images),
            "loop_closure_detected": False,
            "loop_closure_matches": 0,
            "overlap_valid": False,
            "overlap_stats": {},
            "plain_scenes_detected": 0,
            "processing_time_seconds": 0.0,
            "method": f"OpenCV Detailed Stitcher ({self.detector.upper()})"
        }
        
        try:
            logger.info(f"Starting stitching pipeline with {len(images)} images")
            
            # Stage 1: Preprocessing
            logger.info("Stage 1: Preprocessing images")
            images = self._resize_images(images)
            
            # Stage 2: Loop Closure Detection (for 360 mode)
            if self.mode == "360" and config.LOOP_CLOSURE_ENABLED:
                logger.info("Stage 2: Loop closure detection")
                loop_detected, best_matches, match_counts = self.loop_closure_detector.detect_loop_closure(images)
                metadata["loop_closure_detected"] = loop_detected
                metadata["loop_closure_matches"] = best_matches
                
                # Duplicate first frame if loop detected
                if loop_detected:
                    logger.info("Duplicating first frame at end for loop closure")
                    images.append(images[0].copy())
                    metadata["images_processed"] = len(images)
            
            # Stage 3: Overlap Validation
            logger.info("Stage 3: Overlap validation")
            overlap_valid, overlap_stats = self.overlap_validator.validate_overlap(images)
            metadata["overlap_valid"] = overlap_valid
            metadata["overlap_stats"] = overlap_stats
            
            # Stage 4: Feature Detection with Plain Scene Handling
            logger.info("Stage 4: Feature detection")
            all_keypoints = []
            all_descriptors = []
            plain_scene_count = 0
            
            for i, img in enumerate(images):
                kp, desc = self.feature_detector.detect_and_compute(img)
                
                if kp is None or len(kp) == 0:
                    return False, None, f"No features detected in image {i}", metadata
                
                # Check for plain scene
                if self.plain_scene_handler.detect_plain_scene(img, kp):
                    logger.info(f"Plain scene detected in image {i} ({len(kp)} features)")
                    kp, desc = self.plain_scene_handler.enhance_features(img, kp, desc)
                    plain_scene_count += 1
                
                all_keypoints.append(kp)
                all_descriptors.append(desc)
                logger.debug(f"Image {i}: {len(kp)} features detected")
            
            metadata["plain_scenes_detected"] = plain_scene_count
            
            # Stage 5: Use OpenCV Stitcher for remaining pipeline
            # OpenCV's Stitcher handles: matching, camera estimation, bundle adjustment,
            # wave correction, warping, exposure compensation, seam finding, and blending
            logger.info("Stage 5-12: OpenCV Stitcher (matching, estimation, warping, blending)")
            
            # Create stitcher based on mode
            if self.mode == "affine":
                stitcher = cv2.Stitcher.create(cv2.Stitcher_SCANS)
            else:
                stitcher = cv2.Stitcher.create(cv2.Stitcher_PANORAMA)
            
            # Configure stitcher for better 360° results
            stitcher.setRegistrationResol(0.6)  # Resolution for feature detection
            stitcher.setSeamEstimationResol(0.1)  # Resolution for seam estimation
            stitcher.setCompositingResol(-1)  # Use original resolution for compositing
            stitcher.setPanoConfidenceThresh(self.confidence_threshold)
            
            # Enable wave correction for 360° panoramas
            if self.mode == "360":
                stitcher.setWaveCorrection(True)
            
            # Perform stitching
            status, panorama = stitcher.stitch(images)
            
            # Check status
            if status == cv2.Stitcher_OK:
                processing_time = time.time() - start_time
                metadata["processing_time_seconds"] = processing_time
                
                logger.info(
                    f"✓ Stitching successful: {panorama.shape[1]}x{panorama.shape[0]} "
                    f"in {processing_time:.2f}s"
                )
                
                return True, panorama, "Stitching successful", metadata
            
            elif status == cv2.Stitcher_ERR_NEED_MORE_IMGS:
                return False, None, "Need more images or better overlap", metadata
            elif status == cv2.Stitcher_ERR_HOMOGRAPHY_EST_FAIL:
                return False, None, "Homography estimation failed - check image overlap", metadata
            elif status == cv2.Stitcher_ERR_CAMERA_PARAMS_ADJUST_FAIL:
                return False, None, "Camera parameter adjustment failed", metadata
            else:
                return False, None, f"Stitching failed with status {status}", metadata
        
        except Exception as e:
            logger.error(f"Stitching pipeline error: {str(e)}", exc_info=True)
            return False, None, f"Pipeline error: {str(e)}", metadata
