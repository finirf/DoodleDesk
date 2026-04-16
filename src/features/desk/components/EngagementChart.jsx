import React from 'react'

/**
 * Displays engagement metrics with simple ASCII-style bar charts.
 * Shows activity over time and breakdown by activity type.
 */
export default function EngagementChart({ metrics }) {
  if (!metrics) return null

  const { daily_breakdown: dailyData, summary } = metrics

  // Calculate max values for scaling
  const maxDailyEdits = Math.max(...(dailyData?.map((d) => d.edits) || [1]))

  const activityTypes = [
    { key: 'notes', label: 'Notes', color: '#3b82f6', value: summary.week_total_notes },
    { key: 'edits', label: 'Edits', color: '#8b5cf6', value: summary.week_total_edits },
    { key: 'collaborations', label: 'Collaborations', color: '#ec4899', value: summary.week_total_collaborations },
  ]

  const maxActivityValue = Math.max(...activityTypes.map((a) => a.value))

  return (
    <div style={{ padding: '16px 0' }}>
      {/* Activity Breakdown Chart */}
      <section style={{ marginBottom: '32px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: '#374151' }}>
          This Week's Activity
        </h3>
        <div style={{ display: 'flex', gap: '32px' }}>
          {activityTypes.map((activity) => {
            const percent = maxActivityValue > 0 ? (activity.value / maxActivityValue) * 100 : 0
            return (
              <div key={activity.key} style={{ flex: 1 }}>
                <div style={{ fontSize: '12px', marginBottom: '6px', color: '#6b7280' }}>{activity.label}</div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    height: '24px',
                    backgroundColor: '#f3f4f6',
                    borderRadius: '4px',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: `${percent}%`,
                      backgroundColor: activity.color,
                      transition: 'width 0.3s ease',
                    }}
                  />
                </div>
                <div style={{ fontSize: '13px', fontWeight: '600', marginTop: '4px', color: '#1f2937' }}>
                  {activity.value}
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* Daily Trend Chart */}
      <section>
        <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: '#374151' }}>
          Daily Trends (Last 7 Days)
        </h3>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end', height: '140px' }}>
          {dailyData?.map((day) => {
            const totalActivity = day.notes + day.edits + day.collaborations
            const normalizedHeight = maxDailyEdits > 0 ? (totalActivity / (maxDailyEdits * 1.5)) * 100 : 0

            return (
              <div
                key={day.date}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  position: 'relative',
                }}
              >
                {/* Bar chart */}
                <div
                  style={{
                    width: '100%',
                    height: `${Math.min(normalizedHeight, 100)}%`,
                    backgroundColor: '#6366f1',
                    borderRadius: '3px 3px 0 0',
                    transition: 'all 0.2s ease',
                    cursor: 'pointer',
                    minHeight: normalizedHeight > 5 ? '2px' : '0px',
                  }}
                  title={`${day.date}: ${day.notes} notes, ${day.edits} edits, ${day.collaborations} collabs`}
                />

                {/* Date label */}
                <div style={{ fontSize: '11px', marginTop: '8px', color: '#6b7280' }}>
                  {day.date.split('-').slice(1).join('/')}
                </div>
              </div>
            )
          })}
        </div>
        <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '12px' }}>
          Based on combined notes, edits, and collaboration events
        </div>
      </section>

      {/* Summary Stats */}
      <section style={{ marginTop: '24px', padding: '12px', backgroundColor: '#f9fafb', borderRadius: '6px' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
            gap: '16px',
          }}
        >
          <div>
            <div style={{ fontSize: '12px', color: '#6b7280' }}>Avg daily notes</div>
            <div style={{ fontSize: '18px', fontWeight: '600', color: '#1f2937' }}>
              {Math.round(summary.avg_daily_notes)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#6b7280' }}>Peak daily edits</div>
            <div style={{ fontSize: '18px', fontWeight: '600', color: '#1f2937' }}>
              {summary.max_daily_edits}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#6b7280' }}>Total this week</div>
            <div style={{ fontSize: '18px', fontWeight: '600', color: '#1f2937' }}>
              {summary.week_total_notes + summary.week_total_edits}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
