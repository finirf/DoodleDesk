export async function loadMergedDesksForUser({ supabase, userId }) {
  const { data: ownedDesks, error: ownedError } = await supabase
    .from('desks')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })

  if (ownedError) {
    throw new Error(`Failed to fetch owned desks: ${ownedError.message || 'unknown error'}`)
  }

  let sharedDesks = []
  const { data: membershipRows, error: membershipError } = await supabase
    .from('desk_members')
    .select('desk_id')
    .eq('user_id', userId)

  if (!membershipError) {
    const ownedDeskIds = new Set((ownedDesks || []).map((desk) => desk.id))
    const sharedDeskIds = (membershipRows || [])
      .map((row) => row.desk_id)
      .filter((deskId) => deskId && !ownedDeskIds.has(deskId))

    if (sharedDeskIds.length > 0) {
      const { data: loadedSharedDesks, error: sharedDesksError } = await supabase
        .from('desks')
        .select('*')
        .in('id', sharedDeskIds)
        .order('created_at', { ascending: true })

      if (!sharedDesksError) {
        sharedDesks = loadedSharedDesks || []
      }
    }
  }

  const mergedDeskMap = new Map()
  ;[...(ownedDesks || []), ...sharedDesks].forEach((desk) => {
    if (desk?.id) mergedDeskMap.set(desk.id, desk)
  })

  return Array.from(mergedDeskMap.values()).sort((a, b) => {
    const left = a?.created_at ? new Date(a.created_at).getTime() : 0
    const right = b?.created_at ? new Date(b.created_at).getTime() : 0
    return left - right
  })
}