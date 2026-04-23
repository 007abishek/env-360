import React, { useState } from 'react';
import { checkPythonBackend } from '../utils/pythonStitching';

interface DiagnosticResult {
  backendHealth: boolean;
  backendUrl: string;
  openCvVersion?: string;
  siftAvailable?: boolean;
  errorMessage?: string;
}

export const StitchingDiagnostic: React.FC = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<DiagnosticResult | null>(null);

  const runDiagnostic = async () => {
    setIsRunning(true);
    setResult(null);

    try {
      // Test same-origin first (works via Vite proxy / ngrok)
      let backendUrl = window.location.origin;
      let backendHealth = await checkPythonBackend(backendUrl);
      
      if (!backendHealth) {
        // Fallback: direct localhost
        backendUrl = 'http://localhost:8001';
        backendHealth = await checkPythonBackend(backendUrl);
      }

      if (backendHealth) {
        // Get detailed health info
        try {
          const response = await fetch(`${backendUrl}/api/health`);
          const healthData = await response.json();
          
          setResult({
            backendHealth: true,
            backendUrl,
            openCvVersion: healthData.opencv_version,
            siftAvailable: healthData.sift_available,
          });
        } catch (err) {
          setResult({
            backendHealth: true,
            backendUrl,
            errorMessage: 'Backend reachable but health check failed'
          });
        }
      } else {
        setResult({
          backendHealth: false,
          backendUrl: 'Not found',
          errorMessage: 'Backend not running. Start with: cd backend && python main.py'
        });
      }
    } catch (err) {
      setResult({
        backendHealth: false,
        backendUrl: 'Error',
        errorMessage: err instanceof Error ? err.message : 'Unknown error'
      });
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div style={{
      background: 'rgba(255,255,255,0.05)',
      borderRadius: '8px',
      padding: '16px',
      margin: '16px 0',
      border: '1px solid rgba(255,255,255,0.1)'
    }}>
      <h3 style={{ margin: '0 0 12px 0', fontSize: '16px' }}>🔧 Stitching Diagnostic</h3>
      
      <button
        onClick={runDiagnostic}
        disabled={isRunning}
        style={{
          padding: '8px 16px',
          fontSize: '14px',
          background: isRunning ? '#6b7280' : '#3b82f6',
          color: '#fff',
          border: 'none',
          borderRadius: '6px',
          cursor: isRunning ? 'not-allowed' : 'pointer',
          marginBottom: '12px'
        }}
      >
        {isRunning ? 'Running Diagnostic...' : 'Run Diagnostic'}
      </button>

      {result && (
        <div style={{ fontSize: '14px', lineHeight: '1.5' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '8px'
          }}>
            <div style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              background: result.backendHealth ? '#22c55e' : '#ef4444'
            }} />
            <span style={{ fontWeight: 'bold' }}>
              Backend: {result.backendHealth ? 'Healthy' : 'Not Available'}
            </span>
          </div>

          <div style={{ marginLeft: '20px', color: '#9ca3af' }}>
            <div>URL: {result.backendUrl}</div>
            {result.openCvVersion && (
              <div>OpenCV: {result.openCvVersion}</div>
            )}
            {result.siftAvailable !== undefined && (
              <div>SIFT: {result.siftAvailable ? 'Available' : 'Not Available'}</div>
            )}
            {result.errorMessage && (
              <div style={{ color: '#f87171', marginTop: '8px' }}>
                Error: {result.errorMessage}
              </div>
            )}
          </div>

          {result.backendHealth ? (
            <div style={{
              marginTop: '12px',
              padding: '8px',
              background: 'rgba(34, 197, 94, 0.1)',
              borderRadius: '4px',
              color: '#86efac'
            }}>
              ✓ Backend is ready for high-quality panorama stitching
            </div>
          ) : (
            <div style={{
              marginTop: '12px',
              padding: '8px',
              background: 'rgba(239, 68, 68, 0.1)',
              borderRadius: '4px',
              color: '#fca5a5'
            }}>
              ⚠ Backend unavailable - will use browser fallback (lower quality)
            </div>
          )}
        </div>
      )}

      <details style={{ marginTop: '12px', fontSize: '12px', color: '#9ca3af' }}>
        <summary style={{ cursor: 'pointer', marginBottom: '8px' }}>
          Troubleshooting Tips
        </summary>
        <div style={{ paddingLeft: '16px', lineHeight: '1.6' }}>
          <strong>If stitching fails:</strong>
          <ul style={{ margin: '4px 0', paddingLeft: '16px' }}>
            <li>Ensure 30-50% overlap between frames</li>
            <li>Avoid plain walls or repetitive patterns</li>
            <li>Capture in good lighting conditions</li>
            <li>Hold phone steady to avoid motion blur</li>
            <li>Include furniture or distinctive objects</li>
          </ul>
          
          <strong>If backend is unavailable:</strong>
          <ul style={{ margin: '4px 0', paddingLeft: '16px' }}>
            <li>Open terminal in backend folder</li>
            <li>Run: <code>python main.py</code></li>
            <li>Check that port 8001 is available</li>
            <li>Ensure Python dependencies are installed</li>
          </ul>
        </div>
      </details>
    </div>
  );
};