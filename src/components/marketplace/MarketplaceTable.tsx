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
      <Card className="glass-card">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b bg-primary/5">
                  <TableHead className="w-24">Buy</TableHead>
                  <TableHead className="text-right w-24">
                    <MetricTooltip metric="Price" description="">
                      <SortButton field="price">Price</SortButton>
                    </MetricTooltip>
                  </TableHead>
                  <TableHead className="min-w-[240px]">
                    <SortButton field="domain">Media</SortButton>
                  </TableHead>
                  <TableHead className="text-center w-16">
                    <MetricTooltip metric="DR" description="">
                      <SortButton field="ahrefsDR">DR</SortButton>
                    </MetricTooltip>
                  </TableHead>
                  <TableHead className="text-center w-20">
                    <MetricTooltip metric="Organic Traffic" description="">
                      <SortButton field="organicTraffic">Traffic</SortButton>
                    </MetricTooltip>
                  </TableHead>
                  <TableHead className="text-center w-32">
                    Accepts Niche
                  </TableHead>
                  <TableHead className="min-w-[120px]">Notes</TableHead>
                  <TableHead className="text-center w-20">
                    Accepts No License
                  </TableHead>
                  <TableHead className="text-center w-20">
                    Sponsor Tag
                  </TableHead>
                  
                </TableRow>
              </TableHeader>
            <TableBody>
              {media.map((item, index) => (
                <TableRow 
                  key={item.id} 
                  className={`border-b hover:bg-table-row-hover transition-colors ${
                    index % 2 === 0 ? 'bg-table-row-even' : 'bg-background'
                  }`}
                >
                  {/* Buy Button + Favorite */}
                  <TableCell>
                    <div className="flex items-center gap-1">
                  <Button
                    variant={addedToCart === item.id ? "default" : "default"}
                    size="sm"
                    onClick={() => handleAddToCart(item)}
                    disabled={addingToCart === item.id}
                    className={`h-8 transition-all hover:scale-105 ${
                      addedToCart === item.id
                        ? "bg-green-600 hover:bg-green-700 text-white glass-button-success"
                        : "glass-button-primary"
                    }`}
                  >
                    {addingToCart === item.id ? (
                      <div className="flex items-center gap-1">
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                        <span>Adding...</span>
                      </div>
                    ) : addedToCart === item.id ? (
                      <div className="flex items-center gap-1">
                        <Check className="h-3 w-3 mr-1" />
                        <span>Added!</span>
                      </div>
                    ) : (
                      <>
                        <ShoppingCart className="h-3 w-3 mr-1" />
                        Buy
                      </>
                    )}
                  </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onToggleFavorite(item.id)}
                        className="h-6 w-6 transition-all hover:scale-110"
                      >
                        <Heart 
                          className={`h-3 w-3 transition-all ${
                            item.isFavorite 
                              ? 'fill-red-500 text-red-500 animate-pulse' 
                              : 'text-muted-foreground hover:text-red-400'
                          }`} 
                        />
                      </Button>
                    </div>
                  </TableCell>

                  {/* Price */}
                  <TableCell className="text-right">
                    <div className="flex flex-col items-end">
                      {/* Mock sale logic based on item ID */}
                      {item.id.charCodeAt(2) % 4 === 0 ? (
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground line-through">€{Math.round(item.price * 1.2)}</span>
                            <Badge variant="destructive" className="text-xs animate-pulse">-17%</Badge>
                          </div>
                          <span className="font-semibold text-base text-green-600">€{item.price}</span>
                        </div>
                      ) : (
                        <span className="font-semibold text-base">€{item.price}</span>
                      )}
                    </div>
                  </TableCell>
                  
                  {/* Media - Domain + Actions + Categories */}
                  <TableCell className="font-medium">
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <Link 
                          to={`/marketplace/${item.id}`}
                          className="text-primary hover:underline font-semibold text-base"
                        >
                          {item.domain}
                        </Link>
                        <div className="flex items-center gap-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => copyToClipboard(item.domain, 'Domain')}
                                className="h-5 w-5"
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
                                size="icon"
                                onClick={() => copyToClipboard(`https://${item.domain}`, 'URL')}
                                className="h-5 w-5"
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
                                size="icon"
                                onClick={() => window.open(`https://${item.domain}`, '_blank')}
                                className="h-5 w-5"
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
                          <Badge key={niche} variant="outline" className="text-xs px-1 py-0">
                            {niche}
                          </Badge>
                        ))}
                        {item.niches.filter(niche => niche !== item.category).length > 3 && (
                          <Badge variant="outline" className="text-xs px-1 py-0">
                            +{item.niches.filter(niche => niche !== item.category).length - 3}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </TableCell>

                  {/* DR */}
                  <TableCell className="text-center">
                  <Badge 
                    variant={getMetricBadgeVariant(item.metrics.ahrefsDR, 'dr') as any}
                    className="font-medium transition-colors"
                  >
                    {item.metrics.ahrefsDR}
                  </Badge>
                  </TableCell>

                  {/* Traffic */}
                  <TableCell className="text-center">
                    <span className="text-sm font-medium">
                      {item.metrics.organicTraffic.toLocaleString()}
                    </span>
                  </TableCell>

                  {/* Accepts Niche - Icons with multipliers */}
                  <TableCell>
                    <div className="flex flex-wrap gap-1 justify-center max-w-[120px]">
                      {NICHES.slice(0, 4).map((niche) => {
                        const Icon = niche.icon;
                        const nicheRule = item.nicheRules?.find(rule => rule.nicheSlug === niche.slug);
                        const isAccepted = nicheRule?.accepted || false;
                        const multiplier = nicheRule?.multiplier || niche.defaultMultiplier;
                        
                        return (
                          <Tooltip key={niche.slug}>
                            <TooltipTrigger asChild>
                              <div className="flex flex-col items-center gap-0.5">
                                <div className={`p-1 rounded ${isAccepted ? 'text-primary' : 'text-muted-foreground opacity-50'}`}>
                                  <Icon className="h-3.5 w-3.5" />
                                </div>
                                {isAccepted && (
                                  <Badge variant="outline" className="text-xs px-1 py-0 h-4 bg-green-50 text-green-700 border-green-200">
                                    {formatMultiplier(multiplier)}
                                  </Badge>
                                )}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <div className="text-center">
                                <div className="font-medium">{niche.label}</div>
                                <div className="text-sm text-muted-foreground">
                                  {isAccepted ? `Accepted • ${formatMultiplier(multiplier)}` : 'Not accepted'}
                                </div>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        );
                      })}
                    </div>
                  </TableCell>

                  {/* Notes */}
                  <TableCell>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="text-sm text-muted-foreground truncate max-w-[120px]">
                          {item.guidelines || 'No special requirements'}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <div className="text-sm">
                          {item.guidelines || 'No special requirements specified for this media outlet.'}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TableCell>

                  {/* Accepts No License */}
                  <TableCell className="text-center">
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${
                        item.acceptsNoLicenseStatus === 'yes' 
                          ? 'bg-green-50 text-green-700 border-green-200' 
                          : item.acceptsNoLicenseStatus === 'depends'
                          ? 'bg-yellow-50 text-yellow-700 border-yellow-200'
                          : 'bg-red-50 text-red-700 border-red-200'
                      }`}
                    >
                      {item.acceptsNoLicenseStatus === 'yes' ? 'Yes' : 
                       item.acceptsNoLicenseStatus === 'depends' ? 'Depends' : 'No'}
                    </Badge>
                  </TableCell>

                  {/* Sponsor Tag */}
                  <TableCell className="text-center">
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${
                        item.sponsorTagStatus === 'yes'
                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                          : 'bg-gray-50 text-gray-700 border-gray-200'
                      }`}
                    >
                      {item.sponsorTagStatus === 'yes' 
                        ? `Yes (${item.sponsorTagType || 'text'})` 
                        : 'Not Required'}
                    </Badge>
                  </TableCell>

                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
    
    </TooltipProvider>
  );
};