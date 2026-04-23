"""
Configuration and constants for backend_try2
"""

# Server Configuration
SERVER_HOST = "0.0.0.0"
SERVER_PORT = 8001  # Different from try1 (8000)
API_VERSION = "1.0.0"
BACKEND_NAME = "backend_try2"

# Stitching Configuration
DEFAULT_MODE = "360"
DEFAULT_DETECTOR = "sift"
DEFAULT_MAX_DIMENSION = 640
DEFAULT_CONFIDENCE_THRESHOLD = 0.1
DEFAULT_BLEND_STRENGTH = 5
DEFAULT_JPEG_QUALITY = 92

# Loop Closure Configuration
LOOP_CLOSURE_ENABLED = True
LOOP_CLOSURE_MATCH_THRESHOLD = 20  # Lower threshold for more matches
LOOP_CLOSURE_FRAMES_TO_CHECK = 5
LOOP_CLOSURE_RATIO_TEST = 0.8  # More permissive ratio test

# Overlap Validation Configuration
OVERLAP_MIN_MATCHES = 15  # Lower minimum for more permissive matching
OVERLAP_WARNING_THRESHOLD = 25

# Plain Scene Configuration
PLAIN_SCENE_THRESHOLD = 50
EDGE_THRESHOLD_LOW = 50
EDGE_THRESHOLD_HIGH = 150
CORNER_QUALITY_LEVEL = 0.01
CORNER_MIN_DISTANCE = 10

# Processing Limits
MIN_IMAGES = 2
MAX_IMAGES = 60
MIN_MAX_DIMENSION = 320
MAX_MAX_DIMENSION = 1280
MIN_QUALITY = 1
MAX_QUALITY = 100
MIN_CONFIDENCE = 0.01
MAX_CONFIDENCE = 1.0

# Warping Modes
WARP_MODES = {
    "panorama": "cylindrical",
    "affine": "plane",
    "360": "cylindrical"
}

# Feature Detector Configuration
DETECTOR_CONFIGS = {
    "sift": {
        "nfeatures": 500,
        "norm_type": "NORM_L2",
        "cross_check": False
    },
    "orb": {
        "nfeatures": 1000,
        "norm_type": "NORM_HAMMING",
        "cross_check": False
    },
    "akaze": {
        "norm_type": "NORM_HAMMING",
        "cross_check": False
    },
    "brisk": {
        "norm_type": "NORM_HAMMING",
        "cross_check": False
    }
}
