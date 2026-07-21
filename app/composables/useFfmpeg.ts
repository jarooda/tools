/**
 * ffmpeg.wasm helpers shared by every `/media/*` tool.
 *
 * The engine (~9 MB of wasm) is **lazy-loaded** via dynamic `import()` and kept
 * as a module-level singleton, so it stays out of the base bundle and is only
 * paid for once per session even if the user hops between media tools.
 *
 * Everything runs in a Web Worker on the user's machine — media files are never
 * uploaded. The core and its wasm are self-hosted (bundled as assets by Vite),
 * so nothing is fetched from a CDN either.
 */
import { readonly, ref, shallowRef } from 'vue'
import type { FFmpeg } from '@ffmpeg/ffmpeg'

/** Shared across every consumer of the composable — the core loads once. */
const instance = shallowRef<FFmpeg | null>(null)
const loading = ref(false)
const ready = ref(false)
/** 0–1 progress of the running command (ffmpeg's own estimate). */
const progress = ref(0)
const running = ref(false)
/**
 * Rolling tail of ffmpeg's log for the current run. The real reason a command
 * failed is rarely the final line — a wasm abort prints "Aborted()" *after*
 * the message that explains it — so we keep a window rather than just the last
 * line, and pages can pattern-match it for a friendlier error.
 */
const logTail = ref<string[]>([])
const LOG_TAIL_LINES = 40

/** Lines that never explain anything on their own. */
const NOISE = /^\s*$|^Aborted\(\)$/

/** The most informative recent log line, for use as an error message. */
function bestLogLine(): string {
  for (let i = logTail.value.length - 1; i >= 0; i--) {
    const line = logTail.value[i]!
    if (!NOISE.test(line)) return line.trim()
  }
  return ''
}

let loadPromise: Promise<FFmpeg> | null = null

/** Metadata probed from a media file with a plain HTML element (no wasm needed). */
export interface MediaInfo {
  duration: number
  width: number
  height: number
  hasVideo: boolean
}

/**
 * Drop the shared core so the next `ensureLoaded()` builds a new one. Used
 * after a wasm abort, which poisons the instance beyond recovery.
 */
function discardInstance() {
  try {
    instance.value?.terminate()
  } catch {
    /* already gone */
  }
  instance.value = null
  ready.value = false
  loadPromise = null
}

export function useFfmpeg() {
  /**
   * Boot the wasm core. Safe to call repeatedly — concurrent callers await the
   * same promise and later calls resolve immediately.
   */
  async function ensureLoaded(): Promise<FFmpeg> {
    if (instance.value && ready.value) return instance.value
    if (loadPromise) return await loadPromise

    loading.value = true
    loadPromise = (async () => {
      const [{ FFmpeg }, coreURL, wasmURL] = await Promise.all([
        import('@ffmpeg/ffmpeg'),
        import('@ffmpeg/core?url').then((m) => m.default),
        import('@ffmpeg/core/wasm?url').then((m) => m.default),
      ])
      const ffmpeg = new FFmpeg()
      ffmpeg.on('log', ({ message }) => {
        const next = [...logTail.value, message]
        logTail.value = next.length > LOG_TAIL_LINES ? next.slice(-LOG_TAIL_LINES) : next
      })
      ffmpeg.on('progress', (event) => {
        // ffmpeg's estimate can overshoot past 1 near the end of a run.
        progress.value = Math.min(Math.max(event.progress, 0), 1)
      })
      await ffmpeg.load({ coreURL, wasmURL })
      instance.value = ffmpeg
      ready.value = true
      return ffmpeg
    })()

    try {
      return await loadPromise
    } catch (err) {
      // Let the next attempt retry from scratch instead of caching the failure.
      loadPromise = null
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Run one ffmpeg command over a single input file and return the output.
   *
   * `buildArgs` receives the virtual-FS names to use, so callers never have to
   * think about the temporary filenames. Both files are deleted afterwards —
   * the worker's memory filesystem persists between runs and a leftover 200 MB
   * video would otherwise stay resident for the whole session.
   */
  async function runOnFile(
    file: Blob,
    options: {
      /** Extension for the virtual input file; ffmpeg demuxes by extension. */
      inputExt: string
      outputExt: string
      outputMime: string
      buildArgs: (input: string, output: string) => string[]
    },
  ): Promise<Blob> {
    const ffmpeg = await ensureLoaded()
    const { fetchFile } = await import('@ffmpeg/util')

    const stamp = Date.now().toString(36)
    const input = `in-${stamp}.${options.inputExt}`
    const output = `out-${stamp}.${options.outputExt}`

    running.value = true
    progress.value = 0
    // Start each run with a clean log so a stale line from the previous command
    // can never be reported as this one's failure.
    logTail.value = []
    try {
      await ffmpeg.writeFile(input, await fetchFile(file))
      let code: number
      try {
        code = await ffmpeg.exec(options.buildArgs(input, output))
      } catch (err) {
        // A wasm abort (out-of-bounds access, OOM) leaves the core permanently
        // unusable — every later exec on it fails too. Tear the instance down
        // so the next attempt boots a fresh one rather than the tool appearing
        // broken for the rest of the session.
        discardInstance()
        // ffmpeg.wasm rejects with a bare string or an event for these, so
        // `err.message` is often empty — ffmpeg's own last log line is the
        // only thing carrying a real reason.
        throw new Error(bestLogLine() || String(err) || 'ffmpeg failed to run.')
      }
      if (code !== 0) {
        throw new Error(bestLogLine() || `ffmpeg exited with code ${code}.`)
      }
      const data = await ffmpeg.readFile(output)
      // readFile hands back a Uint8Array for binary output; copy into a Blob
      // before the virtual file is deleted underneath it.
      const bytes = data instanceof Uint8Array ? data : new TextEncoder().encode(data)
      return new Blob([bytes], { type: options.outputMime })
    } finally {
      running.value = false
      progress.value = 0
      // Only worth clearing up if the core is still alive — a discarded
      // instance took its whole filesystem with it, and calling into a
      // terminated worker throws rather than rejecting.
      if (instance.value === ffmpeg) {
        try {
          await ffmpeg.deleteFile(input)
          await ffmpeg.deleteFile(output)
        } catch {
          /* nothing to reclaim */
        }
      }
    }
  }

  /**
   * Read duration/dimensions straight from a `<video>` element. Far cheaper
   * than booting wasm just to probe, and it tells us whether the file actually
   * carries a video track (audio-only files report 0×0).
   */
  function probeMedia(file: Blob): Promise<MediaInfo> {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file)
      const el = document.createElement('video')
      el.preload = 'metadata'
      el.muted = true
      const cleanup = () => URL.revokeObjectURL(url)
      el.onloadedmetadata = () => {
        const info: MediaInfo = {
          duration: Number.isFinite(el.duration) ? el.duration : 0,
          width: el.videoWidth,
          height: el.videoHeight,
          hasVideo: el.videoWidth > 0 && el.videoHeight > 0,
        }
        cleanup()
        resolve(info)
      }
      el.onerror = () => {
        cleanup()
        reject(new Error('This file could not be read as audio or video.'))
      }
      el.src = url
    })
  }

  /** Extension of a filename, lowercased, defaulting when there isn't one. */
  function extensionOf(name: string, fallback = 'bin'): string {
    const match = /\.([^./\\]+)$/.exec(name)
    return match ? match[1]!.toLowerCase() : fallback
  }

  return {
    ensureLoaded,
    runOnFile,
    probeMedia,
    extensionOf,
    loading: readonly(loading),
    ready: readonly(ready),
    running: readonly(running),
    progress: readonly(progress),
    /** Recent ffmpeg output, newest last — for pattern-matching failures. */
    logTail: readonly(logTail),
  }
}
