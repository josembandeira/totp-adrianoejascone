// RFC 6238 TOTP client-side generation

function base32Decode(base32: string): Uint8Array {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
  const clean = base32.toUpperCase().replace(/=+$/, '').replace(/\s/g, '')
  let bits = 0
  let value = 0
  const output: number[] = []

  for (const char of clean) {
    const idx = alphabet.indexOf(char)
    if (idx === -1) continue
    value = (value << 5) | idx
    bits += 5
    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 0xff)
      bits -= 8
    }
  }
  return new Uint8Array(output)
}

async function hmacSHA1(key: Uint8Array, data: Uint8Array): Promise<Uint8Array> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key.buffer as ArrayBuffer,
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, data.buffer as ArrayBuffer)
  return new Uint8Array(sig)
}

export async function generateTOTP(seed: string, period = 30, digits = 6): Promise<string> {
  const key = base32Decode(seed)
  const epoch = Math.floor(Date.now() / 1000)
  const counter = Math.floor(epoch / period)

  const buf = new ArrayBuffer(8)
  const view = new DataView(buf)
  view.setUint32(4, counter)

  const hmac = await hmacSHA1(key, new Uint8Array(buf))
  const offset = hmac[hmac.length - 1] & 0x0f
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff)

  return String(code % Math.pow(10, digits)).padStart(digits, '0')
}

export function getSecondsRemaining(period = 30): number {
  return period - (Math.floor(Date.now() / 1000) % period)
}

export function getProgress(period = 30): number {
  const remaining = getSecondsRemaining(period)
  return (remaining / period) * 100
}
