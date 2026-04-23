# Frontend - 360° Environment Scanner

This is the React frontend for the 360° Environment Scanner application.

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Development Server

The development server runs at:
- Local: https://localhost:5173/
- Network: https://10.206.78.8:5173/

## Features

- Real-time camera capture and 360° scanning
- Live orientation tracking with device sensors
- Progressive frame capture with smart timing
- Backend integration for panorama stitching
- OpenCV.js fallback for client-side processing
- Mobile-optimized interface with QR code access

## Backend Integration

The frontend connects to Python backends for panorama stitching:
- `backend/` - Original imgalign-based stitcher
- `backend_try2/` - Enhanced 360° stitcher with loop closure

## Scripts

- `npm run qr` - Generate QR codes for mobile access
- `npm run ngrok` - Start ngrok tunnel for external access

## Technology Stack

- React 19 with TypeScript
- Vite for build tooling
- OpenCV.js for computer vision
- A-Frame for 3D panorama viewing
- Device orientation APIs for motion tracking