import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--app-bg)', color: 'var(--app-text)', fontFamily: 'system-ui' }}>
          <h2 style={{ marginBottom: 8 }}>出了点问题</h2>
          <p style={{ color: 'var(--app-text2)', marginBottom: 24, fontSize: 14 }}>{this.state.error?.message}</p>
          <button onClick={() => window.location.reload()} style={{ padding: '8px 24px', borderRadius: 8, border: 'none', background: 'var(--app-accent)', color: '#fff', cursor: 'pointer', fontSize: 14 }}>刷新页面</button>
        </div>
      )
    }
    return this.props.children
  }
}
