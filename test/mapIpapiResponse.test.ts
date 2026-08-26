import { describe, it, expect } from 'vitest'
import { mapIpapiResponse } from '../server/utils/mapIpapiResponse'

describe('mapIpapiResponse', () => {
  it('maps a well-formed ipapi.co response', () => {
    const geo = mapIpapiResponse({
      city: 'Mountain View',
      region: 'California',
      country_name: 'United States',
      country_code: 'US',
      timezone: 'America/Los_Angeles',
      org: 'GOOGLE',
      latitude: 37.386,
      longitude: -122.0838,
    })
    expect(geo).toEqual({
      city: 'Mountain View',
      region: 'California',
      country: 'United States',
      countryCode: 'US',
      timezone: 'America/Los_Angeles',
      org: 'GOOGLE',
      lat: 37.386,
      lon: -122.0838,
    })
  })

  it('returns null when upstream reports an error', () => {
    expect(mapIpapiResponse({ error: true, reason: 'RateLimited' })).toBeNull()
  })

  it('returns null for malformed/non-object input', () => {
    expect(mapIpapiResponse(null)).toBeNull()
    expect(mapIpapiResponse(undefined)).toBeNull()
    expect(mapIpapiResponse('oops')).toBeNull()
  })

  it('falls back to null for missing individual fields', () => {
    const geo = mapIpapiResponse({ city: 'Berlin' })
    expect(geo).toEqual({
      city: 'Berlin',
      region: null,
      country: null,
      countryCode: null,
      timezone: null,
      org: null,
      lat: null,
      lon: null,
    })
  })
})
