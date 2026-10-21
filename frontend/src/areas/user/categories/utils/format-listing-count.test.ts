import { describe, expect, it } from 'vitest'
import { formatListingCount } from './format-listing-count'

describe('formatListingCount (RN-CAT-02)', () => {
  it.each([
    [0, '0 anúncios'],
    [1, '1 anúncio'],
    [2, '2 anúncios'],
    [48, '48 anúncios'],
  ])('%i → %s', (count, expected) => {
    expect(formatListingCount(count)).toBe(expected)
  })
})
