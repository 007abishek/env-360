"""
Plain Scene Handler
Enhances feature detection for low-texture scenes (sky, walls, etc.)
"""

import cv2
import numpy as np
from typing import Tuple, List
import logging

logger = logging.getLogger(__name__)


class PlainSceneHandler:
    """Detects and enhances features for plain scenes"""
    
    def __init__(
        self,
        low_feature_threshold: int = 50,
        edge_threshold1: int = 50,
        edge_threshold2: int = 150,
        corner_quality: float = 0.01,
        corner_min_distance: int = 10
    ):
        """
        Initialize plain scene handler
        
        Args:
            low_feature_threshold: Threshold for detecting plain scenes (default: 50)
            edge_threshold1: Canny edge detection lower threshold (default: 50)
            edge_threshold2: Canny edge detection upper threshold (default: 150)
            corner_quality: Shi-Tomasi corner quality level (default: 0.01)
            corner_min_distance: Minimum distance between corners (default: 10)
        """
        self.low_feature_threshold = low_feature_threshold
        self.edge_threshold1 = edge_threshold1
        self.edge_threshold2 = edge_threshold2
        self.corner_quality = corner_quality
        self.corner_min_distance = corner_min_distance
        
        logger.info(
            f"Initialized plain scene handler: "
            f"threshold={low_feature_threshold}, edge=({edge_threshold1},{edge_threshold2})"
        )
    
    def detect_plain_scene(
        self,
        image: np.ndarray,
        keypoints: List[cv2.KeyPoint]
    ) -> bool:
        """
        Check if image is a plain scene (low feature count)
        
        Args:
            image: Input image
            keypoints: Detected keypoints
        
        Returns:
            True if plain scene detected
        """
        return len(keypoints) < self.low_feature_threshold
    
    def enhance_features(
        self,
        image: np.ndarray,
        keypoints: List[cv2.KeyPoint],
        descriptors: np.ndarray
    ) -> Tuple[List[cv2.KeyPoint], np.ndarray]:
        """
        Enhance features for plain scenes
        
        Args:
            image: Input image
            keypoints: Original keypoints
            descriptors: Original descriptors
        
        Returns:
            enhanced_keypoints: Original + synthetic keypoints
            enhanced_descriptors: Original + synthetic descriptors
        """
        # Convert to grayscale if needed
        if len(image.shape) == 3:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        else:
            gray = image
        
        synthetic_keypoints = []
        synthetic_descriptors = []
        
        # 1. Edge Detection (Canny)
        edges = cv2.Canny(gray, self.edge_threshold1, self.edge_threshold2)
        edge_points = np.argwhere(edges > 0)
        
        # Sample edge points (not all, to avoid too many)
        if len(edge_points) > 0:
            step = max(1, len(edge_points) // 100)  # Sample ~100 edge points
            sampled_edges = edge_points[::step]
            
            for pt in sampled_edges:
                y, x = pt
                kp = cv2.KeyPoint(float(x), float(y), 7.0)  # size=7
                synthetic_keypoints.append(kp)
        
        edge_count = len(synthetic_keypoints)
        
        # 2. Corner Detection (Shi-Tomasi)
        corners = cv2.goodFeaturesToTrack(
            gray,
            maxCorners=100,
            qualityLevel=self.corner_quality,
            minDistance=self.corner_min_distance
        )
        
        corner_count = 0
        if corners is not None:
            for corner in corners:
                x, y = corner.ravel()
                kp = cv2.KeyPoint(float(x), float(y), 7.0)
                synthetic_keypoints.append(kp)
            corner_count = len(corners)
        
        # 3. Synthesize descriptors for synthetic keypoints
        # Use SIFT to compute descriptors at synthetic keypoint locations
        sift = cv2.SIFT_create()
        if len(synthetic_keypoints) > 0:
            _, synth_desc = sift.compute(gray, synthetic_keypoints)
            if synth_desc is not None:
                synthetic_descriptors.append(synth_desc)
        
        # Combine original and synthetic features
        enhanced_keypoints = list(keypoints) + synthetic_keypoints
        
        if descriptors is not None and len(synthetic_descriptors) > 0:
            enhanced_descriptors = np.vstack([descriptors] + synthetic_descriptors)
        elif descriptors is not None:
            enhanced_descriptors = descriptors
        elif len(synthetic_descriptors) > 0:
            enhanced_descriptors = np.vstack(synthetic_descriptors)
        else:
            enhanced_descriptors = None
        
        logger.info(
            f"Plain scene enhancement: "
            f"original={len(keypoints)}, edge={edge_count}, corner={corner_count}, "
            f"total={len(enhanced_keypoints)}"
        )
        
        return enhanced_keypoints, enhanced_descriptors
