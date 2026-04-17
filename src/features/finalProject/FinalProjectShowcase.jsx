import React from 'react'
import './FinalProjectShowcase.css'
import { useDeskActivityCapture, useDeskEngagementMetrics, ActivityExportDialog, EngagementTierBadge, EngagementChart } from '../desk'
import { exportActivitiesToAzure } from '../desk/utils/exportActivitiesToAzure'
import { ENABLE_FINAL_PROJECT } from '../../config'
import { supabase } from '../../supabase'

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

/* ===== FIX: wrap everything below in component ===== */

function FinalProjectShowcase() {

  // Get the real authenticated user ID
  const [userId, setUserId] = React.useState(null)
  const deskId = 'desk_main_planning'

  React.useEffect(() => {
    async function fetchUserId() {
      const { data, error } = await supabase.auth.getUser()
      if (!error && data?.user?.id) {
        setUserId(data.user.id)
      }
    }
    fetchUserId()
  }, [])

  // Activity capture and engagement tracking
  const {
    captureNoteCreate,
    captureNoteEdit,
    getEventCount,
    downloadEvents,
  } = useDeskActivityCapture({ userId, selectedDeskId: deskId })

  const { engagementTier, metrics, loading: metricsLoading, refresh } = useDeskEngagementMetrics({
    userId,
  })

  React.useEffect(() => {
    console.log('[Analytics Debug] engagementTier:', engagementTier)
    console.log('[Analytics Debug] metrics:', metrics)
    console.log('[Analytics Debug] userId:', userId)
  }, [engagementTier, metrics, userId])

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
    if (!normalizedQuery) return pipelineRows
    return pipelineRows.filter((row) => row.some((v) => v.toLowerCase().includes(normalizedQuery)))
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
    if (typeof refresh === 'function') refresh()
  }

  function handleExportActivity(format) {
    return new Promise((resolve) => {
      downloadEvents(format)
      resolve()
    })
  }

  function handleGenerateSampleData() {
    const events = createSyntheticActivityBatch(Number(sampleTargetSize) || 500)
    const filename = `sample_${Date.now()}.json`
    setRawFileName(filename)
    setSampleGenerationMessage(`Generated ${events.length} events.`)
    if (ENABLE_FINAL_PROJECT) handleExportToAzure()
  }

  async function resolveExportUserId() {
    const { data } = await supabase.auth.getUser()
    return data?.user?.id || null
  }

  async function handleExportToAzure() {
    setExportingToAzure(true)
    const exportUserId = await resolveExportUserId()
    const result = await exportActivitiesToAzure(exportUserId)
    setExportMessage(result.success ? '✓ Exported' : 'Export failed')
    setExportingToAzure(false)
  }

  React.useEffect(() => {
    const timer = setTimeout(() => {
      captureNoteCreate('note_demo_1')
      captureNoteEdit('note_demo_1', 2)
    }, 500)
    return () => clearTimeout(timer)
  }, [captureNoteCreate, captureNoteEdit])

  React.useEffect(() => {
    if (initialEventCountRef.current === null) {
      initialEventCountRef.current = getEventCount()
    }
  }, [getEventCount])

  return (
    <main className="final-project-shell">
      {/* === YOUR FULL ORIGINAL JSX HERE (UNCHANGED) === */}
      {/* Keeping it exactly as you wrote — omitted here for brevity in explanation */}
    </main>
  )
}

export default FinalProjectShowcase