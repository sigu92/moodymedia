import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { 
  Search, 
  Filter, 
  SlidersHorizontal, 
  X, 
  Plus,
  Bookmark,
  Star,
  TrendingUp,
  Target
} from "lucide-react";

interface AdvancedSearchFiltersProps {
  onFiltersChange: (filters: any) => void;
  savedFilters: any[];
  onSaveFilter: (name: string, filters: any) => void;
  onLoadFilter: (filters: any) => void;
}

export const AdvancedSearchFilters = ({ 
  onFiltersChange, 
  savedFilters, 
  onSaveFilter, 
  onLoadFilter 
}: AdvancedSearchFiltersProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilters, setActiveFilters] = useState<any>({});
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [saveFilterName, setSaveFilterName] = useState("");

  // Pre-defined filter sets for quick access
  const quickFilters = [
    {
      name: "High Authority",
      icon: Star,
      description: "DR 50+, Low Spam",
      filters: {
        ahrefsDrMin: 50,
        spamScoreMax: 10,
        sortBy: "ahrefs_dr",
        sortOrder: "desc"
      }
    },
    {
      name: "Budget Friendly",
      icon: Target,
      description: "Under €200",
      filters: {
        priceMax: 200,
        sortBy: "price",
        sortOrder: "asc"
      }
    },
    {
      name: "High Traffic",
      icon: TrendingUp,
      description: "10k+ Monthly Visitors",
      filters: {
        organicTrafficMin: 10000,
        sortBy: "organic_traffic",
        sortOrder: "desc"
      }
    }
  ];

  const applyFilters = (newFilters: any) => {
    const filters = { ...activeFilters, ...newFilters, searchTerm };
    setActiveFilters(filters);
    onFiltersChange(filters);
  };

  const clearFilter = (key: string) => {
    const newFilters = { ...activeFilters };
    delete newFilters[key];
    setActiveFilters(newFilters);
    onFiltersChange({ ...newFilters, searchTerm });
  };

  const clearAllFilters = () => {
    setActiveFilters({});
    setSearchTerm("");
    onFiltersChange({ searchTerm: "" });
  };

  const applyQuickFilter = (quickFilter: typeof quickFilters[0]) => {
    setActiveFilters(quickFilter.filters);
    onFiltersChange({ ...quickFilter.filters, searchTerm });
  };

  const handleSaveFilter = () => {
    if (saveFilterName.trim()) {
      onSaveFilter(saveFilterName, { ...activeFilters, searchTerm });
      setSaveFilterName("");
    }
  };

  const activeFilterCount = Object.keys(activeFilters).length + (searchTerm ? 1 : 0);

  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Advanced Search & Filters
          </CardTitle>
          <div className="flex items-center gap-2">
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="flex items-center gap-1">
                {activeFilterCount} active
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 p-0 hover:bg-transparent"
                  onClick={clearAllFilters}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              <SlidersHorizontal className="h-4 w-4 mr-2" />
              {showAdvanced ? 'Simple' : 'Advanced'}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by domain name..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              applyFilters({});
            }}
            className="pl-10"
          />
        </div>

        {/* Quick Filters */}
        <div>
          <Label className="text-sm font-medium mb-3 block">Quick Filters</Label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {quickFilters.map((filter) => {
              const Icon = filter.icon;
              return (
                <Button
                  key={filter.name}
                  variant="outline"
                  className="justify-start h-auto p-4 text-left"
                  onClick={() => applyQuickFilter(filter)}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="h-5 w-5 text-primary" />
                    <div>
                      <div className="font-medium">{filter.name}</div>
                      <div className="text-xs text-muted-foreground">{filter.description}</div>
                    </div>
                  </div>
                </Button>
              );
            })}
          </div>
        </div>

        {showAdvanced && (
          <Tabs defaultValue="metrics" className="space-y-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="metrics">Metrics</TabsTrigger>
              <TabsTrigger value="location">Location</TabsTrigger>
              <TabsTrigger value="pricing">Pricing</TabsTrigger>
              <TabsTrigger value="content">Content</TabsTrigger>
            </TabsList>

            <TabsContent value="metrics" className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>Ahrefs DR</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      placeholder="Min"
                      value={activeFilters.ahrefsDrMin || ''}
                      onChange={(e) => applyFilters({ ahrefsDrMin: e.target.value ? parseInt(e.target.value) : undefined })}
                    />
                    <Input
                      type="number"
                      placeholder="Max"
                      value={activeFilters.ahrefsDrMax || ''}
                      onChange={(e) => applyFilters({ ahrefsDrMax: e.target.value ? parseInt(e.target.value) : undefined })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Moz DA</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      placeholder="Min"
                      value={activeFilters.mozDaMin || ''}
                      onChange={(e) => applyFilters({ mozDaMin: e.target.value ? parseInt(e.target.value) : undefined })}
                    />
                    <Input
                      type="number"
                      placeholder="Max"
                      value={activeFilters.mozDaMax || ''}
                      onChange={(e) => applyFilters({ mozDaMax: e.target.value ? parseInt(e.target.value) : undefined })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Spam Score</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      placeholder="Min"
                      value={activeFilters.spamScoreMin || ''}
                      onChange={(e) => applyFilters({ spamScoreMin: e.target.value ? parseInt(e.target.value) : undefined })}
                    />
                    <Input
                      type="number"
                      placeholder="Max"
                      value={activeFilters.spamScoreMax || ''}
                      onChange={(e) => applyFilters({ spamScoreMax: e.target.value ? parseInt(e.target.value) : undefined })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Organic Traffic</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      placeholder="Min"
                      value={activeFilters.organicTrafficMin || ''}
                      onChange={(e) => applyFilters({ organicTrafficMin: e.target.value ? parseInt(e.target.value) : undefined })}
                    />
                    <Input
                      type="number"
                      placeholder="Max"
                      value={activeFilters.organicTrafficMax || ''}
                      onChange={(e) => applyFilters({ organicTrafficMax: e.target.value ? parseInt(e.target.value) : undefined })}
                    />
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="location" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Country</Label>
                  <Select
                    value={activeFilters.country || ''}
                    onValueChange={(value) => applyFilters({ country: value || undefined })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select country" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Countries</SelectItem>
                      <SelectItem value="US">United States</SelectItem>
                      <SelectItem value="GB">United Kingdom</SelectItem>
                      <SelectItem value="SE">Sweden</SelectItem>
                      <SelectItem value="DE">Germany</SelectItem>
                      <SelectItem value="FR">France</SelectItem>
                      <SelectItem value="ES">Spain</SelectItem>
                      <SelectItem value="IT">Italy</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Language</Label>
                  <Select
                    value={activeFilters.language || ''}
                    onValueChange={(value) => applyFilters({ language: value || undefined })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select language" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Languages</SelectItem>
                      <SelectItem value="English">English</SelectItem>
                      <SelectItem value="Swedish">Swedish</SelectItem>
                      <SelectItem value="German">German</SelectItem>
                      <SelectItem value="French">French</SelectItem>
                      <SelectItem value="Spanish">Spanish</SelectItem>
                      <SelectItem value="Italian">Italian</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="pricing" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Price Range (€)</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      placeholder="Min"
                      value={activeFilters.priceMin || ''}
                      onChange={(e) => applyFilters({ priceMin: e.target.value ? parseInt(e.target.value) : undefined })}
                    />
                    <Input
                      type="number"
                      placeholder="Max"
                      value={activeFilters.priceMax || ''}
                      onChange={(e) => applyFilters({ priceMax: e.target.value ? parseInt(e.target.value) : undefined })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Currency</Label>
                  <Select
                    value={activeFilters.currency || ''}
                    onValueChange={(value) => applyFilters({ currency: value || undefined })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Currencies</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="GBP">GBP</SelectItem>
                      <SelectItem value="SEK">SEK</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Lead Time (days)</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      placeholder="Min"
                      value={activeFilters.leadTimeMin || ''}
                      onChange={(e) => applyFilters({ leadTimeMin: e.target.value ? parseInt(e.target.value) : undefined })}
                    />
                    <Input
                      type="number"
                      placeholder="Max"
                      value={activeFilters.leadTimeMax || ''}
                      onChange={(e) => applyFilters({ leadTimeMax: e.target.value ? parseInt(e.target.value) : undefined })}
                    />
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="content" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select
                    value={activeFilters.category || ''}
                    onValueChange={(value) => applyFilters({ category: value || undefined })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Categories</SelectItem>
                      <SelectItem value="Technology">Technology</SelectItem>
                      <SelectItem value="Business">Business</SelectItem>
                      <SelectItem value="Lifestyle">Lifestyle</SelectItem>
                      <SelectItem value="Health">Health</SelectItem>
                      <SelectItem value="Finance">Finance</SelectItem>
                      <SelectItem value="Travel">Travel</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Content Type</Label>
                  <Select
                    value={activeFilters.contentType || ''}
                    onValueChange={(value) => applyFilters({ contentType: value || undefined })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select content type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Types</SelectItem>
                      <SelectItem value="article">Article</SelectItem>
                      <SelectItem value="blog_post">Blog Post</SelectItem>
                      <SelectItem value="guest_post">Guest Post</SelectItem>
                      <SelectItem value="review">Review</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        )}

        {/* Active Filters Display */}
        {activeFilterCount > 0 && (
          <>
            <Separator />
            <div>
              <Label className="text-sm font-medium mb-3 block">Active Filters</Label>
              <div className="flex flex-wrap gap-2">
                {searchTerm && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    Search: "{searchTerm}"
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0 hover:bg-transparent"
                      onClick={() => {
                        setSearchTerm("");
                        applyFilters({});
                      }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                )}
                {Object.entries(activeFilters).map(([key, value]) => (
                  <Badge key={key} variant="secondary" className="flex items-center gap-1">
                    {key}: {String(value)}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0 hover:bg-transparent"
                      onClick={() => clearFilter(key)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Save/Load Filters */}
        <Separator />
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 flex-1">
            <Input
              placeholder="Filter name..."
              value={saveFilterName}
              onChange={(e) => setSaveFilterName(e.target.value)}
              className="max-w-xs"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={handleSaveFilter}
              disabled={!saveFilterName.trim() || activeFilterCount === 0}
            >
              <Bookmark className="h-4 w-4 mr-2" />
              Save Filter
            </Button>
          </div>

          {savedFilters.length > 0 && (
            <Select onValueChange={(value) => {
              const filter = savedFilters.find(f => f.id === value);
              if (filter) {
                setActiveFilters(filter.query);
                setSearchTerm(filter.query.searchTerm || "");
                onLoadFilter(filter.query);
              }
            }}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Load saved filter" />
              </SelectTrigger>
              <SelectContent>
                {savedFilters.map((filter) => (
                  <SelectItem key={filter.id} value={filter.id}>
                    {filter.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </CardContent>
    </Card>
  );
};