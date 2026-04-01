export function pruneSingletonGroups(groupMap, preserveGroupId = null) {
  const inputMap = groupMap || {}
  const groupCounts = {}

  Object.values(inputMap).forEach((groupId) => {
    if (!groupId) return
    groupCounts[groupId] = (groupCounts[groupId] || 0) + 1
  })

  const nextMap = {}
  Object.entries(inputMap).forEach(([itemKey, groupId]) => {
    if (!groupId) return
    if (groupCounts[groupId] > 1 || groupId === preserveGroupId) {
      nextMap[itemKey] = groupId
    }
  })

  return nextMap
}

export function mergePendingGroupMap(currentMap, pendingMap, preserveGroupId = null) {
  return pruneSingletonGroups({ ...(currentMap || {}), ...(pendingMap || {}) }, preserveGroupId)
}

export function hasGroupMapDiff(leftMap, rightMap) {
  const left = leftMap || {}
  const right = rightMap || {}

  const leftKeys = Object.keys(left)
  const rightKeys = Object.keys(right)
  if (leftKeys.length !== rightKeys.length) return true

  return leftKeys.some((key) => left[key] !== right[key])
}
