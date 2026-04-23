/**
 * Backend Configuration
 * Allows switching between backend_try1 (port 8000) and backend_try2 (port 8001)
 */

export type BackendType = 'try1' | 'try2'

export interface BackendInfo {
  name: string
  port: number
  description: string
  features: string[]
}

export const BACKENDS: Record<BackendType, BackendInfo> = {
  try1: {
    name: 'Backend Try1 (OpenStitching)',
    port: 8000,
    description: 'Production backend using OpenStitching library',
    features: [
      'Automatic fallback strategies',
      'PANORAMA and AFFINE modes',
      'Memory optimized',
      'Robust error handling'
    ]
  },
  try2: {
    name: 'Backend Try2 (Detailed Stitcher)',
    port: 8001,
    description: 'Advanced backend with loop closure detection',
    features: [
      'Loop closure detection for 360°',
      'Overlap validation',
      'Plain scene handling',
      'Multiple feature detectors'
    ]
  }
}

const STORAGE_KEY = 'panorama_backend_selection'

/**
 * Get currently selected backend
 */
export function getSelectedBackend(): BackendType {
  const stored = localStorage.getItem(STORAGE_KEY)
  return (stored === 'try1' || stored === 'try2') ? stored : 'try1'
}

/**
 * Set selected backend
 */
export function setSelectedBackend(backend: BackendType): void {
  console.log('[BackendConfig] Setting backend to:', backend)
  localStorage.setItem(STORAGE_KEY, backend)
  // Dispatch custom event to notify components
  window.dispatchEvent(new CustomEvent('backend-changed', { detail: backend }))
  console.log('[BackendConfig] Backend changed event dispatched')
}

/**
 * Get backend API base URL
 */
export function getBackendUrl(backend?: BackendType): string {
  const selected = backend || getSelectedBackend()
  const port = BACKENDS[selected].port
  
  console.log('[BackendConfig] getBackendUrl called - selected:', selected, 'port:', port)
  
  // Check if we're in development or production
  const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  
  if (isDevelopment) {
    // In development, connect directly to backend ports
    const url = `http://localhost:${port}`
    console.log('[BackendConfig] Development mode - URL:', url)
    return url
  }
  
  // In production (ngrok), use proxy paths
  // This allows both backends to work through the same ngrok tunnel
  const url = `/api/${selected}`
  console.log('[BackendConfig] Production mode - URL:', url)
  return url
}

/**
 * Get backend info
 */
export function getBackendInfo(backend?: BackendType): BackendInfo {
  const selected = backend || getSelectedBackend()
  return BACKENDS[selected]
}
