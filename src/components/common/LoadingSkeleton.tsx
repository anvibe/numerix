import React from 'react';

interface LoadingSkeletonProps {
  /** Type of skeleton to display */
  type?: 'card' | 'text' | 'number-bubble' | 'chart' | 'table-row';
  /** Number of items to show (for repetitive skeletons) */
  count?: number;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Loading skeleton component for better perceived performance
 * Shows animated placeholder content while data is loading
 */
const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  type = 'card',
  count = 1,
  className = '',
}) => {
  const baseClasses = 'animate-pulse bg-gray-200 dark:bg-gray-700 rounded';

  const renderSkeleton = () => {
    switch (type) {
      case 'number-bubble':
        return (
          <div className={`${baseClasses} w-10 h-10 rounded-full ${className}`} />
        );

      case 'text':
        return (
          <div className={`${baseClasses} h-4 w-full ${className}`} />
        );

      case 'chart':
        return (
          <div className={`${baseClasses} h-64 w-full ${className}`}>
            <div className="flex items-end justify-around h-full p-4 gap-2">
              {[...Array(8)].map((_, i) => (
                <div
                  key={i}
                  className="bg-gray-300 dark:bg-gray-600 rounded-t w-full"
                  style={{ height: `${Math.random() * 60 + 20}%` }}
                />
              ))}
            </div>
          </div>
        );

      case 'table-row':
        return (
          <div className={`flex items-center gap-4 p-4 ${className}`}>
            <div className={`${baseClasses} w-8 h-8 rounded-full`} />
            <div className="flex-1 space-y-2">
              <div className={`${baseClasses} h-4 w-3/4`} />
              <div className={`${baseClasses} h-3 w-1/2`} />
            </div>
            <div className={`${baseClasses} h-6 w-16`} />
          </div>
        );

      case 'card':
      default:
        return (
          <div className={`card ${className}`}>
            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
              <div className={`${baseClasses} w-6 h-6 rounded`} />
              <div className={`${baseClasses} h-6 w-48`} />
            </div>
            
            {/* Content */}
            <div className="space-y-3">
              <div className={`${baseClasses} h-4 w-full`} />
              <div className={`${baseClasses} h-4 w-5/6`} />
              <div className={`${baseClasses} h-4 w-4/6`} />
            </div>
            
            {/* Number bubbles */}
            <div className="flex gap-2 mt-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className={`${baseClasses} w-10 h-10 rounded-full`} />
              ))}
            </div>
            
            {/* Actions */}
            <div className="flex gap-3 mt-4">
              <div className={`${baseClasses} h-10 w-32`} />
              <div className={`${baseClasses} h-10 w-32`} />
            </div>
          </div>
        );
    }
  };

  return (
    <>
      {[...Array(count)].map((_, index) => (
        <React.Fragment key={index}>{renderSkeleton()}</React.Fragment>
      ))}
    </>
  );
};

/**
 * Specialized skeleton for the analysis component
 */
export const AnalysisSkeleton: React.FC = () => {
  return (
    <div className="card mb-8 animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-6 w-64 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
        <div className="h-8 w-40 bg-gray-200 dark:bg-gray-700 rounded" />
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="space-y-2">
          <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-10 w-full bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
        <div className="space-y-2">
          <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-10 w-full bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-bg-secondary rounded-lg p-4">
            <div className="h-3 w-20 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
            <div className="h-8 w-12 bg-gray-200 dark:bg-gray-700 rounded" />
          </div>
        ))}
      </div>

      {/* Results */}
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 bg-gray-200 dark:bg-gray-700 rounded" />
                <div className="h-5 w-48 bg-gray-200 dark:bg-gray-700 rounded" />
              </div>
              <div className="h-6 w-12 bg-gray-200 dark:bg-gray-700 rounded" />
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-4 bg-bg-secondary rounded-lg">
                <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded mb-3" />
                <div className="flex gap-2">
                  {[...Array(6)].map((_, j) => (
                    <div key={j} className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full" />
                  ))}
                </div>
              </div>
              <div className="p-4 bg-bg-secondary rounded-lg">
                <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded mb-3" />
                <div className="flex gap-2">
                  {[...Array(6)].map((_, j) => (
                    <div key={j} className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full" />
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Specialized skeleton for the generator panel
 */
export const GeneratorSkeleton: React.FC = () => {
  return (
    <div className="card mb-8 animate-pulse">
      <div className="h-6 w-48 bg-gray-200 dark:bg-gray-700 rounded mb-4" />
      
      {/* Strategy buttons */}
      <div className="mb-6">
        <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
        <div className="flex gap-3">
          <div className="h-10 w-40 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-10 w-36 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
      </div>
      
      {/* Generate button */}
      <div className="flex gap-3">
        <div className="h-10 w-36 bg-gray-200 dark:bg-gray-700 rounded" />
      </div>
    </div>
  );
};

export default LoadingSkeleton;

