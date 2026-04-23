# Backend Try2 - OpenCV Detailed Stitcher

Advanced 360° panorama stitching backend based on OpenCV's `stitching_detailed.py` sample.

## Key Features

- **Loop Closure Detection**: Automatically detects 360° completion by matching first and last frames
- **Overlap Validation**: Verifies sufficient overlap between consecutive frames
- **Plain Scene Handling**: Processes low-texture scenes (sky, walls) with enhanced feature detection
- **Multiple Feature Detectors**: SIFT, ORB, AKAZE, BRISK support
- **FastAPI Integration**: HTTP API compatible with existing frontend
- **Configurable Pipeline**: Flexible parameters for different scenarios

## Setup Instructions

### 1. Create Virtual Environment

```bash
cd backend_try2
python -m venv venv
```

### 2. Activate Virtual Environment

**Windows:**
```bash
venv\Scripts\activate
```

**Linux/Mac:**
```bash
source venv/bin/activate
```

### 3. Install Dependencies

```bash
pip install -r requirements.txt
```

### 4. Run Server

```bash
python main.py
```

The server will start on `http://0.0.0.0:8001`

## API Endpoints

### GET /api/health

Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "opencv_version": "4.8.1",
  "backend_version": "1.0.0",
  "method": "OpenCV Detailed Stitcher",
  "features": [
    "Loop closure detection",
    "Overlap validation",
    "Plain scene handling",
    "Multiple feature detectors"
  ]
}
```

### POST /api/stitch

Stitch images into panorama.

**Parameters:**
- `images`: Multiple image files (multipart/form-data)
- `quality`: JPEG quality 1-100 (default: 95)
- `mode`: "panorama", "affine", or "360" (default: "360")
- `detector`: "sift", "orb", "akaze", or "brisk" (default: "sift")
- `max_dimension`: Max image dimension 320-1280 (default: 640)
- `confidence_threshold`: Matching confidence 0.01-1.0 (default: 0.3)

**Response Headers:**
- `X-Panorama-Width`: Output width in pixels
- `X-Panorama-Height`: Output height in pixels
- `X-Images-Processed`: Number of images used
- `X-Stitching-Method`: Method description
- `X-Status`: Success/failure status
- `X-Loop-Closure-Detected`: Boolean indicating loop closure
- `X-Overlap-Stats`: JSON with overlap statistics

**Example using curl:**
```bash
curl -X POST http://localhost:8001/api/stitch \
  -F "images=@frame_001.jpg" \
  -F "images=@frame_002.jpg" \
  -F "images=@frame_003.jpg" \
  -F "quality=95" \
  -F "mode=360" \
  -F "detector=sift" \
  -o panorama.jpg
```

### POST /api/debug-stitch

Analyze images without stitching.

**Parameters:**
- `images`: Multiple image files (multipart/form-data)

**Response:**
```json
{
  "total_images": 18,
  "image_info": [...],
  "overlap_stats": {...},
  "loop_closure_info": {...},
  "recommendations": [...]
}
```

## Configuration Parameters

### Mode
- `panorama`: Cylindrical warping for standard panoramas
- `affine`: Planar warping for flat scenes
- `360`: Full 360° with loop closure detection (recommended)

### Detector
- `sift`: Best quality, scale-invariant (default, recommended)
- `orb`: Fast, binary descriptors
- `akaze`: Good balance of speed and quality
- `brisk`: Fast, rotation-invariant

### Max Dimension
- Controls image resizing for performance
- Lower values = faster processing, lower quality
- Higher values = slower processing, higher quality
- Recommended: 640 for good balance

### Confidence Threshold
- Controls feature matching strictness
- Lower values = more frames included, may include false matches
- Higher values = fewer frames included, more reliable matches
- Recommended: 0.3 for 360° panoramas

## Troubleshooting

### Stitching Fails
- Check overlap between consecutive frames (30-50% recommended)
- Try different detector (SIFT usually best)
- Adjust confidence_threshold (lower = more lenient)
- Check logs for specific error messages

### Poor Quality Output
- Increase max_dimension (try 1280)
- Use SIFT detector for best quality
- Ensure good lighting and overlap in source images

### Slow Performance
- Decrease max_dimension (try 320)
- Use ORB detector for speed
- Reduce number of input images

## Differences from Backend Try1

| Feature | Try1 | Try2 |
|---------|------|------|
| Port | 8000 | 8001 |
| Loop Closure | No | Yes |
| Overlap Validation | No | Yes |
| Plain Scene Handling | No | Yes |
| Feature Detectors | Limited | SIFT/ORB/AKAZE/BRISK |
| Configuration | Basic | Advanced |

## Testing

Test with sample images:
```bash
# Test with 24-frame sequence
python test_24_frames.py

# Test with 36-frame sequence
python test_36_frames.py

# Test debug endpoint
python test_debug.py
```

## Architecture

```
backend_try2/
├── main.py                    # FastAPI server
├── stitching_pipeline.py      # Core stitching orchestration
├── loop_closure.py            # Loop closure detection
├── overlap_validator.py       # Overlap validation
├── plain_scene_handler.py     # Plain scene handling
├── feature_detector.py        # Feature detection wrapper
├── config.py                  # Configuration constants
├── requirements.txt           # Dependencies
└── README.md                  # This file
```

## License

Same as parent project.
