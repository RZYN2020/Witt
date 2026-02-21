import React from 'react';
import { useLoadingStore } from '@/stores/useLoadingStore';
import type { ProgressInfo } from '@/lib/loading';

interface LoadingOverlayProps {
  children?: React.ReactNode;
}

/**
 * Full-screen loading overlay
 */
export function LoadingOverlay({ children }: LoadingOverlayProps) {
  const { isLoading, currentProgress } = useLoadingStore();

  if (!isLoading) {
    return children || null;
  }

  return (
    <div className="loading-overlay">
      <div className="loading-content">
        <Spinner size="large" />
        {currentProgress && (
          <div className="loading-progress">
            <ProgressBar 
              current={currentProgress.current} 
              total={currentProgress.total} 
            />
            {currentProgress.message && (
              <p className="loading-message">{currentProgress.message}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

interface SpinnerProps {
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

/**
 * Spinner loading indicator
 */
export function Spinner({ size = 'medium', className = '' }: SpinnerProps) {
  const sizeClasses = {
    small: 'w-4 h-4',
    medium: 'w-8 h-8',
    large: 'w-12 h-12',
  };

  return (
    <div 
      className={`spinner ${sizeClasses[size]} ${className}`}
      role="status"
      aria-label="Loading"
    >
      <svg className="animate-spin" viewBox="0 0 24 24">
        <circle 
          className="opacity-25" 
          cx="12" 
          cy="12" 
          r="10" 
          stroke="currentColor" 
          strokeWidth="4"
          fill="none"
        />
        <path 
          className="opacity-75" 
          fill="currentColor" 
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
    </div>
  );
}

interface ProgressBarProps {
  current: number;
  total: number;
  showPercentage?: boolean;
  className?: string;
}

/**
 * Progress bar component
 */
export function ProgressBar({ 
  current, 
  total, 
  showPercentage = true,
  className = '' 
}: ProgressBarProps) {
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <div className={`progress-bar ${className}`}>
      <div className="progress-bar-track">
        <div 
          className="progress-bar-fill" 
          style={{ width: `${percentage}%` }}
          role="progressbar"
          aria-valuenow={percentage}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
      {showPercentage && (
        <span className="progress-bar-label">{percentage}%</span>
      )}
    </div>
  );
}

interface LoadingButtonProps {
  isLoading: boolean;
  children: React.ReactNode;
  loadingText?: string;
  disabled?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  className?: string;
}

/**
 * Button with built-in loading state
 */
export function LoadingButton({
  isLoading,
  children,
  loadingText = 'Loading...',
  disabled = false,
  onClick,
  type = 'button',
  className = '',
}: LoadingButtonProps) {
  return (
    <button
      type={type}
      className={`loading-button ${className} ${isLoading ? 'is-loading' : ''}`}
      disabled={disabled || isLoading}
      onClick={onClick}
    >
      {isLoading ? (
        <>
          <Spinner size="small" />
          <span>{loadingText}</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}

interface ProgressCardProps {
  title: string;
  progress: ProgressInfo;
  estimatedTimeRemaining?: number | null;
  className?: string;
}

/**
 * Card showing detailed progress information
 */
export function ProgressCard({
  title,
  progress,
  estimatedTimeRemaining,
  className = '',
}: ProgressCardProps) {
  return (
    <div className={`progress-card ${className}`}>
      <div className="progress-card-header">
        <h3>{title}</h3>
        <span className="progress-count">
          {progress.current}/{progress.total}
        </span>
      </div>
      <ProgressBar current={progress.current} total={progress.total} />
      {progress.message && (
        <p className="progress-message">{progress.message}</p>
      )}
      {estimatedTimeRemaining !== null && estimatedTimeRemaining !== undefined && (
        <p className="progress-eta">
          Estimated time remaining: {formatTime(estimatedTimeRemaining)}
        </p>
      )}
    </div>
  );
}

/**
 * Format time in human-readable format
 */
function formatTime(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}

/**
 * Inline loading indicator for text/content
 */
export function InlineLoading({ text = 'Loading...' }: { text?: string }) {
  return (
    <div className="inline-loading">
      <Spinner size="small" />
      <span>{text}</span>
    </div>
  );
}

/**
 * Skeleton loader for content placeholders
 */
export function SkeletonLoader({ 
  lines = 3, 
  className = '' 
}: { 
  lines?: number;
  className?: string;
}) {
  return (
    <div className={`skeleton-loader ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div 
          key={i} 
          className="skeleton-line"
          style={{ width: i === lines - 1 ? '60%' : '100%' }}
        />
      ))}
    </div>
  );
}
