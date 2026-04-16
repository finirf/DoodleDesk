import React from 'react'

/**
 * Displays user's engagement tier with visual indicators and breakdown tooltip.
 */
export default function EngagementTierBadge({ engagementTier, metrics, size = 'medium' }) {
  if (!engagementTier) return null

  const totalNotes = Number(engagementTier.total_notes || 0)
  const totalEdits = Number(engagementTier.total_edits || 0)
  const totalSessions = Number(engagementTier.total_sessions || 0)
  const averageSessionSeconds = Number(engagementTier.avg_session_duration_seconds || 0)
  const score = Number(engagementTier.engagement_score || 0)

  const tierConfig = {
    low: { color: '#ef4444', emoji: '🔴', label: 'Low Engagement', textColor: '#7f1d1d' },
    medium: { color: '#eab308', emoji: '🟡', label: 'Medium Engagement', textColor: '#713f12' },
    high: { color: '#22c55e', emoji: '🟢', label: 'High Engagement', textColor: '#15803d' },
  }

  const config = tierConfig[engagementTier.engagement_tier] || tierConfig.low
  const sizeConfig = {
    small: { fontSize: '12px', padding: '4px 8px', badgeSize: '16px' },
    medium: { fontSize: '14px', padding: '6px 12px', badgeSize: '20px' },
    large: { fontSize: '16px', padding: '8px 16px', badgeSize: '24px' },
  }

  const size_styles = sizeConfig[size] || sizeConfig.medium

  const tooltipContent = metrics?.engagement_tier && (
    <div style={{ fontSize: '12px', lineHeight: '1.4', whiteSpace: 'nowrap' }}>
      <div style={{ fontWeight: '600', marginBottom: '6px' }}>
        {config.emoji} {config.label}
      </div>
      <div>Score: {score}%</div>
      <div>Notes: {totalNotes}</div>
      <div>Edits: {totalEdits}</div>
      <div>Sessions: {totalSessions}</div>
      <div style={{ marginTop: '6px', paddingTop: '6px', borderTop: '1px solid #ddd' }}>
        Avg session: {Math.round(averageSessionSeconds / 60)} min
      </div>
    </div>
  )

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        padding: size_styles.padding,
        backgroundColor: `${config.color}15`,
        border: `1px solid ${config.color}40`,
        borderRadius: '6px',
        fontSize: size_styles.fontSize,
        fontWeight: '500',
        color: config.textColor,
        position: 'relative',
        cursor: 'help',
        transition: 'all 0.2s ease',
      }}
      title={tooltipContent ? undefined : config.label}
    >
      <span style={{ fontSize: size_styles.badgeSize, lineHeight: '1' }}>{config.emoji}</span>
      <span>{config.label}</span>

      {/* Tooltip (simple hover) */}
      {tooltipContent && (
        <div
          style={{
            position: 'absolute',
            bottom: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            marginBottom: '8px',
            padding: '8px 12px',
            backgroundColor: '#1f2937',
            color: '#f3f4f6',
            borderRadius: '6px',
            opacity: '0',
            pointerEvents: 'none',
            transition: 'opacity 0.2s ease',
            zIndex: 1000,
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          }}
          className="engagement-tier-tooltip"
        >
          {tooltipContent}
        </div>
      )}

      <style>{`
        div:hover .engagement-tier-tooltip {
          opacity: 1;
          pointer-events: auto;
        }
      `}</style>
    </div>
  )
}
