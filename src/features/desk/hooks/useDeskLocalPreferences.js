import { useEffect } from 'react'

export default function useDeskLocalPreferences({
  selectedDeskId,
  lastDeskStorageKey,
  snapPrefsStorageKey,
  snapToGrid,
  setSnapToGrid
}) {
  useEffect(() => {
    if (!selectedDeskId) return
    localStorage.setItem(lastDeskStorageKey, String(selectedDeskId))
  }, [lastDeskStorageKey, selectedDeskId])

  useEffect(() => {
    try {
      const storedValue = localStorage.getItem(snapPrefsStorageKey)
      if (storedValue === '1') {
        setSnapToGrid(true)
      } else if (storedValue === '0') {
        setSnapToGrid(false)
      } else {
        setSnapToGrid(false)
      }
    } catch (error) {
      console.error('Failed to load snap-to-grid preference:', error)
      setSnapToGrid(false)
    }
  }, [setSnapToGrid, snapPrefsStorageKey])

  useEffect(() => {
    try {
      localStorage.setItem(snapPrefsStorageKey, snapToGrid ? '1' : '0')
    } catch (error) {
      console.error('Failed to save snap-to-grid preference:', error)
    }
  }, [snapPrefsStorageKey, snapToGrid])
}