import { describe, expect, it } from 'vitest'
import {
  motionDuration,
  motionEasing,
  motionTransform,
  overlayOpacity,
  transitionFor,
} from './motion'

describe('motion contract', () => {
  it('uses restrained native-feeling durations and easing curves', () => {
    expect(motionDuration.instant).toBe('90ms')
    expect(motionDuration.fast).toBe('140ms')
    expect(motionDuration.normal).toBe('210ms')
    expect(motionDuration.exit).toBe('170ms')

    expect(motionEasing.enter).toBe('cubic-bezier(0.16, 1, 0.3, 1)')
    expect(motionEasing.exit).toBe('cubic-bezier(0.4, 0, 1, 1)')
    expect(motionEasing.standard).toBe('cubic-bezier(0.2, 0, 0, 1)')
  })

  it('keeps modal and menu transforms subtle', () => {
    expect(motionTransform.modal.closed).toBe('scale(0.97) translateY(4px)')
    expect(motionTransform.menu.closed).toBe('scale(0.98) translateY(-2px)')
    expect(motionTransform.bottomSheet.closed).toBe('translateY(100%)')
    expect(motionTransform.drawer.closed).toBe('translateX(100%)')
  })

  it('builds enter and exit transitions without motion when reduced', () => {
    expect(transitionFor('transform', 'fast', 'enter', false)).toBe(
      'transform 140ms cubic-bezier(0.16, 1, 0.3, 1)',
    )
    expect(transitionFor('opacity', 'exit', 'exit', false)).toBe(
      'opacity 170ms cubic-bezier(0.4, 0, 1, 1)',
    )
    expect(transitionFor('opacity', 'normal', 'standard', true)).toBe('none')
  })

  it('keeps mobile scrims lighter than desktop modal overlays', () => {
    expect(overlayOpacity.modal).toBe(1)
    expect(overlayOpacity.mobileScrim).toBe(0.34)
    expect(overlayOpacity.mobileMenuScrim).toBe(0.32)
  })
})
