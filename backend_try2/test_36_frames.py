"""
Test script for 36-frame sequence
"""

import requests
import sys
from pathlib import Path

def test_36_frames():
    """Test stitching with 36-frame sequence"""
    
    # Path to test images
    test_dir = Path("../backend/test_360_36frames")
    
    if not test_dir.exists():
        print(f"Error: Test directory not found: {test_dir}")
        sys.exit(1)
    
    # Get all frame files
    frame_files = sorted(test_dir.glob("frame_*.jpg"))
    
    if len(frame_files) == 0:
        print(f"Error: No frame files found in {test_dir}")
        sys.exit(1)
    
    print(f"Found {len(frame_files)} frames")
    
    # Prepare files for upload
    files = []
    for frame_file in frame_files:
        files.append(('images', (frame_file.name, open(frame_file, 'rb'), 'image/jpeg')))
    
    # Send request
    print("Sending stitching request...")
    url = "http://localhost:8001/api/stitch"
    params = {
        "quality": 95,
        "mode": "360",
        "detector": "sift",
        "max_dimension": 640,
        "confidence_threshold": 0.3
    }
    
    try:
        response = requests.post(url, files=files, params=params, timeout=180)
        
        # Close file handles
        for _, (_, f, _) in files:
            f.close()
        
        if response.status_code == 200:
            # Save panorama
            output_file = "panorama_36frames.jpg"
            with open(output_file, 'wb') as f:
                f.write(response.content)
            
            print(f"✓ Stitching successful!")
            print(f"  Output: {output_file}")
            print(f"  Width: {response.headers.get('X-Panorama-Width')}")
            print(f"  Height: {response.headers.get('X-Panorama-Height')}")
            print(f"  Images: {response.headers.get('X-Images-Processed')}")
            print(f"  Method: {response.headers.get('X-Stitching-Method')}")
            print(f"  Loop Closure: {response.headers.get('X-Loop-Closure-Detected')}")
        else:
            print(f"✗ Stitching failed: {response.status_code}")
            print(f"  Error: {response.text}")
            sys.exit(1)
    
    except requests.exceptions.RequestException as e:
        print(f"✗ Request failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    test_36_frames()
