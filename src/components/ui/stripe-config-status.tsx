import React from 'react';
import { AlertCircle, CheckCircle, AlertTriangle } from 'lucide-react';
import { validateStripeEnvironment } from '@/config/stripe';

interface StripeConfigStatusProps {
  showOnlyErrors?: boolean;
  className?: string;
}

export const StripeConfigStatus: React.FC<StripeConfigStatusProps> = ({ 
  showOnlyErrors = false, 
  className = '' 
}) => {
  const validation = validateStripeEnvironment();
  
  // Don't render anything if validation passes and we only want to show errors
  if (showOnlyErrors && validation.isValid && validation.warnings.length === 0) {
    return null;
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Errors */}
      {validation.errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start">
            <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 mr-2 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-red-800 mb-1">Stripe Configuration Errors:</p>
              <ul className="text-red-700 space-y-1">
                {validation.errors.map((error, index) => (
                  <li key={index}>• {error}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Warnings */}
      {validation.warnings.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-start">
            <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 mr-2 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-amber-800 mb-1">Stripe Configuration Notices:</p>
              <ul className="text-amber-700 space-y-1">
                {validation.warnings.map((warning, index) => (
                  <li key={index}>• {warning}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Success state (only when not showing errors only) */}
      {!showOnlyErrors && validation.isValid && validation.warnings.length === 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-start">
            <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-green-800">Stripe configuration is valid and ready for payments.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StripeConfigStatus;
