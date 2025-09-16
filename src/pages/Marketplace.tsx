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
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FloatingIconsBackground } from "@/components/ui/floating-icons-background";
import { useMediaOutlets } from "@/hooks/useMediaOutlets";
import { useFavorites } from "@/hooks/useFavorites";
import { useCart } from "@/hooks/useCart";
import { useAuth } from "@/contexts/AuthContext";
import { FilterOptions } from "@/types";
import { supabase } from "@/integrations/supabase/client";

// Media platform icons for marketplace background
const IconGoogle = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

const IconYouTube = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" fill="#FF0000"/>
  </svg>
);

const IconTwitter = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" fill="currentColor"/>
  </svg>
);

const IconFacebook = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" fill="#1877F2"/>
  </svg>
);

const IconLinkedIn = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" fill="#0A66C2"/>
  </svg>
);

const IconGlobe = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none"/>
    <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" stroke="currentColor" strokeWidth="2" fill="none"/>
  </svg>
);

// Define the media platform icons positioned to match the red dots on the grid
// 6 icons: Google, X/Twitter, Facebook, LinkedIn, YouTube, Globe - positioned closer to edges
const marketplaceIcons = [
  // Top-Left dot - Google (closer to edge, not at 5% grid line)
  { id: 1, icon: IconGoogle, className: 'top-[0.3%] left-[25%]' },
  
  // Top-Right dot - X/Twitter (closer to edge, not at 5% grid line)
  { id: 2, icon: IconTwitter, className: 'top-[0.3%] right-[25%]' },
  
  // Mid-Left dot - Facebook (closer to edge, not at 5% grid line)
  { id: 3, icon: IconFacebook, className: 'top-[3%] left-[20%]' },
  
  // Mid-Right dot - LinkedIn (closer to edge, not at 5% grid line)
  { id: 4, icon: IconLinkedIn, className: 'top-[3%] right-[20%]' },
  
  // Bottom-Left dot - YouTube (closer to edge, not at 5% grid line)
  { id: 5, icon: IconYouTube, className: 'top-[1%] left-[17%]' },
  
  // Bottom-Right dot - Globe (closer to edge, not at 5% grid line)
  { id: 6, icon: IconGlobe, className: 'top-[1%] right-[17%]' },
];

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
  List,
  ChevronLeft,
  ChevronRight
} from "lucide-react";

const Marketplace = () => {
  const [filters, setFilters] = useState<MarketplaceFilterState>({});
  const [sortField, setSortField] = useState<string>('domain');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [searchMode, setSearchMode] = useState<'simple' | 'advanced'>('simple');
  const [savedFilters, setSavedFilters] = useState<SavedFilterItem[]>([]);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [smartFiltersExpanded, setSmartFiltersExpanded] = useState(false);

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

    // Limit to 100 items max for performance
    const limitedFiltered = filtered.slice(0, 100);

    return limitedFiltered;
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
      <div className="min-h-screen bg-white">
        <main className="max-w-7xl mx-auto px-6 py-8">
          <div className="mb-16">
            <div className="text-center max-w-4xl mx-auto">
              <h1 className="text-5xl md:text-6xl font-bold text-gray-800 mb-6 leading-tight">
                Media <span className="text-green-600">Marketplace</span>
              </h1>
              <p className="text-xl text-gray-600 mb-8 leading-relaxed max-w-3xl mx-auto">
                Discover and purchase high-quality link placements from verified media outlets. 
                Build your authority with premium backlinks from trusted publishers.
              </p>
            </div>
          </div>
          <MarketplaceSkeletonLoader rows={8} />
        </main>
      </div>
    );
  }

  if (mediaError) {
    return (
      <div className="min-h-screen bg-white">
        <main className="max-w-7xl mx-auto px-6 py-8">
          <div className="mb-16">
            <div className="text-center max-w-4xl mx-auto">
              <h1 className="text-5xl md:text-6xl font-bold text-gray-800 mb-6 leading-tight">
                Media <span className="text-green-600">Marketplace</span>
              </h1>
              <p className="text-xl text-gray-600 mb-8 leading-relaxed max-w-3xl mx-auto">
                Discover and purchase high-quality link placements from verified media outlets. 
                Build your authority with premium backlinks from trusted publishers.
              </p>
            </div>
          </div>
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-red-600 mb-2">Error Loading Marketplace</h2>
            <p className="text-gray-600">{mediaError}</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white relative">
      {/* Floating Icons Background - positioned relative to full viewport */}
      <FloatingIconsBackground icons={marketplaceIcons} />
      
      <main className="max-w-7xl mx-auto px-6 pt-12 pb-8 relative z-10">
        {/* Hero Section */}
        <div className="mb-16">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-5xl md:text-6xl font-bold text-gray-800 mb-6 leading-tight">
              Media <span className="text-green-600">Marketplace</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 leading-relaxed max-w-3xl mx-auto">
              Discover and purchase high-quality link placements from verified media outlets. 
              Build your authority with premium backlinks from trusted publishers.
            </p>
            
            {/* Quick Stats */}
            <div className="flex flex-wrap justify-center gap-8 mb-8">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-800">{allMedia.length}+</div>
                <div className="text-sm text-gray-600">Verified Publishers</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">€273</div>
                <div className="text-sm text-gray-600">Average Price</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-800">49</div>
                <div className="text-sm text-gray-600">Avg Domain Rating</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-800">2</div>
                <div className="text-sm text-gray-600">Countries</div>
              </div>
            </div>
          </div>
        </div>

        {/* Ultra-Smart Bar - Intelligent Compact Design with Integrated Smart Filters */}
        <div className="mb-8">
          <div className="bg-black rounded-xl shadow-lg overflow-hidden">
            {/* Main Row - All Functions in One Line */}
            <div className="flex items-center gap-4 p-4">
              {/* Navigation Tabs - Compact */}
              <div className="flex items-center gap-1">
                <button className="flex items-center gap-1 px-2 py-1.5 bg-green-600 text-white rounded-md text-xs font-medium">
                  <Eye className="h-3 w-3" />
                  Browse ({filteredAndSortedMedia.length})
                </button>
                <button className="flex items-center gap-1 px-2 py-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-md text-xs font-medium transition-colors">
                  <Star className="h-3 w-3" />
                  Favs ({favoriteMedia.length})
                </button>
                <button className="flex items-center gap-1 px-2 py-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-md text-xs font-medium transition-colors">
                  <BarChart3 className="h-3 w-3" />
                  Analytics
                </button>
              </div>

              {/* Search Input - Compact */}
              <div className="flex-1 max-w-sm">
                <input
                  type="text"
                  placeholder="Search domain, category, country..."
                  className="w-full px-3 py-2 bg-white border-0 rounded-md focus:ring-2 focus:ring-green-500 focus:outline-none transition-colors text-sm"
                  value={filters.search || ''}
                  onChange={(e) => setFilters({...filters, search: e.target.value})}
                />
              </div>

              {/* Active Filter Chips - Compact */}
              <div className="flex items-center gap-1">
                {filters.minDR && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-600 text-white rounded-full text-xs font-medium">
                    DR{filters.minDR}+
                    <button
                      onClick={() => setFilters({...filters, minDR: undefined})}
                      className="ml-0.5 hover:bg-green-700 rounded-full p-0.5"
                    >
                      ×
                    </button>
                  </span>
                )}
                {filters.priceMax && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-600 text-white rounded-full text-xs font-medium">
                    €{filters.priceMax}
                    <button
                      onClick={() => setFilters({...filters, priceMax: undefined})}
                      className="ml-0.5 hover:bg-green-700 rounded-full p-0.5"
                    >
                      ×
                    </button>
                  </span>
                )}
                {filters.country && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-600 text-white rounded-full text-xs font-medium">
                    {filters.country}
                    <button
                      onClick={() => setFilters({...filters, country: undefined})}
                      className="ml-0.5 hover:bg-green-700 rounded-full p-0.5"
                    >
                      ×
                    </button>
                  </span>
                )}
                {filters.category && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-600 text-white rounded-full text-xs font-medium">
                    {filters.category}
                    <button
                      onClick={() => setFilters({...filters, category: undefined})}
                      className="ml-0.5 hover:bg-green-700 rounded-full p-0.5"
                    >
                      ×
                    </button>
                  </span>
                )}
              </div>

              {/* Smart Filter Button - Expandable */}
              <Button
                variant="outline"
                size="sm"
                className="border-white/20 text-white hover:bg-white/10 bg-transparent px-3 py-2 text-xs"
                onClick={() => setSmartFiltersExpanded(!smartFiltersExpanded)}
                title={smartFiltersExpanded ? 'Collapse Smart Filters' : 'Expand Smart Filters'}
              >
                <Filter className="h-3 w-3 mr-1" />
                Smart Filters
                <ChevronRight className={`h-3 w-3 ml-1 transition-transform ${smartFiltersExpanded ? 'rotate-90' : ''}`} />
              </Button>

              {/* View Controls - Compact */}
              <div className="flex items-center bg-white/10 rounded-md p-0.5">
                <Button
                  variant="ghost"
                  size="sm"
                  className={`p-1.5 transition-colors ${
                    viewMode === 'table' 
                      ? 'bg-white text-black' 
                      : 'text-white/70 hover:text-white'
                  }`}
                  onClick={() => setViewMode('table')}
                  title="Table View"
                >
                  <List className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className={`p-1.5 transition-colors ${
                    viewMode === 'grid' 
                      ? 'bg-white text-black' 
                      : 'text-white/70 hover:text-white'
                  }`}
                  onClick={() => setViewMode('grid')}
                  title="Grid View"
                >
                  <Grid className="h-3 w-3" />
                </Button>
              </div>

              {/* Stats Summary - Compact */}
              <div className="flex items-center gap-3 text-xs">
                <div className="flex items-center gap-1">
                  <span className="text-white/70">Showing:</span>
                  <span className="px-1.5 py-0.5 bg-green-600 text-white rounded-full font-medium">
                    {filteredAndSortedMedia.length}/{allMedia.length}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-white/70">Avg:</span>
                  <span className="text-white font-medium">€273</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-white/70">DR:</span>
                  <span className="text-white font-medium">49</span>
                </div>
                {(Object.keys(filters).length > 0) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-white/70 hover:text-white hover:bg-white/10 p-1 text-xs"
                    onClick={handleResetFilters}
                    title="Clear All Filters"
                  >
                    Clear
                  </Button>
                )}
              </div>
            </div>

            {/* Expanded Smart Filters Section */}
            {smartFiltersExpanded && (
              <div className="border-t border-white/10 bg-white p-6 shadow-lg">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Filter className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-800 text-lg">Smart Filters</h3>
                      <p className="text-gray-500 text-sm">Click to collapse filters.</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-gray-500 hover:text-gray-700"
                    onClick={() => setSmartFiltersExpanded(false)}
                  >
                    Collapse ^
                  </Button>
                </div>

                {/* Quick Search */}
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Search className="h-4 w-4 text-gray-600" />
                    <Label className="text-sm font-medium text-gray-700">Quick Search</Label>
                  </div>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search by domain name..."
                      className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      value={filters.search || ''}
                      onChange={(e) => setFilters({...filters, search: e.target.value})}
                    />
                  </div>
                </div>

                {/* Filter Options */}
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Settings className="h-4 w-4 text-gray-600" />
                    <Label className="text-sm font-medium text-gray-700">Filter Options</Label>
                  </div>
                  <div className="grid grid-cols-4 gap-4">
                    <div>
                      <Label className="text-xs text-gray-600 mb-1 block">Country</Label>
                      <select className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm">
                        <option>All countries</option>
                        <option>Sweden</option>
                        <option>Norway</option>
                        <option>Denmark</option>
                      </select>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-600 mb-1 block">Language</Label>
                      <select className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm">
                        <option>All languages</option>
                        <option>Swedish</option>
                        <option>Norwegian</option>
                        <option>Danish</option>
                      </select>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-600 mb-1 block">Category</Label>
                      <select className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm">
                        <option>All categories</option>
                        <option>News</option>
                        <option>Technology</option>
                        <option>Business</option>
                      </select>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-600 mb-1 block">Max Price (EUR)</Label>
                      <input
                        type="number"
                        placeholder="Max price"
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                        value={filters.priceMax || ''}
                        onChange={(e) => setFilters({...filters, priceMax: Number(e.target.value)})}
                      />
                    </div>
                  </div>
                </div>

                {/* Quality Metrics */}
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Star className="h-4 w-4 text-purple-600" />
                    <Label className="text-sm font-medium text-gray-700">Quality Metrics</Label>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label className="text-xs text-gray-600 mb-1 block">Min Ahrefs DR</Label>
                      <input
                        type="number"
                        placeholder="Min DR (0-100)"
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                        value={filters.minDR || ''}
                        onChange={(e) => setFilters({...filters, minDR: Number(e.target.value)})}
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-gray-600 mb-1 block">Min Organic Traffic</Label>
                      <input
                        type="number"
                        placeholder="Min monthly visitors"
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                        value={filters.minOrganicTraffic || ''}
                        onChange={(e) => setFilters({...filters, minOrganicTraffic: Number(e.target.value)})}
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-gray-600 mb-1 block">Max Spam Score</Label>
                      <input
                        type="number"
                        placeholder="Max spam score (0-100)"
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                        value={filters.maxSpamScore || ''}
                        onChange={(e) => setFilters({...filters, maxSpamScore: Number(e.target.value)})}
                      />
                    </div>
                  </div>
                </div>

                {/* Accepts Niches */}
                <div className="mb-6">
                  <Label className="text-sm font-medium text-gray-700 mb-4 block">Accepts Niches</Label>
                  <div className="flex flex-wrap gap-2">
                    {['Casino', 'Loans', 'Adult', 'Dating', 'CBD', 'Crypto', 'Forex'].map((niche) => (
                      <button
                        key={niche}
                        className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:border-gray-300 hover:bg-gray-50 transition-colors"
                      >
                        {niche}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Additional Filters */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-gray-600 mb-1 block">Accepts No License</Label>
                    <select className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm">
                      <option>Any</option>
                      <option>Yes</option>
                      <option>No</option>
                    </select>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-600 mb-1 block">Sponsor Tag</Label>
                    <select className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm">
                      <option>Any</option>
                      <option>Sponsored</option>
                      <option>Guest Post</option>
                    </select>
                  </div>
                </div>

                {/* Special Offers */}
                <div className="mt-4 flex items-center gap-2">
                  <input type="checkbox" id="special-offers" className="rounded" />
                  <Label htmlFor="special-offers" className="text-sm text-gray-700">Show only sites on sale</Label>
                </div>

                {/* Low Metric Sites */}
                <div className="mt-3 flex items-center gap-2">
                  <input type="checkbox" id="low-metric" className="rounded" />
                  <Label htmlFor="low-metric" className="text-sm text-gray-700">Show low metric sites (DR &lt; 20, Traffic &lt; 1000)</Label>
                </div>
              </div>
            )}
          </div>
        </div>

        <Tabs defaultValue="browse" className="space-y-6">

          <TabsContent value="browse" className="space-y-6">

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

            {filteredAndSortedMedia.length === 100 && (
              <div className="mt-8 text-center">
                <div className="inline-flex p-3 bg-green-600 text-white rounded-lg max-w-md mx-auto">
                  <p className="text-sm">
                    Results limited to 100 items for optimal performance. Use filters to narrow down your search.
                  </p>
                </div>
              </div>
            )}
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