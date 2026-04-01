import test from 'node:test'
import assert from 'node:assert/strict'
import { buildChecklistPersistencePlan } from './checklistPersistenceUtils.js'

test('buildChecklistPersistencePlan splits existing/new items and tracks removals', () => {
  const plan = buildChecklistPersistencePlan({
    checklistEditItems: [
      { id: 'a1', text: 'Keep existing', is_checked: true, due_at: null },
      { text: 'Brand new', is_checked: false, due_at: ' 2026-04-01 ' }
    ],
    existingItems: [
      { id: 'a1', text: 'Old existing' },
      { id: 'b2', text: 'To delete' }
    ],
    normalizeReminder: (value) => String(value || '').trim() || null
  })

  assert.equal(plan.nextItems.length, 2)
  assert.equal(plan.existingChecklistItems.length, 1)
  assert.equal(plan.newChecklistItems.length, 1)
  assert.deepEqual(plan.removedItemIds, ['b2'])
  assert.equal(plan.existingChecklistItems[0].id, 'a1')
  assert.equal(plan.newChecklistItems[0].id, undefined)
  assert.equal(plan.newChecklistItems[0].due_at, '2026-04-01')
})

test('buildChecklistPersistencePlan filters blank checklist lines', () => {
  const plan = buildChecklistPersistencePlan({
    checklistEditItems: [
      { text: '   ' },
      { text: 'Valid line' }
    ],
    existingItems: []
  })

  assert.equal(plan.nextItems.length, 1)
  assert.equal(plan.nextItems[0].text, 'Valid line')
  assert.deepEqual(plan.removedItemIds, [])
})
