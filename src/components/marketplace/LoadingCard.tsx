import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

interface LoadingCardProps {
  message?: string;
  className?: string;
}

export const LoadingCard = ({ message = "Loading...", className }: LoadingCardProps) => {
  return (
    <Card className={`glass-card ${className}`}>
      <CardContent className="py-12">
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="relative">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <div className="absolute inset-0 h-8 w-8 animate-ping border-2 border-primary/20 rounded-full"></div>
          </div>
          <p className="text-muted-foreground text-sm">{message}</p>
        </div>
      </CardContent>
    </Card>
  );
};