/**
 * Output-format catalogue and ffmpeg argument builders for the `/media/*`
 * tools. Pure, DOM-free logic so the exact command line each tool runs is
 * unit-testable without booting the 9 MB wasm core.
 *
 * Only encoders **verified to actually work** in `@ffmpeg/core` are offered:
 * libx264, libmp3lame, and the native aac/flac/pcm_s16le. The core also
 * advertises libvpx, libopus, and libvorbis, but all three fail at runtime
 * (libvpx and libopus crash the wasm heap with "memory access out of bounds";
 * libvorbis aborts outright), so the formats needing them — WebM, Opus, OGG —
 * are intentionally not listed. Verified against @ffmpeg/core 0.12.6 & 0.12.10
 * with both an audio-only WAV and a real video file.
 */

export type MediaKind = 'video' | 'audio'

/** Quality/size trade-off presets exposed in the UI. */
export type MediaQuality = 'high' | 'balanced' | 'small'

export interface MediaFormatMeta {
  /** Stable id used as the select value. */
  value: string
  label: string
  /** File extension (no dot) — also what ffmpeg infers the muxer from. */
  ext: string
  mime: string
  kind: MediaKind
  /** Short hint shown next to the picker. */
  note: string
}

export const MEDIA_VIDEO_FORMATS: MediaFormatMeta[] = [
  {
    value: 'mp4',
    label: 'MP4 (H.264)',
    ext: 'mp4',
    mime: 'video/mp4',
    kind: 'video',
    note: 'Plays everywhere — the safe default.',
  },
  // NOTE: WebM is deliberately absent. It requires VP8/VP9, and libvpx encoding
  // crashes the wasm core with "memory access out of bounds" (reproduced on
  // @ffmpeg/core 0.12.6 and 0.12.10, for both VP8 and VP9, with every
  // threading/deadline/alt-ref combination). libx264 is unaffected. Re-add the
  // format only once a core build lands that can actually encode libvpx.
  {
    value: 'mkv',
    label: 'MKV (H.264)',
    ext: 'mkv',
    mime: 'video/x-matroska',
    kind: 'video',
    note: 'Flexible container for archiving.',
  },
]

export const MEDIA_AUDIO_FORMATS: MediaFormatMeta[] = [
  {
    value: 'mp3',
    label: 'MP3',
    ext: 'mp3',
    mime: 'audio/mpeg',
    kind: 'audio',
    note: 'Universally supported.',
  },
  {
    value: 'm4a',
    label: 'M4A (AAC)',
    ext: 'm4a',
    mime: 'audio/mp4',
    kind: 'audio',
    note: 'Better quality per byte than MP3.',
  },
  // NOTE: Opus/OGG are deliberately absent for the same reason as WebM —
  // libopus crashes the core with "memory access out of bounds" on anything
  // beyond a tiny mono clip (reproduced on a plain 48 kHz stereo WAV).
  {
    value: 'wav',
    label: 'WAV',
    ext: 'wav',
    mime: 'audio/wav',
    kind: 'audio',
    note: 'Uncompressed — large files.',
  },
  {
    value: 'flac',
    label: 'FLAC',
    ext: 'flac',
    mime: 'audio/flac',
    kind: 'audio',
    note: 'Lossless compression.',
  },
]

export const MEDIA_FORMATS: MediaFormatMeta[] = [...MEDIA_VIDEO_FORMATS, ...MEDIA_AUDIO_FORMATS]

const formatByValue = new Map(MEDIA_FORMATS.map((f) => [f.value, f]))

export function getMediaFormat(value: string): MediaFormatMeta | undefined {
  return formatByValue.get(value)
}

/** Swap a source filename's extension for the target format's (`clip.mov` → `clip.mp4`). */
export function mediaOutputName(sourceName: string, format: MediaFormatMeta): string {
  const base = sourceName.replace(/\.[^./\\]+$/, '') || 'output'
  return `${base}.${format.ext}`
}

/** Constant-quality value for H.264, lower = better. */
const H264_CRF: Record<MediaQuality, number> = { high: 20, balanced: 26, small: 32 }

/** Target bitrate for the lossy audio encoders. */
const AUDIO_BITRATE: Record<MediaQuality, string> = {
  high: '256k',
  balanced: '192k',
  small: '128k',
}

/**
 * Encoder flags for an audio track in the given container. Returns the codec
 * plus any quality flags; lossless formats ignore the quality preset.
 */
function audioCodecArgs(format: string, quality: MediaQuality): string[] {
  const bitrate = AUDIO_BITRATE[quality]
  switch (format) {
    case 'mp3':
      return ['-c:a', 'libmp3lame', '-b:a', bitrate]
    case 'm4a':
    case 'mp4':
    case 'mkv':
      return ['-c:a', 'aac', '-b:a', bitrate]
    case 'wav':
      return ['-c:a', 'pcm_s16le']
    case 'flac':
      return ['-c:a', 'flac']
    default:
      return ['-c:a', 'aac', '-b:a', bitrate]
  }
}

/** Encoder flags for the video track of a video container. */
function videoCodecArgs(quality: MediaQuality): string[] {
  return [
    '-c:v',
    'libx264',
    '-preset',
    'veryfast',
    '-crf',
    String(H264_CRF[quality]),
    // Chrome/Safari refuse to play 4:4:4 H.264; force the universal chroma layout.
    '-pix_fmt',
    'yuv420p',
  ]
}

export interface MediaConvertOptions {
  /** Filename inside the ffmpeg virtual FS. */
  input: string
  output: string
  /** Target format id from {@link MEDIA_FORMATS}. */
  format: string
  quality: MediaQuality
}

/**
 * Full ffmpeg argv for a format conversion. Audio targets drop the video
 * stream (`-vn`) so converting a video to MP3 doesn't fail on a stray
 * cover-art stream; MP4 gets `+faststart` so it can play while downloading.
 */
export function buildMediaConvertArgs({
  input,
  output,
  format,
  quality,
}: MediaConvertOptions): string[] {
  const meta = getMediaFormat(format)
  const kind = meta?.kind ?? 'video'
  const args = ['-i', input]

  if (kind === 'audio') {
    args.push('-vn', ...audioCodecArgs(format, quality))
  } else {
    args.push(...videoCodecArgs(quality), ...audioCodecArgs(format, quality))
    if (format === 'mp4') args.push('-movflags', '+faststart')
  }

  args.push(output)
  return args
}
