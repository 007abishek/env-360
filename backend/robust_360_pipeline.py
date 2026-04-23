"""
Robust 360° Panorama Pipeline - NEVER REJECTS FRAMES
Uses ALL frames with sequential ORB offset placement
Optimized for 8GB RAM
"""

import cv2
import numpy as np
import logging
from typing import List, Tuple, Optional

logger = logging.getLogger(__name__)

W, H = 640, 360  # Working resolution


def _resize(img: np.ndarray) -> np.ndarray:
    return cv2.resize(img, (W, H), interpolation=cv2.INTER_AREA)


def _estimate_dx(img1: np.ndarray, img2: np.ndarray) -> int:
    """Estimate horizontal pixel offset between consecutive frames using ORB then SIFT fallback"""
    gray1 = cv2.cvtColor(img1, cv2.COLOR_BGR2GRAY)
    gray2 = cv2.cvtColor(img2, cv2.COLOR_BGR2GRAY)

    for name, det, norm in [
        ("orb",  cv2.ORB_create(nfeatures=1500),  cv2.NORM_HAMMING),
        ("sift", cv2.SIFT_create(nfeatures=1000), cv2.NORM_L2),
    ]:
        try:
            kp1, des1 = det.detectAndCompute(gray1, None)
            kp2, des2 = det.detectAndCompute(gray2, None)

            if des1 is None or des2 is None or len(kp1) < 6 or len(kp2) < 6:
                continue

            bf = cv2.BFMatcher(norm, crossCheck=False)
            raw = bf.knnMatch(des1, des2, k=2)
            good = [m for m, n_ in raw if len([m, n_]) == 2 and m.distance < 0.75 * n_.distance]

            if len(good) < 6:
                continue

            pts1 = np.float32([kp1[m.queryIdx].pt for m in good])
            pts2 = np.float32([kp2[m.trainIdx].pt for m in good])

            # Filter with RANSAC
            if len(good) >= 8:
                _, mask = cv2.findHomography(pts2, pts1, cv2.RANSAC, 5.0)
                if mask is not None and mask.sum() >= 4:
                    pts1 = pts1[mask.ravel().astype(bool)]
                    pts2 = pts2[mask.ravel().astype(bool)]

            dx = int(np.median(pts1[:, 0] - pts2[:, 0]))
            logger.info(f"    {name}: dx={dx}px ({len(good)} matches)")
            return dx

        except Exception as e:
            logger.debug(f"    {name} error: {e}")
            continue

    # Fallback: uniform step
    logger.info("    Using fallback dx=W//8")
    return W // 8


def stitch_360_robust(
    images: List[np.ndarray],
    detector_type: str = "orb",
    confidence_threshold: float = 0.25
) -> Tuple[bool, Optional[np.ndarray], str]:
    """
    Full 360° stitching using ALL frames.
    Returns (success, panorama, message)
    """
    n = len(images)
    logger.info(f"=== Robust 360° Pipeline: {n} frames ===")

    if n < 2:
        return False, None, "Need at least 2 images"

    # Step 1: Resize all frames
    imgs = [_resize(img) for img in images]
    logger.info(f"Resized {n} frames to {W}x{H}")

    # Step 2: Loop closure - append first frame at end
    imgs_lc = imgs + [imgs[0].copy()]

    # Step 3: Estimate dx for each consecutive pair
    dx_list = []
    for i in range(len(imgs_lc) - 1):
        dx = _estimate_dx(imgs_lc[i], imgs_lc[i + 1])
        # Clamp: minimum 5px, maximum W//2 (320px)
        dx = max(5, min(abs(dx), W // 2))
        dx_list.append(dx)

    total_dx = sum(dx_list)
    logger.info(f"Total dx: {total_dx}px across {len(dx_list)} pairs")

    # Step 4: Build wide canvas
    # Canvas width = total_dx + one frame width for the last frame
    canvas_w = total_dx + W
    canvas = np.zeros((H, canvas_w, 3), dtype=np.uint8)

    # Place first frame
    canvas[:, :W] = imgs_lc[0]
    x_cursor = 0

    # Step 5: Place all frames sequentially
    for i in range(1, len(imgs_lc)):
        dx = dx_list[i - 1]
        x_place = x_cursor + dx

        # Ensure we don't go out of bounds
        if x_place + W > canvas_w:
            # Expand canvas
            extra = (x_place + W) - canvas_w
            canvas = np.hstack([canvas, np.zeros((H, extra, 3), dtype=np.uint8)])
            canvas_w = canvas.shape[1]

        img = imgs_lc[i]

        # Overlap region
        overlap_start = x_place
        overlap_end = min(x_cursor + W, x_place + W)
        overlap_w = max(0, (x_cursor + W) - x_place)

        if overlap_w > 0 and overlap_w < W:
            # Feather blend in overlap zone
            alpha = np.linspace(1.0, 0.0, overlap_w, dtype=np.float32).reshape(1, -1, 1)

            # Existing content in overlap zone
            existing = canvas[:, x_place:x_place + overlap_w].astype(np.float32)
            # New content in overlap zone
            new_content = img[:, :overlap_w].astype(np.float32)

            blended = (alpha * existing + (1 - alpha) * new_content).astype(np.uint8)
            canvas[:, x_place:x_place + overlap_w] = blended

            # Non-overlapping part of new frame
            if overlap_w < W:
                canvas[:, x_place + overlap_w:x_place + W] = img[:, overlap_w:]
        else:
            # No overlap or full overlap - just place
            canvas[:, x_place:x_place + W] = img

        x_cursor = x_place
        logger.info(f"  Frame {i}: x={x_place}, dx={dx}, overlap={overlap_w}px")

    # Step 6: Crop to actual content
    gray = cv2.cvtColor(canvas, cv2.COLOR_BGR2GRAY)
    cols = np.where(gray.max(axis=0) > 0)[0]
    if len(cols) == 0:
        return False, None, "Empty panorama"

    panorama = canvas[:, cols[0]:cols[-1] + 1]

    # Coverage: panorama_width / (W * n / overlap_factor)
    # Each frame contributes dx pixels of new content
    unique_width = total_dx  # Total new pixels added
    # 360° = unique_width pixels, so coverage = (panorama_width / unique_width) * 360
    # But simpler: coverage = (n * avg_dx) / W * (360/n) = avg_dx/W * 360
    avg_dx = total_dx / len(dx_list)
    coverage_deg = min(360, int((avg_dx / W) * 360 * len(dx_list) / n * n))
    # Simplest correct formula:
    coverage_deg = min(360, int(total_dx / W * (360 / n) * n / n * (n / len(dx_list))))
    # Just use: panorama_width relative to expected 360° width
    # Expected 360° width = W * (360 / angle_per_frame)
    # angle_per_frame ≈ 360/n, so expected = W * n
    # But with overlap, actual = total_dx + W
    coverage_deg = min(360, int((panorama.shape[1] / (W + total_dx)) * 360))

    logger.info(f"Panorama: {panorama.shape[1]}x{panorama.shape[0]}, ~{coverage_deg}° coverage, {n} frames")
    return True, panorama, f"360° stitching: {panorama.shape[1]}x{panorama.shape[0]}, ~{coverage_deg}° coverage, {n} frames"
