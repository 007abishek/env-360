/**
 * imgalign-style Python backend stitching integration.
 * Sends captured frames to the FastAPI backend which runs:
 *   cylindrical projection → SIFT matching → homography → multiband blend → wave correction
 */

import type { StitchFrame } from './stitchPanorama'

export interface BackendStitchOptions {
  quality?: number          // JPEG quality 1-100
  focalLength?: number      // 0 = auto-estimate
  useSift?: boolean         // true = SIFT (better), false = ORB (faster)
  useMultiband?: boolean    // true = multi-band blending
  backendUrl?: string
}

function dataURLtoBlob(dataURL: string): Blob {
  const [header, data] = dataURL.split(',')
  const mime = header.match(/:(.*?);/)?.[1] ?? 'image/jpeg'
  const binary = atob(data)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new Blob([bytes], { type: mime })
}

/**
 * Check if the Python backend is reachable.
 */
export async function checkPythonBackend(baseUrl: string): Promise<boolean> {
  try {
    const res = await fetch(`${baseUrl}/api/health`, {
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) return false
    const data = await res.json()
    console.log('✓ Backend health:', data)
    return true
  } catch {
    return false
  }
}

/**
 * Send frames to the imgalign-style backend and get back a stitched panorama.
 */
export async function stitchWithPythonBackend(
  frames: StitchFrame[],
  options: BackendStitchOptions = {},
  onProgress?: (msg: string, pct: number) => void,
): Promise<string> {
  const {
    quality     = 95,
    focalLength = 0,
    useSift     = true,
    useMultiband = true,
    backendUrl  = window.location.origin,
  } = options

  if (frames.length < 2) throw new Error('Need at least 2 frames')

  onProgress?.('Preparing frames…', 5)

  const form = new FormData()
  for (let i = 0; i < frames.length; i++) {
    const blob = dataURLtoBlob(frames[i].src)
    form.append('images', blob, `frame_${String(i).padStart(3, '0')}.jpg`)
    onProgress?.(`Uploading frame ${i + 1}/${frames.length}…`, 5 + (i / frames.length) * 25)
  }

  onProgress?.('Running imgalign pipeline…', 35)

  const url = new URL('/api/stitch', backendUrl)
  url.searchParams.set('quality',       String(quality))
  url.searchParams.set('focal_length',  String(focalLength))
  url.searchParams.set('use_sift',      String(useSift))
  url.searchParams.set('use_multiband', String(useMultiband))

  const res = await fetch(url.toString(), { method: 'POST', body: form })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: `HTTP ${res.status}` }))
    throw new Error(err.detail ?? `HTTP ${res.status}`)
  }

  onProgress?.('Decoding panorama…', 90)

  const blob = await res.blob()
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result as string)
    reader.onerror   = () => reject(new Error('FileReader failed'))
    reader.readAsDataURL(blob)
  })

  const w = res.headers.get('X-Panorama-Width')
  const h = res.headers.get('X-Panorama-Height')
  console.log(`✓ Panorama: ${w}×${h}px  method: ${res.headers.get('X-Stitching-Method')}`)

  onProgress?.('Done!', 100)
  return dataUrl
}

/**
 * Alias kept for backward compatibility with ProfessionalPanorama.tsx
 */
export interface AdvancedStitchOptions extends BackendStitchOptions {
  projectionType?: string
  featureType?: string
  focalLength?: number
  useBundleAdjustment?: boolean
  useWaveCorrection?: boolean
  useColorTransfer?: boolean
  useMultibandBlending?: boolean
  numBlendBands?: number
}

export async function stitchWithAdvancedBackend(
  frames: StitchFrame[],
  options: AdvancedStitchOptions = {},
  onProgress?: (msg: string, pct: number) => void,
): Promise<string> {
  return stitchWithPythonBackend(frames, options, onProgress)
}
