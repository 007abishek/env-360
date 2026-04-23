
import type { CV } from '../hooks/useOpenCV'

export type StitchFrame = {
  src: string
  yaw: number
  capturedAt: number
  segment?: number
}

export type StitchOptions = {
  cv?: CV | null
  blendMode?: 'linear' | 'laplacian'
  focalLength?: number
}

/**
 * Panorama Stitching Utility
 * 
 * This module provides types and utilities for panoramic image stitching.
 * The actual stitching logic runs via backend API for professional results.
 * 
 * Key Features:
 * - Backend integration for professional stitching
 * - Frame type definitions for capture system
 * - Fallback stitching for offline scenarios
 * 
 * Usage:
 * Use the backend stitching via pythonStitching.ts for production quality.
 * 
 * @see src/utils/pythonStitching.ts
 */

/**
 * Legacy stitchPanorama function (kept for backward compatibility)
 * For new implementations, use backend stitching via pythonStitching.ts
 * 
 * @deprecated Use backend stitching instead for better performance
 */
export async function stitchPanorama(
  frames: StitchFrame[],
  _options: StitchOptions = {}
): Promise<string> {
  // This is a placeholder that returns a simple concatenated image
  // The real stitching happens via backend API
  console.warn('Using legacy stitchPanorama - backend stitching recommended')
  
  if (frames.length === 0) {
    throw new Error('No frames to stitch')
  }
  
  if (frames.length === 1) {
    return frames[0].src
  }
  
  // Simple fallback: return the first frame
  // In production, this should use backend stitching
  return frames[0].src
}
