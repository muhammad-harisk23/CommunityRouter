import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('[CommunityRouter] Unhandled error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <main
          className="flex min-h-screen items-center justify-center p-6"
          style={{ background: '#07080d', color: '#ffffff' }}
        >
          <div className="mx-auto w-full max-w-md text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-red-400/20 bg-red-400/10 text-lg font-semibold text-red-200">
              !
            </div>
            <h1 className="mt-5 text-xl font-semibold text-white">
              Something went wrong
            </h1>
            <p className="mt-3 text-sm leading-6 text-white/60">
              CommunityRouter encountered an unexpected error. This is usually
              temporary — try reloading the page.
            </p>
            {this.state.error && (
              <details className="mt-4 rounded-2xl border border-white/10 bg-white/[0.045] p-3 text-left">
                <summary className="cursor-pointer text-xs font-medium text-white/50">
                  Error details
                </summary>
                <pre className="mt-2 whitespace-pre-wrap break-all text-xs text-red-200/80">
                  {this.state.error.message}
                </pre>
              </details>
            )}
            <div className="mt-6 flex items-center justify-center gap-3">
              <button
                className="rounded-2xl bg-orange-200 px-5 py-2.5 text-sm font-semibold text-[#140c05] shadow-[0_16px_45px_rgba(251,146,60,0.2)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-orange-100 active:translate-y-0 focus-visible:ring-2 focus-visible:ring-orange-200 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0c0f18] focus-visible:outline-none"
                onClick={this.handleRetry}
                type="button"
              >
                Try again
              </button>
              <button
                className="rounded-2xl border border-white/10 bg-white/[0.06] px-5 py-2.5 text-sm font-medium text-white/70 transition-all duration-300 hover:-translate-y-0.5 hover:text-white active:translate-y-0 focus-visible:ring-2 focus-visible:ring-orange-200 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0c0f18] focus-visible:outline-none"
                onClick={() => window.location.reload()}
                type="button"
              >
                Reload page
              </button>
            </div>
          </div>
        </main>
      );
    }

    return this.props.children;
  }
}
