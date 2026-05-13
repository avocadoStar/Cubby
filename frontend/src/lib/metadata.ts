function isPrivateIPv4(hostname: string): boolean {
  const parts = hostname.split('.').map(part => Number(part))
  if (parts.length !== 4 || parts.some(part => !Number.isInteger(part) || part < 0 || part > 255)) {
    return false
  }
  const [a, b] = parts
  return a === 0
    || a === 10
    || a === 127
    || (a === 100 && b >= 64 && b <= 127)
    || (a === 169 && b === 254)
    || (a === 172 && b >= 16 && b <= 31)
    || (a === 192 && b === 168)
    || (a >= 224 && a <= 239)
}

function isPrivateIPv6(hostname: string): boolean {
  const normalized = hostname.toLowerCase()
  return normalized === '::'
    || normalized === '::1'
    || normalized.startsWith('fc')
    || normalized.startsWith('fd')
    || normalized.startsWith('fe80:')
    || normalized.startsWith('ff')
}

export function shouldFetchMetadata(rawURL: string): boolean {
  try {
    const parsed = new URL(rawURL)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false
    if (parsed.port && parsed.port !== '80' && parsed.port !== '443') return false

    const hostname = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, '')
    if (hostname === 'localhost' || hostname.endsWith('.localhost')) return false
    if (isPrivateIPv4(hostname) || isPrivateIPv6(hostname)) return false

    return true
  } catch {
    return false
  }
}
