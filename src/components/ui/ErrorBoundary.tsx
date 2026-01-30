import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onRetry?: () => void;
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
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
    this.props.onRetry?.();
  };

  /** Chunk load failure: stale index after deploy requested old JS; server returned HTML (404). Reload gets fresh index. */
  isChunkLoadError = (): boolean => {
    const msg = this.state.error?.message ?? '';
    return (
      msg.includes('Failed to fetch dynamically imported module') ||
      msg.includes('Importing a module script failed') ||
      msg.includes('Loading chunk') ||
      (msg.includes('MIME') && msg.includes('text/html'))
    );
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      const isChunk = this.isChunkLoadError();
      return (
        <div className="min-h-[40vh] flex flex-col items-center justify-center px-4 py-12 text-center">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Something went wrong
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 max-w-md">
            {isChunk
              ? 'The app was updated. Reload the page to load the latest version.'
              : 'An unexpected error occurred. You can try again or return to the home page.'}
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-md transition-colors touch-manipulation min-h-[44px]"
            >
              {isChunk ? 'Reload page' : 'Try again'}
            </button>
            <a
              href="/markets"
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors touch-manipulation min-h-[44px] inline-flex items-center justify-center"
            >
              Go to Markets
            </a>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
