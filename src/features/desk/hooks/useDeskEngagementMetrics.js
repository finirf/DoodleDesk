import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../../../supabase'

function buildEstimatedDailyBreakdown({ totalNotes, totalEdits, totalCollaborations }) {
  const days = [6, 5, 4, 3, 2, 1, 0].map((offset) => {
    const date = new Date(Date.now() - offset * 24 * 60 * 60 * 1000)
    return date.toISOString().slice(0, 10)
  })

  const baseNotes = Math.floor(totalNotes / 7)
  const baseEdits = Math.floor(totalEdits / 7)
  const baseCollaborations = Math.floor(totalCollaborations / 7)

  return days.map((date, index) => ({
    date,
    notes: baseNotes + (index < totalNotes % 7 ? 1 : 0),
    edits: baseEdits + (index < totalEdits % 7 ? 1 : 0),
    collaborations: baseCollaborations + (index < totalCollaborations % 7 ? 1 : 0),
  }))
}

function normalizeTierRow(row) {
  if (!row) return null

  return {
    user_id: row.user_id,
    engagement_tier: row.engagement_tier || 'low',
    engagement_score: Number(row.engagement_score || 0),
    total_notes: Number(row.total_notes || 0),
    total_edits: Number(row.total_edits || 0),
    total_sessions: Number(row.total_sessions || 0),
    avg_session_duration_seconds: Number(row.avg_session_duration_seconds || 0),
    collaboration_events: Number(row.collaboration_events ?? row.collaboration_count ?? 0),
    cluster_center_index: Number(row.cluster_center_index ?? row.cluster ?? 0),
    last_activity_ts: row.last_activity_ts || row.updated_at || row.assigned_at || null,
  }
}

function summarizeMetrics({ tierRow, metricsRow }) {
  const noteTotal = Number(metricsRow?.total_notes ?? tierRow?.total_notes ?? 0)
  const editTotal = Number(metricsRow?.total_edits ?? tierRow?.total_edits ?? 0)
  const collaborationTotal = Number(
    metricsRow?.collaboration_count ?? tierRow?.collaboration_events ?? 0
  )

  const dailyBreakdown = Array.isArray(metricsRow?.daily_breakdown)
    ? metricsRow.daily_breakdown
    : buildEstimatedDailyBreakdown({
      totalNotes: noteTotal,
      totalEdits: editTotal,
      totalCollaborations: collaborationTotal,
    })

  return {
    daily_breakdown: dailyBreakdown,
    summary: {
      week_total_notes: dailyBreakdown.reduce((sum, day) => sum + Number(day.notes || 0), 0),
      week_total_edits: dailyBreakdown.reduce((sum, day) => sum + Number(day.edits || 0), 0),
      week_total_collaborations: dailyBreakdown.reduce(
        (sum, day) => sum + Number(day.collaborations || 0),
        0
      ),
      avg_daily_notes:
        dailyBreakdown.length > 0
          ? dailyBreakdown.reduce((sum, day) => sum + Number(day.notes || 0), 0) / dailyBreakdown.length
          : 0,
      max_daily_edits:
        dailyBreakdown.length > 0
          ? Math.max(...dailyBreakdown.map((day) => Number(day.edits || 0)))
          : 0,
    },
  }
}

/**
 * Hook to fetch and manage user engagement metrics from backend.
 * Loads user's engagement tier, activity metrics, and recent trends.
 */
export default function useDeskEngagementMetrics({ userId }) {
  const [engagementTier, setEngagementTier] = useState(null)
  const [metrics, setMetrics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Fetch engagement metrics from backend
  const fetchEngagementMetrics = useCallback(async () => {
    if (!userId) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      let { data: tierRow, error: tierError } = await supabase
        .from('user_engagement_tiers')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle()

      // Demo fallback: if the provided user has no tier yet, show any available row.
      if (!tierRow && !tierError) {
        const fallback = await supabase
          .from('user_engagement_tiers')
          .select('*')
          .limit(1)
          .maybeSingle()
        tierRow = fallback.data
        tierError = fallback.error
      }

      if (tierError) {
        throw new Error(`Failed to fetch engagement tier: ${tierError.message || 'unknown error'}`)
      }

      if (!tierRow) {
        setEngagementTier(null)
        setMetrics(null)
        return
      }

      const normalizedTier = normalizeTierRow(tierRow)
      setEngagementTier(normalizedTier)

      let metricsRow = null
      const metricsResult = await supabase
        .from('user_engagement_metrics')
        .select('*')
        .eq('user_id', normalizedTier.user_id)
        .maybeSingle()

      if (!metricsResult.error) {
        metricsRow = metricsResult.data
      }

      setMetrics({
        engagement_tier: normalizedTier,
        ...summarizeMetrics({ tierRow: normalizedTier, metricsRow }),
      })
    } catch (err) {
      console.error('Error fetching engagement metrics:', err)
      setError(err.message)
      setMetrics(null)
      setEngagementTier(null)
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    fetchEngagementMetrics()
  }, [fetchEngagementMetrics])

  // Refresh metrics (manual trigger)
  const refresh = useCallback(() => {
    fetchEngagementMetrics()
  }, [fetchEngagementMetrics])

  return {
    engagementTier,
    metrics,
    loading,
    error,
    refresh,
  }
}
