/**
 * Timezone conversion — pure, DOM-free logic (unit-tested in `test/`).
 * Built on the Intl API (available in browsers and Node), so it needs no
 * timezone database of our own and stays correct across DST.
 *
 * Flow: a wall-clock time typed in a source zone → a single UTC instant →
 * re-rendered as the wall-clock time in every target zone.
 */

export interface TimeZoneMeta {
  /** IANA identifier, e.g. "America/New_York". */
  id: string
  /** Friendly city label, e.g. "New York". */
  label: string
}

/** A curated spread of well-known zones, roughly west → east. */
export const TIME_ZONES: TimeZoneMeta[] = [
  { id: 'Pacific/Honolulu', label: 'Honolulu' },
  { id: 'America/Anchorage', label: 'Anchorage' },
  { id: 'America/Los_Angeles', label: 'Los Angeles' },
  { id: 'America/Denver', label: 'Denver' },
  { id: 'America/Chicago', label: 'Chicago' },
  { id: 'America/New_York', label: 'New York' },
  { id: 'America/Sao_Paulo', label: 'São Paulo' },
  { id: 'UTC', label: 'UTC' },
  { id: 'Europe/London', label: 'London' },
  { id: 'Europe/Paris', label: 'Paris' },
  { id: 'Europe/Athens', label: 'Athens' },
  { id: 'Africa/Johannesburg', label: 'Johannesburg' },
  { id: 'Asia/Dubai', label: 'Dubai' },
  { id: 'Asia/Kolkata', label: 'Kolkata' },
  { id: 'Asia/Bangkok', label: 'Bangkok' },
  { id: 'Asia/Shanghai', label: 'Shanghai' },
  { id: 'Asia/Tokyo', label: 'Tokyo' },
  { id: 'Australia/Sydney', label: 'Sydney' },
  { id: 'Pacific/Auckland', label: 'Auckland' },
]

/** Milliseconds a `timeZone` is ahead of UTC at a given UTC `instant`. */
export function zoneOffsetMs(instant: number, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
  const parts = dtf.formatToParts(new Date(instant))
  const get = (t: string) => Number(parts.find((p) => p.type === t)!.value)
  const asIfUtc = Date.UTC(
    get('year'),
    get('month') - 1,
    get('day'),
    get('hour'),
    get('minute'),
    get('second'),
  )
  return asIfUtc - instant
}

/**
 * Turn a wall-clock time (as typed) in `timeZone` into a UTC instant (ms).
 * Resolves the zone's offset iteratively so DST transitions land correctly.
 */
export function zonedTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string,
): number {
  const naive = Date.UTC(year, month - 1, day, hour, minute)
  let offset = zoneOffsetMs(naive, timeZone)
  let instant = naive - offset
  const offset2 = zoneOffsetMs(instant, timeZone)
  if (offset2 !== offset) {
    offset = offset2
    instant = naive - offset
  }
  return instant
}

export interface ZonedResult extends TimeZoneMeta {
  /** e.g. "Mon, Jan 15, 2024". */
  date: string
  /** e.g. "07:00". */
  time: string
  /** e.g. "GMT-5". */
  offset: string
}

/** Render a UTC `instant` as the wall-clock time in `zone`. */
export function formatInZone(instant: number, zone: TimeZoneMeta): ZonedResult {
  const d = new Date(instant)
  const date = new Intl.DateTimeFormat('en-US', {
    timeZone: zone.id,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(d)
  const time = new Intl.DateTimeFormat('en-GB', {
    timeZone: zone.id,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(d)
  const offsetPart = new Intl.DateTimeFormat('en-US', {
    timeZone: zone.id,
    timeZoneName: 'shortOffset',
  })
    .formatToParts(d)
    .find((p) => p.type === 'timeZoneName')
  return { ...zone, date, time, offset: offsetPart ? offsetPart.value : 'UTC' }
}

/**
 * Convert a wall-clock time in `fromZoneId` to every zone in `zones`.
 * Returns the resolved UTC instant plus one formatted row per zone.
 */
export function convertZones(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  fromZoneId: string,
  zones: TimeZoneMeta[] = TIME_ZONES,
): { instant: number; results: ZonedResult[] } {
  const instant = zonedTimeToUtc(year, month, day, hour, minute, fromZoneId)
  return { instant, results: zones.map((z) => formatInZone(instant, z)) }
}
