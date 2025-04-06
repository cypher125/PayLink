"use client"

import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * Custom error boundary that captures errors but doesn't display them visually
 * since we're handling errors with our custom toast system
 */
class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_: Error): State {
    // Update state so the next render will show fallback UI
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log the error to console but don't display it
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // Reset the error state after a short delay to allow the component to recover
    setTimeout(() => {
      this.setState({ hasError: false });
    }, 2000);
  }

  render(): ReactNode {
    // Always render children - we're handling errors via toast now
    return this.props.children;
  }
}

export { ErrorBoundary }; 