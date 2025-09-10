import { Search, Filter, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface MarketplaceEmptyStateProps {
  hasActiveFilters: boolean;
  onClearFilters: () => void;
  onRefresh?: () => void;
  title?: string;
  description?: string;
}

export const MarketplaceEmptyState = ({ 
  hasActiveFilters, 
  onClearFilters, 
  onRefresh,
  title,
  description 
}: MarketplaceEmptyStateProps) => {
  const defaultTitle = hasActiveFilters ? "No media outlets match your filters" : "No media outlets found";
  const defaultDescription = hasActiveFilters 
    ? "Try adjusting your search criteria to find more results"
    : "There are currently no media outlets available in the marketplace";

  return (
    <Card className="glass-card">
      <CardContent className="py-16">
        <div className="text-center space-y-6">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            {hasActiveFilters ? (
              <Filter className="h-8 w-8 text-primary" />
            ) : (
              <Search className="h-8 w-8 text-primary" />
            )}
          </div>
          
          <div className="space-y-2">
            <h3 className="text-xl font-semibold text-foreground">
              {title || defaultTitle}
            </h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              {description || defaultDescription}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {hasActiveFilters && (
              <Button onClick={onClearFilters} variant="outline" className="glass-button">
                <Filter className="h-4 w-4 mr-2" />
                Clear all filters
              </Button>
            )}
            {onRefresh && (
              <Button onClick={onRefresh} variant="outline" className="glass-button">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh data
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};