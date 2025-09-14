import { useState } from "react";
import { Search, Filter, X, ChevronDown, ChevronUp, Sparkles, Sliders, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { FilterOptions } from "@/types";
import { NICHES } from "./niches";

interface ActiveFilters {
  search?: string;
  country?: string;
  language?: string;
  category?: string;
  maxPrice?: string;
  minDR?: string;
  minOrganicTraffic?: string;
  maxSpamScore?: string;
  acceptedNiches?: string[];
  acceptsNoLicense?: string;
  sponsorTag?: string;
  onSale?: boolean;
  showLowMetricSites?: boolean;
}

interface MarketplaceFiltersProps {
  filterOptions: FilterOptions;
  onFiltersChange: (filters: ActiveFilters) => void;
  activeFilters: ActiveFilters;
}

export const MarketplaceFilters = ({ filterOptions, onFiltersChange, activeFilters }: MarketplaceFiltersProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState(activeFilters.search || "");

  const handleFilterChange = (key: string, value: string | string[] | boolean) => {
    const newFilters = { ...activeFilters, [key]: value };
    onFiltersChange(newFilters);
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    handleFilterChange("search", value);
  };

  const clearFilters = () => {
    setSearchTerm("");
    onFiltersChange({});
  };

  const activeFilterCount = Object.keys(activeFilters).filter(key => {
    const value = activeFilters[key];
    return key !== "search" && value !== undefined && value !== "" && 
           (Array.isArray(value) ? value.length > 0 : true);
  }).length;

  return (
    <div className="mb-6">
      {/* Modern Filter Header */}
      <div 
        className={`
          relative overflow-hidden
          bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50
          border border-gray-200/60 rounded-xl
          shadow-sm hover:shadow-md
          transition-all duration-300 ease-out
          cursor-pointer group
          ${isOpen ? 'shadow-lg border-blue-300/50' : 'hover:border-gray-300/80'}
        `}
        onClick={() => setIsOpen(!isOpen)}
      >
        {/* Animated background gradient */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-indigo-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        <div className="relative px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Animated icon */}
              <div className="relative">
                <div className="absolute inset-0 bg-blue-500/20 rounded-lg blur group-hover:blur-md transition-all duration-300" />
                <div className="relative bg-white p-2 rounded-lg shadow-sm group-hover:shadow-md transition-all duration-300">
                  <Sliders className={`h-5 w-5 text-blue-600 transition-transform duration-300 ${isOpen ? 'rotate-180' : 'group-hover:rotate-12'}`} />
                </div>
              </div>
              
              {/* Title with animation */}
              <div className="space-y-1">
                <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-900 transition-colors duration-200">
                  Smart Filters
                  {activeFilterCount > 0 && (
                    <Badge 
                      className="ml-3 bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors duration-200 animate-pulse"
                      variant="secondary"
                    >
                      {activeFilterCount} active
                    </Badge>
                  )}
                </h3>
                <p className="text-sm text-gray-600 group-hover:text-gray-700 transition-colors duration-200">
                  {isOpen ? 'Click to collapse filters' : `Find your perfect media outlets ${activeFilterCount > 0 ? '• Filters applied' : '• Click to explore options'}`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Clear filters button */}
              {activeFilterCount > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    clearFilters();
                  }}
                  className="group/clear hover:bg-red-50 hover:border-red-200 hover:text-red-700 transition-all duration-200"
                >
                  <X className="h-4 w-4 mr-2 group-hover/clear:rotate-90 transition-transform duration-200" />
                  Clear all
                </Button>
              )}

              {/* Toggle indicator */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-600 group-hover:text-blue-600 transition-colors duration-200">
                  {isOpen ? 'Collapse' : 'Expand'}
                </span>
                <div className="p-1 rounded-lg bg-white/50 group-hover:bg-white transition-all duration-200">
                  {isOpen ? (
                    <ChevronUp className="h-4 w-4 text-gray-600 group-hover:text-blue-600 transition-all duration-200" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-gray-600 group-hover:text-blue-600 transition-all duration-200 group-hover:translate-y-0.5" />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Subtle border animation */}
        <div className="absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left" />
      </div>
      
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleContent className="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:slide-out-to-top-2 data-[state=open]:slide-in-from-top-2">
          <div className="mt-4 bg-white border border-gray-200/60 rounded-xl shadow-sm">
            <div className="p-6 space-y-6">
            {/* Enhanced Search */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Search className="h-4 w-4 text-blue-500" />
                Quick Search
              </Label>
              <div className="relative group">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 group-hover:text-blue-500 transition-colors duration-200" />
                <Input
                  placeholder="Search by domain name..."
                  value={searchTerm}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-10 h-11 border-gray-200 focus:border-blue-300 focus:ring-blue-100 transition-all duration-200 hover:border-gray-300"
                />
                {searchTerm && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSearchChange('')}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0 hover:bg-gray-100"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>

            {/* Enhanced Filter Grid */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Settings className="h-4 w-4 text-blue-500" />
                <Label className="text-sm font-semibold text-gray-700">Filter Options</Label>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Country */}
                <div className="space-y-3 group">
                  <Label className="text-sm font-semibold text-gray-700 group-hover:text-blue-600 transition-colors duration-200 flex items-center gap-1">
                    🌍 Country
                  </Label>
                  <Select value={activeFilters.country || "all"} onValueChange={(value) => handleFilterChange("country", value === "all" ? "" : value)}>
                    <SelectTrigger className="h-10 border-gray-200 hover:border-blue-300 focus:border-blue-300 transition-colors duration-200">
                      <SelectValue placeholder="All countries" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All countries</SelectItem>
                      {filterOptions.countries.map((country) => (
                        <SelectItem key={country} value={country}>
                          {country}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Language */}
                <div className="space-y-3 group">
                  <Label className="text-sm font-semibold text-gray-700 group-hover:text-blue-600 transition-colors duration-200 flex items-center gap-1">
                    🗣️ Language
                  </Label>
                  <Select value={activeFilters.language || "all"} onValueChange={(value) => handleFilterChange("language", value === "all" ? "" : value)}>
                    <SelectTrigger className="h-10 border-gray-200 hover:border-blue-300 focus:border-blue-300 transition-colors duration-200">
                      <SelectValue placeholder="All languages" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All languages</SelectItem>
                      {filterOptions.languages.map((language) => (
                        <SelectItem key={language} value={language}>
                          {language}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Category */}
                <div className="space-y-3 group">
                  <Label className="text-sm font-semibold text-gray-700 group-hover:text-blue-600 transition-colors duration-200 flex items-center gap-1">
                    📂 Category
                  </Label>
                  <Select value={activeFilters.category || "all"} onValueChange={(value) => handleFilterChange("category", value === "all" ? "" : value)}>
                    <SelectTrigger className="h-10 border-gray-200 hover:border-blue-300 focus:border-blue-300 transition-colors duration-200">
                      <SelectValue placeholder="All categories" />
                    </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All categories</SelectItem>
                    {filterOptions.categories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                </div>

                {/* Price Range */}
                <div className="space-y-3 group">
                  <Label className="text-sm font-semibold text-gray-700 group-hover:text-blue-600 transition-colors duration-200 flex items-center gap-1">
                    💰 Max Price (EUR)
                  </Label>
                  <Input
                    type="number"
                    placeholder="Max price"
                    value={activeFilters.maxPrice || ""}
                    onChange={(e) => handleFilterChange("maxPrice", e.target.value)}
                    className="h-10 border-gray-200 hover:border-blue-300 focus:border-blue-300 transition-colors duration-200"
                  />
                </div>
              </div>
            </div>

            {/* Enhanced Metrics Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-purple-500" />
                <Label className="text-sm font-semibold text-gray-700">Quality Metrics</Label>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* DR Range */}
                <div className="space-y-3 group">
                  <Label className="text-sm font-semibold text-gray-700 group-hover:text-purple-600 transition-colors duration-200 flex items-center gap-1">
                    📊 Min Ahrefs DR
                  </Label>
                  <Input
                    type="number"
                    placeholder="Min DR (0-100)"
                    value={activeFilters.minDR || ""}
                    onChange={(e) => handleFilterChange("minDR", e.target.value)}
                    className="h-10 border-gray-200 hover:border-purple-300 focus:border-purple-300 transition-colors duration-200"
                  />
                </div>

                {/* Organic Traffic */}
                <div className="space-y-3 group">
                  <Label className="text-sm font-semibold text-gray-700 group-hover:text-purple-600 transition-colors duration-200 flex items-center gap-1">
                    📈 Min Organic Traffic
                  </Label>
                  <Input
                    type="number"
                    placeholder="Min monthly visitors"
                    value={activeFilters.minOrganicTraffic || ""}
                    onChange={(e) => handleFilterChange("minOrganicTraffic", e.target.value)}
                    className="h-10 border-gray-200 hover:border-purple-300 focus:border-purple-300 transition-colors duration-200"
                  />
                </div>

                {/* Max Spam Score */}
                <div className="space-y-3 group">
                  <Label className="text-sm font-semibold text-gray-700 group-hover:text-purple-600 transition-colors duration-200 flex items-center gap-1">
                    🛡️ Max Spam Score
                  </Label>
                  <Input
                    type="number"
                    placeholder="Max spam score (0-100)"
                    value={activeFilters.maxSpamScore || ""}
                    onChange={(e) => handleFilterChange("maxSpamScore", e.target.value)}
                    className="h-10 border-gray-200 hover:border-purple-300 focus:border-purple-300 transition-colors duration-200"
                  />
                </div>
              </div>
            </div>

            {/* Niche Acceptance Filters */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Accepts Niches</Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {NICHES.map(niche => {
                  const Icon = niche.icon;
                  const isSelected = activeFilters.acceptedNiches?.includes(niche.slug);
                  
                  return (
                    <div 
                      key={niche.slug}
                      className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${
                        isSelected ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                      }`}
                      onClick={() => {
                        const currentNiches = activeFilters.acceptedNiches || [];
                        const newNiches = isSelected 
                          ? currentNiches.filter((n: string) => n !== niche.slug)
                          : [...currentNiches, niche.slug];
                        handleFilterChange("acceptedNiches", newNiches.length > 0 ? newNiches : undefined);
                      }}
                    >
                      <Icon className="h-4 w-4 text-primary" />
                      <span className="text-sm capitalize">{niche.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Additional Filters Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Accepts No License */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Accepts No License</Label>
                <Select 
                  value={activeFilters.acceptsNoLicense || "all"} 
                  onValueChange={(value) => handleFilterChange("acceptsNoLicense", value === "all" ? "" : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Any" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Any</SelectItem>
                    <SelectItem value="yes">Yes</SelectItem>
                    <SelectItem value="no">No</SelectItem>
                    <SelectItem value="depends">Depends</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Sponsor Tag */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Sponsor Tag</Label>
                <Select 
                  value={activeFilters.sponsorTag || "all"} 
                  onValueChange={(value) => handleFilterChange("sponsorTag", value === "all" ? "" : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Any" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Any</SelectItem>
                    <SelectItem value="yes">Required</SelectItem>
                    <SelectItem value="no">Not Required</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* On Sale */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Special Offers</Label>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="onSale"
                    checked={activeFilters.onSale || false}
                    onCheckedChange={(checked) => handleFilterChange("onSale", checked)}
                  />
                  <Label htmlFor="onSale" className="text-sm">
                    Show only sites on sale
                  </Label>
                </div>
              </div>
            </div>

            {/* Enhanced Low Metric Sites Toggle */}
            <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg border border-gray-100">
              <Checkbox
                id="showLowMetricSites"
                checked={activeFilters.showLowMetricSites || false}
                onCheckedChange={(checked) => handleFilterChange("showLowMetricSites", checked)}
                className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
              />
              <Label htmlFor="showLowMetricSites" className="text-sm font-medium text-gray-700 cursor-pointer">
                💡 Show low metric sites (DR &lt; 20, Traffic &lt; 1000)
              </Label>
            </div>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};