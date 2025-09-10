import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, CheckCircle, FileText, Globe, Verified, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface OrderTimelineProps {
  currentStatus: string;
  createdAt: string;
  updatedAt: string;
  publicationDate?: string;
}

export const OrderTimeline = ({ currentStatus, createdAt, updatedAt, publicationDate }: OrderTimelineProps) => {
  const timelineSteps = [
    { key: 'requested', label: 'Order Requested', icon: Clock },
    { key: 'accepted', label: 'Order Accepted', icon: CheckCircle },
    { key: 'content_received', label: 'Content Received', icon: FileText },
    { key: 'published', label: 'Published', icon: Globe },
    { key: 'verified', label: 'Verified', icon: Verified },
  ];

  const getStepStatus = (stepKey: string) => {
    const statusOrder = ['requested', 'accepted', 'content_received', 'published', 'verified'];
    const currentIndex = statusOrder.indexOf(currentStatus);
    const stepIndex = statusOrder.indexOf(stepKey);
    
    if (stepIndex <= currentIndex) return 'completed';
    if (stepIndex === currentIndex + 1) return 'current';
    return 'pending';
  };

  const getStepDate = (stepKey: string) => {
    if (stepKey === 'requested') return new Date(createdAt).toLocaleDateString();
    if (stepKey === 'published' && publicationDate) return new Date(publicationDate).toLocaleDateString();
    if (getStepStatus(stepKey) === 'completed') return new Date(updatedAt).toLocaleDateString();
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          Order Progress
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {timelineSteps.map((step, index) => {
            const Icon = step.icon;
            const status = getStepStatus(step.key);
            const date = getStepDate(step.key);
            
            return (
              <div key={step.key} className="flex items-center gap-4">
                <div className={cn(
                  "flex items-center justify-center w-8 h-8 rounded-full border-2",
                  status === 'completed' && "bg-green-100 border-green-300 text-green-700",
                  status === 'current' && "bg-blue-100 border-blue-300 text-blue-700",
                  status === 'pending' && "bg-muted border-muted-foreground/20 text-muted-foreground"
                )}>
                  <Icon className="h-4 w-4" />
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className={cn(
                      "text-sm font-medium",
                      status === 'completed' && "text-green-700",
                      status === 'current' && "text-blue-700",
                      status === 'pending' && "text-muted-foreground"
                    )}>
                      {step.label}
                    </p>
                    {date && (
                      <p className="text-xs text-muted-foreground">{date}</p>
                    )}
                  </div>
                </div>
                
                {index < timelineSteps.length - 1 && (
                  <div className={cn(
                    "absolute left-4 mt-8 w-0.5 h-4",
                    status === 'completed' ? "bg-green-300" : "bg-muted-foreground/20"
                  )} style={{ marginLeft: '15px', transform: 'translateY(16px)' }} />
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};