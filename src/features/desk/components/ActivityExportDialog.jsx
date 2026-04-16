import React, { useState } from 'react'

/**
 * Dialog for exporting captured activity data to CSV or JSON format.
 * Used for uploading to Azure Blob Storage.
 */
export default function ActivityExportDialog({ isOpen, onClose, onExport, eventCount = 0 }) {
  const [format, setFormat] = useState('json')
  const [exporting, setExporting] = useState(false)

  if (!isOpen) return null

  const handleExport = async () => {
    setExporting(true)
    try {
      await onExport(format)
      // Reset after successful export
      setTimeout(() => {
        setFormat('json')
        setExporting(false)
        onClose()
      }, 500)
    } catch (err) {
      console.error('Export failed:', err)
      setExporting(false)
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '24px',
          maxWidth: '400px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '12px', color: '#1f2937' }}>
          Export Activity Data
        </h2>

        <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '16px' }}>
          Export {eventCount} captured activity events for upload to Azure Blob Storage.
        </p>

        {/* Format selection */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '8px', color: '#374151' }}>
            Export Format
          </label>
          <div style={{ display: 'flex', gap: '12px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
              <input
                type="radio"
                name="format"
                value="json"
                checked={format === 'json'}
                onChange={(e) => setFormat(e.target.value)}
              />
              <span style={{ fontSize: '14px', color: '#374151' }}>JSON</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
              <input
                type="radio"
                name="format"
                value="csv"
                checked={format === 'csv'}
                onChange={(e) => setFormat(e.target.value)}
              />
              <span style={{ fontSize: '14px', color: '#374151' }}>CSV</span>
            </label>
          </div>
        </div>

        {/* Info box */}
        <div style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '6px', padding: '12px', marginBottom: '20px', fontSize: '13px', color: '#1e40af' }}>
          💡 <strong>Tip:</strong> Download and upload this file to Azure Blob Storage{' '}
          <code style={{ backgroundColor: '#dbeafe', padding: '2px 6px', borderRadius: '2px' }}>raw-events</code>{' '}
          for Data Factory ingestion.
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            disabled={exporting}
            style={{
              padding: '8px 16px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              backgroundColor: 'white',
              color: '#374151',
              fontSize: '14px',
              fontWeight: '600',
              cursor: exporting ? 'not-allowed' : 'pointer',
              opacity: exporting ? 0.5 : 1,
              transition: 'all 0.2s ease',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={exporting || eventCount === 0}
            style={{
              padding: '8px 16px',
              border: 'none',
              borderRadius: '6px',
              backgroundColor: '#3b82f6',
              color: 'white',
              fontSize: '14px',
              fontWeight: '600',
              cursor: exporting || eventCount === 0 ? 'not-allowed' : 'pointer',
              opacity: exporting || eventCount === 0 ? 0.5 : 1,
              transition: 'all 0.2s ease',
            }}
          >
            {exporting ? 'Exporting...' : 'Export & Download'}
          </button>
        </div>
      </div>
    </div>
  )
}
