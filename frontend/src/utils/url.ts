const loopbackHosts = new Set(['127.0.0.1', '::1', 'localhost'])

type NormalizeUrlResult =
  | { normalizedUrl: string }
  | { error: string }

export function normalizeBookmarkUrl(rawUrl: string): NormalizeUrlResult {
  const trimmed = rawUrl.trim()
  if (!trimmed) {
    return { error: 'Please enter a valid URL.' }
  }

  const candidate = trimmed.includes('://') ? trimmed : `${defaultScheme(trimmed)}://${trimmed.replace(/^\/\//, '')}`

  let parsed: URL
  try {
    parsed = new URL(candidate)
  } catch {
    return { error: 'Please enter a valid URL.' }
  }

  const protocol = parsed.protocol.toLowerCase()
  if (protocol !== 'http:' && protocol !== 'https:') {
    return { error: 'Please enter a valid URL.' }
  }

  const hostname = parsed.hostname.toLowerCase()
  if (!isValidHostname(hostname)) {
    return { error: 'Please enter a valid URL.' }
  }

  const auth = parsed.username
    ? `${parsed.username}${parsed.password ? `:${parsed.password}` : ''}@`
    : ''
  const pathname = parsed.pathname === '/' ? '' : parsed.pathname.replace(/\/+$/, '') || parsed.pathname

  return {
    normalizedUrl: `${protocol}//${auth}${parsed.host.toLowerCase()}${pathname}${parsed.search}${parsed.hash}`,
  }
}

function defaultScheme(candidate: string) {
  const [host] = candidate.split('/', 1)
  const hostname = host.replace(/^\/\//, '').replace(/:\d+$/, '').toLowerCase()
  return loopbackHosts.has(hostname) ? 'http' : 'https'
}

function isValidHostname(hostname: string) {
  if (!hostname) {
    return false
  }

  return loopbackHosts.has(hostname) || hostname.includes('.') || isIpAddress(hostname)
}

function isIpAddress(hostname: string) {
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)) {
    return hostname.split('.').every((segment) => Number(segment) >= 0 && Number(segment) <= 255)
  }

  return hostname.includes(':')
}
