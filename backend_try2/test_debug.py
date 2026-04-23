"""
Test script for debug endpoint
"""

import requests
import sys
import json
from pathlib import Path

def test_debug():
    """Test debug endpoint with 24-frame sequence"""
    
    # Path to test images
    test_dir = Path("../backend/test_360_24frames")
    
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
    print("Sending debug analysis request...")
    url = "http://localhost:8001/api/debug-stitch"
    
    try:
        response = requests.post(url, files=files, timeout=60)
        
        # Close file handles
        for _, (_, f, _) in files:
            f.close()
        
        if response.status_code == 200:
            data = response.json()
            
            print(f"\n✓ Debug analysis successful!")
            print(f"\nTotal Images: {data['total_images']}")
            
            print(f"\nImage Info:")
            for img_info in data['image_info']:
                print(f"  {img_info['filename']}: {img_info['size']}")
            
            if data.get('loop_closure_info'):
                lc = data['loop_closure_info']
                print(f"\nLoop Closure:")
                print(f"  Detected: {lc['detected']}")
                print(f"  Best Match Count: {lc['best_match_count']}")
                print(f"  Match Counts: {lc['match_counts']}")
            
            if data.get('overlap_stats'):
                os = data['overlap_stats']
                print(f"\nOverlap Statistics:")
                print(f"  Total Pairs: {os['total_pairs']}")
                print(f"  Valid Pairs: {os['valid_pairs']}")
                print(f"  Invalid Pairs: {os['invalid_pairs']}")
                print(f"  Min Matches: {os['min_matches']}")
                print(f"  Max Matches: {os['max_matches']}")
                print(f"  Avg Matches: {os['avg_matches']:.1f}")
                
                if os.get('warnings'):
                    print(f"\n  Warnings:")
                    for warning in os['warnings']:
                        print(f"    {warning['pair']}: {warning['matches']} matches ({warning['reason']})")
            
            print(f"\nRecommendations:")
            for rec in data['recommendations']:
                print(f"  • {rec}")
        else:
            print(f"✗ Debug analysis failed: {response.status_code}")
            print(f"  Error: {response.text}")
            sys.exit(1)
    
    except requests.exceptions.RequestException as e:
        print(f"✗ Request failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    test_debug()
