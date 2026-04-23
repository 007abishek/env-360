"""
Overlap Validation
Validates sufficient overlap between consecutive frames
"""

import cv2
import numpy as np
from typing import Tuple, List, Dict, Any
import logging
from feature_detector import FeatureDetectorWrapper

logger = logging.getLogger(__name__)


class OverlapValidator:
    """Validates overlap between consecutive frames"""
    
    def __init__(
        self,
        detector_type: str = "sift",
        min_overlap_matches: int = 20,
        warning_threshold: int = 30
    ):
        """
        Initialize overlap validator
        
        Args:
            detector_type: Feature detector type ("sift", "orb", "akaze", "brisk")
            min_overlap_matches: Minimum matches for valid overlap (default: 20)
            warning_threshold: Threshold for warning about low overlap (default: 30)
        """
        self.detector_type = detector_type
        self.min_overlap_matches = min_overlap_matches
        self.warning_threshold = warning_threshold
        self.feature_detector = FeatureDetectorWrapper(detector_type)
        
        logger.info(
            f"Initialized overlap validator: "
            f"detector={detector_type}, min={min_overlap_matches}, warning={warning_threshold}"
        )
    
    def validate_overlap(
        self,
        images: List[np.ndarray]
    ) -> Tuple[bool, Dict[str, Any]]:
        """
        Validate overlap between consecutive frames
        
        Args:
            images: Sequence of images
        
        Returns:
            all_valid: Boolean indicating all pairs have sufficient overlap
            statistics: Dictionary with overlap statistics
        """
        if len(images) < 2:
            return True, {"total_pairs": 0, "valid_pairs": 0, "invalid_pairs": 0}
        
        matcher = self.feature_detector.get_matcher()
        
        total_pairs = len(images) - 1
        valid_pairs = 0
        invalid_pairs = 0
        match_counts = []
        warnings = []
        
        logger.info(f"Validating overlap for {total_pairs} consecutive pairs:")
        
        for i in range(len(images) - 1):
            # Extract features from both frames
            kp1, desc1 = self.feature_detector.detect_and_compute(images[i])
            kp2, desc2 = self.feature_detector.detect_and_compute(images[i + 1])
            
            if desc1 is None or desc2 is None or len(kp1) == 0 or len(kp2) == 0:
                match_count = 0
                invalid_pairs += 1
                logger.warning(f"  Pair {i}-{i+1}: 0 matches (no features detected)")
                warnings.append({
                    "pair": f"frame_{i} -> frame_{i+1}",
                    "matches": 0,
                    "reason": "no_features"
                })
                match_counts.append(0)
                continue
            
            # Match features
            matches = matcher.knnMatch(desc1, desc2, k=2)
            
            # Apply Lowe's ratio test
            good_matches = []
            for match_pair in matches:
                if len(match_pair) == 2:
                    m, n = match_pair
                    if m.distance < 0.7 * n.distance:
                        good_matches.append(m)
            
            match_count = len(good_matches)
            match_counts.append(match_count)
            
            # Check validity
            if match_count < self.min_overlap_matches:
                invalid_pairs += 1
                logger.warning(f"  Pair {i}-{i+1}: {match_count} matches ✗ INVALID (< {self.min_overlap_matches})")
                warnings.append({
                    "pair": f"frame_{i} -> frame_{i+1}",
                    "matches": match_count,
                    "reason": "insufficient_overlap"
                })
            elif match_count < self.warning_threshold:
                valid_pairs += 1
                logger.warning(f"  Pair {i}-{i+1}: {match_count} matches ⚠ LOW (< {self.warning_threshold})")
                warnings.append({
                    "pair": f"frame_{i} -> frame_{i+1}",
                    "matches": match_count,
                    "reason": "low_overlap"
                })
            else:
                valid_pairs += 1
                logger.info(f"  Pair {i}-{i+1}: {match_count} matches ✓")
        
        # Compute statistics
        all_valid = invalid_pairs == 0
        
        statistics = {
            "total_pairs": total_pairs,
            "valid_pairs": valid_pairs,
            "invalid_pairs": invalid_pairs,
            "min_matches": min(match_counts) if match_counts else 0,
            "max_matches": max(match_counts) if match_counts else 0,
            "avg_matches": sum(match_counts) / len(match_counts) if match_counts else 0,
            "warnings": warnings
        }
        
        if all_valid:
            logger.info(f"✓ All pairs have sufficient overlap (min: {statistics['min_matches']}, avg: {statistics['avg_matches']:.1f})")
        else:
            logger.warning(f"✗ {invalid_pairs} pairs have insufficient overlap")
        
        return all_valid, statistics
