import { useState } from "react";
import { Search, Filter, X } from "lucide-react";
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

interface MarketplaceFiltersProps {
  filterOptions: FilterOptions;
  onFiltersChange: (filters: any) => void;
  activeFilters: any;
}

export const MarketplaceFilters = ({ filterOptions, onFiltersChange, activeFilters }: MarketplaceFiltersProps) => {
  const [isOpen, setIsOpen] = useState(true);
  const [searchTerm, setSearchTerm] = useState(activeFilters.search || "");

  const handleFilterChange = (key: string, value: any) => {
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
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {activeFilterCount}
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            {activeFilterCount > 0 && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="h-4 w-4 mr-2" />
                Clear all
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(!isOpen)}
            >
              {isOpen ? "Hide" : "Show"}
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleContent>
          <CardContent className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by domain..."
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Country */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Country</Label>
                <Select value={activeFilters.country || "all"} onValueChange={(value) => handleFilterChange("country", value === "all" ? "" : value)}>
                  <SelectTrigger>
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
              <div className="space-y-2">
                <Label className="text-sm font-medium">Language</Label>
                <Select value={activeFilters.language || "all"} onValueChange={(value) => handleFilterChange("language", value === "all" ? "" : value)}>
                  <SelectTrigger>
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
              <div className="space-y-2">
                <Label className="text-sm font-medium">Category</Label>
                <Select value={activeFilters.category || "all"} onValueChange={(value) => handleFilterChange("category", value === "all" ? "" : value)}>
                  <SelectTrigger>
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
              <div className="space-y-2">
                <Label className="text-sm font-medium">Max Price (EUR)</Label>
                <Input
                  type="number"
                  placeholder="Max price"
                  value={activeFilters.maxPrice || ""}
                  onChange={(e) => handleFilterChange("maxPrice", e.target.value ? parseInt(e.target.value) : "")}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* DR Range */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Min Ahrefs DR</Label>
                <Input
                  type="number"
                  placeholder="Min DR"
                  value={activeFilters.minDR || ""}
                  onChange={(e) => handleFilterChange("minDR", e.target.value ? parseInt(e.target.value) : "")}
                />
              </div>

              {/* Organic Traffic */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Min Organic Traffic</Label>
                <Input
                  type="number"
                  placeholder="Min traffic"
                  value={activeFilters.minOrganicTraffic || ""}
                  onChange={(e) => handleFilterChange("minOrganicTraffic", e.target.value ? parseInt(e.target.value) : "")}
                />
              </div>

              {/* Max Spam Score */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Max Spam Score</Label>
                <Input
                  type="number"
                  placeholder="Max spam score"
                  value={activeFilters.maxSpamScore || ""}
                  onChange={(e) => handleFilterChange("maxSpamScore", e.target.value ? parseInt(e.target.value) : "")}
                />
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

            {/* Low Metric Sites Toggle */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="showLowMetricSites"
                checked={activeFilters.showLowMetricSites || false}
                onCheckedChange={(checked) => handleFilterChange("showLowMetricSites", checked)}
              />
              <Label htmlFor="showLowMetricSites" className="text-sm">
                Show low metric sites (DR &lt; 20, Traffic &lt; 1000)
              </Label>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};