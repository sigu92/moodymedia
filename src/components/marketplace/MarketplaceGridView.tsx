import { useState } from "react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Heart, ShoppingCart, ExternalLink, Info, Check } from "lucide-react";
import { MediaWithMetrics } from "@/types";
import { Link } from "react-router-dom";
import { NICHES, formatMultiplier } from "./niches";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

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
  const [addingToCart, setAddingToCart] = useState<string | null>(null);
  const [addedToCart, setAddedToCart] = useState<string | null>(null);
  const { user } = useAuth();

  const handleAddToCart = async (item: MediaWithMetrics) => {
    if (!user) {
      toast.error("Please sign in to add items to cart", {
        description: "You need to be authenticated to add items to your cart."
      });
      return;
    }

    // Optimistic UI update - show success immediately (< 500ms target)
    setAddingToCart(item.id);
    setAddedToCart(item.id);

    // Show instant toast feedback
    toast.success("Added to cart!", {
      description: `${item.domain} has been added to your cart.`,
      duration: 2000
    });

    try {
      // Add to cart with default settings (no niche, multiplier 1.0)
      await onAddToCart(item.id, undefined, 1.0);

      // Clear loading state after successful operation
      setTimeout(() => {
        setAddingToCart(null);
      }, 200);

      // Clear success state after 2 seconds (reduced from 3)
      setTimeout(() => {
        setAddedToCart(null);
      }, 2000);

    } catch (error) {
      console.error('Error adding to cart:', error);

      // Rollback optimistic update on error
      setAddingToCart(null);
      setAddedToCart(null);

      toast.error("Failed to add to cart", {
        description: "Please try again.",
        duration: 3000
      });
    }
  };
  
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
        <div key={item.id} className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md hover:border-gray-300 transition-all duration-200 group">
          {/* Header */}
          <div className="p-6 pb-4">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <Link 
                  to={`/marketplace/${item.id}`}
                  className="text-lg font-semibold text-gray-900 hover:text-green-600 transition-colors block truncate"
                >
                  {item.domain}
                </Link>
                <p className="text-sm text-gray-500 truncate mt-1">{item.category}</p>
              </div>
              <div className="flex items-center gap-1 ml-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onToggleFavorite(item.id)}
                  className="h-8 w-8 p-0 text-gray-400 hover:text-red-500 hover:bg-red-50"
                >
                  <Heart className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.open(`https://${item.domain}`, '_blank')}
                  className="h-8 w-8 p-0 text-gray-400 hover:text-gray-600"
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 pb-6 space-y-4">
            {/* Price */}
            <div className="text-center">
              {item.id.charCodeAt(2) % 4 === 0 ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-sm text-gray-400 line-through">€{Math.round(item.price * 1.2)}</span>
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                      -17%
                    </span>
                  </div>
                  <div className="text-2xl font-bold text-green-600">€{item.price}</div>
                </div>
              ) : (
                <div className="text-2xl font-bold text-gray-900">€{item.price}</div>
              )}
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center">
                <div className="text-xs text-gray-500 mb-2">Ahrefs DR</div>
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                  item.metrics.ahrefsDR >= 70 ? 'bg-green-100 text-green-800' :
                  item.metrics.ahrefsDR >= 50 ? 'bg-blue-100 text-blue-800' :
                  item.metrics.ahrefsDR >= 30 ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {item.metrics.ahrefsDR}
                </span>
              </div>
              <div className="text-center">
                <div className="text-xs text-gray-500 mb-2">Traffic</div>
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                  {item.metrics.organicTraffic.toLocaleString()}
                </span>
              </div>
              <div className="text-center">
                <div className="text-xs text-gray-500 mb-2">Spam Score</div>
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                  item.metrics.spamScore <= 5 ? 'bg-green-100 text-green-800' :
                  item.metrics.spamScore <= 15 ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {item.metrics.spamScore}
                </span>
              </div>
              <div className="text-center">
                <div className="text-xs text-gray-500 mb-2">Ref Domains</div>
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                  {item.metrics.referringDomains}
                </span>
              </div>
            </div>

            {/* Accepted Niches - Horizontal Layout */}
            <div>
              <div className="text-xs text-gray-500 mb-2">Accepts Niches</div>
              <div className="flex items-center gap-1">
                {NICHES.slice(0, 4).map((niche) => {
                  const Icon = niche.icon;
                  const mockAcceptedNiches = ['casino', 'loans', 'dating', 'crypto'];
                  const isAccepted = mockAcceptedNiches.includes(niche.slug);
                  
                  return (
                    <div key={niche.slug} className="flex items-center gap-0.5">
                      <div className={`p-0.5 rounded ${isAccepted ? 'text-green-600' : 'text-gray-400 opacity-50'}`}>
                        <Icon className="h-3 w-3" />
                      </div>
                      {isAccepted && (
                        <span className="inline-flex items-center px-1 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          {formatMultiplier(niche.defaultMultiplier)}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Quick Info */}
            <div className="flex justify-between text-xs text-gray-500">
              <span>No License: {item.id.charCodeAt(0) % 3 === 0 ? 'Yes' : 'No'}</span>
              <span>Tag: {['Text', 'Image', 'Unknown'][item.id.charCodeAt(1) % 3]}</span>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 pb-6 space-y-2">
            <Button
              onClick={() => handleAddToCart(item)}
              disabled={addingToCart === item.id}
              className="w-full h-10 bg-black text-white hover:bg-gray-800 rounded-lg font-medium transition-colors"
            >
              {addingToCart === item.id ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Adding...</span>
                </div>
              ) : addedToCart === item.id ? (
                <div className="flex items-center gap-2 text-green-400">
                  <Check className="h-4 w-4" />
                  <span>Added!</span>
                </div>
              ) : (
                <>
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Add to Cart
                </>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full h-8 border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300"
              asChild
            >
              <Link to={`/marketplace/${item.id}`}>
                <Info className="h-4 w-4 mr-2" />
                View Details
              </Link>
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
};