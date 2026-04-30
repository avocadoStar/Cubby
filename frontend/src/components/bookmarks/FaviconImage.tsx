import { useState } from 'react'
import { buildFallbackFaviconUrl } from '../../utils/favicon'
import { Icon } from '../ui/Icon'

type FaviconImageProps = {
  title: string
  url: string
  faviconUrl?: string | null
}

export function FaviconImage({ faviconUrl, title, url }: FaviconImageProps) {
  const fallbackUrl = buildFallbackFaviconUrl(url)
  const primarySrc = faviconUrl || fallbackUrl
  const fallbackSrc = faviconUrl && fallbackUrl && faviconUrl !== fallbackUrl ? fallbackUrl : ''
  const [failedSource, setFailedSource] = useState('')
  const src = failedSource === primarySrc ? fallbackSrc : primarySrc

  if (!src) {
    return <Icon className="text-[15px]" name="link" />
  }

  return (
    <img
      alt={`${title} favicon`}
      className="h-5 w-5 rounded-[4px] object-cover"
      draggable={false}
      loading="lazy"
      onError={() => {
        setFailedSource(src)
      }}
      src={src}
    />
  )
}
