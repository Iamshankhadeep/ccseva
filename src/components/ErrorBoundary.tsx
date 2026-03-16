import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { withTranslation, type WithTranslation } from 'react-i18next';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

interface ErrorBoundaryProps extends WithTranslation {
  children: ReactNode;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen w-full gradient-bg flex items-center justify-center p-6">
          <Card className="bg-neutral-900/80 backdrop-blur-sm border-neutral-800 max-w-lg w-full">
            <CardContent className="text-center stagger-children p-6">
              {/* Error Icon */}
              <div className="text-6xl mb-6 floating">💥</div>

              {/* Error Title */}
              <h2 className="text-white text-2xl font-bold mb-4 text-shadow">
                {this.props.t('errors.errorBoundaryTitle')}
              </h2>

              {/* Error Description */}
              <p className="text-white/80 text-base mb-6 leading-relaxed">
                {this.props.t('errors.errorBoundaryMessage')}
              </p>

              {/* Error Details (in development) */}
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <Alert variant="destructive" className="mb-6 text-left">
                  <AlertTitle className="font-mono text-sm">
                    {this.state.error.name}: {this.state.error.message}
                  </AlertTitle>
                  {this.state.errorInfo?.componentStack && (
                    <AlertDescription className="font-mono text-xs max-h-32 overflow-y-auto mt-2">
                      {this.state.errorInfo.componentStack}
                    </AlertDescription>
                  )}
                </Alert>
              )}

              {/* Action Buttons */}
              <div className="space-y-3">
                <Button
                  type="button"
                  onClick={this.handleReset}
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg shadow-blue-500/20 transition-all duration-200 hover:scale-105"
                >
                  {this.props.t('common.tryAgain')}
                </Button>
                <Button
                  type="button"
                  onClick={this.handleReload}
                  variant="outline"
                  className="w-full border-white/20 bg-white/5 text-white hover:bg-white/10 hover:border-white/40 transition-all duration-200 hover:scale-105"
                >
                  {this.props.t('header.quitApplication')}
                </Button>
              </div>

              {/* Help Text */}
              <div className="mt-6 text-white/60 text-sm space-y-2">
                <p>{this.props.t('errors.errorPersists')}</p>
                <div className="flex flex-col space-y-1 text-xs">
                  <span>• {this.props.t('errors.restartApp')}</span>
                  <span>• {this.props.t('errors.checkConfig')}</span>
                  <span>• {this.props.t('errors.contactSupport')}</span>
                </div>
              </div>

              {/* Debug Info */}
              {process.env.NODE_ENV === 'development' && (
                <div className="mt-6 pt-4 border-t border-white/10">
                  <details className="text-left">
                    <summary className="text-white/60 text-xs cursor-pointer hover:text-white/80">
                      Show Debug Information
                    </summary>
                    <div className="mt-2 p-3 bg-black/20 rounded text-xs font-mono text-white/70 max-h-40 overflow-auto">
                      <div>User Agent: {navigator.userAgent}</div>
                      <div>Timestamp: {new Date().toISOString()}</div>
                      <div>URL: {window.location.href}</div>
                      {this.state.error?.stack && (
                        <div className="mt-2 whitespace-pre-wrap">
                          Stack: {this.state.error.stack}
                        </div>
                      )}
                    </div>
                  </details>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default withTranslation()(ErrorBoundary);
