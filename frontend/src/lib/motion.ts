export const motionDuration = {
  instant: '90ms',
  fast: '140ms',
  normal: '210ms',
  exit: '170ms',
} as const

export const motionDurationMs = {
  instant: 90,
  fast: 140,
  normal: 210,
  exit: 170,
} as const

export const motionEasing = {
  standard: 'cubic-bezier(0.2, 0, 0, 1)',
  enter: 'cubic-bezier(0.16, 1, 0.3, 1)',
  exit: 'cubic-bezier(0.4, 0, 1, 1)',
} as const

export const motionTransform = {
  modal: {
    open: 'scale(1) translateY(0)',
    closed: 'scale(0.97) translateY(4px)',
  },
  menu: {
    open: 'scale(1) translateY(0)',
    closed: 'scale(0.98) translateY(-2px)',
  },
  bottomSheet: {
    open: 'translateY(0)',
    closed: 'translateY(100%)',
  },
  drawer: {
    open: 'translateX(0)',
    closed: 'translateX(100%)',
  },
} as const

export const overlayOpacity = {
  modal: 1,
  mobileScrim: 0.34,
  mobileMenuScrim: 0.32,
} as const

type MotionDuration = keyof typeof motionDuration
type MotionEasing = keyof typeof motionEasing

export function transitionFor(
  property: string,
  duration: MotionDuration,
  easing: MotionEasing,
  reducedMotion: boolean,
) {
  if (reducedMotion) return 'none'
  return `${property} ${motionDuration[duration]} ${motionEasing[easing]}`
}
