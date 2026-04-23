import { useState, useEffect } from 'react'

// Minimal CV interface — only what stitchPanorama needs
export interface CV {
  Mat: new (...a: unknown[]) => CVMat & { ones: (rows: number, cols: number, type: number) => CVMat; zeros: (rows: number, cols: number, type: number) => CVMat; eye: (rows: number, cols: number, type: number) => CVMat }
  KeyPointVector: new () => CVKPVec
  DMatchVectorVector: new () => CVDMatchVV
  ORB_create: (n?: number) => CVDetector
  AKAZE_create?: () => CVDetector
  BFMatcher: new (norm: number, cross: boolean) => CVMatcher
  NORM_HAMMING: number
  RANSAC: number
  CV_32FC2: number
  CV_8UC4: number
  CV_8UC1: number
  CV_64F: number
  COLOR_RGBA2GRAY: number
  COLOR_GRAY2RGBA: number
  INTER_LINEAR: number
  INTER_NEAREST: number
  BORDER_CONSTANT: number
  Rect: new (x: number, y: number, width: number, height: number) => CVRect
  Size: new (width: number, height: number) => CVSize
  Scalar: new (...values: number[]) => CVScalar
  cvtColor(src: CVMat, dst: CVMat, code: number): void
  findHomography(src: CVMat, dst: CVMat, method: number, thresh: number): CVMat
  imread(canvas: HTMLCanvasElement | HTMLImageElement): CVMat
  imshow(canvas: HTMLCanvasElement, mat: CVMat): void
  equalizeHist(src: CVMat, dst: CVMat): void
  matFromArray(rows: number, cols: number, type: number, data: number[]): CVMat
  warpPerspective(src: CVMat, dst: CVMat, M: CVMat, dsize: CVSize, flags?: number, borderMode?: number, borderValue?: CVScalar): void
  addWeighted(src1: CVMat, alpha: number, src2: CVMat, beta: number, gamma: number, dst: CVMat): void
  gemm(src1: CVMat, src2: CVMat, alpha: number, src3: CVMat, beta: number, dst: CVMat, flags: number): void
}

export interface CVRect {
  x: number
  y: number
  width: number
  height: number
}

export interface CVSize {
  width: number
  height: number
}

export interface CVScalar {
  [index: number]: number
}

export interface CVMat {
  rows: number; cols: number
  data: Uint8Array; data32F: Float32Array; data64F: Float64Array
  delete(): void; clone(): CVMat; empty(): boolean
  size(): { width: number; height: number }
  type(): number
  copyTo(dst: CVMat): void
  roi(rect: CVRect): CVMat
  setTo(scalar: CVScalar): void
}
export interface CVKPVec  { size(): number; get(i: number): { pt: { x: number; y: number } }; delete(): void }
export interface CVDMatchVV { size(): number; get(i: number): CVDMatchV; delete(): void }
export interface CVDMatchV  { size(): number; get(i: number): { queryIdx: number; trainIdx: number; distance: number }; delete(): void }
export interface CVDetector { detectAndCompute(img: CVMat, mask: CVMat, kp: CVKPVec, desc: CVMat): void; delete(): void }
export interface CVMatcher  { knnMatch(q: CVMat, t: CVMat, out: CVDMatchVV, k: number): void; delete(): void }

export type CVStatus = 'loading' | 'ready' | 'error'

export const useOpenCV = () => {
  const [status, setStatus] = useState<CVStatus>('loading')
  const [cv, setCv] = useState<CV | null>(null)

  useEffect(() => {
    const check = () => {
      const w = window as unknown as Record<string, unknown>
      const candidate = w['cv'] as CV | undefined
      if (candidate?.Mat) {
        setCv(candidate)
        setStatus('ready')
        return true
      }
      return false
    }

    if (check()) return

    const interval = setInterval(() => { if (check()) clearInterval(interval) }, 300)

    // Hook into OpenCV's own onRuntimeInitialized callback
    const win = window as unknown as Record<string, unknown>
    if (!win['Module']) win['Module'] = {}
    const mod = win['Module'] as Record<string, unknown>
    const prev = mod['onRuntimeInitialized'] as (() => void) | undefined
    mod['onRuntimeInitialized'] = () => {
      prev?.()
      check()
      clearInterval(interval)
    }

    const timeout = setTimeout(() => {
      clearInterval(interval)
      // Don't error — app still works with pure-JS fallback
      setStatus('error')
    }, 30_000)

    return () => { clearInterval(interval); clearTimeout(timeout) }
  }, [])

  return { cv, status }
}
