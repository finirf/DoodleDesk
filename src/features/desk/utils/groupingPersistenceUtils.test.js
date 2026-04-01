import test from 'node:test'
import assert from 'node:assert/strict'
import {
  hasGroupMapDiff,
  mergePendingGroupMap,
  pruneSingletonGroups
} from './groupingPersistenceUtils.js'

test('pruneSingletonGroups removes one-item groups unless preserved', () => {
  const input = {
    n1: 'g1',
    n2: 'g1',
    n3: 'g2'
  }

  const pruned = pruneSingletonGroups(input)
  assert.deepEqual(pruned, { n1: 'g1', n2: 'g1' })

  const preserved = pruneSingletonGroups(input, 'g2')
  assert.deepEqual(preserved, input)
})

test('mergePendingGroupMap merges and normalizes singleton groups', () => {
  const merged = mergePendingGroupMap(
    { n1: 'g1', n2: 'g1' },
    { n3: 'g3' }
  )

  assert.deepEqual(merged, { n1: 'g1', n2: 'g1' })
})

test('hasGroupMapDiff detects map equality and changes', () => {
  const left = { a: 'g1', b: 'g1' }
  const same = { a: 'g1', b: 'g1' }
  const different = { a: 'g1', b: 'g2' }

  assert.equal(hasGroupMapDiff(left, same), false)
  assert.equal(hasGroupMapDiff(left, different), true)
})
