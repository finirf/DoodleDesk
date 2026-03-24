import { useMemo } from 'react'

/**
 * useDeskUiConfig
 *
 * Provides centralized UI configuration values including sizing thresholds,
 * z-index layers, and storage key patterns used throughout the desk application.
 * These constants are stable across the application lifetime.
 */
export default function useDeskUiConfig({ userId }) {
  return useMemo(() => ({
    // Sizing thresholds for layout behavior
    growThreshold: 180,
    gridSize: 20,
    
    // Z-index layers for layered UI elements
    menuLayerZIndex: 6000,
    menuPanelZIndex: 6001,
    
    // Storage key patterns
    lastDeskStorageKey: `doodledesk:lastDesk:${userId}`,
    shelfPrefsStorageKey: `doodledesk:deskShelves:${userId}`,
    snapPrefsStorageKey: `doodledesk:snapToGrid:${userId}`
  }), [userId])
}
