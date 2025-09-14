import React from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Step {
  id: string;
  title: string;
  description: string;
}

export interface ProgressIndicatorProps {
  currentStep: number;
  totalSteps: number;
  steps: Step[];
  className?: string;
}

export const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  currentStep,
  totalSteps,
  steps,
  className
}) => {
  return (
    <div className={cn("w-full py-3 sm:py-4", className)}>
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const stepNumber = index + 1;
          const isCompleted = stepNumber < currentStep;
          const isCurrent = stepNumber === currentStep;
          const isUpcoming = stepNumber > currentStep;

          return (
            <React.Fragment key={step.id}>
              {/* Step Circle */}
              <div className="flex flex-col items-center flex-1 min-w-0">
                <div
                  className={cn(
                    "flex items-center justify-center w-7 h-7 rounded-full border-2 text-xs font-medium transition-all duration-200 sm:w-8 sm:h-8 sm:text-sm",
                    {
                      "bg-primary border-primary text-primary-foreground": isCompleted,
                      "bg-primary border-primary text-primary-foreground ring-4 ring-primary/20": isCurrent,
                      "border-muted-foreground/30 text-muted-foreground": isUpcoming,
                    }
                  )}
                >
                  {isCompleted ? (
                    <Check className="h-3 w-3 sm:h-4 sm:w-4" />
                  ) : (
                    stepNumber
                  )}
                </div>

                {/* Step Title */}
                <div className="mt-1 text-center px-1 sm:mt-2">
                  <div
                    className={cn(
                      "text-xs font-medium transition-colors duration-200 leading-tight sm:text-sm",
                      {
                        "text-primary": isCurrent,
                        "text-muted-foreground": isUpcoming,
                        "text-foreground": isCompleted,
                      }
                    )}
                  >
                    <span className="hidden sm:inline">{step.title}</span>
                    <span className="sm:hidden">
                      {step.title.split(' ')[0]}
                    </span>
                  </div>
                  <div
                    className={cn(
                      "text-xs mt-0.5 transition-colors duration-200 leading-tight sm:mt-1",
                      {
                        "text-primary/70": isCurrent,
                        "text-muted-foreground/70": isUpcoming,
                        "text-muted-foreground": isCompleted,
                      }
                    )}
                  >
                    <span className="hidden sm:inline">{step.description}</span>
                    <span className="sm:hidden text-[10px]">
                      {step.description.split(' ')[0]}
                    </span>
                  </div>
                </div>
              </div>

              {/* Connector Line */}
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    "flex-1 h-0.5 mx-2 transition-colors duration-200 sm:mx-4",
                    {
                      "bg-primary": isCompleted,
                      "bg-primary/50": isCurrent,
                      "bg-muted-foreground/30": isUpcoming,
                    }
                  )}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
