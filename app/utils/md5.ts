/**
 * MD5 — pure, DOM-free implementation (unit-tested in `test/`).
 * WebCrypto does not offer MD5, so we hash bytes ourselves. Operates on the
 * UTF-8 encoding of the input and returns a lowercase hex digest.
 * (MD5 is not cryptographically secure — provided for checksums/legacy use.)
 */

function toUtf8Bytes(str: string): Uint8Array {
  return new TextEncoder().encode(str)
}

function leftRotate(x: number, c: number): number {
  return (x << c) | (x >>> (32 - c))
}

// Per-round shift amounts and precomputed sine-derived constants.
const S = [
  7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14,
  20, 5, 9, 14, 20, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 6, 10, 15, 21, 6,
  10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21,
]

const K = Array.from({ length: 64 }, (_v, i) => Math.floor(Math.abs(Math.sin(i + 1)) * 2 ** 32))

/** Compute the MD5 hex digest of a string. */
export function md5(input: string): string {
  const msg = toUtf8Bytes(input)
  const originalLenBits = msg.length * 8

  // Pad: append 0x80, then zeros, until length ≡ 56 (mod 64), then 64-bit length.
  const withOne = msg.length + 1
  const padLen = (56 - (withOne % 64) + 64) % 64
  const total = withOne + padLen + 8
  const buf = new Uint8Array(total)
  buf.set(msg)
  buf[msg.length] = 0x80
  // 64-bit little-endian length (low 32 bits suffice for our input sizes).
  const lenLo = originalLenBits >>> 0
  const lenHi = Math.floor(originalLenBits / 2 ** 32) >>> 0
  const dv = new DataView(buf.buffer)
  dv.setUint32(total - 8, lenLo, true)
  dv.setUint32(total - 4, lenHi, true)

  let a0 = 0x67452301
  let b0 = 0xefcdab89
  let c0 = 0x98badcfe
  let d0 = 0x10325476

  const M = new Int32Array(16)
  for (let off = 0; off < total; off += 64) {
    for (let i = 0; i < 16; i++) M[i] = dv.getUint32(off + i * 4, true)

    let a = a0
    let b = b0
    let c = c0
    let d = d0

    for (let i = 0; i < 64; i++) {
      let f: number
      let g: number
      if (i < 16) {
        f = (b & c) | (~b & d)
        g = i
      } else if (i < 32) {
        f = (d & b) | (~d & c)
        g = (5 * i + 1) % 16
      } else if (i < 48) {
        f = b ^ c ^ d
        g = (3 * i + 5) % 16
      } else {
        f = c ^ (b | ~d)
        g = (7 * i) % 16
      }
      f = (f + a + K[i]! + M[g]!) | 0
      a = d
      d = c
      c = b
      b = (b + leftRotate(f, S[i]!)) | 0
    }

    a0 = (a0 + a) | 0
    b0 = (b0 + b) | 0
    c0 = (c0 + c) | 0
    d0 = (d0 + d) | 0
  }

  return [a0, b0, c0, d0].map(toHexLE).join('')
}

/** 32-bit word → little-endian hex (MD5 output byte order). */
function toHexLE(n: number): string {
  let out = ''
  for (let i = 0; i < 4; i++) {
    const byte = (n >>> (i * 8)) & 0xff
    out += byte.toString(16).padStart(2, '0')
  }
  return out
}
