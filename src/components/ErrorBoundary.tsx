import { Component, type ReactNode } from 'react';
import { ErrorFallback } from './ErrorFallback';

type Props = { children: ReactNode };
type State = { hasError: boolean };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: { componentStack?: string | null }) {
    // Development only, per ARCHITECTURE.md §18 ("No debug logs in production").
    // Replace with a centralized logging service (Sentry, per DEPLOYMENT.md's
    // future SENTRY_DSN) once one is introduced.
    if (__DEV__) {
      console.error('Unhandled render error:', error, info.componentStack);
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return <ErrorFallback onRetry={this.handleRetry} />;
    }
    return this.props.children;
  }
}
