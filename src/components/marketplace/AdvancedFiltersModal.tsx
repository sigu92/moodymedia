import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { 
  Save, 
  X, 
  Bell, 
  Filter, 
  Share2, 
  Copy, 
  Download,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Target,
  Globe,
  DollarSign,
  Calendar,
  Users,
  Zap,
  Eye,
  Settings
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface SavedFilter {
  id: string;
  name: string;
  description: string;
  query: FilterQuery;
  isShared: boolean;
  sharedBy?: string;
  createdAt: string;
  usageCount: number;
  tags: string[];
}

interface FilterQuery {
  searchTerm: string;
  countries: string[];
  languages: string[];
  categories: string[];
  niches: string[];
  priceRange: [number, number];
  drRange: [number, number];
  daRange: [number, number];
  trafficRange: [number, number];
  spamScoreMax: number;
  isActive: boolean | null;
  leadTimeMax: number;
  hasGuidelines: boolean | null;
  sortBy: string;
  sortDirection: 'asc' | 'desc';
}

interface Alert {
  id: string;
  name: string;
  type: 'price_drop' | 'new_site' | 'competitor' | 'quality_change' | 'custom';
  isActive: boolean;
  conditions: AlertCondition[];
  notifications: {
    email: boolean;
    push: boolean;
    sms: boolean;
  };
  frequency: 'instant' | 'daily' | 'weekly';
  lastTriggered?: string;
  triggerCount: number;
}

interface AlertCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'changes';
  value: string | number | boolean | string[] | [number, number];
  threshold?: number;
}

interface AdvancedFiltersModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyFilters: (filters: FilterQuery) => void;
  currentFilters: FilterQuery;
  savedFilters: SavedFilter[];
  onSaveFilter: (filter: Omit<SavedFilter, 'id' | 'createdAt' | 'usageCount'>) => void;
}

export function AdvancedFiltersModal({ 
  isOpen, 
  onClose, 
  onApplyFilters, 
  currentFilters,
  savedFilters,
  onSaveFilter 
}: AdvancedFiltersModalProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('filters');
  const [filters, setFilters] = useState<FilterQuery>(currentFilters);
  const [filterName, setFilterName] = useState('');
  const [filterDescription, setFilterDescription] = useState('');
  const [filterTags, setFilterTags] = useState<string[]>([]);
  const [shareFilter, setShareFilter] = useState(false);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [newAlert, setNewAlert] = useState<Partial<Alert>>({
    name: '',
    type: 'price_drop',
    isActive: true,
    conditions: [],
    notifications: { email: true, push: true, sms: false },
    frequency: 'instant'
  });

  const availableNiches = [
    'Technology', 'Health', 'Finance', 'Travel', 'Food', 'Fashion',
    'Sports', 'Entertainment', 'Business', 'Education', 'Lifestyle',
    'Real Estate', 'Automotive', 'Gaming', 'Beauty', 'Fitness'
  ];

  const availableCountries = [
    { code: 'SE', name: 'Sweden' },
    { code: 'NO', name: 'Norway' },
    { code: 'DK', name: 'Denmark' },
    { code: 'FI', name: 'Finland' },
    { code: 'DE', name: 'Germany' },
    { code: 'UK', name: 'United Kingdom' },
    { code: 'US', name: 'United States' }
  ];

  const availableLanguages = [
    'Swedish', 'Norwegian', 'Danish', 'Finnish', 'German', 'English'
  ];

  const availableCategories = [
    'Blog', 'News', 'Magazine', 'Niche', 'Directory', 'Forum'
  ];

  const mockAlerts: Alert[] = [
    {
      id: '1',
      name: 'Price Drop Alert - Technology Sites',
      type: 'price_drop',
      isActive: true,
      conditions: [
        { field: 'niches', operator: 'contains', value: 'Technology' },
        { field: 'price', operator: 'less_than', value: 200, threshold: 20 }
      ],
      notifications: { email: true, push: true, sms: false },
      frequency: 'instant',
      lastTriggered: '2024-01-15T10:30:00Z',
      triggerCount: 5
    },
    {
      id: '2',
      name: 'New High-Quality Sites',
      type: 'new_site',
      isActive: true,
      conditions: [
        { field: 'ahrefs_dr', operator: 'greater_than', value: 30 },
        { field: 'spam_score', operator: 'less_than', value: 20 }
      ],
      notifications: { email: true, push: false, sms: false },
      frequency: 'daily',
      triggerCount: 12
    }
  ];

  useEffect(() => {
    loadAlerts();
  }, [user]);

  const loadAlerts = async () => {
    if (!user) return;
    try {
      setAlerts(mockAlerts);
    } catch (error) {
      console.error('Error loading alerts:', error);
    }
  };

  const updateFilter = <K extends keyof FilterQuery>(key: K, value: FilterQuery[K]) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleSaveFilter = async () => {
    if (!filterName.trim()) {
      toast.error('Please enter a filter name');
      return;
    }

    const newFilter: Omit<SavedFilter, 'id' | 'createdAt' | 'usageCount'> = {
      name: filterName,
      description: filterDescription,
      query: filters,
      isShared: shareFilter,
      tags: filterTags
    };

    onSaveFilter(newFilter);
    toast.success('Filter saved successfully');
    
    // Reset form
    setFilterName('');
    setFilterDescription('');
    setFilterTags([]);
    setShareFilter(false);
  };

  const handleCreateAlert = async () => {
    if (!newAlert.name?.trim()) {
      toast.error('Please enter an alert name');
      return;
    }

    const alert: Alert = {
      id: Date.now().toString(),
      name: newAlert.name,
      type: newAlert.type || 'price_drop',
      isActive: true,
      conditions: newAlert.conditions || [],
      notifications: newAlert.notifications || { email: true, push: true, sms: false },
      frequency: newAlert.frequency || 'instant',
      triggerCount: 0
    };

    setAlerts(prev => [...prev, alert]);
    toast.success('Alert created successfully');
    
    // Reset form
    setNewAlert({
      name: '',
      type: 'price_drop',
      isActive: true,
      conditions: [],
      notifications: { email: true, push: true, sms: false },
      frequency: 'instant'
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[95vh] overflow-y-auto glass-modal">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Filter className="h-5 w-5 text-primary" />
            Advanced Filters & Alerts
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="filters" className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Advanced Filters
            </TabsTrigger>
            <TabsTrigger value="saved" className="flex items-center gap-2">
              <Save className="h-4 w-4" />
              Saved Filters
            </TabsTrigger>
            <TabsTrigger value="alerts" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Alerts
            </TabsTrigger>
            <TabsTrigger value="intelligence" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Market Intelligence
            </TabsTrigger>
          </TabsList>

          <TabsContent value="filters" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Geographic & Basic Filters */}
              <Card className="glass-card-clean">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="h-5 w-5 text-blue-600" />
                    Geographic & Basic Filters
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Search Term</Label>
                    <Input
                      placeholder="Search domains, keywords..."
                      value={filters.searchTerm}
                      onChange={(e) => updateFilter('searchTerm', e.target.value)}
                      className="glass-input"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Countries</Label>
                      <Select onValueChange={(value) => {
                        const current = filters.countries || [];
                        if (!current.includes(value)) {
                          updateFilter('countries', [...current, value]);
                        }
                      }}>
                        <SelectTrigger className="glass-input">
                          <SelectValue placeholder="Add country" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableCountries.map(country => (
                            <SelectItem key={country.code} value={country.code}>
                              {country.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div className="flex flex-wrap gap-1">
                        {filters.countries?.map(country => (
                          <Badge key={country} variant="secondary" className="cursor-pointer"
                            onClick={() => updateFilter('countries', filters.countries?.filter(c => c !== country))}>
                            {availableCountries.find(c => c.code === country)?.name}
                            <X className="h-3 w-3 ml-1" />
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Languages</Label>
                      <Select onValueChange={(value) => {
                        const current = filters.languages || [];
                        if (!current.includes(value)) {
                          updateFilter('languages', [...current, value]);
                        }
                      }}>
                        <SelectTrigger className="glass-input">
                          <SelectValue placeholder="Add language" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableLanguages.map(language => (
                            <SelectItem key={language} value={language}>
                              {language}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div className="flex flex-wrap gap-1">
                        {filters.languages?.map(language => (
                          <Badge key={language} variant="secondary" className="cursor-pointer"
                            onClick={() => updateFilter('languages', filters.languages?.filter(l => l !== language))}>
                            {language}
                            <X className="h-3 w-3 ml-1" />
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Categories</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {availableCategories.map(category => (
                        <div key={category} className="flex items-center space-x-2">
                          <Checkbox
                            checked={filters.categories?.includes(category)}
                            onCheckedChange={(checked) => {
                              const current = filters.categories || [];
                              if (checked) {
                                updateFilter('categories', [...current, category]);
                              } else {
                                updateFilter('categories', current.filter(c => c !== category));
                              }
                            }}
                          />
                          <Label className="text-sm">{category}</Label>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Price & Metrics */}
              <Card className="glass-card-clean">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-green-600" />
                    Price & Quality Metrics
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Price Range (EUR): {filters.priceRange?.[0]} - {filters.priceRange?.[1]}</Label>
                    <Slider
                      value={filters.priceRange || [0, 1000]}
                      onValueChange={(value) => updateFilter('priceRange', value)}
                      max={1000}
                      step={50}
                      className="w-full"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Ahrefs DR: {filters.drRange?.[0]} - {filters.drRange?.[1]}</Label>
                    <Slider
                      value={filters.drRange || [0, 100]}
                      onValueChange={(value) => updateFilter('drRange', value)}
                      max={100}
                      step={5}
                      className="w-full"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Moz DA: {filters.daRange?.[0]} - {filters.daRange?.[1]}</Label>
                    <Slider
                      value={filters.daRange || [0, 100]}
                      onValueChange={(value) => updateFilter('daRange', value)}
                      max={100}
                      step={5}
                      className="w-full"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Max Spam Score: {filters.spamScoreMax || 100}</Label>
                    <Slider
                      value={[filters.spamScoreMax || 100]}
                      onValueChange={(value) => updateFilter('spamScoreMax', value[0])}
                      max={100}
                      step={5}
                      className="w-full"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Niches & Advanced Options */}
            <Card className="glass-card-clean">
              <CardHeader>
                <CardTitle>Niches & Advanced Options</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Niches</Label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {availableNiches.map(niche => (
                      <div key={niche} className="flex items-center space-x-2">
                        <Checkbox
                          checked={filters.niches?.includes(niche)}
                          onCheckedChange={(checked) => {
                            const current = filters.niches || [];
                            if (checked) {
                              updateFilter('niches', [...current, niche]);
                            } else {
                              updateFilter('niches', current.filter(n => n !== niche));
                            }
                          }}
                        />
                        <Label className="text-sm">{niche}</Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={filters.isActive === true}
                      onCheckedChange={(checked) => updateFilter('isActive', checked ? true : null)}
                    />
                    <Label>Active Sites Only</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={filters.hasGuidelines === true}
                      onCheckedChange={(checked) => updateFilter('hasGuidelines', checked ? true : null)}
                    />
                    <Label>Has Guidelines</Label>
                  </div>

                  <div className="space-y-2">
                    <Label>Max Lead Time: {filters.leadTimeMax || 30} days</Label>
                    <Slider
                      value={[filters.leadTimeMax || 30]}
                      onValueChange={(value) => updateFilter('leadTimeMax', value[0])}
                      max={30}
                      step={1}
                      className="w-full"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-4 justify-end">
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button onClick={() => onApplyFilters(filters)}>Apply Filters</Button>
            </div>
          </TabsContent>

          <TabsContent value="saved" className="space-y-6">
            {/* Save Current Filter */}
            <Card className="glass-card-clean">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Save className="h-5 w-5 text-blue-600" />
                  Save Current Filter
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Filter Name</Label>
                    <Input
                      placeholder="My Custom Filter"
                      value={filterName}
                      onChange={(e) => setFilterName(e.target.value)}
                      className="glass-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Input
                      placeholder="Filter description..."
                      value={filterDescription}
                      onChange={(e) => setFilterDescription(e.target.value)}
                      className="glass-input"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={shareFilter}
                      onCheckedChange={setShareFilter}
                    />
                    <Label>Share with other users</Label>
                  </div>
                  <Button onClick={handleSaveFilter}>
                    <Save className="h-4 w-4 mr-2" />
                    Save Filter
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Saved Filters List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {savedFilters.map(filter => (
                <Card key={filter.id} className="glass-card-clean">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{filter.name}</CardTitle>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => navigator.clipboard.writeText(`${window.location.origin}?filter=${encodeURIComponent(JSON.stringify(filter.query))}`)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => {
                            setFilters(filter.query);
                            toast.success(`Loaded filter: ${filter.name}`);
                          }}
                        >
                          Load
                        </Button>
                      </div>
                    </div>
                    <CardDescription>{filter.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-muted-foreground">
                      Used {filter.usageCount} times
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="alerts" className="space-y-6">
            {/* Create New Alert */}
            <Card className="glass-card-clean">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5 text-orange-600" />
                  Create New Alert
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Alert Name</Label>
                    <Input
                      placeholder="Price Drop Alert"
                      value={newAlert.name || ''}
                      onChange={(e) => setNewAlert(prev => ({ ...prev, name: e.target.value }))}
                      className="glass-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Alert Type</Label>
                    <Select
                      value={newAlert.type}
                      onValueChange={(value: Alert['type']) => setNewAlert(prev => ({ ...prev, type: value }))}
                    >
                      <SelectTrigger className="glass-input">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="price_drop">Price Drop</SelectItem>
                        <SelectItem value="new_site">New Site</SelectItem>
                        <SelectItem value="competitor">Competitor</SelectItem>
                        <SelectItem value="quality_change">Quality Change</SelectItem>
                        <SelectItem value="custom">Custom</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        checked={newAlert.notifications?.email}
                        onCheckedChange={(checked) => 
                          setNewAlert(prev => ({ 
                            ...prev, 
                            notifications: { ...prev.notifications!, email: checked as boolean }
                          }))
                        }
                      />
                      <Label>Email</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        checked={newAlert.notifications?.push}
                        onCheckedChange={(checked) => 
                          setNewAlert(prev => ({ 
                            ...prev, 
                            notifications: { ...prev.notifications!, push: checked as boolean }
                          }))
                        }
                      />
                      <Label>Push</Label>
                    </div>
                  </div>
                  <Button onClick={handleCreateAlert}>
                    <Bell className="h-4 w-4 mr-2" />
                    Create Alert
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Active Alerts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="glass-card-clean">
                <CardHeader>
                  <CardTitle>Active Alerts</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {mockAlerts.map(alert => (
                    <div key={alert.id} className="p-4 border rounded-lg space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">{alert.name}</h4>
                        <Switch checked={alert.isActive} />
                      </div>
                      
                      <div className="text-sm text-muted-foreground">
                        Type: {alert.type.replace('_', ' ')} • Frequency: {alert.frequency}
                      </div>
                      
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Triggered {alert.triggerCount} times</span>
                        {alert.lastTriggered && (
                          <span>Last: {new Date(alert.lastTriggered).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="intelligence" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Card className="glass-card-clean">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                    Market Trends
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground">
                    Average pricing trends and market insights coming soon.
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-card-clean">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-blue-600" />
                    Competitor Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground">
                    Track competitor pricing and availability.
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-card-clean">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Eye className="h-5 w-5 text-purple-600" />
                    Quality Insights
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground">
                    Site quality analysis and recommendations.
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}