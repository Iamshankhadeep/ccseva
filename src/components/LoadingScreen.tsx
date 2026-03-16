import type React from 'react';
import { useTranslation } from 'react-i18next';

export const LoadingScreen: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="h-screen w-full gradient-bg flex items-center justify-center">
      <div className="glass-card p-8 text-center max-w-sm w-full glass-interactive">
        {/* Animated Logo */}
        <div className="mb-8 flex justify-center">
          <div className="relative">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center floating"
              style={{ background: 'var(--gradient-primary)' }}
            >
              <span className="text-white text-2xl font-bold">CC</span>
            </div>

            {/* Orbital rings */}
            <div
              className="absolute inset-0 rounded-full border-2 animate-spin"
              style={{
                borderColor: 'var(--color-primary-light)',
                animationDuration: '3s',
                animationTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            />
            <div
              className="absolute inset-2 rounded-full border animate-spin"
              style={{
                borderColor: 'var(--color-neutral-400)',
                animationDuration: '2s',
                animationDirection: 'reverse',
                animationTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            />
          </div>
        </div>

        {/* Loading Text */}
        <h2 className="text-white text-xl font-bold mb-3 text-shadow font-primary">CCSeva</h2>
        <p className="text-white/80 text-sm mb-6 font-primary">{t('header.trackApiUsage')}...</p>

        {/* Loading Spinner */}
        <div className="flex justify-center mb-6">
          <div className="loading-spinner" />
        </div>

        {/* Loading Steps */}
        <div className="space-y-2 text-left">
          <div className="flex items-center space-x-3 text-sm">
            <div
              className="w-2 h-2 rounded-full animate-pulse"
              style={{ backgroundColor: 'var(--color-success-light)' }}
            />
            <span className="text-white/70 font-primary">{t('loading.connectingToClaude')}</span>
          </div>
          <div className="flex items-center space-x-3 text-sm">
            <div
              className="w-2 h-2 rounded-full animate-pulse"
              style={{
                backgroundColor: 'var(--color-primary-light)',
                animationDelay: '0.2s',
              }}
            />
            <span className="text-white/70 font-primary">{t('loading.loadingData')}</span>
          </div>
          <div className="flex items-center space-x-3 text-sm">
            <div
              className="w-2 h-2 rounded-full animate-pulse"
              style={{
                backgroundColor: 'var(--color-warning-light)',
                animationDelay: '0.4s',
              }}
            />
            <span className="text-white/70 font-primary">{t('loading.preparingDashboard')}</span>
          </div>
        </div>

        {/* Progress Dots */}
        <div className="loading-dots mt-6 justify-center">
          <div className="loading-dot" />
          <div className="loading-dot" />
          <div className="loading-dot" />
        </div>
      </div>
    </div>
  );
};
