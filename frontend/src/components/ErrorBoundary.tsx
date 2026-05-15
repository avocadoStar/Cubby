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

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-screen bg-app-bg text-app-text font-[system-ui]">
          <h2 className="mb-2">出了点问题</h2>
          <p className="text-app-text2 mb-6 text-[var(--fs--1)]">{this.state.error?.message}</p>
          <div className="flex gap-2">
            <button onClick={() => this.setState({ hasError: false, error: null })}
              className="py-2 px-6 rounded-button bg-app-card text-app-text cursor-pointer text-[var(--fs--1)]"
              style={{ border: 'var(--input-border)' }}>
              返回
            </button>
            <button onClick={() => window.location.reload()}
              className="py-2 px-6 rounded-button border-none bg-app-accent text-[var(--text-on-accent)] cursor-pointer text-[var(--fs--1)]">
              刷新页面
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
