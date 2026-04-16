import React from 'react'
import './FinalProjectShowcase.css'
import { useDeskActivityCapture, useDeskEngagementMetrics, ActivityExportDialog, EngagementTierBadge, EngagementChart } from '../desk'
import { exportActivitiesToAzure } from '../desk/utils/exportActivitiesToAzure'
import { ENABLE_FINAL_PROJECT } from '../../config'

const dashboardMetrics = [
  { label: 'Raw data', value: 'Blob', detail: 'CSV / JSON activity logs' },
  { label: 'ETL', value: 'ADF', detail: 'Ingest, clean, aggregate' },
  { label: 'Model', value: 'K-means', detail: 'Low / medium / high engagement tiers' },
  { label: 'Surface', value: 'App', detail: 'Dashboard embedded in DoodleDesk' },
]

const pipelineRows = [
  ['1. Capture activity', 'DoodleDesk events', 'Note creation, edits, session length, collaboration'],
  ['2. Store raw data', 'Azure Blob Storage', 'Cheap landing zone for CSV or JSON files'],
  ['3. Transform data', 'Azure Data Factory', 'Clean and aggregate into analysis-ready tables'],
  ['4. Train model', 'Azure ML', 'K-means clustering with silhouette review'],
  ['5. Show results', 'Dashboard in app', 'Productivity tier, usage trends, and collaboration'],
]

const activityBars = [
  { label: 'Note creation', value: 76 },
  { label: 'Edit volume', value: 61 },
  { label: 'Active minutes', value: 84 },
  { label: 'Collaboration', value: 68 },
]

const tierBars = [
  { label: 'Low engagement', value: 28 },
  { label: 'Medium engagement', value: 57 },
  { label: 'High engagement', value: 81 },
]

const modelWriteUp = [
  {
    title: 'Linear Regression',
    text: 'A simple baseline for predicting a continuous target such as a productivity score or future activity volume. It is fast, interpretable, and useful as a comparison point even when behavior is not fully linear.',
  },
  {
    title: 'Random Forest',
    text: 'A strong nonlinear baseline that handles mixed signals and feature interactions well. It is useful for understanding which activity patterns separate more engaged users from less engaged ones.',
  },
  {
    title: 'Gradient Boosting',
    text: 'A high-performing option for ranking users by engagement or retention risk. It can capture subtle interactions among session length, edits, and collaboration, which makes it a good predictive choice.',
  },
]

const rubricCoverage = [
  {
    title: 'Proposal summary',
    detail: 'Explains the Azure architecture, the tracked DoodleDesk activity data, and why the project is useful to the app.',
  },
  {
    title: 'Web server setup',
    detail: 'Keeps a deployable, internet-accessible React app that can run on Azure App Service or another host.',
  },
  {
    title: 'Datastore and loading',
    detail: 'Represents raw activity files in Blob Storage and supports refreshable loading workflows.',
  },
  {
    title: 'Interactive dashboard',
    detail: 'Shows productivity tier, activity trends, and collaboration metrics directly in the DoodleDesk interface.',
  },
  {
    title: 'ML application',
    detail: 'Centers the model section on K-means clustering and includes silhouette-score-style evaluation language.',
  },
  {
    title: 'Optional second dataset',
    detail: 'Leaves room to add a small public retail dataset later if you want a second validation source, but it is not required.',
  },
]

const checklistItems = [
  'Write the short proposal summary and keep it consistent with the Azure architecture shown here.',
  'Deploy the app with the feature flag enabled so the proposal shell is visible in the submitted URL.',
  'Store or demonstrate raw DoodleDesk activity data in an Azure Blob-backed flow, even if the app uses sample data in the UI.',
  'Use Azure Data Factory or a documented equivalent for the ingestion and cleaning step.',
  'Present the K-means model as the primary ML approach and mention silhouette score as the quality check.',
  'Capture screenshots of the dashboard, model write-up, and data-loading section for the submission file.',
]

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function pickOne(values) {
  return values[randomInt(0, values.length - 1)]
}

function createSyntheticActivityBatch(targetEvents = 500) {
  const userIds = Array.from({ length: 24 }, (_, index) => `user_${1200 + index}`)
  const deskIds = [
    'desk_main_planning',
    'desk_product_launch',
    'desk_design_review',
    'desk_weekly_ops',
    'desk_client_handoff',
    'desk_retro_board',
  ]
  const platforms = [
    { deviceType: 'desktop', platform: 'Chrome 136 / Windows 11' },
    { deviceType: 'desktop', platform: 'Edge 135 / Windows 11' },
    { deviceType: 'mobile', platform: 'Safari 18 / iPhone 15' },
    { deviceType: 'mobile', platform: 'Chrome 136 / Android 15' },
    { deviceType: 'tablet', platform: 'Safari 18 / iPadOS 18' },
  ]
  const actionTypes = ['note_create', 'note_edit', 'checklist_toggle', 'collaboration']
  const events = []
  const baseMs = Date.now() - (4 * 24 * 60 * 60 * 1000)
  let eventCounter = 1

  const makeEventId = () => {
    const id = `evt_auto_${String(eventCounter).padStart(6, '0')}`
    eventCounter += 1
    return id
  }

  while (events.length < targetEvents) {
    const userId = pickOne(userIds)
    const deskId = pickOne(deskIds)
    const profile = pickOne(platforms)
    const sessionStartOffset = randomInt(0, 4 * 24 * 60 * 60)
    const sessionStartMs = baseMs + (sessionStartOffset * 1000)
    const sessionId = `sess_auto_${Math.floor(sessionStartMs / 1000)}_${userId}_${randomInt(100, 999)}`

    events.push({
      event_id: makeEventId(),
      user_id: userId,
      desk_id: deskId,
      event_type: 'session_start',
      event_ts_utc: new Date(sessionStartMs).toISOString(),
      session_id: sessionId,
      note_id: null,
      edit_count: 0,
      collaboration_count: 0,
      session_seconds: 0,
      device_type: profile.deviceType,
      platform: profile.platform,
      metadata_json: {
        app_version: '1.8.4',
        entry_point: pickOne(['dashboard', 'notification', 'shared_link']),
        synthetic: true,
      },
    })

    const actionCount = randomInt(4, 12)
    for (let index = 0; index < actionCount; index += 1) {
      if (events.length >= targetEvents) break

      const eventType = pickOne(actionTypes)
      const sessionSeconds = randomInt(25, 3600)
      const eventTimeMs = sessionStartMs + (sessionSeconds * 1000)
      const noteId = eventType === 'collaboration'
        ? null
        : `${eventType.startsWith('checklist') ? 'check' : 'note'}_${randomInt(10000, 99999)}`

      events.push({
        event_id: makeEventId(),
        user_id: userId,
        desk_id: deskId,
        event_type: eventType,
        event_ts_utc: new Date(eventTimeMs).toISOString(),
        session_id: sessionId,
        note_id: noteId,
        edit_count: eventType === 'note_edit' ? randomInt(1, 6) : eventType === 'note_create' ? 1 : 0,
        collaboration_count: eventType === 'collaboration' ? randomInt(1, 3) : 0,
        session_seconds: sessionSeconds,
        device_type: profile.deviceType,
        platform: profile.platform,
        metadata_json: {
          synthetic: true,
          action_context: eventType,
        },
      })
    }

    if (events.length >= targetEvents) break

    const endSeconds = randomInt(420, 5400)
    events.push({
      event_id: makeEventId(),
      user_id: userId,
      desk_id: deskId,
      event_type: 'session_end',
      event_ts_utc: new Date(sessionStartMs + (endSeconds * 1000)).toISOString(),
      session_id: sessionId,
      note_id: null,
      edit_count: 0,
      collaboration_count: 0,
      session_seconds: endSeconds,
      device_type: profile.deviceType,
      platform: profile.platform,
      metadata_json: {
        synthetic: true,
        autosave_status: 'saved',
        idle_timeout: false,
      },
    })
  }

  return events.slice(0, targetEvents)
}

function formatPercent(value) {
  return `${value}%`
}

export default function FinalProjectShowcase() {
  const mockUserId = 'user_1024' // Matches sample Azure datasets for real-tier dashboard validation
  const mockDeskId = 'desk_main_planning'

  // Activity capture and engagement tracking
  const {
    captureNoteCreate,
    captureNoteEdit,
    getEventCount,
    downloadEvents,
  } = useDeskActivityCapture({ userId: mockUserId, selectedDeskId: mockDeskId })

  const { engagementTier, metrics, loading: metricsLoading } = useDeskEngagementMetrics({
    userId: mockUserId,
  })

  // Local state
  const [searchValue, setSearchValue] = React.useState('activity')
  const [rawFileName, setRawFileName] = React.useState('No file selected')
  const [curatedFileName, setCuratedFileName] = React.useState('No file selected')
  const [modelFileName, setModelFileName] = React.useState('No file selected')
  const [lastLoadedAt, setLastLoadedAt] = React.useState('Not loaded yet')
  const [exportDialogOpen, setExportDialogOpen] = React.useState(false)
  const [sampleTargetSize, setSampleTargetSize] = React.useState(500)
  const [sampleGenerationMessage, setSampleGenerationMessage] = React.useState('')
  const [exportingToAzure, setExportingToAzure] = React.useState(false)
  const [exportMessage, setExportMessage] = React.useState('')
  const initialEventCountRef = React.useRef(null)

  const filteredRows = React.useMemo(() => {
    const normalizedQuery = searchValue.trim().toLowerCase()
    if (!normalizedQuery) {
      return pipelineRows
    }

    return pipelineRows.filter((row) => row.some((value) => value.toLowerCase().includes(normalizedQuery)))
  }, [searchValue])

  function handleDatasetSelection(setFileName) {
    return (event) => {
      const file = event.target.files?.[0]
      setFileName(file ? file.name : 'No file selected')
    }
  }

  function handleLoadLatestDataset(event) {
    event.preventDefault()
    setLastLoadedAt(new Date().toLocaleString())
  }

  function handleExportActivity(format) {
    return new Promise((resolve) => {
      downloadEvents(format)
      resolve()
    })
  }

  function handleGenerateSampleData() {
    const events = createSyntheticActivityBatch(Number(sampleTargetSize) || 500)
    const generatedAt = Date.now()
    const filename = `sample_activity_events_generated_${generatedAt}.json`
    const content = JSON.stringify(events, null, 2)

    const blob = new Blob([content], { type: 'application/json;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)

    link.setAttribute('href', url)
    link.setAttribute('download', filename)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    setRawFileName(filename)
    setSampleGenerationMessage(
      `Generated ${events.length} events. Download ready for raw-events upload to Azure.`
    )

    // Auto-export sample data to Azure if analytics is enabled
    if (ENABLE_FINAL_PROJECT && mockUserId) {
      handleExportToAzure()
    }
  }

  async function handleExportToAzure() {
    if (!ENABLE_FINAL_PROJECT || !mockUserId) {
      setExportMessage('Analytics export is not enabled.')
      return
    }

    setExportingToAzure(true)
    setExportMessage('Exporting activities to Azure...')

    try {
      const result = await exportActivitiesToAzure(mockUserId)
      if (result.success) {
        setExportMessage(
          `✓ Exported ${result.eventCount} activities to Azure. File: ${result.filename || 'unknown'}`
        )
        console.log('[Analytics] Activities exported to Azure:', result)
      } else {
        setExportMessage(`Export failed: ${result.error || 'Unknown error'}`)
        console.warn('[Analytics] Export failed:', result.error)
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      setExportMessage(`Export error: ${errorMsg}`)
      console.error('[Analytics] Export exception:', error)
    } finally {
      setExportingToAzure(false)
    }
  }

  // Demo activity capture for testing (simulates user interactions)
  React.useEffect(() => {
    // Simulate initial session activity
    const timer = setTimeout(() => {
      captureNoteCreate('note_demo_1')
      captureNoteEdit('note_demo_1', 2)
    }, 500)

    return () => clearTimeout(timer)
  }, [captureNoteCreate, captureNoteEdit])

  // Track initial event count for activity change detection
  React.useEffect(() => {
    if (initialEventCountRef.current === null) {
      initialEventCountRef.current = getEventCount()
    }
  }, [getEventCount])

  return (
    <main className="final-project-shell">
      <section className="final-project-hero">
        <div className="final-project-hero-copy">
          <div className="final-project-badge">Final Project Submission Mode</div>
          <h1>DoodleDesk Analytics on Azure.</h1>
          <p>
            This feature-flagged mode turns your proposal into a submission-ready shell for the DoodleDesk Azure
            analytics project. It maps the app to the rubric: raw activity data in Azure Blob Storage, ingestion and
            cleaning with Azure Data Factory, K-means clustering in Azure Machine Learning, and a dashboard inside the
            web app that shows productivity tiers and engagement trends.
          </p>

          <div className="final-project-hero-actions">
            <a href="#pipeline" className="final-project-primary-link">Review Azure pipeline</a>
            <a href="#submission-checklist" className="final-project-secondary-link">Review submission checklist</a>
          </div>

          <div className="final-project-hero-metrics" aria-label="Project highlights">
            {dashboardMetrics.map((metric) => (
              <article key={metric.label} className="final-project-metric-card">
                <span>{metric.label}</span>
                <strong>{metric.value}</strong>
                <p>{metric.detail}</p>
              </article>
            ))}
          </div>
        </div>

        <aside className="final-project-architecture">
          <div className="final-project-architecture-card">
            <p>Azure stack</p>
            <ul>
              <li>Blob Storage for raw CSV or JSON activity files</li>
              <li>Azure Data Factory for cleanup and aggregation</li>
              <li>Azure Machine Learning for K-means clustering</li>
              <li>Internet-accessible React app for the dashboard</li>
            </ul>
          </div>
          <div className="final-project-architecture-card accent">
            <p>Predictive focus</p>
            <strong>Productivity tiers</strong>
            <span>
              Users are grouped into low, medium, and high engagement tiers based on note creation, edit volume,
              session length, and collaboration patterns.
            </span>
          </div>
        </aside>
      </section>

      <section className="final-project-grid">
        <article className="final-project-panel" id="access-form">
          <div className="panel-heading">
            <h2>Web Server Setup</h2>
            <p>Interactive page fields requested in the rubric.</p>
          </div>

          <form className="final-project-form" onSubmit={(event) => event.preventDefault()}>
            <label>
              Username
              <input type="text" name="username" placeholder="team_member" />
            </label>
            <label>
              Password
              <input type="password" name="password" placeholder="••••••••" />
            </label>
            <label>
              Email
              <input type="email" name="email" placeholder="team@example.edu" />
            </label>
            <button type="submit">Preview secure access</button>
          </form>
        </article>

        <article className="final-project-panel" id="data-loading">
          <div className="panel-heading">
            <h2>Datastore and Data Loading</h2>
            <p>Use these controls to represent raw activity ingestion and model refresh workflows.</p>
          </div>

          <form className="final-project-upload-grid" onSubmit={handleLoadLatestDataset}>
            <label>
              Raw activity CSV or JSON
              <input type="file" accept=".csv,.json" onChange={handleDatasetSelection(setRawFileName)} />
              <span>{rawFileName}</span>
            </label>
            <label>
              Curated aggregate file
              <input type="file" accept=".csv,.json" onChange={handleDatasetSelection(setCuratedFileName)} />
              <span>{curatedFileName}</span>
            </label>
            <label>
              ML export or cluster summary
              <input type="file" accept=".csv,.json" onChange={handleDatasetSelection(setModelFileName)} />
              <span>{modelFileName}</span>
            </label>
            <button type="submit">Load latest dataset</button>
          </form>

          <p className="final-project-loaded-at">Last load attempt: {lastLoadedAt}</p>

          <div
            style={{
              marginTop: 12,
              padding: 12,
              borderRadius: 8,
              border: '1px solid #d1d5db',
              backgroundColor: '#f9fafb',
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>No data yet? Generate sample batch</div>
            <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 10 }}>
              Creates schema-compatible JSON with enough volume for ADF and K-means testing.
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <label style={{ fontSize: 12, color: '#374151' }}>
                Target events
                <select
                  value={sampleTargetSize}
                  onChange={(event) => setSampleTargetSize(Number(event.target.value))}
                  style={{ marginLeft: 8, padding: '6px 8px', borderRadius: 6, border: '1px solid #cbd5e1' }}
                >
                  <option value={300}>300</option>
                  <option value={500}>500</option>
                  <option value={1000}>1000</option>
                </select>
              </label>
              <button type="button" onClick={handleGenerateSampleData}>Generate sample JSON</button>
            </div>
            {sampleGenerationMessage && (
              <div style={{ marginTop: 10, fontSize: 12, color: '#065f46' }}>{sampleGenerationMessage}</div>
            )}
          </div>
        </article>
      </section>

      {/* Engagement Dashboard Section */}
      <section className="final-project-panel" id="engagement-dashboard">
        <div className="panel-heading">
          <h2>Engagement Dashboard</h2>
          <p>Live productivity tier and activity analytics (demo data).</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px', marginBottom: '24px' }}>
          {/* Engagement Tier Card */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#374151' }}>Current Tier</h3>
            {metricsLoading ? (
              <div style={{ fontSize: '14px', color: '#6b7280' }}>Loading engagement data...</div>
            ) : engagementTier ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <EngagementTierBadge engagementTier={engagementTier} metrics={metrics} size="large" />
                <div style={{ fontSize: '13px', color: '#6b7280', lineHeight: '1.5' }}>
                  <div>Total notes: <strong>{engagementTier.total_notes}</strong></div>
                  <div>Total edits: <strong>{engagementTier.total_edits}</strong></div>
                  <div>Sessions: <strong>{engagementTier.total_sessions}</strong></div>
                </div>
              </div>
            ) : null}
          </div>

          {/* Activity Chart */}
          <div>
            <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '12px' }}>
              Activity Metrics
            </h3>
            {metrics && <EngagementChart metrics={metrics} />}
          </div>
        </div>

        {/* Activity Export and Controls */}
        <div
          style={{
            padding: '12px',
            backgroundColor: '#f3f4f6',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ fontSize: '13px', color: '#6b7280' }}>
            <strong>{getEventCount()}</strong> activity events captured in this session
          </div>
          <button
            onClick={handleExportToAzure}
            disabled={exportingToAzure}
            style={{
              padding: '6px 12px',
              backgroundColor: exportingToAzure ? '#9ca3af' : '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '13px',
              fontWeight: '600',
              cursor: exportingToAzure ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.2s ease',
            }}
            onMouseEnter={(e) => {
              if (!exportingToAzure) e.currentTarget.style.backgroundColor = '#2563eb'
            }}
            onMouseLeave={(e) => {
              if (!exportingToAzure) e.currentTarget.style.backgroundColor = '#3b82f6'
            }}
          >
            {exportingToAzure ? 'Exporting...' : 'Export to Azure'}
          </button>
        </div>
        {exportMessage && (
          <div
            style={{
              marginTop: '10px',
              padding: '8px 10px',
              backgroundColor: exportMessage.includes('✓') ? '#f0fdf4' : '#fef2f2',
              borderRadius: '4px',
              fontSize: '12px',
              color: exportMessage.includes('✓') ? '#166534' : '#991b1b',
              borderLeft: `3px solid ${exportMessage.includes('✓') ? '#22c55e' : '#ef4444'}`,
            }}
          >
            {exportMessage}
          </div>
        )}
      </section>

      <section className="final-project-panel" id="pipeline">
        <div className="panel-heading panel-heading-row">
          <div>
            <h2>Azure Data Pipeline</h2>
            <p>Search the workflow and see the end-to-end path from raw events to dashboard.</p>
          </div>

          <label className="final-project-search">
            Search workflow
            <input
              type="search"
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              placeholder="activity"
            />
          </label>
        </div>

        <div className="final-project-table-wrap">
          <table className="final-project-table">
            <thead>
              <tr>
                <th>Step</th>
                <th>Azure component</th>
                <th>Purpose</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row) => (
                <tr key={row[0]}>
                  <td>{row[0]}</td>
                  <td>{row[1]}</td>
                  <td>{row[2]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="final-project-grid triple">
        <article className="final-project-panel">
          <div className="panel-heading">
            <h2>Dashboard View</h2>
            <p>What the in-app analytics experience should show users.</p>
          </div>

          <div className="final-project-chart-block">
            <h3>Activity trend</h3>
            {activityBars.map((bar) => (
              <div key={bar.label} className="final-project-bar-row">
                <span>{bar.label}</span>
                <div className="final-project-bar-track">
                  <div className="final-project-bar" style={{ width: `${bar.value}%` }} />
                </div>
                <strong>{formatPercent(bar.value)}</strong>
              </div>
            ))}
          </div>
        </article>

        <article className="final-project-panel">
          <div className="panel-heading">
            <h2>Engagement Surface</h2>
            <p>Productivity tiers and collaboration output.</p>
          </div>

          <div className="final-project-chart-block">
            <h3>Productivity tiers</h3>
            {tierBars.map((bar) => (
              <div key={bar.label} className="final-project-bar-row">
                <span>{bar.label}</span>
                <div className="final-project-bar-track">
                  <div className="final-project-bar alt" style={{ width: `${bar.value}%` }} />
                </div>
                <strong>{formatPercent(bar.value)}</strong>
              </div>
            ))}
          </div>

          <div className="final-project-chip-row">
            <span>Notes created</span>
            <span>Session length</span>
            <span>Collaboration events</span>
          </div>
        </article>

        <article className="final-project-panel">
          <div className="panel-heading">
            <h2>Proposal Highlights</h2>
            <p>The short version of the DoodleDesk Azure plan.</p>
          </div>

          <ul className="final-project-list">
            <li>Track note creation, edits, active minutes, and collaboration events.</li>
            <li>Store raw data in Blob Storage, then process it with Azure Data Factory.</li>
            <li>Train K-means in Azure Machine Learning and use silhouette score for validation.</li>
            <li>Show the resulting productivity tier inside the DoodleDesk interface.</li>
          </ul>

          <p className="final-project-note">
            Optional extension: you can add a small public retail dataset later if you want a second validation
            source, but the primary scope is the DoodleDesk analytics pipeline.
          </p>
        </article>
      </section>

      <section className="final-project-panel">
        <div className="panel-heading">
          <h2>ML Model Write-Up</h2>
          <p>Short model notes that satisfy the assignment and support the proposal.</p>
        </div>

        <div className="final-project-model-grid">
          {modelWriteUp.map((entry) => (
            <article key={entry.title} className="final-project-model-card">
              <h3>{entry.title}</h3>
              <p>{entry.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="final-project-panel" id="submission-checklist">
        <div className="panel-heading">
          <h2>Assignment Coverage</h2>
          <p>This page maps the implementation to the final assignment requirements.</p>
        </div>

        <div className="final-project-checklist">
          {rubricCoverage.map((item) => (
            <div key={item.title}>
              <strong>{item.title}</strong>
              <span>{item.detail}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="final-project-panel">
        <div className="panel-heading">
          <h2>What to include in the submission file</h2>
          <p>Use this as the checklist for the upload box, screenshots, and write-up.</p>
        </div>

        <ul className="final-project-list">
          {checklistItems.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      {/* Activity Export Dialog */}
      <ActivityExportDialog
        isOpen={exportDialogOpen}
        onClose={() => setExportDialogOpen(false)}
        onExport={handleExportActivity}
        eventCount={getEventCount()}
      />
    </main>
  )
}