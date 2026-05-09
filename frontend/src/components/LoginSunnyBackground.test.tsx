import { describe, expect, it } from 'vitest'

describe('LoginSunnyBackground', () => {
  it('renders the local falling leaves video background', async () => {
    const { default: LoginSunnyBackground } = await import('./LoginSunnyBackground')

    const element = LoginSunnyBackground()
    const video = element.props.children as {
      type: string
      props: {
        className?: string
        src?: string
        autoPlay?: boolean
        muted?: boolean
        loop?: boolean
        playsInline?: boolean
      }
    }

    expect(element.props.className).toBe('login-sunny-background')
    expect(element.props['aria-hidden']).toBe('true')
    expect(video.type).toBe('video')
    expect(video.props.className).toBe('login-sunny-video')
    expect(video.props.src).toBe('/theme/leaves.mp4')
    expect(video.props.autoPlay).toBe(true)
    expect(video.props.muted).toBe(true)
    expect(video.props.loop).toBe(true)
    expect(video.props.playsInline).toBe(true)
  })
})
