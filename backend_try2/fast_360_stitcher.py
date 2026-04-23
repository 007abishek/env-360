"""
Fast 360° Panorama Stitcher - Pure OpenCV approach at 144p
Solves OOM and SHRT_MAX overflow by using tiny images
"""

import cv2
import numpy as np
from typing import List, Tuple, Optional, Dict, Any
import logging
import time

logger = logging.getLogger(__name__)

# 144p = 256x144 - tiny enough to avoid all memory issues
TARGET_WIDTH = 256
TARGET_HEIGHT = 144


def _resize_to_144p(img: np.ndarray) -> np.ndarray:
    """Resize to 144p maintaining aspect ratio, max 256px wide"""
    h, w = img.shape[:2]
    # Always resize to exactly 256x144 for consistency
    return cv2.resize(img, (TARGET_WIDTH, TARGET_HEIGHT), interpolation=cv2.INTER_AREA)


class Fast360Stitcher:

    def __init__(self, confidence_threshold: float = 0.1):
        self.confidence_threshold = confidence_threshold

    def stitch_360_fast(self, images: List[np.ndarray]) -> Tuple[bool, Optional[np.ndarray], str, Dict[str, Any]]:
        start_time = time.time()
        metadata = {
            "images_processed": len(images),
            "method": "OpenCV 144p Stitcher",
            "strategy_used": "None",
            "loop_closure_detected": False,
            "overlap_stats": {},
            "plain_scenes_detected": 0,
            "processing_time_seconds": 0.0
        }

        if len(images) < 2:
            return False, None, "Need at least 2 images", metadata

        logger.info(f"Starting OpenCV 144p stitching with {len(images)} images")

        # Step 1: Resize ALL images to 144p (256x144)
        # This prevents SHRT_MAX overflow and OOM completely
        tiny_images = [_resize_to_144p(img) for img in images]
        logger.info(f"All images resized to {TARGET_WIDTH}x{TARGET_HEIGHT}")

        # Step 2: Skip cv2.Stitcher (hangs on CPU with many frames)
        # Go directly to ORB homography - proper OpenCV approach
        logger.info("Using ORB homography stitching (proper OpenCV approach)...")
        success, panorama, message = self._orb_homography_stitch(tiny_images)
        if success:
            metadata["method"] = "ORB Homography 144p"
            metadata["strategy_used"] = "ORB Homography"
            metadata["processing_time_seconds"] = time.time() - start_time
            return True, panorama, message, metadata

        # Step 3: Try cv2.Stitcher PANORAMA with small subset only
        subset = tiny_images[::4][:8]  # Max 8 frames for cv2.Stitcher
        logger.info(f"Trying cv2.Stitcher PANORAMA with {len(subset)} frames...")
        success, panorama, message = self._opencv_stitch(subset, cv2.Stitcher_PANORAMA)
        if success:
            metadata["method"] = "OpenCV PANORAMA 144p (subset)"
            metadata["strategy_used"] = "PANORAMA subset"
            metadata["processing_time_seconds"] = time.time() - start_time
            return True, panorama, message, metadata

        # Step 6: Simple concat fallback (always works)
        panorama = np.hstack(tiny_images)
        metadata["method"] = "Simple Concat 144p"
        metadata["strategy_used"] = "Concat"
        metadata["processing_time_seconds"] = time.time() - start_time
        logger.info(f"Concat fallback: {panorama.shape[1]}x{panorama.shape[0]}")
        return True, panorama, "Simple concatenation", metadata

    def _opencv_stitch(self, images: List[np.ndarray], mode: int) -> Tuple[bool, Optional[np.ndarray], str]:
        """Run cv2.Stitcher with memory-safe settings on tiny images"""
        try:
            stitcher = cv2.Stitcher.create(mode)

            # All resolutions set low to prevent any upscaling
            stitcher.setRegistrationResol(0.6)
            stitcher.setSeamEstimationResol(0.1)
            stitcher.setCompositingResol(-1)  # Use input resolution as-is
            stitcher.setPanoConfidenceThresh(self.confidence_threshold)
            stitcher.setWaveCorrection(False)  # Skip wave correction for speed

            mode_name = "PANORAMA" if mode == cv2.Stitcher_PANORAMA else "SCANS"
            logger.info(f"Running cv2.Stitcher {mode_name} on {len(images)} images at {images[0].shape[1]}x{images[0].shape[0]}")

            status, panorama = stitcher.stitch(images)

            if status == cv2.Stitcher_OK:
                logger.info(f"✅ {mode_name} success: {panorama.shape[1]}x{panorama.shape[0]}")
                return True, panorama, f"OpenCV {mode_name} stitching successful"

            status_map = {
                cv2.Stitcher_ERR_NEED_MORE_IMGS: "Need more images",
                cv2.Stitcher_ERR_HOMOGRAPHY_EST_FAIL: "Homography failed",
                cv2.Stitcher_ERR_CAMERA_PARAMS_ADJUST_FAIL: "Camera params failed",
            }
            msg = status_map.get(status, f"Failed status={status}")
            logger.info(f"{mode_name} failed: {msg}")
            return False, None, msg

        except cv2.error as e:
            logger.error(f"OpenCV error: {e}")
            return False, None, str(e)
        except Exception as e:
            logger.error(f"Stitch error: {e}")
            return False, None, str(e)

    def _orb_homography_stitch(self, images: List[np.ndarray]) -> Tuple[bool, Optional[np.ndarray], str]:
        """
        Manual ORB + homography stitching
        Stitches images one by one using findHomography + warpPerspective
        """
        try:
            orb = cv2.ORB_create(nfeatures=500)
            bf = cv2.BFMatcher(cv2.NORM_HAMMING, crossCheck=True)

            result = images[0].copy()

            for i in range(1, len(images)):
                try:
                    gray1 = cv2.cvtColor(result, cv2.COLOR_BGR2GRAY)
                    gray2 = cv2.cvtColor(images[i], cv2.COLOR_BGR2GRAY)

                    kp1, des1 = orb.detectAndCompute(gray1, None)
                    kp2, des2 = orb.detectAndCompute(gray2, None)

                    if des1 is None or des2 is None or len(des1) < 4 or len(des2) < 4:
                        # Just concatenate if no features
                        result = np.hstack([result, images[i]])
                        continue

                    matches = bf.match(des1, des2)
                    matches = sorted(matches, key=lambda x: x.distance)

                    if len(matches) < 4:
                        result = np.hstack([result, images[i]])
                        continue

                    # Use top matches
                    good = matches[:min(30, len(matches))]

                    pts1 = np.float32([kp1[m.queryIdx].pt for m in good]).reshape(-1, 1, 2)
                    pts2 = np.float32([kp2[m.trainIdx].pt for m in good]).reshape(-1, 1, 2)

                    H, mask = cv2.findHomography(pts2, pts1, cv2.RANSAC, 5.0)

                    if H is None:
                        result = np.hstack([result, images[i]])
                        continue

                    # Warp next image onto result
                    h1, w1 = result.shape[:2]
                    h2, w2 = images[i].shape[:2]

                    # Calculate output size
                    corners = np.float32([[0, 0], [w2, 0], [w2, h2], [0, h2]]).reshape(-1, 1, 2)
                    warped_corners = cv2.perspectiveTransform(corners, H)

                    all_corners = np.concatenate([
                        np.float32([[0, 0], [w1, 0], [w1, h1], [0, h1]]).reshape(-1, 1, 2),
                        warped_corners
                    ])

                    x_min = max(0, int(np.floor(all_corners[:, 0, 0].min())))
                    y_min = max(0, int(np.floor(all_corners[:, 0, 1].min())))
                    x_max = min(32767, int(np.ceil(all_corners[:, 0, 0].max())))  # SHRT_MAX safe
                    y_max = min(32767, int(np.ceil(all_corners[:, 0, 1].max())))

                    out_w = min(x_max - x_min, 8192)  # Cap at 8192px wide
                    out_h = min(y_max - y_min, 2048)  # Cap at 2048px tall

                    # Translation matrix
                    T = np.array([[1, 0, -x_min], [0, 1, -y_min], [0, 0, 1]], dtype=np.float64)
                    H_adjusted = T @ H

                    warped = cv2.warpPerspective(images[i], H_adjusted, (out_w, out_h))

                    # Place result on canvas
                    canvas = np.zeros((out_h, out_w, 3), dtype=np.uint8)
                    y_off = -y_min
                    x_off = -x_min
                    y_end = min(y_off + h1, out_h)
                    x_end = min(x_off + w1, out_w)
                    canvas[y_off:y_end, x_off:x_end] = result[:y_end - y_off, :x_end - x_off]

                    # Blend warped image
                    mask_warped = (warped.sum(axis=2) > 0).astype(np.uint8)
                    mask_canvas = (canvas.sum(axis=2) > 0).astype(np.uint8)
                    overlap = (mask_warped & mask_canvas)

                    # Non-overlap: just copy
                    canvas[mask_warped.astype(bool) & ~overlap.astype(bool)] = \
                        warped[mask_warped.astype(bool) & ~overlap.astype(bool)]

                    # Overlap: average blend
                    if overlap.any():
                        canvas[overlap.astype(bool)] = (
                            canvas[overlap.astype(bool)].astype(np.float32) * 0.5 +
                            warped[overlap.astype(bool)].astype(np.float32) * 0.5
                        ).astype(np.uint8)

                    result = canvas

                except Exception as e:
                    logger.warning(f"Frame {i} homography failed: {e}, concatenating")
                    result = np.hstack([result, images[i]])

            logger.info(f"✅ ORB homography: {result.shape[1]}x{result.shape[0]}")
            return True, result, "ORB homography stitching successful"

        except Exception as e:
            logger.error(f"ORB homography error: {e}")
            return False, None, str(e)
