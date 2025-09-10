import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Heart, ShoppingCart, ExternalLink, Info } from "lucide-react";
import { MediaWithMetrics } from "@/types";
import { Link } from "react-router-dom";
import { NICHES, formatMultiplier } from "./niches";

interface MarketplaceGridViewProps {
  media: MediaWithMetrics[];
  onAddToCart: (mediaId: string, nicheId?: string, multiplier?: number) => void;
  onToggleFavorite: (mediaId: string) => void;
}

export const MarketplaceGridView = ({ 
  media, 
  onAddToCart, 
  onToggleFavorite 
}: MarketplaceGridViewProps) => {
  
  const getMetricBadgeVariant = (value: number, type: 'dr' | 'traffic' | 'domains' | 'spam') => {
    switch (type) {
      case 'dr':
        if (value >= 50) return 'excellent';
        if (value >= 30) return 'good';
        if (value >= 15) return 'fair';
        return 'poor';
      case 'traffic':
        if (value >= 5000) return 'excellent';
        if (value >= 2000) return 'good';
        if (value >= 500) return 'fair';
        return 'poor';
      case 'spam':
        if (value <= 5) return 'excellent';
        if (value <= 15) return 'good';
        if (value <= 30) return 'fair';
        return 'poor';
      default:
        return 'default';
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {media.map((item) => (
        <Card key={item.id} className="glass-card group hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <Link 
                  to={`/marketplace/${item.id}`}
                  className="text-lg font-semibold text-primary hover:underline block truncate"
                >
                  {item.domain}
                </Link>
                <p className="text-sm text-muted-foreground truncate">{item.category}</p>
              </div>
              <div className="flex items-center gap-1 ml-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onToggleFavorite(item.id)}
                  className="h-8 w-8 transition-all hover:scale-110"
                >
                  <Heart 
                    className={`h-4 w-4 transition-all ${
                      item.isFavorite 
                        ? 'fill-red-500 text-red-500' 
                        : 'text-muted-foreground hover:text-red-400'
                    }`} 
                  />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => window.open(`https://${item.domain}`, '_blank')}
                  className="h-8 w-8"
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Price */}
            <div className="text-center">
              {item.id.charCodeAt(2) % 4 === 0 ? (
                <div className="space-y-1">
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-sm text-muted-foreground line-through">€{Math.round(item.price * 1.2)}</span>
                    <Badge variant="destructive" className="text-xs animate-pulse">-17%</Badge>
                  </div>
                  <div className="text-2xl font-bold text-green-600">€{item.price}</div>
                </div>
              ) : (
                <div className="text-2xl font-bold">€{item.price}</div>
              )}
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center">
                <div className="text-xs text-muted-foreground mb-1">Ahrefs DR</div>
                <Badge 
                  variant={getMetricBadgeVariant(item.metrics.ahrefsDR, 'dr') as any}
                  className="w-full justify-center"
                >
                  {item.metrics.ahrefsDR}
                </Badge>
              </div>
              <div className="text-center">
                <div className="text-xs text-muted-foreground mb-1">Traffic</div>
                <Badge 
                  variant={getMetricBadgeVariant(item.metrics.organicTraffic, 'traffic') as any}
                  className="w-full justify-center text-xs"
                >
                  {item.metrics.organicTraffic.toLocaleString()}
                </Badge>
              </div>
              <div className="text-center">
                <div className="text-xs text-muted-foreground mb-1">Spam Score</div>
                <Badge 
                  variant={getMetricBadgeVariant(item.metrics.spamScore, 'spam') as any}
                  className="w-full justify-center"
                >
                  {item.metrics.spamScore}
                </Badge>
              </div>
              <div className="text-center">
                <div className="text-xs text-muted-foreground mb-1">Ref Domains</div>
                <Badge variant="outline" className="w-full justify-center">
                  {item.metrics.referringDomains}
                </Badge>
              </div>
            </div>

            {/* Accepted Niches */}
            <div>
              <div className="text-xs text-muted-foreground mb-2">Accepts Niches</div>
              <div className="flex flex-wrap gap-1">
                {NICHES.slice(0, 3).map((niche) => {
                  const Icon = niche.icon;
                  const mockAcceptedNiches = ['casino', 'loans', 'dating', 'crypto'];
                  const isAccepted = mockAcceptedNiches.includes(niche.slug);
                  
                  return isAccepted ? (
                    <div key={niche.slug} className="flex items-center gap-1 bg-primary/10 rounded-full px-2 py-1">
                      <Icon className="h-3 w-3 text-primary" />
                      <span className="text-xs">{formatMultiplier(niche.defaultMultiplier)}</span>
                    </div>
                  ) : null;
                })}
                {NICHES.filter(n => ['casino', 'loans', 'dating', 'crypto'].includes(n.slug)).length > 3 && (
                  <Badge variant="outline" className="text-xs">+more</Badge>
                )}
              </div>
            </div>

            {/* Quick Info */}
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>No License: {item.id.charCodeAt(0) % 3 === 0 ? 'Yes' : 'No'}</span>
              <span>Tag: {['Text', 'Image', 'Unknown'][item.id.charCodeAt(1) % 3]}</span>
            </div>
          </CardContent>

          <CardFooter className="pt-0 space-y-2">
            <div className="w-full space-y-2">
              <Button
                onClick={() => onAddToCart(item.id)}
                className="w-full glass-button-primary transition-all hover:scale-105"
                size="sm"
              >
                <ShoppingCart className="h-4 w-4 mr-2" />
                Add to Cart
              </Button>
              <Button
                variant="outline"
                size="sm"
                asChild
                className="w-full glass-button"
              >
                <Link to={`/marketplace/${item.id}`}>
                  <Info className="h-4 w-4 mr-2" />
                  View Details
                </Link>
              </Button>
            </div>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
};