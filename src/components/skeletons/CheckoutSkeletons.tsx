import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export const CheckoutStepSkeleton: React.FC = () => {
  return (
    <div className="space-y-6 p-6">
      {/* Progress indicator skeleton */}
      <div className="flex items-center justify-between mb-8">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="flex flex-col items-center flex-1">
            <Skeleton className="w-8 h-8 rounded-full mb-2" />
            <Skeleton className="h-3 w-16" />
            {i < 4 && <Skeleton className="h-px flex-1 mt-4" />}
          </div>
        ))}
      </div>

      {/* Step content skeleton */}
      <div className="space-y-6">
        <Skeleton className="h-8 w-1/3" />

        {/* Form fields skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>

        <div className="space-y-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-10 w-full" />
        </div>

        <div className="space-y-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>

      {/* Navigation buttons skeleton */}
      <div className="flex justify-between pt-6 border-t">
        <Skeleton className="h-10 w-20" />
        <Skeleton className="h-10 w-24" />
      </div>
    </div>
  );
};

export const CartReviewSkeleton: React.FC = () => {
  return (
    <div className="space-y-4">
      <Skeleton className="h-6 w-48" />

      {/* Cart items skeleton */}
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center space-x-4">
              <Skeleton className="h-12 w-12 rounded" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Skeleton className="h-8 w-8 rounded" />
                <Skeleton className="h-6 w-6" />
                <Skeleton className="h-8 w-8 rounded" />
              </div>
              <Skeleton className="h-6 w-16" />
            </div>
          </div>
        ))}
      </div>

      {/* Order summary skeleton */}
      <div className="border-t pt-4 space-y-2">
        <div className="flex justify-between">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-16" />
        </div>
        <div className="flex justify-between">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-18" />
        </div>
        <div className="flex justify-between font-semibold">
          <Skeleton className="h-5 w-12" />
          <Skeleton className="h-5 w-20" />
        </div>
      </div>
    </div>
  );
};

export const BillingPaymentSkeleton: React.FC = () => {
  return (
    <div className="space-y-6">
      <Skeleton className="h-6 w-48" />

      {/* Billing information skeleton */}
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>

        <div className="space-y-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-10 w-full" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>

        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>

      {/* Payment method skeleton */}
      <div className="space-y-4">
        <Skeleton className="h-6 w-32" />

        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-center space-x-3 p-4 border rounded-lg">
              <Skeleton className="h-4 w-4 rounded" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-6 w-16 ml-auto" />
            </div>
          ))}
        </div>

        <div className="space-y-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    </div>
  );
};

export const ContentUploadSkeleton: React.FC = () => {
  return (
    <div className="space-y-6">
      <Skeleton className="h-6 w-64" />

      {/* Upload area skeleton */}
      <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8">
        <div className="text-center space-y-4">
          <Skeleton className="h-16 w-16 rounded-full mx-auto" />
          <Skeleton className="h-6 w-48 mx-auto" />
          <Skeleton className="h-4 w-64 mx-auto" />
          <Skeleton className="h-10 w-32 mx-auto rounded-lg" />
        </div>
      </div>

      {/* File list skeleton */}
      <div className="space-y-3">
        {[1, 2].map(i => (
          <div key={i} className="flex items-center justify-between p-3 border rounded">
            <div className="flex items-center space-x-3">
              <Skeleton className="h-8 w-8 rounded" />
              <div className="space-y-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Skeleton className="h-6 w-16" />
              <Skeleton className="h-8 w-8 rounded" />
            </div>
          </div>
        ))}
      </div>

      {/* Google Docs link skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-9 w-24 rounded" />
      </div>
    </div>
  );
};

export const OrderConfirmationSkeleton: React.FC = () => {
  return (
    <div className="space-y-6">
      <Skeleton className="h-6 w-48" />

      {/* Order summary skeleton */}
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-6 w-16" />
          </div>
        ))}
      </div>

      {/* Order total skeleton */}
      <div className="border-t pt-4 space-y-2">
        <div className="flex justify-between">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-16" />
        </div>
        <div className="flex justify-between">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-18" />
        </div>
        <div className="flex justify-between font-semibold text-lg">
          <Skeleton className="h-5 w-12" />
          <Skeleton className="h-5 w-20" />
        </div>
      </div>

      {/* Terms and conditions skeleton */}
      <div className="space-y-4">
        <div className="flex items-start space-x-3">
          <Skeleton className="h-4 w-4 rounded mt-1" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>
      </div>

      {/* Submit button skeleton */}
      <Skeleton className="h-12 w-full rounded-lg" />
    </div>
  );
};
