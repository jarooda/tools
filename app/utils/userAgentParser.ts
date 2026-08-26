/**
 * User-Agent string parser — pure, DOM-free logic (unit-tested in `test/`).
 * Wraps `ua-parser-js` (MIT-licensed 1.x line — pin to `^1.0.41`, do not
 * upgrade to 2.x, which relicensed to AGPL-3.0-or-later) and normalizes its
 * output into a fixed shape with `null` in place of undefined/empty fields.
 */
import { UAParser } from 'ua-parser-js'

export type DeviceType = 'desktop' | 'mobile' | 'tablet' | 'bot' | null

export interface ParsedUserAgent {
  browser: { name: string | null; version: string | null }
  os: { name: string | null; version: string | null }
  device: { type: DeviceType; vendor: string | null; model: string | null }
  engine: { name: string | null; version: string | null }
}

const BOT_PATTERN = /bot|crawl|spider|slurp|archiver|fetcher/i

function toNullable(value: string | undefined): string | null {
  return value ? value : null
}

export function parseUserAgent(uaString: string): ParsedUserAgent {
  if (!uaString.trim()) {
    return {
      browser: { name: null, version: null },
      os: { name: null, version: null },
      device: { type: null, vendor: null, model: null },
      engine: { name: null, version: null },
    }
  }

  const result = new UAParser(uaString).getResult()

  const recognized = Boolean(result.browser.name || result.os.name || result.engine.name)

  let deviceType: DeviceType
  if (result.device.type === 'mobile' || result.device.type === 'tablet') {
    deviceType = result.device.type
  } else if (recognized) {
    deviceType = 'desktop'
  } else if (BOT_PATTERN.test(uaString)) {
    deviceType = 'bot'
  } else {
    deviceType = null
  }

  return {
    browser: {
      name: toNullable(result.browser.name),
      version: toNullable(result.browser.version),
    },
    os: {
      name: toNullable(result.os.name),
      version: toNullable(result.os.version),
    },
    device: {
      type: deviceType,
      vendor: toNullable(result.device.vendor),
      model: toNullable(result.device.model),
    },
    engine: {
      name: toNullable(result.engine.name),
      version: toNullable(result.engine.version),
    },
  }
}
