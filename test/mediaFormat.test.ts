import { describe, expect, it } from 'vitest'
import {
  MEDIA_AUDIO_FORMATS,
  MEDIA_FORMATS,
  MEDIA_VIDEO_FORMATS,
  buildAudioExtractArgs,
  buildMediaConvertArgs,
  buildMediaTrimArgs,
  getMediaFormat,
  mediaOutputName,
  trimReencodeFormat,
} from '@/utils/mediaFormat'

/** Read the value that follows a flag in an argv array. */
function flag(args: string[], name: string): string | undefined {
  const i = args.indexOf(name)
  return i === -1 ? undefined : args[i + 1]
}

describe('the format catalogue', () => {
  it('exposes every video and audio format under one list', () => {
    expect(MEDIA_FORMATS).toHaveLength(MEDIA_VIDEO_FORMATS.length + MEDIA_AUDIO_FORMATS.length)
  })

  it('uses unique ids and tags each entry with its kind', () => {
    const ids = MEDIA_FORMATS.map((f) => f.value)
    expect(new Set(ids).size).toBe(ids.length)
    expect(MEDIA_VIDEO_FORMATS.every((f) => f.kind === 'video')).toBe(true)
    expect(MEDIA_AUDIO_FORMATS.every((f) => f.kind === 'audio')).toBe(true)
  })

  it('looks formats up by id', () => {
    expect(getMediaFormat('mp3')?.mime).toBe('audio/mpeg')
    expect(getMediaFormat('nope')).toBeUndefined()
  })
})

describe('mediaOutputName', () => {
  it('swaps the source extension for the target one', () => {
    expect(mediaOutputName('clip.mov', getMediaFormat('mp4')!)).toBe('clip.mp4')
    expect(mediaOutputName('song.flac', getMediaFormat('mp3')!)).toBe('song.mp3')
  })

  it('appends an extension when the source has none', () => {
    expect(mediaOutputName('recording', getMediaFormat('wav')!)).toBe('recording.wav')
  })

  it('falls back to a generic name for an extension-only filename', () => {
    expect(mediaOutputName('.mov', getMediaFormat('mp4')!)).toBe('output.mp4')
  })
})

describe('buildMediaConvertArgs', () => {
  const base = { input: 'in.mov', output: 'out.mp4', quality: 'balanced' as const }

  it('encodes MP4 with H.264, a browser-safe pixel format, and faststart', () => {
    const args = buildMediaConvertArgs({ ...base, format: 'mp4' })
    expect(args.slice(0, 2)).toEqual(['-i', 'in.mov'])
    expect(flag(args, '-c:v')).toBe('libx264')
    expect(flag(args, '-pix_fmt')).toBe('yuv420p')
    expect(flag(args, '-movflags')).toBe('+faststart')
    expect(args.at(-1)).toBe('out.mp4')
  })

  it('only ever reaches for encoders the wasm core can actually run', () => {
    // libvpx/libopus/libvorbis are compiled in but crash or abort at runtime,
    // so no format may route to them — see the note in mediaFormat.ts.
    const broken = ['libvpx', 'libvpx-vp9', 'libopus', 'libvorbis']
    expect(MEDIA_FORMATS.map((f) => f.value)).not.toContain('webm')
    for (const f of MEDIA_FORMATS) {
      const args = buildMediaConvertArgs({ ...base, format: f.value, output: `out.${f.ext}` })
      for (const codec of broken) expect(args).not.toContain(codec)
    }
  })

  it('drops the video stream when the target is audio-only', () => {
    const args = buildMediaConvertArgs({ ...base, format: 'mp3', output: 'out.mp3' })
    expect(args).toContain('-vn')
    expect(flag(args, '-c:a')).toBe('libmp3lame')
    expect(args).not.toContain('-c:v')
  })

  it('picks the right encoder per audio container', () => {
    const codecFor = (format: string) =>
      flag(buildMediaConvertArgs({ ...base, format, output: `out.${format}` }), '-c:a')
    expect(codecFor('mp3')).toBe('libmp3lame')
    expect(codecFor('m4a')).toBe('aac')
    expect(codecFor('wav')).toBe('pcm_s16le')
    expect(codecFor('flac')).toBe('flac')
  })

  it('omits a bitrate for the lossless formats', () => {
    const wav = buildMediaConvertArgs({ ...base, format: 'wav', output: 'out.wav' })
    expect(wav).not.toContain('-b:a')
  })

  it('trades quality for size across the presets', () => {
    const crf = (quality: 'high' | 'balanced' | 'small') =>
      Number(flag(buildMediaConvertArgs({ ...base, format: 'mp4', quality }), '-crf'))
    // Higher CRF = more compression, so "small" must sit above "high".
    expect(crf('high')).toBeLessThan(crf('balanced'))
    expect(crf('balanced')).toBeLessThan(crf('small'))
  })

  it('lowers the audio bitrate as the preset gets smaller', () => {
    const bitrate = (quality: 'high' | 'balanced' | 'small') =>
      flag(buildMediaConvertArgs({ ...base, format: 'mp3', output: 'out.mp3', quality }), '-b:a')
    expect(bitrate('high')).toBe('256k')
    expect(bitrate('balanced')).toBe('192k')
    expect(bitrate('small')).toBe('128k')
  })

  it('treats an unknown format as a video target rather than throwing', () => {
    const args = buildMediaConvertArgs({ ...base, format: 'unknown', output: 'out.bin' })
    expect(flag(args, '-c:v')).toBe('libx264')
  })
})

describe('trimReencodeFormat', () => {
  it('lands video sources on MP4', () => {
    expect(trimReencodeFormat('clip.mov', true)).toBe('mp4')
    expect(trimReencodeFormat('clip.webm', true)).toBe('mp4')
  })

  it('keeps an audio source in its own format where we can encode it', () => {
    expect(trimReencodeFormat('song.mp3', false)).toBe('mp3')
    expect(trimReencodeFormat('song.wav', false)).toBe('wav')
    expect(trimReencodeFormat('song.flac', false)).toBe('flac')
    expect(trimReencodeFormat('song.m4a', false)).toBe('m4a')
  })

  it('falls back to M4A for audio we cannot re-encode into', () => {
    // The core cannot write Opus/Vorbis, so .opus and .ogg have to change.
    expect(trimReencodeFormat('voice.opus', false)).toBe('m4a')
    expect(trimReencodeFormat('voice.ogg', false)).toBe('m4a')
    expect(trimReencodeFormat('noextension', false)).toBe('m4a')
  })

  it('always names a format the catalogue actually knows', () => {
    for (const name of ['a.mp3', 'a.wav', 'a.flac', 'a.m4a', 'a.ogg', 'a.mov']) {
      for (const hasVideo of [true, false]) {
        expect(getMediaFormat(trimReencodeFormat(name, hasVideo))).toBeDefined()
      }
    }
  })
})

describe('buildMediaTrimArgs', () => {
  const base = { input: 'in.mp4', output: 'out.mp4', start: 5, end: 12.5 }

  it('seeks before -i and expresses the length as a duration', () => {
    const args = buildMediaTrimArgs({ ...base, reencode: false })
    // -ss must precede -i so ffmpeg seeks instead of decoding from zero.
    expect(args.indexOf('-ss')).toBeLessThan(args.indexOf('-i'))
    expect(flag(args, '-ss')).toBe('00:00:05.000')
    // Input seeking rebases timestamps, so the length is -t, not an absolute -to.
    expect(args).not.toContain('-to')
    expect(flag(args, '-t')).toBe('00:00:07.500')
  })

  it('copies streams and rebases timestamps in fast mode', () => {
    const args = buildMediaTrimArgs({ ...base, reencode: false })
    expect(flag(args, '-c')).toBe('copy')
    expect(flag(args, '-avoid_negative_ts')).toBe('make_zero')
    expect(args).not.toContain('-c:v')
  })

  it('re-encodes with the chosen format in precise mode', () => {
    const args = buildMediaTrimArgs({ ...base, reencode: true, format: 'mp4' })
    expect(args).not.toContain('copy')
    expect(flag(args, '-c:v')).toBe('libx264')
    expect(flag(args, '-c:a')).toBe('aac')
    expect(flag(args, '-movflags')).toBe('+faststart')
  })

  it('drops the video stream when re-encoding to an audio format', () => {
    const args = buildMediaTrimArgs({ ...base, reencode: true, format: 'mp3', output: 'out.mp3' })
    expect(args).toContain('-vn')
    expect(flag(args, '-c:a')).toBe('libmp3lame')
    expect(args).not.toContain('-c:v')
  })

  it('never emits a negative duration when the range is inverted', () => {
    const args = buildMediaTrimArgs({ ...base, start: 10, end: 4, reencode: false })
    expect(flag(args, '-t')).toBe('00:00:00.000')
  })

  it('puts the output path last', () => {
    expect(buildMediaTrimArgs({ ...base, reencode: false }).at(-1)).toBe('out.mp4')
    expect(buildMediaTrimArgs({ ...base, reencode: true }).at(-1)).toBe('out.mp4')
  })
})

describe('buildAudioExtractArgs', () => {
  const base = { input: 'in.mp4', output: 'out.mp3', quality: 'balanced' as const }

  it('drops video and maps one explicit audio track', () => {
    const args = buildAudioExtractArgs({ ...base, format: 'mp3' })
    expect(args.slice(0, 2)).toEqual(['-i', 'in.mp4'])
    expect(args).toContain('-vn')
    expect(flag(args, '-map')).toBe('0:a:0')
    expect(flag(args, '-c:a')).toBe('libmp3lame')
    expect(args.at(-1)).toBe('out.mp3')
  })

  it('can target a later audio track on multi-language files', () => {
    const args = buildAudioExtractArgs({ ...base, format: 'mp3', track: 2 })
    expect(flag(args, '-map')).toBe('0:a:2')
  })

  it('honours the quality preset for lossy targets', () => {
    const args = buildAudioExtractArgs({ ...base, format: 'm4a', quality: 'high' })
    expect(flag(args, '-c:a')).toBe('aac')
    expect(flag(args, '-b:a')).toBe('256k')
  })

  it('emits no bitrate for lossless targets', () => {
    for (const format of ['wav', 'flac']) {
      const args = buildAudioExtractArgs({ ...base, format, output: `out.${format}` })
      expect(args).not.toContain('-b:a')
    }
  })

  it('never routes to an encoder the core cannot run', () => {
    for (const f of MEDIA_AUDIO_FORMATS) {
      const args = buildAudioExtractArgs({ ...base, format: f.value, output: `out.${f.ext}` })
      for (const codec of ['libopus', 'libvorbis']) expect(args).not.toContain(codec)
    }
  })
})
