# Python Panorama Stitching Backend

Professional panorama stitching using full OpenCV Python (imgalign-style approach).

## Features

- ✅ **SIFT/ORB Feature Detection** - Best quality feature matching
- ✅ **Bundle Adjustment** - Global camera parameter optimization
- ✅ **Wave Correction** - Straightens panoramas
- ✅ **Graph-Cut Seam Finding** - Optimal seam paths
- ✅ **Multiband Blending** - Seamless transitions
- ✅ **Exposure Compensation** - Balanced lighting
- ✅ **Cylindrical Projection** - Natural panorama warping

## Quick Start

### 1. Install Dependencies

```bash
cd backend
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

# Install packages
pip install -r requirements.txt
```

### 2. Run Server

```bash
python main.py
```

Or with uvicorn:

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Server will start at: `http://localhost:8000`

### 3. Test API

Open browser: `http://localhost:8000`

You should see:
```json
{
  "name": "Panorama Stitching API",
  "version": "1.0.0",
  "description": "Professional panorama stitching using OpenCV Python (imgalign-style)"
}
```

## API Endpoints

### GET /
API information

### GET /api/health
Health check
```json
{
  "status": "healthy",
  "opencv_version": "4.8.1",
  "sift_available": true
}
```

### POST /api/stitch
Stitch panorama (imgalign-style, best quality)

**Parameters:**
- `images`: List of image files (multipart/form-data)
- `use_sift`: Use SIFT (better) vs ORB (faster) - default: false
- `quality`: JPEG quality 1-100 - default: 95

**Example:**
```bash
curl -X POST "http://localhost:8000/api/stitch?use_sift=false&quality=95" \
  -F "images=@frame1.jpg" \
  -F "images=@frame2.jpg" \
  -F "images=@frame3.jpg" \
  -o panorama.jpg
```

**Response:**
- Success: JPEG image
- Error: JSON with error details

### POST /api/stitch/simple
Simple stitching (faster, less control)

**Parameters:**
- `images`: List of image files
- `quality`: JPEG quality 1-100

## Configuration

### Use SIFT (Best Quality)

SIFT provides better quality but is slower and requires `opencv-contrib-python`:

```python
# Already included in requirements.txt
opencv-contrib-python==4.8.1.78
```

To use SIFT, send `use_sift=true` parameter:
```bash
curl -X POST "http://localhost:8000/api/stitch?use_sift=true" ...
```

### Performance Tuning

Edit `main.py`:

```python
# More features = better quality but slower
detector = cv2.SIFT_create(nfeatures=2000)  # Default: 2000

# Confidence threshold
confidence_thresh=0.65  # Default: 0.65 (lower = more matches)

# GPU acceleration (if available)
try_use_gpu=True  # Default: False
```

