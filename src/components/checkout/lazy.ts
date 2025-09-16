import React from 'react';
import { createLazyComponent, preloadComponent } from '@/components/lazy/LazyWrapper';
import { CartReviewSkeleton } from '@/components/checkout/skeletons';

// Lazy load checkout components for better performance
export const LazyCheckoutModal = createLazyComponent(
  () => import('./CheckoutModal').then(m => ({ default: m.CheckoutModal })),
  React.createElement('div', {
    className: "flex items-center justify-center p-8"
  }, React.createElement('div', {
    className: "animate-pulse text-center"
  }, [
    React.createElement('div', {
      key: 'skeleton-1',
      className: "h-8 bg-muted rounded w-48 mx-auto mb-4"
    }),
    React.createElement('div', {
      key: 'skeleton-2',
      className: "h-4 bg-muted rounded w-32 mx-auto"
    })
  ]))
);

export const LazyStep1CartReview = createLazyComponent(
  () => import('./Step1CartReview').then(m => ({ default: m.Step1CartReview })),
  React.createElement(CartReviewSkeleton)
);

export const LazyStep2PaymentMethod = createLazyComponent(
  () => import('./Step2BillingPayment').then(m => ({ default: m.Step2BillingPayment })),
  React.createElement('div', {
    className: "space-y-6 p-4"
  }, [
    React.createElement('div', {
      key: 'title',
      className: "h-6 bg-muted rounded w-1/2"
    }),
    React.createElement('div', {
      key: 'payment-methods',
      className: "space-y-4"
    }, [1, 2, 3].map(i =>
      React.createElement('div', {
        key: i,
        className: "border rounded-lg p-4"
      }, [
        React.createElement('div', {
          key: 'header',
          className: "flex items-center justify-between mb-2"
        }, [
          React.createElement('div', {
            key: 'icon',
            className: "h-6 w-6 bg-muted rounded"
          }),
          React.createElement('div', {
            key: 'name',
            className: "h-4 bg-muted rounded w-32"
          }),
          React.createElement('div', {
            key: 'price',
            className: "h-4 bg-muted rounded w-16"
          })
        ]),
        React.createElement('div', {
          key: 'description',
          className: "h-3 bg-muted rounded w-3/4"
        })
      ])
    ))
  ])
);

export const LazyStep3BillingInfo = createLazyComponent(
  () => import('./Step3BillingInfo').then(m => ({ default: m.Step3BillingInfo })),
  React.createElement('div', {
    className: "space-y-6 p-4"
  }, [
    React.createElement('div', {
      key: 'title',
      className: "h-6 bg-muted rounded w-1/2"
    }),
    React.createElement('div', {
      key: 'form',
      className: "grid grid-cols-1 md:grid-cols-2 gap-4"
    }, [
      React.createElement('div', {
        key: 'field1',
        className: "space-y-2"
      }, [
        React.createElement('div', {
          key: 'label',
          className: "h-4 bg-muted rounded w-1/4"
        }),
        React.createElement('div', {
          key: 'input',
          className: "h-10 bg-muted rounded"
        })
      ]),
      React.createElement('div', {
        key: 'field2',
        className: "space-y-2"
      }, [
        React.createElement('div', {
          key: 'label',
          className: "h-4 bg-muted rounded w-1/4"
        }),
        React.createElement('div', {
          key: 'input',
          className: "h-10 bg-muted rounded"
        })
      ])
    ]),
    React.createElement('div', {
      key: 'email',
      className: "space-y-2"
    }, [
      React.createElement('div', {
        key: 'label',
        className: "h-4 bg-muted rounded w-1/3"
      }),
      React.createElement('div', {
        key: 'input',
        className: "h-10 bg-muted rounded"
      })
    ])
  ])
);

export const LazyStep4ContentUpload = createLazyComponent(
  () => import('./Step3ContentUpload').then(m => ({ default: m.Step3ContentUpload })),
  React.createElement('div', {
    className: "space-y-4 p-4"
  }, [
    React.createElement('div', {
      key: 'title',
      className: "h-6 bg-muted rounded w-2/3"
    }),
    React.createElement('div', {
      key: 'upload-area',
      className: "border-2 border-dashed rounded-lg p-8"
    }, React.createElement('div', {
      className: "text-center"
    }, [
      React.createElement('div', {
        key: 'icon',
        className: "h-12 w-12 bg-muted rounded-full mx-auto mb-4"
      }),
      React.createElement('div', {
        key: 'title',
        className: "h-4 bg-muted rounded w-3/4 mx-auto mb-2"
      }),
      React.createElement('div', {
        key: 'subtitle',
        className: "h-3 bg-muted rounded w-1/2 mx-auto"
      })
    ]))
  ])
);

export const LazyStep5OrderConfirmation = createLazyComponent(
  () => import('./Step4OrderConfirmation').then(m => ({ default: m.Step4OrderConfirmation })),
  React.createElement('div', {
    className: "space-y-6 p-4"
  }, [
    React.createElement('div', {
      key: 'title',
      className: "h-6 bg-muted rounded w-1/2"
    }),
    React.createElement('div', {
      key: 'summary',
      className: "space-y-4"
    }, [1, 2, 3].map(i =>
      React.createElement('div', {
        key: i,
        className: "flex justify-between p-4 border rounded"
      }, [
        React.createElement('div', {
          key: 'item',
          className: "space-y-2"
        }, [
          React.createElement('div', {
            key: 'name',
            className: "h-4 bg-muted rounded w-32"
          }),
          React.createElement('div', {
            key: 'desc',
            className: "h-3 bg-muted rounded w-24"
          })
        ]),
        React.createElement('div', {
          key: 'price',
          className: "h-4 bg-muted rounded w-16"
        })
      ])
    )),
    React.createElement('div', {
      key: 'total',
      className: "flex justify-between text-lg font-semibold pt-4 border-t"
    }, [
      React.createElement('div', {
        key: 'label',
        className: "h-5 bg-muted rounded w-16"
      }),
      React.createElement('div', {
        key: 'amount',
        className: "h-5 bg-muted rounded w-20"
      })
    ])
  ])
);

export const LazyProgressIndicator = createLazyComponent(
  () => import('./ProgressIndicator').then(m => ({ default: m.ProgressIndicator })),
  React.createElement('div', {
    className: "flex items-center justify-between mb-8"
  }, [1, 2, 3, 4].map(i =>
    React.createElement('div', {
      key: i,
      className: "flex flex-col items-center"
    }, [
      React.createElement('div', {
        key: 'circle',
        className: "w-8 h-8 bg-muted rounded-full mb-2"
      }),
      React.createElement('div', {
        key: 'label',
        className: "h-3 bg-muted rounded w-16"
      })
    ])
  ))
);

// Preload critical components
export const preloadCheckoutComponents = () => {
  // Preload cart review as it's the first step
  preloadComponent(() => import('./Step1CartReview'));
  preloadComponent(() => import('./ProgressIndicator'));
};

// Preload on user interaction (when cart icon is clicked)
export const preloadAllCheckoutComponents = () => {
  preloadComponent(() => import('./Step1CartReview'));
  preloadComponent(() => import('./Step2BillingPayment'));
  preloadComponent(() => import('./Step3BillingInfo'));
  preloadComponent(() => import('./Step3ContentUpload'));
  preloadComponent(() => import('./Step4OrderConfirmation'));
  preloadComponent(() => import('./ProgressIndicator'));
};
