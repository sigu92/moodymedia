import React from 'react';

export const CartReviewSkeleton: React.FC = () => {
  return (
    <div className="space-y-4 p-4">
      <div className="h-6 bg-muted rounded w-1/3" />
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center space-x-4 p-4 border rounded">
            <div className="h-12 w-12 bg-muted rounded" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-muted rounded w-3/4" />
              <div className="h-3 bg-muted rounded w-1/2" />
            </div>
            <div className="h-8 w-16 bg-muted rounded" />
          </div>
        ))}
      </div>
    </div>
  );
};


