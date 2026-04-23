"""
Feature Detection Wrapper
Provides unified interface for multiple feature detectors (SIFT, ORB, AKAZE, BRISK)
"""

import cv2
import numpy as np
from typing import Tuple, List
import logging

logger = logging.getLogger(__name__)


class FeatureDetectorWrapper:
    """Wrapper for OpenCV feature detectors with unified interface"""
    
    def __init__(self, detector_type: str = "sift", nfeatures: int = 500):
        """
        Initialize feature detector
        
        Args:
            detector_type: Type of detector ("sift", "orb", "akaze", "brisk")
            nfeatures: Maximum number of features to detect
        """
        self.detector_type = detector_type.lower()
        self.nfeatures = nfeatures
        
        # Create detector based on type
        if self.detector_type == "sift":
            self.detector = cv2.SIFT_create(nfeatures=nfeatures)
            self.norm_type = cv2.NORM_L2
        elif self.detector_type == "orb":
            self.detector = cv2.ORB_create(nfeatures=nfeatures)
            self.norm_type = cv2.NORM_HAMMING
        elif self.detector_type == "akaze":
            self.detector = cv2.AKAZE_create()
            self.norm_type = cv2.NORM_HAMMING
        elif self.detector_type == "brisk":
            self.detector = cv2.BRISK_create()
            self.norm_type = cv2.NORM_HAMMING
        else:
            raise ValueError(f"Unsupported detector type: {detector_type}")
        
        logger.info(f"Initialized {self.detector_type.upper()} detector with {nfeatures} features")
    
    def detect_and_compute(self, image: np.ndarray) -> Tuple[List[cv2.KeyPoint], np.ndarray]:
        """
        Detect keypoints and compute descriptors
        
        Args:
            image: Input image (BGR or grayscale)
        
        Returns:
            keypoints: List of detected keypoints
            descriptors: Array of descriptors (None if no keypoints found)
        """
        # Convert to grayscale if needed
        if len(image.shape) == 3:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        else:
            gray = image
        
        # Detect and compute
        keypoints, descriptors = self.detector.detectAndCompute(gray, None)
        
        return keypoints, descriptors
    
    def get_matcher(self) -> cv2.BFMatcher:
        """
        Get appropriate matcher for this detector type
        
        Returns:
            BFMatcher configured for this detector's descriptor type
        """
        return cv2.BFMatcher(self.norm_type, crossCheck=False)
