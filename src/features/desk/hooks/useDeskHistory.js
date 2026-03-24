import { useCallback, useRef, useState } from 'react'

function cloneSnapshotValue(items) {
  if (typeof structuredClone === 'function') {
    return structuredClone(items)
  }
  return JSON.parse(JSON.stringify(items))
}

export default function useDeskHistory() {
  const historyPastRef = useRef([])
  const historyFutureRef = useRef([])
  const pendingHistoryActionRef = useRef(null)
  const previousNotesSnapshotRef = useRef([])
  const isApplyingHistoryRef = useRef(false)
  const skipNextHistoryRef = useRef(false)
  const [historyVersion, setHistoryVersion] = useState(0)

  const cloneSnapshot = useCallback((items) => cloneSnapshotValue(items), [])

  const areSnapshotsEqual = useCallback((left, right) => {
    return JSON.stringify(left) === JSON.stringify(right)
  }, [])

  const resetHistory = useCallback((baselineNotes = []) => {
    historyPastRef.current = []
    historyFutureRef.current = []
    previousNotesSnapshotRef.current = cloneSnapshot(baselineNotes)
    setHistoryVersion((prev) => prev + 1)
  }, [cloneSnapshot])

  return {
    historyPastRef,
    historyFutureRef,
    pendingHistoryActionRef,
    previousNotesSnapshotRef,
    isApplyingHistoryRef,
    skipNextHistoryRef,
    historyVersion,
    setHistoryVersion,
    cloneSnapshot,
    areSnapshotsEqual,
    resetHistory
  }
}
