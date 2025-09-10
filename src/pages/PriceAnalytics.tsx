import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  DollarSign,
  TrendingUp,
  TrendingDown,
  BarChart3,
  PieChart,
  Target,
  Zap,
  Filter,
  Download,
  RefreshCw,
  Globe,
  Tag,
  Users,
  Calendar,
  ArrowUpDown,
  AlertTriangle,
  CheckCircle
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface NichePricing {
  niche: string;
  averagePrice: number;
  medianPrice: number;
  minPrice: number;
  maxPrice: number;
  siteCount: number;
  priceChange: number;
  qualityScore: number;
  competitionLevel: 'low' | 'medium' | 'high';
  recommendations: string[];
}

interface PriceAnalysis {
  domain: string;
  currentPrice: number;
  suggestedPrice: number;
  priceEfficiency: number;
  competitors: CompetitorSite[];
  priceHistory: PriceHistoryPoint[];
  marketPosition: 'underpriced' | 'fair' | 'overpriced';
  demandScore: number;
}

interface CompetitorSite {
  domain: string;
  price: number;
  dr: number;
  traffic: number;
  similarity: number;
}

interface PriceHistoryPoint {
  date: string;
  price: number;
  orders: number;
}

interface MarketTrend {
  period: string;
  averagePrice: number;
  orderVolume: number;
  newSites: number;
  priceChange: number;
}

export default function PriceAnalyticsDashboard() {
  const { user } = useAuth();
  const [nicheData, setNicheData] = useState<NichePricing[]>([]);
  const [priceAnalysis, setPriceAnalysis] = useState<PriceAnalysis[]>([]);
  const [marketTrends, setMarketTrends] = useState<MarketTrend[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNiche, setSelectedNiche] = useState<string>('all');
  const [selectedCountry, setSelectedCountry] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('averagePrice');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    loadPricingData();
  }, [selectedNiche, selectedCountry]);

  const loadPricingData = async () => {
    setLoading(true);
    try {
      // Mock pricing data for demonstration
      const mockNicheData: NichePricing[] = [
        {
          niche: 'Technology',
          averagePrice: 285,
          medianPrice: 250,
          minPrice: 150,
          maxPrice: 500,
          siteCount: 45,
          priceChange: 12.3,
          qualityScore: 8.2,
          competitionLevel: 'high',
          recommendations: [
            'Consider premium positioning above €300',
            'High demand for AI/ML content',
            'Mobile-first sites command 15% premium'
          ]
        },
        {
          niche: 'Health',
          averagePrice: 320,
          medianPrice: 300,
          minPrice: 200,
          maxPrice: 600,
          siteCount: 38,
          priceChange: 8.7,
          qualityScore: 9.1,
          competitionLevel: 'medium',
          recommendations: [
            'Medical authority sites can charge premium',
            'GDPR compliance adds value',
            'Trending: mental health topics'
          ]
        },
        {
          niche: 'Finance',
          averagePrice: 410,
          medianPrice: 380,
          minPrice: 250,
          maxPrice: 800,
          siteCount: 29,
          priceChange: 15.2,
          qualityScore: 8.8,
          competitionLevel: 'high',
          recommendations: [
            'Highest paying niche currently',
            'Regulatory compliance essential',
            'Crypto content in high demand'
          ]
        },
        {
          niche: 'Travel',
          averagePrice: 195,
          medianPrice: 180,
          minPrice: 100,
          maxPrice: 350,
          siteCount: 52,
          priceChange: -5.4,
          qualityScore: 7.3,
          competitionLevel: 'low',
          recommendations: [
            'Post-pandemic recovery ongoing',
            'Local travel content performing well',
            'Consider bundling with food/lifestyle'
          ]
        },
        {
          niche: 'Business',
          averagePrice: 265,
          medianPrice: 240,
          minPrice: 180,
          maxPrice: 450,
          siteCount: 41,
          priceChange: 6.8,
          qualityScore: 8.0,
          competitionLevel: 'medium',
          recommendations: [
            'B2B focus yields higher prices',
            'Industry expertise valued',
            'Case studies increase conversion'
          ]
        },
        {
          niche: 'Lifestyle',
          averagePrice: 175,
          medianPrice: 160,
          minPrice: 90,
          maxPrice: 300,
          siteCount: 67,
          priceChange: 3.2,
          qualityScore: 7.1,
          competitionLevel: 'medium',
          recommendations: [
            'High volume, lower prices',
            'Influencer partnerships valuable',
            'Visual content essential'
          ]
        }
      ];

      const mockPriceAnalysis: PriceAnalysis[] = [
        {
          domain: 'techreview.se',
          currentPrice: 250,
          suggestedPrice: 285,
          priceEfficiency: 88,
          competitors: [
            { domain: 'swedishtech.com', price: 280, dr: 35, traffic: 25000, similarity: 92 },
            { domain: 'nordictech.no', price: 290, dr: 38, traffic: 30000, similarity: 87 }
          ],
          priceHistory: [
            { date: '2024-01-01', price: 220, orders: 3 },
            { date: '2024-01-15', price: 240, orders: 5 },
            { date: '2024-02-01', price: 250, orders: 4 }
          ],
          marketPosition: 'underpriced',
          demandScore: 85
        }
      ];

      const mockMarketTrends: MarketTrend[] = [
        { period: 'Jan 2024', averagePrice: 245, orderVolume: 156, newSites: 23, priceChange: 5.2 },
        { period: 'Feb 2024', averagePrice: 258, orderVolume: 189, newSites: 31, priceChange: 5.3 },
        { period: 'Mar 2024', averagePrice: 267, orderVolume: 203, newSites: 28, priceChange: 3.5 }
      ];

      setNicheData(mockNicheData);
      setPriceAnalysis(mockPriceAnalysis);
      setMarketTrends(mockMarketTrends);

    } catch (error) {
      console.error('Error loading pricing data:', error);
      toast.error('Failed to load pricing data');
    } finally {
      setLoading(false);
    }
  };

  const sortedNicheData = [...nicheData].sort((a, b) => {
    const direction = sortDirection === 'asc' ? 1 : -1;
    return ((a[sortBy as keyof NichePricing] as number) - (b[sortBy as keyof NichePricing] as number)) * direction;
  });

  const getCompetitionColor = (level: string) => {
    switch (level) {
      case 'low': return 'text-green-600';
      case 'medium': return 'text-yellow-600';
      case 'high': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getPriceChangeIcon = (change: number) => {
    if (change > 0) return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (change < 0) return <TrendingDown className="h-4 w-4 text-red-600" />;
    return <ArrowUpDown className="h-4 w-4 text-gray-600" />;
  };

  const exportData = () => {
    const csvData = [
      ['Niche', 'Average Price', 'Median Price', 'Site Count', 'Price Change %', 'Quality Score', 'Competition'],
      ...sortedNicheData.map(niche => [
        niche.niche,
        niche.averagePrice,
        niche.medianPrice,
        niche.siteCount,
        niche.priceChange,
        niche.qualityScore,
        niche.competitionLevel
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvData], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `niche-pricing-analysis-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('Pricing data exported successfully');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-center glass-card-clean p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading pricing analytics...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Price Analytics & Market Intelligence
            </h1>
            <p className="text-muted-foreground text-lg">
              Comprehensive pricing insights and competitive analysis
            </p>
          </div>
          <div className="flex gap-3">
            <Button onClick={exportData} variant="outline" className="glass-button">
              <Download className="h-4 w-4 mr-2" />
              Export Data
            </Button>
            <Button onClick={loadPricingData} className="glass-button-primary">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Data
            </Button>
          </div>
        </div>

        {/* Market Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="glass-card-clean hover:shadow-medium transition-all duration-300">
            <CardContent className="p-4 text-center">
              <DollarSign className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <div className="text-2xl font-bold">€267</div>
              <p className="text-sm text-muted-foreground">Market Average</p>
              <div className="flex items-center justify-center gap-1 mt-1">
                <TrendingUp className="h-3 w-3 text-green-600" />
                <span className="text-xs text-green-600">+3.5%</span>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card-clean hover:shadow-medium transition-all duration-300">
            <CardContent className="p-4 text-center">
              <BarChart3 className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <div className="text-2xl font-bold">203</div>
              <p className="text-sm text-muted-foreground">Monthly Orders</p>
              <div className="flex items-center justify-center gap-1 mt-1">
                <TrendingUp className="h-3 w-3 text-blue-600" />
                <span className="text-xs text-blue-600">+12%</span>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card-clean hover:shadow-medium transition-all duration-300">
            <CardContent className="p-4 text-center">
              <Target className="h-8 w-8 text-purple-600 mx-auto mb-2" />
              <div className="text-2xl font-bold">Finance</div>
              <p className="text-sm text-muted-foreground">Top Paying Niche</p>
              <div className="flex items-center justify-center gap-1 mt-1">
                <span className="text-xs text-purple-600">€410 avg</span>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card-clean hover:shadow-medium transition-all duration-300">
            <CardContent className="p-4 text-center">
              <Zap className="h-8 w-8 text-orange-600 mx-auto mb-2" />
              <div className="text-2xl font-bold">23</div>
              <p className="text-sm text-muted-foreground">Underpriced Sites</p>
              <div className="flex items-center justify-center gap-1 mt-1">
                <span className="text-xs text-orange-600">Opportunities</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="niches" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="niches">Niche Analysis</TabsTrigger>
            <TabsTrigger value="competitors">Competitor Intel</TabsTrigger>
            <TabsTrigger value="trends">Market Trends</TabsTrigger>
            <TabsTrigger value="opportunities">Opportunities</TabsTrigger>
          </TabsList>

          <TabsContent value="niches" className="space-y-6">
            {/* Filters */}
            <Card className="glass-card-clean">
              <CardContent className="p-4">
                <div className="flex gap-4 items-center">
                  <Select value={selectedNiche} onValueChange={setSelectedNiche}>
                    <SelectTrigger className="w-48 glass-input">
                      <SelectValue placeholder="All Niches" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Niches</SelectItem>
                      <SelectItem value="Technology">Technology</SelectItem>
                      <SelectItem value="Health">Health</SelectItem>
                      <SelectItem value="Finance">Finance</SelectItem>
                      <SelectItem value="Travel">Travel</SelectItem>
                      <SelectItem value="Business">Business</SelectItem>
                      <SelectItem value="Lifestyle">Lifestyle</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                    <SelectTrigger className="w-48 glass-input">
                      <SelectValue placeholder="All Countries" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Countries</SelectItem>
                      <SelectItem value="SE">Sweden</SelectItem>
                      <SelectItem value="NO">Norway</SelectItem>
                      <SelectItem value="DK">Denmark</SelectItem>
                      <SelectItem value="FI">Finland</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-48 glass-input">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="averagePrice">Average Price</SelectItem>
                      <SelectItem value="priceChange">Price Change</SelectItem>
                      <SelectItem value="siteCount">Site Count</SelectItem>
                      <SelectItem value="qualityScore">Quality Score</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button 
                    variant="outline" 
                    onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
                    className="glass-button"
                  >
                    <ArrowUpDown className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Niche Pricing Table */}
            <Card className="glass-card-clean shadow-medium">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5 text-primary" />
                  Niche Pricing Analysis
                </CardTitle>
                <CardDescription>
                  Comprehensive pricing breakdown by niche category
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gradient-to-r from-primary/5 to-secondary/5 border-b border-border/30">
                      <TableHead>Niche</TableHead>
                      <TableHead>Avg Price</TableHead>
                      <TableHead>Price Range</TableHead>
                      <TableHead>Sites</TableHead>
                      <TableHead>Trend</TableHead>
                      <TableHead>Quality</TableHead>
                      <TableHead>Competition</TableHead>
                      <TableHead>Opportunities</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedNicheData.map((niche, index) => (
                      <TableRow 
                        key={niche.niche}
                        className="hover:bg-primary/5 transition-colors duration-200"
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <Tag className="h-4 w-4 text-primary" />
                            {niche.niche}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-semibold">€{niche.averagePrice}</div>
                          <div className="text-xs text-muted-foreground">
                            Median: €{niche.medianPrice}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            €{niche.minPrice} - €{niche.maxPrice}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {niche.siteCount} sites
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getPriceChangeIcon(niche.priceChange)}
                            <span className={niche.priceChange >= 0 ? 'text-green-600' : 'text-red-600'}>
                              {niche.priceChange > 0 ? '+' : ''}{niche.priceChange.toFixed(1)}%
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-12 bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-green-600 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${(niche.qualityScore / 10) * 100}%` }}
                              />
                            </div>
                            <span className="text-sm font-medium">{niche.qualityScore}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${getCompetitionColor(niche.competitionLevel)}`}
                          >
                            {niche.competitionLevel}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-xs space-y-1">
                            {niche.recommendations.slice(0, 2).map((rec, i) => (
                              <div key={i} className="flex items-start gap-1">
                                <div className="w-1 h-1 bg-blue-500 rounded-full mt-1.5 flex-shrink-0" />
                                <span className="text-muted-foreground">{rec}</span>
                              </div>
                            ))}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="competitors" className="space-y-6">
            <Card className="glass-card-clean">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-600" />
                  Competitive Intelligence
                </CardTitle>
                <CardDescription>
                  Analyze competitor pricing strategies and market positioning
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="glass-card p-4">
                    <h4 className="font-semibold mb-3">Price Efficiency Analysis</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">techreview.se</span>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">88% efficient</Badge>
                          <span className="text-sm text-orange-600">Underpriced</span>
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Similar sites charging €280-290. Consider increasing to €285.
                      </div>
                    </div>
                  </div>

                  <div className="glass-card p-4">
                    <h4 className="font-semibold mb-3">Market Positioning</h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span>Premium Tier (€400+)</span>
                        <span className="font-medium">15%</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span>Mid Tier (€200-400)</span>
                        <span className="font-medium">65%</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span>Budget Tier (€200-)</span>
                        <span className="font-medium">20%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="trends" className="space-y-6">
            <Card className="glass-card-clean">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-green-600" />
                  Market Trends & Forecasting
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {marketTrends.map((trend, index) => (
                      <div key={trend.period} className="glass-card p-4">
                        <div className="text-sm text-muted-foreground">{trend.period}</div>
                        <div className="text-xl font-bold">€{trend.averagePrice}</div>
                        <div className="text-xs space-y-1 mt-2">
                          <div>Orders: {trend.orderVolume}</div>
                          <div>New Sites: {trend.newSites}</div>
                          <div className={`flex items-center gap-1 ${trend.priceChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {getPriceChangeIcon(trend.priceChange)}
                            {trend.priceChange > 0 ? '+' : ''}{trend.priceChange}%
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="glass-card p-6">
                    <h4 className="font-semibold mb-4">Market Predictions (Next 3 Months)</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-green-600" />
                          <span className="text-sm font-medium">Expected Growth Niches</span>
                        </div>
                        <div className="text-xs text-muted-foreground space-y-1">
                          <div>• AI & Technology (+20% price increase)</div>
                          <div>• Sustainable Finance (+15% demand)</div>
                          <div>• Mental Health (+25% content requests)</div>
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-yellow-600" />
                          <span className="text-sm font-medium">Market Warnings</span>
                        </div>
                        <div className="text-xs text-muted-foreground space-y-1">
                          <div>• Travel niche still recovering (-5% prices)</div>
                          <div>• Oversaturation in Lifestyle content</div>
                          <div>• New regulations affecting Health sites</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="opportunities" className="space-y-6">
            <Card className="glass-card-clean">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-orange-600" />
                  Market Opportunities
                </CardTitle>
                <CardDescription>
                  AI-powered insights for optimal pricing and positioning
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="glass-card p-4 border-l-4 border-green-500">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="font-semibold text-sm">Price Optimization</span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">
                      23 sites detected as underpriced by 15-30% compared to similar quality competitors.
                    </p>
                    <Button size="sm" className="glass-button-primary text-xs">
                      View Sites
                    </Button>
                  </div>

                  <div className="glass-card p-4 border-l-4 border-blue-500">
                    <div className="flex items-center gap-2 mb-2">
                      <Target className="h-4 w-4 text-blue-600" />
                      <span className="font-semibold text-sm">Niche Gaps</span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">
                      High demand for Danish finance sites. Only 3 quality options available.
                    </p>
                    <Button size="sm" variant="outline" className="glass-button text-xs">
                      Explore Gap
                    </Button>
                  </div>

                  <div className="glass-card p-4 border-l-4 border-purple-500">
                    <div className="flex items-center gap-2 mb-2">
                      <BarChart3 className="h-4 w-4 text-purple-600" />
                      <span className="font-semibold text-sm">Emerging Trends</span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">
                      Sustainability content showing 40% higher engagement rates this quarter.
                    </p>
                    <Button size="sm" variant="outline" className="glass-button text-xs">
                      Learn More
                    </Button>
                  </div>
                </div>

                <div className="mt-6 glass-card p-6">
                  <h4 className="font-semibold mb-4">AI-Powered Recommendations</h4>
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0" />
                      <div>
                        <div className="font-medium text-sm">Increase Technology Niche Prices</div>
                        <div className="text-xs text-muted-foreground">
                          Market analysis suggests 15% price increase viable for high-DR tech sites (DR 30+).
                          Expected ROI: +€2,400/month based on current order volume.
                        </div>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                      <div>
                        <div className="font-medium text-sm">Target Finnish Market</div>
                        <div className="text-xs text-muted-foreground">
                          Low competition in Finnish health & wellness niche. Consider onboarding 
                          5-10 quality Finnish sites to capture premium pricing.
                        </div>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 flex-shrink-0" />
                      <div>
                        <div className="font-medium text-sm">Bundle Strategy</div>
                        <div className="text-xs text-muted-foreground">
                          Offer multi-niche packages (Tech + Business) at 10% discount but 25% higher 
                          margin due to increased order value.
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}