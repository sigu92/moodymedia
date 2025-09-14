import React from 'react';

export const StripeLogo: React.FC<{ className?: string }> = ({ className = "h-8 w-auto" }) => (
  <img 
    src="/images payment/stripe logo.webp" 
    alt="Stripe" 
    className={className}
  />
);

export const PayPalLogo: React.FC<{ className?: string }> = ({ className = "h-8 w-auto" }) => (
  <img 
    src="/images payment/PayPal.svg.webp" 
    alt="PayPal" 
    className={className}
  />
);

export const FortnoxLogo: React.FC<{ className?: string }> = ({ className = "h-8 w-auto" }) => (
  <img 
    src="/images payment/Fortnox-2021_customer.webp" 
    alt="Fortnox" 
    className={className}
  />
);
