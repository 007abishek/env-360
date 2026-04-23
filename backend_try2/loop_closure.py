"""
Loop Closure Detection
Detects 360° loop completion by matching first and last frames
"""

import cv2
import numpy as np
from typing import Tuple, List
import logging
from feature_detector import FeatureDetectorWrapper

logger = logging.getLogger(__name__)


class LoopClosureDetector:
    """Detects loop closure for 360° panoramas"""
    
    def __init__(
        self,
        detector_type: str = "sift",
        match_threshold: int = 30,
        ratio_test: float = 0.7
    ):
        """
        Initialize loop closure detector
        
        Args:
            detector_type: Feature detector type ("sift", "orb", "akaze", "brisk")
            match_threshold: Minimum matches to declare loop closure (default: 30)
            ratio_test: Lowe's ratio test threshold (default: 0.7)
        """
        self.detector_type = detector_type
        self.match_threshold = match_threshold
        self.ratio_test = ratio_test
        self.feature_detector = FeatureDetectorWrapper(detector_type)
        
        logger.info(
            f"Initialized loop closure detector: "
            f"detector={detector_type}, threshold={match_threshold}, ratio={ratio_test}"
        )
    
    def detect_loop_closure(
        self,
        images: List[np.ndarray]
    ) -> Tuple[bool, int, List[int]]:
        """
        Detect if first and last frames form a loop
        
        Args:
            images: Sequence of images
        
        Returns:
            loop_detected: Boolean indicating loop closure
            best_match_count: Number of matches with best frame
            match_counts: List of match counts for last N frames
        """
        if len(images) < 6:
            logger.info("Too few images for loop closure detection")
            return False, 0, []
        
        # Extract features from first frame
        first_frame = images[0]
        kp1, desc1 = self.feature_detector.detect_and_compute(first_frame)
        
        if desc1 is None or len(kp1) == 0:
            logger.warning("No features detected in first frame")
            return False, 0, []
        
        # Get matcher
        matcher = self.feature_detector.get_matcher()
        
        # Check last 5 frames
        frames_to_check = min(5, len(images) - 1)
        match_counts = []
        best_match_count = 0
        best_frame_idx = -1
        
        logger.info("Loop closure detection:")
        
        for i in range(frames_to_check):
            frame_idx = len(images) - frames_to_check + i
            frame = images[frame_idx]
            
            # Extract features from this frame
            kp2, desc2 = self.feature_detector.detect_and_compute(frame)
            
            if desc2 is None or len(kp2) == 0:
                match_counts.append(0)
                logger.info(f"  Frame 0 vs Frame {frame_idx}: 0 matches (no features)")
                continue
            
            # Match features
            matches = matcher.knnMatch(desc1, desc2, k=2)
            
            # Apply Lowe's ratio test
            good_matches = []
            for match_pair in matches:
                if len(match_pair) == 2:
                    m, n = match_pair
                    if m.distance < self.ratio_test * n.distance:
                        good_matches.append(m)
            
            match_count = len(good_matches)
            match_counts.append(match_count)
            
            # Track best match
            if match_count > best_match_count:
                best_match_count = match_count
                best_frame_idx = frame_idx
            
            # Log with indicator for best match
            indicator = " ← BEST" if frame_idx == best_frame_idx and i == frames_to_check - 1 else ""
            logger.info(f"  Frame 0 vs Frame {frame_idx}: {match_count} matches{indicator}")
        
        # Determine if loop closure detected
        loop_detected = best_match_count >= self.match_threshold
        
        if loop_detected:
            logger.info(f"✓ Loop closure detected ({best_match_count} matches)")
        else:
            logger.info(f"✗ No loop closure detected (best: {best_match_count} matches, threshold: {self.match_threshold})")
        
        return loop_detected, best_match_count, match_counts
