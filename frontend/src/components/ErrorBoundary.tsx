import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
}

// React only exposes crash recovery through a class component (componentDidCatch has
// no hook equivalent) — this is the last line of defense against a blank screen when
// something throws during render that slipped past normal error handling.
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error: unknown) {
    console.error('Unhandled render error:', error)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-bg-primary p-6 text-center text-text-primary">
          <p className="text-h2">Something went wrong.</p>
          <p className="text-body text-text-secondary">Try reloading the page.</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-lg bg-accent-red px-4 py-2 text-body font-medium text-white"
          >
            Reload
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
