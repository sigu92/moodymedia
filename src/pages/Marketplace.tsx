import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MarketplaceFilters } from "@/components/marketplace/MarketplaceFilters";
import { AdvancedSearchFilters } from "@/components/marketplace/AdvancedSearchFilters";
import { MarketplaceTable } from "@/components/marketplace/MarketplaceTable";
import { MarketplaceGridView } from "@/components/marketplace/MarketplaceGridView";
import { SavedFilterBar } from "@/components/marketplace/SavedFilterBar";
import { MarketplaceSkeletonLoader } from "@/components/marketplace/MarketplaceSkeletonLoader";
import { MarketplaceEmptyState } from "@/components/marketplace/MarketplaceEmptyState";
import { QuickStatsBar } from "@/components/marketplace/QuickStatsBar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMediaOutlets } from "@/hooks/useMediaOutlets";
import { useFavorites } from "@/hooks/useFavorites";
import { useCart } from "@/hooks/useCart";
import { useAuth } from "@/contexts/AuthContext";
import { FilterOptions } from "@/types";
import { supabase } from "@/integrations/supabase/client";

interface MarketplaceFilterState {
  search?: string;
  searchTerm?: string;
  country?: string;
  language?: string;
  category?: string;
  maxPrice?: number;
  priceMin?: number;
  priceMax?: number;
  minDR?: number;
  ahrefsDrMin?: number;
  ahrefsDrMax?: number;
  mozDaMin?: number;
  mozDaMax?: number;
  minOrganicTraffic?: number;
  organicTrafficMin?: number;
  organicTrafficMax?: number;
  maxSpamScore?: number;
  spamScoreMin?: number;
  spamScoreMax?: number;
  currency?: string;
  leadTimeMin?: number;
  leadTimeMax?: number;
  showLowMetricSites?: boolean;
  acceptedNiches?: string[];
  acceptsNoLicense?: string;
  sponsorTag?: string;
  onSale?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

interface SavedFilterItem {
  id: string;
  name: string;
  filters: MarketplaceFilterState;
  createdAt: string;
}
import { 
  Eye, 
  Star, 
  DollarSign, 
  Filter,
  Search,
  BarChart3,
  Settings,
  Grid,
  List
} from "lucide-react";

const Marketplace = () => {
  const [filters, setFilters] = useState<MarketplaceFilterState>({});
  const [sortField, setSortField] = useState<string>('domain');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [searchMode, setSearchMode] = useState<'simple' | 'advanced'>('simple');
  const [savedFilters, setSavedFilters] = useState<SavedFilterItem[]>([]);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  const { user } = useAuth();
  const { media: allMedia, loading: mediaLoading, error: mediaError } = useMediaOutlets();
  const { favorites, toggleFavorite } = useFavorites();
  const { addToCart } = useCart();

  // Add favorites info to media data
  const mediaWithFavorites = useMemo(() => {
    return allMedia.map(media => ({
      ...media,
      isFavorite: favorites.has(media.id)
    }));
  }, [allMedia, favorites]);

  // Load saved filters
  useEffect(() => {
    const loadSavedFilters = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('saved_filters')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setSavedFilters(data || []);
      } catch (error) {
        console.error('Error loading saved filters:', error);
      }
    };

    loadSavedFilters();
  }, [user]);

  // Generate filter options from actual data
  const filterOptions: FilterOptions = useMemo(() => {
    if (allMedia.length === 0) {
      return {
        countries: [],
        languages: [],
        categories: [],
        niches: [],
        priceRange: { min: 0, max: 1000 },
        drRange: { min: 0, max: 100 },
        organicTrafficRange: { min: 0, max: 10000 },
        referringDomainsRange: { min: 0, max: 500 },
        spamScoreRange: { min: 0, max: 100 },
        showLowMetricSites: false
      };
    }

    return {
      countries: [...new Set(allMedia.map(m => m.country))],
      languages: [...new Set(allMedia.map(m => m.language))],
      categories: [...new Set(allMedia.map(m => m.category))],
      niches: [...new Set(allMedia.flatMap(m => m.niches))],
      priceRange: {
        min: Math.min(...allMedia.map(m => m.price)),
        max: Math.max(...allMedia.map(m => m.price))
      },
      drRange: {
        min: Math.min(...allMedia.map(m => m.metrics.ahrefsDR)),
        max: Math.max(...allMedia.map(m => m.metrics.ahrefsDR))
      },
      organicTrafficRange: {
        min: Math.min(...allMedia.map(m => m.metrics.organicTraffic)),
        max: Math.max(...allMedia.map(m => m.metrics.organicTraffic))
      },
      referringDomainsRange: {
        min: Math.min(...allMedia.map(m => m.metrics.referringDomains)),
        max: Math.max(...allMedia.map(m => m.metrics.referringDomains))
      },
      spamScoreRange: {
        min: Math.min(...allMedia.map(m => m.metrics.spamScore)),
        max: Math.max(...allMedia.map(m => m.metrics.spamScore))
      },
      showLowMetricSites: false
    };
  }, [allMedia]);

  const filteredAndSortedMedia = useMemo(() => {
    const filtered = mediaWithFavorites.filter(media => {
      // Search filter
      if (filters.search && !media.domain.toLowerCase().includes(filters.search.toLowerCase())) {
        return false;
      }

      // Advanced search term
      if (filters.searchTerm && !media.domain.toLowerCase().includes(filters.searchTerm.toLowerCase())) {
        return false;
      }

      // Country filter
      if (filters.country && media.country !== filters.country) {
        return false;
      }

      // Language filter
      if (filters.language && media.language !== filters.language) {
        return false;
      }

      // Category filter
      if (filters.category && media.category !== filters.category) {
        return false;
      }

      // Price filter
      if (filters.maxPrice && media.price > filters.maxPrice) {
        return false;
      }
      if (filters.priceMin && media.price < filters.priceMin) {
        return false;
      }
      if (filters.priceMax && media.price > filters.priceMax) {
        return false;
      }

      // DR filter
      if (filters.minDR && media.metrics.ahrefsDR < filters.minDR) {
        return false;
      }
      if (filters.ahrefsDrMin && media.metrics.ahrefsDR < filters.ahrefsDrMin) {
        return false;
      }
      if (filters.ahrefsDrMax && media.metrics.ahrefsDR > filters.ahrefsDrMax) {
        return false;
      }

      // Moz DA filter
      if (filters.mozDaMin && media.metrics.mozDA < filters.mozDaMin) {
        return false;
      }
      if (filters.mozDaMax && media.metrics.mozDA > filters.mozDaMax) {
        return false;
      }

      // Organic traffic filter
      if (filters.minOrganicTraffic && media.metrics.organicTraffic < filters.minOrganicTraffic) {
        return false;
      }
      if (filters.organicTrafficMin && media.metrics.organicTraffic < filters.organicTrafficMin) {
        return false;
      }
      if (filters.organicTrafficMax && media.metrics.organicTraffic > filters.organicTrafficMax) {
        return false;
      }

      // Spam score filter
      if (filters.maxSpamScore && media.metrics.spamScore > filters.maxSpamScore) {
        return false;
      }
      if (filters.spamScoreMin && media.metrics.spamScore < filters.spamScoreMin) {
        return false;
      }
      if (filters.spamScoreMax && media.metrics.spamScore > filters.spamScoreMax) {
        return false;
      }

      // Currency filter
      if (filters.currency && media.currency !== filters.currency) {
        return false;
      }

      // Lead time filter
      if (filters.leadTimeMin && media.leadTimeDays < filters.leadTimeMin) {
        return false;
      }
      if (filters.leadTimeMax && media.leadTimeDays > filters.leadTimeMax) {
        return false;
      }

      // Content type filter - Skip if contentTypes not available in media data
      // TODO: Add content_types field to media_outlets table
      // if (filters.contentType && media.contentTypes && !media.contentTypes.includes(filters.contentType)) {
      //   return false;
      // }

      // Low metric sites filter
      if (!filters.showLowMetricSites) {
        if (media.metrics.ahrefsDR < 20 && media.metrics.organicTraffic < 1000) {
          return false;
        }
      }

      // Accepted niches filter
      if (filters.acceptedNiches && filters.acceptedNiches.length > 0) {
        // For now, we'll mock this as we don't have the real niche data yet
        // In real implementation, this would check against outlet_niche_rules
        const mockAcceptedNiches = ['casino', 'loans', 'dating', 'crypto']; // Mock data
        const hasAnyAcceptedNiche = filters.acceptedNiches.some((niche: string) => 
          mockAcceptedNiches.includes(niche)
        );
        if (!hasAnyAcceptedNiche) {
          return false;
        }
      }

      // Accepts no license filter (mock for now)
      if (filters.acceptsNoLicense && filters.acceptsNoLicense !== "all") {
        // Mock: randomly assign based on outlet ID hash
        const mockAcceptsNoLicense = media.id.charCodeAt(0) % 3 === 0; // Roughly 1/3 accept
        if (filters.acceptsNoLicense === "true" && !mockAcceptsNoLicense) {
          return false;
        }
        if (filters.acceptsNoLicense === "false" && mockAcceptsNoLicense) {
          return false;
        }
      }

      // Sponsor tag filter
      if (filters.sponsorTag && filters.sponsorTag !== "all") {
        if (filters.sponsorTag === "yes" && media.sponsorTagStatus !== "yes") {
          return false;
        }
        if (filters.sponsorTag === "no" && media.sponsorTagStatus !== "no") {
          return false;
        }
      }

      // On sale filter (mock for now)
      if (filters.onSale) {
        // Mock: randomly show some outlets as "on sale"
        const mockOnSale = media.id.charCodeAt(2) % 4 === 0; // Roughly 1/4 on sale
        if (!mockOnSale) {
          return false;
        }
      }

      return true;
    });

    // Sort the filtered results
    const sortBy = filters.sortBy || sortField;
    const sortOrder = filters.sortOrder || sortDirection;

    filtered.sort((a, b) => {
      let aValue: string | number | Date;
      let bValue: string | number | Date;

      switch (sortBy) {
        case 'domain':
          aValue = a.domain;
          bValue = b.domain;
          break;
        case 'price':
          aValue = a.price;
          bValue = b.price;
          break;
        case 'ahrefs_dr':
        case 'ahrefsDR':
          aValue = a.metrics.ahrefsDR;
          bValue = b.metrics.ahrefsDR;
          break;
        case 'organic_traffic':
        case 'organicTraffic':
          aValue = a.metrics.organicTraffic;
          bValue = b.metrics.organicTraffic;
          break;
        case 'referring_domains':
        case 'referringDomains':
          aValue = a.metrics.referringDomains;
          bValue = b.metrics.referringDomains;
          break;
        case 'spam_score':
        case 'spamScore':
          aValue = a.metrics.spamScore;
          bValue = b.metrics.spamScore;
          break;
        default:
          aValue = a.domain;
          bValue = b.domain;
      }

      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    return filtered;
  }, [mediaWithFavorites, filters, sortField, sortDirection]);

  const favoriteMedia = useMemo(() => {
    return mediaWithFavorites.filter(media => media.isFavorite);
  }, [mediaWithFavorites]);

  const handleFiltersChange = (newFilters: MarketplaceFilterState) => {
    setFilters(newFilters);
  };

  const handleAdvancedFiltersChange = (newFilters: Partial<MarketplaceFilterState>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const handleSaveFilter = async (name: string, filterData: MarketplaceFilterState) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('saved_filters')
        .insert({
          user_id: user.id,
          name,
          query: filterData
        });

      if (error) throw error;

      // Reload saved filters
      const { data } = await supabase
        .from('saved_filters')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      setSavedFilters(data || []);
    } catch (error) {
      console.error('Error saving filter:', error);
    }
  };

  const handleLoadFilter = (filterQuery: MarketplaceFilterState) => {
    setFilters(filterQuery);
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleAddToCart = async (mediaId: string, nicheId?: string, multiplier: number = 1.0) => {
    const media = allMedia.find(m => m.id === mediaId);
    if (media) {
      await addToCart(mediaId, media.price, media.currency, nicheId, multiplier);
    }
  };

  const handleResetFilters = () => {
    setFilters({});
  };

  if (mediaLoading) {
    return (
      <div className="min-h-screen bg-background">
        <main className="container mx-auto px-6 py-6">
          <div className="mb-6">
            <h1 className="text-3xl font-bold mb-2">Media Marketplace</h1>
            <p className="text-muted-foreground">
              Discover and purchase high-quality link placements from verified media outlets
            </p>
          </div>
          <MarketplaceSkeletonLoader rows={8} />
        </main>
      </div>
    );
  }

  if (mediaError) {
    return (
      <div className="min-h-screen bg-background">
        <main className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-destructive mb-2">Error Loading Marketplace</h1>
            <p className="text-muted-foreground">{mediaError}</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-6 py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Media Marketplace</h1>
          <p className="text-muted-foreground">
            Discover and purchase high-quality link placements from verified media outlets
          </p>
        </div>

        <Tabs defaultValue="browse" className="space-y-4">
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="browse" className="flex items-center gap-2">
                <Eye className="h-4 w-4" />
                Browse ({filteredAndSortedMedia.length})
              </TabsTrigger>
              <TabsTrigger value="favorites" className="flex items-center gap-2">
                <Star className="h-4 w-4" />
                Favorites ({favoriteMedia.length})
              </TabsTrigger>
              <TabsTrigger value="analytics" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Market Analytics
              </TabsTrigger>
            </TabsList>

            <div className="flex items-center gap-2">
              <Button
                variant={searchMode === 'simple' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSearchMode('simple')}
              >
                <Filter className="h-4 w-4 mr-2" />
                Simple
              </Button>
              <Button
                variant={searchMode === 'advanced' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSearchMode('advanced')}
              >
                <Search className="h-4 w-4 mr-2" />
                Advanced
              </Button>
              <Button
                variant={viewMode === 'table' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('table')}
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('grid')}
              >
                <Grid className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <TabsContent value="browse" className="space-y-4">
            {searchMode === 'simple' ? (
              <>
                <SavedFilterBar
                  currentFilters={filters}
                  onLoadFilter={handleLoadFilter}
                  onResetFilters={handleResetFilters}
                />
                <MarketplaceFilters
                  filterOptions={filterOptions}
                  onFiltersChange={handleFiltersChange}
                  activeFilters={filters}
                />
              </>
            ) : (
              <AdvancedSearchFilters
                onFiltersChange={handleAdvancedFiltersChange}
                savedFilters={savedFilters}
                onSaveFilter={handleSaveFilter}
                onLoadFilter={handleLoadFilter}
              />
            )}

            <QuickStatsBar 
              media={filteredAndSortedMedia}
              allMedia={mediaWithFavorites}
              favoriteCount={favoriteMedia.length}
            />

            {filteredAndSortedMedia.length === 0 ? (
              <MarketplaceEmptyState
                hasActiveFilters={Object.keys(filters).some(key => {
                  const value = filters[key];
                  return key !== "search" && value !== undefined && value !== "" && 
                         (Array.isArray(value) ? value.length > 0 : true);
                })}
                onClearFilters={() => {
                  setFilters({});
                  setSearchMode('simple');
                }}
                onRefresh={() => window.location.reload()}
              />
            ) : viewMode === 'table' ? (
              <MarketplaceTable
                media={filteredAndSortedMedia}
                onAddToCart={handleAddToCart}
                onToggleFavorite={toggleFavorite}
                onSort={handleSort}
                sortField={sortField}
                sortDirection={sortDirection}
              />
            ) : (
              <MarketplaceGridView
                media={filteredAndSortedMedia}
                onAddToCart={handleAddToCart}
                onToggleFavorite={toggleFavorite}
              />
            )}

            <div className="mt-6 text-center text-sm text-muted-foreground">
              Showing {filteredAndSortedMedia.length} of {allMedia.length} media outlets
            </div>
          </TabsContent>

          <TabsContent value="favorites" className="space-y-4">
            <QuickStatsBar 
              media={favoriteMedia}
              allMedia={mediaWithFavorites}
              favoriteCount={favoriteMedia.length}
            />
            
            {favoriteMedia.length === 0 ? (
              <MarketplaceEmptyState
                hasActiveFilters={false}
                onClearFilters={() => {}}
                title="No favorites yet"
                description="Start favoriting media outlets to see them here. Click the heart icon next to any outlet to add it to your favorites."
              />
            ) : viewMode === 'table' ? (
              <MarketplaceTable
                media={favoriteMedia}
                onAddToCart={handleAddToCart}
                onToggleFavorite={toggleFavorite}
                onSort={handleSort}
                sortField={sortField}
                sortDirection={sortDirection}
              />
            ) : (
              <MarketplaceGridView
                media={favoriteMedia}
                onAddToCart={handleAddToCart}
                onToggleFavorite={toggleFavorite}
              />
            )}
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <QuickStatsBar 
              media={mediaWithFavorites}
              allMedia={mediaWithFavorites}
              favoriteCount={favoriteMedia.length}
            />
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="glass-card">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Total Media Outlets</p>
                      <p className="text-2xl font-bold">{allMedia.length}</p>
                    </div>
                    <Eye className="h-8 w-8 text-primary" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Average Price</p>
                      <p className="text-2xl font-bold">
                        €{Math.round(allMedia.reduce((sum, outlet) => sum + Number(outlet.price), 0) / allMedia.length) || 0}
                      </p>
                    </div>
                    <DollarSign className="h-8 w-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">High Authority Sites</p>
                      <p className="text-2xl font-bold">
                        {allMedia.filter(outlet => outlet.metrics && outlet.metrics.ahrefsDR >= 50).length}
                      </p>
                    </div>
                    <BarChart3 className="h-8 w-8 text-blue-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Your Favorites</p>
                      <p className="text-2xl font-bold">{favoriteMedia.length}</p>
                    </div>
                    <Star className="h-8 w-8 text-yellow-600" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Market Overview Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Price Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[
                      { range: "€0-100", count: allMedia.filter(o => Number(o.price) <= 100).length },
                      { range: "€101-200", count: allMedia.filter(o => Number(o.price) > 100 && Number(o.price) <= 200).length },
                      { range: "€201-300", count: allMedia.filter(o => Number(o.price) > 200 && Number(o.price) <= 300).length },
                      { range: "€301+", count: allMedia.filter(o => Number(o.price) > 300).length }
                    ].map((item) => (
                      <div key={item.range} className="flex items-center justify-between">
                        <span className="text-sm">{item.range}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-20 bg-muted rounded-full h-2">
                            <div 
                              className="bg-primary h-2 rounded-full" 
                              style={{ width: `${(item.count / allMedia.length) * 100}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium w-8">{item.count}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Top Categories</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(
                      allMedia.reduce((acc, outlet) => {
                        acc[outlet.category] = (acc[outlet.category] || 0) + 1;
                        return acc;
                      }, {} as Record<string, number>)
                    )
                      .sort(([,a], [,b]) => b - a)
                      .slice(0, 5)
                      .map(([category, count]) => (
                        <div key={category} className="flex items-center justify-between">
                          <span className="text-sm">{category}</span>
                          <Badge variant="secondary">{count}</Badge>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Marketplace;