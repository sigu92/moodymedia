import { useState } from "react";
import { Heart, ShoppingCart, ExternalLink, Info, Copy, Link as LinkIcon, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { MetricTooltip } from "@/components/marketplace/MetricTooltip";
import { MediaWithMetrics } from "@/types";
import { Link } from "react-router-dom";
import { NICHES, formatMultiplier } from "./niches";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

interface MarketplaceTableProps {
  media: MediaWithMetrics[];
  onAddToCart: (mediaId: string, nicheId?: string, multiplier?: number) => void;
  onToggleFavorite: (mediaId: string) => void;
  onSort: (field: string) => void;
  sortField?: string;
  sortDirection?: 'asc' | 'desc';
}

export const MarketplaceTable = ({
  media,
  onAddToCart,
  onToggleFavorite,
  onSort,
  sortField,
  sortDirection
}: MarketplaceTableProps) => {
  const [addingToCart, setAddingToCart] = useState<string | null>(null);
  const [addedToCart, setAddedToCart] = useState<string | null>(null);
  const { user } = useAuth();

  const handleAddToCart = async (media: MediaWithMetrics) => {
    if (!user) {
      toast.error("Please sign in to add items to cart", {
        description: "You need to be authenticated to add items to your cart."
      });
      return;
    }

    // Optimistic UI update - show success immediately (< 500ms target)
    setAddingToCart(media.id);
    setAddedToCart(media.id);

    // Show instant toast feedback
    toast.success("Added to cart!", {
      description: `${media.domain} has been added to your cart.`,
      duration: 2000
    });

    try {
      // Add to cart with default settings (no niche, multiplier 1.0)
      await onAddToCart(media.id, undefined, 1.0);

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

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${type} copied to clipboard`);
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
      case 'domains':
        if (value >= 200) return 'excellent';
        if (value >= 100) return 'good';
        if (value >= 50) return 'fair';
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

  const SortButton = ({ field, children }: { field: string; children: React.ReactNode }) => (
    <button
      onClick={() => onSort(field)}
      className="flex items-center gap-1 text-left font-medium hover:text-primary transition-colors"
    >
      {children}
      {sortField === field && (
        <span className="text-xs">
          {sortDirection === 'asc' ? '↑' : '↓'}
        </span>
      )}
    </button>
  );

  return (
    <TooltipProvider>
      {/* Clean Minimalist Table with Thin Rows */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide w-20">Buy</th>
                <th 
                  className="px-4 py-2 text-right text-xs font-semibold text-gray-600 uppercase tracking-wide cursor-pointer hover:bg-gray-100 transition-colors w-24"
                  onClick={() => onSort('price')}
                >
                  <div className="flex items-center justify-end gap-1">
                    Price
                    {sortField === 'price' && (
                      <span className="text-gray-400">
                        {sortDirection === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </th>
                <th 
                  className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide cursor-pointer hover:bg-gray-100 transition-colors min-w-[240px]"
                  onClick={() => onSort('domain')}
                >
                  <div className="flex items-center gap-1">
                    Media
                    {sortField === 'domain' && (
                      <span className="text-gray-400">
                        {sortDirection === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </th>
                <th 
                  className="px-4 py-2 text-center text-xs font-semibold text-gray-600 uppercase tracking-wide cursor-pointer hover:bg-gray-100 transition-colors w-16"
                  onClick={() => onSort('ahrefsDR')}
                >
                  <div className="flex items-center justify-center gap-1">
                    DR
                    {sortField === 'ahrefsDR' && (
                      <span className="text-gray-400">
                        {sortDirection === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </th>
                <th 
                  className="px-4 py-2 text-center text-xs font-semibold text-gray-600 uppercase tracking-wide cursor-pointer hover:bg-gray-100 transition-colors w-20"
                  onClick={() => onSort('organicTraffic')}
                >
                  <div className="flex items-center justify-center gap-1">
                    Traffic
                    {sortField === 'organicTraffic' && (
                      <span className="text-gray-400">
                        {sortDirection === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </th>
                <th className="px-4 py-2 text-center text-xs font-semibold text-gray-600 uppercase tracking-wide w-32">Accepts Niche</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide min-w-[120px]">Notes</th>
                <th className="px-4 py-2 text-center text-xs font-semibold text-gray-600 uppercase tracking-wide w-20">Accepts No License</th>
                <th className="px-4 py-2 text-center text-xs font-semibold text-gray-600 uppercase tracking-wide w-20">Sponsor Tag</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {media.map((item, index) => (
                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                  {/* Buy Button + Favorite */}
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        className="h-7 px-2 text-xs bg-black text-white hover:bg-gray-800 rounded-md font-medium transition-colors"
                        onClick={() => handleAddToCart(item)}
                        disabled={addingToCart === item.id}
                      >
                        {addingToCart === item.id ? (
                          <div className="flex items-center gap-1">
                            <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Adding...
                          </div>
                        ) : addedToCart === item.id ? (
                          <div className="flex items-center gap-1 text-green-400">
                            <Check className="w-3 h-3" />
                            Added
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            <ShoppingCart className="w-3 h-3" />
                            Buy
                          </div>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 text-gray-400 hover:text-red-500 hover:bg-red-50"
                        onClick={() => onToggleFavorite(item.id)}
                      >
                        <Heart className="w-3 h-3" />
                      </Button>
                    </div>
                  </td>

                  {/* Price */}
                  <td className="px-4 py-2 text-right">
                    <div className="flex flex-col items-end">
                      {/* Mock sale logic based on item ID */}
                      {item.id.charCodeAt(2) % 4 === 0 ? (
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-gray-400 line-through">€{Math.round(item.price * 1.2)}</span>
                            <span className="inline-flex items-center px-1 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              -17%
                            </span>
                          </div>
                          <span className="text-sm font-semibold text-green-600">€{item.price}</span>
                        </div>
                      ) : (
                        <span className="text-sm font-semibold text-gray-900">€{item.price}</span>
                      )}
                    </div>
                  </td>
                  
                  {/* Media - Domain + Actions + Categories */}
                  <td className="px-4 py-2">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-1">
                        <Link 
                          to={`/marketplace/${item.id}`}
                          className="text-sm font-medium text-gray-900 hover:text-green-600 transition-colors"
                        >
                          {item.domain}
                        </Link>
                        <div className="flex items-center gap-0.5">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyToClipboard(item.domain, 'Domain')}
                                className="h-5 w-5 p-0 text-gray-400 hover:text-gray-600"
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Copy domain</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyToClipboard(`https://${item.domain}`, 'URL')}
                                className="h-5 w-5 p-0 text-gray-400 hover:text-gray-600"
                              >
                                <LinkIcon className="h-3 w-3" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Copy URL</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => window.open(`https://${item.domain}`, '_blank')}
                                className="h-5 w-5 p-0 text-gray-400 hover:text-gray-600"
                              >
                                <ExternalLink className="h-3 w-3" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Open site</TooltipContent>
                          </Tooltip>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {/* Only show niches that are different from the category */}
                        {item.niches.filter(niche => niche !== item.category).slice(0, 3).map((niche) => (
                          <span key={niche} className="inline-flex items-center px-1.5 py-0.5 rounded-md text-xs font-medium bg-green-100 text-green-800">
                            {niche}
                          </span>
                        ))}
                        {item.niches.filter(niche => niche !== item.category).length > 3 && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-xs font-medium bg-gray-100 text-gray-600">
                            +{item.niches.filter(niche => niche !== item.category).length - 3}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* DR */}
                  <td className="px-4 py-2 text-center">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      item.metrics.ahrefsDR >= 70 ? 'bg-green-100 text-green-800' :
                      item.metrics.ahrefsDR >= 50 ? 'bg-blue-100 text-blue-800' :
                      item.metrics.ahrefsDR >= 30 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {item.metrics.ahrefsDR}
                    </span>
                  </td>

                  {/* Traffic */}
                  <td className="px-4 py-2 text-center">
                    <span className="text-sm font-medium text-gray-900">
                      {item.metrics.organicTraffic.toLocaleString()}
                    </span>
                  </td>

                  {/* Accepts Niche - Horizontal Icons with multipliers */}
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-1 justify-center">
                      {NICHES.slice(0, 4).map((niche) => {
                        const Icon = niche.icon;
                        const nicheRule = item.nicheRules?.find(rule => rule.nicheSlug === niche.slug);
                        const isAccepted = nicheRule?.accepted || false;
                        const multiplier = nicheRule?.multiplier || niche.defaultMultiplier;
                        
                        return (
                          <Tooltip key={niche.slug}>
                            <TooltipTrigger asChild>
                              <div className="flex items-center gap-0.5">
                                <div className={`p-0.5 rounded ${isAccepted ? 'text-green-600' : 'text-gray-400 opacity-50'}`}>
                                  <Icon className="h-3 w-3" />
                                </div>
                                {isAccepted && (
                                  <span className="inline-flex items-center px-1 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                    {formatMultiplier(multiplier)}
                                  </span>
                                )}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <div className="text-center">
                                <div className="font-medium">{niche.label}</div>
                                <div className="text-sm text-gray-500">
                                  {isAccepted ? `Accepted • ${formatMultiplier(multiplier)}` : 'Not accepted'}
                                </div>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        );
                      })}
                    </div>
                  </td>

                  {/* Notes */}
                  <td className="px-4 py-2">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="text-sm text-gray-600 truncate max-w-[120px]">
                          {item.guidelines || 'No special requirements'}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <div className="text-sm">
                          {item.guidelines || 'No special requirements specified for this media outlet.'}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </td>

                  {/* Accepts No License */}
                  <td className="px-4 py-2 text-center">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      item.acceptsNoLicenseStatus === 'yes' 
                        ? 'bg-green-100 text-green-800' 
                        : item.acceptsNoLicenseStatus === 'depends'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {item.acceptsNoLicenseStatus === 'yes' ? 'Yes' : 
                       item.acceptsNoLicenseStatus === 'depends' ? 'Depends' : 'No'}
                    </span>
                  </td>

                  {/* Sponsor Tag */}
                  <td className="px-4 py-2 text-center">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      item.sponsorTagStatus === 'yes'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {item.sponsorTagStatus === 'yes' 
                        ? `Yes (${item.sponsorTagType || 'text'})` 
                        : 'Not Required'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </TooltipProvider>
  );
};