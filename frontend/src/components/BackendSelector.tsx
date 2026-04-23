/**
 * Backend Selector Component
 * Allows users to switch between backend_try1 and backend_try2
 */

import { useState, useEffect } from 'react'
import { getSelectedBackend, setSelectedBackend, getBackendInfo, BACKENDS, type BackendType } from '../utils/backendConfig'

export function BackendSelector() {
  const [selected, setSelected] = useState<BackendType>(getSelectedBackend())
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    const handleBackendChange = (event: Event) => {
      const customEvent = event as CustomEvent<BackendType>
      setSelected(customEvent.detail)
    }
    
    window.addEventListener('backend-changed', handleBackendChange)
    return () => window.removeEventListener('backend-changed', handleBackendChange)
  }, [])

  const handleSelect = (backend: BackendType) => {
    console.log('[BackendSelector] User selected:', backend)
    setSelectedBackend(backend)
    setSelected(backend)
    setIsOpen(false)
  }

  const currentInfo = getBackendInfo(selected)

  return (
    <div className="backend-selector">
      <button
        className="backend-selector-button"
        onClick={() => setIsOpen(!isOpen)}
        title="Switch backend"
      >
        <span className="backend-icon">⚙️</span>
        <span className="backend-name">{currentInfo.name}</span>
        <span className="backend-arrow">{isOpen ? '▲' : '▼'}</span>
      </button>

      {isOpen && (
        <div className="backend-dropdown">
          {(Object.keys(BACKENDS) as BackendType[]).map((backend) => {
            const info = getBackendInfo(backend)
            const isSelected = backend === selected

            return (
              <button
                key={backend}
                className={`backend-option ${isSelected ? 'selected' : ''}`}
                onClick={() => handleSelect(backend)}
              >
                <div className="backend-option-header">
                  <span className="backend-option-name">{info.name}</span>
                  {isSelected && <span className="backend-check">✓</span>}
                </div>
                <div className="backend-option-description">{info.description}</div>
                <div className="backend-option-port">Port: {info.port}</div>
                <ul className="backend-option-features">
                  {info.features.map((feature, idx) => (
                    <li key={idx}>{feature}</li>
                  ))}
                </ul>
              </button>
            )
          })}
        </div>
      )}

      <style>{`
        .backend-selector {
          position: relative;
          display: inline-block;
        }

        .backend-selector-button {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 8px;
          color: white;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .backend-selector-button:hover {
          background: rgba(255, 255, 255, 0.15);
          border-color: rgba(255, 255, 255, 0.3);
        }

        .backend-icon {
          font-size: 16px;
        }

        .backend-name {
          font-weight: 500;
        }

        .backend-arrow {
          font-size: 10px;
          opacity: 0.7;
        }

        .backend-dropdown {
          position: absolute;
          top: calc(100% + 8px);
          left: 0;
          min-width: 320px;
          background: rgba(20, 20, 30, 0.95);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 12px;
          padding: 8px;
          z-index: 1000;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
          backdrop-filter: blur(10px);
        }

        .backend-option {
          display: block;
          width: 100%;
          padding: 12px;
          margin-bottom: 8px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          color: white;
          text-align: left;
          cursor: pointer;
          transition: all 0.2s;
        }

        .backend-option:last-child {
          margin-bottom: 0;
        }

        .backend-option:hover {
          background: rgba(255, 255, 255, 0.1);
          border-color: rgba(255, 255, 255, 0.2);
        }

        .backend-option.selected {
          background: rgba(59, 130, 246, 0.2);
          border-color: rgba(59, 130, 246, 0.4);
        }

        .backend-option-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 4px;
        }

        .backend-option-name {
          font-weight: 600;
          font-size: 14px;
        }

        .backend-check {
          color: #3b82f6;
          font-size: 16px;
        }

        .backend-option-description {
          font-size: 12px;
          opacity: 0.8;
          margin-bottom: 4px;
        }

        .backend-option-port {
          font-size: 11px;
          opacity: 0.6;
          margin-bottom: 8px;
        }

        .backend-option-features {
          list-style: none;
          padding: 0;
          margin: 0;
          font-size: 11px;
          opacity: 0.7;
        }

        .backend-option-features li {
          padding: 2px 0;
        }

        .backend-option-features li:before {
          content: "• ";
          margin-right: 4px;
        }
      `}</style>
    </div>
  )
}
