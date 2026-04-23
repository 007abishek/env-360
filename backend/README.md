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

## Deployment

### Option 1: Local Development

```bash
python main.py
```

### Option 2: Production with Gunicorn

```bash
pip install gunicorn
gunicorn main:app --workers 4 --worker-class uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

### Option 3: Docker

Create `Dockerfile`:

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    libgl1-mesa-glx \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY main.py .

# Expose port
EXPOSE 8000

# Run
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

Build and run:
```bash
docker build -t panorama-api .
docker run -p 8000:8000 panorama-api
```

### Option 4: Deploy to Cloud

#### Railway.app (Easiest)

1. Create `railway.toml`:
```toml
[build]
builder = "NIXPACKS"

[deploy]
startCommand = "uvicorn main:app --host 0.0.0.0 --port $PORT"
```

2. Push to GitHub
3. Connect to Railway
4. Deploy!

#### Render.com

1. Create `render.yaml`:
```yaml
services:
  - type: web
    name: panorama-api
    env: python
    buildCommand: pip install -r requirements.txt
    startCommand: uvicorn main:app --host 0.0.0.0 --port $PORT
```

2. Connect to Render
3. Deploy!

## Testing

### Test with curl

```bash
# Health check
curl http://localhost:8000/api/health

# Stitch panorama
curl -X POST "http://localhost:8000/api/stitch" \
  -F "images=@test1.jpg" \
  -F "images=@test2.jpg" \
  -F "images=@test3.jpg" \
  -o result.jpg
```

### Test with Python

```python
import requests

# Upload images
files = [
    ('images', open('frame1.jpg', 'rb')),
    ('images', open('frame2.jpg', 'rb')),
    ('images', open('frame3.jpg', 'rb')),
]

response = requests.post(
    'http://localhost:8000/api/stitch',
    files=files,
    params={'use_sift': False, 'quality': 95}
)

if response.status_code == 200:
    with open('panorama.jpg', 'wb') as f:
        f.write(response.content)
    print('✓ Panorama saved!')
else:
    print(f'✗ Error: {response.json()}')
```

## Troubleshooting

### SIFT not available

If you get "SIFT not available", install opencv-contrib-python:
```bash
pip uninstall opencv-python
pip install opencv-contrib-python
```

### Import errors

Make sure you're in the virtual environment:
```bash
# Windows
venv\Scripts\activate
# Mac/Linux
source venv/bin/activate
```

### Port already in use

Change port:
```bash
uvicorn main:app --port 8001
```

### CORS errors

Update `main.py`:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

## Performance

### Benchmarks (12 frames, 1280x720 each)

| Method | Time | Quality |
|--------|------|---------|
| ORB | 2-3s | ⭐⭐⭐⭐ |
| SIFT | 4-6s | ⭐⭐⭐⭐⭐ |

### Memory Usage

- ~500MB for 12 frames (1280x720)
- Scales with image size and count

## License

MIT

## Credits

Based on:
- [latsic/imgalign](https://github.com/latsic/imgalign) - Inspiration
- OpenCV Stitching module - Core functionality
