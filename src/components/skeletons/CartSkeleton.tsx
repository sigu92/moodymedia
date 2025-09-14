import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

interface CartSkeletonProps {
  itemCount?: number;
}

export const CartSkeleton: React.FC<CartSkeletonProps> = ({ itemCount = 3 }) => {
  return (
    <div className="space-y-4 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-8 w-8 rounded-full" />
      </div>

      {/* Cart items */}
      <div className="space-y-3">
        {Array.from({ length: itemCount }, (_, i) => (
          <div key={i} className="flex items-center space-x-4 p-4 border rounded-lg">
            {/* Item image placeholder */}
            <Skeleton className="h-12 w-12 rounded" />

            {/* Item details */}
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
              <Skeleton className="h-3 w-1/4" />
            </div>

            {/* Quantity controls */}
            <div className="flex items-center space-x-2">
              <Skeleton className="h-8 w-8 rounded" />
              <Skeleton className="h-6 w-6" />
              <Skeleton className="h-8 w-8 rounded" />
            </div>

            {/* Price */}
            <Skeleton className="h-6 w-16" />

            {/* Remove button */}
            <Skeleton className="h-8 w-8 rounded" />
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="border-t pt-4 space-y-2">
        <div className="flex justify-between">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-20" />
        </div>
        <div className="flex justify-between">
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-4 w-18" />
        </div>
        <div className="flex justify-between font-semibold">
          <Skeleton className="h-5 w-14" />
          <Skeleton className="h-5 w-22" />
        </div>
      </div>

      {/* Checkout button */}
      <Skeleton className="h-12 w-full rounded-lg" />
    </div>
  );
};
